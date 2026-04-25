# Continuity Cheatsheet — C0, C1, C2 for Non-Mathematicians

Continuity describes how "smooth" the transition between two motion phases is. Higher continuity = smoother to the eye.

## The three levels

### C0 — position continuous (sharp transition)

The path doesn't break — at the boundary, position A's end = position B's start.

But velocity (direction + speed) can jump.

**Visual effect:** sharp kink. The path changes direction abruptly.

**When to use:** intentional snap moments. Bursts. Effects where the abruptness IS the point.

**Example:** electron lands at i-dot → burst phase. Position is the same, but the burst introduces a visual scale pop. C0 is fine because the burst doesn't move the electron.

### C1 — velocity continuous (smooth transition)

Position matches AND velocity matches at the boundary.

**Visual effect:** smooth path. No kink. The electron continues in the same direction at the same speed across the boundary.

**When to use:** default for most transitions. Whenever you want the motion to feel "natural."

**Example:** electron orbits → straight line to target. The straight line starts in the orbit's tangent direction, with the orbit's exit speed. The eye sees a continuous curve.

**How to achieve:**
- Easing functions with derivative 0 at the boundary (smoothstep)
- Hermite cubic interpolation (matches position + velocity by construction)
- Catmull-Rom splines (auto-C1)

### C2 — acceleration continuous (buttery transition)

Position, velocity, AND acceleration all match.

**Visual effect:** even smoother — but at 60fps, mostly imperceptible.

**When to use:** rarely. Industry research (Pixar SIGGRAPH) shows C1 is sufficient for character animation. C2 targets jerk (3rd derivative), which humans don't perceive.

**Skip unless you have a specific reason.**

## Quick decision tree

```
Boundary between two motion phases?
│
├── Sharp on purpose? (burst, snap moment)
│   └── C0  → easing: 'linear' or 'easeOutCubic'
│
├── Want it smooth?
│   └── C1  → easing: 'smoothstep' on both phases
│       Or: Hermite cubic interpolation (matches velocities exactly)
│
└── Critical "buttery" feel?
    └── C2  → smoothstep5 (6x⁵ - 15x⁴ + 10x³)
        Verify acceleration matches; usually overkill
```

## Default policy

**C1 is the default.** All phase boundaries should be smooth unless explicitly marked sharp.

Rationale:
- Smoothness > snappiness in 99% of motion
- Sharp moments (bursts, snaps) should be rare and meaningful
- C2 is invisible at 60fps; not worth the math complexity

## Common mistakes

| Mistake | What happens | Fix |
|---|---|---|
| Using easeOutCubic at a C1 boundary | Derivative at t=0 is 3, not 0 → velocity discontinuity → visible kink | Use smoothstep instead, or Hermite cubic |
| Linear easing across a "smooth" boundary | Constant derivative → boundary always has velocity mismatch | Use smoothstep |
| Forgetting to normalize tangent | Blended curve has wrong magnitude | Always normalize before using as initial velocity |
| Assuming all phases use t∈[0,1] | Different parameterizations break blends | Normalize per-phase before blending |
| Using C2 by default | Math complexity for invisible benefit | Stick with C1 |

## Verifying smoothness in practice

1. **Visual test:** does the electron path look like a single curve, or two curves with a kink?
2. **Slow-motion test:** drop the playback to 0.1× speed. Boundaries should still look smooth.
3. **Velocity log:** print the electron's velocity at each frame. At a smooth boundary, velocity magnitude shouldn't jump.
4. **Frame-by-frame screenshot:** take 10 frames around the boundary. They should form a continuous arc.

## When the math doesn't work

If C1 transitions look jerky despite using smoothstep:
1. **Check parameterization.** Both phases must be normalized to t∈[0,1].
2. **Check tangent normalization.** Ellipse tangent magnitude varies; always normalize before using.
3. **Try Hermite cubic interpolation.** Solves the boundary explicitly with position + velocity matching.
4. **Use a blend window.** smoothstep mix of two curves over an overlap interval. Always smooth, less precise.

If still problematic, prototype at `/labs/atom-blend-test`.

## Reference

For the actual math + code, see `geometry-blending.md`.
For easing functions and their derivatives, see `easing-reference.md`.
