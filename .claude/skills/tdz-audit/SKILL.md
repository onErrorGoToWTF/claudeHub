---
name: tdz-audit
description: Scans js/app.js for TDZ (Temporal Dead Zone) regressions on the initial-render path. Any module-level `const` or `let` referenced from a function that fires during the initial `applyRoute()` → `applyFilter("home")` → `replayHomeAnimations()` call at L602 MUST be declared above that call, or the read will ReferenceError on first page load and silently abort the entire IIFE — killing data-chip click handlers, loadLessons, and every downstream wire-up. User-visible symptom: dashboard non-functional on first load, content only appearing after refreshing on a non-home route (refresh on #learn skips replayHomeAnimations and lets the IIFE complete past the const evaluations). This has bitten the project twice (M9.18b.1 with DASH_DUMMY_*, M9.18b.3 with SVG consts + TRACK_LABEL). Invoke this skill after: editing any render fn called from replayHomeAnimations (renderDashLearn, renderContinueCard, renderTimeline, renderCompare, renderIndex, renderScorecard, renderLlmFaceoff), adding any new module-level const/let to js/app.js, or before shipping a milestone that touches the render path. Also invoke when the user reports "doesn't work on first load / have to refresh" — that's the TDZ signature.
allowed-tools: Read, Grep, Bash
---

# TDZ-Audit for claudeHub initial-render path

Static audit that catches the "first-load crash, works-after-refresh" bug class before it ships. Two-minute check; high-signal.

## The bug pattern

`js/app.js` is one big IIFE. Inside the IIFE:

1. `applyRoute()` is invoked at ~L602 on module load.
2. `applyRoute()` → `applyFilter(hash)` → if hash is `home` (default), calls `replayHomeAnimations()`.
3. `replayHomeAnimations()` calls: `renderDashLearn()`, `renderContinueCard()`, `renderTimeline()`, `renderCompare()`, `renderIndex()`, `renderScorecard()`, `renderLlmFaceoff()`, `replayChartObservers(...)`.
4. Those render fns read module-level `const` / `let` declarations for tokens, SVG icons, dummy data, color maps, sort state, etc.
5. **If ANY of those reads hits a `const` / `let` declared AFTER L602 in file order, the initial call ReferenceError's with TDZ, unwinds to the `applyRoute()` site, and aborts the rest of the IIFE.** Everything after L602 (data-chip click handlers at L608, `loadLessons()` at L4208, scroll observers, etc.) never runs.

Function declarations (`function foo()`) are hoisted to the top of the IIFE scope regardless of file position and are immune to this.

Refresh on `#learn` / `#projects` / `#tools` **skips** `replayHomeAnimations` (only home triggers it), so the IIFE completes past the declaration site, and subsequent navigation to home works. That's why users report "refresh on Learn and go back works." It's not a cache issue — it's TDZ.

## Known past incidents

| Milestone | Symbol | Originally declared | Hoist fix |
|---|---|---|---|
| M9.18b.1 | `DASH_DUMMY_PROJECT`, `DASH_DUMMY_LESSON` | ~L3048, ~L3148 | moved to top-of-IIFE hoisted block (~L295) |
| M9.18b.3 | `PIN_SVG_OUTLINE/FILLED`, `MASTERY_SVG_OUTLINE/FILLED`, `TRASH_SVG`, `GRAB_SVG`, `TRACK_LABEL` | ~L1068-1105, ~L1696 | moved to top-of-IIFE hoisted block (~L316-330) |

Both were introduced by render-fn edits that added new identifier reads without checking declaration order.

## Audit procedure

### Step 1 — Establish the gate line

Find the `applyRoute()` call at module-IIFE level:

```bash
grep -n "^\s*applyRoute();" js/app.js
```

Record the line number as `GATE`. Any `const` / `let` declaration with line number greater than `GATE` is a TDZ risk if read from the initial-render path.

### Step 2 — Enumerate initial-render-path functions

Read the body of `replayHomeAnimations` (grep `function replayHomeAnimations`). List every `function-name()` call inside it. Typical set:

- `renderDashLearn`
- `renderContinueCard`
- `renderTimeline`
- `renderCompare`
- `renderIndex`
- `renderScorecard`
- `renderLlmFaceoff`
- `replayChartObservers`

For each, read the full function body (grep `function <name>\b` for the line, then Read from there through the closing brace).

### Step 3 — Extract referenced identifiers

Inside each function body, collect identifiers that look like module-level state:

- ALL_CAPS_WITH_UNDERSCORES (convention for consts in this repo: `TRACK_LABEL`, `PIN_SVG_OUTLINE`, `MODEL_COL`, `FACEOFF_MODELS`, `FACEOFF_BENCHES`, etc.)
- `DASH_*`, `LESSON_*`, `FINDER_*`, `LEARN_*` prefixed constants
- Camel-case `let` state: `lessonsData`, `academyCourses`, `currentLearnFilter`, `currentLearnSort`, `faceoffBenchIdx`, etc.

Filter out identifiers that are:
- Local variables (declared inside the function)
- Function parameters
- Known-hoisted function names (`function foo()` declarations — safe)
- Built-ins (`Math`, `Date`, `JSON`, `document`, `window`, `localStorage`)
- The `escapeHtml`, `navigateTo`, `openLesson`, `getProjects`, etc. helpers (all `function` declarations — hoisted)

### Step 4 — Check declaration line for each

For each identifier collected, run:

```bash
grep -n "^\s*\(const\|let\)\s\+<IDENT>\b" js/app.js
```

If the match line number is **greater than `GATE`** → TDZ violation.

### Step 5 — Report

Produce a table:

```
TDZ-Audit Report — js/app.js, gate line: <GATE>

VIOLATIONS (declared below gate, read during initial render):
  <ident>   declared L<N>   read in <fn>()   → hoist above L<GATE>

PASS: <count> module-level identifiers read during initial render, all hoisted correctly.
```

If zero violations: report `PASS` and stop.

If violations exist: print the fix guidance inline — move the `const` / `let` declaration block to the hoisted section at the top of the IIFE, leave a breadcrumb comment at the original site pointing to the new location.

### Step 6 — (optional) Runtime sanity check

If static analysis is ambiguous, open `http://localhost:8765/` in a headless check:

```bash
curl -s "http://localhost:8765/js/app.js?v=<current>" | node --check -
```

Syntax-valid is necessary but not sufficient. The bug is a RUNTIME ReferenceError, not a parse error. For a true runtime check, the user must load the page on a phone or desktop browser with dev tools open. The **definitive phone test:**

1. Fully close the browser tab (swipe away).
2. Open a fresh tab, navigate to `http://<local-ip>:8765/`.
3. Dashboard should render **immediately on first visit**, showing the dummy tile in the Projects panel (if no real projects exist) and the real lesson tiles (once `loadLessons` resolves, ~200ms). If it shows static "Loading lessons…" / "No projects in flight yet…" text that never updates → TDZ bomb.

## Quick version — one-liner spot check

When time is tight, grep the render fn bodies for suspicious identifiers and verify each:

```bash
# Dump each render fn's const/let reads (approx — manual filter required):
for fn in renderDashLearn renderContinueCard renderTimeline renderCompare renderIndex renderScorecard renderLlmFaceoff; do
  echo "=== $fn ==="
  # Read body, extract identifiers matching ALL_CAPS or known state names
done
```

Then for every suspicious identifier, grep declaration line and compare against gate.

## Do not

- Skip the audit because "the change looks cosmetic" — TDZ bombs hide in seemingly trivial edits (M9.18b introduced six of them via a one-line dummy tile fallback).
- Trust `node --check` as sufficient — it only catches syntax errors, not TDZ references.
- Assume identifiers declared "close together" are safe — file position is all that matters.
- Recommend `if (typeof FOO !== "undefined")` guards as a workaround — the correct fix is always hoisting the declaration.

## When to invoke proactively

Invoke without being asked when any of these conditions apply:

1. **Just edited a render function called from `replayHomeAnimations`.** Even a comment-only change can mask a same-commit addition of a new identifier read.
2. **Just added a module-level `const` / `let` to `js/app.js`** anywhere below L602.
3. **Before running `/milestone-deploy`** on a milestone that touches `js/app.js`.
4. **User reports "doesn't work on first load" / "have to refresh each tab" / "works after I visit X then come back".** That's the TDZ signature — always check this first before chasing other theories (cache, observer timing, async races).

## Resources

- Rule source: `CLAUDE.md` "Gotchas" section, "TDZ trap" bullet — the authoritative rule.
- Prior incidents: `docs/plans/v0.7-design-system-refactor.md` entries for M9.18b.1, M9.18b.3.
- Reference implementation: the hoisted-state block near the top of the IIFE (currently ~L287-345) is the canonical landing zone for new module-level `const` / `let`.
