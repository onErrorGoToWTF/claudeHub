---
topic: Liquid Glass — performance considerations
last_fetched: 2026-04-20
staleness_days: 7
sources:
  - https://github.com/conorluddy/LiquidGlassReference (Part 3.5, 4.7)
---

# Liquid Glass — performance

## TOC

1. Battery impact
2. GPU / memory impact
3. Older device fallback
4. Optimization strategies
5. Thermal considerations

## 1. Battery impact

**[community, anecdotal]** iPhone 16 Pro Max testing reported 13% battery drain under heavy Liquid Glass vs. 1% on iOS 18 with same content. Single-source, unverified; treat as directional, not absolute.

- Continuous animations over glass are costly.
- Real-time lensing + specular tracking consumes more GPU than traditional blur.
- Reduced Motion accessibility setting reduces the impact automatically when users enable it.

## 2. GPU / memory impact

**[community — conorluddy Part 4.7]**
- Real-time blur + lensing consume GPU memory.
- Glass samples a **larger area than the element's own bounding box** — the sampling region extends to catch content that refracts into view.
- Shared sampling region via `GlassEffectContainer` reduces memory overhead when multiple glass elements sit close together.

## 3. Older device fallback

- iOS 26 requires iPhone 11 / iPhone SE (2nd gen) or later.
- Older devices get a **frosted-glass fallback** with reduced effects (no real-time lensing, simplified specular).
- If you target older devices specifically, build a custom compatibility extension — see `apis.md` section 11 (Backward-compatibility escape hatch).

## 4. Optimization strategies

**[community — conorluddy Part 3.5 + 4.7]**

### 4.1 Always wrap multi-glass clusters in `GlassEffectContainer`

```swift
// ✅ GOOD — shared sampling region, efficient rendering
GlassEffectContainer {
    HStack {
        Button("Edit") { }.glassEffect()
        Button("Delete") { }.glassEffect()
    }
}

// ❌ BAD — independent sampling, inconsistent rendering
HStack {
    Button("Edit") { }.glassEffect()
    Button("Delete") { }.glassEffect()
}
```

### 4.2 Use `.identity` for conditional disable (no layout recalc)

```swift
.glassEffect(shouldShowGlass ? .regular : .identity)
```
Avoids the layout recalculation that presence-based `if` toggling would trigger.

### 4.3 Let glass rest in steady states

Avoid continuous rotation / pulse animations over glass. Glass on motion + continuous animation doubles the render cost.

```swift
// ❌ Continuous rotation over glass
.rotationEffect(Angle(degrees: rotationAmount))
.animation(.linear(duration: 2).repeatForever(), value: rotationAmount)
// This will thermal-throttle on a 3-year-old device.
```

### 4.4 Test on 3-year-old devices

Apple's guidance: test on iPhone 11 / 12 to catch the real-world perf envelope. Modern devices mask issues that show up as jank on older hardware.

### 4.5 Profile with Instruments

- GPU memory peaks → SwiftUI Instruments template.
- Compositing-layer counts → Core Animation template.
- Thermal state → Energy Log template.

## 5. Thermal considerations

**[community — conorluddy Part 4.7]** Liquid Glass generates more heat than iOS 18 material effects:
- Longer-running sessions (30+ minutes) may hit thermal throttling sooner.
- System will start dropping frames + reducing effects when throttled.
- Test in bright outdoor conditions (compounds heat from display brightness).

## Cross-references

- For claudeHub web-platform performance notes (CSS compositing, `backdrop-filter` perf) → `web-implementation.md`
- For the anti-pattern "multiple separate glass effects without container" → `accessibility.md` (technical anti-patterns)
