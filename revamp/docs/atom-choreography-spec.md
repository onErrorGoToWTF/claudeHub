# Atom choreography — design spec

> **Status:** Draft — captures the design conversation of 2026-04-25, synced to the 5-state model. Not yet implemented.

The atom system has graduated from "the topbar logo" to a reusable building block we want to drop into many surfaces (quiz rewards, award activations, panel highlights, modal entrances, departures from one screen region to another). This spec captures the API and underlying mechanics so future deployments compose without re-deciding any of this.

The phase-blend prototype at `/labs/atom-blend-test` empirically validated the math foundation; this spec is the next layer up — the consumer-facing vocabulary.

## Three orthogonal concepts

Every atom motion is composed from three building blocks. They compose independently — change one without touching the others.

```
1. States       — path primitives (orbit, straight line, spiral, pulsate, pause)
2. Transitions  — how the seam between two adjacent states is rendered
3. End effects  — terminal accents at the very end of the sequence
```

A consumer writes a sequence as: `states[] + transition sharpness + end effect`. The library handles every smoothness detail underneath.

## State types

Five state primitives. Each defines a parametric position function `positionFn(s)` and a scale function `scaleFn(s)` over state-internal time `s ∈ [0, 1]`. `scaleFn` defaults to a constant `1.0` for every state EXCEPT `pulsate`. Real time is provided per-state as `durationMs` at sequence level.

States divide into two usage groups:

- **Movement** (path traversal): `orbit`, `straight line`, `spiral`
- **Stationary** (hold position): `pulsate`, `pause`

### `orbit`

Electron travels along an orbit around the nucleus. Subsumes both circular (`aspect = 1`) and elliptical (`aspect ≠ 1`) cases — they are NOT separate states. The 3D-ness comes from `plane`, not a third radius.

```ts
{
  type: 'orbit'
  size: number                // base radius, world units
  aspect: number              // ry/rx ratio. 1 = circle. Any other positive = ellipse.
  revolutions: number         // how many laps in this phase
  duration: number            // ms
  plane?: 'xy' | 'yz' | 'xz' | 'morph'   // default: 'xy'
  startAngle?: number         // radians; default: inherits from prior phase
}
```

Internally: `rx = size`, `ry = size · aspect`. Position: `P(s) = (rx·cos(θ), ry·sin(θ), 0)` where `θ = 2π·revolutions·s + startAngle`. Tangent is nonzero throughout; intrinsic angular velocity is uniform. Exit type: **on orbit**.

### `straight line`

Electron travels in a straight line from its current position to a target.

```ts
{
  type: 'straight line'
  target: Target              // see Targets section
  duration: number            // ms
}
```

Start position inherits from the previous state's exit, or from sequence-level `entryFrom` if this is the first state. Position: `P(s) = lerp(P_start, target, e(s))` where `e` is the time-base shaper supplied by the transition system (the sharpness knob).

**Caveat:** `straight line` is the only state type whose intrinsic velocity is mechanically straight rather than orbital. Boundaries between `straight line` and any orbital state would produce visible angles without the smoothness guarantee — but the runtime ALWAYS rounds them via Hermite cubic + tangent matching. The sharpness knob only adjusts how quick or gradual that rounding is. Exit type: **at point**.

### `spiral`

Electron orbits with shrinking or growing radius around a center.

```ts
{
  type: 'spiral'
  direction: 'inward' | 'outward'
  revolutions: number         // how many laps during the spiral
  duration: number            // ms
  plane?: 'xy' | 'yz' | 'xz'
}
```

`inward` collapses radius `1 → 0` toward a center inferred from the next state's start point or sequence target. `outward` grows radius `0 → r` from a center inferred from the previous state's exit point. Position uses the proven `orbitPosMorphed` math from the existing logo.

**Flow restrictions (HARD rule, validated at sequence build time):**
- `spiral.inward` MUST follow an "on orbit" exit: `orbit` or `spiral.outward`.
- `spiral.outward` MUST follow an "at point" exit: `straight line`, `spiral.inward`, `pulsate`, `pause`, or sequence start.

Exit type: `inward → at point`, `outward → on orbit`.

### `pulsate`

Electron holds position; its scale oscillates over the duration. May shift to the next themed color partway through.

```ts
{
  type: 'pulsate'
  intensity: number           // peak scale multiplier (e.g. 1.5 = 1.0 → 1.5 → 1.0)
  pulses: number              // how many oscillation cycles
  duration: number            // ms
  shiftColorAfter?: number    // optional 0..1; at this fraction, head/halo/trail crossfade to next themed color
}
```

`positionFn(s) = P_start` (constant). `scaleFn(s) = 1 + (intensity - 1) · |sin(π · pulses · s)|` (or a smoothed cosine variant — runtime picks the curve; always returns 1.0 at s=0 and s=1 so boundaries are clean).

**Why this state breaks the position-only contract:** `pulsate` is the reason every state's runtime contract has TWO functions, `positionFn(s)` AND `scaleFn(s)`. All other states default `scaleFn(s) = 1.0`. `pulsate` is the only state that actively writes scale.

Exit type: **at point**.

### `pause`

Electron holds position. No motion, no scale change, no color change.

```ts
{
  type: 'pause'
  duration: number            // ms
}
```

`positionFn(s) = P_start`, `scaleFn(s) = 1.0`. C1-compliant on both boundaries by default. Exit type: **at point**.

## Transitions — one knob

A transition is what happens at a boundary between two adjacent states. Position is always continuous (C0) at every boundary; the runtime additionally GUARANTEES geometric smoothness via Hermite cubic + tangent matching + minimum-radius arc. There is a non-zero minimum corner radius — "sharp" never means literal angle.

ONE user-facing knob per transition:

```ts
sharpness: number   // 0.0 = gradual / 1.0 = quick; continuous range
```

- `gradual` (toward 0.0) — looser arc, longer window, slower traversal through the corner.
- `quick` (toward 1.0) — tighter arc, shorter window, faster traversal through the corner.

**Where sharpness matters:** boundaries involving a `straight line`. Those are the only places the corner geometry is exposed.

**Where sharpness is a no-op:** curve↔curve boundaries — `orbit↔orbit`, `orbit↔spiral`, `spiral↔spiral` — are inherently smooth via shared angular velocity at the seam. The sharpness knob is ignored there; the seam is always C1 by construction.

### Sequence-level vs per-boundary

```ts
transitions: number | number[]    // single sharpness, or per-boundary array
```

Default sharpness is `0.5` (a balanced rounding). Override per-boundary by passing an array of length `states.length - 1`.

## End effects

Fire at the very end of the sequence, on the last state's exit. NOT at intermediate boundaries. End effects are a separate concept from states — they cannot appear mid-sequence.

```ts
type EndEffect =
  | { type: 'target-hit'; flash: 'aiPulse' | 'subtle' | 'none' }
  | { type: 'activate'; targetRef: DOMRef; flash: 'neon-bulb' | 'gentle-glow' }
  | { type: 'burst'; intensity: number; durationMs: number }
  | { type: 'fade'; durationMs: number }
```

- `'target-hit'` — flash + halo at the electron's final position. The current logo's strike pulse pattern (`aiPulse1/2/3` keyframes); reuses the existing CSS / shader assets.
- `'activate'` — neon-bulb pulse on a DOM target (a word or icon lights up + glows). The DOM target is independent of the electron's final position; the electron arrives, the target lights up. Uses CSS animation on the target ref.
- `'burst'` — one-shot scale pulse on the electron itself at sequence end. Reclassified from a state to an end effect: `burst` is no longer a phase, it is purely terminal. No target interaction.
- `'fade'` — silent dissolution. Electron opacity ramps to 0 over `durationMs`. Used when the atom is decorative and shouldn't draw attention to its termination.

## Targets

```ts
type Target =
  | [number, number, number]           // literal Vector3 in scene coords
  | { domRef: React.RefObject<HTMLElement> }  // resolves to scene coords via projectPixelToLocal
  | 'center'
  | 'offscreen-left' | 'offscreen-right' | 'offscreen-top' | 'offscreen-bottom'
  | { container: 'topbar-i-dot' | 'modal-center' | ... }  // named app positions
```

DOM-ref targets resolve at sequence start (one `getBoundingClientRect()` + the existing `projectPixelToLocal` math from `AtomLogo`). They do NOT re-resolve mid-sequence — if the target moves during the animation, the electron flies to its starting screen position. Resolving per-frame would add layout-thrash risk and isn't needed for any current use case.

> Open question: **does `'activate'` need a way to time the target's flash to the electron's arrival?** If the electron arrives at frame T and the target's CSS flash starts at frame T+1, there's a 16ms visual gap. Probably fine, but worth phone-review confirmation at first deployment.

## Three worked examples

### Sequence 1 — "departure" (orbit then leave to a target)

```ts
const departure: AtomSequence = {
  states: [
    { type: 'orbit', size: 1.0, aspect: 1.0, revolutions: 2, duration: 1500 },
    { type: 'orbit', size: 1.4, aspect: 0.6, revolutions: 1, duration: 1500 },
    { type: 'straight line', target: { domRef: areaRef }, duration: 800 },
  ],
  transitions: 0.5,
  end: { type: 'target-hit', flash: 'subtle' },
}
```

Boundaries:
- State 0 → 1 (orbit circle → orbit ellipse): curve↔curve boundary. Both states share angular velocity at the seam — inherently C1, sharpness knob is a no-op. The runtime smoothstep-interpolates `size` and `aspect` across the seam without disturbing the angle.
- State 1 → 2 (orbit → straight line): straight-line-involved boundary. Sharpness `0.5` produces a balanced Hermite-cubic rounding — orbit's exit tangent matched into the line's start, time-base shaped so the electron decelerates into the corner and accelerates out.
- Sequence end: `target-hit` flash at the electron's final position.

Total time: 3.8s.

### Sequence 2 — "arrival + activate" (fly in, orbit, spiral, light up a word)

```ts
const arrivalActivate: AtomSequence = {
  states: [
    { type: 'straight line', target: 'center', duration: 600 },
    { type: 'orbit', size: 1.4, aspect: 0.6, revolutions: 3, duration: 1800 },
    { type: 'spiral', direction: 'inward', revolutions: 1.5, duration: 800 },
  ],
  entryFrom: 'offscreen-left',
  transitions: 0.5,
  end: { type: 'activate', targetRef: wordRef, flash: 'neon-bulb' },
}
```

`entryFrom: 'offscreen-left'` is a sequence-level override placing the electron's starting position outside the canvas. The first state's `straight line` to `'center'` brings it onto the visible canvas. The spiral's collapse target is inferred from the end-effect's `targetRef`.

Boundaries:
- Sequence start → state 0: electron mounts at offscreen-left; no boundary transition.
- State 0 → 1 (straight line → orbit): straight-line-involved boundary. Sharpness `0.5` rounds the corner — Hermite cubic from the line's tangent into the orbit's tangent, time-base eases the speed transition.
- State 1 → 2 (orbit → spiral.inward): satisfies the flow restriction (spiral.inward must follow an "on orbit" exit). Curve↔curve boundary, inherently smooth. The spiral's `orbitPosMorphed` math takes over from the orbit's exit position with shared angular velocity at the seam.
- Sequence end: spiral resolves at `wordRef`, end-effect fires `activate` neon-bulb pulse on the word.

Total time: 3.2s.

### Sequence 3 — "arrival + pulsate" (fly in, hold, pulse a color shift, depart)

```ts
const arrivalPulse: AtomSequence = {
  states: [
    { type: 'straight line', target: 'center', duration: 500 },
    { type: 'pulsate', intensity: 1.4, pulses: 2, duration: 800, shiftColorAfter: 0.5 },
    { type: 'spiral', direction: 'outward', revolutions: 1.5, duration: 700 },
  ],
  entryFrom: 'offscreen-left',
  transitions: 0.6,
  end: { type: 'fade', durationMs: 300 },
}
```

Boundaries:
- State 0 → 1 (straight line → pulsate): straight-line-involved boundary; sharpness `0.6` rounds the deceleration into the held position.
- State 1 → 2 (pulsate → spiral.outward): satisfies the flow restriction (spiral.outward must follow an "at point" exit). The spiral expands from the held center outward; angular velocity ramps cleanly from zero.
- Sequence end: electron fades to opacity 0 over 300ms.

Demonstrates `pulsate`'s scale-oscillation contract (the only state that writes `scaleFn`) and the optional mid-pulse color shift.

## Public API sketch

The consumer's surface should be drop-in. Two flavors:

### Named preset

```tsx
import { AtomReward } from 'src/ui/atom/AtomReward'

<AtomReward
  preset="orbit-then-target"          // shape from the library
  target={areaRef}                    // consumer plugs in their target
  trigger={isShown}                   // when to fire
  onComplete={() => setRewardSeen()}
/>
```

The library exports preset names that bind a sequence shape. Each preset accepts a small set of consumer-provided params (target ref, optional duration scale, optional intensity).

Initial preset roster (grows with use cases):

- `'orbit-then-target'` — Sequence 1's shape (departure)
- `'arrival-activate'` — Sequence 2's shape (arrival + neon-bulb)
- `'quick-spiral-to'` — short orbit + spiral, ≤500ms total (the original Chunk 5 quiz reward)
- (more added as concrete use cases land — DON'T pre-build)

### Custom sequence

```tsx
<AtomReward
  sequence={mySequence}                // full AtomSequence object
  trigger={isShown}
  onComplete={...}
/>
```

For one-off effects where no preset fits.

### Wrappers (where each preset goes)

The library exposes thin wrappers per use-case category, each route-gated and motion-policy-locked:

```tsx
<AtomReward />       // quiz B+ score, award unlocks. Refuses on /learn/lesson and /learn/quiz BODY.
<AtomHighlight />    // panel-border crash on highlight. Refuses on reading pages.
<AtomDecor />        // landing-page decoration. Allowed everywhere visible.
```

Each wrapper passes its sequence + end-effect choice to a shared internal `<AtomChoreographer>` that runs the runtime.

## Runtime contract

Every state has TWO functions evaluated per frame:

```ts
positionFn(s: number): Vector3   // where the electron is
scaleFn(s: number): number        // how big the electron is (default 1.0 for non-pulsating states)
```

`pulsate` is the only state that writes a non-constant `scaleFn`. Every other state's `scaleFn` returns `1.0`. The runtime always reads BOTH functions per frame and applies them — the position-only contract (which the spec previously implied) is wrong; it must accommodate `pulsate`.

The internal `<AtomChoreographer>` consumes an `AtomSequence` and:

1. Validates flow restrictions: `spiral.inward` MUST follow an "on orbit" exit, `spiral.outward` MUST follow an "at point" exit. Throw at build time on violation.
2. Resolves all `Target` values at sequence start (one DOM measurement pass).
3. Computes per-boundary corner geometry from the sharpness knob (default `0.5`).
4. Computes per-boundary windows in real-time units. Window size scales with sharpness — gradual = larger window, quick = smaller window.
5. Runs `useFrame` (R3F) advancing global time; per frame:
   - Determines current state index.
   - Computes state-internal `s_time`.
   - If inside a boundary window AND the boundary involves a `straight line`: replaces position with the Hermite cubic corner curve, with time-base shaped by sharpness.
   - Otherwise: evaluates the state's native `positionFn(s_time)`.
   - Always evaluates `scaleFn(s_time)` and applies to the electron mesh.
6. On sequence end: fires the end-effect.
7. Calls `onComplete`.
8. Switches frameloop to `'demand'` (motion policy default).

All animation state in refs. No setState in useFrame. The existing `<Atom>` motion policy (reduced-motion gate, aria-hidden, frameloop demand) wraps the whole thing.

## Open questions / what this spec doesn't yet answer

1. **Sharpness-to-window mapping.** The continuous sharpness knob (`0.0` gradual ↔ `1.0` quick) needs a calibrated mapping to (a) corner-arc radius and (b) time-base reparameterization profile. The endpoints are clear; the curve between them needs visual prototyping at `/labs/atom-blend-test` before the runtime is built.
2. **Default sharpness value.** `0.5` is the working default. Validate at first real deployment whether a slightly more gradual default (e.g. `0.4`) reads better.
3. **3D corner geometry.** Two angled straight-line segments in 3D need a corner arc on a specific plane. Probably the plane of the two segments' direction vectors, but degenerate cases (parallel segments, antiparallel segments) need handling. Defer until a real use case requires `straight line → straight line` at angle.
4. **Activation timing for `'activate'` end-effect.** Whether the DOM target's flash should fire one frame BEFORE the electron's arrival (anticipation) or at the same frame (pure synchrony). Probably the same frame; revisit at first phone-review.
5. **Trail decoration scope.** Whether decorations (fading-line, sparks, particles, dotted-trail) are useful is unknown until a use case asks. Don't pre-build.
6. **Sequence trigger model.** The `trigger` prop pattern (boolean prop) vs imperative ref API (`atomRef.current.play()`) is undecided. Boolean prop is simpler for declarative consumers; imperative ref is needed if the trigger comes from a callback or event without state. Probably support both via a `useImperativeHandle`. Decide at first use.
7. **Color-shift mechanics in `pulsate`.** `shiftColorAfter` triggers a head/halo/trail crossfade to the next themed color. The crossfade duration and interpolation curve are unspecified — revisit at first deployment.

## Status / next steps

1. Land this spec doc.
2. **Sharpness-knob prototype.** Before building the choreography runtime, extend the existing phase-blend prototype at `/labs/atom-blend-test` with a sharpness slider. Visualize how the corner arc and time-base shape change across `0.0 → 1.0`. Confirm the default (`0.5`) reads as felt-natural.
3. **First preset deployment.** Pick one concrete use case (likely the quiz B+ reward — the original Chunk 5 trigger) and build `<AtomReward preset="quick-spiral-to" />` end-to-end. Use it as the validation that the spec compiles in practice.
4. Refactor the existing logo's `<AtomLogo>` to use the new choreography runtime as a preset (`'logo-settle'`). Replaces the current bespoke timing logic. Validates the API can express the most complex existing case.
5. Iterate the default sharpness value based on phone-review of deployed presets.

## References

- Phase-blend prototype: `revamp/src/pages/LabsAtomBlend.tsx` (route `/labs/atom-blend-test`)
- Atom system architecture plan: `C:\Users\alany\.claude\plans\atom-system-architecture.md`
- Existing primitives: `revamp/src/ui/atom/{Electron,Atom,AtomLogo,constants}.tsx`
- Math derivations: `_resources/geometry-blending.md`, `_resources/easing-reference.md`, `_resources/phase-types-reference.md`, `_resources/continuity-cheatsheet.md` (in the `electron-motion` skill)
