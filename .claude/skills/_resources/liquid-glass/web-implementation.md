---
topic: Liquid Glass — web / CSS translation layer for claudeHub
last_fetched: 2026-04-20
staleness_days: 30
sources:
  - https://github.com/nikdelvin/liquid-glass (Astro + CSS + SVG filters)
  - https://github.com/lucasromerodb/liquid-glass-effect-macos (pure CSS + SVG)
  - https://github.com/shuding/liquid-glass (vanilla JS + SVG filters)
  - https://github.com/rdev/liquid-glass-react (React component)
  - Apple's verbatim design rules (for what to approximate)
---

# Liquid Glass — web implementation

**Scope:** translating Apple's Liquid Glass vocabulary into what a no-build-step HTML / CSS / vanilla-JS web app (claudeHub) can actually render. Synthesized from community CSS/SVG recreations + Apple's design language.

## TOC

1. Feature matrix (native → web fidelity)
2. Traditional blur vs. lensing (the key differentiator)
3. SVG filter recipe for lensing
4. Browser support
5. Accessibility media-query bridges
6. Performance considerations (web-specific)

## 1. Feature matrix

| Liquid Glass concept | Native web equivalent | Fidelity | Cost |
|---|---|---|---|
| Translucency | `backdrop-filter: blur() saturate()` | High | Low — widely supported |
| Traditional blur (Gaussian) | `backdrop-filter: blur(N px)` | High | Low |
| **Lensing (real refraction)** | SVG `<feDisplacementMap>` via `backdrop-filter: url(#filter)` | Medium-high | Medium — needs Safari fallback |
| Specular highlights (static) | `box-shadow: inset 0 1px 0 rgba(255,255,255,α)` | Medium | Low |
| Specular highlights (motion-tracking) | Requires JS pointer tracking OR DeviceOrientation permission | Low on mobile web | High (UX tax) |
| Adaptive shadows | `filter: drop-shadow()` with opacity/intensity tied to scroll position or hover | Medium | Low-medium |
| Chromatic aberration | SVG `<feColorMatrix>` + layered blur | Medium | Medium |
| Concentric corners | CSS custom property math + `border-radius: calc()` | Medium | Low (requires manual tuning) |
| Materialization (fade-in via lensing) | CSS transition on `backdrop-filter` + blur amount | Medium | Medium — animating `backdrop-filter` has perf quirks |
| Morphing between states | FLIP technique (First, Last, Invert, Play) with `transform` | Medium | Medium-high — JS-driven |
| Reduced transparency fallback | `@media (prefers-reduced-transparency: reduce) { ... }` | High | Low |
| Reduced motion fallback | `@media (prefers-reduced-motion: reduce) { ... }` | High | Low |
| Scroll edge effect | `position: sticky` bar + gradient mask behind it | High | Low |
| Background extension effect | CSS `mask-image` / `backdrop-filter` on a sibling absolute element | Medium | Medium |

## 2. Traditional blur vs. lensing (the key differentiator)

**Glassmorphism** (older web trend) uses Gaussian blur — light **scatters**, content behind becomes a soft wash.

**Liquid Glass** uses **refraction / lensing** — light **bends** as it would passing through a physical slab of glass, so content behind is distorted, compressed, and optically shifted.

On the web, lensing requires SVG filters (`<feDisplacementMap>`). On Safari, `backdrop-filter: url()` is not supported, so Safari users see only the traditional blur fallback.

## 3. SVG filter recipe for lensing

Synthesized from community (nikdelvin, lucasromerodb, shuding).

```html
<svg width="0" height="0" style="position: absolute">
  <filter id="lg-refract">
    <feImage href="displacement-map.png" result="map" />
    <feDisplacementMap in="SourceGraphic" in2="map" scale="100" />
    <feGaussianBlur stdDeviation="0.5" />
    <feColorMatrix type="matrix"
      values="1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 1 0" />
  </filter>
</svg>

<div class="glass-refract">Content goes here</div>
```

```css
.glass-refract {
  backdrop-filter: url(#lg-refract) blur(10px) saturate(1.6);
  -webkit-backdrop-filter: blur(10px) saturate(1.6); /* Safari fallback: no lensing */
}
```

**Displacement maps** are grayscale images where pixel brightness determines displacement amount. The `scale` attribute controls intensity — lower values = subtle lensing, higher = pronounced distortion.

## 4. Browser support

| Browser | `backdrop-filter` | `backdrop-filter: url()` for lensing |
|---|---|---|
| Chrome 76+ | ✅ Full | ✅ Full |
| Firefox 103+ | ✅ Full | ✅ Full |
| Safari 15+ | ⚠️ Partial (`-webkit-` prefix) | ❌ Not supported |
| Edge 79+ | ✅ Full | ✅ Full |

**Graceful degradation pattern:**

```css
.glass {
  backdrop-filter: blur(10px) saturate(1.6);
  -webkit-backdrop-filter: blur(10px) saturate(1.6);
}

@supports (backdrop-filter: url(#x)) {
  .glass {
    backdrop-filter: url(#lg-refract) blur(10px) saturate(1.6);
  }
}
```

Safari users get glassmorphism; Chrome / Firefox / Edge users get lensing.

## 5. Accessibility media-query bridges

```css
/* Reduce transparency — replace glass with solid, NOT just heavier frost */
@media (prefers-reduced-transparency: reduce) {
  .glass {
    backdrop-filter: none;
    background: var(--bg-0);
    border: 1px solid var(--hairline);
  }
}

/* Reduce motion — kill specular shimmer + morph transitions, keep final state */
@media (prefers-reduced-motion: reduce) {
  .glass-interactive { transition: none; }
  .glass-shimmer::before { animation: none; opacity: 0; }
}

/* Increased contrast — bump borders + dim glass toward solids */
@media (prefers-contrast: more) {
  .glass {
    background: color-mix(in oklch, var(--bg-0) 85%, var(--glass-top) 15%);
    border-width: 1.5px;
  }
}
```

## 6. Performance considerations (web-specific)

- `backdrop-filter` forces compositing. Budget no more than ~4 glass layers per view (mirrors Apple's "avoid layering glass on glass").
- **Animating `backdrop-filter` causes repaints.** Don't animate the blur amount itself; toggle between discrete states with a CSS transition on a sibling pseudo-element.
- **SVG filters are more expensive than blur.** Reserve `url(#filter)` backdrop effects for key chrome (1-2 surfaces per page max).
- **`will-change: backdrop-filter`** promotes the element to its own compositor layer; useful when animating but costs GPU memory when stacked.
- `@supports` feature detection is cheap — use it to gate expensive effects.

## Cross-references

- For claudeHub's current glass recipe + evolution proposals → `claudehub-roadmap.md`
- For accessibility rules in general (VoiceOver, Bold Text, etc.) → `accessibility.md`
- For Apple's own performance guidance (which partly maps to web) → `performance.md`
