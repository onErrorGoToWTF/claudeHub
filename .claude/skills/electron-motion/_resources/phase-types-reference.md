# Phase Types — Reference

Five state primitives in the atom motion system. Each defines a parametric `positionFn(t)` and `scaleFn(t)` over t ∈ [0,1].

The dual `positionFn` + `scaleFn` contract is mandatory because `pulsate` has constant position but varying scale. Most states are no-ops on one side of the contract.

> Source of truth for the overall design: [`revamp/docs/atom-system-plan.md`](../../../../revamp/docs/atom-system-plan.md). Composition restrictions, the `transitionWindow` knob, and the three-concept model live there.

## 1. orbit

Unified circle + ellipse. A circle is just an orbit with `aspect = 1.0`.

**Parameters:**
- `size` — primary radius (rx). Single knob; aspect derives ry.
- `aspect` — `1.0` = circle, `<1` or `>1` = ellipse stretched along one axis. Default `1.0`.
- `revolutions` — laps before exiting the state. Default `1`.
- `duration` — total time in this state (ms).
- `plane` — orientation of the orbit in 3D. Two dimensions sufficient (rx, ry derived from size + aspect; tilt expressible via plane normal). No third dimension needed for our use cases.
- `phaseStart` — starting angle in radians. Default `0`.

**Position (relative to nucleus):**
```
rx = size
ry = size · aspect
P(t) = (rx · cos(2π · revolutions · t + phaseStart),
        ry · sin(2π · revolutions · t + phaseStart),
        0)
```
(Then rotated to the configured plane.)

**Tangent:**
```
P'(t) = (-2π · revolutions · rx · sin(...),
          2π · revolutions · ry · cos(...),
          0)
```

**Scale:** constant `1.0`.

## 2. straight

Linear travel from current position to a target. The electron *draws* the line — there is never an instant pre-drawn line. The electron is the living thing; trail follows.

**Parameters:**
- `target: TargetSpec` — destination point. Locked shape:
  ```ts
  type TargetSpec =
    | { space: 'nucleus';   value: Vec3 }
    | { space: 'canvas';    value: Vec3 }
    | { space: 'viewport';  value: { x: number; y: number } }
    | { space: 'dom-ref';   value: DOMRef }
  ```
  `'viewport'` is required for off-screen travel (page-traversal departure / arrival).
- `duration` — total time (ms)

**Start-point behavior:**
- If a previous state exists, start point = previous state's end point. Smooth handoff is the transition layer's job, not the state's.
- If first state of the sequence, the electron appears at start point and begins drawing immediately.

**Position:**
```
P(t) = P_start + (target - P_start) · t
```

The state itself uses linear t. Easing / window-shaping happens in the transition layer at boundaries, not inside this state.

**Tangent:**
```
P'(t) = (target - P_start)
```
Constant magnitude, constant direction.

**Scale:** constant `1.0`.

## 3. spiral

Orbit with shrinking (or growing) radius, collapsing to / expanding from a point.

**Parameters:**
- `direction` — `'inward'` | `'outward'`
- `revolutions` — laps during the spiral. Default `1`.
- `duration` — total time (ms).

**Composition restrictions (HARD):**
- `spiral.inward` can ONLY follow an `orbit` state. Needs an existing nucleus center to spiral into.
- `spiral.outward` can ONLY follow an "at point" state (`pause`, `pulsate`, end of `straight`, end of `spiral.inward`).

Enforced at config-validation time. Reject sequences that violate.

**Position (inward, with target at origin of relative frame):**
```
e = t                       // linear shrinkage; window-shaping in transition layer
center = target · e         // orbit center slides toward target
scale = 1 - e               // radius shrinks
angle = 2π · revolutions · t

P(t) = center + (scale · rx · cos(angle), scale · ry · sin(angle), 0)
```
This is the current `orbitPosMorphed` pattern in the codebase.

**Outward:** mirror of inward. `e` runs `1 → 0`, radius grows from 0.

**Scale:** constant `1.0` (this is path scale, not mesh scale).

## 4. pulsate

Stationary scale-pulse in place. No translational motion. Forces the dual `positionFn` + `scaleFn` contract.

**Parameters:**
- `intensity` — peak scale multiplier. Default `1.5`.
- `pulses` — number of pulses. Default `1`.
- `duration` — total time (ms).
- `shiftColorAfter` — optional `{ afterPulse: number, color: Rgb }`. After N pulses, the electron's color changes; subsequent pulses run in the new color.

**Position:**
```
P(t) = P_start   (constant)
```

**Scale (per pulse, peak at midpoint of each pulse):**
```
pulsePhase = (t · pulses) mod 1
scale(t) = 1 + (intensity - 1) · sin(π · pulsePhase)
```

`pulsate ↔ anything` boundaries are spatially trivial (no positional motion at the boundary on the pulsate side). Speed handoff is also trivial.

## 5. pause

Stationary hold at current position. Useful as a beat between states. Renders nothing new.

**Parameters:**
- `duration` — total time (ms).

**Position:**
```
P(t) = P_start   (constant)
```

**Tangent:** `P'(t) = 0`.

**Scale:** constant `1.0`.

C1-compliant on both boundaries by default (zero velocity matches anything that ends/starts at zero velocity).

## Composing states (the choreography)

```ts
const electronPath = [
  { type: 'orbit',    size: 1.0, aspect: 1.0, revolutions: 2, plane: 'xy', duration: 1500 },
  { type: 'orbit',    size: 1.0, aspect: 0.6, revolutions: 1, duration: 900 },
  { type: 'straight', target: nucleusRef,     duration: 800 },
  { type: 'pulsate',  intensity: 1.6, pulses: 3, duration: 600 },
  { type: 'spiral',   direction: 'outward', revolutions: 1.5, duration: 1200 },
]
```

Each state's `duration` is in ms. The runtime normalizes to t ∈ [0,1] per-state.

## Composition cheatsheet

```
orbit       → any
straight    → any
spiral.in   → must come AFTER orbit
spiral.out  → must come AFTER an at-point state (pause, pulsate, end of straight, end of spiral.in)
pulsate     → any (any → pulsate, pulsate → any)
pause       → any
```

## Nucleus path (same vocabulary)

```ts
const nucleusPath = [
  { type: 'pause',    duration: 800 },
  { type: 'straight', target: 'center', duration: 600 },
  { type: 'pause',    duration: Infinity },
]
```

Most use cases: nucleus is a single `{ type: 'pause' }` (stationary). Some (atom flies in): nucleus has its own travel.

## Boundary blending — see transitions, not states

State definitions are duration-relative and unbiased — they run on linear t and produce clean tangents. Easing / window-shaping happens in the **transition layer**, controlled by the single `transitionWindow` knob. See [`continuity-cheatsheet.md`](continuity-cheatsheet.md) and [`geometry-blending.md`](geometry-blending.md).

The user-facing knob `transitionWindow` controls how much time/distance a boundary blend gets. Short window → tighter arc. Long window → wider arc. Smoothness is fixed at maximum (never a kink).

## End effects (NOT states)

`burst`, `target-hit flash`, `activate glow`, `fade` — these are END EFFECTS, not states. They fire at sequence end only, never at intermediate boundaries. See the system plan; spec for end-effect API is pending.

## Forbidden compositions

- ❌ `spiral.inward` not preceded by `orbit` — fail config validation.
- ❌ `spiral.outward` preceded by a moving (non-at-point) state — fail config validation.
- ❌ Two consecutive `straight` phases to the same target — collapse to one.
- ❌ `orbit` with `aspect = 0` or negative — out of range.
