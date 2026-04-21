# Build State

Running ledger. Rehydrate from this after compaction.

## Done
- Scaffold: Vite + React + TS
- Deps: dexie, react-router-dom, framer-motion, lucide-react, clsx, zustand
- Design tokens (`src/styles/tokens.css`) + global CSS
- App shell: responsive top nav (desktop) + floating bottom nav (mobile)
- Data layer: Dexie schema + repository interface (swap-ready)
- Seed data: 4 tracks, 9 topics, 1 polished lesson, 1 polished quiz, inventory, sample project
- Dashboard: overall progress bar + quick links + recent + projects
- Learn: tracks → topics with per-topic mastery bars
- Topic detail: lessons + quizzes listings
- Lesson view: markdown render + mark-done
- Quiz engine: MCQ with animated feedback, result card, mastery recompute
- Projects list + New Project 5-step intake + Project Detail with checklist
- Light markdown renderer (no extra dep)
- Vite base path wired for `/claudeHub/revamp/` on prod
- Inter font loaded via CDN
- Production build passes cleanly

## Deferred (intentional)
- Electrified-circuit skill-map viz — doesn't fit Linear-minimalism at v1. Mastery bars convey progress fine. Revisit if depth calls for it.
- Inventory dedicated page — schema + seed ready, UI deferred
- Authoring flow (create lessons/quizzes in-app) — Claude API integration comes later
- Project bootstrapper (scaffolds files + runs init) — deferred
- Resume / public-links surface — deferred

## How to preview locally
```
cd revamp
npm run dev
```
Opens http://localhost:5173

## GH Pages
Production build outputs `dist/`. Deploy either:
- Point Pages at this branch, path `/revamp/` (base path already set)
- Or copy `dist/` contents to repo root and merge

## Key knobs (once set)
- Accent base: `--accent-base` in `src/styles/tokens.css` — one value drives every accent surface.
- Danger: `--danger-base` in same file.
- Radii: `--radius-sm/md/lg`.

## Key file paths (planned)
- `src/styles/tokens.css` — design tokens (single source)
- `src/styles/global.css` — reset + typography
- `src/app/AppShell.tsx` — responsive nav + routing
- `src/db/schema.ts` — Dexie schema
- `src/db/repo.ts` — repository interface (swap-ready)
- `src/pages/{Dashboard,Learn,Projects}.tsx`
- `src/features/quiz/*`
- `src/seed/*.ts`

## Port
Dev server: `npm run dev` — Vite defaults to 5173.
