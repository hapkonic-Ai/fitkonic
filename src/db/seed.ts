import { db } from './dexie';
import { createSyncMeta } from '@/lib/utils';
import type {
  BodyMetric,
  Challenge,
  ChallengeInvite,
  ChallengeMember,
  DietLog,
  Exercise,
  PersonalRecord,
  UserProfile,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '@/types';

export const DEMO_TODAY = '2026-10-07';

function createAvatarSvgDataUrl(initials: string, bg1: string, bg2: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#g)"/><circle cx="60" cy="44" r="20" fill="#F5F7FA" fill-opacity="0.22"/><path d="M24 108C28 84 42 74 60 74C78 74 92 84 96 108" fill="#F5F7FA" fill-opacity="0.22"/><text x="60" y="68" text-anchor="middle" fill="#F5F7FA" font-family="Space Grotesk, Inter, sans-serif" font-weight="700" font-size="36">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * THE 3 ATHLETE LOGINS: HARSH, PRANAV, KAVI
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
    height: 180,
    weight: 82.0,
    body_fat_percentage: 16,
    date_of_birth: '1999-04-14',
    fitness_goal: 'Strength & Muscle',
    primary_sport: 'Strength Training',
    profile_visibility: 'PUBLIC',
    body_metrics_visibility: 'CHALLENGE_ONLY',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-10-07T06:00:00Z',
  },
  {
    ...createSyncMeta('synced'),
    id: 'user-pranav',
    email: 'pranav@fitkonic.app',
    display_name: 'Pranav',
    username: 'pranav',
    avatar_url: createAvatarSvgDataUrl('PR', '#D97706', '#1E1B4B'),
    bio: 'Progressive overload every week.',
    height: 178,
    weight: 76.5,
    body_fat_percentage: 15,
    date_of_birth: '1999-08-21',
    fitness_goal: 'Strength & Hypertrophy',
    primary_sport: 'Strength Training',
    profile_visibility: 'PUBLIC',
    body_metrics_visibility: 'CHALLENGE_ONLY',
    created_at: '2026-09-01T08:10:00Z',
    updated_at: '2026-10-07T06:00:00Z',
  },
  {
    ...createSyncMeta('synced'),
    id: 'user-kavi',
    email: 'kavi@fitkonic.app',
    display_name: 'Kavi',
    username: 'kavi',
    avatar_url: createAvatarSvgDataUrl('KA', '#16A34A', '#0F172A'),
    bio: 'Consistent training and clean food.',
    height: 176,
    weight: 74.0,
    body_fat_percentage: 15,
    date_of_birth: '2000-01-12',
    fitness_goal: 'Strength & Conditioning',
    primary_sport: 'Strength Training',
    profile_visibility: 'PUBLIC',
    body_metrics_visibility: 'CHALLENGE_ONLY',
    created_at: '2026-09-01T08:20:00Z',
    updated_at: '2026-10-07T06:00:00Z',
  },
];

export const SEED_CHALLENGES: Challenge[] = [
  {
    ...createSyncMeta('synced'),
    id: 'challenge-winter-arc',
    creator_id: 'user-harsh',
    name: 'Winter Arc',
    slug: 'winter-arc',
    description: '42 days of discipline. Harsh, Pranav & Kavi training and growing stronger together.',
    rules:
      '1. Log what you lifted after every workout.\n2. Update what you ate each day.\n3. Track body weight and lifting weight progression.',
    start_date: '2026-09-18',
    end_date: '2026-10-29',
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
    leaderboard_metric: 'consistency',
    created_at: '2026-09-18T10:00:00Z',
    updated_at: '2026-10-07T06:00:00Z',
  },
  {
    ...createSyncMeta('synced'),
    id: 'challenge-summer-shred',
    creator_id: 'user-pranav',
    name: 'Summer Shred',
    slug: 'summer-shred',
    description: 'Lean conditioning and strength retention challenge.',
    rules: '1. Log daily meals.\n2. 4x strength sessions weekly.',
    start_date: '2026-09-20',
    end_date: '2026-11-14',
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    max_members: 20,
    background_image_url: '/themes/summer-shred.svg',
    background_position: 'center center',
    background_overlay: 0.58,
    accent_color: '#F59E0B',
    show_leaderboard: true,
    show_diet: true,
    show_workouts: true,
    allow_member_invites: true,
    leaderboard_metric: 'consistency',
    created_at: '2026-09-19T10:00:00Z',
    updated_at: '2026-10-07T06:00:00Z',
  },
  {
    ...createSyncMeta('synced'),
    id: 'challenge-powerlifting-peak',
    creator_id: 'user-kavi',
    name: 'Powerlifting Peak',
    slug: 'powerlifting-peak',
    description: 'Focus on increasing Squat, Bench, and Deadlift weights every week.',
    rules: '1. Track top set weight on every compound lift.',
    start_date: '2026-09-22',
    end_date: '2026-11-16',
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    max_members: 20,
    background_image_url: '/themes/powerlifting-peak.svg',
    background_position: 'center center',
    background_overlay: 0.68,
    accent_color: '#EF4444',
    show_leaderboard: true,
    show_diet: false,
    show_workouts: true,
    allow_member_invites: true,
    leaderboard_metric: 'training_volume',
    created_at: '2026-09-21T10:00:00Z',
    updated_at: '2026-10-07T06:00:00Z',
  },
];

export const SEED_EXERCISES: Exercise[] = [
  { ...createSyncMeta('synced'), id: 'ex-bench-press', name: 'Bench Press', category: 'Push', muscle_group: 'Chest', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-squat', name: 'Squat', category: 'Legs', muscle_group: 'Legs', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-deadlift', name: 'Deadlift', category: 'Pull', muscle_group: 'Back', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-overhead-press', name: 'Shoulder Press', category: 'Push', muscle_group: 'Shoulders', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-incline-db-press', name: 'Incline Dumbbell Press', category: 'Push', muscle_group: 'Chest', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-lat-pulldown', name: 'Lat Pulldown', category: 'Pull', muscle_group: 'Back', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-barbell-row', name: 'Barbell Row', category: 'Pull', muscle_group: 'Back', equipment: 'Barbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-bicep-curl', name: 'Bicep Curl', category: 'Pull', muscle_group: 'Biceps', equipment: 'Dumbbell', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-tricep-pushdown', name: 'Tricep Pushdown', category: 'Push', muscle_group: 'Triceps', equipment: 'Cable', is_custom: false, created_by: null },
  { ...createSyncMeta('synced'), id: 'ex-leg-press', name: 'Leg Press', category: 'Legs', muscle_group: 'Legs', equipment: 'Machine', is_custom: false, created_by: null },
];

export async function ensureSeedData(): Promise<void> {
  const existingCount = await db.profiles.count();
  if (existingCount > 0) return;

  const syncMeta = createSyncMeta('synced');

  const members: ChallengeMember[] = [
    { ...syncMeta, id: 'cm-wa-harsh', challenge_id: 'challenge-winter-arc', user_id: 'user-harsh', role: 'owner', joined_at: '2026-09-18T10:00:00Z', status: 'active' },
    { ...syncMeta, id: 'cm-wa-pranav', challenge_id: 'challenge-winter-arc', user_id: 'user-pranav', role: 'admin', joined_at: '2026-09-18T11:00:00Z', status: 'active' },
    { ...syncMeta, id: 'cm-wa-kavi', challenge_id: 'challenge-winter-arc', user_id: 'user-kavi', role: 'member', joined_at: '2026-09-18T12:00:00Z', status: 'active' },
  ];

  const invites: ChallengeInvite[] = [
    {
      ...syncMeta,
      id: 'inv-wa-1',
      challenge_id: 'challenge-winter-arc',
      invite_code: 'WINTER-ARC-42',
      created_by: 'user-harsh',
      expires_at: '2027-12-31T23:59:59Z',
      max_uses: 25,
      uses: 3,
    },
  ];

  // Clear strength progression history for Harsh, Pranav, and Kavi across 4 weeks
  // so each athlete can see their lifting weights increasing over time!
  const workouts: Workout[] = [];
  const workoutExercises: WorkoutExercise[] = [];
  const sets: WorkoutSet[] = [];

  const progressionConfigs = [
    {
      userId: 'user-harsh',
      sessions: [
        { date: '2026-09-20', name: 'Chest & Shoulders', bench: 55, squat: 85, deadlift: 105, ohp: 35 },
        { date: '2026-09-25', name: 'Full Body Strength', bench: 60, squat: 90, deadlift: 112.5, ohp: 37.5 },
        { date: '2026-10-01', name: 'Upper & Lower Heavy', bench: 62.5, squat: 95, deadlift: 120, ohp: 40 },
        { date: '2026-10-05', name: 'Strength Session', bench: 65, squat: 100, deadlift: 125, ohp: 42.5 },
        { date: DEMO_TODAY, name: "Today's Workout", bench: 67.5, squat: 105, deadlift: 130, ohp: 45 },
      ],
    },
    {
      userId: 'user-pranav',
      sessions: [
        { date: '2026-09-20', name: 'Strength Session', bench: 50, squat: 75, deadlift: 95, ohp: 30 },
        { date: '2026-09-26', name: 'Compound Lifts', bench: 52.5, squat: 80, deadlift: 100, ohp: 32.5 },
        { date: '2026-10-02', name: 'Heavy Day', bench: 57.5, squat: 85, deadlift: 107.5, ohp: 35 },
        { date: DEMO_TODAY, name: "Today's Workout", bench: 60, squat: 90, deadlift: 115, ohp: 37.5 },
      ],
    },
    {
      userId: 'user-kavi',
      sessions: [
        { date: '2026-09-21', name: 'Strength Session', bench: 45, squat: 70, deadlift: 90, ohp: 27.5 },
        { date: '2026-09-28', name: 'Compound Lifts', bench: 47.5, squat: 75, deadlift: 95, ohp: 30 },
        { date: '2026-10-04', name: 'Full Body', bench: 52.5, squat: 82.5, deadlift: 102.5, ohp: 32.5 },
        { date: DEMO_TODAY, name: "Today's Workout", bench: 55, squat: 87.5, deadlift: 110, ohp: 35 },
      ],
    },
  ];

  for (const userCfg of progressionConfigs) {
    userCfg.sessions.forEach((sess, idx) => {
      const wId = `w-${userCfg.userId}-${idx + 1}`;
      workouts.push({
        ...syncMeta,
        id: wId,
        user_id: userCfg.userId,
        challenge_id: 'challenge-winter-arc',
        workout_date: sess.date,
        name: sess.name,
        duration_minutes: 50,
        notes: 'Felt strong. Increased weights.',
        completed: true,
        created_at: `${sess.date}T07:30:00Z`,
        updated_at: `${sess.date}T08:20:00Z`,
      });

      const lifts = [
        { exId: 'ex-bench-press', weight: sess.bench, reps: 8 },
        { exId: 'ex-squat', weight: sess.squat, reps: 6 },
        { exId: 'ex-deadlift', weight: sess.deadlift, reps: 5 },
        { exId: 'ex-overhead-press', weight: sess.ohp, reps: 8 },
      ];

      lifts.forEach((lift, lIdx) => {
        const weId = `we-${wId}-${lift.exId}`;
        workoutExercises.push({
          ...syncMeta,
          id: weId,
          workout_id: wId,
          exercise_id: lift.exId,
          order_index: lIdx,
          notes: '',
        });

        sets.push(
          {
            ...syncMeta,
            id: `s-${weId}-1`,
            workout_exercise_id: weId,
            set_number: 1,
            weight: lift.weight - 2.5,
            weight_unit: 'kg',
            reps: lift.reps,
            rpe: 8,
            rir: 2,
            duration_seconds: null,
            distance: null,
            completed: true,
          },
          {
            ...syncMeta,
            id: `s-${weId}-2`,
            workout_exercise_id: weId,
            set_number: 2,
            weight: lift.weight,
            weight_unit: 'kg',
            reps: lift.reps,
            rpe: 8.5,
            rir: 1,
            duration_seconds: null,
            distance: null,
            completed: true,
          }
        );
      });
    });
  }

  // Simple "What I Ate Today" logs (no complicated macro counting required)
  const dietLogs: DietLog[] = [
    {
      ...syncMeta,
      id: 'diet-harsh-1',
      user_id: 'user-harsh',
      challenge_id: 'challenge-winter-arc',
      date: DEMO_TODAY,
      meal_type: 'Breakfast',
      description: '4 Boiled eggs, oats with milk & 1 banana',
      calories: 560,
      protein: 32,
      carbs: 60,
      fat: 18,
      photo_url: null,
      notes: '',
      created_at: '2026-10-07T07:00:00Z',
    },
    {
      ...syncMeta,
      id: 'diet-harsh-2',
      user_id: 'user-harsh',
      challenge_id: 'challenge-winter-arc',
      date: DEMO_TODAY,
      meal_type: 'Lunch',
      description: 'Grilled chicken breast, white rice & cucumber salad',
      calories: 720,
      protein: 60,
      carbs: 80,
      fat: 20,
      photo_url: null,
      notes: '',
      created_at: '2026-10-07T13:00:00Z',
    },
    {
      ...syncMeta,
      id: 'diet-harsh-3',
      user_id: 'user-harsh',
      challenge_id: 'challenge-winter-arc',
      date: DEMO_TODAY,
      meal_type: 'Snack',
      description: '1 scoop whey protein & handful of almonds',
      calories: 280,
      protein: 28,
      carbs: 12,
      fat: 14,
      photo_url: null,
      notes: '',
      created_at: '2026-10-07T17:00:00Z',
    },
    {
      ...syncMeta,
      id: 'diet-harsh-4',
      user_id: 'user-harsh',
      challenge_id: 'challenge-winter-arc',
      date: DEMO_TODAY,
      meal_type: 'Dinner',
      description: 'Paneer / chicken stir-fry with 2 chapatis',
      calories: 490,
      protein: 40,
      carbs: 45,
      fat: 14,
      photo_url: null,
      notes: '',
      created_at: '2026-10-07T20:30:00Z',
    },
    {
      ...syncMeta,
      id: 'diet-pranav-1',
      user_id: 'user-pranav',
      challenge_id: 'challenge-winter-arc',
      date: DEMO_TODAY,
      meal_type: 'Breakfast',
      description: '3 eggs omelette, peanut butter toast & black coffee',
      calories: 550,
      protein: 30,
      carbs: 45,
      fat: 22,
      photo_url: null,
      notes: '',
      created_at: '2026-10-07T08:00:00Z',
    },
    {
      ...syncMeta,
      id: 'diet-pranav-2',
      user_id: 'user-pranav',
      challenge_id: 'challenge-winter-arc',
      date: DEMO_TODAY,
      meal_type: 'Lunch',
      description: 'Rice, dal, curd & 200g chicken curry',
      calories: 700,
      protein: 50,
      carbs: 75,
      fat: 18,
      photo_url: null,
      notes: '',
      created_at: '2026-10-07T13:30:00Z',
    },
    {
      ...syncMeta,
      id: 'diet-kavi-1',
      user_id: 'user-kavi',
      challenge_id: 'challenge-winter-arc',
      date: DEMO_TODAY,
      meal_type: 'Breakfast',
      description: 'Overnight protein oats with chia seeds & apple',
      calories: 480,
      protein: 32,
      carbs: 58,
      fat: 12,
      photo_url: null,
      notes: '',
      created_at: '2026-10-07T08:15:00Z',
    },
  ];

  // Body Weight History for Harsh, Pranav, and Kavi
  const bodyMetrics: BodyMetric[] = [
    // Harsh: 84.5 kg -> 82.0 kg
    { ...syncMeta, id: 'bm-h-1', user_id: 'user-harsh', date: '2026-09-18', weight: 84.5, body_fat_percentage: null, waist: null, chest: null, arms: null, thighs: null, water_liters: 3.0, steps: 8000, notes: 'Week 1' },
    { ...syncMeta, id: 'bm-h-2', user_id: 'user-harsh', date: '2026-09-25', weight: 83.6, body_fat_percentage: null, waist: null, chest: null, arms: null, thighs: null, water_liters: 3.0, steps: 8200, notes: 'Week 2' },
    { ...syncMeta, id: 'bm-h-3', user_id: 'user-harsh', date: '2026-10-02', weight: 82.8, body_fat_percentage: null, waist: null, chest: null, arms: null, thighs: null, water_liters: 3.0, steps: 8500, notes: 'Week 3' },
    { ...syncMeta, id: 'bm-h-4', user_id: 'user-harsh', date: DEMO_TODAY, weight: 82.0, body_fat_percentage: null, waist: null, chest: null, arms: null, thighs: null, water_liters: 2.5, steps: 6400, notes: 'Today' },
    // Pranav: 74.5 kg -> 76.5 kg (Lean bulk)
    { ...syncMeta, id: 'bm-p-1', user_id: 'user-pranav', date: '2026-09-18', weight: 74.5, body_fat_percentage: null, waist: null, chest: null, arms: null, thighs: null, water_liters: 3.0, steps: 7500, notes: 'Week 1' },
    { ...syncMeta, id: 'bm-p-2', user_id: 'user-pranav', date: '2026-09-25', weight: 75.2, body_fat_percentage: null, waist: null, chest: null, arms: null, thighs: null, water_liters: 3.0, steps: 7800, notes: 'Week 2' },
    { ...syncMeta, id: 'bm-p-3', user_id: 'user-pranav', date: '2026-10-02', weight: 75.9, body_fat_percentage: null, waist: null, chest: null, arms: null, thighs: null, water_liters: 3.0, steps: 8000, notes: 'Week 3' },
    { ...syncMeta, id: 'bm-p-4', user_id: 'user-pranav', date: DEMO_TODAY, weight: 76.5, body_fat_percentage: null, waist: null, chest: null, arms: null, thighs: null, water_liters: 2.8, steps: 7100, notes: 'Today' },
    // Kavi: 75.8 kg -> 74.0 kg
    { ...syncMeta, id: 'bm-k-1', user_id: 'user-kavi', date: '2026-09-18', weight: 75.8, body_fat_percentage: null, waist: null, chest: null, arms: null, thighs: null, water_liters: 2.8, steps: 8000, notes: 'Week 1' },
    { ...syncMeta, id: 'bm-k-2', user_id: 'user-kavi', date: '2026-09-25', weight: 75.1, body_fat_percentage: null, waist: null, chest: null, arms: null, thighs: null, water_liters: 2.9, steps: 8300, notes: 'Week 2' },
    { ...syncMeta, id: 'bm-k-3', user_id: 'user-kavi', date: '2026-10-02', weight: 74.5, body_fat_percentage: null, waist: null, chest: null, arms: null, thighs: null, water_liters: 3.0, steps: 8600, notes: 'Week 3' },
    { ...syncMeta, id: 'bm-k-4', user_id: 'user-kavi', date: DEMO_TODAY, weight: 74.0, body_fat_percentage: null, waist: null, chest: null, arms: null, thighs: null, water_liters: 2.6, steps: 7900, notes: 'Today' },
  ];

  const personalRecords: PersonalRecord[] = [
    { ...syncMeta, id: 'pr-h-bench', user_id: 'user-harsh', exercise_id: 'ex-bench-press', weight: 67.5, reps: 8, estimated_1rm: 85.5, pr_type: 'max_weight', achieved_at: '2026-10-07T08:00:00Z' },
    { ...syncMeta, id: 'pr-h-squat', user_id: 'user-harsh', exercise_id: 'ex-squat', weight: 105, reps: 6, estimated_1rm: 126, pr_type: 'max_weight', achieved_at: '2026-10-07T08:00:00Z' },
    { ...syncMeta, id: 'pr-h-deadlift', user_id: 'user-harsh', exercise_id: 'ex-deadlift', weight: 130, reps: 5, estimated_1rm: 151.7, pr_type: 'max_weight', achieved_at: '2026-10-07T08:00:00Z' },
    { ...syncMeta, id: 'pr-p-bench', user_id: 'user-pranav', exercise_id: 'ex-bench-press', weight: 60, reps: 8, estimated_1rm: 76, pr_type: 'max_weight', achieved_at: '2026-10-07T08:00:00Z' },
    { ...syncMeta, id: 'pr-k-bench', user_id: 'user-kavi', exercise_id: 'ex-bench-press', weight: 55, reps: 8, estimated_1rm: 69.7, pr_type: 'max_weight', achieved_at: '2026-10-07T08:00:00Z' },
  ];

  await db.transaction(
    'rw',
    [
      db.profiles,
      db.cached_challenges,
      db.challenge_members,
      db.challenge_invites,
      db.exercises,
      db.workouts,
      db.workout_exercises,
      db.sets,
      db.diet_logs,
      db.body_metrics,
      db.personal_records,
    ],
    async () => {
      await db.profiles.bulkPut(SEED_PROFILES);
      await db.cached_challenges.bulkPut(SEED_CHALLENGES);
      await db.challenge_members.bulkPut(members);
      await db.challenge_invites.bulkPut(invites);
      await db.exercises.bulkPut(SEED_EXERCISES);
      await db.workouts.bulkPut(workouts);
      await db.workout_exercises.bulkPut(workoutExercises);
      await db.sets.bulkPut(sets);
      await db.diet_logs.bulkPut(dietLogs);
      await db.body_metrics.bulkPut(bodyMetrics);
      await db.personal_records.bulkPut(personalRecords);
    }
  );
}
