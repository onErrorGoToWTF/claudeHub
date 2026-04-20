# aiUniversity (repo: `claudeHub`)

> **Before writing any code:** do not make any changes until you have 95% confidence in what you need to build. Ask follow-up questions until you reach that confidence.

Personal Claude intelligence + training dashboard. Visible brand is **aiUniversity** (flipped from `aiStacked` in M8.12.5; internal identifiers kept). Pulls news, YouTube videos, status, tutorials, and Anthropic docs into a static site auto-refreshed every 2h via GitHub Actions. Also hosts hand-authored lessons, quizzes, and saved projects. v0.7 design-system refactor is in flight — see `docs/plans/v0.7-design-system-refactor.md`.

## Stack

- **Frontend:** static HTML / CSS / vanilla JS, no build step. Deployed on GitHub Pages from `main`.
- **Scrapers:** zero-dependency Node 20 modules in `scripts/`. Each pulls an RSS/Atom feed or sitemap and returns a normalized item shape.
- **Orchestrator:** `scripts/build_latest_json.js` runs all scrapers in parallel, merges results, writes `data/latest.json`.
- **Automation:** GitHub Actions workflow runs the orchestrator every 2h and commits `data/latest.json` with `[skip ci]` to avoid loops.
- **No backend.** All user state (projects, lesson progress, mastery) lives in `localStorage` under the `clhub.v1.*` namespace. See `data/schema.md`.

## Layout

```
scripts/
  build_latest_json.js         # orchestrator (runs every fetcher in parallel, merges, writes data/latest.json)
  fetch_anthropic.js           # /news, /engineering, /research via sitemap
  fetch_academy.js             # Anthropic Academy courses (writes data/learn/academy_*.json)
  fetch_claude_learning.js     # claude-related what's-new feed (anthropic releases, skills, MCP)
  fetch_docs.js                # platform.claude.com tutorial docs (sitemap)
  fetch_tutorials.js           # cookbook/courses/releases atoms + anthropic edu pages
  fetch_youtube.js             # per-channel YouTube Atom (no API key needed)
  fetch_news.js                # TechCrunch, Ars, Verge, Bloomberg, Google News RSS
  fetch_hn.js                  # HN Algolia API
  fetch_status.js              # status.anthropic.com RSS
  dev_server.py                # local UTF-8-safe static server (python -m http.server replacement)
  lib/
    util.js                    # httpGet, dedupe, runAll, sortByDateDesc
    xml.js                     # tolerant RSS/Atom/sitemap parser (regex-based)

data/
  latest.json                  # auto-generated feed consumed by js/app.js
  version.json                 # milestone cursor — bumped on every deploy
  schema.md                    # full JSON + localStorage contract reference
  learn/
    lessons.json               # hand-authored lessons with inlined MCQ quiz arrays
    lessons/                   # markdown bodies (one file per lesson slug)
    academy_courses.json       # Anthropic Academy catalog (scraped by fetch_academy.js)
    academy_snapshot.json      # raw Academy response cache
    tools.json                 # Tools tab catalog
    snippets.json              # reusable code/config snippets
    usecases.json              # seed example projects for the Finder
    claude_hub_map.json        # Academy course slugs → Claude hub buckets

css/style.css                  # single-file stylesheet, light-only (TOC at top)
js/app.js                      # single-file frontend IIFE (TOC at top)
index.html                     # one page, section-per-tab toggled via data-hidden
_parked/                       # markup parked during refactors (renderers null-guard)
  dashboard-charts.html        # State-of-AI chart stack (parked in M8.11.4)

docs/
  status.md                    # release + phase summary
  plans/
    aistacked-v1.md                      # original rebuild plan (historical reference)
    v0.7-design-system-refactor.md       # milestone ledger (M9.1–M9.16n) + deferred-items tracker
    v0.7-open-questions.md               # defaults + user approvals for v0.7

.claude/
  skills/
    add-scraper/                         # scaffolds a new feed scraper
    debug-feed-failure/                  # diagnoses stale/broken sections
    design-review/                       # reviews CSS/HTML/JS against design language
    milestone-deploy/                    # commits + bumps version + pushes a milestone
  settings.local.json                    # local permissions / allowlist

.github/workflows/             # cron rebuild + Pages deploy
```

## Running locally

```bash
# Rebuild the feed (pulls everything, writes data/latest.json)
node scripts/build_latest_json.js

# Serve the site (UTF-8 path-safe; no Node server needed)
python -m http.server 8765
# → http://localhost:8765
```

## Deploying

- **Site:** merge to `main`. GitHub Pages redeploys within ~1 minute.
- **Milestone commits** bump `data/version.json`. For the v0.7 refactor, invoke `/milestone-deploy` after finishing a milestone's code.

## Tabs (`index.html` chips)

**Dashboard · Learn · Projects · Tools** — in that order, inside the fixed floating glass nav pill (`.nav-wrap > .chips.glass`). Nav chips are translucent glass with impressed/debossed labels (M8.12.37); active chip stays solid white for prominence.

- **Dashboard** (neutral grey placeholder `#9a938a` — may be retuned):
  - Every section head (Dashboard / Learn / Projects / Tools) carries a square **YouTube tile** (`.youtube-open-btn.dash-action.dash-action-quiet.glass`) top-right since M9.7b, so the header's vertical footprint stays uniform across pages and the top-right is reserved as a quick-action slot. Tile is transparent Apple glass; logo + wordmark render as a glass impression (neutral dark stroke + stacked highlight/shadow text-shadow, M8.12.35/36). Tapping opens the YouTube modal.
  - Each panel uses a **2×2 quadrant grid** (M8.11.5 + M8.12 polish): title + CTA stack in the left column rows 1-2, identity icon anchors the right column spanning rows 1-2 aligned to bottom (+6px nudge for Learn/Projects icons so they sit lower near the CTA).
  - **Learn panel** — CTA `Start new course or quiz →` (lime-green edge via `.dash-action-learn`). Right quadrant: stylized book-stack icon, lime stroke + halo. Body: hairline divider, then up to 2 in-progress-or-upcoming lessons as glass tiles (see "Tile idiom").
  - **Projects panel** — CTA `Start a new project →` (ocean-cyan edge via `.dash-action-primary`). Right quadrant: folder-with-docs icon, cyan stroke + halo. Body: hairline divider, then up to 2 most-recently-updated saved projects as glass tiles.
  - **Tools panel** — CTA `Browse the tools →` (tangerine edge via `.dash-action-tools`). Right quadrant: wrench icon, tangerine stroke + halo. Body: hairline divider, then three currently-in-use tools as glass tiles with `USING` pills (M8.12.41). These feed future project-stack recommendations.
- **Learn** (chartreuse-lime `#84cc16`) — current nested toggle (Courses/Quizzes → Academy/Tutorials) will be replaced in M9.4 with a flat 3-zone layout (Up Next / Everything else / Done) + filter chips + sort select. See refactor plan.
- **Projects** (ocean-cyan `#0891b2`) — current `Saved | + New project` toggle will be replaced in M9.5 with a single surface: saved list as home, CTA routes to `#projects/new` (full-page Finder with step indicator + draft resume).
- **Tools** (tangerine `#ff7a1a`) — current catalog with filter/sort dropdowns. M9.7 adds a top "Your stack" strip for mastered tools + pinned tools-in-use; `●ᴹ` mastery badge as title suffix on each tool card.

### Panel identity icons

Each Dashboard panel carries an `<svg class="dash-panel-icon dash-panel-icon--{learn|projects|tools}">`. Native viewBox `0 0 24 24`, rendered 54×54 (M8.12.28). Stroke-only — stroke width 0.5 in viewBox units; color uses `var(--color-{section}-border)` (0.55α) to match the CTA border; stacked drop-shadow glow uses `var(--color-{section}-solid)` + `var(--color-{section}-glow)` for the "concentrated near the line" pop. Icon + CTA read as visually linked. During M9.1 these `--color-{section}-*` references migrate to `--accent-*` derived from `--base`.

### Tile idiom (shared component)

Every "item row under a panel header" uses `.continue-row` (M3.6, retuned M8.12.22). Anatomy: title + right-side pill (status / path / USING) + meta row below. Visual recipe: solid `--bg-0` background (fakes a cut-through to the page), thin hairline border, inset top-edge specular highlight, faint drop shadow. Hover lightens + tints border/glow to the panel's identity color. Active darkens with inset shadow. CSS backdrop-filter can't literally cut holes through an opaque parent per-tile; this is pure optical chrome matching the page tone.

### State of AI chart stack

Charts were removed from the Dashboard in M8.11.4 (parked at `_parked/dashboard-charts.html`). CSS + render functions in `js/app.js` remain intact (each `renderTimeline`/`renderCompare`/`renderIndex`/`renderScorecard`/`renderLlmFaceoff` early-returns when its host id is absent), ready to be wired into a different surface.

## Conventions

- **Commits:** conventional prefixes (`feat:`, `fix:`, `style:`, `chore:`, `refactor:`). Feed-refresh commits get `[skip ci]`. Every milestone commit bumps `data/version.json`.
- **Feed safety:** build scripts preserve prior data when a fetch returns empty — the site never goes blank on transient fetch failures.
- **Tutorial items:** tagged `tutorial_kind: "video" | "official"` at fetch time.
- **News ordering:** videos always render above articles in any mixed list. Within each block, `sortByDateDesc`. Load-bearing — do not interleave.
- **Styling:** **light mode only.** `:root {}` is a single light-only token block (dark-mode tokens purged in M8.11.1). Cards use `.glass` for backdrop blur via `--glass-top / --glass-bottom / --glass-fallback`. Charts opt OUT of glass (solid `--chart-card-bg: #ffffff`).
- **Shared chart primitive:** `renderCbarChart(host, rows)` in `js/app.js` — used by Frontier Compare + every LLM face-off slide.
- **TDZ trap:** any module-level `let`/`const` read from a render fn during the initial `applyFilter("home")` must be hoisted above that call. See the TOC at the top of `js/app.js` for currently-hoisted state.
- **Model colors (locked):** Claude/Opus/Anthropic `#ff7a3d`, OpenAI/GPT `#14b8a6`, Google/Gemini `#4a90ff`, xAI/Grok `#e879f9`, Meta/Llama `#6366f1`. `MODEL_COL` in `js/app.js` is the source of truth; keep independent of page `--accent-*`.
- **File TOCs:** `css/style.css` and `js/app.js` carry a table-of-contents comment block at the top listing line anchors. Grep the section banner (`===== section =====` or `// ======`) to jump.

## Gotchas

- **Cache aggressiveness:** hard-refresh after deploys. `data/*.json` is fetched with `?v=<timestamp>` but service workers / PWA caching can still lag.
- **YouTube Atom feeds are flaky:** channels return 500/404 intermittently. `merge()` in the orchestrator preserves prior data rather than emptying the section.
- **GitHub Pages base path:** live URL is `/claudeHub/`, not `/`. Keep all in-page links relative.
- **`--color-violet-*` / `--accent-violet-*` tokens** are still referenced by unrelated gradients (chart text, hero mix, etc.) — don't delete.

## Design language

- **Light-only.** Page base `#eeece7` (locked), card-base `#ece9e2`, default glass near-white, chips/CTAs/charts pure `#ffffff`. Text stack `#1a1816 → text-2(0.64α) → text-3(0.36α)`. Hairlines ≤16% black alpha.
- **Ambient darkening:** body::before carries wide warm-greige radial gradients at top-left and bottom-right (rgba(80,72,58) at 0.07-0.16α) so the nav chips pop on load and the page has a subtle diagonal bias.
- **60-30-10 four-corner electric accents.** Neutrals dominate. Identity colors only on active chips + matching CTA edges. Learn chartreuse-lime `#84cc16`, Projects ocean cyan `#0891b2`, Tools tangerine `#ff7a1a`, (violet `#7c3aed` retained as `--accent-violet-*` for residual gradients). Borders 0.55α, glows 0.34α. No full-color fills — tab color lives on the EDGE (inset 1px ring + tight outer glow + drop shadow).
- **One `--base` per page (post-M9.1):** derived `--accent-{solid,border,glow,surface,ink,hover,soft,warm,cool}` via `color-mix(in oklch, …)`. Components reference `--accent-*` only. Per-component overrides live in `css/overrides.css`.
- **Restrained rounding.** `--radius-sm: 6px` / `--radius-md: 10px` / `--radius-lg: 14px`. Pill-shaped elements use `radius-sm`, not `9999px` (`--radius-pill` token deleted in M9.2). Genuine circles (avatars, spinners, dot indicators, circular buttons) use explicit `border-radius: 50%` or a fixed px. Cards use `radius-md`.
- **Premium easing.** All transitions use `--ease-premium: cubic-bezier(0.22, 0.61, 0.36, 1)` (or `--ease-lensing` / `--ease`). No bounce curves.
- **Soft glows, not neon.** Identity glows via low-alpha `box-shadow` hugging the border; background-tier, never foreground-dominant.
- **Apple-glass with top-edge specular.** `.glass` cards use a warm-white gradient via `--glass-top → --glass-bottom`, with an inset `0 1px 0 rgba(255,255,255,0.55)` specular highlight. Backdrop blur + saturate. `.glass-elevated` variant cranks blur for modals.
- **Impressed labels.** Debossed text on glass (nav chips, YouTube tile, others post-M9.3) — color `rgba(0,0,0,0.35)` + text-shadow `0 1px 0 rgba(255,255,255,0.80), 0 -0.5px 0.5px rgba(0,0,0,0.20)`. Unified under `.label-debossed` utility class in M9.3.
- **Videos-above-articles.** Any mixed list renders videos block first, then articles block (locked rule, do not interleave).
- **Reduced-motion honored.** Motion wrapped in `@media (prefers-reduced-motion: no-preference)`; reduced state = final state, data-critical reveals still paint.
- **Animations sequence, never stack.** When an activation or state change fires multiple effects (transform, shimmer, glow, shadow lift, bg shift, border flash, etc.), each effect owns its own time slot. The next effect starts only after the previous one settles. A shimmer never plays during a transform; a glow never blooms during a bg shift. Current milestones (through M9.12) only coordinate 1–2 simple effects, so this rule is informational — but it becomes load-bearing as soon as any activation adds a 3rd motion layer. Keep the sequence tight (≤700ms total) and skippable under `prefers-reduced-motion`.
- **Transforms are exclusive.** While a `transform` is animating, every other animation on or under the transformed element MUST pause. Other motion resumes only after the transform settles. This caused real regressions before — shimmer + translateY at the same time is banned. Practical: gate shimmer/glow/fade keyframes behind `.is-transform-done` (or a timed delay ≥ the transform's duration) and never run two transforms on the same element simultaneously.
- **No flicker on resize / repaint.** Transforms and activation states must avoid properties that trigger layout (width, height, margin, padding, border, font-size). Stick to compositor-only (`transform`, `opacity`, `filter`, `box-shadow` without layout impact). Don't swap DOM during animation. Backdrop-filter changes can repaint — avoid toggling them mid-animation. Test on iPhone viewport resize (address bar collapse) before shipping any new activation.
- **Prefer static / spatial solutions over animated ones.** If an effect can be achieved with a fixed overlay, a gradient, a `backdrop-filter` on a stationary layer, or a CSS-only stacking-context recipe, use that rather than a JS-driven animation. Static layers compose cleanly with the existing glass stack (backdrop-filter, blur, saturate) and never fight the activation transitions for animation budget. Past regressions have come from stacking animated effects on top of glass — reach for a spatial solution first. M9.13's darken-at-edges vignette (`html::after` fixed gradient) is the canonical example.
