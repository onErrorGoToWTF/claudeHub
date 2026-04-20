# aiUniversity — status + structure

Current release: **v1.0.0** on `main`. Live at https://onerrorgotowtf.github.io/claudeHub/. v0.7 design-system refactor is complete — shipped as the v1.0.0 baseline. Phases 1, 1.5, 2, 3, 4, 5, 6, 7, 8 shipped plus v0.7 refactor M9.1–M9.19a. (Formerly "aiStacked" — visible brand flipped to **aiUniversity** in M8.12.5.)

Prior stable release tag: `v0-complete` (annotated, marks the v0.7 refactor completion at v0.7.1-dev.61).

## Current state — 2026-04-20

**v0.7 design-system refactor: complete. v1.0.0 baseline established.** M9.1–M9.11 stamped the new token system + layouts; M9.12–M9.15a added scroll-center activation + vignette; M9.16a–q layered a polish suite; M9.17 added the `design-amend` skill + Learn-items overhaul; M9.18 introduced the unified `.dash-tile` grammar on the Dashboard; M9.19a migrated the Learn list to `.dash-tile` and shipped the progressive-disclosure (tap-to-expand) interaction model across every list-item surface. See v0.7 plan doc for the full milestone ledger.

**What shipped in M9.18 (unified tile grammar introduced on Dashboard):**

- **M9.18a** — new `.dash-tile` fixed-slot row component; wired Dashboard Learn panel first. 4-quadrant anatomy: grab / content / trailing cluster with duration + state + 3-slot icon row.
- **M9.18a.1** — icon sizing bump (14px → 22px), mobile :hover scoped behind `@media (hover: hover)` to kill iOS sticky-hover halos, tile :hover glow switched from hard spread ring to soft blur-gradient.
- **M9.18a.2** (reverted in **M9.18b.2**) — attempted systemic glow-gradient amendment across 7 selectors + CLAUDE.md + design-review Rule 11. User flagged as risky ("unifying can cause awkward things due to layers"). Reverted in favor of per-component fixes; only `.dash-tile:hover` kept the blur-gradient. Lesson baked into memory: unified classes with opt-in overrides, never sweeping cascades.
- **M9.18b** — Projects dashboard panel migrated to `.dash-tile` with a `DASH_DUMMY_PROJECT` fallback (keeps tile shape when the list is empty). `DASH_DUMMY_LESSON` fallback added to Learn dashboard defensively.
- **M9.18b.1** — TDZ fix #1: `DASH_DUMMY_*` consts hoisted out of their adjacent-to-renderer locations (~L3048) up to the top-of-IIFE hoisted-state block; fixed first-load ReferenceError that was silently aborting the IIFE.
- **M9.18b.2** — reverted the M9.18a.2 glow cascade (see above); added `.dash-tile` to the `.dash-panel.is-activated` child selector at `css/style.css:2044-2053` so migrated Learn + Projects tiles finally lifted on scroll-center activation (the real "activation not firing" regression the user flagged).
- **M9.18b.3** — TDZ fix #2: hoisted PIN_SVG_* / MASTERY_SVG_* / TRASH_SVG / GRAB_SVG + TRACK_LABEL to the top-of-IIFE hoisted-state block. The M9.18b dummy-fallback tile's reads of these (via the DASH_DUMMY_LESSON track) made them fire during the initial `applyRoute → renderDashLearn` at L602, before the original declarations had been evaluated. Cousin bug to M9.18b.1.
- **M9.18b.4** — scaffolded the `tdz-audit` skill + gated `milestone-deploy` so any future js/app.js edit on the initial-render path auto-audits before shipping. Prevents this regression class forever.

**What shipped in M9.19a (Learn list migration + progressive disclosure):**

- **M9.19a** — Learn list view (`.learn-item`) migrated to the unified `.dash-tile` grammar. Preserved all M9.17 behavior: drag-trace finger-follow, zone swap (Up Next / Everything else / Done), inline actions via `[data-learn-action]` delegation.
- **M9.19a.1** — draft eyebrow reads `Draft · <source-tool-name>` (e.g., "Draft · Claude Code") instead of the tautological "Draft · Draft."
- **M9.19a.2** — swipe-to-reveal delete on draft tiles (iOS Mail pattern). Right-to-left swipe translates the tile `translateX(-80px)`, revealing a red Delete action clipped behind it. Tap red → commit. Auto-closes after 4s. Tap-outside closes. Inline delete button retired from drafts.
- **M9.19a.3** — grab icon SVG bumped 14×18 → 18×22 for phone readability. Dashboard Learn tiles now render sortable (data-sortable="1"); drag-trace animates on dashboard too (drop is no-op for now).
- **M9.19a.4** — drag lift goes BRIGHTER not darker. `.dash-tile:active` gated with `:not(.is-dragging)` so the held finger doesn't drag the tile into the darken state. `.is-dragging` explicitly sets background to pure `#ffffff`. Matches HIG gestures-and-drag §4.
- **M9.19a.5** — task tiles always show a time (default `10m`, superseded in .11b). Projects duration slot stays reserved-but-invisible (no duration concept).
- **M9.19a.6** — pin + mastery icons retired from Learn tiles. Pin is universal "send to Learn" — it appears only on items OUTSIDE Learn. Mastery collapses into completion (state pill carries Done). Drag-to-zone still wires through `pinLearnItem` / `unpinLearnItem` under the hood.
- **M9.19a.7** — Projects dashboard pin retired; "has pinned tools/snippets inside" rollup migrated to the flag row as `2 TOOLS` / `1 SNIPPET` caps pills. Pin universal rule now holds cleanly across Learn + Projects.
- **M9.19a.8** — 4-quadrant layout formalized via `grid-template-areas`. Eyebrow + status on top row, title row 2, summary + flags + coverage + progress span full width below. Summary bumped to 2-line clamp.
- **M9.19a.9** — **tap-to-expand progressive disclosure.** Tap a condensed tile → it grows into a floating detail card (`min(560px, 92vw)`) at higher z-index over a dimmed backdrop. Origin animates from the tapped tile's centerpoint via compositor-only translate + scale. Single primary CTA at bottom fires real navigation (Start lesson → / Open course → / Modify draft → / Open project →). Backdrop tap / close-X / Esc dismisses. Cascades across every `.dash-tile` surface.
- **M9.19a.10** — title bumped to full-width row on condensed tile; summary retires from condensed view (shows in expanded only). Fixes long titles getting cut off by the trailing cluster.
- **M9.19a.11** — 3-row stacked content column. Status cluster top (right-aligned, its own row), eyebrow row 2, title row 3 (bumped to 16px / 600 weight — prominent visual anchor).
- **M9.19a.11b** — duration fallback `10m` → `? m` (honest placeholder, not fabricated estimate).
- **M9.19a.11c** — state pill reads `NOT STARTED` instead of `START` (status label, not action verb). Width bumped 84 → 100px to fit.

**What shipped in M9.16 (newest work):**

- **M9.16a** — activation band vertical center raised 8% above viewport center (rootMargin -40%/-40% → -32%/-48%); band height unchanged at 20%.
- **M9.16b/c/d/e** — link-in-modal pattern. External `<a>` clicks route through a sandboxed `.doc-modal` iframe via a global click interceptor; YouTube links reuse the existing video modal. Close via X / backdrop / ESC / phone back gesture (history.pushState + popstate). Blocked-state UI (circle-slash icon + "Open on {hostname}" CTA) when X-Frame-Options refuses embedding. Focus trap + restore. Loading spinner. Vignette gradient compressed toward edges.
- **M9.16f–j** — deferred contrast review completed. `.tool-modal-vendor` 0.35α → 0.50α, `.project-bootstrap-ghost` border 25% → 35%, `.your-stack-empty` text-3 → text-2/3 mix, `.project-chip-claude` orange tint removed (rule kept empty as a hook). Skipped: `.recipe-modal-card` (parked), `.filter-chip-count` + `.tool-mastery` (user left as-is).
- **M9.16i** — tool cards adopt the Learn-panel near-white glass recipe and the current --accent-border / --accent-glow tokens; heavy dark hover shadow replaced with subtle green.
- **M9.16k** — doc-modal blocked-detection moved out of the iframe load handler (was producing false positives during cross-origin navigation transitions); detection now runs only in a single 3s timer. Safe-area-inset-top padding added to storage + backup modal headers. Dead --accent compat alias removed.
- **M9.16l** — nine-item audit-driven polish chunk: nav chip easing parity + elevated active shadow; dashboard panel icons less muted; pill radii fixed to --radius-sm (card-pill, tutorial-toggle); card entrance animation reduced-motion-guarded; severity pulse uses --dot; your-stack-tool padding symmetric; tool-card active translateY(1px); save-btn-mastery gains explicit accent-forward hover.
- **M9.16m** — js/app.js TOC regenerated (previous anchors drifted ~500 lines).
- **M9.16n** — second audit wave: taskgrid type-pill + type-legend-item radii 999px → --radius-sm; unified :focus-visible ring (2px --accent-border, 2px offset) across 15 interactive elements in tool/doc/video/yt/backup/storage/lesson/recipe modals.
- **M9.16o** — session wrap hygiene: status.md + plan doc + CLAUDE.md tree comment + per-session memory files refreshed.
- **M9.16p** — drop link-in-modal. Header probe of the top 8 feed hosts showed ~95% forbid iframe embedding via X-Frame-Options or CSP frame-ancestors, so the preview premise wasn't viable. Removed the #doc-modal template, the .doc-modal* CSS block, and the global `<a[href]>` click interceptor + openDocModal/detectDocBlocked/focus-trap/popstate wiring. Kept shared refreshModalOpenBodyClass helper. YouTube in-app modal still works via its per-card handler. External anchors now open natively via target="_blank".
- **M9.16q** — docs hygiene: plan + status + memory catch up with M9.16o / M9.16p.

**What shipped in M9.17 (newest work):**

- **M9.17.0** — scaffolded the `design-amend` project skill (systemic rule changes via impact-list → docs-first → chunked cascade).
- **M9.17a / a.1 / a.2** — overflow fix on Up Next item titles. First pass was `min-width: 0` on the flex chain, then `:has(+ .learn-menu)` right gutter, then unconditional gutter + `overflow: hidden` on card body. All superseded by a.4.
- **M9.17a.3** — cache-buster `?v=<version>` query on css/style.css, overrides.css, js/app.js in index.html. Bump alongside data/version.json every deploy.
- **M9.17a.4** — simplified constraint recipe: .learn-item-wrap became a flex row; card is flex:1; ⋯ menu was a natural flex sibling (retired in b.a). Dropped all padding/overflow hacks.
- **M9.17b.a** — inline pin + mastery + draft-delete buttons replacing the ⋯ collapsed menu. Draft delete uses red destructive button with two-tap confirm.
- **M9.17b.b** — grab handle (⋮⋮ glyph) on the left of non-Done learn-items; replaces the retired long-press-to-drag.
- **M9.17b.c** — shrunk the tap target: only `.learn-item-head` (kind + title + state pills) is the link. Meta / summary / coverage are passive. Fixes accidental opens.
- **M9.17c** — `--danger` token family (solid, border, glow, surface, ink, hover) in :root. CLAUDE.md + design-review skill amended with the "one --danger for every destructive action" rule.
- **M9.17c.a** — migrated all four destructive buttons (.learn-action-btn-danger, .project-delete, .storage-key-delete, .pin-picker-remove) to the shared token.
- **M9.17d** — no text-selection on tappable/draggable surfaces (`user-select: none` + `-webkit-touch-callout: none` on card rows, action buttons, grab handles, filter chips, nav chrome, CTAs). Informational text (summary, meta, coverage, body copy) stays copyable.
- **M9.17b.d** — retired swipe-left-mastery. Inline ✓ button is now the discoverable mastery path; ~120 lines of swipe state machine removed from wireLearnRowGestures.
- **M9.17e** — TOC regenerated in js/app.js after the M9.17 wave drifted anchors ~100 lines.
- **M9.17f** — row follows finger during grab-handle drag (inline compositor-only transform); drop-zone active state bumped to unambiguous accent-tint + stronger ring / glow / drop shadow.

## Sources of truth

| What                                  | Where                                              |
|---------------------------------------|----------------------------------------------------|
| Project overview + conventions        | `CLAUDE.md` (root)                                 |
| Data / localStorage contracts         | `data/schema.md`                                   |
| v0.7 milestone plan (ledger)          | `docs/plans/v0.7-design-system-refactor.md`        |
| v0.7 defaults / approved answers      | `docs/plans/v0.7-open-questions.md`                |
| Original aiStacked rebuild plan       | `docs/plans/aistacked-v1.md` (historical)          |
| Deployment pre-refactor snapshot      | git tag `v0.6.115-pre-refactor`                    |
| Per-session memory                    | `C:\Users\alany\.claude\projects\C--dev-claudeHub\memory\` |

## Legacy cleanup notes

- **Violet color tokens** — `--color-violet-*` / `--accent-violet-*` retained in `css/style.css`; still referenced by unrelated gradients (chart text, hero mix, hover treatments). Can be consolidated once a decision lands on whether violet returns as a per-section accent.
- **`--color-electric-*`** — still backs `--accent-hi` (9 active consumers) plus the timeline SVG's hardcoded `#40c8e0` stops (not yet migrated — `--color-electric-solid` is `#30b0c7`, so a token migration would change the color). Revisit once the timeline's final color is chosen.
- **Recipe modal** — code exists (`.recipe-modal-card`, `openRecipeModal`, `renderRecipes`) but host `#recipes` was parked with the charts in M8.11.4. Modal is currently unreachable from the UI.
