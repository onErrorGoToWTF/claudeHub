---
topic: Liquid Glass — claudeHub current state + evolution roadmap
last_fetched: 2026-04-20
staleness_days: 30
scope: project-specific synthesis (not canonical Apple material)
---

# Liquid Glass — claudeHub mapping + roadmap

## TOC

1. What claudeHub already does (approximates Liquid Glass)
2. Intentional divergences (do NOT flag as violations)
3. Vocabulary mapping (Apple → claudeHub)
4. Low-effort improvements (menu of proposals)
5. Medium-effort experiments (research-grade)
6. High-effort or out-of-scope (parked)

## 1. What claudeHub already does

| Apple vocabulary | claudeHub implementation | Fidelity |
|---|---|---|
| `.glassEffect(.regular)` material | `.glass` class with `backdrop-filter: blur() saturate()` + `--glass-top/bottom` gradient | Solid approximation |
| `.glassEffect(.clear)` | Not implemented — would be a thinner-blur, higher-transparency variant | Gap |
| `.buttonStyle(.glass)` | Transparent-glass CTA treatment + impressed label | Good match |
| `.buttonStyle(.glassProminent)` | Solid-white active chip / primary CTA | Good match |
| Functional layer / content layer separation | Nav pill + floating glass cards over non-glass page body | Good match (mostly) |
| Top-edge specular highlight | `inset 0 1px 0 rgba(255,255,255,0.55)` | Static stand-in for motion-driven |
| Ambient color informed by surrounding content | Warm-greige page base + radial ambient darkening on `body::before` | Parallel concept, not dynamic |
| Debossed / impressed labels | `.label-debossed` utility | claudeHub polish (not LG per se) |
| Reduced-motion respect | `@media (prefers-reduced-motion: no-preference)` gating on all transitions | Compliant |
| Discrete radii (`--radius-sm/md/lg`) | Intentional rhythm choice, not math-concentric | Deliberate divergence |

## 2. Intentional divergences (do NOT flag as violations)

Per `CLAUDE.md` design-language rules + Resolved Decisions 1 + 8 in `NewSkillsToDo.md`:

1. **Static specular, not motion-driven.** Web PWAs lack reliable gyro access without permission prompts. claudeHub's `inset` highlight is the pragmatic stand-in.
2. **Light-only mode.** Apple adapts light/dark. claudeHub is single-mode by design; avoids dual-token maintenance.
3. **Dormant-card staging (scroll-activation band).** Apple's material is "always alive"; claudeHub's cards go flat outside the band. Project character, not non-compliance.
4. **Discrete `--radius-sm/md/lg` tokens over `ConcentricRectangle`.** Visual-rhythm choice, not math.
5. **Some glass-on-glass** (nav pill over glass panel, glass card inside glass panel). Brushes against Apple's verbatim rule. Documented trade-off.
6. **No runtime API calls** (`project_no_runtime_api_calls.md`). Rules out Apple's dynamic "adapts to surrounding content" behavior where that would need JS reading pixel data.

## 3. Vocabulary mapping (Apple → claudeHub)

Adopt these terms consistently in design-amend + design-review discussions:

| Apple term (Liquid Glass) | claudeHub implementation / analogue |
|---|---|
| `.glassEffect(.regular)` material | `.glass` primitive |
| `.glass` button style | Transparent-glass CTA with impressed label |
| `.glassProminent` button style | Solid white chip / active nav chip |
| Functional layer | Nav pill + floating panels + toolbars |
| Content layer | `<main>` body, Learn item rows, article content |
| Overlay layer / vibrancy | Debossed labels, chip accents |
| Specular | `inset 0 1px 0 rgba(...,0.55)` top-edge highlight |
| Lensing | Not implemented (Safari wouldn't support it anyway) |
| Concentric rounding | Discrete `--radius-*` tokens (deliberate divergence) |
| Scroll edge effect | Not yet implemented (see section 4 proposal A) |
| Background extension effect | Not implemented (see section 5 proposal F) |
| Tab bar minimize on scroll | Not implemented (nav pill is fixed) |
| Tinted mode (iOS 26.1+) | No direct analogue (see section 6) |

## 4. Low-effort improvements (menu of proposals)

**None of these are currently planned.** Each is an independent proposal; user picks which to pursue.

### A. Scroll edge effect on nav pill

Add a soft gradient mask on the page content directly behind the nav pill so copy doesn't visibly pass through it at scroll edges. Pure CSS (`mask-image`). Low risk. Complements existing `body::before` ambient darkening.

**Apple vocabulary it adopts:** scroll edge effect.

### B. `prefers-reduced-transparency` audit

Scan `.glass` and `.glass-*` selectors; confirm each has a solid-fallback under `@media (prefers-reduced-transparency: reduce)`. Candidate for a new concern in `audit-sweep`.

### C. `prefers-contrast: more` adaptation

Sister media query — bump hairline alpha from ≤16% to ~24%, increase `--accent-border` opacity. Accessibility polish.

### D. Tint variants for panel identity

Apple's tinting philosophy (tint for meaning, not decoration) already matches `.dash-action-learn/-primary/-tools` edge colors. Could formalize a `--glass-tint-{section}` token to make the link explicit.

### E. Scroll-edge fade behind chip labels

When chips sit over changing backgrounds (dashboard panels with icons behind), a subtle fade-to-glass-top at chip edges would improve legibility. Parallels Apple's `.deliquify` pattern from conorluddy Part 4.1.

## 5. Medium-effort experiments (research-grade, not proposals)

### F. SVG lensing filter on a single chrome element

Demo the lensing effect on one small surface (e.g., the YouTube tile) without site-wide rollout. Good proving ground for a Safari fallback strategy. Risk: `backdrop-filter: url()` ≠ supported on Safari.

### G. Morphing glass between Learn zones

Zone switching currently cross-fades; a FLIP-based glass morph would be the claudeHub analogue of `.glassEffectID`. Significant JS investment. Consider only after the drag-and-drop feature stabilizes.

### H. Specular highlight that follows hover on pointer devices

Mouse-position-tracked inset highlight via CSS custom properties set from a pointer move handler. Desktop-only polish; mobile uses the static fallback.

### I. `ConcentricRectangle`-like utility

A CSS custom-property convention where a child element's `border-radius: calc(var(--parent-radius) - var(--inset))`. Makes nested shapes concentric without new tokens. Opt-in per component.

## 6. High-effort or out-of-scope (parked)

### J. Full displacement-map refraction site-wide

Expensive in compositing layers; Safari fallback would essentially always fire for ~half of users. Park until post-DB migration when render budget can be re-audited.

### K. Motion-responsive specular

Requires DeviceOrientation permission handling + iOS 13+ permission prompts. Not worth the UX tax on a personal-project web PWA.

### L. Dynamic Tinted mode analogue

iOS 26.1+ user-controlled opacity bump. Would require a settings surface that doesn't exist today. Post-v1 consideration.

## Cross-references

- For how CSS/SVG translates Apple's concepts → `web-implementation.md`
- For Apple's verbatim rules (to evaluate any new glass proposal against) → `components.md`
- For accessibility anti-patterns → `accessibility.md`
