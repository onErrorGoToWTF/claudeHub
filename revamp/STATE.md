# Build State — aiUniversity revamp

Running ledger. Rehydrate from this after context compaction.

## Live

- Production deploy at **https://onerrorgotowtf.github.io/claudeHub/**
- Branch: `main` (merged from `claudeRevampAttempt`)
- Pages source: **GitHub Actions** (workflow: `.github/workflows/deploy-pages.yml`)
- Old feed-refresh workflow (`update.yml`) still runs every 2h in parallel; it doesn't touch `revamp/`

## Shipped

- Vite + React + TS + Dexie + Framer Motion + Zustand + React Router + highlight.js
- Design tokens (`src/styles/tokens.css`) — single `--accent-base` (ocean blue) cascades via `color-mix` in OKLCH
- App shell: desktop top nav + mobile floating bottom nav, accent-surface active state
- Responsive Dashboard with three parallel panels (Learn / Projects / Library)
- Learn: Khan-style tracks → topics with per-topic mastery bars
- Lesson view: markdown (headings, bullets, inline code, links, citations, fenced code blocks with copy + syntax highlighting)
- Quiz engine: select → Submit → feedback flow, accent-tinted picked state, green-check / red-X on outcome, auto mastery recompute
- Projects: Linear-style status vocabulary (Backlog / Planned / In progress / Completed / Canceled) + orthogonal Health pill (On track / At risk / Off track), user-set, no auto-flip
- Project intake: 5-step guided flow (title → summary → stack → route → gap topics)
- Library: search + kind filter (Tool / Doc / Read / Video) + sort, filtered to items with in-app body
- Library detail: markdown body with hover-tooltip citations + Sources section
- ~51 tool bodies, ~11 reference docs, 2 reads — all in the locked format

## Remaining work (prioritized)

### Active (next up)
- [ ] Extend Learn — more tracks + topics + authored lessons (currently 4 tracks, 9 topics, 1 polished lesson, 1 polished quiz)
- [ ] Content tagging for audience — `audience: 'dev' | 'beginner' | 'both'` on Learn tracks, Library items, topics; default filter per surface
- [ ] Projects intake variant for Lisa — workflow-oriented flow (coordination / doc / comms focus) vs. the current build-oriented one
- [ ] Pin affordance in Library list (currently Detail only)

### Planned (later)
- [ ] Read-only friend-view — Alan ↔ Lisa progress visibility; requires export/import snapshot or a shared backend tier
- [ ] Authoring flow — create lessons / quizzes / library notes in-app (today: all seeded in code)
- [ ] Project bootstrapper — scaffold files + run init commands from a project's stack pick
- [ ] Resume / public project-detail pages (the "site IS the resume" north star)
- [ ] Claude API integration (after DB migration)
- [ ] DB migration off IndexedDB — swap target behind `src/db/repo.ts` interface
- [ ] YouTube API integration (needs interactive Google login — deferred)
- [ ] Activity feed on Dashboard — Linear-style collapsed property changes + human updates
- [ ] Status-change log per project (audit history)
- [ ] Search across the whole app (currently Library-only)

### Deferred (explicitly parked)
- Electrified-circuit skill-map viz — fights the Linear-minimal aesthetic at v1
- Inventory dedicated page — schema ready, UI deferred
- Persona switcher — out of scope per user decision; tag-based filtering instead

## How to preview locally

```bash
cd revamp
npm run dev
```
Opens http://localhost:5173

For phone testing on the LAN:
```bash
npm run dev -- --host
```
and open `http://<your-lan-ip>:5173/`.

## Deploy

Every push to `main` touching `revamp/**` auto-deploys via GitHub Actions.

## Key file paths

- `src/styles/tokens.css` — design tokens (single source)
- `src/app/App.tsx` — routes
- `src/app/AppShell.tsx` — responsive nav
- `src/db/{types,schema,repo,seed,toolBodies,seedLibraryNotes}.ts` — data layer
- `src/pages/*` — Dashboard, Learn, TopicDetail, LessonView, QuizView, Projects, ProjectNew, ProjectDetail, Library, LibraryDetail
- `src/ui/*` — shared UI kit (PageHeader, Button, Chip, ProgressBar, Tile, List, Row, Markdown)
- `src/lib/projectRoutes.ts` — Easiest / Cheapest / Best logic
- `src/lib/projectStatus.ts` — Linear-style status vocabulary + legacy-value migration
