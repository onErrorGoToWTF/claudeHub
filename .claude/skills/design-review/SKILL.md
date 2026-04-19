---
name: design-review
description: Reviews proposed or just-made CSS/HTML/JS changes in claudeHub against the project's strict design language — dark-first premium aesthetic, :root radius/easing tokens, glass primitive with top-edge specular highlight, videos-above-articles rule in mixed lists, restrained rounding, premium easing curves, and reduced-motion compliance. Use when reviewing a diff that touches css/style.css, index.html templates, or render functions in js/app.js; when adding a new section, card variant, or chart; or when the user asks for a "design review", "style check", or "does this match the vibe".
allowed-tools: Read, Grep, Glob
---

# Design review for claudeHub

Review the current diff (or files named by the user) against the project's design language. You are a gatekeeper, not a writer — report violations with file:line, then let the user decide which to fix.

## Hard rules — any violation must be flagged

### 1. Tokens only, no magic numbers

- **Radius:** only `var(--radius-sm)` (6px), `var(--radius-md)` (10px), `var(--radius-lg)` (14px), `var(--radius-pill)` (9999px). Any raw `border-radius: Npx` with N ∉ {6,10,14} or N < 9999 is a violation. Pills must be 9999px, not 999px or 100px.
- **Easing:** only `var(--ease-premium)` or `var(--ease-lensing)`. No `ease-in-out`, no `cubic-bezier(...)` literals, no bounce curves (`cubic-bezier(.34,1.56,...)`-style overshoots).
- **Color:** accent usage goes through `--accent`, `--accent-365-*`. Glass surface gradients go through `--glass-top` / `--glass-bottom` / `--glass-fallback` (and `--chips-glass-top` / `--chips-glass-bottom` for the floating nav). Ambient body glow goes through `--ambient-warm` / `--ambient-plasma`. Inline rgba literals for glass gradients / ambient glow are a violation. Pure-white borders (`#fff`, `rgba(255,255,255,1)`) are banned. Hairlines (borders, not insets) must stay ≤14% white alpha in dark mode. Hex literals for the branded `.nav-brand*` logo sticker are permitted — that's a deliberately locked wordmark, not chrome.

### 2. Glass primitive integrity

Any element using `.glass` or a glass-like backdrop must preserve:
- `backdrop-filter: blur(...)`
- Warm-charcoal gradient driven by `--glass-top` / `--glass-bottom` tokens (dark mode reads as warm charcoal; light mode overrides resolve to warm off-white against the greige page). Cool neutral-gray gradients, raw `#101218 → #0a0c10`, or any inline hex/rgba literal for the gradient stops is a regression.
- Top-edge specular highlight via `.glass::before` or `inset 0 1px 0 rgba(255,255,255,α)`. Dark mode α sits at ~0.06–0.10; light mode α sits at ~0.5–0.7 — light-mode insets are *specular highlights*, not hairlines, and do not count against the 14% ceiling.

Flag any `.glass` override that drops the inset highlight, hard-codes a non-token gradient, or swaps to a neutral gray.

### 3. Videos-above-articles (load-bearing)

In `js/app.js`, any renderer producing a mixed list (News, 365 News, Resources) must emit the videos block before the articles block. Interleaving is a regression. Check `renderNews` and any new `render*` function for:
- Videos sliced and rendered first
- Articles sliced and rendered second
- No single sorted array mixing both

### 4. Reduced-motion compliance

Any new `@keyframes`, `transition`, or scroll-triggered animation must be wrapped in `@media (prefers-reduced-motion: no-preference)` for the motion, with the reduced-motion state equal to the final rendered state (no disappearing content, no blocked data reveals).

### 5. Card reveal cadence

Card stagger uses `0.04 * idx` seconds (40ms). Chart bars use a separate `IntersectionObserver` that resets on exit (they re-animate when re-entering). Do not unify these — they are intentionally different.

### 6. Sub-pill cross-fades

Switching sub-pills (365 Resources/News, Resources Videos/Official) must cross-fade with ~30ms per-card stagger. No snap, no flicker. Flag any new sub-pill that hard-swaps.

## Review procedure

1. Identify scope. If the user passed paths/arguments, use them. Otherwise run `git diff --name-only` and review every touched `css/*.css`, `index.html`, or `js/app.js` region.
2. For each changed file, read the surrounding 30 lines of context — not just the hunk — to understand intent.
3. Walk the hard-rules list in order. Record each violation as: `path:line — rule-name — what's wrong — smallest fix`.
4. Separately list **soft observations** (naming inconsistency, duplicated selectors, dead CSS) under a clearly-labeled "non-blocking" heading. Do not mix with violations.
5. End with a single-line verdict: `PASS` (no violations) or `BLOCK: <N> violations`.

## Do not

- Rewrite the code. Report only.
- Propose refactors unrelated to the diff.
- Flag pre-existing violations in unchanged code unless the user asked for a full-file audit.
- Invent new tokens. If the diff needs a new radius or easing, surface that as a question, not a fix.
