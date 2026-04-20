# `liquid-glass/` — Apple's 2025 design language

Material + interaction vocabulary Apple introduced at WWDC25. claudeHub emulates this via the `.glass` primitive + backdrop-filter + top-edge specular highlight. Files here align vocabulary and inform evolution — **not** code for the project.

## TL;DR

- **Liquid Glass** is a translucent, dynamic material that reflects and refracts content behind it.
- It exists on the **functional layer** (controls, navigation) — never on the content layer.
- Key behaviors: **lensing** (refracting content), **specular** highlights that track motion, **fluid morphing** between states, **adaptivity** to surrounding content + light/dark.
- **Apple's load-bearing rule:** "Limit these effects to the most important functional elements in your app." Over-application defeats the point.

## Files in this folder

| File | What's in it |
|---|---|
| `fundamentals.md` | Material composition, variants (`.regular` / `.clear` / `.identity`), the functional-layer concept, motion coupling |
| `apis.md` | SwiftUI (`.glassEffect`, `GlassEffectContainer`, `.buttonStyle(.glass)`) + UIKit (`UIGlassEffect`) signatures |
| `components.md` | Which system components auto-adopt Liquid Glass + Apple's verbatim design rules |
| `accessibility.md` | a11y support, anti-patterns (visual + technical + usability), known iOS 26 issues |
| `performance.md` | Battery / GPU / memory implications + optimization strategies |
| `web-implementation.md` | How to approximate Liquid Glass in CSS / SVG filters (claudeHub-relevant) |
| `claudehub-roadmap.md` | How claudeHub's current glass maps to Liquid Glass + evolution proposals |
| `resources.md` | Apple docs, GitHub references, WWDC25 sessions |

## When to load what

- Design-review of a glass-touching diff → `components.md` + `accessibility.md`
- Adding a new glass treatment → `fundamentals.md` + `web-implementation.md`
- Planning future evolution → `claudehub-roadmap.md`
- API question about SwiftUI glass → `apis.md`
- Full audit or exploration → all of them (budget ~3000 lines)
