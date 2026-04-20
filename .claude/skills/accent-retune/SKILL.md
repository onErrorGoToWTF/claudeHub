---
name: accent-retune
description: Regenerate the per-section accent palette (Learn / Projects / Tools) in css/style.css. Invoke when the user wants to retune section accents, propose new section hues, tweak the warm-yellow tint-target, or add a new section-scoped accent family. Encodes the parallel-families architecture, the WebKit nested-var() pitfall that forced it, the 3-stop tonal triad recipe, every scope that must be updated in lockstep, and the cache-bust + version.json bump. Invocation phrases include "retune the accents", "change Learn/Projects/Tools base color", "new accent palette", "adjust the tint-target", "bias the glow toward yellow".
---

# accent-retune

The claudeHub accent system uses **parallel per-section token families** at `:root`, assigned into the canonical `--accent-*` tokens at each section / panel / chip scope via a single `var()` reference. Components keep reading `--accent-*` everywhere — they don't care which section they're in.

This skill exists because retuning is mechanical but unforgiving: miss a scope and one surface stays on the old color; reintroduce a unified `--base → --accent-*` derivation and nothing below the root element will pick up the per-section hue at all (see the WebKit pitfall below). Follow the pattern — don't invent alternatives.

## Inputs

One triple per section (defaults in parens, all can be user-overridden):

- `learnBase` (`#5ea514`) + `learnTint` (`#f5d90a`)
- `projectsBase` (`#0e7fc4`) + `projectsTint` (`#f0c23a` — **amber, NOT pure yellow**; see Projects caveat)
- `toolsBase` (`#e8610d`) + `toolsTint` (`#f5c518`)

Optional:
- `cacheBustTag` — new `?v=` value for `index.html` and matching `data/version.json` version string. Default: bump the dev-N suffix.

If any input is missing, propose defaults and ask for approval before writing.

## The architecture (DO NOT swap back to unified --base)

**Never** introduce a single `--base` variable at `:root` that the `--accent-*` tokens derive from via `var()` inside `color-mix()`. This pattern is what M9.1 originally shipped, it visually worked with `--base-shared` in M9.14 because every section resolved to the same color anyway, and it catastrophically failed when per-section `--base` overrides were restored.

**WebKit pitfall (diagnosed M10.11):** a custom property whose value wraps another custom property in `color-mix()` — e.g. `--accent-border: color-mix(in srgb, var(--base), transparent 45%)` at `:root`, with `.dash-panel:has(...) { --base: blue }` as an override — does **not** lazily re-resolve per descendant. The inner `var()` computes once at `:root` using `:root`'s `--base` and inherits as a frozen value. Projects panel shows its `--base: blue` applied (confirmable with an outline test), but every CTA, icon, and glow inside renders green (:root's fallback).

The one-level indirection that WebKit *does* resolve correctly is: an element-scoped custom property assigned via a single `var()` reference to a `:root`-level literal. Example that works: `--accent-border: var(--projects-border)` on the panel, where `--projects-border` is defined at `:root` as a literal `color-mix(in srgb, color-mix(in oklch, #0e7fc4 72%, #f0c23a), transparent 45%)` with **no inner `var()`**.

The parallel-families architecture exploits exactly that shape.

## The 3-stop tonal triad

Each section's family derives from its `base` + `tint-target` via three tonal stops, written as literal `color-mix()` expressions with hex args (zero `var()` inside):

- **Stop 1 (dark)** — `color-mix(in oklch, <base> 78%, black)`. Powers `--{sec}-solid` (icon stroke when activated, focus ring, progress fill).
- **Stop 2 (modest tint)** — `color-mix(in oklch, <base> 72%, <tint>)`. Powers `--{sec}-border` and `--{sec}-glow`, both alpha'd via a second `color-mix(in srgb, …, transparent {45|66}%)` wrapper.
- **Stop 3 (heavy tint)** — `color-mix(in oklch, <base> 45%, <tint>)`. Powers `--{sec}-surface` (wrapped in `color-mix(..., transparent 86%)`), `--{sec}-warm`, and `--{sec}-soft` (wrapped via `color-mix(in oklch, …, 40%, white)`).

Stop percentages (78 / 72 / 45) are calibrated — don't change them unless the user is retuning the STOP balance as a separate concern.

Each family emits exactly seven tokens: `solid`, `border`, `glow`, `surface`, `warm`, `hover`, `soft`. Template (swap `<base>` / `<tint>` per section):

```css
--{sec}-solid:   color-mix(in oklch, <base> 78%, black);
--{sec}-border:  color-mix(in srgb, color-mix(in oklch, <base> 72%, <tint>), transparent 45%);
--{sec}-glow:    color-mix(in srgb, color-mix(in oklch, <base> 72%, <tint>), transparent 66%);
--{sec}-surface: color-mix(in srgb, color-mix(in oklch, <base> 45%, <tint>), transparent 86%);
--{sec}-warm:    color-mix(in oklch, <base> 45%, <tint>);
--{sec}-hover:   color-mix(in oklch, color-mix(in oklch, <base> 78%, black) 85%, black);
--{sec}-soft:    color-mix(in oklch, color-mix(in oklch, <base> 45%, <tint>) 40%, white);
```

## Scopes to update in lockstep

Six, every time. Missing any one leaves a surface stuck.

1. **`css/style.css` `:root` family block** — three `--{sec}-*` families (Learn, Projects, Tools) defined as literal `color-mix()` with hex args. Also the neutral `--accent-*` defaults (solid = `var(--text-1)`, border = `var(--border)`, glow = `transparent`, etc.) for surfaces outside a section scope.

2. **`css/style.css` `[data-section="learn|projects|tools"]` rules** — each assigns `--accent-solid / border / glow / surface / warm / hover / soft` to its matching `var(--{sec}-*)` family member. `[data-section="home"]` has **no** reassignment — home stays neutral greige so the Dashboard reads greyscale at rest.

3. **`css/style.css` `.dash-panel:has(.dash-panel-icon--learn|projects|tools)` rules** — same seven-token assignment shape as the section rules, scoped to each panel.

4. **`css/style.css` `.chip-learn | .chip-projects | .chip-tools` rules** — same seven-token assignment shape, scoped to each nav chip.

5. **`css/style.css` static identity tokens** — `--color-learn-solid | surface | border | glow`, `--color-projects-*`, `--color-tools-*`. Used by non-activation UI (coverage pills, etc.). Match `solid` to the new base hex; derive `surface / border / glow` via `color-mix(in srgb, <base>, transparent {86|45|66}%)`.

6. **`index.html` cache-bust + `data/version.json`** — bump every `?v=<old>` on local `<link>` / `<script>` tags to the new tag, AND bump `data/version.json` `version` + `deployedAt` to match. The footer reads from `version.json`; without the JSON bump, the user can't tell from their phone which build is live. `milestone` stays as `"M10.11-wip"` (or the current WIP marker) until `/milestone-deploy` formalizes the ship.

## Projects' tint-target caveat

Projects' base is typically blue. A pure-yellow `tint-target` mixed with blue in oklch **interpolates through green** — Projects' stops 2 and 3 would read greenish and collide with Learn. Always bias Projects' tint toward amber (`#f0c23a`-ish). Learn and Tools can use true yellow since green + yellow and orange + yellow stay in-hue.

If the user specifies a pure-yellow tint for Projects, flag the green-collision risk and ask to confirm before writing.

## Home = neutral, no reassignment

`[data-section="home"]` gets NO `--accent-*` reassignment rule. Home inherits the neutral `:root` defaults so the Dashboard reads greyscale at rest. Color only enters once a `.dash-panel:has(...)` scope narrows and pumps its section's family. This is load-bearing to the design language — don't accidentally add a home accent block.

## Verification (run after every retune)

- Hard reload on the user's phone. Check the dashboard:
  - Learn CTA border + book-stack icon → green-ish dark stop, glow toward yellow.
  - Projects CTA border + folder icon → blue-ish dark stop, glow toward amber.
  - Tools CTA border + wrench icon → orange-ish dark stop, glow toward yellow.
- If any one of the three still reads green (Learn's color): you reintroduced a `--base` derivation somewhere. Grep `css/style.css` for `var(--base` — should return zero runtime matches (comment prose OK).
- If ALL three read the same color: the per-section `--accent-*` assignment rules aren't in place. Verify the 3 `.dash-panel:has(...)` blocks each carry seven `--accent-*` lines.

Diagnostic markers for deeper inspection (remove before commit):

- `.dash-panel[data-panel-key="projects"] { outline: 4px solid red !important; }` — tests attribute-selector cascade reach.
- `.dash-panel:has(.dash-panel-icon--projects) { background: #ffeb3b !important; }` — tests `:has()` selector reach.
- `body::after { content: "CSS build: <tag>"; position: fixed; top: 0; left: 50%; transform: translateX(-50%); background: #000; color: #fff; padding: 4px 10px; z-index: 999999; }` — confirms CSS freshness at a glance.

## Guardrails

- **Never rename `--accent-*` tokens.** ~80+ consumers across the CSS read them. Only change the *derivation path* (i.e., which family they point to per scope).
- **Never introduce `--base` / `--tint-target` / `--accent-stop-*` at runtime.** Those were part of the unified architecture that failed in WebKit. Comment-prose references are fine; runtime `var()` references to them are a regression.
- **Never skip the Projects amber-tint bias** unless the user explicitly asks for a green Projects.
- **Don't touch `--danger` or `MODEL_COL`** — out of scope.
- **Don't create MD docs describing the change** — code comments are the source of truth; `/milestone-deploy` handles the changelog via `data/version.json`.
- After retuning, this skill does NOT commit. Let `/milestone-deploy` handle commit + push + final version rewrite.

## Failure handling

- If a section scope rule is missing (e.g. no `.chip-projects` rule), add it — don't silently skip. Report which scopes you created vs. updated.
- If two successive retunes don't visibly land on reload, STOP and reassess with the user. Don't ship a third patch blindly — there's likely a new regression path (a `--base` sneaking back in, a scope rule accidentally outside a media query, a selector shadow from a later `:root` override).
