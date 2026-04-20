# `_resources/` — retrieval index

**Purpose:** dispatch questions to the smallest relevant file. Only `Read` what you need. Everything here is reference material for `design-review`, `design-amend`, and future design-language work — not code for `js/app.js` or `css/style.css`.

## How to use this index

1. Find your question in the table below.
2. `Read` the single file listed. Each file has its own TOC at the top.
3. For an overall design audit (rare), `Read` `liquid-glass/README.md` + `hig/README.md` first to get the landscape, then targeted files.

## Quick retrieval — Liquid Glass (2025 material language)

| Question | File |
|---|---|
| What is Liquid Glass? Material fundamentals, specular, lensing, variants | `liquid-glass/fundamentals.md` |
| SwiftUI `.glassEffect`, `GlassEffectContainer`, `.buttonStyle(.glass)` signatures | `liquid-glass/apis.md` |
| UIKit `UIGlassEffect`, `UIGlassContainerEffect` | `liquid-glass/apis.md` |
| Which components auto-adopt in iOS 26? (toolbars, tab bars, sheets, etc.) | `liquid-glass/components.md` |
| Apple's verbatim design rules (no glass-on-glass, avoid overuse, concentric rounding) | `liquid-glass/components.md` |
| Reduced transparency / reduced motion / increased contrast behavior | `liquid-glass/accessibility.md` |
| Anti-patterns (visual + technical + usability) | `liquid-glass/accessibility.md` |
| Known iOS 26 issues + workarounds | `liquid-glass/accessibility.md` |
| Battery / GPU / memory performance | `liquid-glass/performance.md` |
| How to replicate Liquid Glass in CSS / SVG filters on the web | `liquid-glass/web-implementation.md` |
| What claudeHub already does that approximates Liquid Glass | `liquid-glass/claudehub-roadmap.md` |
| Intentional claudeHub divergences from Apple (do NOT flag as violations) | `liquid-glass/claudehub-roadmap.md` |
| Evolution proposals: low-effort polish, medium-effort experiments, parked work | `liquid-glass/claudehub-roadmap.md` |
| External links (Apple docs, WWDC sessions, GitHub references) | `liquid-glass/resources.md` |

## Quick retrieval — HIG (older foundations)

| Question | File |
|---|---|
| Tap target minimum (44×44), thumb zone, safe areas | `hig/layout.md` |
| Standard gestures (tap, swipe, long-press, pinch) + system gestures you can't override | `hig/gestures-and-drag.md` |
| Drag-and-drop lift, handles, drop choreography, reorder | `hig/gestures-and-drag.md` |
| Swipe actions on rows (destructive = trailing, contextual = leading) | `hig/gestures-and-drag.md` |
| Sheets / popovers / action sheets conventions | `hig/modality.md` |
| Dismiss-button conventions (Done on right, when to use X) | `hig/modality.md` |
| Easing curves + durations + reduced-motion | `hig/motion.md` |
| Dynamic Type + text styles + custom font scaling | `hig/typography.md` |
| System colors + Dark Mode + 4.5:1 contrast + never-color-alone | `hig/color.md` |
| System materials (thin / regular / thick / ultra) + vibrancy | `hig/materials.md` |
| VoiceOver labels + Bold Text + Reduce Motion + Switch Control | `hig/accessibility.md` |
| Community workarounds (Settings window, drag-drop mixed content, undo button style) | `hig/community-extras.md` |
| External links (Apple docs, community GitHub, community blogs) | `hig/resources.md` |

## Quick retrieval — claudeHub-specific

| Question | File |
|---|---|
| How does claudeHub's `.glass` primitive map to `.glassEffect(.regular)`? | `liquid-glass/claudehub-roadmap.md` |
| Which Apple rules does claudeHub intentionally diverge from and why? | `liquid-glass/claudehub-roadmap.md` |
| What polish could we add to improve glass fidelity? | `liquid-glass/claudehub-roadmap.md` |
| Is a specific reduced-mode media query right? | `liquid-glass/web-implementation.md` |

## Load-for-overall-design-check pattern

When a design-review or design-amend needs the full landscape (rare — usually you want one topic):

1. `Read` `liquid-glass/README.md` (overview + what's in each LG file)
2. `Read` `hig/README.md` (overview + what's in each HIG file)
3. Based on that, `Read` specific topic files as needed.

## Conflict resolution policy

When two sources disagree:

1. **Vendor primary source wins** (Apple developer docs, Apple newsroom). If the user pastes authoritative vendor text, that supersedes everything else in the cache.
2. **Reputable GitHub community sources** (conorluddy/LiquidGlassReference, ehmo/platform-design-skills, sindresorhus/human-interface-guidelines-extras) rank above general blogs / Medium posts.
3. **Secondary blogs / aggregators** are the lowest tier — directional guidance only.

When content conflicts are surfaced to the user, they have explicitly committed to going to the original vendor source and pasting the authoritative text. Accept that paste, replace the conflicting entry, re-tag as `[verbatim]`, log the conflict in the file's fetch-quality section.

## Source-quality tags (used in every content file)

- **[verbatim, Apple docs]** — direct from developer.apple.com (user-pasted; those pages are JS-rendered SPAs that block WebFetch).
- **[verbatim, Apple newsroom]** — from Apple press releases (server-rendered).
- **[community — conorluddy]** — from https://github.com/conorluddy/LiquidGlassReference (Claude-ready 1841-line SwiftUI reference).
- **[community — ehmo]** — from https://github.com/ehmo/platform-design-skills (450+ rules skill pack; Apple-HIG-scraped + distilled).
- **[community — sindresorhus]** — from https://github.com/sindresorhus/human-interface-guidelines-extras (workarounds Apple doesn't document).
- **[secondary]** — from developer blogs / aggregators. Treat as guidance.
- **[community, anecdotal]** — single-source claims (e.g., specific performance numbers). Directional only.

## Rehydration pattern (for stale entries)

Apple's developer documentation pages are JavaScript-rendered SPAs. Direct `WebFetch` returns page titles only. Also: `WebFetch`'s summarizer model has a pre-WWDC25 training cutoff and will hallucinate that iOS 26 / Liquid Glass / `.glassEffect` are fictional. **Do not trust `WebFetch` to "evaluate" community references.** To rehydrate:

1. **User paste** — open Apple's page in a real browser, copy body, paste into a session. Cleanest first-party path.
2. **GitHub raw content** — `gh api repos/<owner>/<repo>/contents/<file> --jq '.content' | base64 -d > /tmp/out.md` bypasses WebFetch entirely.
3. **Server-rendered pages** — Apple newsroom, Wikipedia, most developer blogs — `WebFetch` works fine.
