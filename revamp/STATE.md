# Build State — aiUniversity revamp

Running ledger. Rehydrate from this after context compaction.

## Live

- Production deploy at **https://onerrorgotowtf.github.io/claudeHub/**
- Branch: `main` (merged from `claudeRevampAttempt`)
- Pages source: **GitHub Actions** (workflow: `.github/workflows/deploy-pages.yml`)
- Old feed-refresh workflow (`update.yml`) still runs every 2h in parallel; it doesn't touch `revamp/`

## Shipped (most recent on top)

- **Per-project status-change log** — `projectEvents` Dexie table (v4), auto-logged on `repo.putProject` diff; History section on ProjectDetail with from→to chips + relative timestamps.
- **Global search** — Ctrl/Cmd+K modal indexing tracks, topics, lessons, projects, library (pathway-filtered); keyboard nav + Esc close.
- **Cross-surface activity feed** on Dashboard — last 8 events across Learn + Projects + Library.
- **Custom pathway builder** at `/learn/custom` — user picks topics, Kahn topo-sort orders them by prerequisite; topics gained `prereqTopicIds`.
- **Office-pathway project intake** — 4-step workflow-oriented flow (document / meeting / announcement / analysis / cadence) when active pathway is `office`; `ProjectNew` dispatches.
- **Audience tagging (3 pathways)** — `Audience = student | office | dev` on Track/Topic/LibraryItem; PathwayPicker in topbar; Learn + Library filter live.
- **Library search-miss logging + wishlist admin** — `searchMisses` Dexie table (v3), debounced log on empty results, `/library/wishlist` triage page.
- **Electrified progress bars** — thin glowing line grows left-to-right, optional milestone nodes light on pass, IntersectionObserver re-plays on scroll-back, single-motion rule.
- **Learn + Projects section-homepages** — rollup cards above each list with continue / resume CTAs.
- **Dark mode (v1)** — `[data-theme="dark"]` in tokens.css, topbar toggle, no-flash init. Polish pass deferred until light-mode is finalized.
- Vite + React + TS + Dexie + Framer Motion + Zustand + React Router + highlight.js baseline.

## Remaining work (prioritized)

### Active (next up)
- [ ] Extend Learn — more tracks + topics + authored lessons (currently 4 tracks, 9 topics, 1 polished lesson, 1 polished quiz). Authoring is external via Claude Code skills + manual commit to `src/db/seed*`.

### Planned (later)
- [ ] **DB migration — Supabase (Postgres + auth + RLS + TOTP MFA)**. ~1 month out. Schema drafted in `revamp/docs/supabase-schema.sql` + visualized in `revamp/docs/supabase-schema.html`. Fresh-start model: no IndexedDB → Supabase import, every user starts clean (users have been warned). Multi-user from day one (~5 people), RLS-isolated; friend-view scaffolding (visibility column + friendships table) is in the schema but deferred. Decisions locked: handle + citext for public URLs, UUID for new user-minted IDs (legacy `p.xxx` still accepted), RESTRICT cascades on content tables, TOTP MFA with 7-day grace.
- [ ] Authoring flow in-app — create lessons / quizzes / library notes (today authored externally). Likely post-DB.
- [ ] Project bootstrapper — scaffold files + run init commands from a project's stack pick.
- [ ] Resume / public project-detail pages (the "site IS the resume" north star).
- [ ] YouTube API integration (needs interactive Google login — deferred).

### Deferred (explicitly parked)
- Read-only friend-view — user explicitly deprioritized. Schema scaffolding is already in place (visibility column on `user_projects`, `friendships` table) but no UI or cross-user RLS until user opts back in.
- Electrified-circuit skill-map viz — fights the Linear-minimal aesthetic at v1.
- Inventory dedicated page — schema ready, UI deferred.
- Persona switcher — out of scope per user decision; tag-based filtering instead.
- Claude API integration — **separate future project**, not a step in this build. Never propose as next-up.

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

- `src/styles/tokens.css` — design tokens (single source, light + `[data-theme="dark"]`)
- `src/app/App.tsx` — routes
- `src/app/AppShell.tsx` — responsive nav + PathwayPicker + ThemeToggle + global-search trigger
- `src/db/{types,schema,repo,seed,toolBodies,seedLibraryNotes}.ts` — data layer
- `src/pages/*` — Dashboard, Learn, CustomPathway, TopicDetail, LessonView, QuizView, Projects, ProjectNew (+ ProjectNewOffice), ProjectDetail, Library, LibraryDetail, LibraryWishlist
- `src/ui/*` — PageHeader, Button, Chip, ProgressBar (electrified), Tile, List, Row, Markdown, ThemeToggle, PathwayPicker, GlobalSearch
- `src/lib/projectRoutes.ts` — Easiest / Cheapest / Best logic
- `src/lib/projectStatus.ts` — Linear-style status vocabulary + legacy-value migration
- `src/lib/audience.ts` — pathway types + `matchesPathway` + `deriveLibraryAudience`
- `src/lib/pathwayOrder.ts` — Kahn topo-sort for custom-pathway builder
- `src/lib/activity.ts` — unified event stream + `whenShort` relative-time helper
- `src/lib/useInViewReplay.ts` — IntersectionObserver hook for re-triggering animations
- `src/state/userStore.ts` — zustand + localStorage (pathway preference)
- `docs/supabase-schema.sql` — Postgres schema draft for the planned DB migration
- `docs/supabase-schema.html` — schema visualization (Mermaid ER + table cards)
