# claudeHub

Personal, public-facing Claude intelligence dashboard. Pulls news, YouTube videos, status, tutorials, and Anthropic docs into a static site auto-refreshed every 2h via GitHub Actions. One password-gated tab ("365") hosts curated content for a non-technical family member; the homepage shows charts tracking the Claude model trajectory.

## Stack

- **Frontend:** static HTML / CSS / vanilla JS, no build step. Deployed on GitHub Pages from `main`.
- **Scrapers:** zero-dependency Node 20 modules in `scripts/`. Each pulls an RSS/Atom feed or sitemap and returns a normalized item shape.
- **Orchestrator:** `scripts/build_latest_json.js` runs all scrapers in parallel, merges results, writes `data/latest.json`.
- **Automation:** GitHub Actions workflow runs the orchestrator every 2h and commits `data/latest.json` with `[skip ci]` to avoid loops.
- **Backend:** Cloudflare Worker at `worker/` handles 365-tab form submissions and the pin-for-Lisa endpoint. Uses a GitHub fine-grained PAT to write into the repo.

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
  lib/
    util.js               # httpGet, dedupe, runAll, sortByDateDesc
    xml.js                # tolerant RSS/Atom/sitemap parser (regex-based)
data/
  latest.json             # auto-generated feed consumed by js/app.js
  lisa.json               # hand-curated content for the 365 tab
  lisa/tutorials/*.md     # inline-rendered markdown tutorials for 365 tab
css/style.css
js/app.js                 # single-file frontend; chips, charts, Lisa gate, pin
index.html
worker/
  src/index.js            # /submit (form) + /pin (tutorial pin) endpoints
  wrangler.toml
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
- **Worker:** `cd worker && npx wrangler deploy`. Secrets (set via `npx wrangler secret put NAME`):
  - `GITHUB_TOKEN` — fine-grained PAT, Contents: Read+Write on this repo only
  - `LISA_GATE_HASH` — sha256 hex of the 365 password (must match `LISA_PW_HASH` baked into `js/app.js`)
  - `TURNSTILE_SECRET` — optional

## Tabs (`index.html` chips)

Home · YouTube · 365 · Tutorials · Updates · News · Status

- **Home** — charts: frontier context windows, context-window timeline, Intelligence Index v4.0, Opus 4.7 scorecard. Chart bars animate via `IntersectionObserver` when entering the middle 75% of the viewport; they reset on exit.
- **365** — password-gated (`HkBHOY0zDdV7`, sha256 baked into `LISA_PW_HASH`). Rendered from `data/lisa.json`. Includes a request form (posts to Worker `/submit`) and pinned tutorials group.
- **Tutorials** — sub-pills: `Videos` (how-to filtered YouTube) + `Official` (Anthropic docs/cookbook/courses/releases). Pin button on each card posts to Worker `/pin`, which edits `data/lisa.json#tutorials_pinned`.
- Other tabs render from sections of `data/latest.json`.

## Conventions

- **Commits:** conventional prefixes (`feat:`, `fix:`, `style:`, `chore:`). Feed-refresh commits get `[skip ci]`.
- **Dates:** build scripts preserve prior data when a fetch returns empty — the site never goes blank on transient fetch failures.
- **Tutorial items:** tagged `tutorial_kind: "video" | "official"` at fetch time; the Tutorials tab filters the combined list by kind.
- **Styling:** dark-first design tokens in `:root`; `[data-theme="light"]` opts into light. Cards use `.glass` for backdrop blur. Accent = Claude blue; `--lisa-*` = purple (365 tab).

## Gotchas

- **Cache aggressiveness:** hard-refresh after deploys. `data/*.json` is fetched with `?v=<timestamp>` to bust the browser cache but service workers / PWA caching can still lag.
- **Rate limit buckets:** Worker `/submit` = 3/min per IP, `/pin` = 20/min per IP (separate KV keys).
- **Pin flow requires plaintext password in memory:** after a successful 365 unlock the plaintext is stored in `localStorage.cdih-lisa-secret` (reset when "Lock this tab" is clicked). Without it, the pin button stays hidden.
- **YouTube Atom feeds are flaky:** channels return 500/404 intermittently. `merge()` in the orchestrator preserves prior data rather than emptying the section.
- **GitHub Pages base path:** live URL is `/claudeHub/`, not `/`. Keep all in-page links relative.
