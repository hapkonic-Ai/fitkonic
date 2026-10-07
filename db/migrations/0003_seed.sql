-- ============================================================
-- FITKONIC — NEON POSTGRESQL SEED DATA (0003_seed.sql)
-- 3 Logins: Harsh, Pranav, Kavi
-- Challenges: Winter Arc, Summer Shred, Powerlifting Peak
-- ============================================================

INSERT INTO profiles (id, email, display_name, username, bio, height, weight, body_fat_percentage, fitness_goal, primary_sport)
VALUES
  ('11111111-1111-4111-8111-111111111101', 'harsh@fitkonic.app', 'Harsh', 'harsh', 'Focusing on steady lifting strength increases and body weight progress.', 180, 82.0, 16.0, 'Build Strength & Lean Mass', 'Strength Training'),
  ('11111111-1111-4111-8111-111111111102', 'pranav@fitkonic.app', 'Pranav', 'pranav', 'Progressive overload on compound lifts every week.', 178, 76.5, 15.0, 'Progressive Overload', 'Strength Training'),
  ('11111111-1111-4111-8111-111111111103', 'kavi@fitkonic.app', 'Kavi', 'kavi', 'Consistent daily workouts, simple clean meals, heavier lifts.', 175, 73.0, 14.5, 'Strength & Conditioning', 'Strength Training')
ON CONFLICT (id) DO NOTHING;

INSERT INTO challenges (
  id, creator_id, name, slug, description, rules, start_date, end_date,
  status, visibility, max_members, background_type, background_id,
  background_image_url, background_position, background_overlay, accent_color,
  show_leaderboard, show_diet, show_workouts, allow_member_invites, leaderboard_metric
)
VALUES
  (
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111101',
    'Winter Arc',
    'winter-arc',
    'Harsh, Pranav & Kavi — 42 days of simple daily workout logging, clean meals, and lifting heavier weights.',
    '1. Log what workout you did today.\n2. Update what you ate today.\n3. Track body weight and increase lifting weights each week.',
    '2026-09-25',
    '2026-11-05',
    'ACTIVE',
    'INVITE_ONLY',
    10,
    'preset',
    'winter-arc',
    '/themes/winter-arc.svg',
    'center center',
    0.62,
    '#7DD3FC',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    'training_volume'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '11111111-1111-4111-8111-111111111102',
    'Summer Shred',
    'summer-shred',
    '8-week lean conditioning block with simple daily food accountability.',
    '1. Log daily meals.\n2. 4x strength sessions weekly.',
    '2026-09-15',
    '2026-11-10',
    'ACTIVE',
    'PUBLIC',
    25,
    'preset',
    'summer-shred',
    '/themes/summer-shred.svg',
    'center center',
    0.58,
    '#F59E0B',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    'consistency'
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    '11111111-1111-4111-8111-111111111103',
    'Powerlifting Peak',
    'powerlifting-peak',
    'Heavy Squat, Bench, and Deadlift strength progression.',
    '1. Track weight increases on Bench, Squat, and Deadlift.',
    '2026-09-20',
    '2026-11-15',
    'ACTIVE',
    'PUBLIC',
    20,
    'preset',
    'powerlifting-peak',
    '/themes/powerlifting-peak.svg',
    'center center',
    0.68,
    '#EF4444',
    TRUE,
    FALSE,
    TRUE,
    TRUE,
    'training_volume'
  )
ON CONFLICT (id) DO NOTHING;
