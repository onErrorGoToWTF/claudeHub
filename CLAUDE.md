# claudeHub

> **Working project lives in `revamp/`.** It's the deployed aiUniversity app.
> The files at this repo root are the legacy v0 site — reference-only.

## "continue" protocol

If the user says "continue" (or anything similar) in a new session:

1. **Read `revamp/STATE.md` first.** It has the live roadmap:
   - What's shipped
   - The prioritized remaining-work list (Active / Planned / Deferred)
   - Key file paths
2. Pick up the **top Active task** and propose it in one sentence before doing substantial work.
3. Build in `revamp/`. Do NOT modify files outside `revamp/` unless explicitly asked.
4. Deploy is automatic — every push to `main` touching `revamp/**` triggers `.github/workflows/deploy-pages.yml`.

## The app

aiUniversity — Alan's self-directed AI-learning playground and eventual resume. Two real users:

- **Alan** — developer path. Frontend-first, building toward full-stack.
- **Lisa** — C-suite executive using Claude as a coworker. Non-dev.

Solo today. Future read-only friend-view so each can see the other's progress.

## Stack (the revamp)

- **Frontend:** Vite + React + TypeScript (no SSR)
- **Data:** Dexie (IndexedDB) behind `revamp/src/db/repo.ts` — swap-ready for hosted DB
- **Motion:** Framer Motion
- **State:** Zustand (light)
- **Routing:** React Router (basename from `import.meta.env.BASE_URL`)
- **Styling:** CSS Modules + CSS custom properties. Single-knob theming via `--accent-base` / `--danger-base` / `--mastery-base` in `revamp/src/styles/tokens.css`
- **Code highlighting:** highlight.js (used in Library notes)
- **Icons:** lucide-react

## Key paths

- `revamp/STATE.md` — **live roadmap (read first)**
- `revamp/PLAN.md` — north star + section list
- `revamp/DECISIONS.md` — architectural decisions, date-tagged
- `revamp/src/styles/tokens.css` — design tokens
- `revamp/src/app/App.tsx` — routes
- `revamp/src/app/AppShell.tsx` — responsive nav
- `revamp/src/db/{types,schema,repo,seed,toolBodies,seedLibraryNotes}.ts` — data layer
- `revamp/src/pages/*` — page components
- `revamp/src/ui/*` — shared UI kit
- `revamp/src/lib/projectStatus.ts` — Linear-style status vocabulary

## Live

- **URL:** https://onerrorgotowtf.github.io/claudeHub/
- **Branch:** `main` (single-branch; merged from `claudeRevampAttempt` on 2026-04-21)
- **Deploy:** `.github/workflows/deploy-pages.yml` — builds `revamp/dist`, uploads as Pages artifact

## Running locally

```bash
cd revamp
npm install   # first time only
npm run dev   # http://localhost:5173
```

For phone testing on the LAN: `npm run dev -- --host`.

## Legacy (repo root, reference-only)

The old vanilla-HTML/CSS/JS site at the repo root is **not deployed** — the `update-feed` workflow still refreshes `data/latest.json` on a 2h cron because future features may want that data, but nothing serves it. Don't modify root files unless explicitly asked.
