# When to author a Skill (and when not to)

Skills are Claude's way of saying "when you notice conditions X, apply this specific playbook." They live in `.claude/skills/<name>/SKILL.md` (or `~/.claude/skills/<name>/` for user-scope), and Claude auto-invokes them when their description matches what you're doing.

## Skill vs. slash command vs. CLAUDE.md

Three neighboring tools — pick the right one.

- **CLAUDE.md** — always-on project rules. Everything Claude should know about every session.
- **Slash command** — you-trigger workflow. "Do this specific thing when I ask."
- **Skill** — Claude-triggers workflow. "Notice this situation and apply this playbook."

If you want Claude to do something *only when you type the command*, use a slash command. If you want Claude to *automatically* apply a pattern when conditions match, use a skill.

## Anatomy of a skill

A skill is a directory with a `SKILL.md` at the root:

```
.claude/skills/add-migration/
  SKILL.md
  template.sql           # optional — bundled files the skill references
  examples/
    001_users.sql
```

The `SKILL.md` starts with YAML frontmatter. The two required fields:

```yaml
---
name: add-migration
description: Scaffold a new Drizzle migration with the project's naming convention
---

When the user wants to add a new database migration:

1. Read `drizzle/migrations/` to find the next sequence number.
2. Create the file `NNN_<slug>.sql` using the bundled `template.sql`.
3. Walk the user through the up/down SQL.
4. Run `pnpm db:migrate` to apply.
```

Claude picks this up when the description matches intent — "add a migration", "new database table", etc.

## When to author one

**Good candidates:**
- Repeatable multi-step work where the pattern is easy to get wrong.
- Domain-specific scaffolding (migrations, new routes, new component types).
- Processes with bundled templates or example files.
- Workflows you want Claude to auto-trigger, not just respond to.

**Bad candidates:**
- One-off tasks. Author a slash command, or just describe it inline.
- Things that depend on human judgment more than pattern-matching.
- Anything you'd only run once per quarter — the skill rots by the time you need it.

## Restricting what a skill can touch

Use `allowed-tools` to pre-grant tool permissions for the skill:

```yaml
---
name: ship-release
description: Deploy a version to production
disable-model-invocation: true
allowed-tools: Bash(git tag *) Bash(pnpm build) Bash(pnpm deploy)
---
```

`disable-model-invocation: true` means Claude won't auto-run it — only you can, via `/ship-release`. That's the right default for anything destructive.

## Testing a skill

1. Author the `SKILL.md`.
2. Mention a matching intent in a fresh Claude Code session.
3. Watch Claude pick up the skill. If it doesn't, rewrite the description to be more specific.
4. Adjust the body until the workflow is deterministic.

## Don't over-author

The skill system scales poorly if every small task becomes a skill. Aim for fewer than a dozen skills in a project. If your `.claude/skills/` directory has 40 entries, the signal-to-noise is already wrong — merge or delete.
