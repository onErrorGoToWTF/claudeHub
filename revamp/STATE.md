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
- [x] **Dark mode (v1)** — shipped. `[data-theme="dark"]` in tokens.css, topbar toggle, no-flash init, warm-dark palette. Polish pass deferred until light-mode design is finalized.
- [x] **Learn page section-homepage** — shipped. Overall mastery rollup + continue CTA above tracks list.
- [x] **Projects page section-homepage** — shipped. Status counts (in progress / active / completed) + resume CTA above projects list.
- [x] **Electrified progress bars** — shipped. `ui/ProgressBar` rewritten: 2px dim baseline + accent-glow line that grows left-to-right; optional `milestones` prop renders lit-on-pass circular nodes with staggered lighting delay matched to line progress; `useInViewReplay` hook (IntersectionObserver) bumps a key on each re-entry so the animation replays; no shimmer/drift (single-motion rule); reduced-motion jumps to static end state.
- [ ] Extend Learn — more tracks + topics + authored lessons (currently 4 tracks, 9 topics, 1 polished lesson, 1 polished quiz)
- [ ] Content tagging for audience — `audience: 'dev' | 'beginner' | 'both'` on Learn tracks, Library items, topics; default filter per surface
- [x] **Projects intake variant for the Office pathway** — shipped. New `ProjectNewOffice` component: 4-step flow (title → summary → workflow type → tools). Workflow types (document, meeting prep, announcement, analysis, cadence) each seed their own workflow-oriented checklist. Tools step filters the inventory to office-audience items (Claude.ai, chat, image/video/voice, automation). `ProjectNew` is now a thin dispatcher on the active pathway — dev/student/all still get the original build-oriented 5-step stack/routes flow.
- [x] **Pin affordance in Library list** — already in place; each Row has a Pin/PinOff toggle in its right slot (stale STATE entry cleared).

### Planned (later)
- [x] **Custom pathway builder** — shipped at `/learn/custom`. User multi-selects topics grouped by track; `orderByPrereqs` (Kahn's topo-sort, track-clustered tie-breaker) returns a prerequisite-respecting ordered list rendered as a numbered sequence linking to each topic. Topics gained an optional `prereqTopicIds` field; seed populates sensible defaults + a backfill migration runs for existing installs. A small "Build a custom pathway" link sits under the Continue CTA on the Learn section-homepage.

- [x] **Audience tagging (pathways)** — shipped. `Audience = 'student' | 'office' | 'dev'` on Track/Topic/LibraryItem; PathwayPicker in topbar (zustand + localStorage); Learn + Library filter by pathway; library items auto-derive audience at seed time from kind/category/tags.
- [x] **Library search-miss logging** — shipped. `searchMisses` Dexie table (v3 migration); 900ms-debounced `repo.logSearchMiss(query)` fires when query has zero matches; inline "‘{query}’ isn't in the library yet — noted. It'll be added shortly." replaces the generic Empty state. Per-session dedupe so backspacing doesn't inflate counts.
- [x] **Search-miss admin surface** — shipped at `/library/wishlist`. Lists `searchMisses` sorted by open-state → count → recency, with per-row resolve/unresolve toggle and "show resolved" checkbox. A small "{N} wishlist entries to triage" link appears at the foot of the Library page when any miss is open.
- [ ] Read-only friend-view — Alan ↔ Lisa progress visibility; requires export/import snapshot or a shared backend tier
- [ ] Authoring flow — create lessons / quizzes / library notes in-app (today: all seeded in code; authoring is done externally via Claude Code skills + manual upload to the repo)
- [ ] Project bootstrapper — scaffold files + run init commands from a project's stack pick
- [ ] Resume / public project-detail pages (the "site IS the resume" north star)
- [ ] Claude API integration (after DB migration)
- [ ] DB migration off IndexedDB — swap target behind `src/db/repo.ts` interface
- [ ] YouTube API integration (needs interactive Google login — deferred)
- [x] **Activity feed on Dashboard** — shipped. `src/lib/activity.ts` merges Progress (lesson completions + quiz scores), Projects (created / updated), and LibraryItems (pinned / added) into a unified time-sorted stream. Dashboard renders last 8 events below the three existing panels, with a kind-specific icon, primary title, sub-line, and a short relative timestamp (`12m`, `3h`, `2d`). Each row links through to the relevant surface.
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
