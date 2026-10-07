import { z } from 'zod';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface SyncMetadata {
  _syncStatus: SyncStatus;
  _lastModified: number;
  _localVersion: number;
  _serverVersion?: number;
  _deletedAt?: string | null;
}

export type ChallengeVisibility = 'PRIVATE' | 'INVITE_ONLY' | 'PUBLIC';

export type LeaderboardMetric =
  | 'consistency'
  | 'training_volume'
  | 'workout_count'
  | 'training_days'
  | 'pr_count'
  | 'diet_consistency';

export type MemberRole = 'owner' | 'admin' | 'member';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface ChallengeTheme {
  backgroundType: 'preset' | 'custom';
  backgroundId: string;
  backgroundUrl: string;
  accentColor: string;
  overlayOpacity: number;
  backgroundPosition: string;
}

export interface PresetThemeOption {
  id: string;
  name: string;
  subtitle: string;
  accentColor: string;
  backgroundUrl: string;
  overlayOpacity: number;
  backgroundPosition: string;
}

export const PRESET_CHALLENGE_THEMES: PresetThemeOption[] = [
  {
    id: 'winter-arc',
    name: 'Winter Arc',
    subtitle: 'Discipline & Consistency',
    accentColor: '#7DD3FC',
    backgroundUrl: '/themes/winter-arc.svg',
    overlayOpacity: 0.62,
    backgroundPosition: 'center center',
  },
  {
    id: 'summer-shred',
    name: 'Summer Shred',
    subtitle: 'Beach / Aesthetic',
    accentColor: '#F59E0B',
    backgroundUrl: '/themes/summer-shred.svg',
    overlayOpacity: 0.58,
    backgroundPosition: 'center center',
  },
  {
    id: 'powerlifting-peak',
    name: 'Powerlifting Peak',
    subtitle: 'Strength Focus',
    accentColor: '#EF4444',
    backgroundUrl: '/themes/powerlifting-peak.svg',
    overlayOpacity: 0.68,
    backgroundPosition: 'center center',
  },
  {
    id: 'marathon-prep',
    name: 'Marathon Prep',
    subtitle: 'Endurance / Running',
    accentColor: '#22C55E',
    backgroundUrl: '/themes/marathon-prep.svg',
    overlayOpacity: 0.60,
    backgroundPosition: 'center center',
  },
  {
    id: 'fight-camp',
    name: 'Fight Camp',
    subtitle: 'Combat Conditioning',
    accentColor: '#F97316',
    backgroundUrl: '/themes/fight-camp.svg',
    overlayOpacity: 0.66,
    backgroundPosition: 'center center',
  },
];

export interface UserProfile extends SyncMetadata {
  id: string;
  email: string;
  display_name: string;
  username: string;
  avatar_url: string;
  bio: string;
  height: number | null;
  weight: number | null;
  body_fat_percentage?: number | null;
  date_of_birth: string | null;
  fitness_goal: string;
  primary_sport: string;
  profile_visibility?: 'PUBLIC' | 'CHALLENGE_ONLY' | 'PRIVATE';
  body_metrics_visibility?: 'PUBLIC' | 'CHALLENGE_ONLY' | 'PRIVATE';
  created_at: string;
  updated_at: string;
}

export interface Challenge extends SyncMetadata {
  id: string;
  creator_id: string;
  name: string;
  slug: string;
  description: string;
  rules?: string;
  start_date: string;
  end_date: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  visibility: ChallengeVisibility;
  max_members: number;
  background_image_url: string;
  background_position: string;
  background_overlay: number;
  accent_color: string;
  theme?: ChallengeTheme;
  show_leaderboard: boolean;
  show_diet: boolean;
  show_workouts: boolean;
  allow_member_invites: boolean;
  leaderboard_metric: LeaderboardMetric;
  created_at: string;
  updated_at: string;
}

export interface ChallengeMember extends SyncMetadata {
  id: string;
  challenge_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  status: 'active' | 'invited' | 'removed';
}

export interface ChallengeInvite extends SyncMetadata {
  id: string;
  challenge_id: string;
  invite_code: string;
  created_by: string;
  expires_at: string;
  max_uses: number;
  uses: number;
}

export interface Exercise extends SyncMetadata {
  id: string;
  name: string;
  category: 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Core' | 'Cardio' | 'Full Body';
  muscle_group: string;
  equipment: 'Barbell' | 'Dumbbell' | 'Cable' | 'Machine' | 'Bodyweight' | 'Kettlebell' | 'Cardio';
  is_custom: boolean;
  created_by: string | null;
}

export interface Workout extends SyncMetadata {
  id: string;
  user_id: string;
  challenge_id: string | null;
  workout_date: string;
  name: string;
  duration_minutes: number;
  notes: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise extends SyncMetadata {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  notes: string;
}

export interface WorkoutSet extends SyncMetadata {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  weight: number;
  weight_unit: 'kg' | 'lb';
  reps: number;
  rpe: number | null;
  rir: number | null;
  duration_seconds: number | null;
  distance: number | null;
  completed: boolean;
}

export interface DietLog extends SyncMetadata {
  id: string;
  user_id: string;
  challenge_id: string | null;
  date: string;
  meal_type: MealType;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  photo_url: string | null;
  notes: string;
  created_at: string;
}

export interface BodyMetric extends SyncMetadata {
  id: string;
  user_id: string;
  date: string;
  weight: number | null;
  body_fat_percentage: number | null;
  waist: number | null;
  chest: number | null;
  arms: number | null;
  thighs: number | null;
  water_liters?: number;
  steps?: number;
  notes: string;
}

export interface PersonalRecord extends SyncMetadata {
  id: string;
  user_id: string;
  exercise_id: string;
  weight: number;
  reps: number;
  estimated_1rm: number;
  pr_type?: 'max_weight' | '1rm' | 'volume' | 'reps';
  achieved_at: string;
}

export interface SyncQueueItem {
  id: string;
  entity:
    | 'profiles'
    | 'challenges'
    | 'challenge_members'
    | 'challenge_invites'
    | 'exercises'
    | 'workouts'
    | 'workout_exercises'
    | 'sets'
    | 'diet_logs'
    | 'body_metrics'
    | 'personal_records';
  recordId: string;
  operation: 'upsert' | 'delete';
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  status: SyncStatus;
  lastError?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  role: MemberRole;
  consistencyPct: number;
  workoutCount: number;
  trainingDays: number;
  totalVolume: number;
  prCount: number;
  dietConsistencyPct: number;
  primaryValue: number;
  primaryFormatted: string;
  secondaryFormatted: string;
  streakDays: number;
}

// Zod Schemas for Strict Validation
export const createChallengeSchema = z.object({
  name: z.string().min(2, 'Challenge name must be at least 2 characters').max(60),
  description: z.string().min(4, 'Description is required').max(300),
  rules: z.string().max(1000).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date'),
  visibility: z.enum(['PRIVATE', 'INVITE_ONLY', 'PUBLIC']),
  max_members: z.number().int().min(2).max(500),
  background_image_url: z.string().min(1),
  background_position: z.string().min(1),
  background_overlay: z.number().min(0.1).max(0.95),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex accent color'),
  show_leaderboard: z.boolean(),
  show_diet: z.boolean(),
  show_workouts: z.boolean(),
  allow_member_invites: z.boolean(),
  leaderboard_metric: z.enum([
    'consistency',
    'training_volume',
    'workout_count',
    'training_days',
    'pr_count',
    'diet_consistency',
  ]),
});

export const dietLogSchema = z.object({
  meal_type: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
  description: z.string().min(2, 'Enter meal items').max(200),
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(600),
  carbs: z.number().min(0).max(1200),
  fat: z.number().min(0).max(500),
  notes: z.string().max(300).optional(),
});

export const bodyMetricSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.number().min(25).max(350).nullable(),
  body_fat_percentage: z.number().min(2).max(65).nullable().optional(),
  waist: z.number().min(35).max(200).nullable().optional(),
  chest: z.number().min(40).max(220).nullable().optional(),
  arms: z.number().min(15).max(80).nullable().optional(),
  thighs: z.number().min(25).max(120).nullable().optional(),
  notes: z.string().max(300).optional(),
});
