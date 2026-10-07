import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Scale,
  TrendingUp,
  Trophy,
  Utensils,
} from 'lucide-react';
import { db } from '@/db/dexie';
import { DEMO_TODAY } from '@/db/seed';
import { useAppStore } from '@/app/store';
import {
  calculateChallengeProgress,
  calculateLeaderboard,
  calculateStreak,
  calculateWorkoutVolume,
} from '@/lib/calculations';
import { upsertBodyMetricRecord } from '@/lib/neon/repository';
import {
  ChallengeMemberStack,
  FitkonicLogo,
  RankIndicator,
  StreakIndicator,
} from '@/components/ui/FitkonicComponents';
import { cn } from '@/lib/utils';

export function HomeDashboard() {
  const {
    currentUserId,
    activeChallengeId,
    navigate,
    setCurrentUser,
    showToast,
  } = useAppStore();

  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [quickWeight, setQuickWeight] = useState('82.0');

  const data = useLiveQuery(async () => {
    const uid = currentUserId || 'user-harsh';
    const [
      user,
      allProfiles,
      challenges,
      members,
      workouts,
      sets,
      workoutExercises,
      dietLogs,
      bodyMetrics,
      prs,
      exercises,
    ] = await Promise.all([
      db.profiles.get(uid),
      db.profiles.toArray(),
      db.cached_challenges.toArray(),
      db.challenge_members.toArray(),
      db.workouts.toArray(),
      db.sets.toArray(),
      db.workout_exercises.toArray(),
      db.diet_logs.toArray(),
      db.body_metrics.where('user_id').equals(uid).toArray(),
      db.personal_records.toArray(),
      db.exercises.toArray(),
    ]);

    const challenge =
      challenges.find((c) => c.id === activeChallengeId) ||
      challenges[0];

    const exMap = new Map(exercises.map((e) => [e.id, e.name]));

    const weByWorkout = new Map<string, typeof workoutExercises>();
    for (const we of workoutExercises) {
      const list = weByWorkout.get(we.workout_id) || [];
      list.push(we);
      weByWorkout.set(we.workout_id, list);
    }

    const setsByWe = new Map<string, typeof sets>();
    for (const s of sets) {
      const list = setsByWe.get(s.workout_exercise_id) || [];
      list.push(s);
      setsByWe.set(s.workout_exercise_id, list);
    }

    const workoutVolumes: Record<string, number> = {};
    for (const w of workouts) {
      const weList = weByWorkout.get(w.id) || [];
      const wSets = weList.flatMap((we) => setsByWe.get(we.id) || []);
      workoutVolumes[w.id] = calculateWorkoutVolume(wSets);
    }

    const userWorkouts = workouts
      .filter((w) => w.user_id === uid && w.completed)
      .sort((a, b) => b.workout_date.localeCompare(a.workout_date));
    const todayWorkout = userWorkouts.find((w) => w.workout_date === DEMO_TODAY);

    // Summarize what exercises & top weights were done today
    let todayWorkoutSummary = 'Tap to log what you lifted today';
    if (todayWorkout) {
      const weList = weByWorkout.get(todayWorkout.id) || [];
      const parts = weList.slice(0, 3).map((we) => {
        const sList = setsByWe.get(we.id) || [];
        const maxW = sList.reduce((m, s) => Math.max(m, s.weight), 0);
        return `${exMap.get(we.exercise_id) || 'Lift'} ${maxW}kg`;
      });
      todayWorkoutSummary = parts.length > 0 ? parts.join(' • ') : todayWorkout.name;
    }

    const todayMeals = dietLogs.filter((d) => d.user_id === uid && d.date === DEMO_TODAY);
    const sortedMetrics = [...bodyMetrics].sort((a, b) => a.date.localeCompare(b.date));
    const latestMetric = sortedMetrics[sortedMetrics.length - 1];

    const streakDays = calculateStreak(
      userWorkouts.map((w) => w.workout_date),
      DEMO_TODAY
    );

    const challengeMembers = challenge
      ? members.filter((m) => m.challenge_id === challenge.id && m.status === 'active')
      : [];
    const memberProfiles = challengeMembers
      .map((m) => allProfiles.find((p) => p.id === m.user_id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));

    const leaderboard = challenge
      ? calculateLeaderboard({
          challenge,
          members,
          profiles: allProfiles,
          workouts,
          workoutVolumes,
          personalRecords: prs,
          dietLogs,
          referenceDateStr: DEMO_TODAY,
        })
      : [];

    const squadOrder = ['user-harsh', 'user-pranav', 'user-kavi', 'user-vijay'];
    const orderedProfiles = [...allProfiles].sort((a, b) => {
      const ia = squadOrder.indexOf(a.id);
      const ib = squadOrder.indexOf(b.id);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return a.display_name.localeCompare(b.display_name);
    });

    return {
      user,
      allProfiles: orderedProfiles,
      challenge,
      memberProfiles,
      todayWorkout,
      todayWorkoutSummary,
      todayMeals,
      latestMetric,
      streakDays,
      leaderboard,
    };
  }, [currentUserId, activeChallengeId]);

  if (!data || !data.user || !data.challenge) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-44 rounded-2xl bg-[#0D1117] border border-[#202A35] animate-pulse" />
      </div>
    );
  }

  const {
    user,
    allProfiles,
    challenge,
    memberProfiles,
    todayWorkout,
    todayWorkoutSummary,
    todayMeals,
    latestMetric,
    streakDays,
    leaderboard,
  } = data;

  const progress = calculateChallengeProgress(
    challenge.start_date,
    challenge.end_date,
    DEMO_TODAY
  );

  const accentColor = challenge.accent_color || '#7DD3FC';
  const currentWeight = latestMetric?.weight ?? user.weight ?? 82;

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(quickWeight);
    if (isNaN(num) || num < 25 || num > 350) return;
    await upsertBodyMetricRecord({
      userId: user.id,
      date: DEMO_TODAY,
      weight: num,
    });
    setWeightModalOpen(false);
    showToast({
      title: 'Weight Updated',
      subtitle: `${num} kg saved for ${user.display_name}`,
      type: 'success',
    });
  };

  return (
    <div data-testid="home-dashboard" className="pb-24 lg:pb-10 space-y-6">
      {/* Glassmorphic Top Header + 4-User Segmented Switcher (Harsh | Pranav | Kavi | Vijay) */}
      <div className="bg-[#0D1117] border border-white/10 rounded-3xl p-4 space-y-3.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('profile')}
            className="relative rounded-full ring-2 ring-[#5EC8FF]/60 p-0.5 shrink-0 shadow-[0_0_20px_rgba(94,200,255,0.25)]"
          >
            <img
              src={user.avatar_url}
              alt={user.display_name}
              className="w-10 h-10 rounded-full object-cover bg-[#121821] shrink-0"
            />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-display font-bold uppercase tracking-widest text-[#5EC8FF]">
              LOGGED IN AS {user.display_name.toUpperCase()}
            </p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <FitkonicLogo size="sm" />
              <StreakIndicator days={streakDays} />
            </div>
          </div>
        </div>

        {/* 4-User Glass Segmented Switcher: Harsh | Pranav | Kavi | Vijay */}
        <div className="grid grid-cols-4 gap-1.5 bg-[#121821] border border-white/10 rounded-2xl p-1.5 w-full sm:w-auto">
          {allProfiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setCurrentUser(p.id)}
              data-testid={`switch-user-${p.username}`}
              className={cn(
                'px-2.5 py-2 rounded-xl text-xs font-display font-bold transition-all flex items-center justify-center gap-1.5',
                p.id === user.id
                  ? 'bg-[#5EC8FF] text-[#07090C] shadow-[0_0_18px_rgba(94,200,255,0.4)]'
                  : 'text-[#9BA8B8] hover:text-[#F5F7FA]'
              )}
            >
              <img src={p.avatar_url} alt={p.display_name} className="w-4 h-4 rounded-full hidden sm:inline-block" />
              <span className="truncate">{p.display_name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Challenge Hero + Simple Today Updates */}
        <div className="lg:col-span-7 space-y-5">
          {/* CURRENT CHALLENGE CARD */}
          <div
            data-testid="current-challenge-card"
            onClick={() => navigate('challenge-detail', { challengeId: challenge.id })}
            className="relative overflow-hidden rounded-2xl border border-[#202A35] hover:border-[#7DD3FC]/60 transition-all cursor-pointer shadow-card"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${challenge.background_image_url})`,
                backgroundPosition: challenge.background_position || 'center center',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(7,9,12,0.45) 0%, rgba(13,17,23,0.92) 100%)',
              }}
            />

            <div className="relative z-10 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#8B98A8]">Current Challenge</span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-display font-bold uppercase tracking-wider border"
                  style={{
                    color: accentColor,
                    borderColor: `${accentColor}50`,
                    backgroundColor: `${accentColor}18`,
                  }}
                >
                  Harsh • Pranav • Kavi • Vijay
                </span>
              </div>

              <div>
                <h2 className="font-display font-extrabold text-3xl tracking-tight uppercase text-[#F5F7FA]">
                  {challenge.name}
                </h2>
                <div className="mt-2 flex items-center justify-between text-xs font-medium">
                  <span className="text-[#8B98A8]">{progress.remainingDays} days left</span>
                  <span className="font-display font-bold text-[#F5F7FA]">
                    {progress.percentage}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-[#121821] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progress.percentage}%`,
                      backgroundColor: accentColor,
                    }}
                  />
                </div>
              </div>

              <ChallengeMemberStack profiles={memberProfiles} />
            </div>
          </div>

          {/* SIMPLE TODAY SECTION */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#F5F7FA]">
                Today’s Check-In ({user.display_name})
              </h3>
              <span className="text-xs text-[#8B98A8]">Simple Daily Updates</span>
            </div>

            <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl divide-y divide-[#202A35]">
              {/* 1. Today's Workout */}
              <div
                onClick={() => navigate('log-workout')}
                data-testid="today-workout-row"
                className="p-4 flex items-center justify-between gap-4 hover:bg-[#121821]/60 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-[#5EC8FF]/15 border border-[#5EC8FF]/30 flex items-center justify-center text-[#5EC8FF] shrink-0">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-[#F5F7FA]">
                      Today’s Workout
                    </p>
                    <p className="text-xs text-[#8B98A8] truncate mt-0.5">
                      {todayWorkoutSummary}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1.5 rounded-xl bg-[#121821] border border-[#202A35] text-xs font-display font-bold text-[#5EC8FF]">
                    Update
                  </span>
                  {todayWorkout && <CheckCircle2 className="w-5 h-5 text-[#4ADE80]" />}
                </div>
              </div>

              {/* 2. What I Ate Today (Simple food text — NO calories/macros) */}
              <div
                onClick={() => navigate('log-diet')}
                data-testid="today-nutrition-row"
                className="p-4 flex items-center justify-between gap-4 hover:bg-[#121821]/60 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-[#4ADE80]/15 border border-[#4ADE80]/30 flex items-center justify-center text-[#4ADE80] shrink-0">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-[#F5F7FA]">
                      What I Ate Today
                    </p>
                    <p className="text-xs text-[#8B98A8] truncate mt-0.5">
                      {todayMeals.length > 0
                        ? todayMeals.map((m) => `${m.meal_type}: ${m.description}`).join(' • ')
                        : 'Tap to write what you ate today'}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-[#121821] border border-[#202A35] text-xs font-display font-bold text-[#4ADE80] shrink-0">
                  Update Food
                </span>
              </div>

              {/* 3. Body Weight */}
              <div
                onClick={() => {
                  setQuickWeight(String(currentWeight));
                  setWeightModalOpen(true);
                }}
                data-testid="today-weight-row"
                className="p-4 flex items-center justify-between gap-4 hover:bg-[#121821]/60 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-xl bg-[#FBBF24]/15 border border-[#FBBF24]/30 flex items-center justify-center text-[#FBBF24] shrink-0">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm text-[#F5F7FA]">Body Weight</p>
                    <p className="text-xs text-[#8B98A8] mt-0.5">
                      Current: <strong className="text-[#F5F7FA]">{currentWeight} kg</strong>
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-[#121821] border border-[#202A35] text-xs font-display font-bold text-[#FBBF24]">
                  Update Weight
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Quick Buttons + Progress Shortcut + Squad Standings */}
        <div className="lg:col-span-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate('log-workout')}
              data-testid="quick-start-workout"
              className="p-4 rounded-2xl bg-[#5EC8FF] text-[#07090C] font-display font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-glow-cyan hover:brightness-110"
            >
              <Dumbbell className="w-4 h-4" />
              <span>UPDATE WORKOUT</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('log-diet')}
              data-testid="quick-log-diet"
              className="p-4 rounded-2xl bg-[#0D1117] border border-[#202A35] hover:border-[#5EC8FF] text-[#F5F7FA] font-display font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Utensils className="w-4 h-4 text-[#4ADE80]" />
              <span>UPDATE DIET</span>
            </button>
          </div>

          {/* See Weight & Strength Progress Card */}
          <div
            onClick={() => navigate('progress')}
            className="bg-gradient-to-r from-[#0D1117] via-[#121821] to-[#0D1117] border border-[#5EC8FF]/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-[#5EC8FF] shadow-glow-cyan"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#5EC8FF]/15 text-[#5EC8FF] flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-[#F5F7FA]">
                  Weight & Strength Progress
                </p>
                <p className="text-xs text-[#8B98A8]">
                  See body weight & increase in lifting weights for Harsh, Pranav & Kavi
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#5EC8FF] shrink-0" />
          </div>

          {/* Squad Standings: Harsh, Pranav, Kavi */}
          <section className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#5EC8FF]" />
                <h3 className="font-display font-bold text-base text-[#F5F7FA]">
                  Squad Standings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('progress')}
                className="text-xs font-medium text-[#5EC8FF] hover:underline"
              >
                Compare Strength
              </button>
            </div>

            <div className="divide-y divide-[#202A35]">
              {leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <RankIndicator rank={entry.rank} />
                    <img
                      src={entry.avatarUrl}
                      alt={entry.displayName}
                      className="w-9 h-9 rounded-full bg-[#121821]"
                    />
                    <div>
                      <p className="text-sm font-display font-bold text-[#F5F7FA]">
                        {entry.displayName}
                      </p>
                      <p className="text-xs text-[#8B98A8]">
                        {entry.workoutCount} sessions logged
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-sm text-[#5EC8FF]">
                      {entry.totalVolume.toLocaleString()} kg lifted
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Quick Update Weight Modal */}
      {weightModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <form
            onSubmit={handleSaveWeight}
            className="bg-[#0D1117] border border-[#202A35] rounded-2xl max-w-sm w-full p-5 space-y-4"
          >
            <h3 className="font-display font-bold text-lg text-[#F5F7FA]">
              Update Body Weight ({user.display_name})
            </h3>
            <div>
              <label className="block text-xs text-[#8B98A8] mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={quickWeight}
                onChange={(e) => setQuickWeight(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#121821] border border-[#202A35] font-display text-xl text-[#F5F7FA] focus:outline-none focus:border-[#5EC8FF]"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setWeightModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#121821] text-xs font-semibold text-[#8B98A8]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#5EC8FF] text-[#07090C] font-display font-bold text-xs uppercase"
              >
                Save Weight
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
