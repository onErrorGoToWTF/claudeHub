---
title: Atom Animation System — Locked Design
status: active
last_updated: 2026-04-25
supersedes: atom-choreography-spec.md (older 4-phase taxonomy)
---

# Atom Animation System — Locked Design

This is the source-of-truth plan for the atom/electron animation system. Captures every locked decision from the directed-flow design conversation. Read this before writing any code in `revamp/src/ui/atom/`.

The user is directing the design flow strictly: one closed-ended Y/N question at a time, plain English, suggestion made. Don't get ahead.

---

## North star

A reusable atom-system library deployable across the app. One small set of well-defined primitives + composition rules → any motion the app needs.

**Named consumer use cases** (used to validate completeness):
- Topbar logo (existing animation, will rebuild on this system)
- Quiz reward (small celebration on quiz pass)
- Award activation ("activates a word or award with neon bulb flash")
- Page-traversal departure (motion exits one screen)
- Page-traversal arrival (motion enters next screen and activates target)
- Panel highlight (small attention pull)
- Genius (A+) celebration (multi-electron, longer)
- Modal entrance / exit

---

## Three-concept model (locked)

```
Phases       — what the electron is doing (state primitives)
Transitions  — how adjacent phases blend at the seam
End effects  — terminal accents fired at sequence END only
```

Phases and Transitions are **locked**. End effects haven't been walked through yet — that's the next conversation.

---

## 1. Phases — the 5 electron states (locked)

Five states, finalized. The electron is the living thing; it transforms between states. Every state has a defined start/end point and a duration.

### State 1 — `orbit`

Unified circle + ellipse. A circle is just an orbit with `aspect = 1.0`.

**Tunable constants:**
- `size` — orbit radius (single knob; aspect produces ry from rx)
- `aspect` — 1.0 = circle, <1 or >1 = ellipse stretched along one axis
- `revolutions` — how many laps before exiting the state
- `duration` — total time in this state
- `plane` — orientation of the orbit in 3D (`{ rx, ry }` derived; tilt angle expressible via plane normal). Two dimensions sufficient — no third dimension needed for our use cases.

**Notes:**
- Orbits anchor on a nucleus center (real or virtual).
- "Spiral inward" is only valid AFTER an orbit state (needs the nucleus center).

### State 2 — `straight`

Linear travel from current position to a target. The electron *draws* the line — the line is a fading trail behind a moving electron, never an instant line stroke. The electron is the living thing.

**Tunable constants:**
- `target` — destination point (absolute or relative-to-nucleus)
- `duration` — total time in this state

**Start-point behavior:**
- If a previous state exists, start point = previous state's end point (smooth handoff is the transition's job).
- If this is the first state of the sequence, the electron appears at the start point and begins drawing immediately. No instant pre-drawn line.

### State 3 — `spiral`

Orbit with shrinking (or growing) radius, collapsing to / expanding from a point.

**Tunable constants:**
- `direction` — `'inward'` | `'outward'`
- `revolutions` — how many laps during the spiral
- `duration` — total time

**Composition restrictions (FLOW RULES):**
- `spiral.inward` can ONLY follow an `orbit` state (needs an existing nucleus center to spiral into).
- `spiral.outward` can ONLY follow an "at point" state (`pause`, `pulsate`, end of `straight`, end of `spiral.inward`).

These are hard rules, enforced at config-validation time.

### State 4 — `pulsate`

Stationary scale-pulse in place. No translational motion; only `scaleFn` varies. Forces the runtime to support a dual `positionFn` + `scaleFn` contract.

**Tunable constants:**
- `intensity` — peak scale multiplier
- `pulses` — number of pulses
- `duration` — total time
- `shiftColorAfter` — optional. After N pulses, change electron color. Subsequent pulses are in the new color. (Default colors set later — color system is a separate concern.)

### State 5 — `pause`

Stationary hold at current position. Renders nothing new — keeps the electron at its last point for the duration. Useful as a beat between states.

**Tunable constants:**
- `duration` — total time

---

## Composition rules (locked)

```
orbit       → any
straight    → any
spiral.in   → must come AFTER orbit
spiral.out  → must come AFTER an "at point" state (pause, pulsate, end of straight, end of spiral.in)
pulsate     → any (any → pulsate, pulsate → any). Spatial constancy means transitions in/out are trivial.
pause       → any
```

Smooth handoff between states is a transition concern, not the state's concern.

---

## 2. Transitions — single-knob `transitionWindow` (locked)

**Mental model (locked clarification):** Smoothness is fixed at maximum — there is no smoothness knob. The user knob controls **how much time / distance the transition gets to happen in**. Short window → tighter arc (reads as "sharp"). Long window → wider arc (reads as "gradual"). The arc shape is a derived consequence of the available window, not the thing being dialed.

The user never sees C0/C1/Hermite/smoothstep terminology. They see one knob.

**The user-facing knob: `transitionWindow`**
- Continuous scalar `0.0 ↔ 1.0` (or expressible as a fraction of adjacent state durations)
- `0.0` = minimum window (tightest allowable arc, snappy seam — but never zero, see floor below)
- `1.0` = maximum window (most generous arc, gradual blend, deepest speed shaping)

**Internal mapping (math hidden from user):**
- `curve ↔ curve` boundary (orbit↔orbit, orbit↔spiral, spiral↔spiral): smoothstep on inner phase. Window has subtle effect (mostly speed shaping).
- `curve ↔ straight` boundary: Hermite cubic spanning the window. Window length directly sets corner-fillet radius.
- `straight ↔ straight at angle`: fillet arc + slow-into-corner / speed-out-of-corner. Window scales fillet radius and speed-dip depth.
- `pulsate ↔ anything`: trivial (no positional change at pulsate boundary).
- `pause ↔ anything`: also trivial geometrically; speed must ramp from/to zero.

**Window floor (locked):**
The minimum window is never zero. A `transitionWindow = 0.0` straight↔straight turn still has a slight curve. Quote: "sharp turns or transitions will likely never be ZERO rounded corners. My low radius for corners should be the minimum 'sharpness' for a line turning." Translate that radius into a minimum window length and clamp.

**Two implementation dimensions per boundary (internal):**
1. **Path geometry** — how the spatial curve rounds across the window.
2. **Speed shaping** — `s_path = f(s_time)` time-reparameterization. Velocity magnitude dips approaching corners and accelerates leaving them. Animation principle of anticipation + follow-through.

Don't ship transitions with geometric smoothness but no speed shaping. Both dimensions or neither.

**Lab strategy:** Transitions get their **own diagnostic page**, separate from the states lab. User quote: "transitions should be separate from the labs dev page from the states. I will work on them separately."

---

## 3. End effects — NEXT (not yet walked through)

The third leg of the model. Fired at sequence END only — never at intermediate boundaries.

Candidates floated so far:
- `target-hit` — landing flash when an electron arrives at a destination
- `activate` — "neon bulb flash" that lights up a target word/award/panel
- `burst` — brief size pulse + glow (was a phase in old model — reclassified as end effect)
- `fade` — graceful exit, electron dissolves

This is the next conversation. The walkthrough is gated on user `Y` to the standing question.

---

## Lab page architecture (locked principles)

### `/labs/*` is escape-hatch territory

- Routes outside `AppShell` (same pattern as `/signin`)
- No topbar, no floating navbar
- Stage for testing only

### Two-layer UI pattern

**Layer 1 — User controls (HIG-clean, minimal):**
- Only the things the user is actively tweaking (color picker, mode selector, transitionWindow slider).
- Hover-collapse card overlay so the canvas can fill the viewport on mobile.
- Color is its own thing, somewhat separated from other controls.

**Layer 2 — Always-rendered HUD (peripheral, debug-complete):**

The HUD's job is to be IN every screenshot the user sends, NOT visible to them during normal interaction. Small monospace, low opacity, edge-pinned. The eye ignores it; the camera captures it.

The act of screenshotting IS the feedback mechanism. No toggle, no "diagnostic mode."

**HUD must contain at all times:**
1. **Build identifier** — short git commit hash (first 7 chars), embedded at build time.
2. **Active config** — every user-set parameter that affects the canvas (e.g., `B1·smooth B2·smooth B3·smooth`).
3. **Math state at capture moment** — current values of every sampled metric. For atom-blend-test: t, phase, |v|, Δ|v|/peak ratio, per-boundary chip readings.
4. **Phase / state label** — current mode/phase/state.
5. **Rolling event log** — last 3–5 discrete events (phase change, boundary worst-case update, blend mode change, error).

The HUD survives panel collapse, viewport resize, scroll, and sliding sheets. It's the floor of always-visible diagnostic info.

### Two separate diagnostic surfaces planned

- **States lab** — pick a state, set its constants, watch it run in isolation. No transition complexity.
- **Transitions lab** — pick two adjacent states + a boundary, sweep `transitionWindow`, watch the seam. Inherits HUD logging of `end-of-state-N` and `start-of-state-N+1` values per boundary.

---

## Runtime contract (locked)

Each state is implemented as a function pair:

```ts
type StateRuntime = {
  positionFn: (t: number, ctx: StateContext) => Vec3   // 0 ≤ t ≤ 1
  scaleFn:    (t: number, ctx: StateContext) => number // multiplier on base scale
}
```

The dual contract is forced by `pulsate` (which has constant position but varying scale). Every state implements both — most are no-ops on one side.

`StateContext` carries:
- The state's tunable constants (size, aspect, target, etc.)
- The previous state's end position + tangent (for smooth handoff)
- The nucleus position (for orbit/spiral anchoring)
- The plane / orientation

---

## Default motion policy (locked, applies to all consumer use cases)

- `respectReducedMotion: true` — render static end-state if user has prefers-reduced-motion
- `pauseOffscreen: true` — IntersectionObserver pause when canvas off-screen
- `oneShot: true` — no autoplay loops (override only for landing decoration)
- `frameloopMode: 'demand'` — R3F stops rendering after the sequence settles

---

## Color system — DEFERRED

User: "We will set default colors eventually."

Not yet designed. Treat as a separate concern. For now, every electron carries `{ head, halo, trail }` colors. Pulsate may include a `shiftColorAfter` to mid-sequence change colors, but the design of the palette itself is later.

---

## Open work / pending

### Background sync — BLOCKED
- Spec doc `revamp/docs/atom-choreography-spec.md` updated by background agent (uncommitted, sitting on `main`).
- 10 skill files under `.claude/skills/electron-motion/**` could not be edited — sandbox permission denied.
- **Action needed:** user grants edit permission for `.claude/skills/electron-motion/**`, then I'll finish the 10 files + commit + push the whole sync in one shot. Holding the spec-doc commit until then so the commit message stays truthful.

### Genius / architecture review — pending post-sync
Four discriminating questions to put to advisor + architecture-review skill:
1. Is the 5-state taxonomy minimal-and-complete for the named use cases (logo, quiz reward, departure, arrival-activate, panel highlight, Genius celebration)?
2. Does single-knob `transitionWindow` collapse cleanly to a boundary-strategy table without losing range?
3. Does the `positionFn`/`scaleFn` dual-contract for `pulsate` generalize, or is it a wart?
4. Where does this design fail first in implementation?

### Other
- End effects — **next conversation**, gated on user Y/N.
- Lab redesign — hover-collapse card overlay + HIG-leaning + always-rendered HUD with commit hash + config + math state + rolling event log.
- States lab vs transitions lab as separate diagnostic surfaces.
- Color system design (deferred).
- Speed-shaping prototype.
- First preset deployment (gated on a concrete consumer use case, e.g. quiz reward).

---

## What's already shipped (do not redo)

- `revamp/src/ui/atom/constants.ts` — ELECTRON / ATOM / LOGO / Rgb type alias.
- `revamp/src/ui/atom/Electron.tsx` — primitive component + helpers (`easeOutCubic`, `smoothstep`, `orbitPos`, `orbitPosMorphed`, `makeFadeTexture`).
- `revamp/src/ui/atom/Atom.tsx` — Canvas + group rotation + reduced-motion gate + `idle`-driven frameloop demand switch.
- `revamp/src/ui/atom/AtomLogo.tsx` — wordmark layers + i-dot landing math + strike/glow/university/rest ramp.
- `revamp/src/pages/LabsAtomBlend.tsx` + `.module.css` — current diagnostic prototype (will be redesigned per the lab principles above).
- `/labs/*` routes escape `AppShell` in `revamp/src/app/App.tsx`.
- `revamp/docs/atom-baseline-2026-04-25.md` — verbatim record of pre-refactor tuned constants.

---

## Memory hooks (saved across sessions)

- `feedback_smoothness_over_speed.md` — extended through 5 user quotes
- `feedback_screenshot_debug_complete.md` — `/labs/*`-only HUD + two-layer pattern
- `feedback_clean_links.md` — bare URLs, one per line

---

## Standing question (next reply)

> "End-effects walkthrough next? Y / N"
