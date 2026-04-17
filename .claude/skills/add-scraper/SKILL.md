---
name: add-scraper
description: Scaffolds a new RSS/Atom/sitemap/JSON feed scraper for claudeHub's data/latest.json pipeline. Use when the user wants to add a news source, YouTube channel, RSS feed, sitemap, or any new fetcher under scripts/fetch_*.js. Handles feed-type detection, boilerplate generation matching existing fetcher conventions, normalized item-shape validation, and auto-registration in scripts/build_latest_json.js.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint: [source-name-or-url]
---

# Add a new scraper

You are adding a new data source to `scripts/`. Every fetcher must produce items matching the canonical shape and register in the orchestrator.

## Required item shape

```js
{
  title: string,                 // required
  url: string,                   // required, unique
  source: string,                // required, human label (e.g., "TechCrunch")
  published: string,             // required, ISO 8601 via safeDate()
  summary: string,               // required, clampText(..., 180–220)
  // optional, section-specific:
  tutorial_kind: "video" | "official",
  channel, video_id, thumbnail,   // YouTube
  hn_id,                          // HN
  _kind, _severity                // status
}
```

## Workflow — follow in order

1. **Read two reference fetchers** before writing anything: `scripts/fetch_news.js` (RSS) and `scripts/fetch_youtube.js` (Atom). Match their imports, error handling, and export shape exactly.
2. **Read the library helpers** in `scripts/lib/util.js` and `scripts/lib/xml.js`. Use `httpGet`, `runAll`, `dedupeByUrl`, `sortByDateDesc`, `safeDate`, `clampText`. Do not reinvent any of these.
3. **Detect feed type.** If `$ARGUMENTS` is a URL, fetch it once with `httpGet` and inspect: `<rss>` → RSS, `<feed>` → Atom, `<urlset>` → sitemap, `{` → JSON. If unclear, ask the user once.
4. **Write `scripts/fetch_<name>.js`** following the closest reference fetcher's structure. Required pieces:
   - `FEEDS` (or `CHANNELS`) constant with `{ url, source }` entries
   - `async function fetchOne(feed)` returning normalized items
   - `export async function main()` using `runAll` for parallel fetch tolerance
   - Final pipeline: `dedupeByUrl` → `sortByDateDesc` → `.slice(0, N)`
   - On any per-feed throw, return `[]` — never let one bad feed kill the batch
5. **Register in `scripts/build_latest_json.js`:** import the new `main`, `await` it in parallel with siblings, merge result into the correct `sections.<key>` via the existing `merge()` helper. Preserve-prior-data on empty is already handled by `merge()`; do not bypass it.
6. **Dry-run locally:** `node scripts/fetch_<name>.js` and inspect output. Every item must have `title`, `url`, `source`, `published` (valid ISO), `summary`. If any field is missing or `published` is `Invalid Date`, fix the mapper before proceeding.
7. **Full build:** `node scripts/build_latest_json.js` and diff `data/latest.json`. The new section (or items in an existing section) must appear.
8. **Do not commit** unless the user asks. If they do, use `feat(feed): add <source> scraper` — not `chore(feed)`, which is reserved for cron refreshes.

## Hard rules

- Zero npm dependencies. Node 20 stdlib only. No `node-fetch`, no `xml2js`, no `axios`.
- Forward slashes in any paths you write.
- Never widen the normalized shape without the user's confirmation — downstream renderers in `js/app.js` depend on exact field names.
- If the feed is YouTube, it must go through `sections.videos` or `sections.tutorials` with `tutorial_kind: "video"`, never `sections.news`. Videos-above-articles is load-bearing (see CLAUDE.md).
- Do not touch `.github/workflows/` — the cron already runs `build_latest_json.js`.

## Done means

- New fetcher file compiles and runs standalone with valid output.
- `build_latest_json.js` imports and awaits it.
- `data/latest.json` contains items from the new source after a local build.
- No existing section lost items (check `git diff data/latest.json` — only additions).
