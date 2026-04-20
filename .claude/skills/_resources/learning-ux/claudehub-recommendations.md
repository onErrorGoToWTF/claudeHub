---
topic: claudeHub-specific progress-tracking recommendations
last_fetched: 2026-04-20
staleness_days: 30
scope: project-specific synthesis — NOT acting on these yet; reference-only
sources:
  - minimal-patterns.md
  - linear-workflow.md
  - khan-academy.md
  - duolingo.md
  - quizlet.md
  - CLAUDE.md (project spec)
  - docs/plans/v0.7-design-system-refactor.md
---

# claudeHub — progress-tracking proposals (reference only)

**Status:** none of this is currently planned or in-flight. This file is a menu of options, informed by the four learning-app references, written to sit dormant until the user picks a proposal to pursue. Structured to mirror `liquid-glass/claudehub-roadmap.md`.

## TOC

1. Non-goals (what we are NOT doing)
2. What claudeHub already does
3. Vocabulary (aligned with `minimal-patterns.md`)
4. Learn surface — proposals (low / medium / out-of-scope)
5. Projects surface — proposals (low / medium / out-of-scope)
6. Dashboard surface — proposals (activity strip)
7. Where each lives in the existing file layout

## 1. Non-goals (what we are NOT doing)

This list is as important as the proposal list. Grounded in the user's brief + existing memory.

- **No Awards/Badges page.** If achievement signal is wanted, it's inline with the tile it describes.
- **No streak mechanic.** No flame widget, no "don't break your streak" loss aversion.
- **No XP / gems / leagues / leaderboards.** Single-user app; zero gamification economy.
- **No mascot.** Would break the Apple-glass aesthetic.
- **No runtime API calls.** Rules out adaptive difficulty that needs an LLM in-loop (per `project_no_runtime_api_calls.md`). Revisitable only after DB migration + Claude API integration ("very last step").
- **No celebration modals.** If progress is worth showing, it's on the tile.
- **No mandatory-cadence nudges** (weekly check-in reminders, etc.). claudeHub is PWA-open-when-you-want.

## 2. What claudeHub already does

| Pattern (per `minimal-patterns.md`) | Current claudeHub state |
|---|---|
| Tile-level progress (Khan / Quizlet) | Partial — `.continue-row` idiom has title + right pill + meta; no progress bar yet |
| Recommended-next (Khan) | Partial — Dashboard panels show up to 2 in-progress items, not labeled "up next" |
| Lifecycle badge vocabulary | Missing — no Project lifecycle badge exists |
| Inline progress bar | Missing |
| Activity strip (collapsed) | Missing |
| Health indicator (2nd pill) | Missing — and only warranted if stalls occur |
| One vocabulary at multiple scales | N/A — no lifecycle vocabulary defined yet |

So most patterns are fresh adds, but the **tile idiom that hosts them already exists** (`.continue-row`, M3.6 + M8.12.22). That's why these are mostly low-effort: the chassis is ready.

## 3. Vocabulary

Reuses `minimal-patterns.md` §4. Reproduced for quick retrieval:

| Term | Meaning |
|---|---|
| **Lifecycle badge** | The single pill showing an item's current state |
| **Eyebrow row** | Horizontal status strip above tile title; 1–3 small pills |
| **Progress bar** | Hairline at tile bottom when in-progress |
| **Recommended-next** | The single most-useful item surfaced prominently |
| **Activity strip** | 4–5-entry collapsed recent-activity feed on Dashboard |
| **Health pill** | Optional second eyebrow pill for On track / At risk / Off track |

## 4. Learn surface — proposals

### Low-effort

**L1. Eyebrow row on Learn item tiles.**
Promote the existing right-side status pill into a dedicated top-of-tile eyebrow strip. Same height as today, but sits *above* the title rather than to the right of it. Accommodates 1–3 pills without crowding the title line.

*Visual shape:*
```
┌───────────────────────────────────┐
│ [Lifecycle] [Kind] [Source]       │  ← eyebrow row
│ Lesson title, two lines max…      │
│ meta · row · here                 │
│ ░░░░░░░░░░░░──────────────        │  ← progress bar (if in-progress)
└───────────────────────────────────┘
```

*Why the eyebrow instead of the current right-pill?* When more than one pill exists (kind + source + lifecycle), the right-pill position forces truncation of the title. The eyebrow row gives each pill its own lane without competing with the title column.

*Risks:* slightly more vertical height per tile; need to verify density in the Learn list stays reasonable on small screens.

**L2. Tri-state lifecycle at Learn zone scale.**
Matches existing zones: **Up Next = Started or queued**, **Everything else = Not started**, **Done = Finished**. The badge on each tile is redundant with the zone (which is intentional — zone filter is ephemeral; badge is persistent). Reinforces that the vocabulary is one system.

**L3. Hairline progress bar on in-progress tiles.**
2px bar at tile bottom edge. Width = `completed / total` (e.g., quizzes taken in a lesson, terms mastered in a set). Uses `--accent-border` for fill. Hidden when `lifecycle = not-started` or `lifecycle = done`.

### Medium-effort

**L4. "Recommended next" single-tile promoted slot in Dashboard > Learn panel.**
Today: up to 2 in-progress tiles. Proposal: same slot, but explicitly *1 currently-in-progress + 1 recommended-next (not started)*. Recommended-next is the first item in `Up Next` order, even if the learner hasn't touched it. Makes the panel a *next-action* surface, not a *recent-history* surface.

**L5. Daily cadence without streak.**
Khan's Mastery pattern. One rotating "today's quick review" surfaces daily in the Learn panel. Requires content authoring (tag which lessons rotate, at what cadence). Not a streak — missing a day has no consequence. Defer until content scale makes it worthwhile.

### Out-of-scope / parked

**L6. Adaptive difficulty per quiz item.**
Blocked by `project_no_runtime_api_calls.md`. Revisit post-Claude-API-integration. Even then, requires item-level metadata (difficulty estimates, user-error history) that's not currently persisted.

**L7. Mastery tiers (Familiar → Proficient → Mastered).**
Khan's multi-tier signal. Could be valuable, but introduces a 3-state *within* the Done lifecycle state — more vocabulary than the user asked for. Revisit if "Done" alone feels too flat.

## 5. Projects surface — proposals

### Low-effort

**P1. Lifecycle badge in the eyebrow row — both surfaces (Projects tab list tiles + Dashboard Projects panel tiles).**
User confirmed: applies to both. Vocabulary suggestion (user to confirm final names):

| State | Meaning |
|---|---|
| **Idea** | Captured but not started |
| **Building** | Active work |
| **Shipped** | User has declared it done (Linear-style manual) |
| **Archived** | Retired, kept for reference |

*Why manual*: matches Linear's **"Project statuses are updated manually—we do not do this automatically, even if all issues are completed."** Lifecycle is a human claim; auto-inferring Shipped from "all steps complete" fights the user's intent.

**P2. Eyebrow row accommodating multiple pills — "status-area type thing."**
User explicitly asked for this. Same eyebrow idiom as L1. Home for: `[Lifecycle] [Kind] [Priority?] [Stack-affinity?]` — up to ~3 pills without crowding.

*Visual shape:*
```
┌───────────────────────────────────┐
│ [Building] [Side-project] [Claude]│  ← eyebrow row
│ Project name, up to 2 lines…      │
│ updated · meta · row              │
│ ░░░░░░░░░░──────────────          │  ← progress bar (if Building)
└───────────────────────────────────┘
```

**P3. Hairline progress bar while Building.**
Same idiom as L3. Width = steps completed / total steps (if steps are tracked in the draft Finder), or just a thin pulse/progress signal without numeric backing. Hidden for Idea / Shipped / Archived.

### Medium-effort

**P4. Health pill as optional second eyebrow pill.**
Linear-style: On track / At risk / Off track. Only useful if the user notes stalls on in-flight projects. Starts dormant; introduced when the single lifecycle pill proves insufficient. Colors via `--accent-*` derived from `--base`, not hardcoded reds (`--danger` is for destructive *actions*, not stalled *states*).

**P5. Recommended-next in Dashboard > Projects panel.**
Analog of L4 for Projects. 1 Building + 1 Idea (proposed next). Makes the panel generative ("start this next") not just reflective.

### Out-of-scope / parked

**P6. Project progress graph (Linear-style scope + completion lines).**
Requires time-series data claudeHub doesn't record. Parked until DB migration (lifecycle state transitions timestamped) makes it possible cheaply.

**P7. Initiative rollup (projects → themes).**
Linear has initiatives grouping projects. claudeHub has no analogous second tier. Would need a product decision before a UI decision.

## 6. Dashboard surface — proposals

### Low-effort

**D1. Activity strip.**
User asked for "recent activity timeline." Linear's collapsed-events pattern is the model. 4–5 entries, grouped-similar-consecutive, "show more" to expand.

Entry shape (small tile, one-line):
```
[glyph] Finished  [Lesson name]                2h ago
[glyph] Started   [Project]                    1d ago
[glyph] Updated   [Project] → Building         1d ago
[glyph] Mastered  [Tool]                       3d ago
```

Placement options (user picks):
1. Under the 4 panel quadrants on Dashboard (new section).
2. Inside a Dashboard panel (e.g., bottom of the Learn panel).
3. On its own dedicated tab area (unlikely — adds navigation surface).

**D2. Top-strip mastered-tools row** (already planned in M9.7 per CLAUDE.md "Your stack" concept).
Noted as already on the roadmap; not this file's ask. Mentioned so the recommendations file lists the full picture.

### Medium-effort

**D3. "This week at a glance" counts.**
One-row Dashboard strip: "`3 lessons · 1 quiz · 2 projects updated`" over the past 7 days. Non-judgmental count, no streak. Near-zero motion (text only, no animation). Only if the activity-strip (D1) feels too event-specific.

## 7. Where each proposal lives in the existing file layout

File-path crosswalk so a future implementation pass knows where to open:

| Proposal | Files touched |
|---|---|
| L1 eyebrow row on Learn tiles | `css/style.css` (new `.learn-item-eyebrow` rules), `js/app.js` (render fn for Learn item), `index.html` (template if any static) |
| L2 tri-state lifecycle | Pure CSS token + data shape; `data/schema.md` annotation; render fn reads state |
| L3 progress bar | `css/style.css` new `.tile-progress` class; render fn passes `progress` prop |
| L4 recommended-next slot | `js/app.js` `renderDashboardLearnPanel` fn; add a 2nd row for recommended-next |
| P1 Projects lifecycle badge | `data/schema.md` lifecycle enum; render fn in both Projects tab and Dashboard panel |
| P2 Projects eyebrow row | Same as L1 but for Projects tiles |
| P3 Projects progress bar | Same as L3 |
| D1 Activity strip | New section in `index.html` Dashboard area + new render fn + `localStorage` event log (`clhub.v1.activity`) |

## 8. Effort ranking (for picking the first implementation round)

If the user ever wants one cluster to ship first, the cheapest high-value group is:

**Cluster α — eyebrow + lifecycle on Projects.** Low risk, matches the stated ask ("status-area type thing"). P1 + P2. One chunk.

**Cluster β — progress bar + eyebrow on Learn.** L1 + L3. Same idiom, reuses the Projects work.

**Cluster γ — activity strip.** D1. Higher design-lift because it's a new Dashboard region; useful to ship *after* α/β so it has lifecycle events to reference.

## Cross-references

- Pattern filter: `minimal-patterns.md`
- Per-app detail: `linear-workflow.md`, `khan-academy.md`, `duolingo.md`, `quizlet.md`
- Existing tile idiom: `CLAUDE.md` → "Tile idiom (shared component)"
- Existing Learn refactor plan: `docs/plans/v0.7-design-system-refactor.md` → M9.4
- Existing Projects refactor plan: same doc → M9.5
- Design-language discipline this must obey: `CLAUDE.md` → "Design language" section
