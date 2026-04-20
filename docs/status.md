# aiUniversity — status + structure

Current release: **v0.7.1-dev.40** on `main`. Live at https://onerrorgotowtf.github.io/claudeHub/. Phases 1, 1.5, 2, 3, 4, 5, 6, 7, 8 shipped plus v0.7 design-system refactor M9.1–M9.17f. (Formerly "aiStacked" — visible brand flipped to **aiUniversity** in M8.12.5.)

## Current state — 2026-04-20

**v0.7 design-system refactor: complete.** M9.1–M9.11 stamped the new token system + layouts; M9.12–M9.15a added scroll-center activation + vignette; M9.16a–q layered a polish suite; M9.17 suite added the `design-amend` skill + Learn-items overhaul (overflow fix → simplified wrap layout → inline action buttons → visible grab handle → shrunk tap target → unified danger color → no-select on tappables → swipe-mastery retired). See v0.7 plan doc for the full milestone ledger.

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
