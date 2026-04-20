# hardcoded-radii

Non-circle `border-radius` values outside `:root` should use `var(--radius-sm)` (6px), `var(--radius-md)` (10px), or `var(--radius-lg)` (14px). Genuine circles use `border-radius: 50%` or an explicit px radius that halves a fixed dimension.

## Detection

```
grep -nE 'border-radius:\s*[0-9.]+(px|em|rem|%)' css/style.css css/overrides.css
```

This catches every px/em/rem/% radius literal. Filter in post-grep:

- Keep hits where the value is NOT 6px, 10px, 14px, 0, 0px, or 50%.
- Keep hits where the selector isn't in the exempt list.

## Exemptions (do NOT flag)

- `border-radius: 50%` on `.avatar`, `.dot`, `.spinner`, `[class*="circle"]`, `[class*="round"]`, `.mastery-dot`, `.sentiment-dot`, and similar genuine-circle contexts.
- `border-radius: 0` / `0px` on deliberately square-cornered elements (e.g. code blocks, fieldset edges).
- `:root` token definitions.
- Comments and strings.
- Pill-radius regressions (`999px`, `9999px`, `50rem`) — those go through the `pill-radii` concern, not here. If both concerns fire, pill-radii runs first.

## Canonical fix

Map the offending value to the nearest token:

- `4px` / `5px` / `6px` / `7px` / `8px` → `var(--radius-sm)`.
- `9px` / `10px` / `11px` / `12px` → `var(--radius-md)`.
- `13px` / `14px` / `15px` / `16px` → `var(--radius-lg)`.
- Anything larger than ~16px but not pill-shaped → flag as a question; either it's a design-intent deviation or it should be a new token.
- `4px` specifically on small inner-nested corners → `var(--radius-sm)` is usually correct, but spot-check: sometimes a smaller sub-radius is visually intentional against a parent's 6px.

```css
/* before */
.some-card {
  border-radius: 8px;
}

/* after */
.some-card {
  border-radius: var(--radius-sm);
}
```

## Report grouping

Group by source value (e.g. "8px → --radius-sm (3 hits)", "12px → --radius-md (2 hits)") then by TOC section banner.

## Concern-specific guardrails

- Don't auto-patch any radius outside the 4–16px range without flagging as a question — those may be design-intent deviations that deserve a new token or stay as literals.
- Don't touch `border-radius` inside `@keyframes` without reviewing — intermediate radius values may be intentional animation parameters.
- If a hit is inside `:focus-visible` alongside an `outline` declaration, leave it — focus-ring radius tracking the element's own radius is fine as long as the `outline` recipe matches.
