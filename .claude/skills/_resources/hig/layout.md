---
topic: HIG — layout, safe areas, tap targets
last_fetched: 2026-04-20
staleness_days: 7
sources:
  - https://github.com/ehmo/platform-design-skills (skills/ios/SKILL.md section 1)
  - Apple HIG (developer.apple.com/design/human-interface-guidelines/layout)
  - Apple UI Design Tips (developer.apple.com/design/tips/)
---

# HIG — layout + tap targets

## TOC

1. Tap target minimum (44×44)
2. Thumb zone (primary actions at bottom)
3. Safe areas
4. Responsive sizing
5. Hit-area padding technique

## 1. Tap target minimum (44×44)

**[verbatim, Apple UI Design Tips]** "create controls that measure at least 44 points x 44 points" so they can be accurately tapped with a finger.

**[community — ehmo Rule 1.2]** "Minimum Touch Target 44pt. Every interactive element must have a hit area of at least 44pt × 44pt. Research shows elements smaller than this result in tap errors approximately 25% of the time, especially affecting users with motor impairments."

**Important:** the 44×44 minimum applies to the **hit area**, not necessarily the visible element. A visually smaller control (e.g., a 28×28 icon button) can extend its tappable area via padding to reach the 44×44 bounding box.

**[community — ehmo Rule 1.3]** "Adequate Spacing Between Controls. Place at least 8pt between tappable controls so users don't accidentally hit the wrong target. For adjacent tabs or segmented controls, ensure each segment itself meets 44pt minimum."

### claudeHub translation

- Learn-item inline action buttons are 28×28 **visual** tiles with vertical padding reaching 44px hit area. Correct pattern — the *bounding box* is what matters.
- Chip spacing → ensure ≥8px gap between tappable chips (verify in nav pill + filter chips).
- Any new icon-only button must meet 44×44 bounding box OR sit within a 44×44 tappable ancestor.

## 2. Thumb zone

**[community — ehmo Rule 1.5]** "Place primary actions (buttons that complete the core user task) within the bottom third of the screen, near the user's thumb. Place destructive or reversible actions further from the thumb rest position to prevent mis-taps."

**Apple's HIG framing:** bottom-of-screen placement for primary actions respects the natural thumb zone on modern iPhones (reachability).

### claudeHub translation

- Nav pill placement on iOS is bottom-anchored — matches thumb zone.
- Destructive buttons (wipe, delete) currently use two-tap confirm — protects against misfires anywhere on screen.
- Learn-item action clusters are inline with the card; position on right side is less thumb-optimal but two-tap confirm on destructive mitigates.

## 3. Safe areas

**[community — ehmo Rule 1.1]** "Respect All Safe Area Insets. Never place content under the status bar, Dynamic Island, home indicator, or camera notch. Use `safeAreaInset(edge:)` modifier or `ignoresSafeArea(.container, edges:)` to extend specific areas intentionally. Always test on iPhone SE (small screen) and iPhone Pro Max (large screen with Dynamic Island)."

- **Top:** status bar, Dynamic Island (iPhone 14 Pro+), camera notch (iPhone X through 13).
- **Bottom:** home indicator area (post-iPhone X).
- **Sides:** typically unused, but landscape mode may introduce horizontal inset.

### claudeHub translation (PWA)

- Use `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` in CSS.
- `body::before` ambient-darkening radial respects viewport — doesn't fight safe areas.
- Modal headers add safe-area-inset-top padding (confirmed M9.16k).

## 4. Responsive sizing

**[community — ehmo Rule 1.6]** "Support all iPhone sizes from iPhone SE (375pt) to iPhone Pro Max (430pt). Use Auto Layout, SwiftUI flexible layouts (`GeometryReader`, `ViewThatFits`), and relative sizing rather than fixed pixel dimensions."

### claudeHub translation

- Viewport units (`vw`, `vh`) + `clamp()` for fluid typography.
- CSS grid + flexbox for layouts that adapt without media queries.
- Test on narrowest phone viewport (320px) and widest tablet (1024px) before shipping.

## 5. Hit-area padding technique

When a visual element is smaller than 44×44 (e.g., a compact icon), extend its tappable area via invisible padding. CSS:

```css
.compact-icon-button {
  /* Visible 28×28 glyph */
  width: 28px;
  height: 28px;
  padding: 8px; /* Extends hit area to 44×44 */
  /* The button's bounding box is now 44×44 */
}
```

SwiftUI:
```swift
Image(systemName: "heart")
    .frame(width: 24, height: 24)       // Visible size
    .frame(minWidth: 44, minHeight: 44) // Hit area minimum
    .contentShape(Rectangle())          // Ensure entire bounds are hittable
```

## Cross-references

- For gestures that happen inside tap targets → `gestures-and-drag.md`
- For Dynamic Type scaling affecting layouts → `typography.md`
- For accessibility considerations on tap targets → `accessibility.md`
