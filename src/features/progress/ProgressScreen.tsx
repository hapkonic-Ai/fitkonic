import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  Check,
  Dumbbell,
  Scale,
  TrendingUp,
} from 'lucide-react';
import { db } from '@/db/dexie';
import { DEMO_TODAY } from '@/db/seed';
import { useAppStore } from '@/app/store';
import { upsertBodyMetricRecord } from '@/lib/neon/repository';

interface LiftSessionPoint {
  date: string;
  label: string;
  weight: number;
  reps: number;
}

interface ExerciseStrengthProgress {
  exerciseId: string;
  exerciseName: string;
  startWeight: number;
  currentWeight: number;
  increaseKg: number;
  sessions: LiftSessionPoint[];
}

export function ProgressScreen() {
  const { currentUserId, setCurrentUser, showToast } = useAppStore();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('ex-bench-press');
  const [weightInput, setWeightInput] = useState<string>('');
  const [savingWeight, setSavingWeight] = useState(false);

  const uid = currentUserId || 'user-harsh';

  const data = useLiveQuery(async () => {
    const [profiles, exercises, allWorkouts, allWEs, allSets, allBodyMetrics] =
      await Promise.all([
        db.profiles.toArray(),
        db.exercises.toArray(),
        db.workouts.toArray(),
        db.workout_exercises.toArray(),
        db.sets.toArray(),
        db.body_metrics.toArray(),
      ]);

    const squadOrder = ['user-harsh', 'user-pranav', 'user-kavi', 'user-vijay'];
    const orderedProfiles = [...profiles].sort((a, b) => {
      const ia = squadOrder.indexOf(a.id);
      const ib = squadOrder.indexOf(b.id);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return a.display_name.localeCompare(b.display_name);
    });

    const exerciseNameMap = new Map<string, string>();
    exercises.forEach((e) => exerciseNameMap.set(e.id, e.name));

    // Helper to compute strength progression for any user
    const computeUserStrength = (targetUserId: string): ExerciseStrengthProgress[] => {
      const userWorkouts = allWorkouts
        .filter((w) => w.user_id === targetUserId && w.completed)
        .sort((a, b) => a.workout_date.localeCompare(b.workout_date));

      const workoutById = new Map(userWorkouts.map((w) => [w.id, w]));
      const userWEs = allWEs.filter((we) => workoutById.has(we.workout_id));

      const byExercise = new Map<string, LiftSessionPoint[]>();

      for (const we of userWEs) {
        const w = workoutById.get(we.workout_id);
        if (!w) continue;
        const setsForWE = allSets.filter(
          (s) => s.workout_exercise_id === we.id && s.completed && s.weight > 0
        );
        if (setsForWE.length === 0) continue;

        const maxSet = setsForWE.reduce(
          (best, s) => (s.weight > best.weight ? s : best),
          setsForWE[0]
        );

        const list = byExercise.get(we.exercise_id) || [];
        // If multiple workouts on the same date for the same exercise, keep highest weight
        const existingIdx = list.findIndex((p) => p.date === w.workout_date);
        const point: LiftSessionPoint = {
          date: w.workout_date,
          label: w.workout_date.slice(5), // MM-DD
          weight: maxSet.weight,
          reps: maxSet.reps,
        };
        if (existingIdx >= 0) {
          if (point.weight >= list[existingIdx].weight) {
            list[existingIdx] = point;
          }
        } else {
          list.push(point);
        }
        byExercise.set(we.exercise_id, list);
      }

      const results: ExerciseStrengthProgress[] = [];
      for (const [exerciseId, sessions] of byExercise.entries()) {
        const sorted = sessions.sort((a, b) => a.date.localeCompare(b.date));
        if (sorted.length === 0) continue;
        const startWeight = sorted[0].weight;
        const currentWeight = sorted[sorted.length - 1].weight;
        const increaseKg = Number((currentWeight - startWeight).toFixed(1));
        results.push({
          exerciseId,
          exerciseName: exerciseNameMap.get(exerciseId) || 'Exercise',
          startWeight,
          currentWeight,
          increaseKg,
          sessions: sorted,
        });
      }

      // Sort with main lifts first
      const priority = [
        'ex-bench-press',
        'ex-squat',
        'ex-deadlift',
        'ex-overhead-press',
      ];
      return results.sort((a, b) => {
        const ia = priority.indexOf(a.exerciseId);
        const ib = priority.indexOf(b.exerciseId);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return b.increaseKg - a.increaseKg;
      });
    };

    const userStrengthList = computeUserStrength(uid);

    // Body weight progression for current user
    const userMetrics = allBodyMetrics
      .filter((m) => m.user_id === uid && m.weight !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Squad comparison summary for Harsh, Pranav, Kavi
    const squadComparison = orderedProfiles.map((member) => {
      const lifts = computeUserStrength(member.id);
      const mWeights = allBodyMetrics
        .filter((m) => m.user_id === member.id && m.weight !== null)
        .sort((a, b) => a.date.localeCompare(b.date));

      const startBodyWeight =
        mWeights.length > 0 ? (mWeights[0].weight ?? member.weight) : member.weight;
      const currentBodyWeight =
        mWeights.length > 0
          ? (mWeights[mWeights.length - 1].weight ?? member.weight)
          : member.weight;

      return {
        member,
        startBodyWeight,
        currentBodyWeight,
        bench: lifts.find((l) => l.exerciseId === 'ex-bench-press'),
        squat: lifts.find((l) => l.exerciseId === 'ex-squat'),
        deadlift: lifts.find((l) => l.exerciseId === 'ex-deadlift'),
        press: lifts.find((l) => l.exerciseId === 'ex-overhead-press'),
      };
    });

    return {
      profiles: orderedProfiles,
      currentUser: profiles.find((p) => p.id === uid),
      userStrengthList,
      userMetrics,
      squadComparison,
    };
  }, [uid]);

  if (!data) {
    return <div className="p-6 text-sm text-[#8B98A8]">Loading progress...</div>;
  }

  const activeLift =
    data.userStrengthList.find((l) => l.exerciseId === selectedExerciseId) ||
    data.userStrengthList[0];

  const startBodyWeight =
    data.userMetrics.length > 0
      ? (data.userMetrics[0].weight ?? data.currentUser?.weight ?? null)
      : (data.currentUser?.weight ?? null);

  const currentBodyWeight =
    data.userMetrics.length > 0
      ? (data.userMetrics[data.userMetrics.length - 1].weight ??
          data.currentUser?.weight ??
          null)
      : (data.currentUser?.weight ?? null);

  const bodyWeightDiff =
    startBodyWeight && currentBodyWeight
      ? Number((currentBodyWeight - startBodyWeight).toFixed(1))
      : 0;

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(weightInput);
    if (!Number.isFinite(parsed) || parsed < 30 || parsed > 250) {
      showToast({
        title: 'Enter a valid body weight in kg',
        subtitle: 'Example: 81.5',
        type: 'error',
      });
      return;
    }

    setSavingWeight(true);
    try {
      await upsertBodyMetricRecord({
        userId: uid,
        date: DEMO_TODAY,
        weight: parsed,
      });
      setWeightInput('');
      showToast({
        title: 'Body Weight Updated!',
        subtitle: `${data.currentUser?.display_name}: ${parsed} kg`,
        type: 'success',
      });
    } finally {
      setSavingWeight(false);
    }
  };

  return (
    <div data-testid="progress-screen" className="max-w-4xl mx-auto pb-28 space-y-5">
      {/* Header + 3-Login Switcher (Harsh, Pranav, Kavi) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D1117] border border-[#202A35] rounded-2xl p-4">
        <div>
          <span className="text-[11px] font-display uppercase tracking-widest text-[#5EC8FF] block">
            WEIGHT &amp; STRENGTH TRACKER
          </span>
          <h1 className="text-xl font-display font-bold text-[#F5F7FA]">
            {data.currentUser?.display_name}&apos;s Progress
          </h1>
          <p className="text-xs text-[#8B98A8]">
            Tracked simply by Body Weight (kg) and Strength (increase in lifting weights).
          </p>
        </div>

        <div className="grid grid-cols-4 gap-1.5 bg-[#121821] border border-white/10 rounded-2xl p-1.5 w-full sm:w-auto">
          {data.profiles.map((member) => {
            const active = member.id === uid;
            return (
              <button
                key={member.id}
                type="button"
                data-testid={`progress-user-${member.username}`}
                onClick={() => setCurrentUser(member.id)}
                className={`px-2.5 py-2 rounded-xl text-xs font-display font-bold transition-all text-center truncate ${
                  active
                    ? 'bg-[#5EC8FF] text-[#07090C] shadow-[0_0_18px_rgba(94,200,255,0.4)]'
                    : 'text-[#9BA8B8] hover:text-[#F5F7FA]'
                }`}
              >
                {member.display_name}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: STRENGTH PROGRESS (INCREASE IN LIFTING WEIGHTS) */}
      <div className="rounded-2xl border border-[#202A35] bg-[#0D1117] p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5EC8FF]/10 border border-[#5EC8FF]/30 flex items-center justify-center text-[#5EC8FF]">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-display uppercase tracking-widest text-[#5EC8FF] block">
                STRENGTH PROGRESSION
              </span>
              <h2 className="text-base font-display font-bold text-[#F5F7FA]">
                Increase in Lifting Weights (kg)
              </h2>
            </div>
          </div>
        </div>

        {/* Cards for Each Exercise Showing Start Weight -> Current Weight (+Increase) */}
        {data.userStrengthList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#202A35] bg-[#121821]/40 p-6 text-center space-y-1.5">
            <p className="text-sm font-display font-bold text-[#F5F7FA]">
              Day 1 of Winter Arc — No lifts logged yet for {data.currentUser?.display_name}
            </p>
            <p className="text-xs text-[#8B98A8]">
              Log today&apos;s PPL or Full Body workout to start tracking your lifting weight progression!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.userStrengthList.map((lift) => {
              const isSelected = activeLift?.exerciseId === lift.exerciseId;
              return (
                <button
                  key={lift.exerciseId}
                  type="button"
                  data-testid={`lift-card-${lift.exerciseId}`}
                  onClick={() => setSelectedExerciseId(lift.exerciseId)}
                  className={`text-left rounded-xl border p-4 transition-all space-y-2.5 ${
                    isSelected
                      ? 'bg-[#121821] border-[#5EC8FF] shadow-[0_0_20px_rgba(94,200,255,0.12)]'
                      : 'bg-[#121821]/60 border-[#202A35] hover:border-[#5EC8FF]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-display font-bold text-[#F5F7FA]">
                      {lift.exerciseName}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#4ADE80]/15 border border-[#4ADE80]/40 text-xs font-display font-bold text-[#4ADE80] flex items-center gap-0.5">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      {lift.increaseKg >= 0 ? `+${lift.increaseKg} kg` : `${lift.increaseKg} kg`}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#8B98A8] block">
                        Started At
                      </span>
                      <span className="text-base font-display font-semibold text-[#8B98A8]">
                        {lift.startWeight} kg
                      </span>
                    </div>
                    <span className="text-[#5EC8FF] font-display font-bold">→</span>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#5EC8FF] block">
                        Current Lift
                      </span>
                      <span className="text-xl font-display font-bold text-[#F5F7FA]">
                        {lift.currentWeight} kg
                      </span>
                    </div>
                  </div>

                  {/* Session-by-session weight history pills */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    {lift.sessions.map((s, idx) => (
                      <React.Fragment key={s.date}>
                        <span className="px-2 py-0.5 rounded bg-[#0D1117] border border-[#202A35] text-[11px] font-display text-[#F5F7FA]">
                          {s.weight}kg
                        </span>
                        {idx < lift.sessions.length - 1 && (
                          <span className="text-[10px] text-[#8B98A8]">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Lift Chart */}
        {activeLift && (
          <div className="rounded-xl border border-[#202A35] bg-[#121821]/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-display uppercase tracking-widest text-[#5EC8FF] block">
                  LIFTING WEIGHT CHART
                </span>
                <h3 className="text-sm font-display font-bold text-[#F5F7FA]">
                  {activeLift.exerciseName}: {activeLift.startWeight} kg →{' '}
                  {activeLift.currentWeight} kg (
                  {activeLift.increaseKg >= 0
                    ? `+${activeLift.increaseKg} kg`
                    : `${activeLift.increaseKg} kg`}
                  )
                </h3>
              </div>
              <TrendingUp className="w-4 h-4 text-[#4ADE80]" />
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeLift.sessions}>
                  <defs>
                    <linearGradient id="liftGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5EC8FF" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#5EC8FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#202A35" />
                  <XAxis
                    dataKey="label"
                    stroke="#8B98A8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#8B98A8"
                    fontSize={11}
                    tickLine={false}
                    domain={['dataMin - 5', 'dataMax + 5']}
                    unit=" kg"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D1117',
                      borderColor: '#202A35',
                      borderRadius: '12px',
                      color: '#F5F7FA',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value} kg`, 'Lifting Weight']}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="#5EC8FF"
                    strokeWidth={3}
                    fill="url(#liftGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: BODY WEIGHT PROGRESS */}
      <div className="rounded-2xl border border-[#202A35] bg-[#0D1117] p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4ADE80]/10 border border-[#4ADE80]/30 flex items-center justify-center text-[#4ADE80]">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-display uppercase tracking-widest text-[#4ADE80] block">
                BODY WEIGHT TRACKER
              </span>
              <h2 className="text-base font-display font-bold text-[#F5F7FA]">
                {data.currentUser?.display_name}&apos;s Body Weight:{' '}
                <span className="text-[#5EC8FF]">
                  {currentBodyWeight ? `${currentBodyWeight} kg` : 'Not logged yet'}
                </span>
              </h2>
              <p className="text-xs text-[#8B98A8]">
                {startBodyWeight && currentBodyWeight ? (
                  <>
                    Started at {startBodyWeight} kg • Change:{' '}
                    <strong className="text-[#F5F7FA]">
                      {bodyWeightDiff > 0 ? `+${bodyWeightDiff}` : bodyWeightDiff} kg
                    </strong>
                  </>
                ) : (
                  'Enter your Day 1 starting body weight on the right'
                )}
              </p>
            </div>
          </div>

          {/* Quick Update Body Weight Form */}
          <form onSubmit={handleSaveWeight} className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              data-testid="progress-weight-input"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={currentBodyWeight ? `Today (${currentBodyWeight} kg)` : 'Weight in kg'}
              className="w-36 h-10 rounded-xl bg-[#121821] border border-[#202A35] px-3 text-xs font-display font-bold text-[#F5F7FA] focus:outline-none focus:border-[#5EC8FF]"
            />
            <button
              type="submit"
              data-testid="progress-weight-save-btn"
              disabled={savingWeight}
              className="h-10 px-4 rounded-xl bg-[#5EC8FF] hover:bg-[#7DD3FC] text-[#07090C] font-display font-bold text-xs flex items-center gap-1"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Update Weight
            </button>
          </form>
        </div>

        {/* Body Weight Chart */}
        {data.userMetrics.length > 0 && (
          <div className="h-48 w-full rounded-xl border border-[#202A35] bg-[#121821]/60 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.userMetrics.map((m) => ({
                  date: m.date.slice(5),
                  weight: m.weight,
                }))}
              >
                <defs>
                  <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#202A35" />
                <XAxis dataKey="date" stroke="#8B98A8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#8B98A8"
                  fontSize={11}
                  tickLine={false}
                  domain={['dataMin - 2', 'dataMax + 2']}
                  unit=" kg"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D1117',
                    borderColor: '#202A35',
                    borderRadius: '12px',
                    color: '#F5F7FA',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value} kg`, 'Body Weight']}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#4ADE80"
                  strokeWidth={2.5}
                  fill="url(#bwGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Body Weight History Pills */}
        {data.userMetrics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.userMetrics.map((m) => (
              <div
                key={m.id}
                className="px-3 py-1.5 rounded-xl bg-[#121821] border border-[#202A35] text-xs flex items-center gap-2"
              >
                <span className="text-[#8B98A8]">{m.date.slice(5)}:</span>
                <strong className="font-display text-[#F5F7FA]">{m.weight} kg</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: HARSH VS PRANAV VS KAVI VS VIJAY COMPARISON */}
      <div className="rounded-2xl border border-[#202A35] bg-[#0D1117] p-5 space-y-4">
        <div>
          <span className="text-[10px] font-display uppercase tracking-widest text-[#5EC8FF] block">
            SQUAD PROGRESS COMPARISON
          </span>
          <h2 className="text-base font-display font-bold text-[#F5F7FA]">
            Harsh, Pranav, Kavi &amp; Vijay — Weight &amp; Lifting Strength
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.squadComparison.map((item) => (
            <div
              key={item.member.id}
              className="rounded-xl border border-[#202A35] bg-[#121821]/80 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={item.member.avatar_url}
                    alt={item.member.display_name}
                    className="w-8 h-8 rounded-full border border-[#202A35]"
                  />
                  <div>
                    <div className="text-sm font-display font-bold text-[#F5F7FA]">
                      {item.member.display_name}
                    </div>
                    <div className="text-[11px] text-[#8B98A8]">
                      Body Weight:{' '}
                      <strong className="text-[#F5F7FA]">
                        {item.currentBodyWeight
                          ? `${item.startBodyWeight} → ${item.currentBodyWeight} kg`
                          : '—'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#202A35] text-xs">
                {[
                  { label: 'Bench Press', lift: item.bench },
                  { label: 'Squat', lift: item.squat },
                  { label: 'Deadlift', lift: item.deadlift },
                  { label: 'Shoulder Press', lift: item.press },
                ].map(({ label, lift }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between bg-[#0D1117] border border-[#202A35] rounded-lg px-2.5 py-1.5"
                  >
                    <span className="text-[#8B98A8]">{label}</span>
                    {lift ? (
                      <span className="font-display font-bold text-[#F5F7FA]">
                        {lift.startWeight}→{lift.currentWeight}kg{' '}
                        <span className="text-[#4ADE80]">
                          (+{lift.increaseKg}kg)
                        </span>
                      </span>
                    ) : (
                      <span className="text-[#8B98A8]">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
