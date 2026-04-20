# easings

All transitions and animations must use `var(--ease-premium)` (default), `var(--ease-lensing)`, or `var(--ease)`. No `ease`, `ease-in`, `ease-in-out`, `ease-out`, `linear`, or raw `cubic-bezier(...)` literals.

## Detection

```
grep -nE 'transition:.*\b(ease|ease-in|ease-out|ease-in-out|linear)\b' css/style.css css/overrides.css
grep -nE 'transition-timing-function:\s*\b(ease|ease-in|ease-out|ease-in-out|linear)\b' css/style.css css/overrides.css
grep -nE 'animation:.*\b(ease|ease-in|ease-out|ease-in-out|linear)\b' css/style.css css/overrides.css
grep -nE 'animation-timing-function:\s*\b(ease|ease-in|ease-out|ease-in-out|linear)\b' css/style.css css/overrides.css
grep -nE 'cubic-bezier\s*\(' css/style.css css/overrides.css
```

## Exemptions (do NOT flag)

- `cubic-bezier(...)` that appears inside a `--ease-*` token definition in `:root` (those ARE the canonical curves).
- Comments and strings — `grep -n` will catch them; skip any match inside `/* ... */` or inside a quoted string.
- Keyframe step descriptors where `linear` is intentional for a linear interpolation (rare in this project — verify with user if unsure, don't blindly swap).

## Canonical fix

```css
/* before */
.some-element {
  transition: opacity 0.3s ease-in-out;
}

/* after */
.some-element {
  transition: opacity 0.3s var(--ease-premium);
}
```

For `cubic-bezier(...)` literals outside `:root`, replace with the closest matching token:
- Symmetric ease → `var(--ease-premium)` (0.22, 0.61, 0.36, 1).
- Subtle ease or glass lensing → `var(--ease-lensing)`.
- Fallback → `var(--ease)`.

## Report grouping

Group by property type (transition vs animation) then by TOC section banner.

## Concern-specific guardrails

- Don't touch `:root` — token definitions are authoritative.
- Don't rewrite a `cubic-bezier` whose values indicate a deliberate overshoot/bounce curve (`cubic-bezier(.34,1.56,...)`-style). Flag as a question — overshoots are banned per `CLAUDE.md`, so this should become a bug report, not an auto-patch.
- If the file uses a one-off JS-animated timing (via `requestAnimationFrame`), skip — out of scope for CSS audit.
