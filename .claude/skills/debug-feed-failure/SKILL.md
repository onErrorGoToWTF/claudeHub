---
name: debug-feed-failure
description: Diagnoses and recovers from broken claudeHub scrapers. Use when a section of data/latest.json looks stale, empty, or wrong — for example "the videos tab hasn't updated", "news is empty", or after a GitHub Actions feed-refresh run fails. Walks through section-level anomaly detection, isolates the failing fetcher, re-runs it locally with visible errors, identifies the root cause (moved feed URL, new XML shape, rate limit, SSL), and produces a minimal fix.
allowed-tools: Read, Edit, Grep, Glob, Bash
argument-hint: [section-name]
---

# Debug a broken feed

A claudeHub section is stale or empty. Your job: identify which scraper failed, why, and patch it. Do not ship a fix until root cause is named.

## Anomaly signals to check first

1. **Stale timestamps.** Read `data/latest.json` and list each section's newest `published` per source. Anything older than 72h for a high-volume source (News, Videos, HN) is suspicious.
2. **Missing sources.** Cross-reference `FEEDS`/`CHANNELS` in each `scripts/fetch_*.js` against distinct `source` values present in the section. A source in the config but absent from output = that feed silently failed.
3. **Empty section with non-empty prior.** The `merge()` helper in `build_latest_json.js` preserves prior data on empty fetch. An all-stale section is a louder signal than an all-missing one.
4. **Recent git log.** `git log --oneline -20 -- data/latest.json` — if `chore(feed): refresh` commits stopped or the diff shows net-zero item churn for 24h+, the cron is masking a failure.

## Isolate the failing fetcher

Given `$ARGUMENTS` (section name like `news`, `youtube`, `tutorials`, `claude_learning`, `updates`, `status`), map to the fetcher(s) that feed it — read `scripts/build_latest_json.js` to confirm. Then run standalone with real errors surfaced:

```bash
node --stack-trace-limit=50 scripts/fetch_<name>.js
```

Do **not** swallow errors during diagnosis. If the file catches and returns `[]`, temporarily add `console.error` in the catch to see what threw. Remove before committing.

## Root-cause triage

| Symptom | Likely cause | Fix |
|---|---|---|
| HTTP 404 / 301 | Feed URL moved | Update URL in `FEEDS`; verify new URL returns the same shape |
| HTTP 403 / 429 | Rate limit or UA block | Check `httpGet` in `scripts/lib/util.js` — confirm User-Agent header is set; add backoff if missing |
| Parse returns 0 items from non-empty body | Feed changed XML shape | Inspect raw response, compare to `scripts/lib/xml.js` assumptions, adjust tag names |
| SSL / cert error | Feed host cert issue | Do not bypass TLS. Switch to an alternative mirror or remove the source |
| `Invalid Date` on items | Date field renamed upstream | Extend `safeDate()` input handling for the new field |
| YouTube 500 / 404 intermittent | Known flaky Atom feeds | Per CLAUDE.md, `merge()` already preserves prior data — confirm this is transient before patching |

## Two-strikes rule

If your first fix doesn't restore a valid item list on re-run, try once more. If a second fix also fails, **stop patching** and re-state the root cause from scratch to the user. Do not ship a third speculative patch.

## Validate before committing

1. Re-run just the fetcher — must return ≥1 valid item with all required fields.
2. Run `node scripts/build_latest_json.js` — diff `data/latest.json` and confirm only the expected section gained items.
3. Confirm no other section lost items (`merge()` should protect them, but verify).
4. If the user asks to commit, use `fix(feed): <source> <one-line cause>` — not `chore(feed)`.

## Do not

- Delete a source silently to make the error "go away."
- Use `--no-verify` or skip hooks.
- Bypass `merge()`'s preserve-prior behavior — it's the reason the site never goes blank.
- Touch `.github/workflows/` unless the cron itself is the failure.
