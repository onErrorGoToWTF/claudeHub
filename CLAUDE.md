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
  build_latest_json.js    # orchestrator
  fetch_anthropic.js      # /news, /engineering, /research via sitemap
  fetch_docs.js           # platform.claude.com tutorial docs (sitemap)
  fetch_tutorials.js      # cookbook/courses/releases atoms + anthropic edu pages
  fetch_youtube.js        # per-channel YouTube Atom (no API key needed)
  fetch_news.js           # TechCrunch, Ars, Verge, Bloomberg, Google News RSS
  fetch_hn.js             # HN Algolia API
  fetch_status.js         # status.anthropic.com RSS
  fetch_365.js            # Comply365 + Web Manuals / Flydocs / Ideagen news
  lib/
    util.js               # httpGet, dedupe, runAll, sortByDateDesc
    xml.js                # tolerant RSS/Atom/sitemap parser (regex-based)
data/
  latest.json             # auto-generated feed consumed by js/app.js
  365/
    tutorials.json        # index of hand-authored 365 tutorials
    tutorials/            # inline-rendered markdown tutorials (co-authored over time)
css/style.css
js/app.js                 # single-file frontend; chips, charts, renderers
index.html
.github/workflows/        # cron rebuild + Pages deploy
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

Home · Apply AI · 365 · Resources · News

- **Home** — "state of AI" dashboard: frontier context windows, context-window timeline, Intelligence Index v4.0, Opus 4.7 scorecard, Top 4 LLM face-off (grouped bars across GPQA / SWE-bench / LMArena × 4 models). Chart bars animate via `IntersectionObserver` when entering the middle 75% of the viewport; they reset on exit.
- **Apply AI** — "how to use Claude" surface, orange (Claude) accent. Two sections:
  - Best tool per task: 11-row taskgrid with type legend explaining LLM / Image / Video / Voice / Tool categories.
  - Workflow recipes: 7 clickable cards; tapping a card opens a modal with Overview / Steps / When-to-use / Gotchas / Est. cost / Learn-more links. Expected to grow with prompts / templates / guides.
- **365** — Comply365-focused; will be tailored for that audience. Two sub-pills:
  - `Resources` — hand-curated Claude-usage tutorials rendered from `data/365/tutorials.json` and inline markdown under `data/365/tutorials/`. Fully generic content (no insider info).
  - `News` — scraped items from `sections.comply365_news` in `latest.json`: Comply365 company news plus AI-related coverage of competitors Web Manuals, Flydocs, and Ideagen.
- **Resources** — sub-pills: `Videos` (YouTube how-tos / setup / walkthroughs) + `Official` (Anthropic docs, cookbook, courses, Claude Code releases).
- **News** — status strip at the top (severity pills from `status.anthropic.com`), then videos block, then articles block. Videos and articles are never interleaved.

## Conventions

- **Commits:** conventional prefixes (`feat:`, `fix:`, `style:`, `chore:`). Feed-refresh commits get `[skip ci]`.
- **Dates:** build scripts preserve prior data when a fetch returns empty — the site never goes blank on transient fetch failures.
- **Tutorial items:** tagged `tutorial_kind: "video" | "official"` at fetch time; the Resources tab filters the combined list by kind.
- **News ordering:** videos always render above articles in any mixed list. Within each block, `sortByDateDesc`. Load-bearing for the News renderer — do not interleave.
- **Styling:** dark-first design tokens in `:root`; `[data-theme="light"]` opts into light. Cards use `.glass` for backdrop blur. Section accents: `--accent` (blue) = generic, `--accent-365-*` (purple) = 365 tab, `--accent-claude-*` (orange) = Apply AI tab.
- **Model colors (shared across all charts):** Claude/Opus/Anthropic = `#ff7a3d` (orange), OpenAI/GPT = `#14b8a6` (teal), Google/Gemini/Nano Banana/NotebookLM = `#4a90ff` (blue), xAI/Grok = `#e879f9` (magenta). `MODEL_COL` in `js/app.js` is the source of truth; `chipColorFor(name)` auto-applies brand color to any chip whose name matches a known model.

## Gotchas

- **Cache aggressiveness:** hard-refresh after deploys. `data/*.json` is fetched with `?v=<timestamp>` to bust the browser cache but service workers / PWA caching can still lag.
- **YouTube Atom feeds are flaky:** channels return 500/404 intermittently. `merge()` in the orchestrator preserves prior data rather than emptying the section. Same pattern protects `sections.comply365_news` when Google News RSS hiccups.
- **GitHub Pages base path:** live URL is `/claudeHub/`, not `/`. Keep all in-page links relative.

## Design language

- **Dark-first, premium.** Deep blacks, tinted hairlines (≤14% white alpha), no pure-white borders.
- **Restrained rounding.** `--radius-sm: 6px` / `--radius-md: 10px` / `--radius-pill: 9999px` for true pills only. No rogue square edges, no over-rounded bubbles.
- **Premium easing.** All transitions use `--ease-premium: cubic-bezier(0.22, 0.61, 0.36, 1)` (or `--ease-lensing` for reveals). No bounce curves.
- **Soft glows, not neon.** Accent glows via low-alpha `box-shadow` on hover / active — background-tier, never foreground-dominant. The `body::before` ambient glow stays.
- **Glassmorphism with top-edge specular.** `.glass` cards get `inset 0 1px 0 rgba(255,255,255,0.06)` as a top-edge highlight — the single most "Apple" trick for depth. Cool-hue gradient (`#101218 → #0a0c10`), not neutral gray.
- **Sub-pill cross-fades.** Switching sub-pills (365 Resources/News, Resources Videos/Official) cross-fades the card grid with ~30ms stagger per card — no snap, no flicker.
- **Videos-above-articles.** News tab and any mixed list render videos block first, then articles block.
- **Reduced-motion honored.** Motion wrapped in `@media (prefers-reduced-motion: no-preference)`; reduced state = final state, data-critical reveals still paint.
