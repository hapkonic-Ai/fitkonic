import { describe, it, expect } from 'vitest';
import {
  calculateSetVolume,
  calculateWorkoutVolume,
  calculateTotalReps,
  calculateEstimated1RM,
  detectExercisePR,
  calculateChallengeProgress,
  calculateStreak,
  calculateDailyDietTotals,
  canUserViewDietLog,
  calculateLeaderboard,
} from './index';
import { createSyncMeta } from '@/lib/utils';
import type { Challenge, ChallengeMember, UserProfile, Workout } from '@/types';

describe('Fitkonic Domain Calculations', () => {
  it('calculates set and workout volume accurately (60x8 + 60x8 + 65x6 = 1350 kg)', () => {
    expect(calculateSetVolume(60, 8)).toBe(480);
    expect(calculateSetVolume(65, 6)).toBe(390);

    const sets = [
      { weight: 60, reps: 8, completed: true },
      { weight: 60, reps: 8, completed: true },
      { weight: 65, reps: 6, completed: true },
      { weight: 70, reps: 5, completed: false }, // uncompleted set ignored
    ];
    expect(calculateWorkoutVolume(sets)).toBe(1350);
    expect(calculateTotalReps(sets)).toBe(22);
  });

  it('calculates Epley 1RM accurately (75kg x 5 = 87.5kg)', () => {
    expect(calculateEstimated1RM(75, 5)).toBe(87.5);
    expect(calculateEstimated1RM(100, 1)).toBe(100);
    expect(calculateEstimated1RM(60, 10)).toBe(80);
  });

  it('detects new Personal Records when estimated 1RM exceeds history', () => {
    const existingPRs = [
      { exercise_id: 'ex-bench', weight: 70, reps: 5, estimated_1rm: 81.7 },
    ];
    const completedSets = [
      { weight: 60, reps: 8, completed: true },
      { weight: 75, reps: 5, completed: true }, // 87.5 kg 1RM
    ];
    const pr = detectExercisePR('ex-bench', completedSets, existingPRs);
    expect(pr).not.toBeNull();
    expect(pr?.weight).toBe(75);
    expect(pr?.reps).toBe(5);
    expect(pr?.estimated1RM).toBe(87.5);
  });

  it('calculates challenge progress dynamically from start and end dates', () => {
    const stats = calculateChallengeProgress('2026-10-01', '2026-11-11', '2026-10-19');
    expect(stats.totalDays).toBe(42);
    expect(stats.elapsedDays).toBe(19);
    expect(stats.remainingDays).toBe(23);
    expect(stats.percentage).toBe(45);
  });

  it('calculates training streak across consecutive workout dates', () => {
    const dates = ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'];
    expect(calculateStreak(dates, '2026-10-07')).toBe(4);
    expect(calculateStreak(['2026-10-01'], '2026-10-07')).toBe(0);
  });

  it('calculates daily diet totals accurately', () => {
    const totals = calculateDailyDietTotals([
      { calories: 560, protein: 32, carbs: 60, fat: 18 },
      { calories: 720, protein: 60, carbs: 80, fat: 20 },
    ]);
    expect(totals.calories).toBe(1280);
    expect(totals.protein).toBe(92);
    expect(totals.carbs).toBe(140);
    expect(totals.fat).toBe(38);
    expect(totals.mealCount).toBe(2);
  });

  it('enforces challenge-level diet privacy strictly', () => {
    const log = { user_id: 'user-1', challenge_id: 'chal-1' };
    // Owner can always see their own log
    expect(
      canUserViewDietLog(log, 'user-1', { id: 'chal-1', show_diet: false }, true)
    ).toBe(true);
    // Other member CANNOT see log when show_diet is false
    expect(
      canUserViewDietLog(log, 'user-2', { id: 'chal-1', show_diet: false }, true)
    ).toBe(false);
    // Other member CAN see log when show_diet is true
    expect(
      canUserViewDietLog(log, 'user-2', { id: 'chal-1', show_diet: true }, true)
    ).toBe(true);
  });

  it('ranks leaderboard members accurately according to challenge metric', () => {
    const meta = createSyncMeta('synced');
    const challenge: Challenge = {
      ...meta,
      id: 'c-winter',
      creator_id: 'u-1',
      name: 'Winter Arc',
      slug: 'winter-arc',
      description: '42 days',
      start_date: '2026-09-28',
      end_date: '2026-11-08',
      status: 'ACTIVE',
      visibility: 'INVITE_ONLY',
      max_members: 10,
      background_image_url: '/themes/winter-arc.svg',
      background_position: 'center',
      background_overlay: 0.6,
      accent_color: '#7DD3FC',
      show_leaderboard: true,
      show_diet: true,
      show_workouts: true,
      allow_member_invites: true,
      leaderboard_metric: 'training_volume',
      created_at: '2026-09-28T00:00:00Z',
      updated_at: '2026-09-28T00:00:00Z',
    };

    const profiles: UserProfile[] = [
      {
        ...meta,
        id: 'u-1',
        email: 'harsh@fitkonic.app',
        display_name: 'Harsh',
        username: 'harsh',
        avatar_url: '',
        bio: '',
        height: 180,
        weight: 130,
        date_of_birth: '1999-01-01',
        fitness_goal: 'Strength',
        primary_sport: 'Lifting',
        created_at: '',
        updated_at: '',
      },
      {
        ...meta,
        id: 'u-2',
        email: 'arjun@fitkonic.app',
        display_name: 'Arjun',
        username: 'arjun',
        avatar_url: '',
        bio: '',
        height: 178,
        weight: 82,
        date_of_birth: '1999-01-01',
        fitness_goal: 'Hypertrophy',
        primary_sport: 'Lifting',
        created_at: '',
        updated_at: '',
      },
    ];

    const members: ChallengeMember[] = [
      { ...meta, id: 'm1', challenge_id: 'c-winter', user_id: 'u-1', role: 'owner', joined_at: '', status: 'active' },
      { ...meta, id: 'm2', challenge_id: 'c-winter', user_id: 'u-2', role: 'member', joined_at: '', status: 'active' },
    ];

    const workouts: Workout[] = [
      { ...meta, id: 'w1', user_id: 'u-1', challenge_id: 'c-winter', workout_date: '2026-10-06', name: 'Push', duration_minutes: 60, notes: '', completed: true, created_at: '', updated_at: '' },
      { ...meta, id: 'w2', user_id: 'u-2', challenge_id: 'c-winter', workout_date: '2026-10-06', name: 'Pull', duration_minutes: 55, notes: '', completed: true, created_at: '', updated_at: '' },
    ];

    const rankings = calculateLeaderboard({
      challenge,
      members,
      profiles,
      workouts,
      workoutVolumes: { w1: 18420, w2: 16340 },
      personalRecords: [],
      dietLogs: [],
      referenceDateStr: '2026-10-07',
    });

    expect(rankings[0].displayName).toBe('Harsh');
    expect(rankings[0].rank).toBe(1);
    expect(rankings[0].totalVolume).toBe(18420);
    expect(rankings[1].displayName).toBe('Arjun');
    expect(rankings[1].rank).toBe(2);
  });
});
