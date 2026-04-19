# Custom slash commands — the real leverage

Slash commands let you teach Claude Code a repeatable workflow once, then trigger it with `/<name>` from any session in your repo. This is where the time savings get real — once you have 5-10 good ones, you stop re-explaining the same multi-step tasks.

## Where they live

Per-project commands go in `.claude/commands/<name>.md`. The filename is the command. If you have `.claude/commands/deploy.md`, you type `/deploy` to run it.

User-scope commands (work across every repo on your machine) go in `~/.claude/commands/<name>.md`.

## The simplest useful command

A command is a markdown file whose frontmatter is optional and whose body is the prompt Claude will run when you invoke it.

```markdown
---
description: Run the full test suite and summarize failures.
---

Run the project's tests. After they finish, summarize:
- How many passed vs. failed.
- Which files have failures.
- The shortest next step to investigate.
```

Invoke with `/test` (if the file is named `test.md`).

## Accepting arguments

Use `$ARGUMENTS` in the body. It's replaced with whatever the user typed after the slash command.

```markdown
---
description: Open a bug-fix PR for issue $ARGUMENTS.
argument-hint: "[issue-number]"
---

Open GitHub issue #$ARGUMENTS with `gh issue view`, read it, then:

1. Create a branch `fix/$ARGUMENTS-short-slug`.
2. Implement the fix.
3. Run the test suite.
4. Push and open a PR that closes issue #$ARGUMENTS.
```

Typing `/fix-issue 412` expands `$ARGUMENTS` to `412` everywhere it appears.

## Naming patterns that work

- **Verb-first.** `/test`, `/deploy`, `/review`, `/ship`.
- **Short.** `/changelog` beats `/generate-changelog`. You type these a lot.
- **Team-shared command? Commit it.** Personal command? Keep it in user scope.

## Commands to author first

1. **`/test`** — runs the suite, summarizes.
2. **`/review`** — reviews the current diff for bugs + style.
3. **`/ship`** — stages + commits + opens a PR following your team's convention.
4. **`/explain`** — reads the current file and explains the non-obvious parts.
5. **`/refactor`** — applies a named pattern (e.g. "extract this into a pure function").

## Invocation mid-session

You can chain: "Do X, then `/test`, then `/ship` if tests pass." Claude treats the slash command inline — no special handoff.

## When to promote chat wisdom into a slash command

If you find yourself writing the same multi-paragraph prompt for the third time, stop and author the command. Two minutes of writing it down saves hours across the next month.
