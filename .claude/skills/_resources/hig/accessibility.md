---
topic: HIG — accessibility (VoiceOver, Bold Text, Reduce Motion, etc.)
last_fetched: 2026-04-20
staleness_days: 7
sources:
  - https://github.com/ehmo/platform-design-skills (skills/ios/SKILL.md section 5)
  - Apple HIG (developer.apple.com/design/human-interface-guidelines/accessibility)
  - WCAG 2.2
---

# HIG — accessibility

## TOC

1. VoiceOver labels on all interactive elements
2. Logical VoiceOver navigation order
3. Bold Text support
4. Reduce Motion
5. Increase Contrast
6. Don't convey info by color / shape / position alone
7. Alternative interactions for all gestures
8. Switch Control + Full Keyboard Access
9. Web translation

## 1. VoiceOver labels on all interactive elements

**[community — ehmo Rule 5.1]** "Every button, control, and interactive element must have a meaningful accessibility label."

Bad:
```swift
Button(action: addToCart) {
    Image(systemName: "cart.badge.plus")
}
// VoiceOver reads "cart.badge.plus" — meaningless
```

Good:
```swift
Button(action: addToCart) {
    Image(systemName: "cart.badge.plus")
}
.accessibilityLabel("Add to cart")
```

### claudeHub translation

- Every icon-only `<button>` / `<a>` needs `aria-label`.
- Learn-item action buttons (pin, mastery, delete, grab handle) all need explicit labels.
- Close-X buttons on modals need `aria-label="Close"`.
- Candidate rule to add to `design-review`.

## 2. Logical VoiceOver navigation order

**[community — ehmo Rule 5.2]** "Ensure VoiceOver reads elements in a logical order."

SwiftUI:
```swift
VStack {
    Text("Product Name").accessibilitySortPriority(2) // read first
    Text("Price: $29.99").accessibilitySortPriority(1) // read second
}
```

### Web equivalent

- Respect DOM order — VoiceOver / NVDA / JAWS read elements in source order.
- If visual layout diverges from reading order (e.g., CSS Grid places things out of source order), add `tabindex` or ARIA attributes to restore intent.

## 3. Bold Text support

**[community — ehmo Rule 5.3]** "When the user enables Bold Text in Settings, custom-rendered text must adapt. SwiftUI text styles handle this automatically."

SwiftUI auto-handles `Text` with semantic styles. Custom rendering needs:
```swift
@Environment(\.legibilityWeight) var legibilityWeight

Text("Custom Label")
    .fontWeight(legibilityWeight == .bold ? .bold : .regular)
```

UIKit:
```swift
UIAccessibility.isBoldTextEnabled  // current state
UIAccessibility.boldTextStatusDidChangeNotification  // re-query on change
```

### Web equivalent

No direct CSS media query for Bold Text. User's browser / OS-level font-weight preference is usually inherited by default. If you hardcode `font-weight: 400`, you override the user's preference. Use `font-weight: normal` or omit entirely when you want the user's system weight.

## 4. Reduce Motion

**[community — ehmo Rule 5.4]** "Disable decorative animations and parallax when Reduce Motion is enabled."

SwiftUI:
```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion

.animation(reduceMotion ? nil : .spring(), value: isExpanded)
```

### Web equivalent

```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none; animation: none; }
}
@media (prefers-reduced-motion: no-preference) {
  /* Full motion here */
}
```

claudeHub already follows this — `CLAUDE.md` + `design-review` hard rule 4.

## 5. Increase Contrast

**[community — ehmo Rule 5.5]** "When the user enables Increase Contrast, ensure custom colors have higher-contrast variants."

SwiftUI:
```swift
@Environment(\.colorSchemeContrast) var colorSchemeContrast
// .standard or .increased
```

### Web equivalent

```css
@media (prefers-contrast: more) {
  .button { border-width: 2px; }
  .text-muted { color: var(--text-full-contrast); }
}
```

claudeHub currently doesn't adapt — candidate improvement (see `liquid-glass/claudehub-roadmap.md` proposal C).

## 6. Don't convey info by color / shape / position alone

**[community — ehmo Rule 5.6]** "Information must be available through multiple channels. Pair visual indicators with text or accessibility descriptions."

Same principle as color.md section 3 (never rely on color alone). Broader scope: don't rely on shape, position, or motion alone either.

Examples of the anti-pattern:
- Red border = error (color alone). Fix: add icon + error text.
- Round icon = primary, square = secondary (shape alone). Fix: label them.
- Top-of-screen = urgent (position alone). Fix: use a status label.

## 7. Alternative interactions for all gestures

**[community — ehmo Rule 5.7]** "Every custom gesture must have an equivalent tap-based or menu-based alternative for users who cannot perform complex gestures."

### claudeHub translation

- Swipe-left-mastery was retired in M9.17b.d precisely because a visible button alternative (the ✓ icon) was better.
- Drag-to-reorder has a visible grab handle (⋮⋮) — users with motor impairments can still target it precisely.
- Any future gesture feature must ship with a button / menu alternative.

## 8. Switch Control + Full Keyboard Access

**[community — ehmo Rule 5.8]** "Ensure all interactions work with Switch Control (external switches) and Full Keyboard Access (Bluetooth keyboards). Test navigation order and focus behavior."

### Web equivalent

- Every interactive element must be keyboard-reachable (`tabindex` ≥ 0 or natively focusable).
- Focus rings must be visible — `:focus-visible` with `outline: 2px solid var(--accent-border)` (claudeHub convention, shipped M9.16n).
- Enter / Space activates buttons.
- Escape closes modals.

claudeHub note: M9.16n's unified `:focus-visible` recipe across 15 interactive elements was driven by this requirement.

## 9. Web translation (summary table)

| Apple accessibility concept | Web equivalent |
|---|---|
| VoiceOver label | `aria-label`, `aria-labelledby` |
| Sort priority | DOM order, or `tabindex` |
| Bold Text | User's browser font-weight preference (inherited) |
| Reduce Motion | `@media (prefers-reduced-motion: reduce)` |
| Increase Contrast | `@media (prefers-contrast: more)` |
| Reduced Transparency | `@media (prefers-reduced-transparency: reduce)` |
| Switch Control | Keyboard-reachable + `:focus-visible` |
| Full Keyboard Access | Standard keyboard nav, Enter/Space/Escape handlers |
| Dynamic Type | Use `rem` units (respects user's browser font-size) |
| Color vision deficiency | Never rely on color alone |

## Cross-references

- For reduced-motion in glass contexts → `liquid-glass/accessibility.md`
- For reduced-transparency fallback → `liquid-glass/web-implementation.md`
- For focus-ring conventions in claudeHub → `design-review/SKILL.md` rule 1
