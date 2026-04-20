# aiUniversity — status + structure

Current release: **v0.7.1-dev.22** on `main`. Live at https://onerrorgotowtf.github.io/claudeHub/. Phases 1, 1.5, 2, 3, 4, 5, 6, 7, 8 shipped plus v0.7 design-system refactor M9.1–M9.16n. (Formerly "aiStacked" — visible brand flipped to **aiUniversity** in M8.12.5.)

## Current state — 2026-04-20

**v0.7 design-system refactor: complete.** M9.1–M9.11 stamped the new token system + layouts; M9.12–M9.15a added scroll-center activation + vignette; M9.16a–n layered on a polish suite (see v0.7 plan doc for the full milestone ledger).

**What shipped in M9.16 (newest work):**

- **M9.16a** — activation band vertical center raised 8% above viewport center (rootMargin -40%/-40% → -32%/-48%); band height unchanged at 20%.
- **M9.16b/c/d/e** — link-in-modal pattern. External `<a>` clicks route through a sandboxed `.doc-modal` iframe via a global click interceptor; YouTube links reuse the existing video modal. Close via X / backdrop / ESC / phone back gesture (history.pushState + popstate). Blocked-state UI (circle-slash icon + "Open on {hostname}" CTA) when X-Frame-Options refuses embedding. Focus trap + restore. Loading spinner. Vignette gradient compressed toward edges.
- **M9.16f–j** — deferred contrast review completed. `.tool-modal-vendor` 0.35α → 0.50α, `.project-bootstrap-ghost` border 25% → 35%, `.your-stack-empty` text-3 → text-2/3 mix, `.project-chip-claude` orange tint removed (rule kept empty as a hook). Skipped: `.recipe-modal-card` (parked), `.filter-chip-count` + `.tool-mastery` (user left as-is).
- **M9.16i** — tool cards adopt the Learn-panel near-white glass recipe and the current --accent-border / --accent-glow tokens; heavy dark hover shadow replaced with subtle green.
- **M9.16k** — doc-modal blocked-detection moved out of the iframe load handler (was producing false positives during cross-origin navigation transitions); detection now runs only in a single 3s timer. Safe-area-inset-top padding added to storage + backup modal headers. Dead --accent compat alias removed.
- **M9.16l** — nine-item audit-driven polish chunk: nav chip easing parity + elevated active shadow; dashboard panel icons less muted; pill radii fixed to --radius-sm (card-pill, tutorial-toggle); card entrance animation reduced-motion-guarded; severity pulse uses --dot; your-stack-tool padding symmetric; tool-card active translateY(1px); save-btn-mastery gains explicit accent-forward hover.
- **M9.16m** — js/app.js TOC regenerated (previous anchors drifted ~500 lines).
- **M9.16n** — second audit wave: taskgrid type-pill + type-legend-item radii 999px → --radius-sm; unified :focus-visible ring (2px --accent-border, 2px offset) across 15 interactive elements in tool/doc/video/yt/backup/storage/lesson/recipe modals.

**Known open:** doc-modal iframe loading — user reported "most sites not loading" pre-M9.16k; the detection-timing fix should significantly reduce false-positive blocked flags, but still untested end-to-end on phone.

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
