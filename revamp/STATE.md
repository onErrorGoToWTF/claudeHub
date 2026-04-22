# Build State — aiUniversity revamp

Running ledger. Rehydrate from this after context compaction.

## Live

- Production deploy at **https://onerrorgotowtf.github.io/claudeHub/**
- Branch: `main` (merged from `claudeRevampAttempt`)
- Pages source: **GitHub Actions** (workflow: `.github/workflows/deploy-pages.yml`)
- Old feed-refresh workflow (`update.yml`) still runs every 2h in parallel; it doesn't touch `revamp/`

## Shipped (most recent on top)

- **Pathway coverage closure — 14 new topics + template revisions (Chunk G, 2026-04-22)** — Closed every gap the pathway-coverage research flagged. Three new tracks: `literacy` (order 0, audience all), `office-ai` (order 6, audience office), `generative-media` (order 7, audience media). **14 new topics with full lessons + quizzes** (~85 quiz questions total): `t.ai-literacy` (hallucinations, trust calibration), `t.ai-literacy-at-work` (sign-your-name rule, what never to paste, Mata v. Avianca), `t.ai-for-students` (integrity lines, study moves that work), `t.models-compared` (Claude/ChatGPT/Gemini tier landscape), `t.tool-use` (authored lesson for an existing title-only topic), `t.agents-intro` (plan/act/observe loop, compounding errors), `t.prompt-caching` (prefix rule, 5-min TTL, classic cache-miss bugs), `t.claude-for-office` (Projects + custom-instructions coworker mindset), `t.docs-with-ai` (five doc-work shapes), `t.meetings-with-ai` (before/during/after phases), `t.generative-media-101` (rights + consent + disclosure), `t.image-generation` (Midjourney/Nano Banana/Ideogram/Flux), `t.video-generation` (Veo/Sora/Runway; shot prompting; stitching), `t.voice-and-audio` (ElevenLabs/Cartesia/Suno; consent). **Templates revised:** student + office now lead with literacy (not mechanics); dev adds `t.prompt-caching` and fixes the `t.streaming-ui → t.streaming` slug mismatch by demoting streaming to catalog; media leads with the 101 orientation topic; vibe unchanged. Every template slot now references a fully-authored topic — no more silent drops at stamp time. Research decision: **no 6th pathway** (data-analyst + everyday-AI cases covered via catalog sub-topics inside dev and office respectively; revisit on usage signal).
- **Content expansion — 5 new topics for the vibe pathway (Chunk F, 2026-04-22)** — New `vibe-coding` track (audience `['vibe']`, order 5). Five new topics + lessons + quizzes now exist so the revised vibe template references real content: `t.prompt-basics` (cross-pathway, lives in prompt-eng track, order 0), `t.vibe-what-and-why`, `t.vibe-tools-compared` (Cursor / Claude Code / v0 / Lovable / Replit / Supabase), `t.claude-code-basics`, `t.vibe-iteration-loop` (prereq chain links all four inside the track). Lesson bodies follow the seedLibraryNotes format (TL;DR → `##` sections → `>` inline citations with `— Source`), 7–10 minutes each. Quizzes exercise the new question kinds: `q.prompt-basics` has ordered-steps + short-answer; `q.vibe-what` has ordered-steps + short-answer; `q.claude-code` has TWO code-typing questions for the `/init` and `/clear` slash commands; `q.vibe-loop` has ordered-steps + short-answer. Total new: 1 track, 5 topics, 5 lessons, 5 quizzes (33 questions across them). **`seedIfEmpty` gained an insert-if-missing pass** for tracks/topics/lessons/quizzes on existing installs so users with pre-seeded DBs see the new content without needing to wipe storage. Chunk F content is now authored — Chunks D templates reference real topic IDs; no more silent-drop behavior in `seedPathwayFromTemplate`.
- **Vibe + Media project intakes, with YouTube creator flow (Chunk E, 2026-04-22)** — `ProjectNew.tsx` now dispatches to four pathway-specific intakes: office (existing), vibe (new), media (new), and the build-oriented default for dev/student/all. `ProjectNewVibe.tsx` = 4 steps (Title → One-sentence vision → Stack sketch with chip suggestions for Cursor / Claude Code / v0 / Lovable / Replit / Supabase + free-text textarea → Gap topics picker, sorted vibe-first). `ProjectNewMedia.tsx` = 4 steps (Title → Concept → Output kind → Tools). Kinds: **youtube (new, first in list), image, video (now "short video"), voice, audio, multi**. YouTube gets a creator-shaped checklist (hook/thesis → outline → record a/b-roll → edit to pace → thumbnail+title+desc+chapters → upload+schedule). Media tool chips include YouTube-creator picks (CapCut, DaVinci, Descript) surfaced as "manual" when not yet in inventory. New optional `Project.mediaKind` + `Project.stackNotes` (preserved free-text stack sketch). `ProjectNew.module.css` gained `.chipRow` + `.pickChip` + `.pickChipOn` + `.chipMuted` styles used by both new intakes. Office + build/dev flows untouched.
- **"My pathway" + vibe research pass (Chunk C + research, 2026-04-22)** — New Dexie table `userPathwayItems` (schema v5) with rows `{id: 'upi.<topicId>', topicId, status: 'active'|'archived', position, addedAt, source: 'seed'|'manual'|'project'}`. Repo methods: `listPathwayItems`, `hasAnyPathwayItems`, `addPathwayItem`, `archivePathwayItem`, `unarchivePathwayItem`, `deletePathwayItem`, `reorderPathwayItems`, `seedPathwayFromTemplate`, `resetPathway` + private `compactActivePositions` + `mergeProjectGapsIntoPathway` called from `repo.putProject` (non-blocking; failure logs and continues). Stamping respects history — `seedPathwayFromTemplate` no-ops if any rows exist. `pathway: 'all'` skips stamping. New `/learn/pathway` page (`src/pages/MyPathway.tsx`): up/down reorder, archive/restore, add-topic modal with prereq gating, reset-to-default button, empty state with "Use the X default / Build from scratch" CTAs. Learn homepage shows a top-3 "My pathway" panel replacing the old "Build a custom pathway" link position (the custom-pathway link remains below). Dashboard's "Next up" prefers the first non-mastered active pathway topic, falling back to the legacy catalog scan. Onboarding `finish()` and Settings pathway-switch both call `seedPathwayFromTemplate`. `pathwayTemplates.ts` holds the five starter templates; **vibe template revised per research** → `t.vibe-what-and-why → t.prompt-basics → t.vibe-tools-compared → t.claude-code-basics → t.vibe-iteration-loop` (these topics don't yet exist; Chunk F authors them, template tolerates missing IDs at stamp time). **Audience bug fix:** `deriveLibraryAudience` now routes `cli + agent` (and any `agent`-tagged tool) to `['vibe', 'dev']` instead of dev-only, surfacing Claude Code to the vibe pathway it was built for. Research output at `revamp/docs/research-vibe-pathway.md` (10 vibe-content gaps, 5-slot template justification, reuse-vs-author mapping per slot). STATE: Chunk D's "Reset pathway" button is already in MyPathway — Settings duplicate deferred.
- **Three new quiz question types (Chunk B, 2026-04-22)** — `QuizQuestion` is now a discriminated union on `kind`: `'mcq'` (default, legacy rows tolerated), `'ordered-steps'` (drag/reorder, exact-match scoring), `'code-typing'` (fill-in-the-blank with `{{blank}}` marker, whitespace-collapsed string match, optional `caseInsensitive`), `'short-answer'` (free text; `expected` for case-insensitive equality OR `pattern` for regex with flag `i`; `pattern` wins). New `src/lib/quizGrading.ts` centralizes `gradeQuestion` + `isAnswerable` + `questionKind`. `QuizView.tsx` rewritten around a `QuestionBody` dispatcher — pick/advance/end-only-feedback flow preserved, keyboard 1–9 still picks MCQ, Enter advances when answerable and input focus is not on a typable field. Ordered-steps rows are keyboard-reorderable (Up/Down on the focused step, plus explicit up/down buttons). Seeded examples: `q.tokens.5` ordered-steps (prompt → token pipeline), `q.tokens.6` code-typing (`max_tokens` JSON blank), `q.tokens.7` short-answer (regex `^tokens?$`). Existing four MCQ rows migrated to explicit `kind: 'mcq'`. Grading is scored in-UI and passed as a fraction to `repo.recordQuiz` (contract unchanged).
- **5-pathway expansion + audit cleanup (Chunk A, 2026-04-22)** — `Audience` is now `student | office | media | vibe | dev`, ordered by ascending code involvement. Labels: Student / Office / Media creator / Vibe coder / Developer. `deriveLibraryAudience` reclassified: IDE/framework → `vibe+dev`; image/video/voice/audio → `media+office`; automation → `office+vibe`; deep-eng tags (cli/sdk/orm/ssr/react/routing/language/state/build/devops/container/vcs) stay `dev`-only; chat/model/foundations → everyone. Onboarding + Settings work-style pathway tags updated (`no_code` → office+media; `vibe_code` → vibe). Seed track audiences extended. `PATHWAY_BLURBS` gained vibe + media entries. **Scenario-audit items closed:** #3 quiz-pass flash now reads dynamic bucket name (`Completed` or `Mastered`) via `MASTERY_LABEL[masteryStatus(score)]`; #4 lesson + topic done-chip unified to "Completed" (project-status "Done" left alone — Linear vocab); #5 enum verified already aligned post-grading-overhaul; #11 friendly "not found" fallbacks on LessonView + QuizView when `repo.getLesson`/`repo.getQuiz` return null (previously blank page).
- **Grading overhaul + quiz flow refinements** — 4 status buckets (Not started / In progress / Completed / Mastered); PASS_THRESHOLD=0.50, MASTERY_THRESHOLD=0.90, with 0.80 reserved as the "true understanding" bar for the future report card. Letter-grade (F/D/C/B/A/A+) and accolade-tier helpers in `src/lib/mastery.ts`. Retake now overwrites prior score (latest-attempt-wins, Khan-style). Quiz flow removed mid-question feedback — pick, advance, see result only at end. Zero-question quiz shows a friendly "unavailable" message instead of a blank page. Retake affordance surfaces as a chip on TopicDetail (not on the result screen — extra step by design).
- **Project intake ends with Save as plan / Start now** — dev + office intakes let the user pick initial status. Status stays user-controlled, no auto-promote; editable any direction.
- **Status colors + demo projects** — Backlog grey, Planned dim blue (mixed with white so warm canvas doesn't green-shift it), In progress accent, Completed green, Canceled red. Seed backfills 5 demo projects (one per status). Chip `muted` variant added.
- **Dashboard minimal** — Library panel dropped (Activity feed + nav cover it); Activity feed dropped (too busy); Dashboard eyebrow/title dropped; just the two panels (Learn, Projects) with condensed one-line recent rows. Empty states keep the panel shape (reserved 66px). Learn recents dedupe by topic (lesson + quiz touches on the same topic collapse to one row linking to topic detail).
- **Theme toggle moved to Settings → Appearance** — topbar reduced to brand + nav + search + account menu; account anchors top-right per convention.
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

### Active (next up) — AUTONOMOUS RUN PLAN (spec'd 2026-04-22)

**Cold-start read-order for next session:** (1) this section, (2) `src/lib/audience.ts`, (3) `src/lib/mastery.ts`, (4) `src/db/types.ts`, (5) `src/db/seed.ts` (first 50 lines) to see track shape, (6) `src/pages/TopicDetail.tsx` + `src/pages/QuizView.tsx` to see the lesson/quiz contract. Then execute chunks B→F in order, committing + pushing each chunk as its own milestone. **Do NOT ask clarifying questions — every decision below is locked.**

**Ship cadence per chunk:** commit (conventional-commits style `feat(scope): …` / `fix(scope): …`) → `git pull --rebase && git push`. Revamp has no `data/version.json` (Vite handles hashing via dist/). Auto-deploy triggers on push to `main` touching `revamp/**`. Between chunks: stop and wait for phone-review approval OR for the user to say "continue" / "next chunk" / "save + clear". **Never skip hooks. Never amend. Never force-push.**

**Locked decisions from the planning session:**
- **5 pathways, ordered by ascending code involvement:** student → office → media → vibe → dev (Chunk A shipped this).
- **Project gap topics auto-merge into the user's main pathway** when a project is created/saved (option `a` — unified plan, dedup if already present).
- **Vibe/media get dedicated project intakes** (Chunk E). Until shipped, they fall through to the build flow.
- **Content depth:** "solid first-pass to full polish depending on topic weight." Target ~5 new topics *total* across tracks, with full lessons + full quizzes. Short where appropriate, deep where warranted. Quizzes usually 5–10 questions; heavy topics can go higher.
- **3 new quiz question types (Chunk B):** ordered-steps (drag-to-order), code-typing (fill-in-the-blank, string-match with whitespace tolerance), short-answer (free text, case-insensitive substring or regex match per question). All in addition to the existing multiple-choice. Each new question type gets ≥1 seeded example in an existing quiz so the UI is exercised.
- **Autonomous execution style:** no pausing on individual edits; batch related edits into single commits; use milestone-chunk pauses only between chunks A–F. No asking the user to pick between options mid-chunk — the spec below is authoritative.

---

#### Chunk C — "My pathway" (data layer + Learn entry + edit UI + auto-merge)

**Data model:** new Dexie table `userPathwayItems` (bump schema version in `src/db/schema.ts`). Row shape:
```
{ id: string, topicId: string, status: 'active' | 'archived',
  position: number, addedAt: number, source: 'seed' | 'manual' | 'project' }
```
Index on `status`, `position`. All CRUD via `src/db/repo.ts` (`listPathwayItems`, `addPathwayItem`, `archivePathwayItem`, `reorderPathwayItems`, `unarchivePathwayItem`, `deletePathwayItem` — soft by default).

**Seeding:** when the user reaches the onboarding `done` step OR picks a pathway in Settings and has zero `userPathwayItems`, stamp a default plan from Chunk D's templates. *Don't* stamp if the user already has items (even archived ones) — respect their history.

**Main pathway page:** `/learn/pathway` (new route). List-style, not the visual-tree deferred feature. Each row:
- Topic title + track name + minutes
- Status chip (mastery bucket from `masteryStatus` of the topic's last quiz score)
- Drag-handle for reorder (keyboard-accessible)
- "Archive" button (soft-delete; goes behind disclosure at bottom)
- Click navigates to TopicDetail

Above list: "Add topic" button → small modal with searchable topic list (respects prereq checks — can't add a topic whose prereqs aren't in the pathway as `active`). "Show archived (N)" disclosure at bottom. Empty state: "No pathway yet — build one" button linking to the existing `/learn/custom` flow.

**Learn section-homepage entry:** replace or merge the current "Build a custom pathway" link with a "My pathway" panel showing top 3 active items + a "See full pathway" link. When pathway is empty, show onboarding-seeded CTA.

**Project gap auto-merge:** on `repo.putProject`, diff `gapTopicIds` vs. existing active pathway items. For each new gap topic not already `active`, insert a row with `source: 'project'` at the end of active items (dedup). If the topic exists as `archived`, un-archive it. Don't block project save on errors — log + continue.

**Dashboard:** small "Up next on my pathway" rollup (top 1–2 items) joins the existing two panels (Learn + Projects). Stay minimal — no new eyebrow.

---

#### Chunk D — default pathway templates (one per pathway)

**Shape:** `src/lib/pathwayTemplates.ts` exports `PATHWAY_TEMPLATES: Record<UserPathway, { topicIds: string[]; order: number[] }>`. The seed function (Chunk C) reads this to stamp a user's starting plan when their pathway is picked.

**Template picks (locked):**
- **student** — t.tokens, t.transformers, t.prompt-basics, t.prompt-patterns, t.models-compared (foundations-heavy, adds a model-comparison topic that may need authoring in Chunk F)
- **office** — t.prompt-basics, t.prompt-patterns, t.claude-for-office (new topic for Chunk F), t.docs-with-ai (new), t.meetings-with-ai (new)
- **media** — t.prompt-basics, t.image-generation (new), t.video-generation (new), t.voice-cloning-ethics (new), t.media-workflow (new)
- **vibe** — t.prompt-basics, t.prompt-patterns, t.agents-intro (new or pull from agents track), t.claude-code-basics (new), t.vibe-workflow (new)
- **dev** — t.tokens, t.prompt-patterns, t.tool-use, t.agents-intro, t.streaming-ui (existing track content; confirm IDs during execution)

If a template topic doesn't exist yet in `seed.ts`, Chunk F should create it during the content expansion. If Chunk F runs after Chunk D, the template seed can tolerate missing IDs (filter to existing topics at stamp time); or Chunk D can be deferred to run *after* Chunk F. **Recommend running Chunk F before Chunk D so templates reference real topics.** If re-ordering feels cleaner, do: B → C (with template-seeding stubbed to no-op) → F → D.

**Settings:** "Reset pathway" button — wipes `userPathwayItems` and re-stamps the template for the current pathway. Two-tap confirm.

---

#### Post-F housekeeping

- Update this STATE.md — move completed chunks to Shipped, drop the Active spec, add any regressions surfaced during phone review to the top of Active.
- Touch `docs/supabase-schema.sql` only if the new tables (`userPathwayItems`) should also land in the post-migration schema draft. Low priority; can defer.
- No DB migration work of any kind in this run. **Explicitly out of scope.**

---

- [ ] Extend Learn — more tracks + topics + authored lessons. Subsumed by Chunk F above for the first wave; the broader "extend Learn" item remains for future waves.
- [ ] **Tool-overview courses** — full roster (Slack, Teams, Zoom, GitHub, Miro, Service Cloud, ServiceNow, Zendesk, MS Office suite). This run does one as a smoke test (see Chunk F). Remaining courses stay here as deferred-in-active.

### Planned (later)

- [ ] **DB migration — Supabase (Postgres + auth + RLS + TOTP MFA)**. ~1 month out. Schema drafted in `revamp/docs/supabase-schema.sql` + visualized in `revamp/docs/supabase-schema.html`. Fresh-start model: no IndexedDB → Supabase import, every user starts clean (users have been warned). Multi-user from day one (~5 people), RLS-isolated; friend-view scaffolding (visibility column + friendships table) is in the schema but deferred. Signup gating via `signup_allowlist` table + BEFORE INSERT trigger on `auth.users`. Decisions locked: handle + citext for public URLs, UUID for new user-minted IDs (legacy `p.xxx` still accepted), RESTRICT cascades on content tables, TOTP MFA with 7-day grace. `/signin` preview UI wires up here.
- [ ] *(First wave being handled inside the Active autonomous run — Chunk D.)* **Predefined pathway templates (specialty packs)**. Pathway (student/office/dev) is coarse — real personalization wants the sub-role. Examples: Office + Marketing vs. Office + Finance each want different Library tools, different Learn recommendations, different project intakes. `user_profile.workStyles[]` already carries the sub-role shape; extend the canonical list (add `marketing`, `finance`, `sales`, `ops`, `hr`, `legal` for Office) and let admins define named **pathway templates** that bundle `(pathway, workStyles, known_topic_ids, recommended library item ids, initial topic picks)`. Onboarding asks "what role / team are you on?" after the coarse pathway pick, then **seeds the first version of "my pathway" (see next item)** — a starting point, not a finished plan. Templates live in the DB (admin-authored) so new specialties don't require a deploy. *Not in conflict with the "persona switcher deferred" item below — those are a runtime flip UI; these are an onboarding seed.*
- [ ] *(First wave being handled inside the Active autonomous run — Chunk C.)* **"My pathway" — persistent, editable user learning plan.** Builds on the existing Custom Pathway Builder (`/learn/custom`), which today is ephemeral. Shape:
  - **Seed.** Onboarding's predefined template (above) stamps the first version — an ordered list of topics the user is planning to take.
  - **Interactive build.** User adjusts the seed immediately: add topics, remove topics, reorder within the prereq constraints. Finalize to save.
  - **Editable forever.** Open "my pathway" later → add things that came up, remove things they no longer want to take, mark as done.
  - **Soft-delete, never destructive.** Removing a topic from "my pathway" is a hide / archive action — never a hard delete. The pathway row gets a status (`active | archived`), archived rows live behind a "Show archived" disclosure so the user can see their full learning record and re-add anything anytime. *Progress + mastery records are already decoupled* (they key off topicId, not pathway membership), so pathway edits never wipe quiz scores or completion history regardless — the archive flag is purely a view filter on the pathway itself.
  - **Persistence.** Today (Dexie): new per-user table holding pathway rows (topicId, status, position, addedAt). Post-DB: `user_pathway_items` table with `user_id` + `topic_id` + `status` + `position` + `created_at`, RLS-owned.
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
