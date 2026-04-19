# CLAUDE.md conventions that actually move the needle

`CLAUDE.md` is the instruction manual Claude reads at the start of every session in your repo. A good one saves you hundreds of re-explanations; a bad one is dead weight. This lesson covers the five sections that do 90% of the work.

## The five sections

Keep it short. If it doesn't change behavior, delete it.

### 1. Stack

Tell Claude the shape of the codebase in one breath.

```markdown
## Stack
- Language: TypeScript (strict mode)
- Framework: Next.js 15 (App Router)
- DB: Postgres via Drizzle
- Tests: Vitest
- Package manager: pnpm
```

Claude stops guessing. You stop correcting.

### 2. Layout

A tree of the directories Claude should know about, with a one-liner per directory.

```markdown
## Layout
src/
  app/           # Next.js routes
  components/    # React primitives; styled with CSS modules
  lib/           # Pure utilities; no React imports
  db/            # Drizzle schema + migrations
tests/           # Vitest
```

Name the dirs it shouldn't touch too: `generated/`, `vendor/`, `dist/`.

### 3. Conventions

Project rules the code won't self-teach. Naming. Test locations. Commit-message format. Code-style gotchas.

```markdown
## Conventions
- Components: PascalCase filename matching the export.
- Test files: colocated as `Foo.test.ts` (not `__tests__/`).
- Commits: `feat(scope): …`, `fix(scope): …`, `chore(scope): …`.
- Never `any`. Use `unknown` + narrowing.
```

### 4. Running locally

The commands — not explanations of the commands.

```markdown
## Running locally
pnpm install
pnpm db:up         # Docker postgres
pnpm db:migrate
pnpm dev           # http://localhost:3000
pnpm test          # before pushing
```

### 5. Gotchas

The things you wish someone had told you on day one.

```markdown
## Gotchas
- `.env.local` is gitignored. Copy from `.env.example`.
- Supabase RLS breaks if the `anon` role isn't granted select.
- Don't edit files under `src/generated/` — they regen on build.
```

## Anti-patterns

- **No essays.** Claude doesn't need the history of your architecture. It needs the rules.
- **No aspirations.** "We're migrating to X" is noise until the migration is real.
- **No duplication.** If your README already documents setup, don't mirror it — link to it or move it.
- **Don't version every change.** The file is living; let git be the history.

## A working CLAUDE.md is ~50–150 lines

Shorter than your README. Less than a screen on a desktop. If it's longer, split into sub-files under `.claude/` and reference them.

## Iterate with the first edit

Ship a thin CLAUDE.md. Notice every time Claude misfires in a way the file could have prevented. Add one line. Over a week you'll converge on the file your project actually needs — not the one you imagined it would.
