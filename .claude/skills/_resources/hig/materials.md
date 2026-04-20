---
topic: HIG — system materials (thin, regular, thick, ultra)
last_fetched: 2026-04-20
staleness_days: 30
sources:
  - Apple HIG (developer.apple.com/design/human-interface-guidelines/foundations/materials) — SPA-blocked; content synthesized from secondary sources
  - Wikipedia + developer blogs
  - Pre-dates and coexists with Liquid Glass (which is its own material category)
---

# HIG — system materials

## TOC

1. What a material is (pre-Liquid-Glass framing)
2. Named material levels
3. Vibrancy (text on materials)
4. Dark Mode auto-adaptation
5. Relationship to Liquid Glass

## 1. What a material is

**[secondary — Apple HIG Materials page, paraphrased from aggregators]** "On Apple platforms, a material imparts translucency and blurring to a background, creating a sense of visual separation between foreground and background layers."

A material is Apple's umbrella term for any translucent blur-based background layer: navigation bars, toolbars, sidebars, sheets, popovers, widgets. Liquid Glass (2025) is a specific new material; the older family below still exists and applies in non-glass contexts (e.g., older apps not yet rebuilt for iOS 26+, or system surfaces Apple hasn't rebuilt).

## 2. Named material levels

UIKit + SwiftUI provide named levels. Each is a tuning of blur amount + saturation + opacity, optimized for specific content relationships.

| Level | SwiftUI | UIKit | Use case |
|---|---|---|---|
| **Ultra Thin** | `.ultraThinMaterial` | `.systemUltraThinMaterial` | Softest blur; content behind remains highly visible. Small floating controls. |
| **Thin** | `.thinMaterial` | `.systemThinMaterial` | Subtle backdrop for toolbars / tab bars where content continuity matters. |
| **Regular** | `.regularMaterial` | `.systemMaterial` | Standard blur for sheets, popovers, sidebars. Default choice. |
| **Thick** | `.thickMaterial` | `.systemThickMaterial` | Heavy blur; content behind is obscured. For modal overlays where focus shifts fully to foreground. |
| **Ultra Thick** | `.ultraThickMaterial` | `.systemUltraThickMaterial` | Maximum blur; nearly opaque. Rare; used for high-focus contexts. |

**[secondary, not Apple-canonical]** Specific blur radii / opacity values for each level are not published. Apple tunes them per-platform (iOS, macOS, visionOS) and per-context. Reverse-engineering via community measurements:

- Ultra thin ≈ 10–15px blur, 30–40% opacity
- Thin ≈ 15–25px blur, 50–60% opacity
- Regular ≈ 25–35px blur, 65–75% opacity
- Thick ≈ 35–50px blur, 80–90% opacity
- Ultra thick ≈ 50+px blur, 90%+ opacity

**Treat these as directional.** If a claudeHub design needs an exact Apple match, consult the live Apple rendering — numbers above are community estimates.

## 3. Vibrancy (text on materials)

**[secondary — Apple HIG]** "Vibrancy applies to foreground content that displays on top of a material — such as text, symbols, and fills — and works by pulling color forward from behind the material to enhance the sense of depth."

Named vibrancy styles (SwiftUI):
- `.primary`, `.secondary`, `.tertiary`, `.quaternary` — hierarchy of emphasis.
- `.separator`, `.selection`, `.link`, `.placeholderText` — semantic.

Usage on a material:
```swift
ZStack {
    Color.blue
    Text("Vibrant text")
        .foregroundStyle(.primary)  // Receives vibrancy treatment
}
.background(.regularMaterial)
```

Vibrancy only activates when the foreground sits on top of a material; otherwise `.primary` etc. just map to the default semantic colors.

## 4. Dark Mode auto-adaptation

All named materials adapt automatically between light and dark modes. Same `.regularMaterial` call produces a different visual in Dark Mode — lighter in light mode (near-white translucent), darker in dark mode (near-black translucent).

## 5. Relationship to Liquid Glass

Liquid Glass (iOS 26+) is a **new material**, not a replacement for the older named materials. They coexist:

- Older `.thinMaterial` / `.regularMaterial` still work and still appear in many surfaces.
- `.glassEffect(.regular)` is the NEW material for nav / functional layer.
- `.glassEffect(.clear)` / `.identity` are the Liquid Glass variants.

**Conceptual mapping (approximate):**

| Old material | Rough Liquid Glass analogue |
|---|---|
| `.ultraThinMaterial` | `.glassEffect(.clear)` |
| `.thinMaterial` | (between `.clear` and `.regular`) |
| `.regularMaterial` | `.glassEffect(.regular)` |
| `.thickMaterial` | (closest to a glassProminent button with tint) |
| `.ultraThickMaterial` | No direct analogue in Liquid Glass — generally avoid (opaque = solid, not glass) |

## claudeHub translation

claudeHub approximates `.regularMaterial` / `.glassEffect(.regular)` with its single `.glass` class. No current tooling for thin / thick variants.

**If claudeHub wanted a thin-material analogue:**
```css
.glass-thin {
  backdrop-filter: blur(12px) saturate(1.3);
  background: linear-gradient(var(--glass-top-thin) 0%, var(--glass-bottom-thin) 100%);
}
```
Where `--glass-top-thin` / `--glass-bottom-thin` are higher-transparency variants.

**If claudeHub wanted a thick-material analogue:**
```css
.glass-thick {
  backdrop-filter: blur(40px) saturate(1.8);
  background: linear-gradient(var(--glass-top-thick) 0%, var(--glass-bottom-thick) 100%);
}
```
Neither exists today; either would need a design-amend invocation to introduce new tokens cleanly.

## Cross-references

- For Liquid Glass specifically → `liquid-glass/fundamentals.md`
- For CSS equivalents (backdrop-filter recipes) → `liquid-glass/web-implementation.md`
- For accessibility on materials (reduced transparency) → `accessibility.md`
