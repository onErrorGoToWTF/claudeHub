---
name: session-wrap
description: End-of-session docs hygiene for the v0.7 refactor. Catches shipped-but-unlogged milestones up in the plan ledger + status.md, regenerates drifted TOCs in css/style.css and js/app.js, and ships the sweep as a single `chore` milestone (commit + push). Invoke when the user says "wrap the session", "docs hygiene", "log the last few milestones", or after a run of `style:` / `feat:` commits with no matching ledger entries.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# session-wrap for claudeHub / aiUniversity

End-of-session docs hygiene. Catches shipped-but-unlogged milestones into the plan ledger + `docs/status.md`, regenerates drifted TOCs in `css/style.css` and `js/app.js`, and ships the sweep as one `chore` milestone (commit + push) so the user has a phone-review artifact.

## Inputs

- `$1` (optional) — milestone code for the wrap commit (e.g. `M9.17g`). If omitted, derive: next `.q`-style hygiene letter in the current suite (check the plan doc's current suite to find the last-used letter, then advance).
- `$2` (optional) — new version string. If omitted, increment the `-dev.N` counter in `data/version.json` by 1.

## Scope (LOAD-BEARING — do not edit files outside this list)

Files this skill is allowed to touch:

- `docs/status.md`
- `docs/plans/v0.7-design-system-refactor.md`
- `CLAUDE.md` (tree comment only, and only if drifted)
- `css/style.css` (TOC comment block at top only — not the body)
- `js/app.js` (TOC comment block at top only — not the body)
- `data/version.json` (bump)

**Not in scope for this skill:**

- `index.html` `?v=<version>` cache-bust → owned by the `milestone-deploy` skill (the cache-bust amendment). If `milestone-deploy` hasn't been invoked since the last wrap, the next invocation of it will catch the asset bump up; this skill does not stamp assets itself.
- Any CSS rule bodies, JS render logic, markup, scraper code, or `data/latest.json`. If the survey turns up a code-level fix, STOP and surface it — wrap commits must never carry code changes.

## Steps

### 0. Working-tree safety check (LOAD-BEARING — do not skip)

Run `git status --short` and `git diff --cached --name-only`. Both must show only paths from the scope list above — plus any untracked files that do not fall inside the scope list and are untouched. If any file *outside* the scope list is currently staged or modified (e.g. `css/style.css` body lines, `js/app.js` body lines, `index.html`, `data/latest.json`, new skill files, scraper code), STOP and report to the user. Do not commit over in-progress work from a concurrent workflow. The "never `git add -A`" guardrail below is necessary but not sufficient — a previous `git add` could have pre-staged files this skill must not sweep up.

### 1. Survey

Run in parallel:

- `git log --oneline -30` — find shipped milestones.
- `grep -n "^- \*\*M9\." docs/plans/v0.7-design-system-refactor.md | tail -20`
- `grep -nE "^- \*\*M9\." docs/status.md | tail -20`

Build the **catch-up list**: every milestone in `git log` not present in both docs. Include hotfixes (e.g. `M9.17a.1`, `M9.17b.a`).

### 2. Report the plan before editing

Print a short block to the user:

```
Catch-up list: M9.X, M9.Y
Plan doc: append N entries to "M9.X polish suite" (or new subsection)
status.md: refresh "Current state" date + add N bullets
TOCs: style.css drift = N lines, app.js drift = M lines (regenerate if >40)
Wrap commit: chore($1): session wrap — docs + indices refreshed [v$2]
```

Wait for user OK before editing. Skip the wait only if the invocation prompt already said "go" / "run it" / "just do it".

### 3. Update `docs/plans/v0.7-design-system-refactor.md`

Append one bullet per catch-up milestone in the ledger format (confirmed 2026-04-20 against live file):

```
- **M9.Xx [v0.7.1-dev.N]** — `type`: one-sentence imperative summary drawn from the commit subject + body.
```

Where `type` is one of `refactor | style | feat | chore` per the commit prefix. Chronological order. If catch-up opens a new milestone suite, add a `## M9.X polish suite — shipped (<today>)` section header first.

### 4. Update `docs/status.md`

- Change the `## Current state — YYYY-MM-DD` date to today.
- Update the "Current release" line at the top.
- Append new milestone bullets under the appropriate "What shipped in M9.X" section (or add a new one if a new suite started).

### 5. Check `CLAUDE.md` tree comment

Only update if `.claude/skills/` or `docs/plans/` structure changed. Do not rewrite prose.

### 6. Check TOCs for drift

For each of `css/style.css` and `js/app.js`:

- Parse top-of-file TOC block (line anchors like `L1789 <section>`).
- For each entry, grep for the section banner (`/* ===== <section> ===== */` for CSS; block-comment label for JS) and compare actual line to claimed.
- **Regenerate threshold:** if any entry drifts >40 lines OR >5 entries drift >15 lines, regenerate the TOC. Otherwise record "TOC OK".
- When regenerating, preserve header wording and the CONVENTIONS trailer in `js/app.js`. Only line anchors change.

### 7. Bump `data/version.json`

```json
{
  "version": "$2",
  "milestone": "$1",
  "milestoneTitle": "Phase $1 — session wrap / docs hygiene",
  "deployedAt": "<current ISO8601 UTC>",
  "commitSha": ""
}
```

### 8. Stage explicit paths only

Never `git add -A`. Add each touched file by name:

```
git add docs/status.md docs/plans/v0.7-design-system-refactor.md data/version.json
# ... plus css/style.css / js/app.js / CLAUDE.md only if they were edited in this run.
```

### 9. Commit with HEREDOC

```
git commit -m "$(cat <<'EOF'
chore($1): session wrap — docs + indices refreshed [v$2]

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### 10. Rebase + push

```
git pull --rebase && git push
```

(Always deploy. Session wrap produces a phone-review artifact every time per the project's deploy-chunks convention.)

### 11. Report

```
Wrapped + shipped $1 [v$2].
Logged: M9.X, M9.Y
TOCs: <OK | regenerated css | regenerated js | regenerated both>
Live at https://onerrorgotowtf.github.io/claudeHub/ in ~60s. Waiting on phone review.
```

Then STOP. Do not continue to any other work.

## TOC drift algorithm (reference)

- **JS example.** A drifted line looks like `L3840  openYouTubeModal (dashboard YouTube tile)`. Grep for `openYouTubeModal =` near the claimed line. If actual is L3912, drift is 72 → regenerate.
- **CSS example.** Banners are `/* ===== <section> ===== */`. Grep actual line numbers vs TOC's `Lxxxx` anchors. When regenerating, preserve grouping headings (FOUNDATIONS, CHROME, PRIMITIVES, etc.).

## Failure handling

- If `git push` rejects for non-fast-forward: run `git pull --rebase` and retry once. If rebase conflicts touch `data/latest.json`, `git checkout --ours` that file and continue.
- If the pre-commit hook fails: fix the underlying issue, re-stage, commit fresh (never amend).
- If two successive commit attempts fail, STOP and hand back to the user. No third attempt.

## Guardrails

- **No behavior changes.** If the survey surfaces a code-level fix, STOP — separate milestone.
- **Only log milestones that actually appear in `git log`** with a shipped version tag.
- **No `git add -A`, `--force`, `--amend`, `--no-verify`.**
- **Empty catch-up + fresh TOCs:** still bump + commit + push. The user wants a phone-review artifact every wrap. Commit subject becomes: `chore($1): no catch-up — TOCs + indices confirmed fresh [v$2]`.
- **No `index.html` cache-bust from this skill.** That's `milestone-deploy`'s job via its cache-bust amendment. If the user reports stale CSS after a wrap-only deploy, the fix is to run `milestone-deploy` with a token-bump or have the next real milestone carry the asset bump.

## Re-verify before using (to catch drift vs. the live project)

- `docs/status.md` section structure still matches (`## Current state — YYYY-MM-DD`, "What shipped in M9.X" blocks).
- Plan-doc ledger bullet shape still `- **M9.Xx [v0.7.1-dev.N]** — \`type\`: summary`.
- `data/version.json` fields unchanged (`version`, `milestone`, `milestoneTitle`, `deployedAt`, `commitSha`).
- TOC banner formats in both files.
- Whether v0.7 refactor is still active — if v0.8 has started, the skill needs the new plan-doc path.
