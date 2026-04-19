# claudeHub

> **Before writing any code:** do not make any changes until you have 95% confidence in what you need to build. Ask follow-up questions until you reach that confidence.


Public-facing Claude intelligence dashboard. Pulls news, YouTube videos, status, tutorials, and Anthropic docs into a static site auto-refreshed every 2h via GitHub Actions. The homepage shows charts tracking the Claude model trajectory; a "365" tab hosts hand-curated Claude-usage tutorials and scraped news about compliance-software vendors (Comply365 and competitors Web Manuals / Flydocs / Ideagen).

## Stack

- **Frontend:** static HTML / CSS / vanilla JS, no build step. Deployed on GitHub Pages from `main`.
- **Scrapers:** zero-dependency Node 20 modules in `scripts/`. Each pulls an RSS/Atom feed or sitemap and returns a normalized item shape.
- **Orchestrator:** `scripts/build_latest_json.js` runs all scrapers in parallel, merges results, writes `data/latest.json`.
- **Automation:** GitHub Actions workflow runs the orchestrator every 2h and commits `data/latest.json` with `[skip ci]` to avoid loops.

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
  fetch_365.js                 # Comply365 + Web Manuals / Flydocs / Ideagen news
  dev_server.py                # local UTF-8-safe static server (python -m http.server replacement)
  lib/
    util.js                    # httpGet, dedupe, runAll, sortByDateDesc
    xml.js                     # tolerant RSS/Atom/sitemap parser (regex-based)
data/
  latest.json                  # auto-generated feed consumed by js/app.js
  version.json                 # milestone cursor — bumped on every deploy (data/version.json)
  learn/
    lessons.json               # hand-authored lessons with inlined MCQ quiz arrays
    lessons/                   # markdown bodies (one file per lesson slug)
    academy_courses.json       # Anthropic Academy catalog (scraped by fetch_academy.js)
    academy_snapshot.json      # raw Academy response cache
    tools.json                 # Tools tab catalog
    snippets.json              # reusable code/config snippets
    usecases.json              # "what can I do with Claude" catalog
    claude_hub_map.json        # cross-link map between lessons / academy / snippets
  365/
    tutorials.json             # index of hand-authored 365 tutorials
    tutorials/                 # inline-rendered markdown tutorials
css/style.css                  # single-file stylesheet, light-only (M8.11.1 purged dark tokens)
js/app.js                      # single-file frontend IIFE; chips, charts, renderers, modals
index.html
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

## Tabs (`index.html` chips)

**Dashboard · Learn · Projects · Tools · 365** — in that order, inside the fixed floating glass nav pill (`.nav-wrap > .chips.glass`). Active chip: white surface bg + `--text-1` text + tab-identity edge (inset 1px ring + tight outer glow + drop shadow). Inactive chips still have a subtle border + drop shadow for depth.

- **Dashboard** (neutral accent) — personal home:
  - Section-head "Dashboard" with a square YouTube tile (`.dash-action-quiet .glass`, icon + "YouTube" label stacked vertically) top-right. Clicking opens the `.yt-modal` dialog — the old `section-youtube` is gone.
  - **Learn panel** (glass card): heading "Learn" · "Courses & quizzes" hint. Primary CTA "Start new course or quiz →" (emerald edge via `.dash-action-learn`). Below: up to 2 resume rows from `data/learn/lessons.json` (in-progress first, then upcoming). Row layout: title left w/ ellipsis · state pill (`Start` / `In progress` / `Completed`) top-right · meta row full-width below.
  - **Projects panel** (glass card): heading "Projects" · "Your saved setups" hint. Primary CTA "Start a new project →" (blue edge via `.dash-action-primary`). Below: up to 2 most-recently-updated saved projects, same row layout (path pill replaces state pill).
  - **State of AI** charts block: headline text, then a stack of pure-white chart cards. Chart cards use `--chart-card-bg: #ffffff` directly (NOT the glass gradient) for max contrast vs the greige page.
- **Learn** (emerald green `#16a34a` accent) — Courses · Quizzes sub-pills:
  - `Courses` pane → nested sub-pills `Anthropic Academy` (catalog from `data/learn/academy_courses.json`) and `Tutorials` (hand-authored lessons from `data/learn/lessons.json`). Tutorial click opens the lesson modal in `mode="tutorial"` (body + "Take the quiz →" CTA at the end).
  - `Quizzes` pane → renders one card per lesson whose `quiz[]` is non-empty. Click opens the same modal in `mode="quiz"` (quiz only + "← Read the tutorial" back-link).
- **Projects** (blue `#007aff` accent) — `Saved` (projects list) and `+ New project` (Finder wizard) sub-pills.
- **Tools** (amber/brown `#a16207` accent) — the catalog from `data/learn/tools.json`. Section-head right slot carries filter + sort `<select class="subpill-select">` dropdowns (no more pill bar).
- **365** (purple `#7c3aed` accent) — Comply365-focused. Sub-pills: `Tutorials` (hand-authored markdown under `data/365/tutorials/`) · `Resources` (Videos + Official sub-sub-pills) · `News` (scraped Comply365 + competitor coverage from `sections.comply365_news`).

### State of AI chart stack

Inlined inside the Dashboard (no more separate `section-news-media`). Order:

1. **Top 5 LLM face-off** — swipe carousel, 3 benchmark slides (GPQA / SWE-bench / LMArena). Glass prev/next arrows in a `.faceoff-nav` row below the carousel. Each slide renders a `.cbars` chart via the shared `renderCbarChart()` helper so any chart-primitive change cascades. Grok 4.20 + Llama 4 show as `.is-nodata` dashed lines on GPQA/SWE.
2. **Frontier context windows** — `renderCompare()` through the same `renderCbarChart()` helper.
3. **Context window timeline** (SVG log-scale area chart, IntersectionObserver-triggered).
4. **Intelligence Index v4.0** (vertical bars).
5. **Opus 4.7 scorecard** (horizontal bars).

Bars/lines animate when the chart enters the middle ~76% of the viewport. Chart-card observer adds `.is-go` to `.cbar` children; carousel slides re-trigger `.is-go` on scroll-end so electrons re-run each landing.

## Conventions

- **Commits:** conventional prefixes (`feat:`, `fix:`, `style:`, `chore:`). Feed-refresh commits get `[skip ci]`. Every milestone commit bumps `data/version.json`.
- **Dates:** build scripts preserve prior data when a fetch returns empty — the site never goes blank on transient fetch failures.
- **Tutorial items:** tagged `tutorial_kind: "video" | "official"` at fetch time; the Resources tab filters the combined list by kind.
- **News ordering:** videos always render above articles in any mixed list. Within each block, `sortByDateDesc`. Load-bearing — do not interleave.
- **Styling:** **light mode only.** `:root {}` is a single light-only token block (dark-mode tokens + `[data-theme]` scoping were purged in M8.11.1). Cards use `.glass` for backdrop blur via `--glass-top / --glass-bottom / --glass-fallback` tokens. Charts opt OUT of the glass gradient and use solid `--chart-card-bg: #ffffff` for max contrast.
- **Shared chart primitive:** both Frontier Compare and every LLM face-off slide render through `renderCbarChart(host, rows)` in `js/app.js`. Change `.cbar` CSS once and it cascades to both.
- **TDZ trap:** any module-level `let`/`const` read from a render fn during the initial `applyFilter("home")` must be hoisted above that call (top of IIFE, near `MODEL_COL`). Hoisted block currently: `lessonsData`, `faceoffBenchIdx`, `FACEOFF_MODELS`, `FACEOFF_BENCHES`. Do not add lazy state at the bottom; hoist it.
- **Model colors (locked, shared across all charts):** Claude/Opus/Anthropic = `#ff7a3d` (orange), OpenAI/GPT = `#14b8a6` (teal), Google/Gemini/Nano Banana/NotebookLM = `#4a90ff` (blue), xAI/Grok = `#e879f9` (magenta), Meta/Llama = `#6366f1` (indigo). `MODEL_COL` in `js/app.js` is the source of truth; do not retune without coordinating both Compare and face-off chart renders.

## Gotchas

- **Cache aggressiveness:** hard-refresh after deploys. `data/*.json` is fetched with `?v=<timestamp>` to bust the browser cache but service workers / PWA caching can still lag.
- **YouTube Atom feeds are flaky:** channels return 500/404 intermittently. `merge()` in the orchestrator preserves prior data rather than emptying the section. Same pattern protects `sections.comply365_news` when Google News RSS hiccups.
- **GitHub Pages base path:** live URL is `/claudeHub/`, not `/`. Keep all in-page links relative.

## Design language

- **Light-only.** Page base `#eeece7` (neutral light-gray, minimal warm), panel cards `#e7e4dd`, chips/CTAs/charts `#ffffff`. Text stack `#1a1816 → text-2(0.64α) → text-3(0.36α)`. Hairlines ≤16% black alpha.
- **60-30-10 accents.** Neutrals dominate. Identity colors only on tab chip active states + matching CTA edges: Learn emerald `#16a34a`, Projects blue `#007aff`, Tools amber/brown `#a16207`, 365 purple `#7c3aed`. No full-color fills — the tab color lives on the EDGE (inset 1px ring + tight outer glow) plus a drop shadow. `<nav-brand>` "aiStacked" sticker stays dark-on-light as a deliberately locked wordmark.
- **Restrained rounding.** `--radius-sm: 6px` / `--radius-md: 10px` / `--radius-lg: 14px` / `--radius-pill: 9999px` for true pills only. Chip/CTA rounding is `radius-sm`, card rounding is `radius-md`.
- **Premium easing.** All transitions use `--ease-premium: cubic-bezier(0.22, 0.61, 0.36, 1)` (or `--ease-lensing` / `--ease`). No bounce curves.
- **Soft glows, not neon.** Identity glows via low-alpha `box-shadow` hugging the border; background-tier, never foreground-dominant. The `body::before` ambient layers `--ambient-warm` top-left + `--ambient-plasma` bottom-right at 4–6% alpha.
- **Apple-glass with top-edge specular.** `.glass` cards use a warm-white gradient via `--glass-top → --glass-bottom`, with an inset `0 1px 0 rgba(255,255,255,0.7)` specular highlight (the "single most Apple trick" for depth). Backdrop blur + saturate. `.glass-elevated` variant cranks blur and adds a deeper drop for modals.
- **Sub-pill cross-fades.** Switching sub-pills (365 Tutorials/Resources/News, Courses sub-sub-pills, Projects Saved/New) cross-fades the card grid with ~30ms stagger per card — no snap, no flicker.
- **Videos-above-articles.** Any mixed list renders videos block first, then articles block (locked rule, do not interleave).
- **Reduced-motion honored.** Motion wrapped in `@media (prefers-reduced-motion: no-preference)`; reduced state = final state, data-critical reveals still paint.
