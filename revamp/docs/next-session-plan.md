# Next-session plan — autonomous-run spec

Written 2026-04-23 before Alan heads to work. This is the brief for the next Claude Code session to pick up and run with while he's away. Scope: things safe to do autonomously (no decisions needed), plus one subtle visual polish of the session's own choosing.

---

## Ship cadence reminders (do NOT skip)

- Every commit: conventional-commits style. Mention exactly what shipped + why. Co-author footer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **Verify `gh run list --workflow=deploy-pages.yml --limit 1` is green after every push.** Don't declare "shipped" until CI + Pages deploy settles.
- Run `npx tsc -b` locally (NOT `npx tsc --noEmit`) before commit. That matches CI. Diverging catches bit us once already (see `docs/troubleshooting-log.md`).
- Obey every durable memory rule in `~/.claude/projects/C--dev-claudeHub/memory/MEMORY.md`. Especially: no validation glue ("Good call"), no left-bar card highlights, layout stability, no inline external links in prose, numbered citation markers are banned.
- Append entries to `docs/troubleshooting-log.md` whenever something gotcha-worthy gets resolved. Append entries to `docs/learning-journal.md` for aha / decision moments during autonomous work.

---

## Tier 1 — do these first (no decisions required)

### 1. Systematic error-boundary + loading-state audit

- Every page under `src/pages/` should render gracefully when its async data is still loading (no white flash, no "can't read .xxx of undefined" crash).
- Check each page: `Dashboard`, `Learn`, `TopicDetail`, `LessonView`, `QuizView`, `Projects`, `ProjectNew*`, `ProjectDetail`, `Library`, `LibraryDetail`, `LibraryWishlist`, `Me`, `Settings`, `Colophon`, `Feedback`, `CustomPathway`, `SignIn`.
- Reserve space (from the layout-stability rule) for async content: skeletons, reserved min-heights, or explicit "Loading…" text in a fixed container. Don't let content flash in and push layout.
- Add ErrorBoundary-surfaced recovery paths where data-fetch failures would otherwise crash the component.

### 2. Typecheck warning sweep

- `npx tsc -b` and fix any warnings surfaced. Remove dead imports. Narrow obvious `any` typings.
- Check for React `key` warnings in `.map()` — any missing keys are a correctness issue, not just a warning.
- Run the build (`npx vite build`) and check output: any ESM / rollup warnings worth addressing.

### 3. Refactor: shared modal layout primitives

- `ExpandedPack` in `src/pages/Learn.tsx` and `CategoryModalBody` in the same file both use the `starterExpanded*` CSS classes and share structural layout (header → list → footer). Extract a small `<ModalCardLayout header={...} footer={...}>` wrapper component in `src/ui/` so future dive-in modals don't duplicate the markup. Keep the CSS classes they consume; just de-dupe the JSX.
- Library already has its own CSS for chips, filters, clear-chips — some of those patterns could move to `ui/` shared primitives if reused elsewhere. Low-priority.

### 4. CSS token audit

- Walk `src/styles/tokens.css`. Flag anywhere a hard-coded color slipped into a component's `.module.css` or an inline `style={{...}}` instead of going through tokens. Fix where trivially fixable.
- Check that every `color-mix(in oklch, …, var(--bg-page))` is accounted for per the warm-canvas tinting memory (`feedback_warm_canvas_color_shift`) — use `--bg-card` (white) as the dilution base wherever the mix is a pill fill. Chunk H's color sweep handled the big ones; this is a follow-up cleanup.
- Check no accidental left-bar card highlights crept back in (`feedback_no_left_bar_highlight`).

### 5. Bundle / code-splitting cleanup pass

- Current main bundle is ~780kB (gzip ~264kB). Still dominated by `seed.ts` content strings.
- Consider: move lesson bodies + library notes to JSON files, lazy-load them when needed. Content would no longer be in the initial JS. Risk: seed-if-empty runs on every boot and needs content available — so the lazy-load has to finish before seed. Prototype in a branch before committing if uncertain.
- Smaller win: check for any libraries that can be tree-shaken better.

### 6. Accessibility spot-checks

- Run through the app with keyboard only: Tab through Dashboard → Learn → Topic page → Lesson → Quiz. Every interactive thing should be reachable. Every focus-visible state should read. No focus traps.
- Check `aria-label` / `aria-expanded` / `aria-modal` on every custom-role element. Modal, disclosures, starter-pack cards, category cards, etc.
- Contrast spot-check: `--ink-3` is at 0.52 after the recent bump. Check rare places where ink-3 sits on `--bg-sunken` (darker-than-card) that might now be under WCAG threshold.

---

## Tier 2 — visual polish (one cool subtle thing, your pick)

Add ONE deliberately-scoped subtle visual detail. Goal: makes the app feel slightly more alive without violating the one-motion-at-a-time rule or layout stability. Ideas, in ascending ambition:

- Dashboard "Continue" CTA gets a quiet shimmer on mount — a single sheen sweep across the button's surface, 700ms, ease-out, then static. Pair with the electric-pill treatment already in place.
- Category card hover — currently just a border+bg swap. Add a barely-there 1px lift (`transform: translateY(-1px)`) on hover with a shadow depth transition. Keep it under 120ms so scroll interactions don't feel mushy.
- Starter-pack `+` button — when tapped to add, the button does a single-pulse (scale 1 → 1.15 → 1) over 300ms while the icon swaps from Plus to Check. Satisfying "it landed" feedback.
- `/me` streak card — when the streak number is > 0, a tiny flame icon subtly flickers (2-frame opacity swap, 2s interval, reduced-motion-safe). Single motion, contained, doesn't loop over frenetic.

Pick whichever most passes the "feels like Apple, not like Vegas" test. Skip if nothing feels right — visual polish for its own sake violates the minimalism contract.

---

## Tier 3 — research (can run in parallel, background)

Run ONE background research agent (`subagent_type=general-purpose`) on one of:

**Option A — DB migration planning.** The "should we set up the DB first to intake research" question is worth answering honestly. Background agent surveys: Supabase schema refinement (the `docs/supabase-schema.sql` draft exists), RLS policies for the target data model, auth flow (TOTP MFA), migration strategy (fresh-start has been decided), draft of the migration playbook as a step-by-step doc. Deliverable: `docs/research-db-migration.md`. Result useful NOW (even if migration is still weeks out) because it establishes the path.

**Option B — Content-taxonomy expansion research.** We already have `docs/research-library-taxonomy.md`. Next-level question: how does the AI-field-taxonomy scope (the "entire AI field" ambition) actually organize? Survey: Papers With Code, Hugging Face model hub, LMSYS leaderboards, AI Index Report subject list, arXiv categories, awesome-ML-lists on GitHub. What categories / tags / hierarchies are canonical? Deliverable: `docs/research-ai-field-taxonomy.md`.

**Option C — Vibe-safety content research.** `t.vibe-debug-with-ai`, `t.vibe-ship-and-survive`, `t.vibe-security` are parked. Research the current state-of-2026 sources (Checkmarx, Trend Micro, OWASP-for-AI-generated-code) and produce a `docs/research-vibe-safety.md` with draft lesson outlines.

**Recommendation:** Option A. The DB question blocks several downstream items (admin role, Claude API integration, Freshness Pipeline). Having a solid migration plan in hand lets Alan decide when to pull that trigger without another planning pass.

Skip if the research would duplicate work already in `docs/`.

---

## Tier 4 — DO NOT start

Things that need decisions Alan hasn't made:

- Claude API integration in the app. Blocked on the API account setup Alan is doing this week (see `docs/subscription-notes.md`).
- Drag-to-rearrange primitive. No concrete use-case yet; build when there's one.
- Graph visualization of the Obsidian-style edges. Deferred until content density justifies it (see vibe research).
- Tool-overview course full roster (Slack / Teams / GitHub / etc.). Requires content authoring direction Alan hasn't finalized.
- Any change to the subscription-notes doc or the learning-journal (those are personal to Alan).
- Teacher mode / multi-user surfaces. Gated on DB migration.

---

## Parked items (durable reference)

Comprehensive parked list lives in `revamp/STATE.md` → "Planned (later)" and "Deferred (explicitly parked)" sections. Highlights:

- DB migration to Supabase
- Admin role + admin surfaces
- Freshness Pipeline (scraper → Claude drafts → admin review)
- AI-generated custom pathway (post-Claude-API)
- `t.citing-sources-with-ai` lesson authoring
- Visual pathway map (graph view)
- YouTube API integration (admin-only)
- Tool-overview courses full roster
- Teacher mode (future)
- Resume / public project-detail pages
- Project bootstrapper with just-in-time profile prompts

---

## On your way out

When done with whatever subset of the above you tackle:

1. Commit + push everything.
2. Verify the deploy landed green.
3. Append a summary of what shipped to `docs/learning-journal.md` (dated entry, flavor tag).
4. Update `revamp/STATE.md` → move anything you finished into "Shipped."
5. Leave one `🟡 WIP` note in this file (`docs/next-session-plan.md`) at the bottom if you started something you couldn't finish, so Alan can see where to pick up.

Don't be precious. Being mid-session when Alan gets back is better than having finished nothing.


### Next-session note

**2026-04-23** — DB migration research doc now exists at `revamp/docs/research-db-migration.md`. Covers schema refinements (Chunks H/I/J/K/L/O deltas against `supabase-schema.sql`), RLS with admin-bypass + is_admin escalation guard, Supabase Auth + TOTP + 7-day grace, seed-via-script recommendation, `repo.ts` swap strategy (dual-impl behind `VITE_USE_SUPABASE` flag), fresh-start UX, 10-step playbook, rollback, post-migration follow-ups, effort estimate (~60–80 h / 2 weeks), and 8 open questions. Use as SSOT when the migration task activates.
