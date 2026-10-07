import { db } from './dexie';
import { createSyncMeta } from '@/lib/utils';
import type {
  Challenge,
  ChallengeInvite,
  ChallengeMember,
  Exercise,
  UserProfile,
} from '@/types';

export const DEMO_TODAY = new Date().toISOString().slice(0, 10);
export const WINTER_ARC_END_DATE = new Date(Date.now() + 89 * 86400000)
  .toISOString()
  .slice(0, 10);

function createAvatarSvgDataUrl(initials: string, bg1: string, bg2: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#g)"/><circle cx="60" cy="44" r="20" fill="#F5F7FA" fill-opacity="0.22"/><path d="M24 108C28 84 42 74 60 74C78 74 92 84 96 108" fill="#F5F7FA" fill-opacity="0.22"/><text x="60" y="68" text-anchor="middle" fill="#F5F7FA" font-family="Space Grotesk, Inter, sans-serif" font-weight="700" font-size="36">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * THE 4 ATHLETE LOGINS: HARSH, PRANAV, KAVI, VIJAY (Clean Day 1 profiles — zero fake data)
 */
export const SEED_PROFILES: UserProfile[] = [
  {
    ...createSyncMeta('synced'),
    id: 'user-harsh',
    email: 'harsh@fitkonic.app',
    display_name: 'Harsh',
    username: 'harsh',
    avatar_url: createAvatarSvgDataUrl('HA', '#0284C7', '#0F172A'),
    bio: 'Discipline today. Stronger tomorrow.',
    height: null,
    weight: null,
    body_fat_percentage: null,
    date_of_birth: null,
    fitness_goal: 'Strength & Muscle',
    primary_sport: 'PPL & Full Body',
    profile_visibility: 'PUBLIC',
    body_metrics_visibility: 'CHALLENGE_ONLY',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    ...createSyncMeta('synced'),
    id: 'user-pranav',
    email: 'pranav@fitkonic.app',
    display_name: 'Pranav',
    username: 'pranav',
    avatar_url: createAvatarSvgDataUrl('PR', '#D97706', '#1E1B4B'),
    bio: 'Discipline today. Stronger tomorrow.',
    height: null,
    weight: null,
    body_fat_percentage: null,
    date_of_birth: null,
    fitness_goal: 'Strength & Hypertrophy',
    primary_sport: 'PPL & Full Body',
    profile_visibility: 'PUBLIC',
    body_metrics_visibility: 'CHALLENGE_ONLY',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    ...createSyncMeta('synced'),
    id: 'user-kavi',
    email: 'kavi@fitkonic.app',
    display_name: 'Kavi',
    username: 'kavi',
    avatar_url: createAvatarSvgDataUrl('KA', '#16A34A', '#0F172A'),
    bio: 'Discipline today. Stronger tomorrow.',
    height: null,
    weight: null,
    body_fat_percentage: null,
    date_of_birth: null,
    fitness_goal: 'Strength & Conditioning',
    primary_sport: 'PPL & Full Body',
    profile_visibility: 'PUBLIC',
    body_metrics_visibility: 'CHALLENGE_ONLY',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    ...createSyncMeta('synced'),
    id: 'user-vijay',
    email: 'vijay@fitkonic.app',
    display_name: 'Vijay',
    username: 'vijay',
    avatar_url: createAvatarSvgDataUrl('VI', '#7C3AED', '#0F172A'),
    bio: 'Discipline today. Stronger tomorrow.',
    height: null,
    weight: null,
    body_fat_percentage: null,
    date_of_birth: null,
    fitness_goal: 'Strength & Power',
    primary_sport: 'PPL & Full Body',
    profile_visibility: 'PUBLIC',
    body_metrics_visibility: 'CHALLENGE_ONLY',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const SEED_CHALLENGES: Challenge[] = [
  {
    ...createSyncMeta('synced'),
    id: 'challenge-winter-arc',
    creator_id: 'user-harsh',
    name: 'Winter Arc',
    slug: 'winter-arc',
    description:
      'Day 1 starts today — Harsh, Pranav, Kavi & Vijay alternating Push/Pull/Legs and Full Body splits.',
    rules:
      '1. Alternate PPL Week and Full Body Week.\n2. Log your lifting weights & reps after every workout.\n3. Update what you ate and your body weight.',
    start_date: DEMO_TODAY,
    end_date: WINTER_ARC_END_DATE,
    status: 'ACTIVE',
    visibility: 'INVITE_ONLY',
    max_members: 10,
    background_image_url: '/themes/winter-arc.svg',
    background_position: 'center center',
    background_overlay: 0.62,
    accent_color: '#7DD3FC',
    theme: {
      backgroundType: 'preset',
      backgroundId: 'winter-arc',
      backgroundUrl: '/themes/winter-arc.svg',
      accentColor: '#7DD3FC',
      overlayOpacity: 0.62,
      backgroundPosition: 'center center',
    },
    show_leaderboard: true,
    show_diet: true,
    show_workouts: true,
    allow_member_invites: true,
    leaderboard_metric: 'training_volume',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/**
 * 100+ BUILT-IN EXERCISES (Includes every single exercise from Squad PPL, Full Body & Boxing HIIT + full gym library)
 */
export const SEED_EXERCISES: Exercise[] = [
  // Chest
  { ...createSyncMeta('synced'), id: 'ex-bench-press', name: 'Barbell Bench Press', category: 'Push', muscle_group: 'Chest', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-incline-db-press', name: 'Incline Dumbbell Press', category: 'Push', muscle_group: 'Chest', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-decline-cable-cross', name: 'Decline Cable Cross', category: 'Push', muscle_group: 'Chest', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-cable-fly', name: 'Cable Crossover', category: 'Push', muscle_group: 'Chest', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-low-to-high-cable-fly', name: 'Low to High Cable Flye', category: 'Push', muscle_group: 'Chest', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-close-grip-bench', name: 'Close Grip Bench Press', category: 'Push', muscle_group: 'Chest', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-pushups', name: 'Push-Up', category: 'Push', muscle_group: 'Chest', equipment: 'Bodyweight', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-incline-bench-press', name: 'Incline Barbell Bench Press', category: 'Push', muscle_group: 'Chest', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-flat-db-press', name: 'Flat Dumbbell Press', category: 'Push', muscle_group: 'Chest', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-decline-bench-press', name: 'Decline Barbell Bench Press', category: 'Push', muscle_group: 'Chest', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-chest-press-machine', name: 'Machine Chest Press', category: 'Push', muscle_group: 'Chest', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-pec-deck', name: 'Pec Deck / Machine Fly', category: 'Push', muscle_group: 'Chest', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-db-fly', name: 'Dumbbell Chest Fly', category: 'Push', muscle_group: 'Chest', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-chest-dips', name: 'Weighted Chest Dips', category: 'Push', muscle_group: 'Chest', equipment: 'Bodyweight', is_custom: false, created_by: null },

  // Back
  { ...createSyncMeta('synced'), id: 'ex-scapular-pullups', name: 'Scapular Pullups / Pullups', category: 'Pull', muscle_group: 'Back', equipment: 'Bodyweight', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-seated-cable-row', name: 'Cable Seated Row', category: 'Pull', muscle_group: 'Back', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-kneeling-cable-pullover', name: 'Cable Pullover (Kneeling)', category: 'Pull', muscle_group: 'Back', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-cable-pullover', name: 'Cable Pullover', category: 'Pull', muscle_group: 'Back', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-seated-row-machine', name: 'Seated Row Machine', category: 'Pull', muscle_group: 'Back', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-omni-lat-pulldown', name: 'Omni Grip Lat Pulldown', category: 'Pull', muscle_group: 'Back', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-lat-pulldown', name: 'Pronated Lat Pulldown', category: 'Pull', muscle_group: 'Back', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-chest-supported-tbar-row', name: 'Chest-Supported T-Bar Row', category: 'Pull', muscle_group: 'Back', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-humble-row', name: 'Humble Row / Dumbbell Row', category: 'Pull', muscle_group: 'Back', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-incline-db-shrug', name: 'Incline Dumbbell Shrugs', category: 'Pull', muscle_group: 'Back', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-smith-shrug', name: 'Smith Machine Shrug', category: 'Pull', muscle_group: 'Back', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-deadlift', name: 'Classic Deadlift', category: 'Pull', muscle_group: 'Back', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-reset-deadlift', name: 'Reset Deadlift', category: 'Pull', muscle_group: 'Back', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-sumo-deadlift', name: 'Sumo Deadlift', category: 'Pull', muscle_group: 'Back', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-barbell-row', name: 'Barbell Bent-Over Row', category: 'Pull', muscle_group: 'Back', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-one-arm-db-row', name: 'One-Arm Dumbbell Row', category: 'Pull', muscle_group: 'Back', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-t-bar-row', name: 'T-Bar Row', category: 'Pull', muscle_group: 'Back', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-close-grip-pulldown', name: 'Close-Grip Lat Pulldown', category: 'Pull', muscle_group: 'Back', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-shrugs', name: 'Barbell / Dumbbell Shrugs', category: 'Pull', muscle_group: 'Back', equipment: 'Dumbbell', is_custom: false, created_by: null },

  // Shoulders & Neck
  { ...createSyncMeta('synced'), id: 'ex-standing-arnold-press', name: 'Standing Arnold Press', category: 'Push', muscle_group: 'Shoulders', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-arnold-press', name: 'Arnold Press', category: 'Push', muscle_group: 'Shoulders', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-overhead-press', name: 'Standing Overhead Shoulder Press', category: 'Push', muscle_group: 'Shoulders', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-egyptian-lateral-raise', name: 'Egyptian Cable Lateral Raise', category: 'Push', muscle_group: 'Shoulders', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-lateral-raise-21s', name: "Lateral Raises 21's (10+10+10)", category: 'Push', muscle_group: 'Shoulders', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-lateral-raise', name: 'Dumbbell Lateral Raises', category: 'Push', muscle_group: 'Shoulders', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-face-pull', name: 'Rope Face Pulls', category: 'Pull', muscle_group: 'Shoulders', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-reverse-pec-deck', name: 'Reverse Pec Deck Fly', category: 'Pull', muscle_group: 'Shoulders', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-cable-rope-upright-row', name: 'Cable Rope Upright Row', category: 'Pull', muscle_group: 'Shoulders', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-weighted-neck-curl', name: 'Weighted Neck Curl (Front & Back)', category: 'Push', muscle_group: 'Shoulders', equipment: 'Bodyweight', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-db-shoulder-press', name: 'Seated Dumbbell Shoulder Press', category: 'Push', muscle_group: 'Shoulders', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-front-raise', name: 'Dumbbell Front Raise', category: 'Push', muscle_group: 'Shoulders', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-machine-shoulder-press', name: 'Machine Shoulder Press', category: 'Push', muscle_group: 'Shoulders', equipment: 'Machine', is_custom: false, created_by: null },

  // Legs (Quads, Hamstrings, Glutes, Calves)
  { ...createSyncMeta('synced'), id: 'ex-deep-squat', name: 'Deep Squats', category: 'Legs', muscle_group: 'Legs', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-squat', name: 'Back Squat', category: 'Legs', muscle_group: 'Legs', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-romanian-deadlift', name: 'Romanian Deadlift (RDL)', category: 'Legs', muscle_group: 'Legs', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-leg-press', name: 'Leg Press', category: 'Legs', muscle_group: 'Legs', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-leg-extension', name: 'Leg Extension', category: 'Legs', muscle_group: 'Legs', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-lying-leg-curl', name: 'Lying Leg Curl', category: 'Legs', muscle_group: 'Legs', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-standing-calf-raise', name: 'Standing Calf Raises', category: 'Legs', muscle_group: 'Legs', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-calf-tibia-raise', name: 'Calf Raises with Tibia Extension', category: 'Legs', muscle_group: 'Legs', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-hack-squat', name: 'Hack Squat', category: 'Legs', muscle_group: 'Legs', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-single-leg-hip-thrust', name: 'Single Leg Hip Thrust', category: 'Legs', muscle_group: 'Legs', equipment: 'Bodyweight', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-nordic-ham-curl', name: 'Nordic Hamstring Curl', category: 'Legs', muscle_group: 'Legs', equipment: 'Bodyweight', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-glute-ham-raise', name: 'Glute Ham Raise', category: 'Legs', muscle_group: 'Legs', equipment: 'Bodyweight', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-bulgarian-split-squat', name: 'Bulgarian Split Squats', category: 'Legs', muscle_group: 'Legs', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-hip-abduction', name: 'Seated Hip Abduction', category: 'Legs', muscle_group: 'Legs', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-front-squat', name: 'Front Squat', category: 'Legs', muscle_group: 'Legs', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-walking-lunges', name: 'Dumbbell Walking Lunges', category: 'Legs', muscle_group: 'Legs', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-seated-leg-curl', name: 'Seated Hamstring Curl', category: 'Legs', muscle_group: 'Legs', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-hip-thrust', name: 'Barbell Hip Thrust', category: 'Legs', muscle_group: 'Legs', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-seated-calf-raise', name: 'Seated Calf Raise', category: 'Legs', muscle_group: 'Legs', equipment: 'Machine', is_custom: false, created_by: null },

  // Biceps & Forearms
  { ...createSyncMeta('synced'), id: 'ex-hammer-cheat-curl', name: 'Hammer Cheat Curl', category: 'Pull', muscle_group: 'Biceps', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-hammer-curl', name: 'Dumbbell Hammer Curl', category: 'Pull', muscle_group: 'Biceps', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-incline-db-curl', name: 'Seated Incline Dumbbell Curl (Supinated)', category: 'Pull', muscle_group: 'Biceps', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-bicep-curl-machine', name: 'Bicep Curl Machine', category: 'Pull', muscle_group: 'Biceps', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-forearm-curls', name: 'Forearm Wrist Curls', category: 'Pull', muscle_group: 'Biceps', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-ez-pronated-curl', name: 'E-Z Bar Pronated Curls', category: 'Pull', muscle_group: 'Biceps', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-ez-bar-curl', name: 'E-Z Bar Supinated Curls', category: 'Pull', muscle_group: 'Biceps', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-bicep-curl', name: 'Dumbbell Bicep Curl', category: 'Pull', muscle_group: 'Biceps', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-preacher-curl', name: 'Preacher Curl', category: 'Pull', muscle_group: 'Biceps', equipment: 'Machine', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-cable-bicep-curl', name: 'Cable Bicep Curl', category: 'Pull', muscle_group: 'Biceps', equipment: 'Cable', is_custom: false, created_by: null },

  // Triceps
  { ...createSyncMeta('synced'), id: 'ex-tricep-pushdown', name: 'Tricep Pushdown', category: 'Push', muscle_group: 'Triceps', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-eccentric-skullcrusher', name: 'Eccentric Accentuated Skullcrusher', category: 'Push', muscle_group: 'Triceps', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-skull-crushers', name: 'E-Z Bar Skull Crusher', category: 'Push', muscle_group: 'Triceps', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-cable-tricep-kickback', name: 'Cable Tricep Kickback', category: 'Push', muscle_group: 'Triceps', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-overhead-tricep-ext', name: 'Overhead Tricep Extension', category: 'Push', muscle_group: 'Triceps', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-tricep-dips', name: 'Tricep Parallel Dips', category: 'Push', muscle_group: 'Triceps', equipment: 'Bodyweight', is_custom: false, created_by: null },

  // Core & Abs
  { ...createSyncMeta('synced'), id: 'ex-decline-crunch', name: 'Decline Crunches', category: 'Core', muscle_group: 'Core', equipment: 'Bodyweight', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-long-lever-plank', name: 'Long Lever Plank (Seconds)', category: 'Core', muscle_group: 'Core', equipment: 'Bodyweight', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-bicycle-crunch', name: 'Bicycle Crunches', category: 'Core', muscle_group: 'Core', equipment: 'Bodyweight', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-cable-crunch', name: 'Weighted Kneeling Cable Crunches', category: 'Core', muscle_group: 'Core', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-hanging-leg-raise', name: 'Hanging Leg Raises', category: 'Core', muscle_group: 'Core', equipment: 'Bodyweight', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-ab-wheel', name: 'Ab Wheel Rollout', category: 'Core', muscle_group: 'Core', equipment: 'Bodyweight', is_custom: false, created_by: null },

  // Intense Boxing HIIT & Conditioning Drills
  { ...createSyncMeta('synced'), id: 'ex-jump-rope', name: 'Jump Rope (Seconds)', category: 'Cardio', muscle_group: 'Cardio', equipment: 'Cardio', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-dynamic-stretching', name: 'Dynamic Stretching (Seconds)', category: 'Cardio', muscle_group: 'Cardio', equipment: 'Bodyweight', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-shadow-boxing-high-knees', name: 'Shadow Boxing with High Knees (Seconds)', category: 'Cardio', muscle_group: 'Cardio', equipment: 'Bodyweight', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-battle-rope-slams', name: 'Battle Rope Double Arm Slams (40s)', category: 'Cardio', muscle_group: 'Cardio', equipment: 'Cardio', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-tire-flips', name: 'Tire Flips (40s)', category: 'Full Body', muscle_group: 'Cardio', equipment: 'Bodyweight', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-sledgehammer-slams', name: 'Sledgehammer Tire Slams (40s)', category: 'Full Body', muscle_group: 'Cardio', equipment: 'Bodyweight', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-boxing-burpees', name: 'Boxing Combinations with Burpees (40s)', category: 'Cardio', muscle_group: 'Cardio', equipment: 'Bodyweight', is_custom: false, created_by: null },
];

export interface SquadTemplateExercise {
  exerciseId: string;
  repsPerSet: number[];
  note?: string;
}

export interface SquadWorkoutTemplate {
  id: string;
  splitGroup: 'PPL' | 'FULL_BODY' | 'BOXING_HIIT';
  shortLabel: string;
  name: string;
  focusSubtitle: string;
  exercises: SquadTemplateExercise[];
}

/**
 * SQUAD WORKOUT ROUTINES:
 * Alternating 1 Week Push-Pull-Legs (PPL) & 1 Week Full Body + Intense Boxing HIIT Drill
 */
export const SQUAD_WORKOUT_TEMPLATES: SquadWorkoutTemplate[] = [
  // ==========================================
  // WEEK A: PUSH PULL LEGS (PPL)
  // ==========================================
  {
    id: 'tpl-ppl-push-1',
    splitGroup: 'PPL',
    shortLabel: 'Push 1 (Chest)',
    name: 'PUSH 1 (Chest Focused)',
    focusSubtitle: '8 exercises • 15-12-10 rep pyramid',
    exercises: [
      { exerciseId: 'ex-bench-press', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-incline-db-press', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-decline-cable-cross', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-standing-arnold-press', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-tricep-pushdown', repsPerSet: [15, 12, 20] },
      { exerciseId: 'ex-eccentric-skullcrusher', repsPerSet: [15, 12, 10] },
      {
        exerciseId: 'ex-egyptian-lateral-raise',
        repsPerSet: [15, 12, 12],
        note: '+ Myo 4 reps (RR) on last set',
      },
      { exerciseId: 'ex-cable-tricep-kickback', repsPerSet: [15, 12, 10] },
    ],
  },
  {
    id: 'tpl-ppl-pull-1',
    splitGroup: 'PPL',
    shortLabel: 'Pull 1 (Lat)',
    name: 'PULL 1 (Lat Focused)',
    focusSubtitle: '8 exercises • Lats, Biceps & Forearms',
    exercises: [
      { exerciseId: 'ex-scapular-pullups', repsPerSet: [3, 3, 3] },
      { exerciseId: 'ex-seated-cable-row', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-kneeling-cable-pullover', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-seated-row-machine', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-hammer-cheat-curl', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-incline-db-curl', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-bicep-curl-machine', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-forearm-curls', repsPerSet: [15, 15, 15] },
    ],
  },
  {
    id: 'tpl-ppl-leg-1',
    splitGroup: 'PPL',
    shortLabel: 'Leg 1 (Quad)',
    name: 'LEG 1 (Quad Focused)',
    focusSubtitle: '8 exercises • Quads, RDL, Calves & Core',
    exercises: [
      { exerciseId: 'ex-deep-squat', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-romanian-deadlift', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-leg-press', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-leg-extension', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-lying-leg-curl', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-standing-calf-raise', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-decline-crunch', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-long-lever-plank', repsPerSet: [30, 30, 30], note: '30 seconds hold per set' },
    ],
  },
  {
    id: 'tpl-ppl-push-2',
    splitGroup: 'PPL',
    shortLabel: 'Push 2 (Delt)',
    name: 'PUSH 2 (Delt Focused)',
    focusSubtitle: '6 exercises • Shoulders, Close-Grip & Neck',
    exercises: [
      { exerciseId: 'ex-overhead-press', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-close-grip-bench', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-cable-fly', repsPerSet: [15, 12, 12], note: 'Drop set on 3rd set' },
      { exerciseId: 'ex-overhead-tricep-ext', repsPerSet: [15, 12, 10] },
      {
        exerciseId: 'ex-lateral-raise-21s',
        repsPerSet: [30, 30, 30],
        note: "21's: 10+10+10 reps per set",
      },
      { exerciseId: 'ex-weighted-neck-curl', repsPerSet: [15, 15, 15], note: 'Front and back' },
    ],
  },
  {
    id: 'tpl-ppl-pull-2',
    splitGroup: 'PPL',
    shortLabel: 'Pull 2 (Mid-Back)',
    name: 'PULL 2 (Mid-Back & Rear Delt Focused)',
    focusSubtitle: '7 exercises • Pulldown, Sumo DL, Rear Delts & EZ Curls',
    exercises: [
      { exerciseId: 'ex-omni-lat-pulldown', repsPerSet: [15, 15, 15] },
      { exerciseId: 'ex-sumo-deadlift', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-face-pull', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-incline-db-shrug', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-reverse-pec-deck', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-ez-pronated-curl', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-ez-bar-curl', repsPerSet: [15, 12, 10] },
    ],
  },
  {
    id: 'tpl-ppl-leg-2',
    splitGroup: 'PPL',
    shortLabel: 'Leg 2 (Hamstring)',
    name: 'LEG 2 (Hamstring Focused)',
    focusSubtitle: '8 exercises • Deadlift, Hack Squat, Nordic & Split Squat',
    exercises: [
      { exerciseId: 'ex-deadlift', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-hack-squat', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-single-leg-hip-thrust', repsPerSet: [12, 12, 12] },
      { exerciseId: 'ex-nordic-ham-curl', repsPerSet: [12, 12, 12] },
      { exerciseId: 'ex-bulgarian-split-squat', repsPerSet: [12, 12, 12] },
      { exerciseId: 'ex-calf-tibia-raise', repsPerSet: [12, 12, 12] },
      { exerciseId: 'ex-bicycle-crunch', repsPerSet: [15, 15, 15] },
      { exerciseId: 'ex-cable-crunch', repsPerSet: [15, 12, 10] },
    ],
  },

  // ==========================================
  // WEEK B: FULL BODY WORKOUT (DAYS 1 - 5)
  // ==========================================
  {
    id: 'tpl-fb-day-1',
    splitGroup: 'FULL_BODY',
    shortLabel: 'Day 1 (Chest FB)',
    name: 'DAY 1: Chest Focused Full Body',
    focusSubtitle: '7 exercises • 3 sets × 15-12-10 reps',
    exercises: [
      { exerciseId: 'ex-bench-press', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-low-to-high-cable-fly', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-romanian-deadlift', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-chest-supported-tbar-row', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-arnold-press', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-tricep-pushdown', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-smith-shrug', repsPerSet: [15, 12, 10] },
    ],
  },
  {
    id: 'tpl-fb-day-2',
    splitGroup: 'FULL_BODY',
    shortLabel: 'Day 2 (Lower FB)',
    name: 'DAY 2: Lower Focused Full Body',
    focusSubtitle: '6 exercises • Squat, Incline DB, Leg Curl & Lat Pulldown',
    exercises: [
      { exerciseId: 'ex-squat', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-incline-db-press', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-lying-leg-curl', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-lat-pulldown', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-ez-bar-curl', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-hanging-leg-raise', repsPerSet: [15, 12, 10] },
    ],
  },
  {
    id: 'tpl-fb-day-3',
    splitGroup: 'FULL_BODY',
    shortLabel: 'Day 3 (Back FB)',
    name: 'DAY 3: Back Focused Full Body',
    focusSubtitle: '6 exercises • Lat Pulldown, Humble Row, Legs & Arms',
    exercises: [
      { exerciseId: 'ex-lat-pulldown', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-humble-row', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-leg-extension', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-standing-calf-raise', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-cable-rope-upright-row', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-hammer-curl', repsPerSet: [15, 12, 10] },
    ],
  },
  {
    id: 'tpl-fb-day-4',
    splitGroup: 'FULL_BODY',
    shortLabel: 'Day 4 (Lower FB)',
    name: 'DAY 4: Lower Focused Full Body',
    focusSubtitle: '8 exercises • Reset Deadlift, Close-Grip Bench, GHR & Leg Press',
    exercises: [
      { exerciseId: 'ex-reset-deadlift', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-close-grip-bench', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-glute-ham-raise', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-leg-press', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-cable-pullover', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-lateral-raise', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-face-pull', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-skull-crushers', repsPerSet: [15, 12, 10] },
    ],
  },
  {
    id: 'tpl-fb-day-5',
    splitGroup: 'FULL_BODY',
    shortLabel: 'Day 5 (Delt FB)',
    name: 'DAY 5: Deltoid Focused Full Body',
    focusSubtitle: '8 exercises • OHP, Egyptian Lateral, Row & Hip Abduction',
    exercises: [
      { exerciseId: 'ex-overhead-press', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-egyptian-lateral-raise', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-seated-cable-row', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-hip-abduction', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-incline-db-curl', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-bicycle-crunch', repsPerSet: [20, 20, 20] },
      { exerciseId: 'ex-standing-calf-raise', repsPerSet: [15, 12, 10] },
      { exerciseId: 'ex-pushups', repsPerSet: [10, 10, 10] },
    ],
  },

  // ==========================================
  // BOXING HIIT CONDITIONING
  // ==========================================
  {
    id: 'tpl-boxing-hiit',
    splitGroup: 'BOXING_HIIT',
    shortLabel: 'Boxing HIIT Drill',
    name: 'Intense Boxing HIIT Drill',
    focusSubtitle: '5m Warm-Up + 3× Circuit (40s work / 20s rest)',
    exercises: [
      { exerciseId: 'ex-jump-rope', repsPerSet: [120], note: 'Warm-up: 2 minutes (120s)' },
      { exerciseId: 'ex-dynamic-stretching', repsPerSet: [60], note: 'Warm-up: 1 minute (60s)' },
      {
        exerciseId: 'ex-shadow-boxing-high-knees',
        repsPerSet: [120],
        note: 'Warm-up: 2 minutes (120s)',
      },
      {
        exerciseId: 'ex-battle-rope-slams',
        repsPerSet: [40, 40, 40],
        note: '40s explosive power / 20s rest',
      },
      {
        exerciseId: 'ex-tire-flips',
        repsPerSet: [40, 40, 40],
        note: '40s fast & safe flips / 20s rest',
      },
      {
        exerciseId: 'ex-sledgehammer-slams',
        repsPerSet: [40, 40, 40],
        note: '40s alternating hands / 20s rest',
      },
      {
        exerciseId: 'ex-boxing-burpees',
        repsPerSet: [40, 40, 40],
        note: 'Jab-Cross-Hook-Uppercut + Burpee (40s / 20s rest)',
      },
    ],
  },
];

export async function ensureSeedData(): Promise<void> {
  await db.exercises.bulkPut(SEED_EXERCISES);

  const resetKey = 'fitkonic_day1_clean_reset_v6';
  const needsCleanReset =
    typeof window !== 'undefined' && window.localStorage.getItem(resetKey) !== 'done';

  if (needsCleanReset) {
    await db.transaction(
      'rw',
      [
        db.workouts,
        db.workout_exercises,
        db.sets,
        db.diet_logs,
        db.body_metrics,
        db.personal_records,
        db.sync_queue,
      ],
      async () => {
        await db.workouts.clear();
        await db.workout_exercises.clear();
        await db.sets.clear();
        await db.diet_logs.clear();
        await db.body_metrics.clear();
        await db.personal_records.clear();
        await db.sync_queue.clear();
      }
    );
    window.localStorage.setItem(resetKey, 'done');
  } else {
    // Also guard against any legacy seed IDs
    await db.workouts.where('id').startsWith('w-seed-').delete();
    await db.workout_exercises.where('id').startsWith('we-seed-').delete();
    await db.sets.where('id').startsWith('s-seed-').delete();
    await db.body_metrics.where('id').startsWith('bm-seed-').delete();
    await db.diet_logs.where('id').startsWith('dl-seed-').delete();
    await db.personal_records.where('id').startsWith('pr-seed-').delete();
  }

  const existingCount = await db.profiles.count();
  if (existingCount >= 4 && !needsCleanReset) return;

  const syncMeta = createSyncMeta('synced');
  const nowIso = new Date().toISOString();

  const members: ChallengeMember[] = [
    { ...syncMeta, id: 'cm-wa-harsh', challenge_id: 'challenge-winter-arc', user_id: 'user-harsh', role: 'owner', joined_at: nowIso, status: 'active' },
    { ...syncMeta, id: 'cm-wa-pranav', challenge_id: 'challenge-winter-arc', user_id: 'user-pranav', role: 'admin', joined_at: nowIso, status: 'active' },
    { ...syncMeta, id: 'cm-wa-kavi', challenge_id: 'challenge-winter-arc', user_id: 'user-kavi', role: 'member', joined_at: nowIso, status: 'active' },
    { ...syncMeta, id: 'cm-wa-vijay', challenge_id: 'challenge-winter-arc', user_id: 'user-vijay', role: 'member', joined_at: nowIso, status: 'active' },
  ];

  const invites: ChallengeInvite[] = [
    {
      ...syncMeta,
      id: 'inv-wa-1',
      challenge_id: 'challenge-winter-arc',
      invite_code: 'WINTER-ARC',
      created_by: 'user-harsh',
      expires_at: '2027-12-31T23:59:59Z',
      max_uses: 25,
      uses: 4,
    },
  ];

  await db.transaction(
    'rw',
    [
      db.profiles,
      db.cached_challenges,
      db.challenge_members,
      db.challenge_invites,
    ],
    async () => {
      await db.profiles.bulkPut(SEED_PROFILES);
      await db.cached_challenges.bulkPut(SEED_CHALLENGES);
      await db.challenge_members.bulkPut(members);
      await db.challenge_invites.bulkPut(invites);
    }
  );
}
