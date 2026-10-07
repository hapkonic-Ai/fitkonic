import Dexie, { type Table } from 'dexie';
import type {
  BodyMetric,
  Challenge,
  ChallengeInvite,
  ChallengeMember,
  DietLog,
  Exercise,
  PersonalRecord,
  SyncQueueItem,
  UserProfile,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '@/types';

export class FitkonicDexieDB extends Dexie {
  profiles!: Table<UserProfile, string>;
  cached_challenges!: Table<Challenge, string>;
  challenge_members!: Table<ChallengeMember, string>;
  challenge_invites!: Table<ChallengeInvite, string>;
  exercises!: Table<Exercise, string>;
  workouts!: Table<Workout, string>;
  workout_exercises!: Table<WorkoutExercise, string>;
  sets!: Table<WorkoutSet, string>;
  diet_logs!: Table<DietLog, string>;
  body_metrics!: Table<BodyMetric, string>;
  personal_records!: Table<PersonalRecord, string>;
  sync_queue!: Table<SyncQueueItem, string>;

  constructor() {
    super('fitkonic_offline_db_v6_clean');

    this.version(1).stores({
      profiles: 'id, email, username, _syncStatus',
      cached_challenges: 'id, slug, creator_id, status, visibility, _syncStatus',
      challenge_members: 'id, challenge_id, user_id, [challenge_id+user_id], _syncStatus',
      challenge_invites: 'id, challenge_id, invite_code, _syncStatus',
      exercises: 'id, name, category, muscle_group, equipment, is_custom, _syncStatus',
      workouts: 'id, user_id, challenge_id, workout_date, [user_id+workout_date], [challenge_id+workout_date], _syncStatus',
      workout_exercises: 'id, workout_id, exercise_id, order_index, _syncStatus',
      sets: 'id, workout_exercise_id, set_number, _syncStatus',
      diet_logs: 'id, user_id, challenge_id, date, [user_id+date], [challenge_id+date], _syncStatus',
      body_metrics: 'id, user_id, date, [user_id+date], _syncStatus',
      personal_records: 'id, user_id, exercise_id, achieved_at, [user_id+achieved_at], _syncStatus',
      sync_queue: 'id, entity, recordId, status, createdAt',
    });
  }
}

export const db = new FitkonicDexieDB();
