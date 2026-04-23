# Troubleshooting Log

Running append-only log of concrete "something broke, here's why, here's the fix" entries hit during the build. Dated. Each entry is raw material for a future **Troubleshooting** track — when enough accumulate, they spin into lessons (with `#troubleshooting` tag applied to cross-reference from related topics).

Format per entry:

    ### YYYY-MM-DD — One-line symptom
    **What broke:** the visible symptom the user sees.
    **Root cause:** the actual mechanism.
    **Fix:** the concrete change.
    **Why it matters:** who hits this and how to spot it next time.

Entries are append-only — don't edit old entries; add a new one if our understanding improves and link back.

---

## 2026-04-23 — iOS Safari auto-zooms into form fields

**What broke:** Tapping any input on an iPhone caused the page to zoom in, and Safari refused to zoom back out after leaving the field. The page felt stuck at a weird scale.

**Root cause:** iOS Safari has a hard-coded rule: if a form control is rendered with `font-size < 16px`, it auto-zooms on focus "for readability." It deliberately does NOT zoom back out afterward.

**Fix:** Set `font-size: 16px` (or larger) on every `<input>`, `<textarea>`, and `<select>`. Global rule in `global.css` plus per-component overrides for any class that was using `var(--text-md)` (15px) or smaller. Do NOT use the viewport hack `maximum-scale=1` / `user-scalable=no` — that disables pinch-zoom and fails WCAG 1.4.4.

**Why it matters:** Anyone shipping a web app to mobile users will hit this. The fix is universal, well-documented, and takes one CSS rule. The trap is that it looks like a Safari bug when it's actually documented behavior.

---

## 2026-04-23 — Refreshing a deep route on GitHub Pages 404s

**What broke:** Going to `/learn` and hitting refresh booted the user to a 404 page. Home (`/`) worked fine; every other route failed on refresh.

**Root cause:** SPAs using `BrowserRouter` serve everything from one `index.html`, but GitHub Pages serves real files from disk — `/learn/index.html` doesn't exist, so it returns 404. React Router never gets a chance to render because the server never served the SPA shell.

**Fix:** After build, copy `dist/index.html` to `dist/404.html`. GitHub Pages uses `404.html` as the fallback for any unknown path. Because it IS the SPA shell, React Router boots normally, reads `window.location`, and renders the right route. One extra line in the deploy workflow: `cp dist/index.html dist/404.html`.

**Why it matters:** Anyone deploying a React/Vue/SPA to GitHub Pages hits this the first time they share a deep link or refresh a nested route. The fix is standard; the surprise is that it needs to be done at all.

---

## 2026-04-23 — Local TypeScript passes, CI TypeScript fails

**What broke:** Three deploys in a row failed with `error TS2349: This expression is not callable` on a line the local `tsc --noEmit` never complained about.

**Root cause:** The project uses `tsc -b` (build mode) in CI, which uses project references and stricter whole-program checks. Local `tsc --noEmit` runs differently — some errors only surface under `-b`. In this case, the issue was backticks nested inside a template literal: `` `[laughs]` `` inside a `` `...` `` block terminated the outer template literal early, turning `laughs` / `whispers` into undefined identifiers.

**Fix:** Run the same command CI runs (`npx tsc -b`) locally before committing. If it must differ, pick the stricter one for local dev so CI never surprises you.

**Why it matters:** "Works on my machine" is the oldest bug in software. Matching local and CI compilation modes is the simplest preventive step.

---

## 2026-04-23 — "Something I just changed isn't updating" ≠ always cache

**What broke:** User kept seeing old content after a push. Natural instinct: clear cache, hard refresh, try private browsing.

**Root cause:** The deploys had silently been failing (see above). The live site was three commits behind. No amount of cache-clearing would help because the code on the server was genuinely older than expected.

**Fix:** Before suggesting "clear cache / try private," verify the deploy actually succeeded. For GitHub Actions: `gh run list --workflow=deploy-pages.yml --limit 3`. For other platforms, use their equivalent. If the latest run is green AND matches the commit you expect, THEN investigate cache. Otherwise the problem is upstream.

**Why it matters:** Suggesting cache-clearing as a first response trains users to doubt themselves. Verifying deployment is two seconds of work and saves everyone's time. The general principle: always check the thing closest to the source (CI/CD) before blaming the thing furthest from it (browser cache).

---

## 2026-04-23 — Light app defaults to dark when OS is dark

**What broke:** First-time users with dark-mode OS settings got a dark-mode app, even though the design was tuned for light.

**Root cause:** The no-flash theme init script fell back to `window.matchMedia('(prefers-color-scheme: dark)').matches` when no preference was stored. That's a reasonable default — *if* you intend to honor OS preference. If you want a fixed default regardless of OS, you have to NOT read that media query.

**Fix:** Remove the media-query fallback. Only switch to dark mode if `localStorage.getItem('ai-theme') === 'dark'`. OS setting is intentionally ignored. First-run + cleared storage + private browsing all land in the intended default.

**Why it matters:** "The app should open in X mode" is a product decision. OS preference is a reasonable default when you haven't decided; it's the wrong default when you have.

---

## 2026-04-23 — Warm canvas silently green-tints mastery chips

**What broke:** Accent pills (Mastered chips especially) looked muddy — green tinted toward greenish-yellow, blue toward slightly teal. The "vibrant electric" design intent was getting washed out.

**Root cause:** The CSS token for a chip's fill was `color-mix(in oklch, var(--mastery-base) 14%, var(--bg-page))` — mixing the accent with the **warm greige page background**. Any non-neutral mix target tints the result. In oklch space, mixing saturated green with warm greige yields muted yellow-green.

**Fix:** Change the mix target from `--bg-page` (warm greige) to `--bg-card` (pure white). Also bump the accent percentage from 14-16% to 22% so the pill actually pops. For ink text on chips, use dedicated `--mastery-ink` / `--accent-ink` / `--danger-ink` tokens (80% base + black 20%) instead of 70% base + black mixes — the latter desaturates in addition to darkening.

**Why it matters:** Designers using color-mix with a page-bg target assume "it'll just dim slightly" — but oklch mixing respects hue, so a non-neutral target bends the accent hue. White or a cool-neutral gray is the safe dilution base when you want the accent's identity preserved.

---

## 2026-04-23 — Universal audience content shows the wrong badge

**What broke:** A library item marketed "for leaders and knowledge workers" displayed a `dev` badge to every user regardless of their pathway.

**Root cause:** Two bugs compounding. (1) The item had no explicit `audience` field, so `deriveLibraryAudience` fell through to a universal default of all five pathways. (2) The `audienceBadge` function, when given a 5-pathway "universal" audience, sorted alphabetically and returned the first — `dev`. For any pathway user on any universal item, they'd see `dev`.

**Fix:** (1) Set explicit `audience: ['office']` on items whose positioning implies a specific audience. (2) In `audienceBadge`, treat a 5-pathway audience as "universal = no badge" and return `null`. Badges now only appear on content that's genuinely audience-specific.

**Why it matters:** Defaults are load-bearing. A fallback that silently picks "first alphabetical" to represent "all" is convenient at the data layer and wrong at the UX layer. Make the universal case explicit.

---

## Planned entries (as they come up)

- **localStorage in iOS private browsing** — read+write work but are session-scoped; data evaporates on tab close. Design persistence assuming this.
- **CSS specificity: module-class beats element selector** — why a global `input { font-size: 16px }` may be overridden by a component's `.myInput { font: inherit }`.
- **Framer Motion + AnimatePresence + list keys** — mount/exit animations fail silently without stable keys.
- **Dexie schema versioning** — bumping `.version(N)` is a migration trigger; dropping a version number is destructive.
- **Zustand persist version bumps** — changing a store's shape without bumping version produces orphaned fields; bumping drops all old payloads.
