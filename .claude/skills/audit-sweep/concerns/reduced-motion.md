# reduced-motion (OPT-IN ONLY)

> **Opt-in concern.** Never selected by auto-detect. Only runs when explicitly invoked via `/audit-sweep reduced-motion`. Structural CSS parsing is needed to determine whether an `animation:` declaration is inside a `@media (prefers-reduced-motion: no-preference)` wrapper or not, which regex alone cannot reliably do. Ask the user to confirm before writing any patch.

Every `animation:` declaration that references a `@keyframes` name should either be inside `@media (prefers-reduced-motion: no-preference)` or have a reduced-motion fallback that holds the final rendered state (no disappearing content, no blocked data reveals).

## Detection (conservative grep)

```
grep -nE '@keyframes\s+[a-zA-Z_][a-zA-Z0-9_-]*' css/style.css css/overrides.css
```

For each `@keyframes <name>` found, grep for uses:

```
grep -nE 'animation:.*<name>' css/style.css css/overrides.css
```

For each use, read ~40 lines around it to determine whether the surrounding context is inside a `@media (prefers-reduced-motion: no-preference)` block. Regex alone will miss this — Read + human judgment is required.

## Exemptions (do NOT flag)

- Animations that run only on states that never paint in reduced-motion contexts (e.g. a :hover-only transform — reduced-motion users' pointer intent still fires, but the animation is typically acceptable as a no-op fallback).
- Keyframe uses inside SVG `<animate>` or `<animateTransform>` elements — out of scope.
- Comments and strings.

## Canonical fix

```css
/* before */
.card {
  animation: fadeIn 0.3s var(--ease-premium);
}

/* after */
@media (prefers-reduced-motion: no-preference) {
  .card {
    animation: fadeIn 0.3s var(--ease-premium);
  }
}
.card {
  /* reduced-motion final state already rendered via default styles */
}
```

Or, if the final state isn't naturally rendered without the animation, explicitly set it:

```css
.card {
  opacity: 1;  /* final state of fadeIn */
}
@media (prefers-reduced-motion: no-preference) {
  .card {
    animation: fadeIn 0.3s var(--ease-premium);
  }
}
```

## Report grouping

Group by `@keyframes` name. For each keyframe, list every use and whether it's wrapped, unwrapped, or ambiguous.

## Concern-specific guardrails

- **Always ask the user to confirm before patching.** Reduced-motion patches can reorder CSS in ways that change specificity — safer to let the user inspect the diff before committing.
- Skip any animation inside `js/app.js` template-literal CSS-in-JS — out of scope for this concern (manual audit instead).
- Respect `CLAUDE.md` hard rule: reduced-motion state = final state. Don't apply a null-motion fallback that hides content.
- If a keyframe is referenced 5+ times, the `@media` wrapper refactor is a bigger change — flag as a follow-up milestone rather than an audit-sweep patch.
