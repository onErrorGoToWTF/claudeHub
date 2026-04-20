---
topic: HIG — typography + Dynamic Type
last_fetched: 2026-04-20
staleness_days: 7
sources:
  - https://github.com/ehmo/platform-design-skills (skills/ios/SKILL.md section 3)
  - Apple HIG (developer.apple.com/design/human-interface-guidelines/typography)
---

# HIG — typography

## TOC

1. Semantic text styles (Dynamic Type foundation)
2. Dynamic Type scaling (up to ~200%)
3. Custom font scaling
4. SF Pro as default
5. Minimum text sizes
6. Hierarchy through weight + size
7. Web translation

## 1. Semantic text styles (Dynamic Type foundation)

**[community — ehmo Rule 3.1]** "Always use semantic text styles rather than hardcoded sizes. These scale automatically with Dynamic Type."

iOS semantic styles (SwiftUI):
- `.largeTitle`, `.title`, `.title2`, `.title3`
- `.headline`, `.subheadline`
- `.body`, `.callout`, `.footnote`
- `.caption`, `.caption2`

Apple's rationale: these scale automatically when users adjust Dynamic Type. Hardcoded `.font(.system(size: 17))` ignores the user's preference.

## 2. Dynamic Type scaling (up to ~200%)

**[community — ehmo Rule 3.2]** "Dynamic Type can scale text up to approximately 200% at the largest accessibility sizes. Layouts must reflow — never truncate or clip essential text."

SwiftUI detection:
```swift
@Environment(\.dynamicTypeSize) var dynamicTypeSize

if dynamicTypeSize.isAccessibilitySize {
    VStack { content }  // Stack vertically at large sizes
} else {
    HStack { content }  // Horizontal at normal sizes
}
```

### Key rule: layouts must reflow, not clip

At accessibility text sizes, a horizontal layout may no longer fit. Swap to vertical. Use `ViewThatFits` or `AnyLayout` for automatic adaptation.

## 3. Custom font scaling

**[community — ehmo Rule 3.3]** If you use a custom typeface, scale it with Dynamic Type.

**SwiftUI:**
```swift
extension Font {
    static func scaledCustom(size: CGFloat, relativeTo textStyle: Font.TextStyle) -> Font {
        .custom("CustomFont-Regular", size: size, relativeTo: textStyle)
    }
}

Text("Hello")
    .font(.scaledCustom(size: 17, relativeTo: .body))
```

**UIKit:**
```swift
let metrics = UIFontMetrics(forTextStyle: .body)
let customFont = UIFont(name: "CustomFont-Regular", size: 17)!
label.font = metrics.scaledFont(for: customFont)
label.adjustsFontForContentSizeCategory = true
```

## 4. SF Pro as default

**[community — ehmo Rule 3.4]** "Use the system font (SF Pro) unless brand requirements dictate otherwise. SF Pro is optimized for legibility on Apple displays."

- SF Pro — general iOS / iPadOS / macOS.
- SF Compact — watchOS (narrower glyphs for small screens).
- SF Mono — monospace contexts (code, tabular numbers).
- New York — serif alternative for specific contexts.

### claudeHub translation

claudeHub uses the system font stack (`-apple-system, BlinkMacSystemFont, ...`) which resolves to SF Pro on Apple devices and the platform default elsewhere. Match for this project.

## 5. Minimum text sizes

**[community — ehmo Rule 3.5]** "Never display text smaller than 11pt. Prefer 17pt for body text. Use the `caption2` style (11pt) as the absolute minimum."

### claudeHub translation

- Body text: 16–17px typical.
- Meta rows / captions: ≥12px (web baseline).
- Never go below 11px for anything meant to be read (not counting decorative-only spans).

## 6. Hierarchy through weight + size

**[community — ehmo Rule 3.6]** "Establish visual hierarchy through font weight and size. Do not rely solely on color to differentiate text levels."

Bad:
```
Primary: black text, 17pt, regular
Secondary: light gray text, 17pt, regular   ← only color distinguishes
```

Good:
```
Primary: black text, 17pt, semibold
Secondary: muted text, 15pt, regular         ← size + weight + color
```

### claudeHub translation

Text stack `#1a1816 → text-2(0.64α) → text-3(0.36α)` combines color differentiation with the project's size/weight choices — layered hierarchy.

## 7. Web translation

| Apple concept | Web equivalent |
|---|---|
| `.body` text style | `font-size: 1rem` (16-17px), `font-weight: 400` |
| Dynamic Type scaling | `font-size: clamp(1rem, 1rem + 0.5vw, 1.25rem)` OR respect user's browser font-size preference by using `rem` everywhere |
| `@Environment(\.dynamicTypeSize)` | `@media (prefers-reduced-motion)` — no direct web equivalent for Dynamic Type itself; browser respects user's font-size setting if you use `rem` |
| `UIFontMetrics.scaledFont(for:)` | CSS `clamp()` or `calc()` with viewport-relative units |

**Important:** web browsers have their own font-size user preference (in Chrome: Settings → Appearance → Font size). Using `rem` (relative to root) respects it automatically. Using `px` throughout ignores it.

## Cross-references

- For color choices affecting text legibility → `color.md`
- For Bold Text accessibility → `accessibility.md`
- For Liquid Glass typography changes (Lock Screen numeral scaling) → `liquid-glass/components.md`
