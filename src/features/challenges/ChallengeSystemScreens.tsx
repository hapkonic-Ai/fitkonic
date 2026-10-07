import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  MoreHorizontal,
  Palette,
  Plus,
  Settings,
  Share2,
  Shield,
  Trash2,
  Trophy,
  Upload,
  UserPlus,
  Users,
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
import {
  createChallengeRecord,
  deleteChallengeRecord,
  joinChallengeByInviteOrPublic,
  updateChallengeMemberRoleOrRemove,
  updateChallengeSettings,
} from '@/lib/neon/repository';
import { cn, fileToDataUrl } from '@/lib/utils';
import {
  ConfirmDialog,
  RankIndicator,
} from '@/components/ui/FitkonicComponents';
import {
  PRESET_CHALLENGE_THEMES,
  type ChallengeVisibility,
  type LeaderboardMetric,
} from '@/types';

const METRIC_LABELS: Record<LeaderboardMetric, string> = {
  training_volume: 'Total Volume',
  consistency: 'Consistency',
  workout_count: 'Workout Count',
  training_days: 'Training Days',
  pr_count: 'PR Count',
  diet_consistency: 'Diet Consistency',
};

/**
 * CHALLENGES DIRECTORY + JOIN BY CODE
 */
export function ChallengesDirectoryScreen() {
  const {
    currentUserId,
    activeChallengeId,
    setActiveChallengeId,
    navigate,
    showToast,
  } = useAppStore();

  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const data = useLiveQuery(async () => {
    const [challenges, members, profiles] = await Promise.all([
      db.cached_challenges.toArray(),
      db.challenge_members.toArray(),
      db.profiles.toArray(),
    ]);
    return { challenges, members, profiles };
  }, []);

  if (!data) {
    return <div className="p-6 h-80 rounded-2xl bg-[#0D1117] animate-pulse" />;
  }

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    if (!joinCode.trim()) return;
    try {
      const joined = await joinChallengeByInviteOrPublic({
        userId: currentUserId || 'user-harsh',
        inviteCode: joinCode,
      });
      setJoinCode('');
      setActiveChallengeId(joined.id);
      navigate('challenge-detail', { challengeId: joined.id });
      showToast({
        title: `Joined ${joined.name}`,
        subtitle: 'You are now on the challenge leaderboard',
        type: 'success',
      });
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join challenge');
    }
  };

  return (
    <div data-testid="challenges-directory-screen" className="pb-24 lg:pb-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[#F5F7FA]">Challenges</h1>
          <p className="text-xs text-[#8B98A8]">
            Compete with your training group. Every challenge has its own identity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('challenge-create')}
          data-testid="go-create-challenge-button"
          className="px-4 py-2.5 rounded-xl bg-[#5EC8FF] text-[#07090C] font-display font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-glow-cyan hover:brightness-110"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Challenge</span>
        </button>
      </div>

      {/* Join by Invite Code / Link Bar */}
      <form
        onSubmit={handleJoinByCode}
        className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className="flex-1">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter invite code or link (e.g. WINTER-ARC-42)"
            data-testid="join-invite-code-input"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA] focus:outline-none focus:border-[#5EC8FF]"
          />
          {joinError && <p className="text-xs text-[#FF5C5C] mt-1">{joinError}</p>}
        </div>
        <button
          type="submit"
          data-testid="join-invite-submit-button"
          className="px-5 py-2.5 rounded-xl bg-[#121821] border border-[#5EC8FF]/40 hover:bg-[#5EC8FF] hover:text-[#07090C] text-[#5EC8FF] font-display font-bold text-xs uppercase tracking-wider transition-colors"
        >
          Join Challenge
        </button>
      </form>

      {/* Challenge Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {data.challenges.map((c) => {
          const prog = calculateChallengeProgress(c.start_date, c.end_date, DEMO_TODAY);
          const cMembers = data.members.filter(
            (m) => m.challenge_id === c.id && m.status === 'active'
          );
          const isSelected = c.id === activeChallengeId;

          return (
            <div
              key={c.id}
              data-testid={`challenge-card-${c.slug}`}
              onClick={() => {
                setActiveChallengeId(c.id);
                navigate('challenge-detail', { challengeId: c.id });
              }}
              className={cn(
                'relative overflow-hidden rounded-2xl border transition-all cursor-pointer shadow-card group',
                isSelected ? 'border-[#5EC8FF]' : 'border-[#202A35] hover:border-[#8B98A8]'
              )}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{
                  backgroundImage: `url(${c.background_image_url})`,
                  backgroundPosition: c.background_position || 'center center',
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, rgba(7,9,12,${Math.max(
                    0.35,
                    c.background_overlay - 0.15
                  )}) 0%, rgba(13,17,23,0.94) 100%)`,
                }}
              />

              <div className="relative z-10 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-display font-bold uppercase tracking-wider border"
                    style={{
                      color: c.accent_color,
                      borderColor: `${c.accent_color}50`,
                      backgroundColor: `${c.accent_color}18`,
                    }}
                  >
                    {METRIC_LABELS[c.leaderboard_metric]}
                  </span>
                  <span className="text-xs text-[#8B98A8]">
                    {prog.remainingDays || 42} days left
                  </span>
                </div>

                <div>
                  <h2 className="font-display font-extrabold text-2xl uppercase tracking-tight text-[#F5F7FA]">
                    {c.name}
                  </h2>
                  <p className="text-xs text-[#8B98A8] line-clamp-2 mt-1">{c.description}</p>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#8B98A8]">{cMembers.length} members</span>
                    <span className="font-display font-bold text-[#F5F7FA]">
                      {prog.percentage}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#121821] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${prog.percentage}%`,
                        backgroundColor: c.accent_color,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * SCREEN 5: CHALLENGE DETAIL VIEW (WINTER ARC / ANY CHALLENGE)
 */
export function ChallengeDetailScreen() {
  const {
    currentUserId,
    activeChallengeId,
    navigate,
    showToast,
  } = useAppStore();

  const uid = currentUserId || 'user-harsh';
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'leaderboard' | 'rules'>(
    'overview'
  );
  const [overrideMetric, setOverrideMetric] = useState<LeaderboardMetric | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const data = useLiveQuery(async () => {
    const cid = activeChallengeId || 'challenge-winter-arc';
    const [
      challenge,
      members,
      invites,
      profiles,
      workouts,
      workoutExercises,
      sets,
      prs,
      dietLogs,
    ] = await Promise.all([
      db.cached_challenges.get(cid),
      db.challenge_members.where('challenge_id').equals(cid).toArray(),
      db.challenge_invites.where('challenge_id').equals(cid).toArray(),
      db.profiles.toArray(),
      db.workouts.toArray(),
      db.workout_exercises.toArray(),
      db.sets.toArray(),
      db.personal_records.toArray(),
      db.diet_logs.toArray(),
    ]);

    if (!challenge) return null;

    const weByWorkout = new Map<string, string[]>();
    for (const we of workoutExercises) {
      const list = weByWorkout.get(we.workout_id) || [];
      list.push(we.id);
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
      const weIds = weByWorkout.get(w.id) || [];
      const wSets = weIds.flatMap((id) => setsByWe.get(id) || []);
      workoutVolumes[w.id] = calculateWorkoutVolume(wSets);
    }

    const effectiveChallenge = overrideMetric
      ? { ...challenge, leaderboard_metric: overrideMetric }
      : challenge;

    const leaderboard = calculateLeaderboard({
      challenge: effectiveChallenge,
      members,
      profiles,
      workouts,
      workoutVolumes,
      personalRecords: prs,
      dietLogs,
      referenceDateStr: DEMO_TODAY,
    });

    const userWorkouts = workouts.filter((w) => w.user_id === uid && w.completed);
    const streakDays = calculateStreak(
      userWorkouts.map((w) => w.workout_date),
      DEMO_TODAY
    );

    const myMembership = members.find((m) => m.user_id === uid);
    const canManage =
      challenge.creator_id === uid ||
      myMembership?.role === 'owner' ||
      myMembership?.role === 'admin';

    return {
      challenge,
      effectiveChallenge,
      members: members.filter((m) => m.status === 'active'),
      invite: invites[0],
      profiles,
      leaderboard,
      streakDays,
      canManage,
    };
  }, [activeChallengeId, uid, overrideMetric]);

  if (!data) {
    return <div className="p-6 h-80 rounded-2xl bg-[#0D1117] animate-pulse" />;
  }

  const {
    challenge,
    effectiveChallenge,
    members,
    invite,
    leaderboard,
    streakDays,
    canManage,
  } = data;

  const progress = calculateChallengeProgress(
    challenge.start_date,
    challenge.end_date,
    DEMO_TODAY
  );

  const accentColor = challenge.accent_color || '#7DD3FC';

  const handleToggleDietVisibility = async () => {
    if (!canManage) {
      showToast({
        title: 'Owner/Admin Permission Required',
        subtitle: 'Only challenge owners or admins can toggle diet visibility.',
        type: 'error',
      });
      return;
    }
    const nextValue = !challenge.show_diet;
    await updateChallengeSettings(challenge.id, uid, { show_diet: nextValue });
    showToast({
      title: nextValue ? 'Diet Logs Visible to Members' : 'Diet Logs Hidden (Private)',
      subtitle: nextValue
        ? 'Challenge members can now view shared nutrition logs'
        : 'Neon RLS policy updated: member diet logs are now private',
      type: 'info',
    });
  };

  const handleMetricSelectChange = async (metric: LeaderboardMetric) => {
    setOverrideMetric(metric);
    if (canManage) {
      await updateChallengeSettings(challenge.id, uid, { leaderboard_metric: metric });
    }
  };

  const handleCopyInvite = () => {
    const code = invite?.invite_code || 'WINTER-ARC-42';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(`https://fitkonic.app/join/${code}`);
    }
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
    showToast({
      title: 'Invite Link Copied',
      subtitle: `fitkonic.app/join/${code}`,
      type: 'success',
    });
  };

  return (
    <div data-testid="challenge-detail-screen" className="pb-24 lg:pb-12 space-y-5">
      {/* CHALLENGE HERO (Matches Screen 5 of UI Reference) */}
      <div className="relative overflow-hidden rounded-3xl border border-[#202A35] shadow-card">
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
            background: `linear-gradient(180deg, rgba(7,9,12,${Math.max(
              0.25,
              challenge.background_overlay - 0.2
            )}) 0%, rgba(7,9,12,0.95) 100%)`,
          }}
        />

        <div className="relative z-10 p-5 sm:p-7 space-y-6">
          {/* Hero Top Controls */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('challenges')}
              aria-label="Back to Challenges"
              className="h-10 w-10 rounded-full bg-[#07090C]/70 border border-[#202A35] hover:border-[#F5F7FA] flex items-center justify-center text-[#F5F7FA]"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyInvite}
                data-testid="copy-invite-button"
                className="px-3 py-2 rounded-full bg-[#07090C]/70 border border-[#202A35] hover:border-[#5EC8FF] text-xs font-semibold text-[#F5F7FA] flex items-center gap-1.5"
              >
                {copiedInvite ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                    <span>Copied {invite?.invite_code || 'WINTER-ARC-42'}</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-[#5EC8FF]" />
                    <span>Invite ({invite?.invite_code || 'WINTER-ARC-42'})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('challenge-settings', { challengeId: challenge.id })}
                data-testid="challenge-settings-button"
                aria-label="Challenge Settings"
                className="h-10 w-10 rounded-full bg-[#07090C]/70 border border-[#202A35] hover:border-[#F5F7FA] flex items-center justify-center text-[#F5F7FA]"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Hero Title */}
          <div className="text-center py-4">
            <h1
              className="font-display font-extrabold text-4xl sm:text-5xl uppercase tracking-tight text-[#F5F7FA] drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]"
            >
              {challenge.name}
            </h1>
            <p className="mt-2 text-xs sm:text-sm font-medium text-[#8B98A8]">
              {progress.remainingDays || 42} days left • {members.length} members
            </p>
            <p className="mt-1 text-xs text-[#F5F7FA]/80 max-w-md mx-auto">
              {challenge.description}
            </p>
          </div>

          {/* Challenge Detail Tabs: Overview | Members | Leaderboard | Rules */}
          <div className="flex border-b border-[#202A35]/80">
            {(
              [
                { id: 'overview', label: 'Overview' },
                { id: 'members', label: 'Members' },
                { id: 'leaderboard', label: 'Leaderboard' },
                { id: 'rules', label: 'Rules' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                data-testid={`challenge-tab-${tab.id}`}
                className={cn(
                  'flex-1 py-2.5 text-xs sm:text-sm font-display font-bold text-center border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'text-[#F5F7FA]'
                    : 'border-transparent text-[#8B98A8] hover:text-[#F5F7FA]'
                )}
                style={
                  activeTab === tab.id ? { borderColor: accentColor, color: accentColor } : undefined
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TAB: OVERVIEW (Matches Screen 5 of UI Reference) */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* 3 Stat Boxes Row: 28% Progress | 12 Day Streak | 5 Members */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-4 text-center">
              <p className="font-display font-extrabold text-2xl text-[#F5F7FA]">
                {progress.percentage}%
              </p>
              <p className="text-xs text-[#8B98A8] mt-0.5">Progress</p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-[#121821] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progress.percentage}%`, backgroundColor: accentColor }}
                />
              </div>
            </div>

            <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-4 text-center">
              <p className="font-display font-extrabold text-2xl text-[#F5F7FA]">{streakDays}</p>
              <p className="text-xs text-[#8B98A8] mt-0.5">Day Streak</p>
            </div>

            <div
              onClick={() => navigate('challenge-members', { challengeId: challenge.id })}
              className="bg-[#0D1117] border border-[#202A35] hover:border-[#5EC8FF] rounded-2xl p-4 text-center cursor-pointer transition-colors"
            >
              <p className="font-display font-extrabold text-2xl text-[#F5F7FA]">
                {members.length}
              </p>
              <p className="text-xs text-[#8B98A8] mt-0.5">Members</p>
            </div>
          </div>

          {/* Show Diet Logs Toggle Card (Exact match to Screen 5 of UI Reference) */}
          <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-display font-bold text-sm text-[#F5F7FA]">Show Diet Logs</p>
              <p className="text-xs text-[#8B98A8]">
                {challenge.show_diet
                  ? 'Visible to all members in this challenge'
                  : 'Hidden — Members cannot view each other’s diet logs'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={challenge.show_diet}
              data-testid="toggle-show-diet-switch"
              onClick={handleToggleDietVisibility}
              className={cn(
                'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                challenge.show_diet ? 'bg-[#5EC8FF]' : 'bg-[#202A35]'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  challenge.show_diet ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Leaderboard Section inside Overview (Matches Screen 5) */}
          <LeaderboardPanel
            leaderboard={leaderboard}
            selectedMetric={effectiveChallenge.leaderboard_metric}
            onSelectMetric={handleMetricSelectChange}
          />
        </div>
      )}

      {/* TAB: MEMBERS (Matches Screen 9) */}
      {activeTab === 'members' && (
        <ChallengeMembersPanel
          challengeId={challenge.id}
          leaderboard={leaderboard}
          canManage={canManage}
          inviteCode={invite?.invite_code || 'WINTER-ARC-42'}
        />
      )}

      {/* TAB: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <LeaderboardPanel
          leaderboard={leaderboard}
          selectedMetric={effectiveChallenge.leaderboard_metric}
          onSelectMetric={handleMetricSelectChange}
        />
      )}

      {/* TAB: RULES */}
      {activeTab === 'rules' && (
        <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-5 space-y-4">
          <h3 className="font-display font-bold text-lg text-[#F5F7FA]">
            Challenge Rules & Configuration
          </h3>
          <div className="text-sm text-[#8B98A8] whitespace-pre-line leading-relaxed">
            {challenge.rules ||
              '1. Train consistently.\n2. Log all sets and reps honestly.\n3. Compete with discipline.'}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#202A35] text-xs">
            <div>
              <span className="text-[#8B98A8] block">Start Date</span>
              <strong className="text-[#F5F7FA]">{challenge.start_date}</strong>
            </div>
            <div>
              <span className="text-[#8B98A8] block">End Date</span>
              <strong className="text-[#F5F7FA]">{challenge.end_date}</strong>
            </div>
            <div>
              <span className="text-[#8B98A8] block">Visibility</span>
              <strong className="text-[#F5F7FA]">{challenge.visibility}</strong>
            </div>
            <div>
              <span className="text-[#8B98A8] block">Max Members</span>
              <strong className="text-[#F5F7FA]">{challenge.max_members}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardPanel({
  leaderboard,
  selectedMetric,
  onSelectMetric,
}: {
  leaderboard: ReturnType<typeof calculateLeaderboard>;
  selectedMetric: LeaderboardMetric;
  onSelectMetric: (m: LeaderboardMetric) => void;
}) {
  return (
    <div
      data-testid="challenge-leaderboard-panel"
      className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-4 sm:p-5 space-y-4 shadow-card"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#5EC8FF]" />
          <h3 className="font-display font-bold text-lg text-[#F5F7FA]">Leaderboard</h3>
        </div>

        <select
          aria-label="Select Leaderboard Metric"
          data-testid="leaderboard-metric-select"
          value={selectedMetric}
          onChange={(e) => onSelectMetric(e.target.value as LeaderboardMetric)}
          className="bg-[#121821] border border-[#202A35] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#F5F7FA] focus:outline-none focus:border-[#5EC8FF]"
        >
          <option value="training_volume">Total Volume</option>
          <option value="consistency">Consistency</option>
          <option value="workout_count">Workout Count</option>
          <option value="training_days">Training Days</option>
          <option value="pr_count">PR Count</option>
          <option value="diet_consistency">Diet Consistency</option>
        </select>
      </div>

      <div className="divide-y divide-[#202A35]">
        {leaderboard.map((entry) => (
          <div
            key={entry.userId}
            data-testid={`leaderboard-row-${entry.username}`}
            className="py-3 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <RankIndicator rank={entry.rank} />
              <img
                src={entry.avatarUrl}
                alt={entry.displayName}
                className="w-9 h-9 rounded-full object-cover bg-[#121821]"
              />
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-[#F5F7FA] truncate">
                  {entry.displayName.split(' ')[0]}
                </p>
                <p className="text-xs text-[#8B98A8]">
                  {entry.workoutCount} workouts • {entry.consistencyPct}% consistency
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="font-display font-bold text-base text-[#F5F7FA]">
                {entry.primaryFormatted}
              </p>
              <p className="text-xs text-[#5EC8FF]">{entry.secondaryFormatted}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SCREEN 9: CHALLENGE MEMBERS SCREEN & PANEL
 */
export function ChallengeMembersScreen() {
  const { activeChallengeId, currentUserId, navigate } = useAppStore();
  const uid = currentUserId || 'user-harsh';

  const data = useLiveQuery(async () => {
    const cid = activeChallengeId || 'challenge-winter-arc';
    const [challenge, members, invites, profiles, workouts, workoutExercises, sets, prs, dietLogs] =
      await Promise.all([
        db.cached_challenges.get(cid),
        db.challenge_members.where('challenge_id').equals(cid).toArray(),
        db.challenge_invites.where('challenge_id').equals(cid).toArray(),
        db.profiles.toArray(),
        db.workouts.toArray(),
        db.workout_exercises.toArray(),
        db.sets.toArray(),
        db.personal_records.toArray(),
        db.diet_logs.toArray(),
      ]);

    if (!challenge) return null;

    const weByWorkout = new Map<string, string[]>();
    for (const we of workoutExercises) {
      const list = weByWorkout.get(we.workout_id) || [];
      list.push(we.id);
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
      const weIds = weByWorkout.get(w.id) || [];
      const wSets = weIds.flatMap((id) => setsByWe.get(id) || []);
      workoutVolumes[w.id] = calculateWorkoutVolume(wSets);
    }

    const leaderboard = calculateLeaderboard({
      challenge,
      members,
      profiles,
      workouts,
      workoutVolumes,
      personalRecords: prs,
      dietLogs,
      referenceDateStr: DEMO_TODAY,
    });

    const myMembership = members.find((m) => m.user_id === uid);
    const canManage =
      challenge.creator_id === uid ||
      myMembership?.role === 'owner' ||
      myMembership?.role === 'admin';

    return {
      challenge,
      leaderboard,
      canManage,
      inviteCode: invites[0]?.invite_code || 'WINTER-ARC-42',
    };
  }, [activeChallengeId, uid]);

  if (!data) {
    return <div className="p-6 h-80 rounded-2xl bg-[#0D1117] animate-pulse" />;
  }

  return (
    <div data-testid="challenge-members-screen" className="pb-24 lg:pb-12 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('challenge-detail', { challengeId: data.challenge.id })}
            aria-label="Back to Challenge"
            className="h-10 w-10 rounded-xl bg-[#0D1117] border border-[#202A35] hover:border-[#5EC8FF] flex items-center justify-center text-[#F5F7FA]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display font-bold text-xl text-[#F5F7FA]">Challenge Members</h1>
            <p className="text-xs text-[#8B98A8]">{data.challenge.name}</p>
          </div>
        </div>
      </div>

      <ChallengeMembersPanel
        challengeId={data.challenge.id}
        leaderboard={data.leaderboard}
        canManage={data.canManage}
        inviteCode={data.inviteCode}
      />
    </div>
  );
}

function ChallengeMembersPanel({
  challengeId,
  leaderboard,
  canManage,
  inviteCode,
}: {
  challengeId: string;
  leaderboard: ReturnType<typeof calculateLeaderboard>;
  canManage: boolean;
  inviteCode: string;
}) {
  const { currentUserId, showToast } = useAppStore();
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const handleAction = async (
    targetUserId: string,
    action: 'make_admin' | 'make_member' | 'remove'
  ) => {
    try {
      await updateChallengeMemberRoleOrRemove({
        challengeId,
        actorUserId: currentUserId || 'user-harsh',
        targetUserId,
        action,
      });
      setOpenMenuUserId(null);
      showToast({
        title: 'Member Updated',
        subtitle: `Action ${action.replace('_', ' ')} completed`,
        type: 'success',
      });
    } catch (err) {
      showToast({
        title: 'Action Failed',
        subtitle: err instanceof Error ? err.message : 'Error updating member',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#5EC8FF]/15 text-[#5EC8FF] flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-[#F5F7FA]">
              Invite Training Partners
            </p>
            <p className="text-xs text-[#8B98A8]">
              Code: <strong className="text-[#5EC8FF]">{inviteCode}</strong> • Link:{' '}
              <code>fitkonic.app/join/{inviteCode}</code>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setInviteModalOpen(true)}
          data-testid="open-invite-modal-button"
          className="h-9 w-9 rounded-full bg-[#5EC8FF] text-[#07090C] flex items-center justify-center shadow-glow-cyan"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Member List matching Screen 9 of UI Reference */}
      <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl divide-y divide-[#202A35]">
        {leaderboard.map((member) => (
          <div
            key={member.userId}
            className="p-4 flex items-center justify-between gap-3 relative"
          >
            <div className="flex items-center gap-3.5">
              {member.rank === 1 ? (
                <Crown className="w-5 h-5 text-[#FBBF24] fill-[#FBBF24]" />
              ) : (
                <span className="w-5 text-center font-display font-bold text-sm text-[#8B98A8]">
                  {member.rank}
                </span>
              )}
              <img
                src={member.avatarUrl}
                alt={member.displayName}
                className="w-10 h-10 rounded-full object-cover bg-[#121821]"
              />
              <div>
                <p className="font-display font-bold text-sm text-[#F5F7FA]">
                  {member.displayName.split(' ')[0]}
                </p>
                <p className="text-xs text-[#8B98A8]">
                  {member.role === 'owner' || member.role === 'admin' ? 'Admin' : 'Member'} •{' '}
                  {member.workoutCount} workouts ({member.consistencyPct}%)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canManage && member.role !== 'owner' && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuUserId(openMenuUserId === member.userId ? null : member.userId)
                    }
                    className="h-8 w-8 rounded-lg hover:bg-[#121821] flex items-center justify-center text-[#8B98A8]"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {openMenuUserId === member.userId && (
                    <div className="absolute right-0 mt-1 w-40 rounded-xl bg-[#121821] border border-[#202A35] shadow-card py-1 z-20 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          handleAction(
                            member.userId,
                            member.role === 'admin' ? 'make_member' : 'make_admin'
                          )
                        }
                        className="w-full px-3 py-2 text-left text-[#F5F7FA] hover:bg-[#0D1117]"
                      >
                        {member.role === 'admin' ? 'Set as Member' : 'Promote to Admin'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(member.userId, 'remove')}
                        className="w-full px-3 py-2 text-left text-[#FF5C5C] hover:bg-[#0D1117]"
                      >
                        Remove from Challenge
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {inviteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="font-display font-bold text-lg text-[#F5F7FA]">
              Invite Friends to Challenge
            </h3>
            <p className="text-xs text-[#8B98A8]">
              Share this invite link or code with your training partners:
            </p>
            <div className="p-3.5 rounded-xl bg-[#121821] border border-[#202A35] flex items-center justify-between">
              <code className="font-display font-bold text-sm text-[#5EC8FF]">
                fitkonic.app/join/{inviteCode}
              </code>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    void navigator.clipboard.writeText(`https://fitkonic.app/join/${inviteCode}`);
                  }
                  showToast({ title: 'Invite Link Copied', type: 'success' });
                }}
                className="px-3 py-1 rounded-lg bg-[#5EC8FF] text-[#07090C] font-display font-bold text-xs"
              >
                <Copy className="w-3.5 h-3.5 inline mr-1" />
                Copy
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#121821] text-xs font-semibold text-[#F5F7FA]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SCREEN 8: CREATE CHALLENGE SCREEN + VISUAL THEME PICKER
 */
export function CreateChallengeScreen() {
  const { currentUserId, setActiveChallengeId, navigate, showToast } = useAppStore();

  const [name, setName] = useState('Winter Arc');
  const [description, setDescription] = useState(
    '42 days of discipline. Train, fuel and grow together.'
  );
  const [durationDays, setDurationDays] = useState(42);
  const [startDate, setStartDate] = useState('2026-10-07');
  const [endDate, setEndDate] = useState('2026-11-17');
  const [visibility, setVisibility] = useState<ChallengeVisibility>('INVITE_ONLY');
  const [maxMembers, setMaxMembers] = useState(15);
  const [showDiet, setShowDiet] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [showWorkouts, setShowWorkouts] = useState(true);
  const [allowInvites, setAllowInvites] = useState(true);
  const [metric, setMetric] = useState<LeaderboardMetric>('consistency');

  // Theme state
  const [selectedPresetId, setSelectedPresetId] = useState('winter-arc');
  const [backgroundUrl, setBackgroundUrl] = useState('/themes/winter-arc.svg');
  const [accentColor, setAccentColor] = useState('#7DD3FC');
  const [overlayOpacity, setOverlayOpacity] = useState(0.62);
  const [backgroundPosition, setBackgroundPosition] = useState('center center');
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSelectPreset = (preset: (typeof PRESET_CHALLENGE_THEMES)[number]) => {
    setSelectedPresetId(preset.id);
    setBackgroundUrl(preset.backgroundUrl);
    setAccentColor(preset.accentColor);
    setOverlayOpacity(preset.overlayOpacity);
    setBackgroundPosition(preset.backgroundPosition);
  };

  const handleDurationChange = (days: number) => {
    setDurationDays(days);
    const start = new Date(startDate || '2026-10-07');
    const end = new Date(start.getTime() + (days - 1) * 86400000);
    setEndDate(end.toISOString().slice(0, 10));
  };

  const handleCustomBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setSelectedPresetId('custom');
      setBackgroundUrl(dataUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Invalid background image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const { challenge, invite } = await createChallengeRecord({
      creatorId: currentUserId || 'user-harsh',
      name,
      description,
      start_date: startDate,
      end_date: endDate,
      visibility,
      max_members: maxMembers,
      background_image_url: backgroundUrl,
      background_position: backgroundPosition,
      background_overlay: overlayOpacity,
      accent_color: accentColor,
      show_leaderboard: showLeaderboard,
      show_diet: showDiet,
      show_workouts: showWorkouts,
      allow_member_invites: allowInvites,
      leaderboard_metric: metric,
    });

    setActiveChallengeId(challenge.id);
    navigate('challenge-detail', { challengeId: challenge.id });
    showToast({
      title: `${challenge.name} Created`,
      subtitle: `Invite code: ${invite.invite_code}`,
      type: 'success',
    });
  };

  return (
    <div data-testid="create-challenge-screen" className="pb-28 lg:pb-12 space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('challenges')}
          aria-label="Back"
          className="h-10 w-10 rounded-xl bg-[#0D1117] border border-[#202A35] hover:border-[#5EC8FF] flex items-center justify-center text-[#F5F7FA]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display font-bold text-xl text-[#F5F7FA]">Create Challenge</h1>
          <p className="text-xs text-[#8B98A8]">
            Custom name, duration, rules, background and settings
          </p>
        </div>
      </div>

      {/* Live Theme Banner Preview (Matches Screen 8 of UI Reference) */}
      <div className="relative h-44 rounded-2xl overflow-hidden border border-[#202A35] flex flex-col items-center justify-center shadow-card">
        <div
          className="absolute inset-0 bg-cover transition-all"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            backgroundPosition,
          }}
        />
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(7,9,12,${overlayOpacity})` }}
        />

        <div className="relative z-10 text-center px-4">
          <h2 className="font-display font-extrabold text-3xl uppercase tracking-tight text-[#F5F7FA]">
            {name || 'CHALLENGE NAME'}
          </h2>
          <p className="text-xs font-semibold mt-1" style={{ color: accentColor }}>
            {durationDays} Days • {METRIC_LABELS[metric]}
          </p>

          <button
            type="button"
            onClick={() => setThemePickerOpen((v) => !v)}
            data-testid="change-background-button"
            className="mt-3 px-4 py-2 rounded-xl bg-[#07090C]/85 border border-[#202A35] hover:border-[#5EC8FF] text-xs font-display font-bold text-[#F5F7FA] inline-flex items-center gap-2"
          >
            <Palette className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span>Change Background & Theme</span>
          </button>
        </div>
      </div>

      {/* THEME PICKER PANEL (Section 60 + Challenge Theme Examples from UI Reference) */}
      {themePickerOpen && (
        <div
          data-testid="challenge-theme-picker"
          className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-4 space-y-4 shadow-card"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-[#F5F7FA]">
              Challenge Theme Presets
            </h3>
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5EC8FF] cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Custom Background</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleCustomBgUpload}
                className="hidden"
              />
            </label>
          </div>
          {uploadError && <p className="text-xs text-[#FF5C5C]">{uploadError}</p>}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PRESET_CHALLENGE_THEMES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                data-testid={`theme-preset-${preset.id}`}
                className={cn(
                  'relative h-24 rounded-xl overflow-hidden border text-left p-3 flex flex-col justify-end transition-all',
                  selectedPresetId === preset.id
                    ? 'border-[#5EC8FF] ring-2 ring-[#5EC8FF]/40'
                    : 'border-[#202A35] hover:border-[#8B98A8]'
                )}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${preset.backgroundUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07090C] via-[#07090C]/50 to-transparent" />
                <div className="relative z-10">
                  <p className="font-display font-extrabold text-xs uppercase text-[#F5F7FA]">
                    {preset.name}
                  </p>
                  <p className="text-[11px] font-medium" style={{ color: preset.accentColor }}>
                    {preset.subtitle}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#202A35]">
            <div>
              <label className="block text-xs text-[#8B98A8] mb-1">Accent Color</label>
              <div className="flex items-center gap-2">
                {['#7DD3FC', '#F59E0B', '#EF4444', '#22C55E', '#F97316', '#5EC8FF'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setAccentColor(hex)}
                    className={cn(
                      'w-6 h-6 rounded-full border',
                      accentColor === hex ? 'border-white scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#8B98A8] mb-1">
                Overlay Opacity ({Math.round(overlayOpacity * 100)}%)
              </label>
              <input
                type="range"
                min="0.2"
                max="0.9"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-full accent-[#5EC8FF]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8B98A8] mb-1">Background Position</label>
              <select
                value={backgroundPosition}
                onChange={(e) => setBackgroundPosition(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#121821] border border-[#202A35] text-xs text-[#F5F7FA]"
              >
                <option value="center center">Center</option>
                <option value="top center">Top</option>
                <option value="bottom center">Bottom</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Create Challenge Form (Matches Screen 8 of UI Reference) */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8B98A8] mb-1">
              Challenge Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="challenge-name-input"
              placeholder="Winter Arc"
              className="w-full px-4 py-3 rounded-xl bg-[#121821] border border-[#202A35] text-sm font-semibold text-[#F5F7FA] focus:outline-none focus:border-[#5EC8FF]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8B98A8] mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="challenge-description-input"
              className="w-full px-4 py-2.5 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA] focus:outline-none focus:border-[#5EC8FF]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#8B98A8] mb-1">Duration</label>
              <select
                value={durationDays}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
                data-testid="challenge-duration-select"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA]"
              >
                <option value={21}>21 days</option>
                <option value={30}>30 days</option>
                <option value={42}>42 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8B98A8] mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8B98A8] mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA]"
              />
            </div>
          </div>

          {/* Enable Diet Tracking Toggle matching Screen 8 */}
          <div className="pt-2 flex items-center justify-between gap-4 border-t border-[#202A35]">
            <div>
              <p className="font-display font-bold text-sm text-[#F5F7FA]">
                Enable Diet Tracking
              </p>
              <p className="text-xs text-[#8B98A8]">
                Members can view each other’s diet logs.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showDiet}
              onClick={() => setShowDiet((v) => !v)}
              className={cn(
                'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                showDiet ? 'bg-[#5EC8FF]' : 'bg-[#202A35]'
              )}
            >
              <span
                className={cn(
                  'inline-block h-6 w-6 transform rounded-full bg-white transition',
                  showDiet ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#202A35]">
            <div>
              <label className="block text-xs font-medium text-[#8B98A8] mb-1">Privacy</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as ChallengeVisibility)}
                data-testid="challenge-privacy-select"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA]"
              >
                <option value="INVITE_ONLY">Invite only</option>
                <option value="PRIVATE">Private</option>
                <option value="PUBLIC">Public</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8B98A8] mb-1">
                Leaderboard Metric
              </label>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as LeaderboardMetric)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA]"
              >
                <option value="consistency">Consistency</option>
                <option value="training_volume">Training Volume</option>
                <option value="workout_count">Workout Count</option>
                <option value="training_days">Training Days</option>
                <option value="pr_count">PR Count</option>
                <option value="diet_consistency">Diet Consistency</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8B98A8] mb-1">
                Member Limit
              </label>
              <input
                type="number"
                min={2}
                max={500}
                value={maxMembers}
                onChange={(e) => setMaxMembers(Number(e.target.value) || 15)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA]"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          data-testid="submit-create-challenge-button"
          className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-[#38BDF8] to-[#5EC8FF] text-[#07090C] font-display font-extrabold text-base uppercase tracking-wider shadow-glow-cyan hover:brightness-110 transition-all"
        >
          Create Challenge
        </button>
      </form>
    </div>
  );
}

/**
 * CHALLENGE SETTINGS & DANGER ZONE (Section 88)
 */
export function ChallengeSettingsScreen() {
  const { activeChallengeId, currentUserId, navigate, showToast } = useAppStore();
  const uid = currentUserId || 'user-harsh';
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const challenge = useLiveQuery(
    () => db.cached_challenges.get(activeChallengeId || 'challenge-winter-arc'),
    [activeChallengeId]
  );

  if (!challenge) {
    return <div className="p-6 h-40 rounded-2xl bg-[#0D1117] animate-pulse" />;
  }

  const handleSaveField = async (updates: Partial<typeof challenge>) => {
    try {
      await updateChallengeSettings(challenge.id, uid, updates);
      showToast({
        title: 'Challenge Settings Updated',
        type: 'success',
      });
    } catch (err) {
      showToast({
        title: 'Permission Denied',
        subtitle: err instanceof Error ? err.message : 'Cannot update settings',
        type: 'error',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteChallengeRecord(challenge.id, uid);
      setConfirmDeleteOpen(false);
      navigate('challenges');
      showToast({
        title: 'Challenge Deleted',
        type: 'info',
      });
    } catch (err) {
      setConfirmDeleteOpen(false);
      showToast({
        title: 'Cannot Delete Challenge',
        subtitle: err instanceof Error ? err.message : 'Only owner can delete',
        type: 'error',
      });
    }
  };

  return (
    <div data-testid="challenge-settings-screen" className="pb-24 lg:pb-12 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('challenge-detail', { challengeId: challenge.id })}
          className="h-10 w-10 rounded-xl bg-[#0D1117] border border-[#202A35] flex items-center justify-center text-[#F5F7FA]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display font-bold text-xl text-[#F5F7FA]">Challenge Settings</h1>
          <p className="text-xs text-[#8B98A8]">{challenge.name}</p>
        </div>
      </div>

      <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-5 space-y-4">
        <h3 className="font-display font-bold text-base text-[#F5F7FA] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#5EC8FF]" />
          <span>Tracking & Privacy Controls</span>
        </h3>

        <div className="flex items-center justify-between py-2 border-b border-[#202A35]">
          <div>
            <p className="text-sm font-semibold text-[#F5F7FA]">Diet Tracking Visibility</p>
            <p className="text-xs text-[#8B98A8]">
              Enforce whether members can view each other’s diet logs
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSaveField({ show_diet: !challenge.show_diet })}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-display font-bold uppercase',
              challenge.show_diet
                ? 'bg-[#5EC8FF] text-[#07090C]'
                : 'bg-[#121821] text-[#8B98A8]'
            )}
          >
            {challenge.show_diet ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-[#202A35]">
          <div>
            <p className="text-sm font-semibold text-[#F5F7FA]">Leaderboard Metric</p>
            <p className="text-xs text-[#8B98A8]">Primary ranking criterion</p>
          </div>
          <select
            value={challenge.leaderboard_metric}
            onChange={(e) =>
              handleSaveField({ leaderboard_metric: e.target.value as LeaderboardMetric })
            }
            className="bg-[#121821] border border-[#202A35] rounded-xl px-3 py-1.5 text-xs text-[#F5F7FA]"
          >
            <option value="consistency">Consistency</option>
            <option value="training_volume">Training Volume</option>
            <option value="workout_count">Workout Count</option>
            <option value="training_days">Training Days</option>
            <option value="pr_count">PR Count</option>
            <option value="diet_consistency">Diet Consistency</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-[#F5F7FA]">Member Management</p>
            <p className="text-xs text-[#8B98A8]">Manage roles and invitations</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('challenge-members', { challengeId: challenge.id })}
            className="px-3 py-1.5 rounded-xl bg-[#121821] border border-[#202A35] text-xs font-semibold text-[#5EC8FF] flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Members</span>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[#0D1117] border border-[#FF5C5C]/40 rounded-2xl p-5 space-y-3">
        <h3 className="font-display font-bold text-base text-[#FF5C5C]">Danger Zone</h3>
        <p className="text-xs text-[#8B98A8]">
          Deleting a challenge removes its leaderboard and member associations permanently.
          Individual member workouts remain safely in their personal logs.
        </p>
        <button
          type="button"
          onClick={() => setConfirmDeleteOpen(true)}
          data-testid="delete-challenge-trigger"
          className="px-4 py-2.5 rounded-xl bg-[#FF5C5C]/15 border border-[#FF5C5C]/40 hover:bg-[#FF5C5C] hover:text-white text-xs font-display font-bold uppercase text-[#FF5C5C] flex items-center gap-2 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Challenge</span>
        </button>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`Delete ${challenge.name}?`}
        description="This action cannot be undone. Are you sure you want to permanently delete this challenge?"
        confirmLabel="Delete Challenge"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
