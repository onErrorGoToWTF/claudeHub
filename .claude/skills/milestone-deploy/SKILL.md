---
name: milestone-deploy
description: Commit, bump data/version.json, and push a completed M9.x milestone for the v0.7 design-system refactor. Invoke after finishing a milestone's code changes.
---

# milestone-deploy

Use this skill when you've just completed a milestone's code changes (e.g. M9.3) and want to commit + push for phone review in one pass. Matches the conventions in `docs/plans/v0.7-design-system-refactor.md`.

## Inputs

- `$1` — milestone code (e.g. `M9.3`, `M9.4a`)
- `$2` — short imperative summary (quoted). Becomes the commit subject body.
- `$3` — new version string (e.g. `0.7.0-dev.3`). Must match the milestone cadence in the plan.

## Steps

1. **Verify the working tree is clean of unrelated changes.** Run `git status --short`. If files unrelated to this milestone are staged/modified, STOP and report to the user.
1b. **If `js/app.js` is in the diff**, invoke `/tdz-audit` BEFORE bumping the version. TDZ regressions on the initial-render path silently abort the IIFE on first page load (dashboard non-functional until the user refreshes on a non-home route). This has shipped twice (M9.18b.1, M9.18b.3) before the audit existed — don't skip it. If `/tdz-audit` reports any violation, hoist the offending declaration and re-run the audit until it passes.
2. **Update `data/version.json`** using the inputs:
   ```json
   {
     "version": "$3",
     "milestone": "$1",
     "milestoneTitle": "Phase $1 — $2",
     "deployedAt": "<current ISO8601 UTC>",
     "commitSha": ""
   }
   ```
2b. **Bump `?v=<version>` cache-bust queries in `index.html`.** (See `project_cache_bust_production_flag.md` — this is dev-era tooling; revisit at production cutover.)
   - Scan `index.html` for local-asset `<link>` / `<script>` tags pointing at `css/*.css` or `js/*.js`. Current surface (confirmed 2026-04-20):
     - `<link rel="stylesheet" href="css/style.css?v=<old>">`
     - `<link rel="stylesheet" href="css/overrides.css?v=<old>">`
     - `<script src="js/app.js?v=<old>" defer></script>`
   - For each, rewrite the `?v=<old>` value to the full new version string `$3` (not a short hash). If a matched tag is missing the `?v=` query entirely, add `?v=$3`.
   - **Out of scope:** `data/latest.json` and other `data/*.json` runtime fetches — those use `?v=<timestamp>` set at fetch time in `js/app.js` and stay timestamp-based (simpler; a stale-feed display after an unchanged-version deploy would be worse).
   - **CSS `@import` chains:** if any `@import url("x.css")` exists inside `css/*.css` (none as of 2026-04-20), they'd also need `?v=$3` inlined at CSS level. Verify before committing.
3. **Stage only the milestone files + `data/version.json` + `index.html`** (the cache-bust touch from step 2b). Use explicit paths, not `git add -A`.
4. **Commit** with HEREDOC to preserve formatting:
   ```
   git commit -m "$(cat <<'EOF'
   <type>($1): $2 [v$3]

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
   EOF
   )"
   ```
   where `<type>` is one of `refactor | style | feat | chore` per the plan.
5. **Rebase + push**: `git pull --rebase && git push`.
6. **Report** to the user:
   ```
   Pushed $1. Live at https://onerrorgotowtf.github.io/claudeHub/ in ~60s.
   Waiting on phone-review before proceeding to next milestone.
   ```
7. **STOP.** Do not continue to the next milestone. Wait for explicit `continue` / `M9.next` from the user.

## Failure handling

- If `git push` rejects for non-fast-forward: run `git pull --rebase` and retry once. If rebase conflicts touch auto-generated data (`data/latest.json`, `data/learn/academy_courses.json`), `git checkout --ours` those files and continue.
- If the pre-commit hook fails: fix the underlying issue, re-stage, commit fresh (never amend).
- If two successive fixes fail, STOP and reassess with the user. Do not ship a third patch.

## Guardrails

- Never pass `--no-verify`, `--force`, `--amend`.
- Never run `git add -A` — always explicit paths.
- `commitSha` in `version.json` stays empty unless the user has wired a CI-filled value.
