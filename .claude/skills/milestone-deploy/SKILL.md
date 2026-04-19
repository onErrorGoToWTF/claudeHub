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
3. **Stage only the milestone files + `data/version.json`.** Use explicit paths, not `git add -A`.
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
