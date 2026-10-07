# AGENTS.md — FITKONIC Engineering & Agent Guidelines

## Core Product Identity
- **Fitkonic** is a modern fitness competition and accountability Progressive Web App (PWA).
- **Primary Tagline:** `DISCIPLINE TODAY. A STRONGER TOMORROW.`
- **Secondary Tagline:** `TRAIN. FUEL. COMPETE. GROW.`
- **Two-Level Visual Identity:**
  1. **Level 1 (Global Brand):** Dark cinematic + neo-brutalist athletic performance aesthetic (`#07090C` base, `#0D1117` surface, `#121821` secondary surface, `#202A35` border, `#5EC8FF` default accent, `Space Grotesk` display/numeric typography, `Inter` UI typography).
  2. **Level 2 (Challenge Identity):** Each challenge defines its own atmospheric background, overlay opacity, background position, and accent color. **Winter Arc is ONLY a challenge theme, NOT the global application theme.**

## Mandatory Engineering Principles
1. **Fitkonic is a fitness competition PWA** — Every screen reinforces the core loop: `CREATE CHALLENGE → INVITE/JOIN → SET GOAL → TRAIN → LOG WORKOUT → OPTIONALLY LOG DIET → TRACK PROGRESS → SEE LEADERBOARD → COMPETE → IMPROVE → REPEAT`.
2. **Mobile-first & Gym-optimized** — Most usage happens standing inside a gym. Use large touch targets (`min-h-[44px]`), numeric inputs (`inputMode="decimal"` / `"numeric"`), one-tap set duplication, previous performance hints, and a sticky finish workout button. Minimize typing during workouts.
3. **Workout logging is a critical feature** — Never require modals for routine set entry. Support weight, reps, RPE, RIR, set completion toggles, automatic PR detection (Max Weight, Estimated 1RM via Epley formula, Volume PR, Rep PR), rest timer, and templates.
4. **Offline workout logging is mandatory** — All mutations flow `UI → Dexie (IndexedDB) → Sync Outbox Queue → Neon PostgreSQL`. Users must never lose workout or diet data due to poor gym connectivity.
5. **Neon PostgreSQL + Row-Level Security (RLS) is mandatory** — All tables in Neon PostgreSQL enforce RLS policies via `app.current_user_id`. Diet visibility (`challenge.show_diet`) is enforced at both the database policy/query layer and the repository layer.
6. **There is NO group chat or social media bloat** — Do NOT build group chat, direct messaging, social feeds, followers, likes, or comments. Accountability comes from visibility, consistency, leaderboards, streaks, and PRs.
7. **Do not create fake buttons or leave TODOs** — Every interactive button, filter, tab, form, dialog, toggle, and quick action must perform real state transitions persisted to IndexedDB and synchronized with the Neon backend.
8. **Use strict TypeScript & Zod** — Avoid `any`. Validate forms and external payloads with `zod`.
9. **Test critical workflows & perform browser visual QA** — Verify unit tests (Vitest), E2E flows including offline workout logging and reconnection sync (Playwright), and visual responsiveness across mobile and desktop viewports.
