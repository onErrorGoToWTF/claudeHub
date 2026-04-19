# aiUniversity — status + structure

Current release: **v0.6.116** on `main`. Live at https://onerrorgotowtf.github.io/claudeHub/. Phases 1, 1.5, 2, 3, 4, 5, 6, 7, 8 shipped. (Formerly "aiStacked" — visible brand flipped to **aiUniversity** in M8.12.5.)

## Current state — 2026-04-19

**Dashboard page: ~done.** Visual pass wraps up in M8.12.x:

- aiUniversity wordmark in nav.
- Four tabs: Dashboard · Learn · Projects · Tools.
- Panel layout: 2×2 quadrant grid per panel; title + CTA stacked left, identity icon lower-right (Learn/Projects nudged +6px), divider + glass item tiles below.
- Identity stripe marker restored left of each section heading.
- Item tiles: fake cut-through to page bg (solid `--bg-0` + glass-edge chrome).
- CTAs converted to translucent Apple glass (M8.12.27).
- Nav chips: translucent glass with debossed/impressed labels (M8.12.37). Active chip stays solid white for prominence.
- YouTube tile: transparent glass; logo + wordmark render as a glass impression (M8.12.35/36).
- Tools panel mirrors Learn/Projects — divider + glass tiles; seeded with three currently-in-use tools (Claude Pro Max 20×, GitHub Copilot Pro, SuperGrok Heavy). These will later weight the project-stack recommendation formula.

**Remaining dashboard polish (deferred):**
- Dashboard identity color — grey `#9a938a` placeholder; may be retuned.
- `--color-violet-*` / `--accent-violet-*` still referenced by unrelated gradients; cleanup when purple is retuned.

**Next up:** v0.7 design-system refactor — port the Dashboard's transparent-glass language, single-`--base`-per-page color system, and flat / route-based layouts to Learn · Projects · Tools. Plan at `docs/plans/v0.7-design-system-refactor.md`; open questions + approved defaults at `docs/plans/v0.7-open-questions.md`.

---

## Current sources of truth

| What                                  | Where                                              |
|---------------------------------------|----------------------------------------------------|
| Project overview + conventions        | `CLAUDE.md` (root)                                 |
| Data / localStorage contracts         | `data/schema.md`                                   |
| v0.7 milestone plan                   | `docs/plans/v0.7-design-system-refactor.md`        |
| v0.7 defaults / approved answers      | `docs/plans/v0.7-open-questions.md`                |
| Original aiStacked rebuild plan       | `docs/plans/aistacked-v1.md` (historical)          |
| Deployment pre-refactor snapshot      | git tag `v0.6.115-pre-refactor`                    |

---

## Legacy cleanup notes

- **Violet color tokens** — `--color-violet-*` / `--accent-violet-*` retained in `css/style.css`; still referenced by unrelated gradients (chart text, hero mix, hover treatments). Can be consolidated once the `--base` / `--accent-*` system lands in M9.1.
