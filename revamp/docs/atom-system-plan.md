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

## Four-concept model (locked)

```
Start effects  — moment accents fired at sequence START
Phases         — what the electron is doing (state primitives)
Transitions    — how adjacent phases blend at the seam
End effects    — moment accents fired at sequence END
```

Phases and Transitions are **locked**. Start + End effects are walking through now.

**Unified moment-accent catalog (locked):** Start effects and end effects share ONE catalog. Each accent declares whether it works `forward` (valid at end), `reverse` (valid at start, auto-reversed time function), or both. Symmetric accents (fade ↔ appear, burst) live as one entry with `at: 'start' | 'end'` selecting the direction. Asymmetric accents (target-hit, activate, spawn-portal) only valid at the side where they semantically make sense.

```ts
type MomentAccent = {
  name: string
  forward: boolean   // valid at sequence END
  reverse: boolean   // valid at sequence START (runtime auto-reverses time fn)
  // ... per-accent params (intensity, duration, target, etc.)
}

type AccentInstance = {
  accent: MomentAccent
  at: 'start' | 'end'
  delayMs: number    // delay-from-sequence-edge
  duration: number
}
```

**Stacking:** Multiple accents can fire at the same edge (start or end), stacked or micro-sequenced via `delayMs`. Example: `target-hit` at end+0ms, `activate` at end+80ms, `fade` at end+200ms.

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
- `target` — destination point. Coordinate system is explicit:
  ```ts
  target: {
    space: 'nucleus' | 'canvas' | 'viewport' | 'dom-ref'
    value: Vec3 | { x: number; y: number } | DOMRef
  }
  ```
  - `'nucleus'` — relative to current nucleus position (default for in-atom motion)
  - `'canvas'` — absolute within the R3F canvas frame
  - `'viewport'` — viewport-relative pixels (translated to canvas coords by the runtime). **Required for departure / arrival use cases that travel off-screen.**
  - `'dom-ref'` — anchor on a DOM element (e.g. an award badge, a panel)
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
- Continuous scalar `0.0 ↔ 1.0`
- `0.0` = minimum window (tightest allowable arc, snappy seam — but never zero, see floor below)
- `1.0` = maximum window (most generous arc, gradual blend, deepest speed shaping)

**Window length formula (LOCKED):**
```
windowMs = transitionWindow · 0.5 · min(durLeft, durRight)
```
Then clamp `windowMs ≥ MIN_WINDOW_MS` (the floor representing the user's minimum corner radius).

The `0.5 · min(...)` factor guarantees the window can never consume more than half of either adjacent state, so each state retains ≥ 50% of its duration as un-blended motion. No silent overflow. No surprise behavior on short states.

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

**Foreseeable escape hatch (deferred — do NOT implement preemptively):** If a future use case wants a wide-arc geometry without the speed dip — e.g. an `activate` end effect where the electron should *slam* into the target — `transitionWindow` alone can't express it (the rule couples speed-shaping to window length). At that point, expose `speedShaping ∈ [0,1]` as a per-boundary override, default = follows window length. Until a real use case demands it, this stays as a record-only note.

---

## 3. End effects (in progress — walking through)

Fired at sequence END only (or sequence START for reversible accents). Lives in the unified moment-accent catalog above. Per accent: `at`, `delayMs`, `duration` come from `AccentInstance`; per-accent constants are below.

### `target-hit` — landing flash on impact

**Scope:** coupled both-side flash. Electron's halo blooms AND target glows in the same frame — two halves of one moment.

**Constants:**
- `electronIntensity` — peak halo-bloom multiplier on the electron itself, `[0, 2]`
- `targetIntensity` — peak glow-spread multiplier on the target, `[0, 2]`
- `color` — defaults to electron `head` color (the electron is what arrived; the flash is its energy released). Optional per-instance override for cases where the brand wants the target to dictate the color (e.g. an award medal with its own gold tone).

The two intensity knobs are independent so the user can express asymmetric impact moments — e.g. soft electron + bright target ("the target was ready, just needed activation"), or bright electron + subtle target ("the electron delivered all the energy"). Lab UI may surface them as two sliders, or one slider + a "link/unlink" toggle, depending on layout. Data shape stays 2 knobs.

**Future refinement (recorded, not implemented):** The richer behavior the user described is a **chromatic-shockwave**: at the contact site, electron color is dominant; as the glow propagates outward into the target, it transitions through a mixed gradient zone (blue electron + gold target = greenish via hue interpolation) and finally settles to the target's color at the outer edge. Reads like the electron "pulses through" the target, depositing its energy. Two-stop animated radial gradient with hue interpolation. **For now: simple electron-color-with-override.** Revisit when the chromatic effect can be prototyped at the transitions/end-effects lab.

### `activate` — neon-bulb flash on the target

**Scope:** target-side moment. Atom system delivers a flash burst on the target; the target then owns its own post-activation visual state (CSS class, animation loop, badge state, whatever the target's design language is). Atom system fires once and is done.

**Why pulse-on, not state-change** (decision delegated to system per user direction "I don't wanna overcomplicate how an electron interacts with an existing object"): keeping `activate` as a pulse-on moment means the atom system never holds target lifecycle. The atom dispatches a CustomEvent on the target's DOM ref (e.g. `'atom-activated'`); the target listens and updates its own state. This matches the project's EventTarget pattern (see `component-patterns.md`) and avoids cross-component state coupling.

**Constants:**
- `color` — defaults to target's accent color (the target is what's being activated, its own color is the natural primary). Falls back to electron `head` color when the target is something generic without its own tone.
- `intensity` — peak flash brightness multiplier, `[0, 2]`. Single knob (no electron-side, since `activate` is target-only).
- `spread` — glow radius from target's edge as a multiplier on the target's shorter edge. `[0, 2]`. Defaults `1.0` (glow extends ~1× the target's shorter dimension before fading).
- `decay` — locked default `sin(πt)` shape over `duration` (no per-instance knob).

### `burst` — size pulse + glow on the electron

**Scope:** electron-only. Position-locked — fires at the electron's current position; doesn't move it. Was a phase in the old model; reclassified as an end effect.

**Constants:**
- `scaleIntensity` — peak size multiplier on the electron mesh, `[0, 2]`. Decoupled from glow on purpose: lets the user express "big pop + faint glow" (mechanical punch) vs "subtle scale + bright glow" (pure energy release).
- `glowIntensity` — peak halo bloom multiplier, `[0, 2]`.
- `color` — peak/default color. Defaults to electron `head` color, optional override.
- `colorTo` — optional terminal color. If set, the burst color animates from `color` → `colorTo` across `duration`. If not set, color stays constant. Mirrors `pulsate.shiftColorAfter`.
- `decay` — locked default `sin(πt)` shape over `duration` (no per-instance knob).

### `fade` — graceful exit (reversible)

**Scope:** electron-only. Bidirectional — at sequence END plays opacity `1 → 0`; at sequence START plays reversed (`0 → 1`) and is named `appear` in the consumer-facing catalog.

**Locked principle: trails always dissipate naturally.** The electron's trail is autonomous — it has its own intrinsic decay (opacity ramp, fade texture, time-based fade-out, all in `Electron.tsx`). `fade` does NOT touch the trail. The trail handles itself regardless of any end effect. This is a system-wide invariant, not specific to `fade`.

**Constants:**
- Operates on **head + halo only**. Opacity ramps `1 → 0` (forward) or `0 → 1` (reversed).
- `withShrink` — optional boolean. If true, head + halo also shrink to zero scale alongside opacity. More dramatic exit/entrance. Defaults `false`.
- `curve` — locked default `smoothstep` (slow-fast-slow, graceful). Rate is controlled via `duration` only — no separate rate knob. If a future use case wants a different curve (linear / easeInCubic / easeOutCubic), expose `curve` as a per-instance override at that point.

**Future refinements (recorded, not implemented):**
- `trail-linger` — head fades first, trail continues for a beat then fades. Currently this is the AUTOMATIC behavior because trail is autonomous, but if we want explicit control over the trail's post-fade lifetime, it'd grow a knob.
- `scatter` — electron breaks into particles that scatter outward and fade. Complex; defer.

---

## Moment-accent summary table (start + end)

| Accent       | Side          | Valid at end | Valid at start | Bidirectional name |
|--------------|---------------|--------------|----------------|---------------------|
| `target-hit` | both          | yes          | no             | —                   |
| `activate`   | target        | yes          | no             | —                   |
| `burst`      | electron      | yes          | yes (symmetric — looks the same reversed) | — |
| `fade`       | electron      | yes          | yes            | `appear` (when `at: 'start'`) |
| `spawn-portal` (deferred) | electron | no | yes        | — (start-only)      |
| `ignition` (deferred) | electron | no | yes            | — (start-only)      |

## Start effects — wrapped

Start effects reuse the unified catalog. Of the locked accents:
- **`appear`** — `fade` played in reverse (`at: 'start'`). Head + halo opacity `0 → 1`, optional `withShrink`, smoothstep curve.
- **`burst`** — symmetric; valid at start with the same constants as end-side burst.

Start-only accents (`spawn-portal`, `ignition`) are **deferred** — recorded as candidates, not yet designed. Revisit when a concrete use case requires one. Same deferral gate as the color system, consumer trigger API, and the `speedShaping` escape hatch.

The named consumer use cases (logo, quiz reward, award activation, departure/arrival, panel highlight, Genius celebration, modal entrance/exit) all read fine with just `appear` + `burst` available at sequence start.

---

## Lab page architecture (LOCKED — implementation-ready)

### Routes (locked)

- `/labs/atom-states` — States lab. Pick one state, tweak its constants, watch it run in isolation.
- `/labs/atom-transitions` — Transitions lab. Pick two adjacent states + a boundary, sweep `transitionWindow`, watch the seam.
- `/labs/atom-blend-test` — **retired**. The original prototype that proved hand-rolled smoothstep can't achieve C1 between orbit-like and lerp-like phases. Its diagnostic UI was the seed for the two new labs. Delete the file when the new labs ship.

All three live outside `AppShell` (same pattern as `/signin`) — no topbar, no floating navbar. The lab is a stage for testing.

### Layout (locked)

```
┌──────────────────────────────────────────────┐
│                                              │
│                                              │
│              R3F CANVAS (fills viewport)     │
│                                              │
│                          ┌──────────────────┐│
│                          │ user controls    ││
│                          │ (top-right card) ││
│                          │ collapsed = icon ││
│                          │ on mobile        ││
│                          └──────────────────┘│
│                                              │
│                                              │
│  build·commit  |  route  |  viewport  |  ts  │  ← HUD line 1
│  [active config compact]                     │  ← HUD line 2
│  [math state, 30Hz refresh via DOM write]    │  ← HUD line 3
│  [last 5 events]                             │  ← HUD line 4
└──────────────────────────────────────────────┘
```

- **Canvas:** fills `100dvh × 100vw`. R3F renders here. Frameloop = `'demand'`.
- **User controls card:** floating, top-right, ~280px wide on desktop. On mobile (`<700px`), collapses to a single icon (◀) by default; tap to expand into a full sheet that slides from the right edge. The card is the only surface the user actively tweaks.
- **HUD:** fixed to the bottom edge of viewport. Full-width. 4 lines of monospace, ~10px / 0.7rem, low opacity (`color: rgba(white, 0.55)` on dark backdrop or `rgba(black, 0.55)` on light), no background fill. The eye skips it; the camera captures it. Survives card collapse, viewport resize, scroll, sliding sheets.

### HUD contents (LOCKED)

Four lines, always rendered, in this order:

```
Line 1:  build·{7-char-commit}  |  route·{path}  |  viewport·{w}×{h}  |  t·{HH:MM:SS}
Line 2:  cfg·{compact serialization of every user-set parameter}
Line 3:  math·{phase}·{stateName} t={t.toFixed(3)} |v|={vMag.toFixed(2)} {extra-metrics}
Line 4:  evt·{newest first, 5-deep, format: t·{relSec}s {action}}
```

Refresh rate per line:
- Line 1: every route change + every 1s (timestamp ticks)
- Line 2: every config change
- Line 3: 30Hz, written via direct DOM `textContent` mutation (NOT React state) — same pattern that eliminated frame-time pressure in the old `atom-blend-test`
- Line 4: every event, prepended

### Controls per lab (LOCKED)

**States lab (`/labs/atom-states`):**
1. State type picker — radio: `orbit | straight | spiral | pulsate | pause`
2. Per-state constants section (changes based on selected type — only the active state's knobs render)
3. "Replay" button — re-runs the state from t=0
4. Color picker — separated card section (color is its own concern per user direction)

**Transitions lab (`/labs/atom-transitions`):**
1. State A picker — radio: which state runs first
2. State B picker — radio: which state runs second (with composition-rule validation; e.g. `spiral.inward` only enabled if A is `orbit`)
3. `transitionWindow` slider — `[0.0 ↔ 1.0]`, default `0.5`
4. "Replay" button — re-runs the A→B sequence
5. Boundary chips (live) — green/yellow/red dots on |Δv|/peak% as the seam plays. Same pattern as the retired blend-test page.

### Logging feedback to me (LOCKED)

The screenshot is the primary debug-feedback channel. The HUD is what I read from a screenshot. Two supplementary logging surfaces:

1. **Hidden DOM node** — `<div data-atom-debug-context aria-hidden="true" style="position:absolute;left:-9999px;">…JSON of full debug state…</div>` — A future "long-press to copy debug context" affordance can surface this. For now, just present in the DOM so phone screenshots that capture page source (HTML view) include it.

2. **`console.debug` every 1s** — full debug context as JSON. Useful when laptop is connected to phone via remote DevTools. Non-load-bearing — phone-only screenshots are still the primary channel.

3. **Console error/warn on validation failures** — e.g. `spiral.inward` configured after a non-`orbit` state should `console.warn(...)` AND surface in the HUD's event log.

### Mobile-first checklist

- Tap target ≥ 44pt for all controls (HIG floor).
- Card collapse-to-icon below 700px viewport width.
- Canvas takes 100dvh (not 100vh — accounts for iOS dynamic chrome).
- HUD always 4 lines, bottom-aligned, never scrolls out of frame.
- No native confirm() / alert() (project rule, see `feedback_two_tap_delete.md`).
- `prefers-reduced-motion` gate respected — render the static end-state of the selected state/transition with no animation.

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

**Why NOT a unified `transformFn(t) → SE(3) + scale` (locked for the 5 STATES):** A unified function looks tidier but forces every state to construct a full 7-tuple per frame when most only need to set one field — a real perf cost in `useFrame` at 60Hz. The split mirrors Three.js's own `Object3D.position` / `Object3D.quaternion` / `Object3D.scale` API and reflects the actual semantic split: `pulsate` varies scale not position; `orbit` varies position not scale. Project pitfall #14 (parallel over unified) applies. Do not collapse this into a single unified transform.

**Subject to growth at end-effects walkthrough.** End effects may need additional **parallel** fns — e.g. `colorFn(t, ctx)` for an `activate` neon flash, `trailFn(t, ctx)` for a `fade`. Adding parallel fns is OK and follows the same parallel-over-unified principle. What's banned is collapsing the existing position/scale split into one transform.

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

## Consumer trigger API — DEFERRED (gated on first use case)

The plan locks the internal **config shape** (states + boundaries + runtime contract) but does NOT yet specify how a consumer wires up an atom. Two patterns are on the table:

- **Declarative:** `<Atom config={cfg} trigger={isOpen} />` — animation is a pure function of state. Easier to reason about, easier to test, plays well with React's render cycle.
- **Imperative:** `const ref = useRef<AtomHandle>(); ref.current?.play(cfg)` — fire-and-forget. Useful for "play this animation right now without changing app state" (error shake, success pulse, quiz-pass celebration).

Likely outcome: support BOTH. Declarative as the default; imperative escape hatch via `useImperativeHandle` for visual-response moments where state shouldn't persist. See `_resources/component-patterns.md` for the pattern.

**Decision deferred until the first concrete preset lands** (probably quiz reward). At that point, pick a default and lock the API. Same gating pattern as the color system.

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

### Known risks (recorded — to validate at implementation, not block design)

- **Trail rendering across speed-shaped boundaries.** The current `Electron.tsx` samples positions every frame; speed shaping makes the electron slow at corners, which bunches trail vertices. May read as anticipation (good) or as a visual clump (bad). **Validate at the transitions lab before shipping the first preset.**
- **Plane-blending policy** for `orbit(plane=A) → orbit(plane=B)` is unspecified. Old `phase-types-reference.md` had a `plane: 'morph'` mode; the new spec dropped it. If any future use case wants converging-orbit choreography, this gap surfaces. **Stub a decision when it surfaces (likely "interpolate plane normal across the transition window" or "reject same-state-different-plane sequences").**
- **Per-state trail variation isn't in the runtime contract.** Trail config currently lives per-electron (`{ head, halo, trail }` colors + an opacity ramp). The plan does not specify whether a state can override trail behavior — e.g. tighter trail during `spiral.inward`, longer trail during `straight`, suppressed trail during `pulsate`. If it turns out the design needs per-state trail expression, the runtime contract grows a third fn (e.g. `trailFn(t, ctx) → TrailParams`). Validate at the states lab when trail variation becomes a concrete request.
- **Default `transitionWindow` value may need to land below the midpoint.** The locked formula (`windowMs = transitionWindow · 0.5 · min(durLeft, durRight)`) caps the window at 50% of the shorter adjacent state — that's the upper bound, not a default. Framer Motion / GSAP-style libraries typically default to ~20–30% of the shorter span. At `transitionWindow = 0.5` (midpoint), two equal-duration states yield a 25% window each side, which is in the right neighborhood — but the *default user-facing value* may want to land lower (e.g. `0.4`) if the midpoint reads sluggish. **Validate at the transitions lab; pick the default after sweeping it on real boundaries.**

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

## Next-session execution plan (autonomous chunks)

The user has authorized autonomous chunked execution of the lab pages, deploying after each chunk so phone review is possible. Re-entry protocol when the user says "continue":

1. Read this file (you are here).
2. Read `STATE.md` only if this section's chunk-tracker is missing — otherwise, the chunk-tracker below is authoritative for what's next.
3. Pick the top **NOT DONE** chunk. State it in one sentence. Start building.
4. After each chunk: commit + push. Auto-deploy via `.github/workflows/deploy-pages.yml`.
5. Only stop and ask the user if a Tier 3 violation surfaces (see `electron-motion` skill) or an unplanned design decision appears.

### Chunk tracker

```
[ ] Chunk 1 — HUD primitive component
    - revamp/src/ui/atom/AtomLabHud.tsx + .module.css
    - 4 lines (build / config / math / events), low-opacity monospace, bottom-pinned
    - Props: { config: object; mathRef: MutableRef<MathState>; events: Event[] }
    - Math state writes via direct DOM textContent at 30Hz (NOT React state)
    - Pull commit hash from import.meta.env.VITE_GIT_COMMIT (set up below)

[ ] Chunk 2 — Build-time commit-hash injection
    - vite.config.ts: define VITE_GIT_COMMIT = first 7 chars of `git rev-parse HEAD`
    - Falls back to "dev-local" if git command fails
    - HUD reads from import.meta.env.VITE_GIT_COMMIT

[ ] Chunk 3 — States lab (/labs/atom-states)
    - State picker (radio: orbit | straight | spiral | pulsate | pause)
    - Per-state controls panel (top-right floating card, collapse-to-icon below 700px)
    - Color picker (separate sub-section)
    - Replay button
    - Mounts <AtomLabHud /> with current state config
    - Math state populated from the running state's positionFn/scaleFn output

[ ] Chunk 4 — Transitions lab (/labs/atom-transitions)
    - State A picker, State B picker (with composition-rule validation — disable invalid combos)
    - transitionWindow slider (default 0.5)
    - Replay button
    - Boundary chips (live |Δv|/peak% indicator, green/yellow/red — same pattern as old blend-test)
    - Mounts <AtomLabHud />

[ ] Chunk 5 — Retire /labs/atom-blend-test
    - Delete revamp/src/pages/LabsAtomBlend.tsx + .module.css
    - Remove the lazy import + route from App.tsx
    - Don't lose the velocity-spike fix (dt floor + warmup) — port any still-useful bits into the new labs first

[ ] Chunk 6 — Polish + reduced-motion gate
    - prefers-reduced-motion: render the static end-state; HUD still renders
    - aria-hidden="true" on Canvas
    - 44pt tap targets verified
    - 100dvh canvas verified on iOS

[ ] Chunk 7 — Update STATE.md
    - Mark lab redesign chunks done
    - Surface next workstream (likely first preset deployment)
```

Mark chunks done by changing `[ ]` to `[x]`. Commit message format: `feat(atom-lab): chunk N — short title`.

### Decisions already locked (don't re-ask)

The user has explicitly delegated lab redesign decisions to me. The decisions are above in "Lab page architecture (LOCKED — implementation-ready)". Don't re-ask:
- HUD position (bottom edge, 4 lines)
- Card position (top-right, collapse-to-icon below 700px)
- Refresh rate per HUD line (30Hz for math, event-driven otherwise)
- Default `transitionWindow = 0.5`
- 100dvh canvas
- Replay buttons exist on both labs

The user will only interrupt if a Tier 3 violation appears or a genuinely unplanned decision shows up.

---

## Standing question (next reply)

This conversation's standing Q ("End-effects walkthrough next?") is now resolved — end effects are locked. There's no open Y/N. Next session continues from the chunk tracker.
