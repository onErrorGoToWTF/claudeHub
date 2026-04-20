---
name: architecture-review
description: Review a proposed architecture / pattern / design against the catalog of pitfalls this project has already paid for. Invoke BEFORE committing to a new pattern (token system, render pipeline, state machine, persistence layer, CSS cascade, activation system, etc.), or when the user says "review this approach", "check this before I build it", "arch review", "will this break", "scan for footguns". Outputs a green-light or specific "this will fail because X" flag per pitfall, referencing the milestone or memory where the project hit it before. Not for per-diff code review (that's /design-review or /review); this is for novel architectural decisions before substantial code gets written.
---

# architecture-review

This skill is a checklist pass: compare a proposed architecture against ~15 pitfalls the claudeHub codebase has already paid for. Each pitfall below includes the symptom, the cause, and the referenced milestone / memory where it was diagnosed. Before a new pattern gets substantial code written against it, the skill walks the catalog, flags every applicable entry, and either green-lights the design or names specific structural changes needed first.

## When to invoke

- **Before** writing code for anything structurally novel:
  - a new token / CSS variable system
  - a new render pipeline or render-dependency ordering
  - a new persistence schema or localStorage namespace
  - a new activation / intersection / scroll-bound system
  - a new animation sequence or transform chain
  - a new integration with an external SDK or vendor API
  - a new PWA / offline / caching behavior
  - a new destructive-action flow
- **On demand** when the user says:
  - "review this architecture"
  - "check this before I build it"
  - "will this break anything"
  - "scan for footguns"
  - "arch review on X"

## When NOT to invoke

- Per-diff style or design polish — use `/design-review` instead.
- PR review — use `/review`.
- Security review — use `/security-review`.
- Feed-scraper failures — use `/debug-feed-failure`.

## Inputs

- A short description of the proposed architecture (what it does, where it lives, what it replaces).
- Optionally: files / selectors / functions it will touch.

If the description is too vague to run the catalog against, ask ONE clarifying question, then proceed.

## Output shape

For each applicable pitfall in the catalog, emit ONE of:

- `✓ pass — <pitfall name>` : proposal clears this pitfall
- `⚠ flag — <pitfall name>` : proposal is at risk; name the specific structural change needed
- `— skip — <pitfall name>` : pitfall doesn't apply to this proposal (don't emit this for every pitfall — only the ones that might apply)

End with an overall verdict: **green-light** (no flags), **proceed with changes** (flags + concrete fixes), or **rethink** (structural conflict with the design language — escalate to the user with the specific conflict).

Keep the report under 300 words. Depth is in the catalog, not the report.

---

## Pitfall catalog

Each entry: **name · symptom · cause · fix shape · reference**.

### 1. WebKit nested var() in color-mix() freezes at :root
- **Symptom:** per-scope override of a custom property (e.g. `--base: blue` on a Projects panel) visibly applies at the panel (can confirm with an outline-test) but does NOT propagate to descendant tokens that wrap it in color-mix (e.g. `--accent-border: color-mix(in srgb, var(--base), transparent 45%)` at :root). Descendants render :root's fallback color.
- **Cause:** WebKit does not lazily re-resolve a `var()` nested inside `color-mix()` inside another custom property's value. The inner var() computes once at :root and inherits as a frozen value.
- **Fix:** parallel per-scope token families at :root with literal color-mix (no var() inside the token definitions), then assign downstream tokens via a single var() reference at the scope rule. See `/accent-retune`.
- **Reference:** M10.11, `feedback_parallel_over_unified.md`.
- **When to flag:** proposal uses a unified `--base → --derived-*` pattern with `color-mix(... var(--base) ...)` at :root and per-scope `--base` overrides.

### 2. TDZ on initial-render path
- **Symptom:** dashboard non-functional on first page load; content only appears after refreshing on a non-home route. Data-chip click handlers dead. `loadLessons` never runs.
- **Cause:** any module-level `const` / `let` referenced from a render fn fired by the initial `applyRoute()` → `applyFilter("home")` → `replayHomeAnimations()` call at L602 of `js/app.js` MUST be declared above that call. If it isn't, the read throws ReferenceError and silently aborts the entire IIFE.
- **Fix:** hoist the declaration above L602. See `/tdz-audit` skill for the automated check.
- **Reference:** M9.18b.1 (DASH_DUMMY_*), M9.18b.3 (SVG consts + TRACK_LABEL).
- **When to flag:** proposal adds a new render fn called from `replayHomeAnimations`, or adds a new module-level `const` / `let` that any such render fn reads.

### 3. Transforms + other animations stacked on the same element
- **Symptom:** visible flicker, dropped frames, or the non-transform animation playing at the wrong time.
- **Cause:** while a `transform` is animating, every other animation on / under the transformed element MUST pause. Shimmer + translateY simultaneously is specifically banned.
- **Fix:** gate shimmer / glow / fade keyframes behind `.is-transform-done` (or a timed delay ≥ the transform's duration), and never run two transforms on the same element at once.
- **Reference:** CLAUDE.md "Transforms are exclusive" in the Design Language section.
- **When to flag:** proposal animates `transform` while also animating `background-image` / `box-shadow` / `opacity` / `filter` on the same element in overlapping time windows.

### 4. Layout-triggering properties during animation
- **Symptom:** on iPhone address-bar collapse or any viewport resize, the animated element flickers or the whole surface repaints.
- **Cause:** transforms / activation states that animate `width`, `height`, `margin`, `padding`, `border`, or `font-size` trigger layout on every frame. Repaint budget blows up on resize.
- **Fix:** stick to compositor-only properties (`transform`, `opacity`, `filter`, `box-shadow` without layout impact). Don't swap DOM during animation. Don't toggle `backdrop-filter` mid-animation.
- **Reference:** CLAUDE.md "No flicker on resize / repaint".
- **When to flag:** any new animation keyframe or transition target that includes a layout-triggering property.

### 5. color-mix(..., yellow) interpolates through green when base is blue
- **Symptom:** Projects section's yellow-tinted stops read greenish, colliding visually with Learn.
- **Cause:** in oklch space, blue + pure yellow traces a path through green.
- **Fix:** bias Projects' tint-target toward amber (`#f0c23a`-ish), not pure yellow. Learn and Tools can use true yellow because green / orange + yellow stay in-hue.
- **Reference:** M10.11.
- **When to flag:** proposal uses `color-mix(... yellow)` or `#ffc400` as a target where the base hue is a blue.

### 6. localStorage without dev-server-cache verification
- **Symptom:** persistence tests pass locally but fail on phone; user reports "my project didn't save" on iOS.
- **Cause:** dev-server caching / service-worker interception can intercept Web Storage writes or ghost-read stale values.
- **Fix:** verify Web Storage round-trip under the no-cache `scripts/dev_server.py` before trusting a persistence test. Check the namespace (`clhub.v1.*`).
- **Reference:** `feedback_localstorage_cache.md`.
- **When to flag:** proposal writes to localStorage and claims it "just works" without a phone round-trip check.

### 7. Native confirm() for destructive actions
- **Symptom:** in iOS standalone / PWA mode, native `confirm()` / `alert()` dialogs are suppressed. The user taps Delete, nothing happens, data loss without warning.
- **Cause:** Apple suppresses JS dialogs in home-screen-installed web apps.
- **Fix:** in-UI two-tap confirm with 3s disarm. Never `confirm()`.
- **Reference:** `feedback_two_tap_delete.md`.
- **When to flag:** proposal includes any destructive flow using `window.confirm` / `window.alert` / `window.prompt`.

### 8. iframe-embedding third-party feed URLs
- **Symptom:** "Open in frame" modal renders blank; `X-Frame-Options: DENY` or CSP `frame-ancestors` blocks ~95% of top-host news feeds.
- **Cause:** TechCrunch / Ars / Verge / Bloomberg / Google News all block iframe embedding.
- **Fix:** open links natively in a new tab. Don't architect an in-app viewer for third-party feeds.
- **Reference:** `project_next_link_modal.md`.
- **When to flag:** proposal embeds third-party feed URLs in an iframe or in-app reader.

### 9. Runtime calls to api.anthropic.com
- **Symptom:** CORS error, API-key leak risk, or rate limiting on a public static-site deploy.
- **Cause:** aiUniversity is a static site. All content is authored ahead of time; runtime API integration is deferred until after DB migration.
- **Fix:** pre-fetch at build time or author statically. No `fetch('https://api.anthropic.com/…')` in `js/app.js`.
- **Reference:** `feedback_no_runtime_api_calls.md`, `project_claude_api_integration_planned.md`.
- **When to flag:** proposal hits api.anthropic.com at runtime for any reason.

### 10. Unverified SDK snippets
- **Symptom:** code that looks right but uses a method that doesn't exist, a parameter that's been renamed, or a return-shape that's wrong.
- **Cause:** agent-produced SDK snippets can be plausible-wrong.
- **Fix:** spot-check against the real SDK source (via `/claude-api` skill or WebFetch to the SDK repo) before shipping.
- **Reference:** `feedback_sdk_verify.md`.
- **When to flag:** proposal includes SDK calls that haven't been verified against current vendor source.

### 11. Interleaved videos + articles in mixed lists
- **Symptom:** video items appear scattered through article results; locked design rule violated.
- **Cause:** sort by date alone; doesn't separate type.
- **Fix:** render videos block first, articles block second. Within each block, sortByDateDesc.
- **Reference:** CLAUDE.md "Videos always render above articles" — load-bearing, do not interleave.
- **When to flag:** proposal introduces a new mixed-type list without the videos-first rule.

### 12. Cache-bust bumped without version.json bump
- **Symptom:** phone reload pulls new CSS/JS but footer still reads old version; user can't confirm which build is live during mid-iteration debug.
- **Cause:** footer reads `data/version.json`; cache-bust `?v=` is invisible.
- **Fix:** bump `data/version.json` (version + deployedAt) whenever the `?v=` tag changes, even mid-iteration. `milestone` stays `"Mx.y-wip"` until `/milestone-deploy`.
- **Reference:** `feedback_bump_version_mid_iteration.md`.
- **When to flag:** proposal bumps asset cache-bust without matching version.json bump.

### 13. Unified cascade over opt-in shared class
- **Symptom:** sweeping a rule across many disparate selectors breaks compositor layers / stacking contexts / backdrop-filter invisibly. Looks cosmetic, regresses activation elsewhere.
- **Cause:** CSS cascade shifts interact with the glass stack (backdrop-filter + blur + saturate) in ways that aren't visible in a diff.
- **Fix:** one shared class or token that components opt into, not a sweeping descendant selector.
- **Reference:** `feedback_unify_with_overrides.md`, M9.18a.2 / M9.18b.2.
- **When to flag:** proposal uses broad descendant cascades (e.g. `.some-ancestor .card .label`) to apply a systemic rule, instead of a utility class or token.

### 14. Parallel per-section architecture over unified derivation
- **Symptom:** user proposes parallel per-section families; agent defends unified; two debug rounds burn before the parallel pattern is adopted anyway.
- **Cause:** unified `--base → --derived-*` looks elegant but fails on WebKit (see pitfall #1). User instinct for parallel is informed by the codebase.
- **Fix:** implement parallel first. Make the case for unified once, with concrete evidence, then defer.
- **Reference:** `feedback_parallel_over_unified.md`.
- **When to flag:** proposal is unified when the domain has per-section / per-tenant / per-variant identity.

### 15. Animation effects stacked in the same time slot
- **Symptom:** shimmer during a transform, glow blooming during a bg shift; reads messy, competes for animation budget.
- **Cause:** multiple effects firing simultaneously instead of sequenced.
- **Fix:** each effect owns its own time slot; next effect starts after the previous settles. Total sequence ≤700ms, skippable under `prefers-reduced-motion`.
- **Reference:** CLAUDE.md "Animations sequence, never stack".
- **When to flag:** proposal coordinates 3+ motion layers without an explicit sequence timeline.

### 16. Dark mode tokens introduced
- **Symptom:** contrast issues in light mode, or a half-implemented dark palette.
- **Cause:** project is **light-only**. `:root {}` is a single light-only token block (dark-mode tokens purged in M8.11.1).
- **Fix:** stay light-only. No `prefers-color-scheme: dark` rules, no dark-mode token overrides.
- **Reference:** CLAUDE.md "Styling: light mode only".
- **When to flag:** proposal introduces any dark-mode branch.

---

## How to run the catalog

1. Read the user's proposed architecture description.
2. For each pitfall 1-16, ask: "does this proposal touch the domain this pitfall lives in?" If yes, compare the proposal against the fix shape.
3. Emit a flag only for pitfalls that apply. Don't pad the report.
4. Group flags by severity: **blocking** (proposal will fail immediately, e.g. pitfall #1 / #2) vs **advisory** (design will drift, e.g. pitfall #11 / #15). State blockers first.
5. End with the overall verdict + one-sentence rationale.

## Extending the catalog

When a new pitfall gets diagnosed and committed to memory as a `feedback_*.md`, add it here as a numbered entry with the same shape: name · symptom · cause · fix · reference · when-to-flag. This skill's value grows with the catalog — don't let it stagnate.

## Guardrails

- **This skill does NOT write code.** It only reviews. If the user asks to implement, they should either invoke the relevant builder skill (e.g. `/accent-retune`) or give an explicit implementation directive.
- **This skill does NOT replace `/design-review`** (per-diff visual fidelity) or `/tdz-audit` (focused on js/app.js render path). If the proposal clearly falls under one of those skills' domains, say so and defer.
- **If the proposal is ambiguous, ask ONE clarifying question and proceed.** Don't run the full catalog against a straw-man interpretation.
