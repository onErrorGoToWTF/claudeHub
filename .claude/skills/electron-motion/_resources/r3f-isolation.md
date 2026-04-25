# React Three Fiber — Canvas Isolation & Performance

Distilled from R3F docs, drei docs, three.js perf docs, MDN. Last updated 2026-04-25.

## Critical isolation guarantee

**A WebGL Canvas does NOT affect surrounding DOM rendering.**

- CSS animations elsewhere on the page continue uninterrupted
- React reconciliation is unchanged
- `useFrame` runs outside React's reconciliation cycle (tied to `requestAnimationFrame`, not React state)

**The only way an active Canvas slows other things:** if `useFrame` does heavy synchronous work, it starves the main thread. We control that.

## WebGL context limits

| Browser | Concurrent contexts |
|---|---|
| Chrome desktop | ~16 |
| Firefox desktop | ~16 |
| Mobile (Chrome/Firefox) | 2-8 |

**When exceeded, the oldest context is silently destroyed and unrecoverable.** Treat as hard limit. One Canvas per page section is the rule.

## GPU memory pitfalls

- **Texture bloat** — uncompressed PNGs take 10-20× their file size in VRAM
- **Draw-call explosion** — too many independent meshes
- **Mobile sensitivity** — limit `dpr` to `[1, 2]` (we already do this)
- **Missing `.dispose()`** on geometries/materials/textures — #1 cause of silent leaks
- **Real-time shadows** — silent killer; often more GPU time than everything else combined

## Best patterns for an idle topbar canvas

```ts
<Canvas
  dpr={[1, 2]}                    // never native 4x retina (mobile killer)
  frameloop="demand"              // only render on prop change (zero idle CPU)
  gl={{ alpha: true, antialias: true, stencil: false }}
>
  ...
</Canvas>
```

Plus runtime gates:
- **IntersectionObserver** to pause when off-screen
- **Throttle on scroll** if the canvas is in a scroll container
- **OffscreenCanvas + Web Workers** for heaviest cases (advanced)

After the atom settles, switch to `frameloop="demand"`. Idle CPU drops to ~0.

## Single Canvas vs multiple Canvases

| Pattern | When |
|---|---|
| **Single canvas + `<View>`** (drei) | Multiple animation regions sharing one context. Wins on context limits. Good for dashboards. |
| **Multiple canvases** | Only acceptable if ≤2 simultaneously. Each carries full renderer overhead. |
| **`<View>` from drei** | Renders into a region of one canvas via scissoring. Tracks DOM element position; follows scroll/resize. Ideal for topbar widgets, cards, modals. |

## Path-driven motion: library options

| Library | Best for | Per-frame cost | Path control |
|---|---|---|---|
| **Hand-rolled Hermite cubic** | Custom phase logic | ~0.1ms | Precise |
| **Three.js CurvePath / CatmullRomCurve3** | Standard splines | ~0.3ms | Auto C1 continuity |
| **GSAP + R3F** | Multi-phase timelines | ~0.5ms | Precise numerical |
| **Theatre.js** | Director-controlled, keyframe editing | Moderate | Visual + code |
| **react-spring** | Physics-driven feel | Moderate | Constraint-based |
| **Framer Motion** | 2D DOM only | Light | DOM-centric |

**Recommendation for atom system:** Start hand-rolled (Hermite cubic) for clean control. Add GSAP only if multi-phase timing complexity outgrows hand-rolled timing.

## Sources

- React Three Fiber: Scaling Performance (r3f.docs.pmnd.rs)
- Drei: View component
- Chrome Issue #40939743: WebGL context limits
- MDN: OffscreenCanvas
- Three.js GPU optimization: 100 Tips
- GSAP vs Framer Motion vs React Spring (2026)
