# pill-radii

Enforce `--radius-pill` → `var(--radius-sm)` purge (completed in M9.2) against regression. Pill-shaped elements use 6px; genuine circles use `border-radius: 50%`.

## Detection

```
grep -nE 'border-radius:\s*(999px|9999px|50rem|100vmax|50vmax)' css/style.css css/overrides.css
grep -nE 'border-radius:\s*var\(--radius-pill\)' css/style.css css/overrides.css
```

Also check `index.html` and `js/app.js` template literals for inline `style="border-radius: 9999px"` etc.

## Exemptions (do NOT flag)

- Any selector containing `.avatar`, `.dot`, `.spinner`, `[class*="circle"]`, `[class*="round"]`, `.mastery-dot`, `.sentiment-dot`.
- Circular buttons with `border-radius: 50%` — that's the canonical circle form, not the removed `--radius-pill` token.
- A `50%` on a `width:30px; height:30px` (or similar square-dimension) element that's clearly a round button/indicator — context check before flagging.
- SVG `<circle>` or `<rect rx=...>` — out of scope (SVG attribute, not CSS).

## Canonical fix

```css
/* before */
.some-pill {
  border-radius: 9999px;
}

/* after */
.some-pill {
  border-radius: var(--radius-sm);
}
```

## Report grouping

Group hits by TOC section banner in `css/style.css` (e.g. "FOUNDATIONS", "CHIPS", "CARDS"). If the file has drifted, report by nearest banner line + offset.

## Concern-specific guardrails

- Don't rewrite `50%` inside a selector that includes the substring `circle`, `dot`, `avatar`, `spinner`, or `round`.
- If a flagged selector is a genuine rounded-rect whose visible shape really is a pill (height ≈ line-height, width >> height), the fix to `var(--radius-sm)` is correct — the project has deliberately moved off fully rounded pills.
- Check whether the flagged selector is inside `_parked/` — skip if so.
