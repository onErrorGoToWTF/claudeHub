---
name: audit-sweep
description: Sweeps css/style.css (and sometimes index.html / js/app.js) for systematic violations of a single concern (pill radii, easings, focus rings, reduced-motion, hardcoded colors, hardcoded radii), and produces a minimal-fix patch grouped by concern. Complements design-review (which gates per-diff) by handling retrospective systematic cleanups. Invoke with a concern slug, a file path, or nothing at all.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# audit-sweep for claudeHub / aiUniversity

Patches existing code for a single design-language concern at a time. Never commits — that's the caller's job. Reports are grouped by concern so the user can selectively `git restore` any one concern's patch without losing the others.

Pairs with `design-review`:

- `design-review` gates *future* diffs (prospective).
- `audit-sweep` patches *existing* code (retrospective).

## When to invoke

- User names a concern: `/audit-sweep pill-radii`, `/audit-sweep easings`, etc.
- User names a file: `/audit-sweep css/style.css` (scans that file for all auto-detectable concerns).
- User invokes with no args: defaults to `css/style.css` full scan.

## Inputs

- `$1` (optional) — concern slug OR file path OR nothing.

## Dispatch logic

1. **If `$1` is a known concern slug** (one of: `pill-radii`, `easings`, `focus-rings`, `reduced-motion`, `hardcoded-colors`, `hardcoded-radii`) → Read `concerns/$1.md` and run that one concern end-to-end.
2. **If `$1` is a file path** (or omitted → default `css/style.css`) → run **auto-detect mode:**
   - For each auto-detectable concern, grep the target file using the concern's detection pattern.
   - Auto-select concerns with ≥1 hit.
   - Read each matched `concerns/<slug>.md` in turn.
   - Run them all sequentially.
   - Produce one combined patch.
3. **Stage explicit paths.** Never commit. Never `git add -A`.

## Opt-in concerns (excluded from auto-detect)

Two concerns are **never** auto-selected — they must be explicitly invoked by slug:

- **`hardcoded-colors`** — fires on every `rgba()` in glass recipes, ambient gradients, text-shadow stacks. Too many intentional literals in this project's design (glass, shadows, impressed-label recipes, ambient-warm radials). Auto-running would produce a noisy patch that churns legitimate values. Require explicit `/audit-sweep hardcoded-colors`.
- **`reduced-motion`** — detecting "`animation:` not wrapped in `@media (prefers-reduced-motion: no-preference)`" requires structural CSS parsing, not regex. False positives + false negatives both high. Require explicit invocation and ask for user confirmation before writing the patch.

Auto-detect set: `pill-radii`, `easings`, `focus-rings`, `hardcoded-radii`.

## Global guardrails (apply to every concern)

- **Never modify MODEL_COL literals.** `#ff7a3d`, `#14b8a6`, `#4a90ff`, `#e879f9`, `#6366f1` in `js/app.js` are locked (see `CLAUDE.md` "Model colors (locked)"). Check context before any color-replace: if the literal sits inside the `MODEL_COL` dictionary or a comment explicitly referencing the locked palette, skip it.
- **Never touch `_parked/` files.** Parked markup is out of scope for any audit.
- **Never rewrite a block if another rule with higher specificity would re-override the change.** Spot-check adjacent selectors for the same property; if a more-specific rule would still dominate, flag the concern but don't patch.
- **Never commit.** Stage only. The caller decides which concern's patch to keep.

## Report format

After each concern runs, print a grouped report:

```
pill-radii: 3 fixes
  css/style.css:482  border-radius: 9999px → var(--radius-sm)
  css/style.css:817  border-radius: 50rem → var(--radius-sm)
  css/style.css:1203 border-radius: 999px → var(--radius-sm)
easings: 1 fix
  css/style.css:2408 transition timing: ease-in-out → var(--ease-premium)
focus-rings: clean
hardcoded-radii: clean
```

If a concern produced no hits, print `<slug>: clean`. If a concern was explicitly invoked but disabled (e.g., reduced-motion flagged structural complexity), print `<slug>: skipped (reason)`.

When reporting a combined patch (auto-detect over a file), include the per-concern section boundaries so the user can `git restore -p` any one section.

## Concern catalog (detail in `concerns/<slug>.md`)

Each concern file contains:

1. **Detection pattern(s)** — the grep(s) used to find candidates.
2. **Exemption rules** — what matches the grep but should be ignored.
3. **Canonical fix** — before/after snippet.
4. **Report grouping** — default: group by `css/style.css` TOC section banner (e.g., "FOUNDATIONS", "CHROME", "PRIMITIVES").
5. **Concern-specific guardrails** — anything beyond the global set.

Summary (detail in the files):

- **pill-radii** — `border-radius: (999px|9999px|50%|50rem)` → `var(--radius-sm)`. Exempt: `.avatar`, `.dot`, `.spinner`, `[class*="circle"]`, circular buttons with explicit `border-radius: 50%` comments.
- **easings** — timing functions other than `var(--ease-premium)` / `var(--ease-lensing)` / `var(--ease)`. Flag `ease`, `ease-in`, `ease-in-out`, `ease-out`, `linear`, raw `cubic-bezier(...)`.
- **focus-rings** — `:focus-visible` blocks diverging from the unified recipe `outline: 2px solid var(--accent-border); outline-offset: 2px;`.
- **reduced-motion** (opt-in) — `@keyframes` + matching `animation:` use not wrapped in `@media (prefers-reduced-motion: no-preference)` with a final-state fallback.
- **hardcoded-colors** (opt-in) — `#[0-9a-f]{3,8}` and `rgba?\(` outside `:root` / token defs; suggest `--color-*` / `--accent-*` replacements. MODEL_COL exempt.
- **hardcoded-radii** — `border-radius:` px values other than `--radius-sm/md/lg` (or `50%` in genuine-circle contexts).

## Step-by-step (concern run)

For a single concern invocation, after reading `concerns/<slug>.md`:

1. **Run the concern's detection grep** against the target file(s).
2. **Apply exemption filters** — remove hits matched by the concern's exempt list.
3. **Spot-check context.** For each remaining hit, Read 10 lines around it to confirm the intent matches the rule (e.g., a `border-radius: 50%` on a `.spinner` is intentional, not a violation).
4. **Compose the fix.** Use the canonical before/after snippet from the concern file.
5. **Edit the file** with each fix.
6. **Stage the file:** `git add <path>`. Never commit.
7. **Report** per the format above.

## Re-verify before merging new concerns

If a concern file needs updating or a 7th concern is added:

- Current token names still exist: `--radius-sm/md/lg`, `--ease-premium`, `--ease-lensing`, `--ease`, `--accent-border`.
- `MODEL_COL` dictionary in `js/app.js` still holds the 5 hex literals.
- `_parked/` directory still exists.
- `--accent-*` unified naming survived (no `--color-{section}-*` creep-back).
- `:focus-visible` unified recipe still `2px solid var(--accent-border)` / `2px` offset.
- Run each concern's grep once; eyeball the hit list; tune patterns if false positives appear.

## Do not

- Commit. Stage only.
- Run multiple opt-in concerns without explicit user confirmation per concern.
- Touch `_parked/`, `MODEL_COL`, or the branded `.nav-brand*` logo literals.
- Produce a monolithic patch — always group by concern so the user can selectively restore.
- Run this skill on auto-generated `data/latest.json` or `data/learn/academy_*.json` files.
