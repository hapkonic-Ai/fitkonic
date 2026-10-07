-- ============================================================
-- FITKONIC — NEON POSTGRESQL SCHEMA MIGRATION (0001_schema.sql)
-- Engine: Neon Serverless PostgreSQL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  height NUMERIC(5,2),
  weight NUMERIC(5,2),
  body_fat_percentage NUMERIC(4,1),
  date_of_birth DATE,
  fitness_goal TEXT DEFAULT 'Strength & Conditioning',
  primary_sport TEXT DEFAULT 'Strength Training',
  profile_visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (profile_visibility IN ('PUBLIC', 'CHALLENGE_ONLY', 'PRIVATE')),
  body_metrics_visibility TEXT NOT NULL DEFAULT 'CHALLENGE_ONLY' CHECK (body_metrics_visibility IN ('PUBLIC', 'CHALLENGE_ONLY', 'PRIVATE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CHALLENGES
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  rules TEXT NOT NULL DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED')),
  visibility TEXT NOT NULL DEFAULT 'INVITE_ONLY' CHECK (visibility IN ('PRIVATE', 'INVITE_ONLY', 'PUBLIC')),
  max_members INTEGER NOT NULL DEFAULT 20 CHECK (max_members >= 2 AND max_members <= 10000),
  background_type TEXT NOT NULL DEFAULT 'preset' CHECK (background_type IN ('preset', 'custom')),
  background_id TEXT NOT NULL DEFAULT 'winter-arc',
  background_image_url TEXT NOT NULL,
  background_position TEXT NOT NULL DEFAULT 'center center',
  background_overlay NUMERIC(3,2) NOT NULL DEFAULT 0.65 CHECK (background_overlay >= 0.10 AND background_overlay <= 0.95),
  accent_color TEXT NOT NULL DEFAULT '#7DD3FC',
  show_leaderboard BOOLEAN NOT NULL DEFAULT TRUE,
  show_diet BOOLEAN NOT NULL DEFAULT TRUE,
  show_workouts BOOLEAN NOT NULL DEFAULT TRUE,
  allow_member_invites BOOLEAN NOT NULL DEFAULT TRUE,
  leaderboard_metric TEXT NOT NULL DEFAULT 'consistency' CHECK (
    leaderboard_metric IN (
      'consistency',
      'training_volume',
      'workout_count',
      'training_days',
      'pr_count',
      'diet_consistency'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CHALLENGE MEMBERS
CREATE TABLE IF NOT EXISTS challenge_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed')),
  UNIQUE (challenge_id, user_id)
);

-- 4. CHALLENGE INVITES
CREATE TABLE IF NOT EXISTS challenge_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 25,
  uses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. EXERCISES
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  equipment TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. WORKOUTS
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  workout_date DATE NOT NULL,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  notes TEXT DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. WORKOUT EXERCISES
CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT ''
);

-- 8. SETS
CREATE TABLE IF NOT EXISTS sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight NUMERIC(6,2) NOT NULL DEFAULT 0,
  weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lb')),
  reps INTEGER NOT NULL DEFAULT 0,
  rpe NUMERIC(3,1),
  rir NUMERIC(3,1),
  duration_seconds INTEGER,
  distance NUMERIC(8,2),
  completed BOOLEAN NOT NULL DEFAULT TRUE
);

-- 9. DIET LOGS
CREATE TABLE IF NOT EXISTS diet_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
  description TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0 CHECK (calories >= 0),
  protein NUMERIC(6,1) NOT NULL DEFAULT 0 CHECK (protein >= 0),
  carbs NUMERIC(6,1) NOT NULL DEFAULT 0 CHECK (carbs >= 0),
  fat NUMERIC(6,1) NOT NULL DEFAULT 0 CHECK (fat >= 0),
  photo_url TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. BODY METRICS
CREATE TABLE IF NOT EXISTS body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight NUMERIC(5,2),
  body_fat_percentage NUMERIC(4,1),
  waist NUMERIC(5,2),
  chest NUMERIC(5,2),
  arms NUMERIC(5,2),
  thighs NUMERIC(5,2),
  water_liters NUMERIC(4,2) DEFAULT 0,
  steps INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. PERSONAL RECORDS
CREATE TABLE IF NOT EXISTS personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  weight NUMERIC(6,2) NOT NULL,
  reps INTEGER NOT NULL,
  estimated_1rm NUMERIC(6,2) NOT NULL,
  pr_type TEXT NOT NULL DEFAULT '1rm' CHECK (pr_type IN ('max_weight', '1rm', 'volume', 'reps')),
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
