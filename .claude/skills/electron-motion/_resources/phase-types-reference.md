# Phase Types — Reference

Five phase types in the atom motion system. Each defines a parametric position function over t∈[0,1].

## 1. orbit

Electron travels along an elliptical (or circular) orbit around the nucleus.

**Parameters:**
- `shape: 'circular'` (rx == ry) | `{ rx: number, ry: number }` (ellipse)
- `plane: 'xy' | 'yz' | 'xz' | 'morph'` (which 2D plane the orbit lives in)
- `revolutions: number` (default 1) — how many times around in this phase
- `phaseStart: number` (default 0) — starting angle in radians

**Position (relative to nucleus):**
```
P(t) = (rx · cos(2π · revolutions · t + phaseStart),
        ry · sin(2π · revolutions · t + phaseStart),
        0)
```

(Then rotated to the chosen plane.)

**Tangent (for blending):**
```
P'(t) = (-2π · revolutions · rx · sin(2π · revolutions · t + phaseStart),
          2π · revolutions · ry · cos(2π · revolutions · t + phaseStart),
          0)
```

**Plane morphing (`plane: 'morph'`):** interpolate between two plane orientations over t. Used for "perpendicular orbits converging into one plane" choreography.

## 2. straight

Electron travels in a straight line from current position to a target.

**Parameters:**
- `target: TargetSpec` (Vector3 | DOM ref | container keyword)
- `easing: 'linear' | 'smoothstep' | 'easeOutCubic'` (default 'smoothstep')
- `intensity: number` (default 1, scales how much the easing biases the path)

**Position (relative to nucleus, if applicable):**
```
P(t) = P_start + (target - P_start) · easing(t)
```

**Tangent:**
```
P'(t) = (target - P_start) · easing'(t)
```

**For C1 entry from a previous phase:**
Use `easing: 'smoothstep'` to ensure P'(0) = 0, so the straight line starts at zero velocity (matches a smooth boundary).

**For C1 exit to a next phase:**
`smoothstep` ensures P'(1) = 0.

## 3. spiral

Electron orbits with shrinking radius, collapsing to a target point.

**Parameters:**
- `target: TargetSpec` — where the spiral ends
- `revolutions: number` (default 1) — how many laps around during the spiral
- `ease: 'cubic' | 'smoothstep'` (default 'smoothstep') — how the radius shrinks
- `plane: 'xy' | 'yz' | 'xz'` — which orbital plane

**Position (relative to nucleus, with target at origin of relative frame):**
```
e = ease(t)               // shrinkage progression 0 → 1
center = target · e        // orbit center slides toward target
scale = 1 - e              // radius shrinks
angle = 2π · revolutions · t

P(t) = center + (scale · rx · cos(angle), scale · ry · sin(angle), 0)
```

**This is what the current settle uses (`orbitPosMorphed`).** Already in the codebase.

## 4. pause

Electron stays stationary at its current position.

**Parameters:**
- `duration: number` (in t-units or ms)

**Position:**
```
P(t) = P_start  (constant)
```

**Tangent:**
```
P'(t) = 0
```

C1-compliant on both boundaries by default (zero velocity matches anything that ends/starts at zero velocity).

## 5. burst

Brief size pulse at the current position. Visual only — does not change path.

**Parameters:**
- `intensity: number` (peak scale multiplier, default 1.5)
- `duration: ms`
- `ease: 'snap' | 'spring'` (default 'snap')

**Position:**
```
P(t) = P_start  (constant)
```

**Scale modifier (applied to electron mesh):**
```
scale(t) = 1 + (intensity - 1) · sin(π · t)  // peak at t=0.5
```

**This is the strike pulse pattern.** Used at landing moments and end-effect triggers.

## Composing phases (the choreography)

A phase sequence is an array:

```ts
const electronPath = [
  { type: 'orbit',    shape: 'circular',    revolutions: 2, plane: 'xy', duration: 1.5 },
  { type: 'orbit',    shape: { rx: 1.4, ry: 0.85 }, revolutions: 1, transition: 'smooth' },
  { type: 'straight', target: nucleusRef,   easing: 'smoothstep', duration: 0.8 },
  { type: 'spiral',   target: nucleusRef,   revolutions: 1.5, duration: 1.2 },
  { type: 'burst',    intensity: 1.8,       duration: 200 },
]
```

Each phase's `duration` is in ms (real time). The runtime normalizes to t∈[0,1] internally.

## Nucleus path (same vocabulary)

The nucleus has its own phase sequence:

```ts
const nucleusPath = [
  { type: 'pause',    duration: 800 },                         // hold at start
  { type: 'straight', target: 'center', easing: 'smoothstep', duration: 600 },
  { type: 'pause',    duration: ∞ },                            // settled
]
```

Most use cases: nucleus is a single `{ type: 'pause' }` (stationary). Some use cases (atom flies in): nucleus has its own travel.

## Phase blending math

See `geometry-blending.md` for the full math. Quick rules:

- **`transition: 'sharp'`** — C0 only. Position matches at boundary, velocity can jump.
- **`transition: 'smooth'`** — C1. Velocity matches (use smoothstep easing or Hermite cubic interpolation).
- Default is smooth.

## Forbidden compositions

- ❌ `pause → burst → pause` with no continuity check — burst's scale animation needs to NOT inherit from pause's zero velocity (it's a visual scale, not a position change, so it's fine)
- ❌ Two consecutive `straight` phases to the same target — collapses to one phase
- ❌ Spiral that doesn't end at the target — math becomes ambiguous; spiral always ends at its target
- ❌ orbit `shape: 'circular'` with rx ≠ ry — use `{ rx, ry }` instead
