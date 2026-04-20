---
topic: Minimal progress-tracking patterns — synthesis across the 4 apps
last_fetched: 2026-04-20
staleness_days: 30
scope: cross-app distillation (not a canonical vendor doc)
sources:
  - linear-workflow.md
  - khan-academy.md
  - duolingo.md
  - quizlet.md
---

# Minimal progress-tracking patterns — cross-app synthesis

This file distills the four per-app files into the handful of patterns that actually survive claudeHub's constraints:

- **Minimal / seamless.** No dedicated Awards/Badges page.
- **Light-only, Apple-glass aesthetic.** Mascots, bright brand colors, and loss-aversion UI break visual language.
- **Single-user app.** No leaderboards, no class-progress, no social loops.
- **No runtime API calls** (per `project_no_runtime_api_calls.md`). Rules out adaptive AI features at runtime.
- **Dashboard-first.** Progress is inline with the surfaces it describes; no separate summary screen.

## TOC

1. The filter
2. Patterns that survive (ranked by fit)
3. Patterns to leave behind (with reasons)
4. Vocabulary for the recommendations file

## 1. The filter

Before applying any of the four apps' patterns, each claim is tested against:

- Does it require a gamification economy (streaks, XP, gems)? → No.
- Does it require a mascot or brand character? → No.
- Does it require multi-user or social signals? → No.
- Does it require runtime AI (adaptive difficulty)? → No today. Maybe post-Claude-API-integration.
- Does it require a dedicated achievements page? → No.

What remains after that filter is very small — and that's the point. The user asked for *minimal*; the filter is the user's brief encoded.

## 2. Patterns that survive (ranked by fit)

### A. Tile-level tri-state lifecycle (Quizlet-shape, Linear-vocabulary)

Every tileable item (lesson, quiz, project, tool) carries one lifecycle badge drawn from a small discrete vocabulary. Quizlet proves three states suffice for "has the user engaged" (not started / started / finished). Linear proves five states buy you "has the user decided it's done" vs. "is it actually done" separately.

**claudeHub fit:** Excellent. Matches the **Up Next / Everything else / Done** Learn zone layout; matches the stated need for a Projects lifecycle badge.

**Visual shape:** a single pill in the tile's right-side eyebrow row, using `--danger`-tier token discipline (one hue per state, not a per-state bespoke color).

### B. Inline progress bar on the tile itself (Khan + Quizlet)

When an item is *in progress*, its tile carries a thin progress bar — no separate progress dashboard. Khan's dashboard progress bar, Quizlet's set-level bar, and Linear's milestone completion % are all variants of the same pattern: **show progress where the thing lives, not on a summary page**.

**claudeHub fit:** Excellent. The existing `.continue-row` idiom already has a right-side pill + meta row; a bottom 2px hairline progress bar drops in without layout thrash.

### C. Recommended-next list as dominant dashboard element (Khan)

The dashboard leads with *what to do next*, not *what you've accomplished*. Khan's Recommended Tasks list is the direct prior art; Duolingo's path (post-2022) is a more gamified variant of the same move.

**claudeHub fit:** Already partially present in the **Dashboard > Learn/Projects panel** tile rows (up to 2 in-progress items). Could be extended to explicitly label it "Up Next" or similar and include *one* recommended-next item (beyond the currently-in-progress ones).

### D. Collapsed activity feed (Linear)

**"Groups similar consecutive events and collapses older activity"** `[verbatim, Linear docs]`. Any "recent activity" strip on the Dashboard should adopt this — don't show every completion event; collapse runs and expand on demand.

**claudeHub fit:** Matches the user's explicit "recent activity timeline" ask without becoming a firehose. Four or five entries max, with "show more" to expand.

### E. Health indicator separate from lifecycle state (Linear)

The concept of On track / At risk / Off track as a *second* badge dimension on an in-flight item is surprisingly useful when lifecycle alone can't capture stalls. A project can be `Building` + `At risk` (or just `Building` if everything's fine).

**claudeHub fit:** Optional. Would add a second pill to the eyebrow row; only useful if stalls actually occur. Could be introduced later if the single lifecycle pill proves insufficient. Flag as *medium-effort* in the recommendations file.

### F. Daily cadence without streak (Khan's Mastery)

Khan Academy's Mastery tasks unlock daily without a streak penalty. The learner has something new each day; missing a day has no UI consequence.

**claudeHub fit:** Good — if there's a lesson/quiz rotation to offer. Would require content authoring (which lessons rotate in, on what cadence). Lower priority than A/B/C/D.

### G. One lifecycle vocabulary at multiple scales (Quizlet, Linear)

The same badge vocabulary reads at item level (one lesson), section level (a course), and collection level (all courses). Quizlet does this trivially (tri-state at every scale). Linear does this at issue → project → initiative.

**claudeHub fit:** If the lifecycle vocabulary is introduced (pattern A), applying it to *both* individual lesson tiles and course-container tiles (if any) reinforces the convention. Near-zero marginal cost once A is shipped.

## 3. Patterns to leave behind (with reasons)

| Pattern | Source | Why it doesn't port |
|---|---|---|
| Streak widget (flame + days) | Duolingo | Loss-aversion; explicitly ruled out |
| XP + leveling | Duolingo | Gamification; breaks minimal brief |
| Gems / hearts / freezes | Duolingo | Economy overhead; no use case |
| Leaderboards / leagues | Duolingo | Single-user app |
| Mascot feedback | Duolingo | Breaks Apple-glass aesthetic |
| Achievement popups | Duolingo, Khan | User explicitly doesn't want a separate Awards page; popups are the temporal version of that |
| Per-term adaptive difficulty | Quizlet | Requires item-level metadata claudeHub doesn't carry |
| AI-generated MCQ distractors | Quizlet | Runtime API; disallowed |
| Teacher / parent / coach dashboards | Khan, Quizlet | Single-user app |
| Burndown projection graphs | Linear | No time-series data recorded |
| Weekly update nudges | Linear | No cadence mechanism; phone-review-between-milestones IS the cadence |

## 4. Vocabulary for the recommendations file

Adopt these terms consistently in `claudehub-recommendations.md` and any future design-amend/design-review discussion:

| Term | Meaning |
|---|---|
| **Lifecycle badge** | The single pill representing an item's current state (draft / building / shipped / archived, or Learn variants) |
| **Eyebrow row** | The horizontal status strip above a tile's title, home for 1–3 small pills |
| **Progress bar** | Hairline bar at the tile's bottom edge when the item is in-progress |
| **Recommended-next** | The single most-useful item surfaced prominently in a dashboard panel |
| **Activity strip** | The 4–5-entry collapsed recent-activity feed on the Dashboard |
| **Health pill** (optional) | Second eyebrow-row pill for On track / At risk / Off track — only if lifecycle alone doesn't carry enough signal |

## Cross-references

- Per-app detail: `khan-academy.md`, `duolingo.md`, `quizlet.md`, `linear-workflow.md`
- Surface-specific proposals: `claudehub-recommendations.md`
- External links: `resources.md`
