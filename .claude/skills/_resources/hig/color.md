---
topic: HIG — color, Dark Mode, contrast
last_fetched: 2026-04-20
staleness_days: 7
sources:
  - https://github.com/ehmo/platform-design-skills (skills/ios/SKILL.md section 4)
  - Apple HIG (developer.apple.com/design/human-interface-guidelines/color)
  - WCAG 2.2
---

# HIG — color + Dark Mode + contrast

## TOC

1. Semantic system colors (automatic adaptation)
2. Custom color with light + dark variants
3. Never rely on color alone (colorblind users)
4. Contrast ratios (WCAG AA = 4.5:1)
5. Display P3 wide gamut
6. Three-level background hierarchy
7. One accent color for interactive elements
8. claudeHub translation (light-only)

## 1. Semantic system colors

**[community — ehmo Rule 4.1]** "Use system-provided semantic colors that automatically adapt to light and dark modes."

SwiftUI:
```swift
Text("Primary text").foregroundStyle(.primary)       // adapts to light/dark
Text("Secondary info").foregroundStyle(.secondary)
VStack { }.background(Color(.systemBackground))     // white in light, black in dark
```

UIKit:
- `UIColor.label`, `UIColor.secondaryLabel`, `UIColor.tertiaryLabel`, `UIColor.quaternaryLabel`
- `UIColor.systemBackground`, `UIColor.secondarySystemBackground`, `UIColor.tertiarySystemBackground`
- `UIColor.systemFill`, `UIColor.systemBlue`, `UIColor.systemRed`, etc.

**Never hardcode `Color.black` / `Color.white`** — they ignore Dark Mode.

## 2. Custom color with light + dark variants

**[community — ehmo Rule 4.2]** Define custom colors in the asset catalog with both Any Appearance and Dark Appearance variants.

Example:
```
Assets.xcassets/BrandBlue:
  Any Appearance: #0066CC
  Dark Appearance: #4DA3FF
```

Usage:
```swift
Text("Brand text").foregroundStyle(Color("BrandBlue"))  // auto-switches
```

**Why different shades:** the same hex looks different against white vs. black. Dark-mode variants are typically lighter / more saturated to maintain legibility against dark backgrounds.

## 3. Never rely on color alone

**[community — ehmo Rule 4.3]** "Always pair color with text, icons, or shapes to convey meaning. Approximately 8% of men have some form of color vision deficiency."

Bad (color-only error indicator):
```swift
TextField("Email", text: $email)
    .border(isValid ? .green : .red)
```

Good (icon + color + text):
```swift
HStack {
    Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.red)
    Text("Error: Invalid email address").foregroundStyle(.red)
}
```

## 4. Contrast ratios (WCAG AA = 4.5:1)

**[community — ehmo Rule 4.4]** "All text must meet WCAG AA contrast ratios: 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt+ bold)."

Higher tiers:
- WCAG AAA: 7:1 for normal text, 4.5:1 for large text.
- Dynamic Type at accessibility sizes may benefit from AAA-level contrast.

### Tools

- Xcode Accessibility Inspector — built-in contrast checker.
- Figma Stark plugin — designer-side.
- Chrome DevTools → Lighthouse → Accessibility → Contrast ratios.

### claudeHub

- Text stack: `#1a1816` over `#eeece7` = ~12.4:1 (AAA-comfortable).
- `text-2(0.64α)` over `#eeece7` = ~7.5:1 (AAA for normal text).
- `text-3(0.36α)` over `#eeece7` = ~4.2:1 (meets AA for large text, below AA for normal — only use for captions/meta/decorative, never body text).
- Hairlines ≤16% black alpha — purely decorative, not carrying information.

## 5. Display P3 wide gamut

**[community — ehmo Rule 4.5]** "Use Display P3 color space for vibrant, accurate colors on modern iPhones. Define colors in the asset catalog with the Display P3 gamut."

Web equivalent: `color(display-p3 ...)` syntax, or `@media (color-gamut: p3)` for conditional brighter accents. Broadly supported in Safari; Chrome adoption growing.

claudeHub note: using `oklch()` for `color-mix` (per `CLAUDE.md`) already works in wide-gamut spaces — `--base` + derived `--accent-*` tokens are P3-capable on modern displays.

## 6. Three-level background hierarchy

**[community — ehmo Rule 4.6]** For depth perception:

- `systemBackground` — primary surface (outermost).
- `secondarySystemBackground` — grouped content, cards.
- `tertiarySystemBackground` — elements within grouped content (deepest nesting).

### claudeHub

Three-level equivalent:
- `--bg-0: #eeece7` — page base.
- `--card-base: #ece9e2` — card tone.
- Glass top-token — inside cards.

## 7. One accent color for interactive elements

**[community — ehmo Rule 4.7]** "Choose a single tint/accent color for all interactive elements (buttons, links, toggles). This creates a consistent, learnable visual language."

### claudeHub translation

Per-section accents (Learn lime, Projects cyan, Tools tangerine) are scoped via `[data-section="X"]`. Within a section, all interactive accents derive from one `--base` → `--accent-*` family. Matches the spirit of Apple's rule while allowing per-tab identity.

**MODEL_COL hex literals** (`#ff7a3d`, `#14b8a6`, etc.) are chart-only and locked — independent of page accents (explicitly per `CLAUDE.md` and design-review rule 1).

## 8. claudeHub translation (light-only)

Apple's rules assume light + dark adaptation. claudeHub is **intentionally light-only**. Design-language decisions:

- No `prefers-color-scheme: dark` media query support.
- All colors tuned against the warm-greige `#eeece7` page base.
- If a user has dark-mode OS preference, claudeHub still renders light (by design).
- This is documented in `CLAUDE.md` "light-only" and is a deliberate divergence from HIG's universal dark-mode expectation.

## Cross-references

- For contrast in glass recipes → `liquid-glass/accessibility.md`
- For color as it relates to the project's design-review rule 1 (Tokens only, no magic numbers) → `CLAUDE.md` + `design-review/SKILL.md`
- For typography hierarchy (weight + size alternatives to color) → `typography.md`
