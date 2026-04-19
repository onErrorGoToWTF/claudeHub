# Claude Code: zero to your first session

Claude Code is Anthropic's terminal-first coding agent. You point it at a repo, describe what you want, and it edits files, runs commands, and keeps context across the session. This lesson gets you from "nothing installed" to "first real edit" in under 10 minutes.

## What you'll need

- **A terminal.** macOS / Linux / WSL / Git Bash on Windows. Any shell.
- **Node 18+.** Claude Code ships as an npm package. Verify with `node -v`.
- **A Claude plan.** Pro, Max 5×, or Max 20×. API-metered billing works too.
- **A git repo.** Doesn't have to be production-grade — a scratch folder is fine for this session.

## Install

```bash
npm install -g @anthropic-ai/claude-code
```

That's it. Global install, one binary on your PATH: `claude`.

## First run

From inside your repo:

```bash
claude
```

On first launch it walks you through sign-in. Pick your plan. Authentication persists in your OS keychain; you won't see this flow again on the same machine.

## The golden first prompt

Don't start with *"refactor my auth system"*. Start small, so you learn the loop:

> "Read the README and tell me what this project does in one paragraph."

Claude will open files, read them, and write a summary to the chat. **Nothing gets committed or edited.** That's the first muscle: watching it work without worrying about damage.

## The second prompt — a real edit

Once the summary looks reasonable:

> "Add a `contributing.md` file with a short guide: how to install, how to run tests, how to ship a change."

Now you'll see a diff. Claude proposes changes; you approve per file. Two important things:

1. **You're still in charge.** Every write gets a confirmation unless you allow it permanently.
2. **It explains what it did.** Read the summary before moving on.

## CLAUDE.md — set the rules once

Before you ship any real feature, drop a `CLAUDE.md` in your repo root. It's the project's instruction manual for future Claude sessions. Typical sections:

- **Stack** — language, framework, package manager.
- **Conventions** — naming, test locations, commit-message style.
- **Gotchas** — that one env var, that flaky migration.
- **Don't touch** — generated code, vendor dirs.

Keep it short. Five sections max. Claude reads it on every session.

## Useful in-session commands

- `/compact` — summarize the chat so you can keep working past the token budget.
- `/clear` — wipe context, start over without restarting the binary.
- `/model` — switch the thinking model for the next response (e.g. sonnet → opus for a harder task).
- `/cost` — show usage so far in the session.

## When not to reach for Claude Code

- **One-line typos.** Faster to type than to describe.
- **Ambient reading.** If you're exploring, a chat UI keeps you in a conversational rhythm.
- **Anything you'd feel guilty skimming.** If the review step will take longer than the edit itself, do the edit by hand.

## Next steps

- Write your first CLAUDE.md (see the snippets library for starters).
- Try a two-step prompt: "plan this change, then do it."
- Read the slash-command docs — custom `/` commands are where real workflow leverage lives.

Now take the quiz below to lock it in.
