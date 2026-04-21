# Architectural Decisions

One line per decision. Date-tagged. Don't delete — supersede.

- 2026-04-20 — Stack: Vite + React + TypeScript. Static build deploys on GH Pages unchanged.
- 2026-04-20 — State: Zustand (light, no boilerplate). Route state via React Router.
- 2026-04-20 — Persistence: Dexie (IndexedDB wrapper) behind a `repo/` interface. Swap target: hosted DB (Supabase/Turso) later — only `repo/` changes.
- 2026-04-20 — Motion: Framer Motion for page transitions + accent flourishes. Compositor-only properties. Reduced-motion honored.
- 2026-04-20 — Icons: lucide-react.
- 2026-04-20 — Styling: CSS custom properties + CSS Modules. No Tailwind/utility framework. Tokens live in `src/styles/tokens.css` — single source.
- 2026-04-20 — Tokens follow `--accent-{solid,border,glow,surface,ink,hover}` + `--radius-{sm,md,lg}` + `--ease-*` + `--space-*`. One `--accent-base`; all accent tokens derive via `color-mix` in OKLCH.
- 2026-04-20 — Light-only for v1. Dark mode not in scope.
- 2026-04-20 — Nav: desktop = top horizontal, mobile = bottom tab bar. Same routes.
- 2026-04-20 — Learn mastery granularity: per-topic 0-100 mastery score, computed from quiz performance + lesson completion. Topics group into Tracks.
- 2026-04-20 — Projects three-route logic: each route is a filtered view over the same stack-pick + gap-analysis result; logic lives in `lib/projectRoutes.ts`.
- 2026-04-20 — Seed data lives in `src/seed/*.ts`, loaded into IndexedDB on first boot. Idempotent — won't overwrite real edits.
- 2026-04-20 — No external analytics, no telemetry, no service worker in v1.
