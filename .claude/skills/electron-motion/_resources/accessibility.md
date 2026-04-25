# Accessibility — WebGL Canvas Animations

Distilled from WCAG 2.2, MDN, A11Y Project, WebAIM, Josh Comeau. Last updated 2026-04-25.

## prefers-reduced-motion (the foundation)

**Detect via JavaScript** (CSS `@media` doesn't apply to canvas content):

```ts
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

**When reduced is true:**
- Disable animation entirely OR render a static end-state
- Don't loop; render once and stop
- Slower playback alone is NOT sufficient — vestibular users need motion to STOP

## Screen reader behavior

**Decorative canvas → `aria-hidden="true"`** on the canvas element.

- Screen readers see canvas as a "black box" — they can't parse pixels
- Surrounding DOM text remains in the accessibility tree
- DO NOT add `aria-label` to a decorative canvas — creates confusion

For our atom: the wordmark text ("aiUniversity") is real DOM. The canvas is purely decorative. `aria-hidden="true"` on canvas, leave the text alone.

## Focus management

When a modal opens or keyboard focus enters an interactive element near an animation:
- Pause the animation
- Resume after focus leaves or interaction completes

This isn't strictly required by WCAG but is best practice for cognitive load and vestibular comfort.

## Pause-on-hover

Best practice for users with vestibular disorders. Especially important for educational content where sustained focus is required.

## User-controllable "minimize animations" toggle

Recommended beyond OS-level `prefers-reduced-motion`. Some users want finer control:
- "Show none"
- "Show minimal"
- "Show full"

Surface in Settings. Not a WCAG requirement, but considered best practice in 2026.

## WCAG 2.2 specific criteria

| Criterion | Level | Rule |
|---|---|---|
| **2.2.2 Pause, Stop, Hide** | A | Animations auto-playing >5s in parallel with other content MUST have pause controls |
| **2.3.3 Animation from Interactions** | AAA | User-triggered motion must be disableable unless essential to function |
| **No "seizure flash" rule** | — | The 2 Hz+ flash limit applies to rapid on/off patterns, NOT smooth motion |

**Practical implication:** For atom animations <5s, no pause control required. For Genius celebration ≥5s, must offer pause.

## Duration thresholds

- Animations >300-500ms can trigger vestibular symptoms in sensitive users
- Parallax/parallax scrolling is particularly problematic
- Keep decorative animations <1-2s
- WCAG hard limit: 5s (auto-play threshold)

## Learning app context (stricter)

- **Quizzes/lessons:** AVOID motion during assessment. Cognitive load makes motion more distracting.
- **Completion screens:** lower-risk; celebration motion is acceptable and expected
- **Industry best practice:** disable animations during quiz interactions, enable only on completion

## Battery/performance as accessibility

Continuous WebGL rendering drains battery on mobile. Battery depletion is a barrier for disabled users (e.g., limited charger access). Offer reduced-motion settings that also save battery.

Not explicit in WCAG 2.2, but recognized in accessibility literature as an inclusion issue.

## Implementation checklist (for atom system)

- [x] Detect `prefers-reduced-motion` → render atom once, static
- [x] `aria-hidden="true"` on canvas
- [x] Wordmark text is real DOM (not in canvas), fully readable
- [ ] In-app "Minimize Animations" toggle in Settings (future)
- [ ] On quiz/lesson open, pause animations; resume after completion (architecture-level guard)

## Sources

- W3C WAI: WCAG 2.3.3 Animation from Interactions
- W3C WAI: WCAG 2.2.2 Pause, Stop, Hide
- MDN: prefers-reduced-motion
- A11Y Project: How-to Designing Accessible Animation
- A11Y Collective: Managing Content Visibility With aria-hidden
- Josh W. Comeau: Accessible Animations in React with prefers-reduced-motion
- CSS-Tricks: Accessible Web Animation
- Anneka Goss: Accessible WebGL
