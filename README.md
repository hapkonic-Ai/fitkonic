# FITKONIC — Discipline Today. A Stronger Tomorrow.

**TRAIN. FUEL. COMPETE. GROW.**

Fitkonic is a production-grade, offline-first fitness competition and accountability Progressive Web App (PWA) powered by **Neon Serverless PostgreSQL** and **Dexie IndexedDB**.

---

## 1. What is Fitkonic?
Fitkonic enables training groups (such as a 5-friend squad doing a **Winter Arc**, **Summer Shred**, **Powerlifting Peak**, **Marathon Prep**, or **Fight Camp**) to create custom themed challenges, log workouts rapidly inside a gym with zero internet connectivity, optionally track daily nutrition with database-enforced privacy, and compete on real-time multi-metric leaderboards.

---

## 2. Key Features
- **Two-Level Visual Identity:**
  - **Level 1 (Global Brand):** Dark Cinematic + Neo-Brutalist Athletic Performance (`#07090C` base, `#0D1117` surface, `#202A35` borders, `#5EC8FF` cyan accent, `Space Grotesk` + `Inter`).
  - **Level 2 (Challenge Identity):** Each challenge defines its own atmospheric background, position, overlay opacity, and accent color (`Winter Arc`, `Summer Shred`, `Powerlifting Peak`, `Marathon Prep`, `Fight Camp`, or custom image upload).
- **Gym-First Workout Logger:** Inline weight/reps/RPE entry, 1-tap set duplication, automatic Epley 1RM calculation (`1RM = weight × (1 + reps / 30)`), automatic Personal Record detection, workout templates (`Push Day`, `Pull Day`, `Leg Day`, `Upper Body`, `Lower Body`, `Full Body`), and custom exercise creation.
- **Challenge-Scoped Diet Tracking & Privacy:** Log Breakfast, Lunch, Dinner, and Snacks with calorie and macro gauges (`Protein`, `Carbs`, `Fat`). When `challenge.show_diet = false`, other challenge members are strictly prevented from retrieving member diet logs.
- **Multi-Metric Leaderboard:** Rank members by `Consistency`, `Training Volume`, `Workout Count`, `Training Days`, `PR Count`, or `Diet Consistency`.
- **Offline-First Architecture:** All writes go immediately to Dexie (`IndexedDB`) with `_syncStatus`, `_lastModified`, `_localVersion`, and enqueue into `sync_queue`. When connectivity returns, mutations synchronize automatically to **Neon Serverless PostgreSQL**.
- **Installable PWA:** Configured with `vite-plugin-pwa`, Workbox precaching/runtime caching, standalone manifest, and custom geometric Fitkonic icons (`192x192`, `512x512`, `maskable`).

---

## 3. Technology Stack
- **Frontend:** React 19, TypeScript (Strict), Vite 6
- **UI & Styling:** Tailwind CSS, Lucide React, Custom Fitkonic Component System
- **State Management:** TanStack Query + Zustand
- **Forms & Validation:** React Hook Form + Zod
- **Charts:** Recharts
- **Database & Backend:** Neon Serverless PostgreSQL (`@neondatabase/serverless`) + Vite Neon API Middleware (`/api/neon/*`)
- **Offline Storage:** Dexie.js (`IndexedDB`)
- **PWA:** `vite-plugin-pwa` + Workbox
- **Testing:** Vitest (Unit) + Playwright (E2E & Offline Sync)

---

## 4. Environment Variables & Neon PostgreSQL Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your Neon PostgreSQL connection string:
```env
VITE_NEON_DATABASE_URL="postgresql://user:password@ep-your-endpoint.aws.neon.tech/fitkonic?sslmode=require"
DATABASE_URL="postgresql://user:password@ep-your-endpoint.aws.neon.tech/fitkonic?sslmode=require"
```

### Database Migrations
SQL migrations are located in `db/migrations/`:
- `db/migrations/0001_schema.sql` — Tables (`profiles`, `challenges`, `challenge_members`, `challenge_invites`, `exercises`, `workouts`, `workout_exercises`, `sets`, `diet_logs`, `body_metrics`, `personal_records`).
- `db/migrations/0002_rls_and_indexes.sql` — Performance indexes and PostgreSQL Row-Level Security (RLS) policies.
- `db/migrations/0003_seed.sql` — Initial 5 friends (`Harsh`, `Arjun`, `Karthik`, `Mohan`, `Vishal`) and 4 themed challenges.

Apply migrations to your Neon PostgreSQL database:
```bash
pnpm run db:migrate
```

---

## 5. Development & Testing Commands
```bash
# Start development server
pnpm run dev

# Typecheck
pnpm run typecheck

# Run unit tests (Vitest)
pnpm test

# Run E2E & Offline Sync tests (Playwright)
pnpm run test:e2e

# Build production PWA bundle & Service Worker
pnpm run build

# Preview production build
pnpm run preview
```
