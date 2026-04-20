# `_resources/` — shared reference files for skills

Reference files consumed by multiple skills (primarily `design-review` and `design-amend`). **Not itself a skill** — the leading underscore keeps it out of the skill dispatcher namespace.

## Start here

**`INDEX.md`** is the master retrieval dispatcher. Question → file lookup tables for Liquid Glass, HIG, and claudeHub-specific concerns. Load it first to avoid reading files you don't need.

## Structure

```
_resources/
├── INDEX.md                       ← retrieval dispatcher (load first)
├── README.md                      ← you are here
│
├── liquid-glass/                  ← Apple's 2025 design language
│   ├── README.md                  ← topic-level overview + file index
│   ├── fundamentals.md            ← material, variants, design philosophy
│   ├── apis.md                    ← SwiftUI + UIKit API surface
│   ├── components.md              ← redesigned component catalog + Apple's verbatim rules
│   ├── accessibility.md           ← a11y + anti-patterns + known iOS 26 issues
│   ├── performance.md             ← battery + GPU + optimization
│   ├── web-implementation.md      ← CSS/SVG filter patterns for claudeHub stack
│   ├── claudehub-roadmap.md       ← current mapping + evolution proposals
│   └── resources.md               ← external links (Apple + GitHub + WWDC)
│
└── hig/                           ← older HIG foundations (gestures, layout, etc.)
    ├── README.md                  ← topic-level overview + file index
    ├── layout.md                  ← safe areas, tap targets (44×44), thumb zone
    ├── gestures-and-drag.md       ← gesture vocabulary + drag-and-drop + reorder
    ├── modality.md                ← sheets, popovers, action sheets
    ├── motion.md                  ← easing, durations, reduced-motion
    ├── typography.md              ← Dynamic Type, text styles
    ├── color.md                   ← system colors, Dark Mode, contrast
    ├── materials.md               ← system materials (thin/thick/ultra), vibrancy
    ├── accessibility.md           ← VoiceOver, Bold Text, Reduce Motion, semantic labels
    ├── community-extras.md        ← workarounds from sindresorhus + ehmo
    └── resources.md               ← external links
```

## Consumers

- **`design-review`** — reads for vocabulary + reference. No WebFetch in `allowed-tools`; surfaces staleness rather than auto-refreshing.
- **`design-amend`** — can refresh via WebFetch when `last_fetched` exceeds `staleness_days`. Preferred for cache updates.

## Conventions

- Each content file is **standalone** — readable without needing to read other files.
- Each content file has a **TOC at the top** — scan-first, read-deep-when-relevant.
- Every factual claim carries a **source-quality tag** (see `INDEX.md` for tag definitions).
- Frontmatter declares `last_fetched`, `staleness_days`, and `sources`.
- Files in `liquid-glass/` reference current (2025) Apple design language. Files in `hig/` reference older foundations.

## Rehydration cadence

**7-day staleness window.** After 7 days, `design-amend` (has WebFetch) should attempt a refresh. See `INDEX.md` → "Rehydration pattern" for the procedure. Apple's SPA-rendered developer docs require user-paste or headless-browser fetch; community GitHub references can be refreshed via `gh api`.
