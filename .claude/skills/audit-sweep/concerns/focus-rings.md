# focus-rings

Every `:focus-visible` block on an interactive element must match the unified recipe (landed in M9.16n): `outline: 2px solid var(--accent-border); outline-offset: 2px;` (with optional `border-radius` preservation). Divergences are regressions.

## Detection

```
grep -n ':focus-visible' css/style.css css/overrides.css -A 8
```

Walk each block and check for:

1. `outline: 2px solid var(--accent-border)` or equivalent (e.g. `outline-color: var(--accent-border); outline-style: solid; outline-width: 2px;`).
2. `outline-offset: 2px`.
3. No `box-shadow` focus ring (migrated to `outline`).

## Exemptions (do NOT flag)

- `:focus-visible { outline: none; }` deliberately used with a custom focus treatment (e.g. glow ring on inputs) — check the surrounding context; if the selector has a `box-shadow: 0 0 0 3px var(--accent-glow)` or similar compensating treatment, flag as "custom-focus-treatment" for user review rather than auto-patching.
- Focus rings inside modal interiors might use a different offset for close buttons sitting against the edge — spot-check with 10 lines of context before flagging.

## Canonical fix

```css
/* before (divergent) */
.some-btn:focus-visible {
  outline: 3px solid var(--accent-solid);
  outline-offset: 1px;
}

/* after */
.some-btn:focus-visible {
  outline: 2px solid var(--accent-border);
  outline-offset: 2px;
}
```

## Report grouping

Group by diverging property (width, color, offset, unit) then by TOC section banner.

## Concern-specific guardrails

- Preserve `border-radius` declarations inside the `:focus-visible` block — they're needed when the outline follows a radius.
- Don't remove a `:focus-visible { outline: none; }` without a compensating treatment — accessibility regression. Flag as a question.
- Don't patch `:focus` (without `-visible`) — that's a different pseudo-class and was deliberately avoided for mouse-focus noise.
