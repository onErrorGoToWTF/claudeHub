# Easing Functions — Reference & Continuity Behavior

Critical for picking the right easing per phase boundary. The DERIVATIVE at the endpoints determines C1 continuity.

## Quick continuity guide

| Need | Use |
|---|---|
| Smooth start and end (C1 at both boundaries) | smoothstep, smoothstep5, Hermite cubic |
| Smooth start, sharp end | easeIn family (rare for our use) |
| Sharp start, smooth end | easeOutCubic, easeOutQuart |
| Linear (no easing) | linear (sharp at both ends) |

**Rule:** for C1-compliant boundary, derivative at that endpoint MUST be 0.

## Common easings + their derivatives

### smoothstep `x²(3 - 2x)`

```
f(x)  = x²(3 - 2x)
f'(x) = 6x(1 - x)
f'(0) = 0  ✓
f'(1) = 0  ✓
```

**C1-compliant at BOTH ends.** Default for blends and settle ramps.

### smoothstep5 (smoother variant) `6x⁵ - 15x⁴ + 10x³`

```
f(x)  = 6x⁵ - 15x⁴ + 10x³
f'(x) = 30x⁴ - 60x³ + 30x²
f'(0) = 0
f'(1) = 0
```

Also C2-compliant. Use when even smoother feel needed.

### easeOutCubic `1 - (1-x)³`

```
f(x)  = 1 - (1 - x)³
f'(x) = 3(1 - x)²
f'(0) = 3   ✗  (NON-zero initial velocity!)
f'(1) = 0   ✓
```

**NOT C1-compliant at start.** Has snappy initial velocity, smooth end. Use when starting velocity ≠ 0 is desired (e.g., post-strike rebound).

### easeInCubic `x³`

```
f(x)  = x³
f'(x) = 3x²
f'(0) = 0   ✓
f'(1) = 3   ✗
```

Smooth start, sharp end. Rare use case.

### easeInOutCubic (cubic ease both ways)

```
f(x) = x < 0.5 ? 4x³ : 1 - (-2x + 2)³/2
```

C1 at both ends + derivative 0 at midpoint. Good for full enter→hold→exit ramps.

### linear `x`

```
f(x)  = x
f'(x) = 1
f'(0) = 1   ✗
f'(1) = 1   ✗
```

NOT C1-compliant at either end. Sharp transitions everywhere. Use only for `transition: 'sharp'`.

## Boundary behavior summary

| Easing | f'(0) | f'(1) | C1 at start | C1 at end |
|---|---|---|---|---|
| smoothstep | 0 | 0 | ✓ | ✓ |
| smoothstep5 | 0 | 0 | ✓ | ✓ |
| easeOutCubic | 3 | 0 | ✗ | ✓ |
| easeInCubic | 0 | 3 | ✓ | ✗ |
| easeInOutCubic | 0 | 0 | ✓ | ✓ |
| linear | 1 | 1 | ✗ | ✗ |

## Picking by transition type

**Within a single orbit phase (no boundary):** any easing works. Use smoothstep for pleasant curve.

**At a phase boundary with `transition: 'smooth'` (C1 required):**
- BOTH the outgoing phase and incoming phase use C1-compliant easing
- Recommended: smoothstep on both sides
- Or: Hermite cubic explicitly matches velocities (no easing needed)

**At a phase boundary with `transition: 'sharp'` (C0 only):**
- Use linear or easeOutCubic on the incoming phase
- Visible kink is intentional (e.g., burst phase)

## Custom easing recipe (cubic-bezier)

CSS / JS custom easing via cubic-bezier(p1x, p1y, p2x, p2y):

| Curve | cubic-bezier values |
|---|---|
| Premium (project default) | `0.22, 0.61, 0.36, 1` |
| Lensing | `0.4, 0, 0.2, 1` |
| Settle (sputtering resistance) | `0.25, 0.1, 0.25, 0.8` |
| Apple-style snap | `0.2, 0.9, 0.1, 1` |

**For C1 at start:** p1x must be > 0 AND p1y > 0 won't help — what matters is the tangent direction. cubic-bezier(0, 0, ...) has zero initial slope; cubic-bezier(0.2, 0, ...) doesn't.

## Project default easings (already in code)

```ts
const ATOM_EASINGS = {
  premium:    'cubic-bezier(0.22, 0.61, 0.36, 1)',
  lensing:    'cubic-bezier(0.4, 0, 0.2, 1)',
  settle:     'cubic-bezier(0.25, 0.1, 0.25, 0.8)',  // power-drain feel
  snap:       'cubic-bezier(0.2, 0.9, 0.1, 1)',       // strike pulse
}
```

Use these by name. Don't introduce new cubic-bezier values without justification.

## Sources

- easings.net (visual reference for common curves)
- CSS Easing Functions Level 1 (W3C draft)
- Joshua Comeau: Understanding easing and cubic-bezier curves
- Smashing Magazine: Animation Duration Best Practices
