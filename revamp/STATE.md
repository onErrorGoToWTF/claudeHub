# Build State — aiUniversity revamp

Running ledger. Rehydrate from this after context compaction.

## Live

- Production deploy at **https://onerrorgotowtf.github.io/claudeHub/**
- Branch: `main` (merged from `claudeRevampAttempt`)
- Pages source: **GitHub Actions** (workflow: `.github/workflows/deploy-pages.yml`)
- Old feed-refresh workflow (`update.yml`) still runs every 2h in parallel; it doesn't touch `revamp/`

## Shipped (most recent on top)

- **Library kind icons** — Wrench / FileText / BookOpen / Film replace the single-letter T/D/R/V badges next to each library row.
- **Collapsible "Everything else"** — dev pathway gets the split but starts collapsed; student/office default expanded. `shouldCollapseRestByDefault` helper + new `ui/Disclosure` component.
- **Pathway sorts, never filters** — the pivot from hard filter to soft sort. All content is always visible; matching content floats to the top under a "For you" band, rest sits below. Dev + All get one merged list (before the collapsible update, above). New helpers: `isPrimaryForPathway`, `splitByPathway`, `audienceBadge`. Inline `AudienceBadge` pill on every track / library row.
- **Pathway selector moved into UserMenu dropdown** — freed topbar density on phones. Radio-style group at the top of the menu; Settings + Retake onboarding below.
- **Topbar reorder** — left cluster is brand + user menu; desktop nav sits middle; right cluster is search + theme toggle.
- **UserMenu dropdown** in the topbar — `@handle` / "Guest" label, opens to pathway radio, Settings link, Retake onboarding. Outside-click / Esc close.
- **Settings page** at `/settings` — full profile edit surface (handle, pathway, work styles, devices, years coding [dev only], known topics, reset). Inline persistence note that settings are local-only until auth lands.
- **Sign-in preview** at `/signin` — design-only shell for the 2FA flow (sign in · sign up · sent · TOTP enroll · TOTP verify · recovery codes · recovery entry). Not linked; preview state picker at the bottom. No real auth.
- **Onboarding flow** at `/onboarding` — first-visit redirect (skippable); 6-or-7-step optional profile setup (welcome → pathway → work styles → devices → [years coding for dev only] → known topics → done). Dismissed flag in userStore persists the "don't re-redirect" decision.
- **Extended user profile** — `UserProfile` with `handle`, `workStyles[]`, `devices[]`, `yearsCoding`, `knownTopicIds[]` in zustand (localStorage-persisted, version 2); matching columns drafted in Supabase schema (`user_profile`). Tag-based vocab for work styles; permissive `text[]` on DB side so new values don't need a migration.
- **Library filter popover + topic mastery breakdown** — collapsed facets + sort into a Filter button with active-filter clear chips; Khan-style "N/M lessons · Q/R quizzes mastered" line under topic mastery bar.
- **Per-project status-change log** — `projectEvents` Dexie table (v4), auto-logged on `repo.putProject` diff; History section on ProjectDetail with from→to chips + relative timestamps.
- **Global search** — Ctrl/Cmd+K modal indexing tracks, topics, lessons, projects, library; results ranked so pathway matches come first, no content hidden. Keyboard nav + Esc close.
- **Cross-surface activity feed** on Dashboard — last 8 events across Learn + Projects + Library.
- **Custom pathway builder** at `/learn/custom` — user picks topics, Kahn topo-sort orders them by prerequisite; topics gained `prereqTopicIds`.
- **Office-pathway project intake** — 4-step workflow-oriented flow (document / meeting / announcement / analysis / cadence) when active pathway is `office`; `ProjectNew` dispatches.
- **Audience tagging (3 pathways)** — `Audience = student | office | dev` on Track/Topic/LibraryItem; library items auto-derive audience at seed time from kind / tags / category.
- **Library search-miss logging + wishlist admin** — `searchMisses` Dexie table (v3), debounced log on empty results, `/library/wishlist` triage page.
- **Electrified progress bars** — thin glowing line grows left-to-right, optional milestone nodes light on pass, IntersectionObserver re-plays on scroll-back, single-motion rule.
- **Learn + Projects section-homepages** — rollup cards above each list with continue / resume CTAs.
- **Dark mode (v1)** — `[data-theme="dark"]` in tokens.css, topbar toggle, no-flash init. Polish pass deferred until light-mode is finalized.
- Vite + React + TS + Dexie + Framer Motion + Zustand + React Router + highlight.js baseline.

## Remaining work (prioritized)

### Active (next up)

- [ ] Extend Learn — more tracks + topics + authored lessons (currently 4 tracks, 9 topics, 1 polished lesson, 1 polished quiz). Authoring is external via Claude Code skills + manual commit to `src/db/seed*`.
- [ ] **Tool-overview courses** — at least one basic overview course per popular workplace tool, focused on *how it integrates with AI*. Applies to dev pathway too — devs routinely under-cover the tools real workers use. Initial scope: Slack, Microsoft Teams, Zoom, GitHub, Miro, Service Cloud, ServiceNow, Zendesk, and the Microsoft ecosystem (Excel, Word, PowerPoint, Outlook, Copilot). Cross-link via shared tags today; `Track.library_item_ids?: ID[]` is the optional future addition if we want explicit relationships. Authored externally.

### Planned (later)

- [ ] **DB migration — Supabase (Postgres + auth + RLS + TOTP MFA)**. ~1 month out. Schema drafted in `revamp/docs/supabase-schema.sql` + visualized in `revamp/docs/supabase-schema.html`. Fresh-start model: no IndexedDB → Supabase import, every user starts clean (users have been warned). Multi-user from day one (~5 people), RLS-isolated; friend-view scaffolding (visibility column + friendships table) is in the schema but deferred. Signup gating via `signup_allowlist` table + BEFORE INSERT trigger on `auth.users`. Decisions locked: handle + citext for public URLs, UUID for new user-minted IDs (legacy `p.xxx` still accepted), RESTRICT cascades on content tables, TOTP MFA with 7-day grace. `/signin` preview UI wires up here.
- [ ] **Predefined pathway templates (specialty packs)**. Pathway (student/office/dev) is coarse — real personalization wants the sub-role. Examples: Office + Marketing vs. Office + Finance each want different Library tools, different Learn recommendations, different project intakes. `user_profile.workStyles[]` already carries the sub-role shape; extend the canonical list (add `marketing`, `finance`, `sales`, `ops`, `hr`, `legal` for Office) and let admins define named **pathway templates** that bundle `(pathway, workStyles, known_topic_ids, recommended library item ids, initial topic picks)`. Onboarding asks "what role / team are you on?" after the coarse pathway pick, then **seeds the first version of "my pathway" (see next item)** — a starting point, not a finished plan. Templates live in the DB (admin-authored) so new specialties don't require a deploy. *Not in conflict with the "persona switcher deferred" item below — those are a runtime flip UI; these are an onboarding seed.*
- [ ] **"My pathway" — persistent, editable user learning plan.** Builds on the existing Custom Pathway Builder (`/learn/custom`), which today is ephemeral. Shape:
  - **Seed.** Onboarding's predefined template (above) stamps the first version — an ordered list of topics the user is planning to take.
  - **Interactive build.** User adjusts the seed immediately: add topics, remove topics, reorder within the prereq constraints. Finalize to save.
  - **Editable forever.** Open "my pathway" later → add things that came up, delete things they no longer want to take, mark as done.
  - **Persistence.** Today (Dexie): new per-user record storing the picked topic set + any ordering overrides. Post-DB: `user_pathways` table, one row per user for v1 (multiple named pathways is a possible extension later).
  - **Surfaces.** Entry point on the Learn section-homepage (replaces/merges with "Build a custom pathway" link); maybe a rollup tile on Dashboard.
  - The *visual tree/line/cluster* representation of the pathway is its own Deferred item below — this Planned item is the data + list-style UI.
- [ ] **Admin role + admin-only surfaces** (post-DB, owner-only). `user_profile.is_admin` (already in the schema draft) gates everything here. Never user-editable via RLS. **YouTube curation is entirely admin-only — public users only ever see videos the admin has explicitly pinned and organized.** Scope:
  - **YouTube curation + in-app authoring queue.** Admin has a browsing / feed surface (see the YouTube API line below) to triage videos. The **pin action opens a required form** prompting for: target (topic / track / tool / library item), tags, and notes. Alternative action: **add to wishlist** to decide later. Only pinned videos land in the public Library; the wishlist + authoring queue stay admin-side. This is the concrete realization of the general "in-app authoring flow" idea — not a separate feature.
  - **Dev debug panel.** Feature flags, fake-user switches, DB dump, reset buttons.
  - **Live theme tweaker.** Color picker that updates `--accent-base` / `--danger-base` / `--mastery-base` in the running app so design iteration doesn't require a deploy.
- [ ] **YouTube API integration** — powers the admin-only browse / feed surface. Admin can search YouTube and see recent uploads from tracked channels without leaving the app, then trigger the pin-form or wishlist flow above. Needs interactive Google OAuth. Deferred until the manual video-ID-paste path in the admin pipeline is live and we feel the friction. Never exposed to non-admin users.
- [ ] **User personalization controls** (not content authoring — just tweaks to how the user sees the app). In scope: per-item notes, reorder / hide-from-view elements on a page, user-owned pathways (custom pathways are already shipped), bookmarks. Admin-authored content remains the canonical source; these are overlays on top of it, stored per user. Touch later.
- [ ] Project bootstrapper — scaffold files + run init commands from a project's stack pick.
- [ ] Resume / public project-detail pages (the "site IS the resume" north star).

### Deferred (explicitly parked)

- Read-only friend-view — user explicitly deprioritized. Schema scaffolding is already in place (`visibility` column on `user_projects`, `friendships` table) but no UI or cross-user RLS until the user opts back in.
- **Visual pathway map — tree / line / cluster diagram of "my pathway."** The aspirational visual for the item above: an abstract chart that arranges the user's plan spatially (topics clustered by concept, a timeline/line, or a tree with branches) rather than as a vertical list. Fights the Linear-minimal aesthetic and is a large build; parked as a future want. (Previously tracked here as "electrified-circuit skill-map viz.")
- Inventory dedicated page — schema ready, UI deferred.
- Persona switcher — out of scope per user decision. A runtime picker to flip between "personas" is different from onboarding pathway templates (still Planned above); this line refers only to the former.
- Claude API integration — **separate future project**, not a step in this build. Never propose as next-up.
- User-authored content (lessons, quizzes, etc.) — depends on the separate Claude API project to handle the complex authoring assistance. Even once it lands, every user-authored piece goes through admin review before it's published. Out of scope for this build; captured so the path is known.

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
- `src/app/App.tsx` — routes; first-run onboarding redirect; out-of-shell renders for `/onboarding` and `/signin`
- `src/app/AppShell.tsx` — topbar (brand + UserMenu | nav | search + ThemeToggle), bottom nav (mobile), Cmd/Ctrl+K shortcut
- `src/db/{types,schema,repo,seed,toolBodies,seedLibraryNotes}.ts` — data layer
- `src/pages/*` — Dashboard, Learn, CustomPathway, TopicDetail, LessonView, QuizView, Projects, ProjectNew (dispatcher) + ProjectNewOffice, ProjectDetail, Library, LibraryDetail, LibraryWishlist, Onboarding, Settings, SignIn
- `src/ui/*` — PageHeader, Button, Chip, ProgressBar (electrified), Tile, List, Row, Markdown, grid (class-name consts), ThemeToggle, GlobalSearch, UserMenu, AudienceBadge, Disclosure
- `src/lib/projectRoutes.ts` — Easiest / Cheapest / Best logic
- `src/lib/projectStatus.ts` — Linear-style status vocabulary + legacy-value migration
- `src/lib/audience.ts` — pathway types (`UserPathway`, `Audience`) + `matchesPathway` (intake-only hard filter) + `isPrimaryForPathway` + `splitByPathway` + `shouldCollapseRestByDefault` + `audienceBadge` + `deriveLibraryAudience` + `AUDIENCE_LABEL`
- `src/lib/pathwayOrder.ts` — Kahn topo-sort for custom-pathway builder
- `src/lib/activity.ts` — unified event stream + `whenShort` relative-time helper
- `src/lib/useInViewReplay.ts` — IntersectionObserver hook for re-triggering animations
- `src/state/userStore.ts` — zustand (with persist, v2): full `UserProfile` — handle, pathway, workStyles[], devices[], yearsCoding, knownTopicIds[], onboardingSeen; actions for each
- `docs/supabase-schema.sql` — Postgres schema draft for the planned DB migration (includes `user_profile.is_admin`, `signup_allowlist`, `friendships` scaffold)
- `docs/supabase-schema.html` — schema visualization (Mermaid ER + table cards)
