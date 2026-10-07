import { db } from '@/db/dexie';
import { DEMO_TODAY } from '@/db/seed';
import {
  calculateStreak,
  calculateTotalReps,
  calculateWorkoutVolume,
  canUserViewDietLog,
  detectExercisePR,
  type DetectedPR,
} from '@/lib/calculations';
import { syncEngine } from '@/lib/sync/syncEngine';
import { createId, createSyncMeta, sanitizeText } from '@/lib/utils';
import type { ActiveWorkoutDraft, CompletedWorkoutSummary } from '@/app/store';
import type {
  BodyMetric,
  Challenge,
  ChallengeInvite,
  ChallengeMember,
  DietLog,
  Exercise,
  LeaderboardMetric,
  MealType,
  MemberRole,
  PersonalRecord,
  UserProfile,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '@/types';

/**
 * AUTHENTICATION & PROFILES
 */
export async function loginOrRegisterUser(params: {
  email: string;
  displayName?: string;
  username?: string;
}): Promise<UserProfile> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const existing = await db.profiles.where('email').equals(normalizedEmail).first();
  if (existing) {
    syncEngine.setCurrentUser(existing.id);
    return existing;
  }

  const cleanName = sanitizeText(params.displayName || normalizedEmail.split('@')[0] || 'Athlete');
  const cleanUsername = sanitizeText(
    params.username || normalizedEmail.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase() || `athlete_${Date.now().toString().slice(-4)}`
  );

  const initials = cleanName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'FK';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#0D1117" stroke="#5EC8FF" stroke-width="4"/><text x="60" y="68" text-anchor="middle" fill="#F5F7FA" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="36">${initials}</text></svg>`;

  const newUser: UserProfile = {
    ...createSyncMeta('pending'),
    id: createId('user'),
    email: normalizedEmail,
    display_name: cleanName,
    username: cleanUsername,
    avatar_url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    bio: 'Discipline today. A stronger tomorrow.',
    height: 178,
    weight: 80,
    body_fat_percentage: 16,
    date_of_birth: '1999-01-01',
    fitness_goal: 'Strength & Conditioning',
    primary_sport: 'Strength Training',
    profile_visibility: 'PUBLIC',
    body_metrics_visibility: 'CHALLENGE_ONLY',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db.profiles.put(newUser);

  // Auto-enroll new user into Winter Arc so they can immediately compete
  const memberRecord: ChallengeMember = {
    ...createSyncMeta('pending'),
    id: createId('cm'),
    challenge_id: 'challenge-winter-arc',
    user_id: newUser.id,
    role: 'member',
    joined_at: new Date().toISOString(),
    status: 'active',
  };
  await db.challenge_members.put(memberRecord);

  await syncEngine.enqueueMutation({
    entity: 'profiles',
    recordId: newUser.id,
    operation: 'upsert',
    payload: newUser as unknown as Record<string, unknown>,
  });
  await syncEngine.enqueueMutation({
    entity: 'challenge_members',
    recordId: memberRecord.id,
    operation: 'upsert',
    payload: memberRecord as unknown as Record<string, unknown>,
  });

  syncEngine.setCurrentUser(newUser.id);
  return newUser;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'display_name' | 'username' | 'bio' | 'height' | 'weight' | 'body_fat_percentage' | 'fitness_goal' | 'primary_sport' | 'avatar_url' | 'profile_visibility' | 'body_metrics_visibility'>>
): Promise<UserProfile> {
  const current = await db.profiles.get(userId);
  if (!current) throw new Error('Profile not found');

  const updated: UserProfile = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString(),
    _syncStatus: 'pending',
    _lastModified: Date.now(),
    _localVersion: (current._localVersion || 1) + 1,
  };

  await db.profiles.put(updated);
  await syncEngine.enqueueMutation({
    entity: 'profiles',
    recordId: updated.id,
    operation: 'upsert',
    payload: updated as unknown as Record<string, unknown>,
  });

  return updated;
}

/**
 * CHALLENGES & INVITATIONS
 */
export async function createChallengeRecord(params: {
  creatorId: string;
  name: string;
  description: string;
  rules?: string;
  start_date: string;
  end_date: string;
  visibility: Challenge['visibility'];
  max_members: number;
  background_image_url: string;
  background_position: string;
  background_overlay: number;
  accent_color: string;
  show_leaderboard: boolean;
  show_diet: boolean;
  show_workouts: boolean;
  allow_member_invites: boolean;
  leaderboard_metric: LeaderboardMetric;
}): Promise<{ challenge: Challenge; invite: ChallengeInvite }> {
  const id = createId('challenge');
  const slug =
    sanitizeText(params.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 5);

  const now = new Date().toISOString();
  const challenge: Challenge = {
    ...createSyncMeta('pending'),
    id,
    creator_id: params.creatorId,
    name: sanitizeText(params.name),
    slug,
    description: sanitizeText(params.description),
    rules: sanitizeText(params.rules || '1. Train consistently.\n2. Log all workouts accurately.\n3. Compete with discipline.'),
    start_date: params.start_date,
    end_date: params.end_date,
    status: 'ACTIVE',
    visibility: params.visibility,
    max_members: params.max_members,
    background_image_url: params.background_image_url,
    background_position: params.background_position,
    background_overlay: params.background_overlay,
    accent_color: params.accent_color,
    show_leaderboard: params.show_leaderboard,
    show_diet: params.show_diet,
    show_workouts: params.show_workouts,
    allow_member_invites: params.allow_member_invites,
    leaderboard_metric: params.leaderboard_metric,
    created_at: now,
    updated_at: now,
  };

  const ownerMember: ChallengeMember = {
    ...createSyncMeta('pending'),
    id: createId('cm'),
    challenge_id: id,
    user_id: params.creatorId,
    role: 'owner',
    joined_at: now,
    status: 'active',
  };

  const codePrefix = challenge.name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8) || 'FITKONIC';

  const invite: ChallengeInvite = {
    ...createSyncMeta('pending'),
    id: createId('inv'),
    challenge_id: id,
    invite_code: `${codePrefix}-${Math.floor(10 + Math.random() * 89)}`,
    created_by: params.creatorId,
    expires_at: '2027-12-31T23:59:59Z',
    max_uses: params.max_members,
    uses: 1,
  };

  await db.transaction(
    'rw',
    [db.cached_challenges, db.challenge_members, db.challenge_invites],
    async () => {
      await db.cached_challenges.put(challenge);
      await db.challenge_members.put(ownerMember);
      await db.challenge_invites.put(invite);
    }
  );

  await syncEngine.enqueueMutation({
    entity: 'challenges',
    recordId: challenge.id,
    operation: 'upsert',
    payload: challenge as unknown as Record<string, unknown>,
  });
  await syncEngine.enqueueMutation({
    entity: 'challenge_members',
    recordId: ownerMember.id,
    operation: 'upsert',
    payload: ownerMember as unknown as Record<string, unknown>,
  });
  await syncEngine.enqueueMutation({
    entity: 'challenge_invites',
    recordId: invite.id,
    operation: 'upsert',
    payload: invite as unknown as Record<string, unknown>,
  });

  return { challenge, invite };
}

export async function updateChallengeSettings(
  challengeId: string,
  actorUserId: string,
  updates: Partial<Challenge>
): Promise<Challenge> {
  const challenge = await db.cached_challenges.get(challengeId);
  if (!challenge) throw new Error('Challenge not found');

  const membership = await db.challenge_members
    .where('[challenge_id+user_id]')
    .equals([challengeId, actorUserId])
    .first();

  if (
    challenge.creator_id !== actorUserId &&
    membership?.role !== 'owner' &&
    membership?.role !== 'admin'
  ) {
    throw new Error('Unauthorized: Only challenge owners or admins can modify challenge settings.');
  }

  const updated: Challenge = {
    ...challenge,
    ...updates,
    id: challenge.id,
    updated_at: new Date().toISOString(),
    _syncStatus: 'pending',
    _lastModified: Date.now(),
    _localVersion: (challenge._localVersion || 1) + 1,
  };

  await db.cached_challenges.put(updated);
  await syncEngine.enqueueMutation({
    entity: 'challenges',
    recordId: updated.id,
    operation: 'upsert',
    payload: updated as unknown as Record<string, unknown>,
  });

  return updated;
}

export async function deleteChallengeRecord(
  challengeId: string,
  actorUserId: string
): Promise<void> {
  const challenge = await db.cached_challenges.get(challengeId);
  if (!challenge) return;
  if (challenge.creator_id !== actorUserId) {
    throw new Error('Only the challenge owner can delete this challenge.');
  }

  await db.transaction(
    'rw',
    [db.cached_challenges, db.challenge_members, db.challenge_invites],
    async () => {
      await db.cached_challenges.delete(challengeId);
      await db.challenge_members.where('challenge_id').equals(challengeId).delete();
      await db.challenge_invites.where('challenge_id').equals(challengeId).delete();
    }
  );

  await syncEngine.enqueueMutation({
    entity: 'challenges',
    recordId: challengeId,
    operation: 'delete',
    payload: { id: challengeId },
  });
}

export async function joinChallengeByInviteOrPublic(params: {
  userId: string;
  inviteCode?: string;
  challengeId?: string;
}): Promise<Challenge> {
  let challenge: Challenge | undefined;
  let matchedInvite: ChallengeInvite | undefined;

  if (params.inviteCode) {
    const cleanCode = params.inviteCode
      .trim()
      .replace(/^.*\/join\//i, '')
      .toUpperCase();

    const allInvites = await db.challenge_invites.toArray();
    matchedInvite = allInvites.find(
      (i) =>
        i.invite_code.toUpperCase() === cleanCode ||
        i.invite_code.replace(/-/g, '').toUpperCase() === cleanCode.replace(/-/g, '')
    );

    if (!matchedInvite) {
      throw new Error('Invalid invite code. Check the code and try again.');
    }
    if (new Date(matchedInvite.expires_at).getTime() < Date.now()) {
      throw new Error('This challenge invite has expired.');
    }
    if (matchedInvite.uses >= matchedInvite.max_uses) {
      throw new Error('This invite code has reached its maximum usage limit.');
    }
    challenge = await db.cached_challenges.get(matchedInvite.challenge_id);
  } else if (params.challengeId) {
    challenge = await db.cached_challenges.get(params.challengeId);
    if (challenge && challenge.visibility !== 'PUBLIC') {
      throw new Error('This challenge is private or invite-only. An invite code is required.');
    }
  }

  if (!challenge) {
    throw new Error('Challenge not found.');
  }

  const currentMembers = await db.challenge_members
    .where('challenge_id')
    .equals(challenge.id)
    .toArray();

  const existingMember = currentMembers.find((m) => m.user_id === params.userId);
  if (existingMember && existingMember.status === 'active') {
    return challenge;
  }

  const activeCount = currentMembers.filter((m) => m.status === 'active').length;
  if (activeCount >= challenge.max_members) {
    throw new Error(`Challenge member limit (${challenge.max_members}) reached.`);
  }

  const newMember: ChallengeMember = {
    ...createSyncMeta('pending'),
    id: existingMember?.id || createId('cm'),
    challenge_id: challenge.id,
    user_id: params.userId,
    role: 'member',
    joined_at: new Date().toISOString(),
    status: 'active',
  };

  await db.challenge_members.put(newMember);
  if (matchedInvite) {
    await db.challenge_invites.update(matchedInvite.id, {
      uses: matchedInvite.uses + 1,
    });
  }

  await syncEngine.enqueueMutation({
    entity: 'challenge_members',
    recordId: newMember.id,
    operation: 'upsert',
    payload: newMember as unknown as Record<string, unknown>,
  });

  return challenge;
}

export async function updateChallengeMemberRoleOrRemove(params: {
  challengeId: string;
  actorUserId: string;
  targetUserId: string;
  action: 'make_admin' | 'make_member' | 'remove';
}): Promise<void> {
  const challenge = await db.cached_challenges.get(params.challengeId);
  if (!challenge) throw new Error('Challenge not found');

  const actorMember = await db.challenge_members
    .where('[challenge_id+user_id]')
    .equals([params.challengeId, params.actorUserId])
    .first();

  if (challenge.creator_id !== params.actorUserId && actorMember?.role !== 'owner' && actorMember?.role !== 'admin') {
    throw new Error('Only challenge owners or admins can manage members.');
  }

  const targetMember = await db.challenge_members
    .where('[challenge_id+user_id]')
    .equals([params.challengeId, params.targetUserId])
    .first();

  if (!targetMember) throw new Error('Member not found');
  if (targetMember.role === 'owner') throw new Error('Cannot modify challenge owner');

  if (params.action === 'remove') {
    await db.challenge_members.delete(targetMember.id);
    await syncEngine.enqueueMutation({
      entity: 'challenge_members',
      recordId: targetMember.id,
      operation: 'delete',
      payload: { id: targetMember.id },
    });
  } else {
    const newRole: MemberRole = params.action === 'make_admin' ? 'admin' : 'member';
    const updated: ChallengeMember = {
      ...targetMember,
      role: newRole,
      _syncStatus: 'pending',
      _lastModified: Date.now(),
    };
    await db.challenge_members.put(updated);
    await syncEngine.enqueueMutation({
      entity: 'challenge_members',
      recordId: updated.id,
      operation: 'upsert',
      payload: updated as unknown as Record<string, unknown>,
    });
  }
}

/**
 * WORKOUT ENGINE & PERSONAL RECORDS
 */
export async function saveCompletedWorkout(params: {
  userId: string;
  draft: ActiveWorkoutDraft;
}): Promise<CompletedWorkoutSummary> {
  const { userId, draft } = params;
  const workoutId = draft.id || createId('w');
  const elapsedMinutes = Math.max(
    12,
    Math.round((Date.now() - draft.startedAt) / 60000) || 48
  );

  const nowIso = new Date().toISOString();
  const workoutRecord: Workout = {
    ...createSyncMeta('pending'),
    id: workoutId,
    user_id: userId,
    challenge_id: draft.challenge_id,
    workout_date: draft.workout_date || DEMO_TODAY,
    name: sanitizeText(draft.name || 'Training Session'),
    duration_minutes: elapsedMinutes,
    notes: sanitizeText(draft.notes || ''),
    completed: true,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const workoutExercisesToSave: WorkoutExercise[] = [];
  const setsToSave: WorkoutSet[] = [];
  const existingPRs = await db.personal_records.where('user_id').equals(userId).toArray();
  const newPRRecords: PersonalRecord[] = [];
  const detectedPRs: DetectedPR[] = [];

  draft.exercises.forEach((ex, index) => {
    const weId = ex.id || createId('we');
    workoutExercisesToSave.push({
      ...createSyncMeta('pending'),
      id: weId,
      workout_id: workoutId,
      exercise_id: ex.exercise_id,
      order_index: index,
      notes: sanitizeText(ex.notes || ''),
    });

    const completedSetsForEx: WorkoutSet[] = [];
    ex.sets.forEach((s, sIdx) => {
      const setRecord: WorkoutSet = {
        ...createSyncMeta('pending'),
        id: s.id || createId('set'),
        workout_exercise_id: weId,
        set_number: sIdx + 1,
        weight: Number(s.weight) || 0,
        weight_unit: s.weight_unit || 'kg',
        reps: Number(s.reps) || 0,
        rpe: s.rpe !== null && s.rpe !== undefined ? Number(s.rpe) : 8,
        rir: s.rir !== null && s.rir !== undefined ? Number(s.rir) : 2,
        duration_seconds: null,
        distance: null,
        completed: Boolean(s.completed),
      };
      setsToSave.push(setRecord);
      if (setRecord.completed) {
        completedSetsForEx.push(setRecord);
      }
    });

    const pr = detectExercisePR(ex.exercise_id, completedSetsForEx, existingPRs);
    if (pr) {
      detectedPRs.push(pr);
      newPRRecords.push({
        ...createSyncMeta('pending'),
        id: createId('pr'),
        user_id: userId,
        exercise_id: ex.exercise_id,
        weight: pr.weight,
        reps: pr.reps,
        estimated_1rm: pr.estimated1RM,
        pr_type: pr.prType,
        achieved_at: nowIso,
      });
    }
  });

  await db.transaction(
    'rw',
    [db.workouts, db.workout_exercises, db.sets, db.personal_records],
    async () => {
      await db.workouts.put(workoutRecord);
      if (workoutExercisesToSave.length > 0) {
        await db.workout_exercises.bulkPut(workoutExercisesToSave);
      }
      if (setsToSave.length > 0) {
        await db.sets.bulkPut(setsToSave);
      }
      if (newPRRecords.length > 0) {
        await db.personal_records.bulkPut(newPRRecords);
      }
    }
  );

  // Enqueue granular record-level mutations in Outbox Sync Queue
  await syncEngine.enqueueMutation({
    entity: 'workouts',
    recordId: workoutRecord.id,
    operation: 'upsert',
    payload: workoutRecord as unknown as Record<string, unknown>,
  });

  for (const we of workoutExercisesToSave) {
    await syncEngine.enqueueMutation({
      entity: 'workout_exercises',
      recordId: we.id,
      operation: 'upsert',
      payload: we as unknown as Record<string, unknown>,
    });
  }

  for (const s of setsToSave) {
    await syncEngine.enqueueMutation({
      entity: 'sets',
      recordId: s.id,
      operation: 'upsert',
      payload: s as unknown as Record<string, unknown>,
    });
  }

  for (const pr of newPRRecords) {
    await syncEngine.enqueueMutation({
      entity: 'personal_records',
      recordId: pr.id,
      operation: 'upsert',
      payload: pr as unknown as Record<string, unknown>,
    });
  }

  const allUserWorkouts = await db.workouts.where('user_id').equals(userId).toArray();
  const streakDays = calculateStreak(
    allUserWorkouts.filter((w) => w.completed).map((w) => w.workout_date),
    workoutRecord.workout_date
  );

  return {
    workoutId,
    name: workoutRecord.name,
    durationMinutes: elapsedMinutes,
    totalVolume: calculateWorkoutVolume(setsToSave),
    totalSets: setsToSave.filter((s) => s.completed).length,
    totalReps: calculateTotalReps(setsToSave),
    prsAchieved: detectedPRs,
    streakDays,
  };
}

export async function createCustomExercise(params: {
  userId: string;
  name: string;
  category: Exercise['category'];
  muscle_group: string;
  equipment: Exercise['equipment'];
}): Promise<Exercise> {
  const exercise: Exercise = {
    ...createSyncMeta('pending'),
    id: createId('ex'),
    name: sanitizeText(params.name),
    category: params.category,
    muscle_group: sanitizeText(params.muscle_group),
    equipment: params.equipment,
    is_custom: true,
    created_by: params.userId,
  };

  await db.exercises.put(exercise);
  await syncEngine.enqueueMutation({
    entity: 'exercises',
    recordId: exercise.id,
    operation: 'upsert',
    payload: exercise as unknown as Record<string, unknown>,
  });
  return exercise;
}

/**
 * DIET LOGGING & DATABASE-LEVEL PRIVACY
 */
export async function createDietLogRecord(params: {
  userId: string;
  challengeId: string | null;
  date: string;
  meal_type: MealType;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  photo_url?: string | null;
  notes?: string;
}): Promise<DietLog> {
  const colors: Record<MealType, string> = {
    Breakfast: '#7DD3FC',
    Lunch: '#4ADE80',
    Snack: '#FBBF24',
    Dinner: '#38BDF8',
  };
  const accent = colors[params.meal_type] || '#5EC8FF';
  const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="28" fill="#121821"/><circle cx="60" cy="60" r="44" fill="#0D1117" stroke="${accent}" stroke-width="3"/><circle cx="48" cy="52" r="14" fill="${accent}" fill-opacity="0.75"/><circle cx="72" cy="64" r="16" fill="#4ADE80" fill-opacity="0.65"/><text x="60" y="110" text-anchor="middle" fill="#8B98A8" font-family="Inter, sans-serif" font-size="11" font-weight="600">${params.meal_type.toUpperCase()}</text></svg>`;

  const log: DietLog = {
    ...createSyncMeta('pending'),
    id: createId('diet'),
    user_id: params.userId,
    challenge_id: params.challengeId,
    date: params.date,
    meal_type: params.meal_type,
    description: sanitizeText(params.description),
    calories: Math.round(params.calories),
    protein: Math.round(params.protein * 10) / 10,
    carbs: Math.round(params.carbs * 10) / 10,
    fat: Math.round(params.fat * 10) / 10,
    photo_url: params.photo_url || `data:image/svg+xml;utf8,${encodeURIComponent(defaultSvg)}`,
    notes: sanitizeText(params.notes || ''),
    created_at: new Date().toISOString(),
  };

  await db.diet_logs.put(log);
  await syncEngine.enqueueMutation({
    entity: 'diet_logs',
    recordId: log.id,
    operation: 'upsert',
    payload: log as unknown as Record<string, unknown>,
  });
  return log;
}

export async function deleteDietLogRecord(dietLogId: string, actorUserId: string): Promise<void> {
  const existing = await db.diet_logs.get(dietLogId);
  if (!existing) return;
  if (existing.user_id !== actorUserId) {
    throw new Error('Unauthorized: You cannot delete another member’s diet log.');
  }
  await db.diet_logs.delete(dietLogId);
  await syncEngine.enqueueMutation({
    entity: 'diet_logs',
    recordId: dietLogId,
    operation: 'delete',
    payload: { id: dietLogId },
  });
}

/**
 * Retrieve challenge diet logs strictly enforcing `challenge.show_diet` RLS policy
 */
export async function queryChallengeDietLogsWithRLS(
  challengeId: string,
  viewerUserId: string,
  dateStr?: string
): Promise<DietLog[]> {
  const challenge = await db.cached_challenges.get(challengeId);
  if (!challenge) return [];

  const membership = await db.challenge_members
    .where('[challenge_id+user_id]')
    .equals([challengeId, viewerUserId])
    .first();

  const isViewerMember = Boolean(membership && membership.status === 'active');
  const allChallengeDietLogs = await db.diet_logs
    .where('challenge_id')
    .equals(challengeId)
    .toArray();

  return allChallengeDietLogs.filter(
    (log) =>
      (!dateStr || log.date === dateStr) &&
      canUserViewDietLog(log, viewerUserId, challenge, isViewerMember)
  );
}

/**
 * BODY METRICS & HYDRATION / STEPS
 */
export async function upsertBodyMetricRecord(params: {
  userId: string;
  date: string;
  weight?: number | null;
  body_fat_percentage?: number | null;
  waist?: number | null;
  chest?: number | null;
  arms?: number | null;
  thighs?: number | null;
  water_liters?: number;
  steps?: number;
  notes?: string;
}): Promise<BodyMetric> {
  const existing = await db.body_metrics
    .where('[user_id+date]')
    .equals([params.userId, params.date])
    .first();

  const record: BodyMetric = {
    ...createSyncMeta('pending'),
    id: existing?.id || createId('bm'),
    user_id: params.userId,
    date: params.date,
    weight: params.weight !== undefined ? params.weight : existing?.weight ?? null,
    body_fat_percentage:
      params.body_fat_percentage !== undefined
        ? params.body_fat_percentage
        : existing?.body_fat_percentage ?? null,
    waist: params.waist !== undefined ? params.waist : existing?.waist ?? null,
    chest: params.chest !== undefined ? params.chest : existing?.chest ?? null,
    arms: params.arms !== undefined ? params.arms : existing?.arms ?? null,
    thighs: params.thighs !== undefined ? params.thighs : existing?.thighs ?? null,
    water_liters:
      params.water_liters !== undefined
        ? Math.round(params.water_liters * 100) / 100
        : existing?.water_liters ?? 2.1,
    steps: params.steps !== undefined ? params.steps : existing?.steps ?? 4320,
    notes: sanitizeText(params.notes ?? existing?.notes ?? ''),
  };

  await db.body_metrics.put(record);
  if (record.weight !== null) {
    const profile = await db.profiles.get(params.userId);
    if (profile) {
      await db.profiles.update(params.userId, {
        weight: record.weight,
        body_fat_percentage: record.body_fat_percentage ?? profile.body_fat_percentage,
      });
    }
  }

  await syncEngine.enqueueMutation({
    entity: 'body_metrics',
    recordId: record.id,
    operation: 'upsert',
    payload: record as unknown as Record<string, unknown>,
  });
  return record;
}
