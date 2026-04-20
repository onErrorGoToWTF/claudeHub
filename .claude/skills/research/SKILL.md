---
name: research
description: Manage research-grade external reference caches under .claude/skills/_resources/ (Apple HIG, Liquid Glass, and future vendor docs). Invoke when the user wants to add a new reference source, refresh / rehydrate an existing cache, resolve a source conflict, update the INDEX dispatcher, or expand resource coverage. Encodes the source-quality hierarchy (Apple/vendor > reputable GitHub > secondary), the rehydration pattern that bypasses WebFetch's training-cutoff hallucination, topic-split indexing, conflict-resolution policy, and file-splitting rules. Invocation phrases include "research X", "update resource Y", "rehydrate cache Z", "add a reference source for W", "these docs conflict", "check if this cache is stale".
allowed-tools: Read, Grep, Glob, Edit, Write, WebFetch, WebSearch, Bash
---

# research — resource cache management

Encodes how claudeHub's external reference caches are researched, organized, cached, indexed, and kept in sync. The actual cached *content* lives in `.claude/skills/_resources/` (see that directory's `INDEX.md`). This skill is the **process** for managing that content.

## When to invoke

Natural-language triggers the user might say:

- "Research X" — open a new topic area that needs a cache.
- "Update the HIG / Liquid Glass / [vendor] cache" — refresh staleness.
- "Rehydrate [cache file]" — specifically refresh one file.
- "These docs conflict — here's the Apple source" — user is pasting authoritative text to resolve a disagreement.
- "Add a reference source for [tech]" — new vendor or new community source to integrate.
- "Is [cache] still accurate?" — staleness check.
- "What's our position on [topic]?" — pull from cache + report.

Do NOT invoke for:
- One-off code questions answered from the live codebase (no cache needed).
- General design-review or design-amend tasks that already consume the caches passively.

## Core architecture

### Layout

```
.claude/skills/_resources/
├── INDEX.md                          # Master lookup: question → file
├── README.md                         # Directory conventions
│
├── <topic>/                          # e.g. liquid-glass/, hig/
│   ├── README.md                     # Topic-level TL;DR + file index
│   ├── <subtopic>.md                 # Focused topic files
│   ├── ...
│   └── resources.md                  # External links + citations for this topic
```

Rules:
- Every top-level `_resources/` child dir is a **topic** (liquid-glass, hig, future: claude-api, figma, web-platform, etc.).
- Each topic has its own `README.md` with a TL;DR + file index.
- Each subtopic file is **standalone** — readable without needing siblings.
- Each subtopic file has its own **TOC at the top**.
- External-link files are called `resources.md`.

### File-size discipline

- Target 80–500 lines per file. If a file grows past ~600 lines, split by subtopic.
- Hot reference files (frequently consumed by skills): `staleness_days: 7`.
- Link / citation files (slower-moving): `staleness_days: 30`.
- External-link-only files: `staleness_days: 30` or higher.

### Frontmatter template

Every content file starts with:

```yaml
---
topic: <short descriptor>
last_fetched: YYYY-MM-DD
staleness_days: 7 | 30
sources:
  - <URL or reference>
---
```

## Source-quality hierarchy

When multiple sources describe the same thing, rank them:

1. **Vendor primary source** (Apple developer docs, Apple newsroom, vendor's own GitHub repo). **Always wins** if present.
2. **Reputable GitHub community sources.** Examples: high-star reference repos from known authors (conorluddy, sindresorhus, ehmo), projects with recent commits + active issues.
3. **Secondary blogs / aggregators / Medium posts.** Directional only — spot-verify before relying.
4. **Anecdotal single-source claims** (e.g., one blog's performance measurement). Tag as `[community, anecdotal]` — never rely on for blocking rules.

### Source-quality tags (use in every content file)

Attach a tag to each factual claim:

- `[verbatim, Apple docs]` — direct quote from developer.apple.com (user-pasted).
- `[verbatim, <vendor>]` — direct from a vendor's server-rendered page.
- `[community — <repo-or-author>]` — from a reputable GitHub source. Name the specific repo.
- `[secondary]` — from a developer blog or aggregator. Treat as guidance.
- `[community, anecdotal]` — single-source claim. Directional only.

## Rehydration patterns

### Pattern A: User paste (most authoritative)

When the user pastes vendor content into a session:

1. Treat the pasted text as `[verbatim, <vendor>]`.
2. Update or replace the existing file's content.
3. Update `last_fetched: <today>` in frontmatter.
4. Retag conflicting community/secondary content that the paste supersedes.
5. Log the paste + what it replaced in the file's Bootstrap log.

Apple's `developer.apple.com/design/human-interface-guidelines/*` and `developer.apple.com/documentation/*` pages are JavaScript-rendered SPAs. Direct WebFetch returns only page titles. **User paste is the canonical rehydration method for SPA content.**

### Pattern B: GitHub raw content (most reliable for community sources)

```bash
gh api repos/<owner>/<repo>/contents/<path/to/file.md> --jq '.content' | base64 -d > /tmp/<slug>.md
```

This bypasses WebFetch entirely. Why you care:

**WebFetch's summarizer model has a pre-WWDC25 training cutoff.** Asking it to "evaluate" a Liquid Glass reference triggers a hallucinated "this is fictional — iOS 26 doesn't exist" critique. iOS 26 / Liquid Glass / `.glassEffect` / `.buttonStyle(.glass)` are **real and shipped**. When the user primary-source paste has already confirmed this, trust the user over WebFetch's outdated summarizer.

### Pattern C: WebFetch for server-rendered pages

WebFetch works fine on:
- Apple newsroom (server-rendered press releases)
- Wikipedia
- Most developer blogs (Medium, dev.to, personal blogs)
- Server-rendered documentation that isn't JS-gated

Use WebFetch with a targeted prompt (return full body text, don't ask for "evaluation").

### Pattern D: WebSearch for discovery

Use WebSearch to find sources — not as a content source itself. Search results are snippets; treat them as discovery only, then fetch the full source via A, B, or C.

## Conflict-resolution policy

When two sources disagree on a specific fact:

1. **Surface the conflict** to the user. Show both sources + the specific disagreement.
2. **Apply hierarchy:** if one source outranks the other (Apple > community GitHub > secondary), default to the higher-ranked.
3. **Ask for user paste** if the higher-ranked source is SPA-blocked. User has committed to going to original vendor and pasting authoritative text.
4. **Accept the paste** as `[verbatim, <vendor>]` and re-tag the conflicting content.
5. **Log the conflict** in the file's Bootstrap / Drift section with date + resolution.

### Example conflict workflow

User: "the Medium article says blur radius is 40px but my Apple HIG paste doesn't mention a specific number."
You:
1. Surface: "Apple's pasted HIG doesn't publish a numeric blur. Medium article's 40px is `[secondary]`."
2. Ask: "Do you want to paste the Materials HIG page for an authoritative number, or keep it as a secondary estimate?"
3. If user pastes: retag from `[secondary]` → `[verbatim, Apple docs]`.
4. Log in Bootstrap section.

## Adding a new topic area

Workflow for a fresh topic (e.g., "claude-api" or "figma-plugins" or "tailwind-css"):

1. **Create directory:** `mkdir .claude/skills/_resources/<topic>/`
2. **Scope the topic:** identify 4–8 subtopics (roughly 100–400 lines each).
3. **Discover sources:**
   - WebSearch "<topic> documentation reference github"
   - WebSearch "awesome <topic>" for curation lists
   - WebSearch "<topic> community site:github.com" for reputable repos
4. **Rank sources** per the hierarchy above.
5. **Fetch + synthesize:**
   - User paste for vendor SPA content.
   - `gh api` for GitHub community content.
   - WebFetch for server-rendered.
6. **Create `<topic>/README.md`** with TL;DR + file index.
7. **Write subtopic files** with frontmatter + TOC + source-tagged content.
8. **Create `<topic>/resources.md`** with external links + citations.
9. **Update `_resources/INDEX.md`** with quick-retrieval lookup entries for the new topic.
10. **Update `_resources/README.md`** with the new topic in the structure diagram.
11. **Update `design-review` and `design-amend` SKILL.md pointers** if the new topic is design-relevant.

## Refreshing an existing cache

1. Check `last_fetched` in frontmatter vs. today.
2. If gap > `staleness_days`, proceed.
3. For each source in the frontmatter:
   - Vendor SPA → check if user wants to paste; if not, skip + note in Drift log.
   - GitHub community → `gh api` to re-fetch.
   - Server-rendered → WebFetch.
4. Diff new content against current cache. Only rewrite sections that changed.
5. Update `last_fetched: <today>`.
6. Log updates in Bootstrap / Drift section of the file.

## File-splitting rules

Trigger a split when a file exceeds ~500 lines OR carries > 2 distinct subtopics.

Split procedure:
1. Identify natural subtopic boundaries (already-numbered sections usually work).
2. Create new files, one per subtopic, each with its own frontmatter + TOC.
3. Keep the parent `README.md` as an index pointing to the splits.
4. Update `_resources/INDEX.md` to reflect new file paths.
5. Update any external skill pointers (design-review, design-amend) if they referenced specific sections of the pre-split file.

## Do-not rules

- **Never guess vendor content.** If a cache is stale and SPA-blocked, surface the staleness — don't fabricate to fill gaps.
- **Never trust WebFetch's "evaluation" of modern content.** Its summarizer has a training cutoff — it will confidently declare real things fictional. Use `gh api` + Read for content verification instead.
- **Never push or commit** from this skill. Cache updates are staged; the user ships resources on their schedule.
- **Never flatten topic subdirs into a single file.** Keeping them split is the retrieval-efficiency contract.
- **Never skip the source-quality tag** on a new factual claim. Untagged content becomes un-auditable.

## Where caches currently live (as of 2026-04-20)

- `.claude/skills/_resources/liquid-glass/` — Apple Liquid Glass (2025 material language). 8 files. Primary external reference: conorluddy/LiquidGlassReference.
- `.claude/skills/_resources/hig/` — older HIG foundations. 11 files. Primary external references: ehmo/platform-design-skills, sindresorhus/human-interface-guidelines-extras.
- `.claude/skills/_resources/learning-ux/` — progress tracking + dashboard UX from Linear / Khan / Duolingo / Quizlet. 8 files. Primary: Linear docs `[verbatim]`; Khan blog `[verbatim]`; Duolingo + Quizlet mostly `[secondary]`.

Future candidate topics (if the user invokes):
- `claude-api/` — Anthropic SDK + API reference (already have a `claude-api` built-in skill from plugins, but a topic cache could complement it).
- `web-platform/` — MDN-cited CSS / HTML / ARIA reference for claudeHub.
- `github-actions/` — for the scraper orchestrator workflow.
- `youtube-api/` — deferred in `project_youtube_api.md`; would gain a cache when that feature picks back up.

## Cross-references

- The caches themselves: `.claude/skills/_resources/INDEX.md`
- Design-review pointer → `.claude/skills/design-review/SKILL.md` → Resources section
- Design-amend pointer → `.claude/skills/design-amend/SKILL.md` → Resources section
- Global CLAUDE.md rule: "Every factual claim must be grounded in an authoritative source — docs, source code, web fetch, or advisor." This skill's source-quality hierarchy is the operational version of that rule.
