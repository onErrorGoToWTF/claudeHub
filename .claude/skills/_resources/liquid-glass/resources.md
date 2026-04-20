---
topic: Liquid Glass — external resources + citations
last_fetched: 2026-04-20
staleness_days: 30
---

# Liquid Glass — external resources

## TOC

1. Primary external reference
2. Official Apple
3. WWDC25 sessions
4. Community curation / discovery
5. Community — web / CSS implementations (most relevant to claudeHub)
6. Community — SwiftUI / UIKit (vocabulary reference)
7. Community — MCP servers (alternative integration path)
8. Developer blogs
9. Design tools

## 1. Primary external reference

**https://github.com/conorluddy/LiquidGlassReference** — 1841-line Claude-ready SwiftUI reference. 261 stars, last pushed 2026-03-08. No LICENSE file but content is explicitly built for AI-assistant consumption. Author's blog post: https://conor.fyi/writing/liquid-glass-reference.

This is the primary source for most of the `[community]` content in `fundamentals.md`, `apis.md`, `accessibility.md`, and `performance.md`.

## 2. Official Apple

- https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass — technical overview (SPA — not WebFetchable)
- https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass/adopting-liquid-glass — user-pasted 2026-04-20, source of all `[verbatim, Apple docs]` quotes
- https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views — next paste target for full API spec
- https://developer.apple.com/design/human-interface-guidelines/materials — paste target for system-material blur/opacity specs
- https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/ — server-rendered press release
- https://developer.apple.com/design/new-design-gallery/ — Apple's showcase of third-party apps adopting Liquid Glass
- https://developer.apple.com/design/resources/ — official Sketch + Figma UI kits (binary, not text-fetchable)

## 3. WWDC25 sessions (video; use community notes for text)

- Session 101 — Keynote
- Session 102 — Platforms State of the Union
- Session 219 — Meet Liquid Glass
- Session 284 — Build a UIKit app with the new design
- Session 323 — Build a SwiftUI app with the new design
- Session 356 — Get to know the new design system

Video transcripts via:
- https://wwdcnotes.com/documentation/wwdcnotes/ (community-maintained notes)
- https://nonstrict.eu/wwdcindex/ (searchable index + transcript snippets)

## 4. Community curation / discovery

- https://github.com/carolhsiaoo/awesome-liquid-glass — curated ecosystem list (48 stars, last pushed 2025-07-19). Good starting point for finding new libraries + demos.

## 5. Community — web / CSS implementations (most relevant to claudeHub)

- https://github.com/nikdelvin/liquid-glass — Astro + CSS + SVG filters. MIT. Live demo: https://liquid-glass.web.app
- https://github.com/lucasromerodb/liquid-glass-effect-macos — Pure CSS + SVG filters, minimal example. Demo: https://codesandbox.io/p/sandbox/nn5q2y
- https://github.com/shuding/liquid-glass — Vanilla JS + SVG filters. Paste the JS file into any website's console to demo.
- https://github.com/rdev/liquid-glass-react — React component implementation.
- https://github.com/yanglei1826877278/liquid-glass — "Copy the CSS & HTML instantly" generator.
- https://github.com/archisvaze/liquid-glass — Interactive web demo of iOS 26 style.
- https://github.com/Muggleee/liquid-glass-vue — Vue.js + WebGL implementation.
- https://www.shadertoy.com/view/WftXD2 — GLSL shader for shader-based renderers.

## 6. Community — SwiftUI / UIKit (vocabulary reference, not for web)

- https://github.com/DnV1eX/LiquidGlassKit — Backport of Liquid Glass for iOS 13–18.
- mertozseven/LiquidGlassSwiftUI, GonzaloFuentes28/LiquidGlassCheatsheet, GetStream/awesome-liquid-glass, artemnovichkov/iOS-26-by-Examples, mizadi/LiquidGlassExamples — all referenced in conorluddy's Part 6.2.

## 7. Community — MCP servers (alternative integration path)

- https://github.com/tmaasen/apple-dev-mcp — MCP server for HIG + Apple docs, auto-updated every 4 months via GitHub Actions. Alternative to local-markdown approach if MCP gets wired into Claude Code for this project.

## 8. Developer blogs

- Donny Wals: "Designing custom UI with Liquid Glass on iOS 26"
- Swift with Majid: Glassifying custom views series
- Nil Coalescing: Presenting Liquid Glass sheets
- Create with Swift: Design principles guide
- SerialCoder.dev: Morphing implementations

## 9. Design tools

- https://www.figma.com/community/file/1522715486231239473/glass-effect-playground — official Figma glass effect playground
- https://www.figma.com/community/file/1514237154489556536 — iOS 26 Liquid Glass on Figma
- https://www.figma.com/community/file/1514313836061040295/ios-26-liquid-glass-components — components library
- https://app.spline.design/community/file/3cbf0e6a-09c8-4b47-9560-c3ff84130086 — 3D recreation (Spline)
