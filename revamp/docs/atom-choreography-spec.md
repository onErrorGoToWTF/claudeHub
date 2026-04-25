# Atom choreography — design spec

> **Status:** Draft — captures the design conversation of 2026-04-25. Not yet implemented. Two open questions flagged inline; speed-shaping math needs a second prototype pass before the runtime is built.

The atom system has graduated from "the topbar logo" to a reusable building block we want to drop into many surfaces (quiz rewards, award activations, panel highlights, modal entrances, departures from one screen region to another). This spec captures the API and underlying mechanics so future deployments compose without re-deciding any of this.

The phase-blend prototype at `/labs/atom-blend-test` empirically validated the math foundation; this spec is the next layer up — the consumer-facing vocabulary.

## Three orthogonal concepts

Every atom motion is composed from three building blocks. They compose independently — change one without touching the others.

```
1. Phases       — path primitives (circle orbit, ellipse, straight, spiral)
2. Transitions  — how the seam between two adjacent phases is rendered
3. End effects  — terminal accents at the very end of the sequence
```

A consumer writes a sequence as: `phases[] + transition preset + end effect`. The library handles every smoothness detail underneath.

## Phase types

Four phase primitives. Each defines a parametric position function over phase-internal time `s ∈ [0, 1]`. Real time is provided per-phase as `durationMs` at sequence level.

### `circle-orbit`

Electron travels along a circle around the nucleus.

```ts
{
  type: 'circle-orbit'
  radius: number              // world units
  revolutions: number         // how many laps in this phase
  plane?: 'xy' | 'yz' | 'xz'  // default: 'xy'
  startAngle?: number         // radians; default: 0
}
```

Position (relative to nucleus): `P(s) = (r·cos(θ), r·sin(θ), 0)` where `θ = 2π·revolutions·s + startAngle`. Tangent is nonzero throughout; intrinsic angular velocity is uniform.

### `ellipse`

Electron travels along an ellipse. Optional `stretchFrom: 'previous'` interpolates rx/ry from the previous orbit's exit shape, smoothing radius changes.

```ts
{
  type: 'ellipse'
  rx: number
  ry: number
  revolutions: number
  plane?: 'xy' | 'yz' | 'xz'
  startAngle?: number
  stretchFrom?: 'previous'    // pulls starting rx/ry from prev phase
}
```

Position: `P(s) = (rx(s)·cos(θ), ry(s)·sin(θ), 0)`. When `stretchFrom: 'previous'`, `rx(s)` and `ry(s)` interpolate via smoothstep from the previous orbit's exit radii to this phase's `rx`, `ry`. Otherwise constant.

### `straight`

Electron travels in a straight line from its current position to a target.

```ts
{
  type: 'straight'
  to: Target                  // see Targets section
  trail?: 'standard' | 'fading-line'  // default: 'standard'
}
```

Position: `P(s) = lerp(P_start, target, e(s))` where `e` is determined by the boundary transitions on either side. Pure positional interpolation; intrinsic velocity is constant in direction (along the line) but its magnitude is shaped by the transition system.

**Caveat:** `straight` is the only phase type whose intrinsic velocity is mechanically straight rather than orbital. Boundaries between `straight` and any orbital phase produce visible angles unless the transition system explicitly rounds them. The "smooth" preset handles this automatically (see Transitions). Banning `straight` would lose expressive range; allowing it without a smoothing system would ship visible kinks. Both are unacceptable, hence the two-dimensional transition system below.

### `spiral`

Electron orbits with shrinking radius and sliding orbit center, collapsing to a target point.

```ts
{
  type: 'spiral'
  to: Target
  revolutions: number         // how many laps during the spiral
  plane?: 'xy' | 'yz' | 'xz'
}
```

Position uses the proven `orbitPosMorphed` math from the existing logo: `center(s) = target·e(s)`, `scale(s) = 1 - e(s)`, `θ(s) = startAngle + 2π·revolutions·s`, `P(s) = center + scale·radius·(cos(θ), sin(θ), 0)`. The starting `radius`, `startAngle`, and `center=origin` are inferred from the previous phase's exit position.

## Transitions — two dimensions

A transition is what happens at a boundary between two adjacent phases. Position must be continuous (C0) at every boundary; position smoothness AND velocity smoothness are separate guarantees.

Every transition has TWO independent dimensions:

### 1. Path geometry

How the spatial curve is rendered through the boundary region.

```ts
geometry: 'sharp' | 'hermite' | 'fillet'
```

- `'sharp'` — no boundary modification. Position matches but velocity may jump. Visible kinks possible. Used between two phases that share intrinsic velocity at the seam (e.g., `circle-orbit → ellipse` — both uniform-angular, same direction at the boundary).
- `'hermite'` — a cubic Hermite curve over a window straddling the boundary, with control tangents matched to the exit/entry tangents of the adjacent phases. Geometric smoothness by construction. Used for `straight ↔ orbital` boundaries where intrinsic tangents differ.
- `'fillet'` — a circular arc with finite radius replacing a sharp corner. Used for `straight ↔ straight` at an angle (rare in our use cases).

### 2. Speed shaping

How the velocity MAGNITUDE profiles through the boundary. Independent of geometry — you can have a geometrically-smooth path that still feels mechanical because the speed is constant through a tight curve. Natural motion (a thrown ball) decelerates into direction changes and accelerates out.

```ts
speed: 'uniform' | 'ease-in-out' | 'ease-in' | 'ease-out'
```

- `'uniform'` — speed unchanged through the boundary.
- `'ease-in-out'` — decelerate into the corner, hold a slower speed through the apex, accelerate out. Default for sharp corners.
- `'ease-in'` — only decelerate (use when arriving at a sequence-end target).
- `'ease-out'` — only accelerate (use when leaving a sequence-start position).

**Implementation:** speed shaping is a time-reparameterization layer on top of phase position math. The phase computes `P(s_path)` where `s_path = f(s_time)` and `f` is the speed profile. `f(s_time) = s_time` is uniform; smoother profiles dip the derivative around boundaries. The phase math itself stays unchanged — the time-base bends.

### Boundary windows

Each transition operates over a window straddling the boundary, sized in either ms (real time) or revolutions (relative to adjacent orbit period). The "smooth" preset chooses windows large enough that the rounded corner is visible but small enough that the phase's character is preserved (see strategy table below).

### Presets

The consumer doesn't write Transition objects directly. They pick a preset:

```ts
transitions: 'smooth' | 'sharp' | Transition[]  // per-boundary array for advanced
```

**`'smooth'` (default and almost always correct):** auto-picks BOTH dimensions per boundary type via the strategy table:

| Out phase | In phase | Geometry | Speed | Window |
|---|---|---|---|---|
| circle-orbit | ellipse | sharp | uniform | — |
| circle-orbit | spiral | sharp | uniform | — |
| circle-orbit | straight | hermite | ease-in-out | 0.3 × orbit period |
| ellipse | spiral | sharp | uniform | — |
| ellipse | straight | hermite | ease-in-out | 0.3 × orbit period |
| spiral | end | (resolves to end-effect) | ease-in | end-effect window |
| straight | circle-orbit | hermite | ease-in-out | 0.3 × orbit period |
| straight | ellipse | hermite | ease-in-out | 0.3 × orbit period |
| straight | spiral | hermite | ease-in-out | 0.3 × orbit period |
| straight | straight (angled) | fillet | ease-in-out | min(0.2 × shorter-segment) |
| pause | * | sharp | uniform | — |

> Open question: **"0.3 × orbit period" is a candidate constant.** It's in the right zone (about a third of a revolution gives a visibly rounded corner without dominating the orbit's character) but needs phone-review tuning at the first real deployment. If the corner reads too tight, raise to 0.4; too loose, drop to 0.2.

**`'sharp'`:** every boundary uses `{ geometry: 'sharp', speed: 'uniform' }`. Diagnostic / experimental only — explicitly Tier-2 in the project's motion policy (would ship visible kinks).

**`Transition[]` (advanced):** the consumer provides one Transition per boundary in `phases.length - 1` order. Used only for one-off effects where the smooth preset doesn't fit; not the common path.

## End effects

Fire at the very end of the sequence, on the last phase's exit. NOT at intermediate boundaries.

```ts
type EndEffect =
  | { type: 'target-hit'; flash: 'aiPulse' | 'subtle' | 'none' }
  | { type: 'activate'; targetRef: DOMRef; flash: 'neon-bulb' | 'gentle-glow' }
  | { type: 'burst'; intensity: number; durationMs: number }
  | { type: 'fade'; durationMs: number }
```

- `'target-hit'` — flash + halo at the electron's final position. The current logo's strike pulse pattern (`aiPulse1/2/3` keyframes); reuses the existing CSS / shader assets.
- `'activate'` — neon-bulb pulse on a DOM target (a word or icon lights up + glows). The DOM target is independent of the electron's final position; the electron arrives, the target lights up. Uses CSS animation on the target ref.
- `'burst'` — pure visual scale pop on the electron itself at sequence end. No target interaction.
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

## Two worked examples

### Sequence 1 — "departure" (orbit then leave to a target)

```ts
const departure: AtomSequence = {
  phases: [
    { type: 'circle-orbit', radius: 1.0, revolutions: 2 },
    { type: 'ellipse', rx: 1.4, ry: 0.85, revolutions: 1, stretchFrom: 'previous' },
    { type: 'straight', to: { domRef: areaRef }, trail: 'fading-line' },
  ],
  durationsMs: [1500, 1500, 800],
  transitions: 'smooth',
  end: { type: 'target-hit', flash: 'subtle' },
}
```

Boundaries:
- Phase 0 → 1 (circle-orbit → ellipse): smooth-preset chooses `{ geometry: sharp, speed: uniform }` — both phases share angular velocity at the seam, smoothstep on the ellipse's `stretchFrom` interpolates radii without disturbing the angle. Already smooth.
- Phase 1 → 2 (ellipse → straight): smooth-preset chooses `{ geometry: hermite, speed: ease-in-out, window: 0.3 × ellipse period }`. The ellipse's exit tangent is matched into the start of the straight, then the speed shaper decelerates as the line approaches the target.
- Sequence end: `target-hit` flash at the electron's final position.

Total time: 3.8s. The straight phase's `'fading-line'` trail draws a tail behind the electron that fades over time, distinct from the standard ring-buffer trail.

### Sequence 2 — "arrival + activate" (fly in, orbit, spiral, light up a word)

```ts
const arrivalActivate: AtomSequence = {
  phases: [
    { type: 'straight', to: 'center' },
    { type: 'ellipse', rx: 1.4, ry: 0.85, revolutions: 3 },
    { type: 'spiral', to: { domRef: wordRef }, revolutions: 1.5 },
  ],
  entryFrom: 'offscreen-left',
  durationsMs: [600, 1800, 800],
  transitions: 'smooth',
  end: { type: 'activate', targetRef: wordRef, flash: 'neon-bulb' },
}
```

`entryFrom: 'offscreen-left'` is a sequence-level override placing the electron's starting position outside the canvas. The first phase's `straight` `to: 'center'` brings it onto the visible canvas.

Boundaries:
- Sequence start (offscreen-left → start of phase 0): no transition needed, electron mounts at offscreen-left.
- Phase 0 → 1 (straight → ellipse): smooth-preset chooses `{ geometry: hermite, speed: ease-in-out, window: 0.3 × ellipse period }`. The straight decelerates as it enters the ellipse; the Hermite cubic rounds the corner from line into orbital tangent.
- Phase 1 → 2 (ellipse → spiral): smooth-preset chooses `{ geometry: sharp, speed: uniform }` — both share angular velocity, the spiral's `orbitPosMorphed` math takes over from the ellipse's exit position naturally.
- Sequence end: spiral resolves at `wordRef`, end-effect fires `activate` neon-bulb pulse on the word.

Total time: 3.2s. The neon-bulb flash is a CSS animation on `wordRef` — text color snaps bright, multi-layer glow stack pulses (similar to the logo's `aiPulse`), then decays to a slightly-warmer rest state.

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

The internal `<AtomChoreographer>` consumes an `AtomSequence` and:

1. Resolves all `Target` values at sequence start (one DOM measurement pass).
2. Computes the per-boundary Transition strategy from the preset (default 'smooth').
3. Computes per-boundary windows in real-time units.
4. Runs `useFrame` (R3F) advancing global time; per frame:
   - Determines current phase index.
   - Computes phase-internal `s_time`.
   - Applies speed shaping: `s_path = f(s_time)`.
   - If inside a boundary window: replaces position with the transition's geometry curve (Hermite cubic / fillet arc).
   - Otherwise: evaluates the phase's native position function.
5. On sequence end: fires the end-effect.
6. Calls `onComplete`.
7. Switches frameloop to `'demand'` (motion policy default).

All animation state in refs. No setState in useFrame. The existing `<Atom>` motion policy (reduced-motion gate, aria-hidden, frameloop demand) wraps the whole thing.

## Open questions / what this spec doesn't yet answer

1. **Speed-shaping math validation.** Time reparameterization `s_path = f(s_time)` with `f` having derivative dips at boundaries — the shape of `f` for `'ease-in-out'` (probably a piecewise smoothstep with a flatter middle) needs visual prototyping at `/labs/atom-blend-test` before the runtime is built. Add it to the prototype as a separate dimension before locking the function shape.
2. **Boundary window sizing constants.** The "0.3 × orbit period" and "0.2 × shorter-segment" values in the strategy table are best guesses. Validate at first real deployment.
3. **3D `'fillet'`.** Two angled straight-line segments in 3D need a fillet arc on a specific plane. Probably the plane of the two segments' direction vectors, but degenerate cases (parallel segments, antiparallel segments) need handling. Defer until a real use case requires `straight → straight` at angle.
4. **Activation timing for `'activate'` end-effect.** Whether the DOM target's flash should fire one frame BEFORE the electron's arrival (anticipation) or at the same frame (pure synchrony). Probably the same frame; revisit at first phone-review.
5. **Trail decoration scope.** `'fading-line'` is one option; whether other decorations (sparks, particles, dotted-trail) are useful is unknown until a use case asks. Don't pre-build.
6. **Sequence trigger model.** The `trigger` prop pattern (boolean prop) vs imperative ref API (`atomRef.current.play()`) is undecided. Boolean prop is simpler for declarative consumers; imperative ref is needed if the trigger comes from a callback or event without state. Probably support both via a `useImperativeHandle`. Decide at first use.

## Status / next steps

1. Land this spec doc.
2. **Speed-shaping prototype.** Before building the choreography runtime, extend the existing phase-blend prototype at `/labs/atom-blend-test` with a speed-shaping toggle. Visualize the velocity-magnitude profile alongside the position trail. Confirm `'ease-in-out'` produces the felt-natural motion the spec demands.
3. **First preset deployment.** Pick one concrete use case (likely the quiz B+ reward — the original Chunk 5 trigger) and build `<AtomReward preset="quick-spiral-to" />` end-to-end. Use it as the validation that the spec compiles in practice.
4. Refactor the existing logo's `<AtomLogo>` to use the new choreography runtime as a third preset (`'logo-settle'`). Replaces the current bespoke timing logic. Validates the API can express the most complex existing case.
5. Iterate the strategy table's window constants based on phone-review of the three deployed presets.

## References

- Phase-blend prototype: `revamp/src/pages/LabsAtomBlend.tsx` (route `/labs/atom-blend-test`)
- Atom system architecture plan: `C:\Users\alany\.claude\plans\atom-system-architecture.md`
- Existing primitives: `revamp/src/ui/atom/{Electron,Atom,AtomLogo,constants}.tsx`
- Math derivations: `_resources/geometry-blending.md`, `_resources/easing-reference.md`, `_resources/phase-types-reference.md`, `_resources/continuity-cheatsheet.md` (in the `electron-motion` skill)
