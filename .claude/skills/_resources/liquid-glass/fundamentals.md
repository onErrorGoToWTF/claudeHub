---
topic: Liquid Glass — material fundamentals
last_fetched: 2026-04-20
staleness_days: 7
sources:
  - https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass/adopting-liquid-glass (user-pasted)
  - https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/
  - https://github.com/conorluddy/LiquidGlassReference
---

# Liquid Glass — fundamentals

## TOC

1. What Apple calls it (verbatim)
2. Core visual effects
3. The functional-layer concept
4. Motion coupling
5. Material variants (`.regular` / `.clear` / `.identity`)
6. Load-bearing rule: avoid overuse

## 1. What Apple calls it (verbatim)

- **[verbatim, Apple docs]** "a new dynamic material called Liquid Glass, which combines the optical properties of glass with a sense of fluidity"
- **[verbatim, Apple docs]** "This material forms a distinct functional layer for controls and navigation elements."
- **[verbatim, Apple docs]** "It affects how the interface looks, feels, and moves, adapting in response to a variety of factors to help bring focus to the underlying content."
- **[verbatim, Apple newsroom]** "translucent and behaves like glass in the real world"
- **[verbatim, Apple newsroom]** "Its color is informed by surrounding content and intelligently adapts between light and dark environments."
- **[verbatim, Apple newsroom]** "uses real-time rendering and dynamically reacts to movement with specular highlights"

## 2. Core visual effects

| Effect | What it does | Apple vocabulary |
|---|---|---|
| **Translucency** | Foreground lets background show through | "translucent," "dimmed" |
| **Lensing / refraction** | Glass bends and concentrates light (NOT scatter, like traditional blur) | "refract the content behind them" |
| **Reflection** | Glass reflects surrounding content + wallpaper | "reflecting content and the user's wallpaper from around them" |
| **Specular highlights** | Real-time highlights that respond to device motion | "dynamically reacts to movement with specular highlights" |
| **Adaptive shadows** | Shadow depth tracks surface position over content | implicit in "adaptive" |
| **Fluid motion** | Elements behave like "a drop of liquid" on device motion | "animations that suggest the movement of a drop of liquid" |
| **Materialization** | Elements appear by modulating light-bending (fade-in via lensing, not opacity) | **[community — conorluddy]** |
| **Morphing** | Dynamic transformation between control states | **[community — conorluddy]** |

## 3. The functional-layer concept (load-bearing)

Apple structures the UI into three layers:

1. **Content layer** (bottom) — your app's content: lists, photos, text, video. **No glass.**
2. **Navigation / functional layer** (middle) — controls, nav bars, tab bars, floating buttons, toolbars. **Liquid Glass here.**
3. **Overlay / vibrancy layer** (top) — text, icons, fills sitting on top of glass. Automatic vibrancy treatment.

This separation is why over-applying glass to content dilutes the effect. It also explains Apple's verbatim "avoid … layering Liquid Glass elements on top of each other" rule.

**claudeHub translation:** the floating nav pill + floating glass panels over the non-glass page body match this pattern. Glass cards inside glass panels brush against the no-glass-on-glass rule — documented divergence in `claudehub-roadmap.md`.

## 4. Motion coupling

- **[verbatim, Apple docs]** Specular highlights "travel around the material defining its silhouette" in response to interactions (locking phone, tapping).
- **[community — conorluddy Part 1.3]** The `.interactive()` SwiftUI modifier enables:
  - Scaling on press
  - Bouncing animation
  - Shimmering effect
  - Touch-point illumination that radiates to nearby glass
  - Response to tap + drag gestures

**Web-equivalent constraint:** without DeviceOrientation permission prompts, web apps can't track real device motion. A static specular highlight (claudeHub's current approach) is the honest stand-in. Pointer/touch-move-based specular is possible on pointer devices but awkward on mobile web.

## 5. Material variants

**[community — conorluddy Part 1.1 + Medium madebyluddy.** Apple's "Adopting Liquid Glass" doc confirms the Glass namespace via `.buttonStyle(.glass)` and `.buttonStyle(.glassProminent)` but doesn't enumerate every variant name in the pasted content — spot-verify against Xcode 26 SDK headers before relying on the exact spelling.]

| Variant     | Transparency | Use case | Design requirements for `.clear` (all must be met) |
|-------------|--------------|----------|-----------------------------------------------------|
| `.regular`  | Medium       | Toolbars, nav bars, tab bars, standard controls — default for most UI | n/a |
| `.clear`    | High         | Small floating controls over media-rich content | Element sits over media-rich content; content tolerates a dimming layer; content above glass is bold + bright |
| `.identity` | None         | Conditional disable via `isEnabled` flag or `shouldShowGlass ? .regular : .identity` | n/a |

**Chainable on `Glass`:**
- `.tint(Color)` — **use for semantic meaning (primary action, state), not decoration**.
- `.interactive()` — iOS only — enables press/bounce/shimmer + touch-point specular.

Example: `.glassEffect(.regular.tint(.blue).interactive())` — order doesn't matter.

## 6. Load-bearing rule: avoid overuse

**[verbatim, Apple docs]** "Avoid overusing Liquid Glass effects. If you apply Liquid Glass effects to a custom control, do so sparingly. Liquid Glass seeks to bring attention to the underlying content, and overusing this material in multiple custom controls can provide a subpar user experience by distracting from that content. Limit these effects to the most important functional elements in your app."

claudeHub translation: glass is already reserved for navigation chrome + panel shells. New glass applications must pass the "is this a primary functional element?" test.
