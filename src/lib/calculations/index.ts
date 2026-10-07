import { differenceInCalendarDays, parseISO, subDays, format } from 'date-fns';
import type {
  Challenge,
  ChallengeMember,
  DietLog,
  LeaderboardEntry,
  PersonalRecord,
  UserProfile,
  Workout,
  WorkoutSet,
} from '@/types';

/**
 * Calculate single set volume = weight * reps (only if weight > 0 and reps > 0)
 */
export function calculateSetVolume(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return Math.round(weight * reps * 100) / 100;
}

/**
 * Calculate total workout volume across completed sets: sum(weight * reps)
 */
export function calculateWorkoutVolume(
  sets: Array<Pick<WorkoutSet, 'weight' | 'reps' | 'completed'>>
): number {
  return sets
    .filter((s) => s.completed)
    .reduce((acc, s) => acc + calculateSetVolume(s.weight, s.reps), 0);
}

/**
 * Calculate total completed reps across sets
 */
export function calculateTotalReps(
  sets: Array<Pick<WorkoutSet, 'reps' | 'completed'>>
): number {
  return sets.filter((s) => s.completed).reduce((acc, s) => acc + Math.max(0, s.reps), 0);
}

/**
 * Epley 1RM Formula: 1RM = weight * (1 + reps / 30)
 * For 1 rep, 1RM = weight.
 */
export function calculateEstimated1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return Math.round(weight * 10) / 10;
  const est = weight * (1 + reps / 30);
  return Math.round(est * 10) / 10;
}

export interface DetectedPR {
  exerciseId: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  prType: '1rm' | 'max_weight' | 'reps';
  previousBest1RM: number;
}

/**
 * Detect Personal Records from newly completed sets for an exercise
 */
export function detectExercisePR(
  exerciseId: string,
  completedSets: Array<Pick<WorkoutSet, 'weight' | 'reps' | 'completed'>>,
  existingPRs: Array<Pick<PersonalRecord, 'exercise_id' | 'weight' | 'reps' | 'estimated_1rm'>>
): DetectedPR | null {
  const validSets = completedSets.filter((s) => s.completed && s.weight > 0 && s.reps > 0);
  if (validSets.length === 0) return null;

  const historyForExercise = existingPRs.filter((pr) => pr.exercise_id === exerciseId);
  const previousBest1RM = historyForExercise.reduce(
    (max, pr) => Math.max(max, pr.estimated_1rm),
    0
  );
  const previousMaxWeight = historyForExercise.reduce(
    (max, pr) => Math.max(max, pr.weight),
    0
  );

  let bestCandidate: { weight: number; reps: number; estimated1RM: number } | null = null;
  for (const s of validSets) {
    const est = calculateEstimated1RM(s.weight, s.reps);
    if (!bestCandidate || est > bestCandidate.estimated1RM) {
      bestCandidate = { weight: s.weight, reps: s.reps, estimated1RM: est };
    }
  }

  if (!bestCandidate) return null;

  if (bestCandidate.estimated1RM > previousBest1RM) {
    return {
      exerciseId,
      weight: bestCandidate.weight,
      reps: bestCandidate.reps,
      estimated1RM: bestCandidate.estimated1RM,
      prType: bestCandidate.weight > previousMaxWeight ? 'max_weight' : '1rm',
      previousBest1RM,
    };
  }

  return null;
}

export interface ChallengeProgressStats {
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  percentage: number;
  isCompleted: boolean;
}

/**
 * Calculate challenge date progress dynamically based on start, end, and current date
 */
export function calculateChallengeProgress(
  startDateStr: string,
  endDateStr: string,
  currentDateStr: string = format(new Date(), 'yyyy-MM-dd')
): ChallengeProgressStats {
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);
  const current = parseISO(currentDateStr);

  const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const rawElapsed = differenceInCalendarDays(current, start) + 1;
  const elapsedDays = Math.min(totalDays, Math.max(0, rawElapsed));
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const percentage = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  return {
    totalDays,
    elapsedDays,
    remainingDays,
    percentage,
    isCompleted: remainingDays === 0,
  };
}

/**
 * Calculate consecutive day training streak up to referenceDate
 */
export function calculateStreak(
  workoutDates: string[],
  referenceDateStr: string = format(new Date(), 'yyyy-MM-dd')
): number {
  if (workoutDates.length === 0) return 0;
  const uniqueDates = new Set(workoutDates);
  const refDate = parseISO(referenceDateStr);

  let cursor = refDate;
  const todayStr = format(cursor, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(cursor, 1), 'yyyy-MM-dd');

  if (!uniqueDates.has(todayStr)) {
    if (uniqueDates.has(yesterdayStr)) {
      cursor = subDays(cursor, 1);
    } else {
      return 0;
    }
  }

  let streak = 0;
  while (uniqueDates.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export interface DailyDietTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount: number;
}

/**
 * Calculate daily macro & calorie totals from meal logs
 */
export function calculateDailyDietTotals(
  meals: Array<Pick<DietLog, 'calories' | 'protein' | 'carbs' | 'fat'>>
): DailyDietTotals {
  return meals.reduce<DailyDietTotals>(
    (acc, meal) => ({
      calories: acc.calories + Math.round(meal.calories || 0),
      protein: Math.round((acc.protein + (meal.protein || 0)) * 10) / 10,
      carbs: Math.round((acc.carbs + (meal.carbs || 0)) * 10) / 10,
      fat: Math.round((acc.fat + (meal.fat || 0)) * 10) / 10,
      mealCount: acc.mealCount + 1,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 }
  );
}

/**
 * Database/Repository-level Diet Privacy Enforcement:
 * Users can always view their own diet logs.
 * Other users can ONLY view a challenge diet log if `challenge.show_diet === true` AND they are active challenge members.
 */
export function canUserViewDietLog(
  dietLog: Pick<DietLog, 'user_id' | 'challenge_id'>,
  viewerUserId: string,
  challenge: Pick<Challenge, 'id' | 'show_diet'> | null | undefined,
  isViewerMember: boolean
): boolean {
  if (dietLog.user_id === viewerUserId) return true;
  if (!challenge || !isViewerMember) return false;
  if (dietLog.challenge_id !== challenge.id) return false;
  return Boolean(challenge.show_diet);
}

/**
 * Calculate Challenge Leaderboard rankings across all 6 metrics:
 * consistency, training_volume, workout_count, training_days, pr_count, diet_consistency
 */
export function calculateLeaderboard(params: {
  challenge: Challenge;
  members: ChallengeMember[];
  profiles: UserProfile[];
  workouts: Workout[];
  workoutVolumes: Record<string, number>;
  personalRecords: PersonalRecord[];
  dietLogs: DietLog[];
  referenceDateStr?: string;
}): LeaderboardEntry[] {
  const {
    challenge,
    members,
    profiles,
    workouts,
    workoutVolumes,
    personalRecords,
    dietLogs,
    referenceDateStr = '2026-10-07',
  } = params;

  const progress = calculateChallengeProgress(
    challenge.start_date,
    challenge.end_date,
    referenceDateStr
  );
  const activeDays = Math.max(1, progress.elapsedDays);
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const activeMembers = members.filter(
    (m) => m.challenge_id === challenge.id && m.status === 'active'
  );

  const entries: LeaderboardEntry[] = activeMembers.map((member) => {
    const profile = profileMap.get(member.user_id);
    const userWorkouts = workouts.filter(
      (w) =>
        w.user_id === member.user_id &&
        w.completed &&
        (w.challenge_id === challenge.id ||
          (w.workout_date >= challenge.start_date && w.workout_date <= challenge.end_date))
    );

    const workoutCount = userWorkouts.length;
    const uniqueTrainingDays = new Set(userWorkouts.map((w) => w.workout_date)).size;
    const consistencyPct = Math.min(
      100,
      Math.round((uniqueTrainingDays / activeDays) * 100)
    );

    const totalVolume = userWorkouts.reduce(
      (sum, w) => sum + (workoutVolumes[w.id] || 0),
      0
    );

    const prCount = personalRecords.filter(
      (pr) =>
        pr.user_id === member.user_id &&
        pr.achieved_at.slice(0, 10) >= challenge.start_date &&
        pr.achieved_at.slice(0, 10) <= challenge.end_date
    ).length;

    const userDietDays = new Set(
      dietLogs
        .filter(
          (d) =>
            d.user_id === member.user_id &&
            d.date >= challenge.start_date &&
            d.date <= challenge.end_date
        )
        .map((d) => d.date)
    ).size;

    const dietConsistencyPct = Math.min(
      100,
      Math.round((userDietDays / activeDays) * 100)
    );

    const streakDays = calculateStreak(
      userWorkouts.map((w) => w.workout_date),
      referenceDateStr
    );

    let primaryValue = consistencyPct;
    let primaryFormatted = `${consistencyPct}%`;
    let secondaryFormatted = `${workoutCount} workouts`;

    switch (challenge.leaderboard_metric) {
      case 'consistency':
        primaryValue = consistencyPct;
        primaryFormatted = `${consistencyPct}%`;
        secondaryFormatted = `${uniqueTrainingDays} days`;
        break;
      case 'training_volume':
        primaryValue = totalVolume;
        primaryFormatted = `${ totalVolume.toLocaleString('en-US') } kg`;
        secondaryFormatted = `${consistencyPct}%`;
        break;
      case 'workout_count':
        primaryValue = workoutCount;
        primaryFormatted = `${workoutCount} workouts`;
        secondaryFormatted = `${consistencyPct}%`;
        break;
      case 'training_days':
        primaryValue = uniqueTrainingDays;
        primaryFormatted = `${uniqueTrainingDays} days`;
        secondaryFormatted = `${consistencyPct}%`;
        break;
      case 'pr_count':
        primaryValue = prCount;
        primaryFormatted = `${prCount} PRs`;
        secondaryFormatted = `${totalVolume.toLocaleString('en-US')} kg`;
        break;
      case 'diet_consistency':
        primaryValue = dietConsistencyPct;
        primaryFormatted = `${dietConsistencyPct}%`;
        secondaryFormatted = `${userDietDays} days logged`;
        break;
    }

    return {
      rank: 0,
      userId: member.user_id,
      displayName: profile?.display_name || 'Athlete',
      username: profile?.username || 'athlete',
      avatarUrl: profile?.avatar_url || '',
      role: member.role,
      consistencyPct,
      workoutCount,
      trainingDays: uniqueTrainingDays,
      totalVolume,
      prCount,
      dietConsistencyPct,
      primaryValue,
      primaryFormatted,
      secondaryFormatted,
      streakDays,
    };
  });

  entries.sort((a, b) => {
    if (b.primaryValue !== a.primaryValue) return b.primaryValue - a.primaryValue;
    if (b.consistencyPct !== a.consistencyPct) return b.consistencyPct - a.consistencyPct;
    return b.totalVolume - a.totalVolume;
  });

  return entries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}
