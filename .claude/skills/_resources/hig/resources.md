---
topic: HIG — external resources + citations
last_fetched: 2026-04-20
staleness_days: 30
---

# HIG — external resources

## Official Apple

- https://developer.apple.com/design/human-interface-guidelines — root HIG (SPA-rendered, paste content for rehydration)
- https://developer.apple.com/design/human-interface-guidelines/gestures
- https://developer.apple.com/design/human-interface-guidelines/drag-and-drop
- https://developer.apple.com/design/human-interface-guidelines/components/layout-and-organization/lists-and-tables
- https://developer.apple.com/design/human-interface-guidelines/modality
- https://developer.apple.com/design/human-interface-guidelines/motion
- https://developer.apple.com/design/human-interface-guidelines/layout
- https://developer.apple.com/design/human-interface-guidelines/foundations/materials
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.apple.com/design/human-interface-guidelines/typography
- https://developer.apple.com/design/human-interface-guidelines/color
- https://developer.apple.com/design/tips/ — UI Design Do's and Don'ts (simpler page, sometimes has verbatim-reachable content)

## Primary GitHub community sources

- **https://github.com/ehmo/platform-design-skills** — 333 stars, 450+ distilled rules across Apple HIG, Material Design 3, WCAG 2.2. Skill pack. Primary source for `[community — ehmo]` tags. Last pushed 2026-03-19.
- **https://github.com/sindresorhus/human-interface-guidelines-extras** — 267 stars, community additions Apple doesn't document. Primary source for `[community — sindresorhus]` tags. Last pushed 2026-02-02.
- **https://github.com/gingerbeardman/apple-human-interface-guidelines** — 244 stars, HISTORICAL HIG archive (1980–2014 PDFs). For historical curiosity, not current conventions.
- **https://github.com/tmaasen/apple-dev-mcp** — MCP server for HIG + Apple docs, auto-updated every 4 months. Alternative integration path if MCP ever gets wired into Claude Code for this project.

## Secondary

- https://www.nadcab.com/blog/apple-human-interface-guidelines-explained — "Apple Human Interface Guidelines: Complete iOS Design 2026" (general overview)
- https://medium.com/design-bootcamp/understanding-apples-human-interface-guidelines-... — developer perspectives
- https://codershigh.github.io/guidelines/ios/human-interface-guidelines/ — older mirror of iOS HIG pre-2020 (historical)

## WWDC sessions (historical, for interaction patterns)

- WWDC 2017 Session 203 — Introducing Drag and Drop
- WWDC 2017 Session 213 — Mastering Drag and Drop
- WWDC 2017 Session 219 — Modern User Interaction on iOS
- WWDC 2020 Session 10073 — Build with iOS pickers, menus and actions
- WWDC 2023 Session 10215 — Design dynamic iOS apps with Observation

Transcripts via:
- https://wwdcnotes.com/documentation/wwdcnotes/ (community notes)
- https://nonstrict.eu/wwdcindex/ (searchable index)
- https://asciiwwdc.com/ (older sessions only)

## Accessibility specifically

- https://www.w3.org/WAI/WCAG22/quickref/ — WCAG 2.2 quick reference
- https://developer.apple.com/accessibility/ — Apple's accessibility hub
- https://developer.apple.com/videos/play/wwdc2023/10089 — Build accessible apps with SwiftUI and UIKit

## Tools

- Xcode Accessibility Inspector (built-in)
- Figma Stark plugin — designer-side contrast + color-blind checks
- Chrome DevTools → Lighthouse → Accessibility audit
- axe DevTools (browser extension) — runtime a11y rule checker

## Rehydration notes

See `_resources/INDEX.md` → "Rehydration pattern" for the canonical procedure:

1. User paste from Apple's developer.apple.com directly (Apple's SPA pages block WebFetch).
2. `gh api repos/<owner>/<repo>/contents/<file> --jq '.content' | base64 -d` for GitHub community sources (bypasses WebFetch hallucination).
3. WebFetch works fine on server-rendered pages (Apple newsroom, Wikipedia, blogs).

When a conflict surfaces between community sources and Apple, default to Apple. User will paste authoritative text when the stakes are high.
