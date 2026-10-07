-- ============================================================
-- FITKONIC — NEON POSTGRESQL INDEXES & RLS POLICIES (0002_rls_and_indexes.sql)
-- ============================================================

-- 1. MANDATORY INDEXES
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_challenge_date ON workouts(challenge_id, workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_sets_workout_exercise ON sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_diet_logs_user_date ON diet_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_diet_logs_challenge_date ON diet_logs(challenge_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_body_metrics_user_date ON body_metrics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_members_challenge ON challenge_members(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_members_user ON challenge_members(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_user_achieved ON personal_records(user_id, achieved_at DESC);

-- Helper function to retrieve current authenticated user in Neon session
CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. ENABLE ROW LEVEL SECURITY ON EVERY TABLE
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES POLICIES
CREATE POLICY profiles_select_policy ON profiles
  FOR SELECT USING (
    id = current_app_user_id()
    OR profile_visibility = 'PUBLIC'
    OR EXISTS (
      SELECT 1 FROM challenge_members cm1
      JOIN challenge_members cm2 ON cm1.challenge_id = cm2.challenge_id
      WHERE cm1.user_id = profiles.id AND cm2.user_id = current_app_user_id()
    )
  );

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = current_app_user_id())
  WITH CHECK (id = current_app_user_id());

CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (id = current_app_user_id());

-- 4. CHALLENGES POLICIES
CREATE POLICY challenges_select_policy ON challenges
  FOR SELECT USING (
    visibility = 'PUBLIC'
    OR creator_id = current_app_user_id()
    OR EXISTS (
      SELECT 1 FROM challenge_members cm
      WHERE cm.challenge_id = challenges.id
        AND cm.user_id = current_app_user_id()
        AND cm.status = 'active'
    )
  );

CREATE POLICY challenges_insert_policy ON challenges
  FOR INSERT WITH CHECK (creator_id = current_app_user_id());

CREATE POLICY challenges_update_owner_admin ON challenges
  FOR UPDATE USING (
    creator_id = current_app_user_id()
    OR EXISTS (
      SELECT 1 FROM challenge_members cm
      WHERE cm.challenge_id = challenges.id
        AND cm.user_id = current_app_user_id()
        AND cm.role IN ('owner', 'admin')
        AND cm.status = 'active'
    )
  );

CREATE POLICY challenges_delete_owner ON challenges
  FOR DELETE USING (creator_id = current_app_user_id());

-- 5. CHALLENGE MEMBERS POLICIES
CREATE POLICY challenge_members_select ON challenge_members
  FOR SELECT USING (
    user_id = current_app_user_id()
    OR EXISTS (
      SELECT 1 FROM challenge_members cm
      WHERE cm.challenge_id = challenge_members.challenge_id
        AND cm.user_id = current_app_user_id()
    )
    OR EXISTS (
      SELECT 1 FROM challenges c
      WHERE c.id = challenge_members.challenge_id AND c.visibility = 'PUBLIC'
    )
  );

CREATE POLICY challenge_members_insert ON challenge_members
  FOR INSERT WITH CHECK (
    user_id = current_app_user_id()
    OR EXISTS (
      SELECT 1 FROM challenges c
      WHERE c.id = challenge_members.challenge_id AND c.creator_id = current_app_user_id()
    )
  );

CREATE POLICY challenge_members_manage ON challenge_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM challenge_members cm
      WHERE cm.challenge_id = challenge_members.challenge_id
        AND cm.user_id = current_app_user_id()
        AND cm.role IN ('owner', 'admin')
    )
  );

-- 6. WORKOUTS, WORKOUT_EXERCISES, SETS POLICIES
-- Users can read their own workouts or challenge members' workouts when show_workouts = TRUE
CREATE POLICY workouts_select_policy ON workouts
  FOR SELECT USING (
    user_id = current_app_user_id()
    OR (
      challenge_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM challenges c
        JOIN challenge_members cm ON cm.challenge_id = c.id
        WHERE c.id = workouts.challenge_id
          AND c.show_workouts = TRUE
          AND cm.user_id = current_app_user_id()
          AND cm.status = 'active'
      )
    )
  );

CREATE POLICY workouts_insert_own ON workouts
  FOR INSERT WITH CHECK (user_id = current_app_user_id());

CREATE POLICY workouts_update_own ON workouts
  FOR UPDATE USING (user_id = current_app_user_id())
  WITH CHECK (user_id = current_app_user_id());

CREATE POLICY workouts_delete_own ON workouts
  FOR DELETE USING (user_id = current_app_user_id());

-- 7. DIET LOGS POLICIES (STRICT DATABASE-LEVEL DIET PRIVACY)
-- If challenge.show_diet = FALSE, other members CANNOT retrieve the user's diet logs!
CREATE POLICY diet_logs_select_policy ON diet_logs
  FOR SELECT USING (
    user_id = current_app_user_id()
    OR (
      challenge_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM challenges c
        JOIN challenge_members cm_viewer ON cm_viewer.challenge_id = c.id
        JOIN challenge_members cm_owner ON cm_owner.challenge_id = c.id
        WHERE c.id = diet_logs.challenge_id
          AND c.show_diet = TRUE
          AND cm_viewer.user_id = current_app_user_id()
          AND cm_viewer.status = 'active'
          AND cm_owner.user_id = diet_logs.user_id
          AND cm_owner.status = 'active'
      )
    )
  );

CREATE POLICY diet_logs_insert_own ON diet_logs
  FOR INSERT WITH CHECK (user_id = current_app_user_id());

CREATE POLICY diet_logs_update_own ON diet_logs
  FOR UPDATE USING (user_id = current_app_user_id())
  WITH CHECK (user_id = current_app_user_id());

CREATE POLICY diet_logs_delete_own ON diet_logs
  FOR DELETE USING (user_id = current_app_user_id());

-- 8. BODY METRICS & PERSONAL RECORDS POLICIES
CREATE POLICY body_metrics_own ON body_metrics
  FOR ALL USING (user_id = current_app_user_id())
  WITH CHECK (user_id = current_app_user_id());

CREATE POLICY personal_records_select ON personal_records
  FOR SELECT USING (
    user_id = current_app_user_id()
    OR EXISTS (
      SELECT 1 FROM challenge_members cm1
      JOIN challenge_members cm2 ON cm1.challenge_id = cm2.challenge_id
      WHERE cm1.user_id = personal_records.user_id
        AND cm2.user_id = current_app_user_id()
    )
  );

CREATE POLICY personal_records_modify_own ON personal_records
  FOR INSERT WITH CHECK (user_id = current_app_user_id());
