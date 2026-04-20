---
name: design-review
description: Reviews proposed or just-made CSS/HTML/JS changes in claudeHub against the project's strict design language — light-only Apple-glass aesthetic, :root radius/easing tokens, glass primitive with top-edge specular highlight, videos-above-articles rule in mixed lists, restrained rounding (6px squared-off pills, no 9999px), premium easing curves, and reduced-motion compliance. Use when reviewing a diff that touches css/style.css, index.html templates, or render functions in js/app.js; when adding a new section, card variant, or chart; or when the user asks for a "design review", "style check", or "does this match the vibe".
allowed-tools: Read, Grep, Glob
---

# Design review for claudeHub / aiUniversity

Review the current diff (or files named by the user) against the project's design language. You are a gatekeeper, not a writer — report violations with file:line, then let the user decide which to fix.

## Hard rules — any violation must be flagged

### 1. Tokens only, no magic numbers

- **Radius:** only `var(--radius-sm)` (6px), `var(--radius-md)` (10px), or `var(--radius-lg)` (14px). Pill-shaped elements use `--radius-sm` (6px), not `9999px` — the `--radius-pill` token was deleted in M9.2. Genuine circles (avatars, spinners, dots, circular buttons) use `border-radius: 50%` or a fixed px.
- **Easing:** only `var(--ease-premium)` or `var(--ease-lensing)`. No `ease-in-out`, no `cubic-bezier(...)` literals, no bounce curves (`cubic-bezier(.34,1.56,...)`-style overshoots).
- **Color:** per-page accents go through `--base` + derived `--accent-solid / border / glow / surface / ink / hover / soft / warm / cool` (scoped to `[data-section="X"]`). Legacy `--color-{learn,projects,tools,youtube,violet}-*` still used during the M9.1 migration — flag new hardcoded references to them outside `:root`. Glass surface gradients go through `--glass-top` / `--glass-bottom` / `--glass-fallback` (and `--chips-glass-top` / `--chips-glass-bottom` for the floating nav). Ambient body wash goes through `--ambient-warm` / `--ambient-plasma` + the warm-greige radial darkening on `body::before`. Inline rgba literals for glass gradients / ambient glow are a violation. Pure-white borders (`#fff`, `rgba(255,255,255,1)`) are banned. Hairlines (borders, not insets) stay ≤16% black alpha. Hex literals for the branded `.nav-brand*` logo sticker are permitted — deliberately locked wordmark.
- **Destructive-action color (M9.17c):** every delete / wipe / remove-permanent button derives from `--danger` + derived `--danger-{solid,border,glow,surface,ink,hover}`. Hardcoded reds (`#c0392b`, `#f43f5e`, `#dc2626`, etc.) inside any selector named `*-delete`, `*-danger`, `*-wipe`, `*-remove-*`, or annotated as destructive in context are a regression — flag them. Reds on sentiment / status pills (severity, not action) are OUT of scope and stay as-is.

### 2. Glass primitive integrity

Any element using `.glass` or a glass-like backdrop must preserve:
- `backdrop-filter: blur(...) saturate(...)`
- Warm-white gradient driven by `--glass-top` / `--glass-bottom` tokens against the greige page. Raw hex/rgba literals for gradient stops are a regression.
- Top-edge specular highlight via `.glass::before` or `inset 0 1px 0 rgba(255,255,255,α)` with α ~0.5–0.7 — this is a *specular highlight*, not a hairline, and does not count against the 16% ceiling.

Flag any `.glass` override that drops the inset highlight, hard-codes a non-token gradient, or swaps to a cool neutral gray.

### 3. Videos-above-articles (load-bearing)

In `js/app.js`, any renderer producing a mixed list must emit the videos block before the articles block. Interleaving is a regression. Check `renderNews` and any new `render*` function for:
- Videos sliced and rendered first
- Articles sliced and rendered second
- No single sorted array mixing both

### 4. Reduced-motion compliance

Any new `@keyframes`, `transition`, or scroll-triggered animation must be wrapped in `@media (prefers-reduced-motion: no-preference)` for the motion, with the reduced-motion state equal to the final rendered state (no disappearing content, no blocked data reveals).

### 5. Card reveal cadence

Card stagger uses `0.04 * idx` seconds (40ms). Chart bars use a separate `IntersectionObserver` that resets on exit (they re-animate when re-entering). Do not unify these — they are intentionally different.

### 6. Sub-pill and zone cross-fades

Switching sub-pills (where they remain post-v0.7) must cross-fade with ~30ms per-card stagger. No snap, no flicker. Flag any new sub-pill or zone-swap that hard-swaps.

### 7. Impressed-label treatment on glass

Debossed text on glass (nav chips, YouTube tile, other transparent surfaces) uses `color: rgba(0,0,0,~0.35)` + `text-shadow: 0 1px 0 rgba(255,255,255,0.80), 0 -0.5px 0.5px rgba(0,0,0,0.20)`. Flag impressed-text replacements that drop the highlight-below / shadow-above stack or substitute a single flat color.

### 8. Tap-target minimum 44×44 (behavior)

Any tappable/clickable element (button, icon-only control, chip, pill, drag handle, close-X) must have a hit area of at least **44×44 px**. Padding counts toward the hit area even if the visible glyph is smaller — the tappable *bounding box* is what matters, not the visible footprint. Intent: prevent accidental misses on phone, especially when tappables sit close together (happens often in Learn-item action-button rows and modal headers).

Flag when a selector that is clearly interactive (has `cursor: pointer`, is an `<a>` / `<button>` in markup, or binds a click handler in `js/app.js`) has a computed or declared size below 44×44 — for example: fixed `width: 28px; height: 28px` on an icon button with no surrounding tappable padding. The Learn-item inline action buttons deliberately use 28×28 *visual* tiles with additional vertical padding to reach the 44px hit area; that pattern is fine — it's the *bounding box* of the tappable ancestor that needs to reach 44×44.

**Sourcing.** Apple HIG ("create controls that measure at least 44 points x 44 points"). See `.claude/skills/_resources/apple-hig.md` for cached reference. 44×44 is the floor; this project's touch-first phone-review cycle makes the rule strict.

### 9. Drag-handle placement on leading edge (behavior)

Drag-to-reorder handles sit on the **leading edge** (left in LTR). Convention and intuitive touch semantics — users expect the grip to be where they first contact the row. Trailing-side handles collide with overflow-menu placement conventions and misread as accessory controls. The existing Learn grab handle (⋮⋮ glyph on `.learn-item-wrap` left) is the canonical pattern; any new reorderable list should mirror it.

Flag any new draggable row with its handle on the trailing side, or a draggable row without a dedicated handle (touch-anywhere-to-drag breaks scroll intuitions — the M9.17b.b amendment made the handle explicit for this reason).

**Glyph style is APPEARANCE** (grip bars `≡` vs dots `⋮⋮` vs anything else is the user's call); do not flag glyph variations.

### 10. Swipe-action direction semantics (behavior)

If a swipe-action pattern returns (swipe-mastery was retired in M9.17b.d, but future swipeable surfaces are possible), destructive actions (Delete, Archive, Wipe, Remove) reveal on **right-to-left swipe** (trailing side). Non-destructive / contextual actions (Pin, Mark as Favorite, Snooze) reveal on **left-to-right swipe** (leading side). This is iOS convention and users' built-in muscle memory; inverting it gets destructive taps.

Flag any new swipe-action handler in `js/app.js` that:
- Attaches a destructive action to leading-side reveal.
- Triggers on ambiguous horizontal motion without a direction threshold (see the retired `LEARN_SWIPE_*` pattern for the shape of the threshold logic).

**Sourcing.** Apple HIG lists-and-tables conventions + UIKit `tableView(_:trailingSwipeActionsConfigurationForRowAt:)` semantics. See `.claude/skills/_resources/apple-hig.md`.

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

## Resources

- **Start with `.claude/skills/_resources/INDEX.md`** — master retrieval dispatcher. Question → file lookup for Liquid Glass, HIG, and claudeHub-specific concerns. Load it first so you only `Read` the narrow topic file you actually need.
- **Liquid Glass (2025 material language):** files under `.claude/skills/_resources/liquid-glass/` — fundamentals, APIs, components, accessibility, performance, web-implementation, claudehub-roadmap, resources. Start here for glass / material / Apple-native visual questions.
- **HIG (older foundations):** files under `.claude/skills/_resources/hig/` — layout, gestures-and-drag, modality, motion, typography, color, materials, accessibility, community-extras, resources. Use for interaction-behavior questions.
- Per `CLAUDE.md` design-language scope: claudeHub's design language is authoritative for *appearance*. These caches inform *behavior* (gestures, timings, hit targets, modal mechanics) and serve as vocabulary alignment — not mandates. The `liquid-glass/claudehub-roadmap.md` file enumerates intentional divergences that must NOT be flagged as violations.
- If a cache file is older than `staleness_days` (7 for hot files, 30 for link/resource files), surface the staleness to the user rather than silently using it. This skill does not have WebFetch in `allowed-tools`.
