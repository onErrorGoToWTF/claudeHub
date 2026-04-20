---
name: design-amend
description: Amend the claudeHub design language and cascade the change across every affected surface in one disciplined pass. Invoke when the user states a systemic rule ("pills go greyscale", "all cards flat at rest", "remove claude-native orange", "tiles use this shadow recipe"). Pairs with the design-review skill — design-review gates individual diffs, design-amend drives systemic changes. Outputs: (1) plain-English impact list before any code runs, (2) design-language doc update first, (3) milestone-chunked cascade for phone review.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# design-amend for claudeHub / aiUniversity

Systemic design changes get a lot of leverage when they cascade cleanly. This skill exists to make that cascade a protocol, not a vibe — so every rule change lands consistently across the codebase and nothing is missed.

## When to invoke

User states a rule that should apply across multiple surfaces. Examples:

- "All info pills go greyscale."
- "Cards are flat greige at rest; activation makes them alive."
- "Remove the claude-native orange tint everywhere."
- "Buttons use this new hover recipe."
- "Every modal gets an entrance pulse."

If the change touches only one selector / one file, do not invoke — just edit.

## Steps

### 1. Echo the rule in one sentence

Before scanning anything, restate the rule back to the user in a single sentence so alignment is explicit. Example:

> Rule: every info pill (sentiment, category, status, price, claude-native) collapses to a unified greyscale token set (`--pill-bg` / `--pill-border` / `--pill-fg`), with per-variant overrides allowed only for size + weight.

If the user corrects the restatement, start over. Do not scan until the rule is locked.

### 2. Scan the codebase for affected surfaces

Use Grep + Glob to enumerate every place the rule touches:

- CSS selectors (`css/style.css`, `css/overrides.css`).
- HTML templates (`index.html`).
- JS render functions (`js/app.js`) — look for `<div class="..."` strings and template literal markup.
- Memory files and docs that reference the old rule.

Group findings by surface type. **Do not edit yet.**

### 3. Produce a plain-English impact list

Report in this shape (keep it tight — target 100 words or less, longer only if the surface count warrants it):

```
Rule: <one-sentence restatement>

Impact:
- <N> CSS selectors: <example classes>
- <N> HTML templates: <section names>
- <N> JS render fns: <fn names or sections>
- <M> docs / memory entries to refresh
- Exempt / carve-out: <modals, task panes, etc., if relevant>
```

Wait for the user to confirm the impact list before touching code. This is the checkpoint that prevents "I didn't realize it would also affect X" regressions.

### 4. Amend the design language FIRST

Before cascading, update the authoritative design-language sources so the rule becomes the standard:

1. `CLAUDE.md` — add or modify the relevant rule in the **Design language** section. State the rule in one sentence. If it supersedes or refines an existing rule, quote the old rule and strike through (use "→" markers, not HTML). Record the date.
2. `.claude/skills/design-review/SKILL.md` — update the hard-rules list if the new rule changes what a design review should flag.
3. `docs/plans/v0.7-design-system-refactor.md` — add the amendment as a plan-doc entry under the current milestone cluster.

Commit this amendment as its own chunk via `milestone-deploy` (commit type: `chore` or `style`), so the rule is in place before any surface changes reference it.

### 5. Chunk the cascade

Split the cascade into milestone-size commits — one per logical surface group. Example grouping for "info pills go greyscale":

- Chunk 1: Introduce `--pill-*` tokens in `:root`; migrate `.card-pill` variants.
- Chunk 2: Migrate `.learn-item-kind` / `.learn-item-state` to unified tokens.
- Chunk 3: Remove `.tool-card-claude` orange tint; migrate `.tool-modal` claude-native cues.
- Chunk 4: Sweep for stragglers (grep for rgba / color literals in pill context).

Each chunk ships via `milestone-deploy`, user reviews on phone, signals continue. Do **not** bundle all cascade steps into one commit — that breaks the "phone-reviewable milestones" convention and makes regressions harder to isolate.

### 6. Report what changed and what's left

After each cascade chunk, report in this shape:

```
Amendment: <rule>
Shipped so far: <list of milestones>
Remaining surfaces: <list>
Exempt / carve-out (no change): <list>
```

When the cascade completes, state the amendment as closed and note any follow-up audits needed (e.g., "rescan after M9.Nx for new pill variants added by in-flight work").

## Carve-outs and overrides

Some surfaces are legitimately exempt:

- **Modals** and **task panes** (Finder wizard, lesson body, project notes, long-text inputs) are always-alive — the scroll-gate rule does not apply to them. If an amendment concerns activation state, state the carve-out explicitly in step 3.
- **Nav chrome** (floating nav pill) is fixed to viewport and not scroll-gated.
- **Per-component explicit overrides** are allowed but should live in `css/overrides.css` (or a comparable single-source file), never scattered inline, so deviations are auditable.

## Guardrails

- **Lock the rule first.** Never scan or edit before step 1's restatement is confirmed.
- **Impact list before code.** Every amendment produces the plain-English list in step 3 before any file is touched.
- **Design-language doc leads the cascade.** `CLAUDE.md` is updated before the first surface chunk ships.
- **One surface group per chunk.** No mass-commit cascades.
- **Token cascade over per-component edits.** If the rule can be absorbed by introducing / retiring a token rather than rewriting every selector, take that path — future changes will be a one-token edit.
- **No invented rules.** Only amend what the user stated. If the scan reveals adjacent concerns (e.g., "while I'm here, should I also unify X?"), surface them as a question, not a ride-along.

## Do not

- Skip the `CLAUDE.md` amendment to "save a round-trip."
- Collapse multiple rule changes into one amendment — each rule gets its own invocation.
- Commit while the working tree has unrelated modifications (use `milestone-deploy`'s clean-tree check).
- Amend rules the user hasn't stated explicitly — this skill is a disciplined executor, not a design reviewer. Design observations go through `design-review`.
