# FITKONIC — System Architecture Document

## 1. Overview
**Fitkonic** is an offline-first, installable Progressive Web App (PWA) for group fitness challenges, rapid gym workout logging, optional challenge-scoped diet tracking, real-time leaderboards, and long-term athletic progress tracking.

---

## 2. Technology Stack
- **Frontend Framework:** React 19 + TypeScript (Strict Mode) + Vite
- **Styling & UI:** Tailwind CSS + shadcn/ui patterns + Lucide React + Custom Athletic Performance Components (`Space Grotesk` + `Inter`)
- **Routing:** State-synchronized declarative router with deep-link support (`/`, `/login`, `/log`, `/diet`, `/challenges`, `/challenges/new`, `/challenges/:id`, `/challenges/:id/members`, `/challenges/:id/settings`, `/progress`, `/calendar`, `/profile`, `/settings`, `/join/:code`)
- **Server & Async State:** TanStack Query (`@tanstack/react-query`)
- **Client UI State:** Zustand (`zustand`) for active workout session timer, connectivity/sync state, active challenge selection, and theme preferences
- **Forms & Validation:** React Hook Form + Zod (`@hookform/resolvers/zod`, `zod`)
- **Charts & Analytics:** Recharts (`recharts`)
- **Database & Backend:** **Neon Serverless PostgreSQL** (`@neondatabase/serverless`) + Vite Neon API Middleware (`/api/neon/*`)
- **Offline Storage:** Dexie.js (`dexie`) on top of browser IndexedDB
- **PWA & Service Worker:** `vite-plugin-pwa` + Workbox runtime caching & precaching
- **Date Utilities:** `date-fns`
- **Testing:** Vitest (unit & calculation tests) + Playwright (E2E & offline sync verification)

---

## 3. Frontend & Feature Architecture
```text
src/
  app/                  # App shell, navigation layout, theme & query providers
  components/
    ui/                 # Reusable atomic & Fitkonic performance components
  features/
    auth/               # Login, Registration, Google/Email auth, Password Reset, Demo Switcher
    dashboard/          # Home screen (Greeting, Challenge Hero, Today rings, Leaderboard preview, Recent PR)
    workouts/           # Active Workout Logger, Templates, History, Set Rows, PR Banner, Completion Modal
    exercises/          # Exercise catalog, search, muscle/equipment filters, custom exercise creator
    challenges/         # Challenge list, Challenge View (Overview, Members, Leaderboard, Rules), Create Challenge, Theme Picker, Settings, Invites
    leaderboard/        # Multi-metric Leaderboard calculator & table (Consistency, Volume, Workouts, Days, PRs, Diet)
    diet/               # Log Diet screen, Macro gauges, Meal cards, Privacy enforcement
    progress/           # Progress screen (Overview, Workouts, Diet, Body Stats, Strength, PRs, Consistency) + Recharts
    calendar/           # Monthly Training Calendar, day indicators, day drill-down & water logger
    profile/            # User Profile (Stats, PRs, Photos/Body metrics, Edit Profile modal)
    settings/           # Account, Privacy, Appearance, Notifications, PWA, Offline Sync Inspector
    notifications/      # Browser notification dispatcher & in-app activity alerts
  hooks/                # Custom hooks for connectivity, sync status, active challenge, timers
  lib/
    neon/               # Neon Serverless PostgreSQL driver, SQL runner, RLS session wrapper
    offline/            # Offline storage helpers & file/image validation
    sync/               # Outbox Sync Queue engine, retry with backoff, record-level conflict resolution
    calculations/       # Pure domain calculations (Volume, Epley 1RM, PR detector, Streaks, Leaderboard, Challenge progress)
    utils/              # Formatting, cn(), safe text rendering, ID generation
  db/
    dexie.ts            # IndexedDB schema with _syncStatus, _lastModified, _localVersion, _serverVersion
    seed.ts             # Realistic seed data (Harsh, Arjun, Karthik, Mohan, Vishal + Winter Arc, Summer Shred, Powerlift Peak, Marathon Prep, Fight Camp)
  types/
    index.ts            # Strict TypeScript interfaces & Zod schemas
```

---

## 4. Database Schema & Neon PostgreSQL RLS
All tables are defined in `db/migrations/0001_schema.sql` and `db/migrations/0002_rls_policies.sql`:
- `profiles`: User identity, body stats, goals, privacy settings.
- `challenges`: Challenge metadata, start/end dates, visibility (`PRIVATE`, `INVITE_ONLY`, `PUBLIC`), `max_members`, theme properties (`background_image_url`, `background_position`, `background_overlay`, `accent_color`), `show_leaderboard`, `show_diet`, `show_workouts`, `allow_member_invites`, `leaderboard_metric`.
- `challenge_members`: Role (`owner`, `admin`, `member`), status, joined timestamp.
- `challenge_invites`: Invite codes (`WINTER-ARC-42`), expiration, `max_uses`, `uses`.
- `exercises`: Built-in and user-created custom exercises (`category`, `muscle_group`, `equipment`).
- `workouts`: User workouts optionally linked to a challenge, duration, notes, completion status.
- `workout_exercises`: Ordered exercises within a workout.
- `sets`: Individual sets (`set_number`, `weight`, `weight_unit`, `reps`, `rpe`, `rir`, `duration_seconds`, `distance`, `completed`).
- `diet_logs`: Meals (`Breakfast`, `Lunch`, `Dinner`, `Snack`) with calories, protein, carbs, fat, photo URL, notes.
- `water_logs`: Daily hydration tracking (liters) and step counts for the Today dashboard & Calendar.
- `body_metrics`: Dated entries for weight, body fat %, waist, chest, arms, thighs.
- `personal_records`: Automatically detected PRs (`weight`, `reps`, `estimated_1rm`, `achieved_at`).

### Row-Level Security (RLS)
Neon PostgreSQL enforces RLS on every table using `current_setting('app.current_user_id', true)`:
- **Workouts / Sets / Body Metrics:** Users can only `INSERT`, `UPDATE`, or `DELETE` rows where `user_id = current_setting('app.current_user_id')`.
- **Diet Privacy (`diet_logs`):** Users can always read their own diet logs. Other challenge members can ONLY read a member's challenge diet logs when `EXISTS (SELECT 1 FROM challenges c JOIN challenge_members cm ON cm.challenge_id = c.id WHERE c.id = diet_logs.challenge_id AND c.show_diet = TRUE AND cm.user_id = current_setting('app.current_user_id'))`.
- **Challenges:** Private and Invite-Only challenges require membership or a valid non-expired invite code with `uses < max_uses`.

---

## 5. Offline-First & Synchronization Engine
```text
User Action (e.g., Complete Set / Finish Workout / Log Meal)
   │
   ▼
1. Write immediately to Dexie (IndexedDB) with `_syncStatus = 'pending'`, `_localVersion++`
2. Enqueue granular mutation in `sync_queue` table (entity, recordId, operation, payload, timestamp)
3. Optimistically update React state immediately (0ms latency in gym)
   │
   ▼
4. Sync Engine checks connectivity (`navigator.onLine` + active heartbeat `/api/neon/health`)
   ├─ If ONLINE: Flush `sync_queue` in FIFO order to Neon PostgreSQL (or local Neon sync endpoint)
   │    ├─ Success → Mark record `_syncStatus = 'synced'`, remove from `sync_queue`
   │    └─ Error   → Increment retry count, mark `_syncStatus = 'failed'`, expose "RETRY SYNC" action
   └─ If OFFLINE: Keep in `sync_queue`; show `OFFLINE — Saved on device` badge; auto-flush on `online` event
```

---

## 6. PWA & Caching Strategy
- Configured via `vite-plugin-pwa` with `registerType: 'autoUpdate'`.
- **Precache:** App shell (`index.html`, JS/CSS bundles, SVG/PNG icons, manifest).
- **Runtime Caching:**
  - Challenge theme imagery & avatars: `CacheFirst` (30 days expiration).
  - Static fonts (`Space Grotesk`, `Inter`): `CacheFirst` (1 year).
  - API calls (`/api/neon/*`): `NetworkOnly` (mutations and private queries are handled explicitly by Dexie + Sync Engine so private user data is never leaked via shared HTTP caches).
