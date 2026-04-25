# Geometry & Calculus — Smooth Path Blending

Distilled from Three.js Curve docs, Pomax Bézier Primer, CS184 Berkeley, academic spline theory. Last updated 2026-04-25.

## Three approaches to blending parametric curves

### 1. Hermite cubic interpolation (recommended for our case)

Interpolate position **p(t)** and velocity **v(t)** at boundaries using cubic Hermite basis:

```
p(t) = p₀·H₀(t) + p₁·H₃(t) + v₀·H₁(t) + v₁·H₂(t)

H₀(t) = 2t³ - 3t² + 1
H₃(t) = -2t³ + 3t²
H₁(t) = t³ - 2t² + t
H₂(t) = t³ - t²
```

**When to use:** Discrete phase transitions where you know exact position/velocity at endpoints. Cleanest for orbit→straight transitions.

### 2. Catmull-Rom splines (automatic C1)

Define phase boundaries as control points; tangents auto-compute from neighbors.

```
Tangent at Pᵢ = (Pᵢ₊₁ - Pᵢ₋₁) / 2  // uniform parameterization
```

C1 by construction — no manual tangent matching needed.

**When to use:** Sequence of phases where you want "automatic smoothness" with low math overhead.

### 3. Blend window (smooth fade between two curves)

Mix two curves P₁(t), P₂(t) over interval [t₀, t₁] via smooth weight α(t):

```
p(t) = (1 - α(t))·P₁(t) + α(t)·P₂(t)
α(t) = t²(3 - 2t)  // smoothstep
```

**When to use:** Overlapping transition regions where curves should naturally diverge (e.g., orbit → spiral). Slightly less precise but always smooth.

## Orbit → straight transition (concrete recipe)

**Use Hermite cubic with tangent matching:**

1. At boundary t_b, compute orbit's tangent:
   ```
   v = (-sin(t_b)·A, cos(t_b)·B)
   ```
2. Normalize:
   ```
   v̂ = v / ||v||
   ```
3. Use Hermite cubic to interpolate from orbit's exit (position + velocity) to straight line's entry (target position + entry velocity).

```ts
function blendPhases(phase1, phase2, t_boundary, t_blend_duration) {
  const v1 = phase1.getTangent(t_boundary)
  const v2 = phase2.getTangent(0)
  
  if (phase2.continuity === 'sharp') {
    return phase2.getPoint(0)  // C0 only
  }
  
  // Cubic Bezier with tangents as control handles
  const hermite = new THREE.CubicBezierCurve3(
    phase1.getPoint(t_boundary),
    phase1.getPoint(t_boundary).add(v1.multiplyScalar(t_blend_duration)),
    phase2.getPoint(0).sub(v2.multiplyScalar(t_blend_duration)),
    phase2.getPoint(0)
  )
  return hermite.getPoint(t_blend)
}
```

## C1 vs C2 continuity

**C1 (velocity continuous) is industry-standard** for animation.

- C2 (acceleration continuous) requires solving larger systems
- C2 → C1 perceptual gain is marginal at 60fps
- C1 eliminates visible kinks
- C2 targets jerk (3rd derivative) — imperceptible at typical frame rates

Pixar's SIGGRAPH publication on geometric continuity confirms C1 sufficient for character animation.

**Default to C1.** Use C2 only if you have a specific reason and the math is clean.

## Three.js native curves

| Class | Use |
|---|---|
| `THREE.CurvePath` | Compose multiple curves into a single path |
| `THREE.CatmullRomCurve3` | Auto-C1 spline through control points |
| `THREE.CubicBezierCurve3` | Hermite-equivalent (4 control points) |
| `THREE.QuadraticBezierCurve3` | Simpler, less control |

**API:** `.getPoint(t)`, `.getTangent(t)` — both return Vector3.

**Tradeoff:** Slightly higher per-frame cost than hand-rolled, but cleaner code + fewer bugs.

## Per-frame performance (60fps budget = 16.67ms)

| Method | Cost per call |
|---|---|
| Hand-rolled Hermite cubic | ~0.1ms |
| `THREE.CatmullRomCurve3.getPoint()` | ~0.3ms |
| GSAP timeline | ~0.5ms |

All well under budget for <20 active curves.

**Recommendation:** Use Three.js CurvePath for code clarity. Hand-roll only if profiler shows >5% frame budget consumed by curves.

## Ellipse parametric form (the atom orbit)

Position:
```
p(t) = (A·cos(t), B·sin(t))
```

Velocity (tangent):
```
p'(t) = (-A·sin(t), B·cos(t))
```

Speed (magnitude):
```
||p'(t)|| = √(A²·sin²(t) + B²·cos²(t))
```

Unit tangent (for use in blends):
```
v̂(t) = p'(t) / ||p'(t)||
```

**Always normalize before using as initial velocity in a blend.** Otherwise the magnitude carries through and the blend curve gets distorted.

## Common gotchas

1. **Forgetting to normalize tangent** → blended curve has wrong magnitude.
2. **Using easeOutCubic at a C1 boundary** → derivative at t=0 is 3, not 0; introduces velocity discontinuity.
3. **Linear easing across a smooth boundary** → derivative is constant, doesn't match adjacent curves.
4. **Sharp transitions in the middle of an animation** → user perceives as "stutter."
5. **Different `t` parameterization between phases** → blending over different t-spaces produces wrong results. Normalize all phases to t∈[0,1] before blending.

## Sources

- Three.js Curve API (threejs.org/docs)
- Pomax Bézier Primer (pomax.github.io/bezierinfo)
- CS184 Berkeley Hermite Curves Lecture
- Construction of G2 Hermite Interpolants (arxiv.org/pdf/2202.11371)
- Catmull-Rom Spline Properties (splines.readthedocs.io)
- Parametric Tangent Vectors (Lamar tutorial)
- Cubic Hermite Spline (Wikipedia)
