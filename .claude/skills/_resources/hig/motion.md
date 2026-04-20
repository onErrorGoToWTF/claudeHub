---
topic: HIG — motion, easing, reduced-motion
last_fetched: 2026-04-20
staleness_days: 7
sources:
  - Apple HIG (developer.apple.com/design/human-interface-guidelines/motion)
  - https://github.com/ehmo/platform-design-skills
---

# HIG — motion

## TOC

1. Apple's motion philosophy
2. Reduced Motion compliance
3. Common interaction timings (community-surveyed)
4. claudeHub's canonical easings

## 1. Apple's motion philosophy

**[verbatim, Apple HIG]** "Beautiful, fluid motions bring the interface to life, conveying status, providing feedback and instruction, and enriching the visual experience of your app or game."

**[verbatim, Apple HIG]** "Prefer quick, precise animations" — "animations that combine brevity and precision tend to feel more lightweight and less intrusive."

Key principles:
- Motion has meaning — it conveys relationship, hierarchy, or state change.
- Shorter is better unless the duration itself IS the message (e.g., a progress arc).
- Coordinated, not stacked — multiple effects sequence cleanly.

## 2. Reduced Motion compliance

**[verbatim, Apple HIG]** "When the Reduce Motion accessibility setting is on, be sure to minimize or eliminate animations. The goal of Reduced Motion is to support users with extreme motion sensitivity, who may experience negative side effects, such as nausea, dizziness, headaches, or distraction when encountering certain types of motion triggers."

**[verbatim, Apple HIG]** "if the motion itself conveys some meaning, such as a status change or a hierarchical context transition, don't remove the animation entirely. Instead, consider providing a new animation that avoids motion, or at least reduces full screen motion, such as a dissolve, highlight fade, or color shift."

### Three reduced-motion levels to support:

1. **Full motion** — default.
2. **Reduced motion, status still shown** — use dissolve / cross-fade / color shift instead of parallax / scale / translation.
3. **Absolute minimum motion** — static state change only.

### Web equivalent

```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none; animation: none; }
  /* Keep FINAL state, not initial — e.g., don't leave content mid-fade */
  .card-pre-reveal { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform 0.3s var(--ease-premium); }
}
```

### claudeHub translation

- All `transition:` rules should be wrapped in `@media (prefers-reduced-motion: no-preference)` OR have explicit final-state fallbacks.
- Existing hard rule in `design-review/SKILL.md`: rule 4 (reduced-motion compliance).
- `audit-sweep` has a concern (`reduced-motion`) but it's opt-in due to grep false-positive risk.

## 3. Common interaction timings (community-surveyed)

**Apple's HIG does NOT publish specific ms values** for most interactions. These are community-surveyed conventions from UIKit defaults + developer-blog consensus:

| Interaction | Typical duration | Source |
|---|---|---|
| Tap highlight / press state | 100–150ms | UIKit `UIControl` default |
| Hover highlight (pointer) | 150–200ms | Apple's HIG pointer interactions |
| Sibling translation (drag reorder) | 180–220ms | Common iOS drag pattern |
| Sheet slide up | 300–400ms | UIKit `presentViewController` default |
| Modal dismissal | 250–350ms | UIKit default |
| Tab crossfade | 180ms | Apple's tab switching (approx) |
| Card entrance stagger | 40ms between cards | claudeHub convention (M3 era) |
| Long-press activation | 500ms | UIKit `UILongPressGestureRecognizer` default |

**Treat these as directional.** Apple may publish authoritative numbers in a future HIG update; the absence of specific numbers in current HIG is deliberate (they want feel, not mechanical adherence).

## 4. claudeHub's canonical easings

From `CLAUDE.md` design language:

- `--ease-premium: cubic-bezier(0.22, 0.61, 0.36, 1)` — default for transitions and entrances.
- `--ease-lensing: cubic-bezier(...)` — specific glass activation / scroll-center effects (if defined).
- `--ease: var(--ease-premium)` — shorthand.
- **No bounce curves.** `cubic-bezier(0.34, 1.56, ...)`-style overshoots banned (per `CLAUDE.md`).

### Apple vs. claudeHub

Apple doesn't prescribe a specific easing in HIG. `--ease-premium` matches the general feel of Apple's "quick, precise" preference — asymmetric curve that accelerates quickly then eases to completion.

## Related rules (cross-cutting)

From `CLAUDE.md`:

- **Animations sequence, never stack** — coordinated effects run one at a time, not simultaneously.
- **Transforms are exclusive** — while a `transform` animates, pause other animations on that element.
- **No flicker on resize** — use compositor-only properties (`transform`, `opacity`, `filter`, `box-shadow`) for anything that moves.

## Cross-references

- For specific drag/drop timing → `gestures-and-drag.md`
- For sheet transition timing → `modality.md`
- For Liquid Glass motion behaviors → `liquid-glass/fundamentals.md` section 4
