# aiStacked — the claudeHub rebuild plan

> **Resume-here for a fresh Claude Code session:**
>
> 1. You are on branch `feat/aistacked-rebuild`. `main` holds the old live site untouched.
> 2. Rollback anchor: tag `pre-learning-path` at commit `ce457f9` (local + origin). `git reset --hard pre-learning-path` restores pre-rebuild state.
> 3. Read this full plan before editing any code. Follow the **Setup protocol** and **Shipping cadence** sections strictly.
> 4. Start with **Milestone M1.1** (brand flip: title + header → "aiStacked"; meta desc). Each milestone ends with commit → push → phone review → `data/version.json` bump before the next begins.
> 5. The 31-tool seed catalog lives at `C:\Users\alany\.claude\plans\can-we-organize-more-fluffy-koala-agent-a4566e4473d5aa0c2.md` — copy into `data/learn/tools.json` when you reach M1.5.
> 6. User preferences to honor (also in memory system): terse replies, one question at a time, no guessing UI / keybindings / flags, 95% confidence before code, phone-first responsive design.
>
> **Do not** merge this branch to main without user approval per milestone. **Do not** start the next milestone without user phone-review of the previous.

---

# claudeHub — reorg around project-based learning + snippet lookup

## Context

claudeHub today is a news/dashboard site. The user wants to repivot to **learning-first** around a specific mental model — not Khan-Academy linear curriculum. Five signals shape the design (the first is the headline feature):

1. **The Finder** *(hero feature)* — a guided pathway picker. The user selects the **elements** of the project they want to build (e.g. "AI-generated video", "voice narration", "automation", "no-code deploy"). The Finder then outputs: a **recommended tool stack**, a **learning path** ordered by prerequisite, and **setup instructions** for each tool. One click saves the whole thing as a My Project.
2. **Tools-first** — underneath the Finder sits a per-tool catalog (Claude Code, Cursor, Lovable, n8n, Veo, Flux, ElevenLabs, …). Each tool page is how the user *stays current*.
3. **Use cases** — pre-saved Finder answers for common project types ("Ship a 3D-video site", "Build an agent"). One click loads the Finder populated.
4. **Projects** — the user's in-flight builds. A project is a saved Finder output + pinned tutorials + saved snippets + notes.
5. **Snippet / reference lookup** — searchable code snippets, JSON configs (MCP configs, Cursor rules, n8n workflow JSON), prompt templates. Each tool's setup instructions pull from here.

Authored long-form tutorials with end-of-lesson MCQ quizzes remain, but they are content that hangs off Tools and the Finder — not the backbone. News / status / 365 stay, demoted from headline to background service. Staying-current flows into each Tool page's own "what's new" feed.

Rollback anchor already in place: tag `pre-learning-path` at commit `ce457f9` (local + origin).

## Final IA (4 tabs)

```
Home               PERSONAL DASHBOARD (not charts)
                   · "Continue where you left off" — in-progress projects
                     with per-tool progress bars + next-lesson links
                   · Finder quick-launch card — "Start a new project" →
                     opens the Finder wizard
                   · Recent pins + recent snippets saved
                   · "Jump to Claude" shortcut into Learn → Claude
                   (all charts MOVE to News/Media — see below)

Learn  (NEW — the new center of the site; absorbs old Apply AI)
├── Claude  ★DEEP HUB     Claude-specific: Basics / Claude Code / Skills
│                         · CLAUDE.md / MCP / Agent SDK / What's new
│                         (first sub-pill; reflects Claude-first focus)
├── Finder  ★HERO         guided pathway picker → recommended tool stack
│                         + ordered learning path + per-tool setup.
│                         "Save as project" → writes to My Projects.
├── Tools                 per-tool pages, grouped by modality. Each
│                         tool page bundles tagline · when-to-use ·
│                         current version · pricing · official links ·
│                         setup steps · authored lessons · snippets ·
│                         recent news/videos (stay-current feed).
│                         Searchable + filterable by modality.
└── My Projects           personal workspaces (localStorage).
                          Saved Finder outputs (= Use cases once saved),
                          pinned tutorials, saved snippets, notes,
                          per-tool progress. JSON export/import.
```

**Consolidation rationale** — previous draft had 7 sub-pills (added Use cases / Snippets / Tutorials as peers). Collapsed to 4:

- **Use cases** no longer a separate pill — they are just saved Finder states and live in My Projects. A "Browse example projects" link inside the Finder lets the user load a pre-filled example (e.g. "Young Carpets site") without leaving the Finder.
- **Snippets** library lives inside each tool page's snippet section; a global search is exposed via the topbar (cmd-K) rather than a pill. All snippets still stored in one `data/learn/snippets.json`.
- **Tutorials** live inside each tool page alongside that tool's snippets — matches the Vercel/Stackshare pattern from the UX research (bundled snippet+lesson per tool).

News / Media       (merged — "what should I learn next" signal layer)
├── State of AI           the 5 chart cards migrated from old Home:
│                         Frontier context windows · Context timeline
│                         · Intelligence Index · Opus 4.7 scorecard ·
│                         Top-4 LLM face-off. Framed here as
│                         "which models are advancing in which areas"
│                         signals, not dashboard vanity metrics.
├── Status strip          status.anthropic.com severity pills
├── Videos                YouTube how-tos + news videos
└── Articles              news articles (videos render above articles)

Comply365          (renamed from "365" — purple accent)
├── News / Media          scraped news + videos specific to aviation
│                         compliance AI, Comply365, and competitors
│                         (Web Manuals · Flydocs · Ideagen). Videos
│                         above articles. New: YouTube channel
│                         scraping for aviation-compliance content.
└── Learning Paths        user-pinned tutorials + future authored
                          end-user lessons (non-developer tone:
                          Claude.ai web UI, Projects, Artifacts —
                          not Claude Code CLI). Empty in Phase 1;
                          user pins content from elsewhere on the site
                          to curate a Comply365 path.
```

## Progress & multi-collection pinning (cross-cutting)

A pin model that spans all tutorials/lessons/snippets across the site, not just "My Projects":

```js
// localStorage
clhub.v1.collections = {
  "my-projects": { type: "project-group", title: "My Projects" },
  "comply365":   { type: "audience", title: "Comply365 training",
                    tone: "end-user", audience: "aviation-compliance" },
  // user may create more collections later
}
clhub.v1.pins = {
  [itemId]: {
    collections: ["my-projects:prj_3dvideo","comply365"],  // multi-pin
    state: "not_started" | "in_progress" | "completed",
    startedAt: ISO, completedAt: ISO
  }
}
```

**UX:**
- Every tutorial / lesson / video card across the site has a **pin button** → picker listing available collections (My Projects children + Comply365 + custom). Multi-select allowed.
- Every such card also has a **state selector** (`Not started · In progress · Completed`) rendered as a subtle three-dot control. State shows as a small chip on the card.
- Home dashboard shows "Continue where you left off" = all `in_progress` items across collections.
- Comply365 → Learning Paths pane renders every item pinned with `collections` including `"comply365"`, grouped by state.
- My Projects pane filters to items where `collections` starts with `"my-projects:"`.

**Audience tone for Comply365 (when authored lessons arrive):**
- End-user focus: Claude.ai web app, Projects feature, Artifacts, file uploads, Claude for compliance docs workflow.
- Skip: Claude Code CLI, MCP server authoring, Agent SDK, anything requiring a terminal.

Drops standalone **Resources** tab. The old Resources content (videos + official docs) is folded INSIDE each relevant Tool page — so e.g. the "Claude Code" tool page shows its own videos + official docs + recent news. No separate Library pane is needed once Tools becomes the primary axis.

## Data model

### localStorage keys (single-user, per-device)

```
clhub.v1.projects          { [projectId]: Project }
clhub.v1.progress          { [lessonId]: { state, ts } }      // in_progress | complete
clhub.v1.pinned            { [itemUrl]: { projectId, ts } }   // optional project scoping
clhub.v1.snippetFavs       { [snippetId]: { ts } }
clhub.v1.settings          { showCompleted, theme, ... }
```

### Project shape

```js
{
  id: "prj_3dvideo",
  title: "3D video website",
  goal: "Ship a site that uses generated 3D + AI video",
  createdAt: ISO,
  stack: ["lovable","veo-3.1","flux2"],      // tag ids
  pinnedItems: [url, url, ...],               // pulls from Library
  savedSnippets: [snippetId, ...],
  tutorialProgress: [lessonId, ...],
  notes: "markdown string"                    // small freeform pad
}
```

### New repo content

```
data/learn/
  tools.json                // tool catalog (the spine)
  usecases.json             // curated tool-stacks per goal
  snippets.json             // snippet library (see shape below)
  lessons/<slug>.md         // authored markdown — frontmatter for quiz
```

### Tool shape (the spine)

```js
{
  id: "claude-code",
  name: "Claude Code",
  vendor: "Anthropic",
  modality: "coding",            // llm | coding | agent | image | video | voice | music | automation | training | deploy | data
  tagline: "Terminal-first AI coding agent.",
  whenToUse: "Deep edits across a real codebase; long-session refactors.",
  currentVersion: "Opus 4.7, Apr 2026",
  pricing: "Included in Pro $20/mo, Max 5x $100/mo, Max 20x $200/mo; or API metered",
  priceTier: "free" | "lte20" | "lte50" | "premium",  // drives Finder price badge
  claudeNative: true,                                 // Claude ecosystem flag → Finder default sort
  premiumWhy: "short one-liner — only when priceTier === 'premium'",
  setupComplexity: 2,                                 // 1-5 (1 = sign up and go, 5 = self-host + config)
  priorityScore: 5,                                   // 1-5 (essential-ness for a 2026 AI builder)
  provides: ["code-generation","agentic-tool-use","terminal-agent","mcp-client","long-context"],
  requires: ["node","paid-plan"],
  officialUrl: "https://claude.com/claude-code",
  docsUrl: "https://docs.claude.com/en/docs/claude-code",
  // content that lives on the tool page:
  topics: ["skills","mcp","agents","coding","terminal","hooks"],  // cross-cutting topic tags for Mode C filter
  newsKeywords: ["claude code","claude-code"],                    // filter from sections.news
  snippetTags: ["claude-code"],                                   // filter from snippets.json
  lessonSlugs: ["claude-code-intro"],                             // authored lessons
  usecaseIds: ["ship-nocode","build-agent"]                       // use cases that rely on this tool
}
```

Full seed catalog of **31 tools** with this exact shape was produced by the research agent — saved at `C:\Users\alany\.claude\plans\can-we-organize-more-fluffy-koala-agent-a4566e4473d5aa0c2.md`. That catalog + its capability-tag and prereq-tag vocabularies become the Phase-1 content for `data/learn/tools.json`.

### Use-case shape

```js
{
  id: "site-3d-video",
  title: "Ship a site with 3D / AI video",
  goal: "A marketing site or app whose hero asset is AI-generated video.",
  tools: ["lovable","veo-3-1","flux-2","elevenlabs","claude-code"],
  steps: [                         // rough ordered pipeline
    "Prototype layout in Lovable",
    "Generate hero video with Veo 3.1",
    "Voiceover via ElevenLabs",
    "Graduate to Claude Code for prod polish"
  ],
  snippetIds: ["prompt-veo-hero","lovable-starter-prompt"],
  lessonSlugs: ["lovable-to-cursor","veo-prompting-101"]
}
```

### Snippet shape

```js
{
  id: "snip_mcp_config_basic",
  title: "MCP server config (basic)",
  kind: "json" | "prompt" | "code" | "config",
  language: "json" | "python" | "bash" | ...,
  tags: ["mcp","claude-code","setup"],
  body: "...multi-line string...",
  source: "https://...",      // optional attribution
  notes: "..."                 // optional one-liner
}
```

### Lesson markdown frontmatter (extends existing `data/365/tutorials/` pattern)

```md
---
title: Build your first MCP server
track: build-agent
order: 2
minutes: 12
quiz:
  - q: "What does MCP stand for?"
    choices: ["Model Context Protocol","Multi-Claude Protocol","Managed Cloud Provider"]
    answer: 0
    why: "MCP = Model Context Protocol (Anthropic 2024)."
---

lesson body...
```

## Seed Use cases (author in Phase 2) — driven by user's real backlog

**These three ship first because they are the user's actual in-flight projects:**

1. **Young Carpets Inc marketing site** *(flagship)*
   Hero shot: camera outside office building → zooms through a window → floor explodes into its material layers (carpet, pad, subfloor). Clean modern design, smooth nav transforms, glows/highlights.
   - Capabilities: `hero-3d-video`, `text-to-image` (other assets), `text-to-speech` (optional VO), `no-code-frontend` or `code-generation`, `static-hosting`, `premium-motion-ui`.
   - Candidate stack: Blender + Meshy/Luma (3D modeling) + Runway Gen-4.5 motion brush (camera polish) + Midjourney/Flux (stills) + Cursor or Claude Code (site build) + Vercel/Cloudflare Pages (deploy). **Pure AI video probably can't deliver the explode-view shot reliably in 2026 — hybrid 3D workflow needed.** (See capability-gap note below.)
   - Pinned lessons: motion-ui patterns, Blender-AI hybrid, camera-path prompting.
   - **User's current tool preference:** wants to use Nano Banana. Nano Banana itself is image-only (Gemini 3 Pro Image / Gemini 3.1 Flash Image) — it does **not** emit video. The actual public workflow the user saw on YouTube is **Google Flow** (Feb 2026 update): Nano Banana generates keyframe stills (exterior · mid-push · exploded-view) and Flow hands them to Veo 3.1 with first/last-frame conditioning to interpolate the motion. Audio can be stripped. Still won't be structurally accurate for a commercial shot — Veo fudges the part-separation — but it's the closest pure-AI path. Add **Google Flow** as a tool in the catalog alongside Nano Banana + Veo 3.1; tag it `provides: ["keyframe-video-animation","image-to-video","multi-keyframe-chain"]`. Sources: blog.google Flow updates Feb 2026; Vertex AI Veo 3.1 first/last frame docs.

2. **Young Carpets employee portal — quote & invoice app**
   Internal web app with auth, customer/product data, quote generation, invoice PDF export.
   - Capabilities: `no-code-frontend` or `code-generation`, `auth-included`, `postgres-db`, `pdf-generation`, `static-hosting`/`serverless`.
   - Candidate stack: Lovable or Bolt (first cut) → Claude Code (prod polish) + Supabase (auth + db) + Vercel (deploy).

3. **Commission calculator — parses ACCPAC Plus for DOS print-to-file output**
   *Local* program (not a website). Parses fixed-width DOS report files, computes per-rep commissions, exports report.
   - Capabilities: `code-generation`, `local-script`, `file-parsing`, `desktop-ui` (optional).
   - Candidate stack: Claude Code + Python script (or Node). Optional Tauri/Electron front-end if a GUI is wanted.
   - **Capability gap:** the Finder taxonomy currently assumes web projects; needs a `local-script` / `desktop-ui` / `cli-tool` capability group so the Finder can recommend non-web paths too.

**Additional seed use cases** (generic, author after the three above):

4. **Build an AI agent** — Claude Agent SDK + MCP + Skills
5. **Automate a workflow** — n8n self-hosted, Make, Zapier
6. **Create AI-native content pipeline** — image + video + voice

Each use case ships with 3-5 ordered steps + links to its tools. Lessons hang off use cases and tools, authored incrementally in Phase 5.

## Capability-taxonomy gaps to fix before Phase 1 ships

The research-produced 10-group taxonomy assumes web projects. To support the user's real backlog we also need:

- **Local / Desktop** group — `local-script`, `cli-tool`, `desktop-ui` (Electron/Tauri), `file-parsing`, `legacy-format-ingest` (for ACCPAC DOS output).
- **3D / Motion** group inside Video — `3d-scene-composition` (Blender / Cinema4D), `ai-3d-model-gen` (Meshy / Luma / Sloyd / CSM), `camera-path-control`, `particle-effect`, `explode-view-animation`.
- Add tools: **Blender** (free, open-source, essential for hybrid 3D), **Meshy** or **Luma Genie** (AI 3D from text/image), **DaVinci Resolve** (free color + edit), **Framer Motion** (web-transform library) as candidate additions to the Phase-1 tool catalog.

## Reusing what already exists

- **`.glass`, `.card`, `.subpill`, `.chip`** CSS primitives — reuse for Learn UI
- **`tpl-tutorial`** template + `renderMarkdown()` + `renderTutorials()` in `js/app.js` — extend for lessons + quizzes
- **`tpl-card`, `tpl-video`** — reuse inside tool pages (tool page includes a mini-feed of its scraped videos + official docs)
- **`registerReveal()`** stagger animation — reuse on all new card grids
- **Sub-pill cross-fade pattern** from 365/Resources — reuse for Learn sub-tabs
- **Scraped YouTube/official items** — already have `tutorial_kind`; tool pages filter `sections.tutorials` + `sections.news` by each tool's `newsKeywords` — no new scrapers needed

## New code (minimum)

- `js/learn.js` OR append to `js/app.js`:
  - localStorage wrapper (get/set with namespaced keys, JSON safe)
  - project CRUD (create, rename, delete, pin item, save snippet)
  - quiz renderer (reads frontmatter, renders MCQs, local-scored, reveals explanations)
  - snippet search (client-side fuzzy over title + tags)
- `css/style.css` additions — project cards, snippet rows with monospace + copy button, pin/complete buttons on cards, quiz block styles

No new scrapers. No backend. Static site preserved.

## Phased rollout (Finder + Claude hub as MVP)

**Phase 1 (MVP — the thing that makes the pivot feel real on day one)**
Fresh rewrite on a feature branch. 4 top-level tabs: Home · Learn · News/Media · Comply365. Inside Learn: 4 sub-pills (Claude · Finder · Tools · My Projects) all scaffolded.

Functional in Phase 1:
- **Claude hub** — static first pass: Basics, Claude Code, Skills, CLAUDE.md, MCP, Agent SDK sections. Stay-current feed uses existing scraped YouTube + news filtered by `claude` keywords (new scraper comes in Phase 1.5).
- **Finder (hero)** — hybrid wizard → editable checkbox grid → dual-path output (Easiest / Best) with ordered learning path, per-tool setup steps, reasoning sidecar, Claude-only toggle, Claude-first ranking, budget badge. Populated from `data/learn/tools.json` (31-tool seed from the research agent).
- **Tools** — browsable grid filtered by modality. Tool pages render tagline/pricing/links + filtered videos from `sections.tutorials` + news from `sections.news`.
- **My Projects** — Save-from-Finder writes localStorage entry. Project cards on the sub-pill show saved finder output + chosen path. No notes pad or pin buttons yet.
- **News/Media tab** — merge of old Status + Videos + Articles. Reuses existing render logic.
- **Comply365 tab** — rename from "365" only. Scope unchanged.

**Phase 1.5 — Claude learning scraper**
`scripts/fetch_claude_learning.js`: Anthropic docs changelog, Claude Code releases, Anthropic Academy diff, MCP spec bumps, curated YouTube channels. Output under `sections.claude_learning`. Claude hub's "Recently updated" section lights up.

**Phase 2 — Snippets library** (populates per-tool snippet sections)
- Author `data/learn/snippets.json` with 20-30 starter snippets. **Priority order (from user):**
  1. Claude Code CLAUDE.md patterns (conventions, hooks, slash commands)
  2. Claude Skills YAML frontmatter + examples
  3. MCP server configs (`claude_desktop_config.json`, server scaffolds)
  4. Prompt templates — image/video (Nano Banana, Veo 3.1, Midjourney)
  5. Prompt templates — agent / LLM (system prompts, personas)
  6. n8n workflow JSON exports
  7. Lovable / Bolt starter prompts
  8. Python / JS snippets (SDK examples; include ACCPAC fixed-width file parser for Project 3)
  - **Deprioritized:** Cursor `.cursorrules` — user doesn't expect to use Cursor much.
- Global cmd-K search. Copy-to-clipboard. Snippet rows appear inside each tool page filtered by `snippetTags`.

**Phase 3 — My Projects depth**
- Notes pad per project (markdown).
- Pin button on tool pages and snippet rows — prompts which project to pin into.
- JSON export/import for device backup.

**Phase 4 — Authored tutorials + MCQ quizzes**
- Author first 2-3 lessons per high-priority tool (Claude Code, MCP/Skills, Blender-AI hybrid for Young Carpets).
- Quiz frontmatter parser + MCQ renderer with reveal-on-answer + explanations.
- Progress bar per tool and per use case.

**Phase 5 — Finder tuning from real use**
- Refine `priorityScore` / `setupComplexity` / tag vocabulary based on whether the Easiest and Best paths produce sensible output for the 3 seed use cases.
- Author concrete setup snippets per tool so the Finder output is actually copy-paste-runnable.
- Add "browse example projects" into the Finder (pre-filled wizards for common flavors).

**Phase 6 — User-authored workflows with on-demand research**
*Triggered by the user's request: "when I find a workflow I like, I should be able to select that in the grid and scrape the internet for the best way to do things."*

- "Add workflow" button in the Finder surface. Inputs: title + short description + optional URL (YouTube / blog).
- Writes to localStorage under `clhub.v1.userWorkflows` — visible only to that device, never committed.
- Each user-workflow card has a **"Research this"** button that runs a Claude-API web-search call. Returns: guessed tool stack (mapped to existing catalog entries where possible), setup notes, links, "last checked" timestamp.
- **API key handling**: user enters their Claude API key once (stored in localStorage, never transmitted anywhere except `api.anthropic.com`). A banner explains this is their own Max plan / API budget.
- **Fallback if no API key**: a "Copy research prompt" button produces a ready-to-paste prompt the user can run in their own Claude.ai session, then paste the result back into the workflow card manually.
- Researched workflows can be promoted by the owner into `data/learn/usecases.json` via an author-only export flow (Phase 6.5) — this is how user discoveries can become public seed content over time.

Each phase ships independently behind feature detection — if a phase's JSON is missing, its sub-pill hides cleanly. No phase depends on a later phase.

## Shipping cadence — milestone chunks, deploy-to-phone each time

Phases are too coarse for weekly review. Inside every phase, break into **milestones**: the smallest shippable unit that shows visible UI progress. After every milestone: commit, push, GitHub Pages auto-deploys, user reviews on phone, we iterate before the next chunk.

**Phase 1 MVP chunked:**

```
M1.1  Brand flip             title + header logo → "aiStacked"; meta desc
M1.2  4-tab nav structure    Home / Learn / News-Media / Comply365 shells
M1.3  Home → News move       migrate the 5 chart cards out of Home
M1.4  Home dashboard shell   empty-state cards (progress, finder CTA)
M1.5  Tools catalog grid     read tools.json stub, render modality filter
M1.6  Claude hub (Basics)    static page, first section only
M1.7  Finder — wizard step   project description input + forks
M1.8  Finder — capability grid  checkbox grid, live counts
M1.9  Finder output — Easy   single ordered path, reasoning sidecar
M1.10 Finder output — Best   dual column on desktop, stacked on mobile
M1.11 Save as project        writes localStorage, shows in My Projects
M1.12 Mobile polish pass     touch targets, sheet pickers, text sizing
```

Each milestone ends with `git commit && git push` from the feature branch **merged to main** (or deployed from branch via GH Pages preview). User opens the live URL on phone, reports back, next milestone begins. No batching milestones without review.

**Rules:**
- One milestone per session of work, roughly. If a milestone balloons, split it.
- Verify before ship: dev-server check + mobile viewport test in browser.
- Never ship a broken tab — feature-detect and hide incomplete UI until the milestone that completes it.
- Commit message: `feat(M1.X): <short>` so the milestone number is searchable in history.

Same chunking applies to later phases (M2.x for Snippets, M3.x for Projects depth, etc.).

## Flexibility & freshness — handling the AI-tools churn

The AI tool landscape changes weekly. Static JSON would rot fast. Build in mechanisms:

**Machine-side:**
- **Existing 2h scraper cron** (news/videos/status) — already refreshes signal layer. Extend with Phase 1.5's Claude learning scraper.
- **New monthly tool-catalog audit** (`scripts/audit_tools.js`, cron weekly):
  - Fetches every tool's `officialUrl` + `docsUrl`, checks HTTP 200, flags broken links.
  - Pulls vendor blog / changelog feeds if available, flags tools whose `currentVersion` string no longer appears on the page.
  - Writes a `data/learn/tool_audit.json` diff report: `{id, changes: [{field, old, new, sourceUrl}]}`.
  - Never auto-edits `tools.json` — produces a queue for human review.
- **Per-entry freshness badge**: every tool card shows `verified YYYY-MM-DD`. Older than 90 days = muted "verify" chip.

**Catalog-side:**
- `tools.json` supports `deprecated: true` with `replacedBy: "new-tool-id"`. Finder excludes deprecated entries from recommendations and shows "replaced by X" on the deprecated tool's page.
- Capability taxonomy (`provides` / `requires` tags) is **append-only** — new capabilities added as new tags; old tool entries unaffected.
- A single `data/learn/tools_archive.json` holds retired tools so historical projects still render their steps (with a "this tool was retired" note).

**User-side:**
- Phase 6 user-authored workflows + "Research this" button → user can flag that a workflow's tools have drifted; surfaces a refresh prompt.
- "Last verified" filter in the Tools grid — "show only tools verified in the last 30 days" when the user wants the freshest picks.

**Review cadence:**
- Weekly: check the audit report, update any broken link / version.
- Quarterly: review the full capability taxonomy — retire unused tags, add new ones, re-rank `priorityScore` as the field shifts.
- When a major model launches (e.g. a new Opus / Gemini / GPT), that triggers an ad-hoc catalog update + a Home dashboard refresh.

**Philosophy:** the site should gracefully *age*, not break. An entry from six months ago with a stale version string shows its age but still loads, still pins to projects, still contributes to learning paths — with a visible "verify" chip prompting the user before acting on it.

## Version display — visible, bumped per deploy

- **File:** `data/version.json` holds `{ version, milestone, deployedAt, commitSha }`. Frontend fetches with `?v=<ts>`, renders in the footer as `aiStacked v0.1.3 · M1.3 · 2026-04-18`.
- **Scheme:** `v<major>.<minor>.<patch>` where each milestone bumps patch. Phase boundaries bump minor (Phase 1 complete → v0.2.0). Feature-complete MVP → v1.0.0.
- **Bump policy:** every save-and-deploy commit increments the version. No silent deploys. If two milestones are committed back-to-back without a review gap, they still get separate version bumps so the user can diff.
- **Commit convention:** `feat(M1.3): <short description> [v0.1.3]` — milestone + version in commit message for searchability.
- **Automation:** simple — version bump is a manual edit to `data/version.json` included in the milestone commit. No git hook, no npm script, no build step. Keeps the zero-dependency static-site property.

## Data footprint — what lives where

**In the repo (GitHub sees this, stays small):**
- Code: `index.html`, `css/style.css`, `js/app.js`, `scripts/*.js` — small.
- Scraped feed: `data/latest.json` — already refreshing every 2h with `[skip ci]`, ~100-500KB.
- New catalog: `data/learn/tools.json` (~30KB), `usecases.json` (~10KB), `snippets.json` (~100KB), `lessons/*.md` (tiny markdown), `version.json` (tiny).
- Plan itself copied in as `docs/plans/aistacked-v1.md` (~100KB) so every session can read it.
- **Total added by rebuild: < 1MB.**

**Local only — never committed:**
- All planning / research artifacts live at `C:\Users\alany\.claude\plans\` — agent outputs, research summaries, the original plan file. Outside the repo. GitHub never sees these.
- localStorage (projects, pins, progress, snippet favourites, API keys) — browser-scoped, never in the repo.
- Phase 6 "Research this" output — cached in localStorage, never in the repo.

**Growth rate over time:**
- The 2h cron adds ~10-20KB per commit to `data/latest.json`. Same as today. ~50MB/year of history accumulates — normal for a data-fed static site.
- If history ever becomes heavy, `data/latest.json` can be rotated or shallow-cloned. Not a near-term concern.

**Nothing in this plan causes repo bloat.**

## localStorage monitor — size budget, purge UI

Browsers cap `localStorage` at ~5-10MB per origin. Projects + pins stay small, but Phase 6's "Research this" cache can grow (each research response ~10-50KB; 100 queries ≈ 1-5MB). Build in visibility + control.

**Storage panel** (accessible from the footer gear icon and Home dashboard):

- **Usage bar** — current total / budget (e.g. `1.3MB / 5MB`), color-flips amber at 70%, red at 90%.
- **Per-category breakdown**:
  - Projects — `N projects · X KB`
  - Pins — `N items · X KB`
  - Snippet favourites — `N items · X KB`
  - Research cache — `N entries · X KB` (usually the biggest)
  - Lesson progress — `N items · X KB`
  - Collections (Comply365 etc.) — `N items · X KB`
- **Item-level list per category** with last-accessed timestamp, size, delete button. Sortable by size or age.
- **Bulk actions per category**:
  - `Clear all research cache (oldest first)`
  - `Remove pins I haven't opened in 90 days`
  - `Delete completed lessons progress` (keeps completion flag, drops detail)
- **Export before delete** — "Download backup" button writes a single JSON file of all localStorage keys. User can re-import later if they regret a purge.
- **Auto-nudge** — when usage crosses 70%, a subtle banner at the top of Home suggests opening the storage panel. Never auto-deletes.

**Implementation:** pure JS, no dependency. Iterate `localStorage.length`, sum `JSON.stringify(value).length` per namespaced key prefix (`clhub.v1.*`). Render as accordion. Export = `a[download]` with a Blob of the full export object.

**Phase placement:** ships in **Phase 3** (My Projects depth), since storage pressure first appears as users accumulate pinned content and research caches. Phase 6's user-workflow research respects the budget by deduping cache entries and evicting oldest-first when approaching 90%.

## Setup protocol — one step at a time, verified

During any initial setup (new API keys, new tools to install, new env vars, branch creation, deploy config), the agent follows this protocol:

1. **Open with a summary** — full list of setup steps the user will take, numbered, with estimated effort per step. One block, scannable, read-only for the user.
2. **Then drip one step at a time.** Each step:
   - Prefaced by a one-line restatement of what's about to happen and why.
   - **Verified by the agent before being handed over** — command/URL/flag confirmed via WebFetch on current vendor docs (not training data); file paths confirmed to exist; keybindings and menu paths confirmed not guessed.
   - Presented in a copy-paste-ready form.
   - Followed by: **"Reply when done or if something looks off."** No batching, no "also do X" inside the same message.
3. **User confirms** → next step.
4. **If the user reports the step didn't work** — agent diagnoses root cause before offering a new command. Never a blind retry. Never a second "fix" attempt after the first one fails without reassessing.
5. **No UI assumptions** — for dashboard walkthroughs, describe the destination conceptually and let the user match to what they see. Fetch current vendor docs if unsure.

This protocol applies to every phase's onboarding — Phase 1 feature-branch creation, Phase 1.5 Claude API key for learning scraper, Phase 6 Claude API key for on-demand research, etc.

## Critical files to touch

- `index.html` — replace chip list, add `<section data-section="learn">` with 5 sub-pills, add templates for project card / snippet row / quiz block / pin button.
- `css/style.css` — new classes `.project-card`, `.snippet-row`, `.snippet-copy`, `.pin-btn`, `.quiz-block`, `.quiz-choice`; extend sub-pill styles.
- `js/app.js` — new module or section for Learn; localStorage helpers; tool-page / use-case / project / snippet / quiz renderers; remove the standalone `renderSection("resources-*", …)` calls and route that scraped content into per-tool filters instead.
- `data/learn/tools.json`, `data/learn/usecases.json`, `data/learn/snippets.json` — new (start with stub files of `[]` to unblock UI; populate in their respective phases).
- `data/learn/lessons/<slug>.md` — authored incrementally in Phase 5.
- `CLAUDE.md` — update tab list, data-file list, and learning-model conventions.

## Load-bearing constraints to honor

- Videos-above-articles in any mixed list (Library included).
- TDZ-safe init (any new const referenced by renderers must live above `applyFilter` or be in a hoisted function).
- `?v=<ts>` cache busting on every new JSON fetch.
- All `.reveal` animation wrapped in `@media (prefers-reduced-motion: no-preference)`.
- Relative links only (GitHub Pages `/claudeHub/` base).
- Design-language discipline: `.glass`, `--radius-md`, `--ease-premium`, low-alpha hairlines, top-edge specular highlight.

## Verification (per phase)

1. `node scripts/build_latest_json.js` still succeeds and writes `data/latest.json`.
2. `python -m http.server 8765` serves the site; every tab renders.
3. Learn → Library: click pin on a card, refresh, pin persists.
4. Phase 2+: copy button puts snippet on clipboard; tag filter narrows results.
5. Phase 3+: create project, pin into it, project card shows pinned count.
6. Phase 4+: answer all MCQs in a lesson, score reveals, "mark complete" persists; track progress bar advances.
7. Lighthouse a11y ≥ 95 on Learn tab; reduced-motion state static.
8. Hard-refresh after deploy; service worker does not strand old JSON.

## Finder — UX decisions (resolved so far)

- **Tri-modal input.** The Finder accepts three entry modes, all producing the same output shape (tool stack + ordered learning path + setup instructions + educational material):
  - **A. Describe your project** — hybrid wizard + editable checkbox grid (capability-first). "I'm building a marketing site with 3D video." Finder infers the stack.
  - **B. Pick tools** — multi-select from the tool catalog. "I want to use Nano Banana + Flow + Vercel." Finder generates setup + how-to for that exact stack. Skips the capability inference step.
  - **C. Browse by topic** — topic picker or topic search. "Show me everything about Skills / MCP / LoRA." Filter view aggregates lessons, snippets, videos, news, and tool pages tagged with that topic. Acts as both a filter and a hub (direct deep-link URL per topic).
- **Input style for Mode A: hybrid.** 3-4 short wizard forks land on a checkbox grid pre-filled and editable. Output renders below the grid once the user confirms.
- **Output enrichment via on-demand AI research** (ties into Phase 6). For any of the three modes, if the user clicks "Go deeper on this stack" the Finder runs a Claude-API call to produce freshly-researched educational material (how-to, current-version notes, gotchas, linked videos) scoped to the selected capabilities / tools / topic. Cached per-request in localStorage with a "last researched" timestamp + refresh button.
- **Claude-first ranking.** Sort order prefers Claude-native tools (Claude, Claude Code, Claude Agent SDK, Skills, MCP) when they satisfy a capability. "Claude-only" toggle at top of the Finder output filters the recommendation to the Claude ecosystem only.
- **Budget awareness, not filter.** Every tool card surfaces a price badge (`Free` · `≤$20/mo` · `≤$50/mo` · `Premium`). Finder defaults to ranking by **best-for-the-capability**, not by price — the best-in-class tool is always shown even if Premium, because the user wants to *know about* it. A `$ budget` dropdown exists but is opt-in and only dims (never hides) over-budget cards; dimmed cards still show their reasoning sidecar. Premium tools are annotated with a "why it's worth it" one-liner on the card.
- **Capability taxonomy: 10 groups × ~35 checkboxes** (from research) — Foundation Model · Build Surface · Agent/Orchestration · Voice · Video · Image · Data & Retrieval · Knowledge & Research · Deploy & Hosting · Glue & Ops.
- **Live counts on checkboxes** ("Video (7 tools)") to kill dead-end combos. Filter chips above results. Reasoning sidecar per recommendation ("Picked Runway because you checked Video + Cinematic").

## Learning-path ordering — algorithm (dual-path: easiest + best)

The Finder always outputs **two side-by-side recommendations per use case**, sourced from the same catalog with different sort keys:

**"Easiest path"** — for "I want the fastest/lowest-effort route"
- Sort key: `(+setupComplexity, -priorityScore, price-ascending, id)`
- Prefers Claude-native ties. Prefers free/freemium and tools that come with auth/db/hosting bundled (Lovable, Bolt, v0, Supabase). Minimizes the number of tools in the stack.

**"Best path"** — for "I want the highest-quality outcome even if harder"
- Sort key: `(-priorityScore, quality-hints from tags, id)` — Claude-native ties; Premium tier acceptable
- Picks best-in-class providers per capability (Midjourney V8 / Veo 3.1 / ElevenLabs Pro / Blender+Meshy hybrid for 3D, etc.).
- Composes into a longer stack (more tools, more depth).

**Shared mechanics:**
- Build capability DAG from each tool's `requires`/`provides`. Pick one primary provider per capability per path before edge construction.
- Topological sort (Kahn's algorithm with a min-heap) produces the ordered learning path for each.
- Cycle defense: if output count < N, return partial + flag the offending pair.
- Price is never a hide/filter — premium tools show with a "why it's worth it" one-liner.

**Presentation:** two parallel columns on desktop (Easiest · Best), stacked cards on mobile. Each column is a vertical stepper with N/M progress, "Start here" on step 1, per-step estMinutes, swap pill for capability ties. A single "Save as project" prompts "which path?" before writing to My Projects.

## Stack editor — everything is overridable

The Finder's recommendation is a *starting point*, never a final answer. At every stage the user can override:

- **In the Finder output**: each tool card has a "swap" button → picker of every tool in the catalog that `provides` that capability, grouped by modality. Example: "I want Nano Banana for this role" → picker opens, user selects Nano Banana, the stack re-renders, the learning path re-computes (topo-sort runs again), reasoning sidecar updates.
- **"Add a tool" button** at the bottom of the stack — inserts any tool the Finder didn't pick. Prereqs and learning-path order recompute.
- **"Remove" on any tool card** — pulls it from the stack; any capability it was satisfying is re-resolved to the next-best candidate or flagged unfilled with a warning chip.
- **Force-pin a tool** before running the Finder — Mode B (pick tools) lets the user start from "I definitely want these tools" and the Finder treats them as fixed. Finder fills remaining capabilities around them.
- **In a saved project (My Projects)** — the full stack editor is still available. Tweak the stack, the learning path reflows and progress state for unchanged tools is preserved. Changed tools reset to `not_started`.

**Anti-surprise rule:** any override visibly changes the reasoning sidecar text ("You chose Nano Banana here; note: Nano Banana is image-only, so I added Google Flow to complete the video capability you picked"). The Finder explains consequences of user overrides, doesn't silently route around them.

## IA decisions (resolved so far)

- **Brand: `aiStacked`** (locked). Replaces "Claude Daily Intelligence Hub" in `<title>`, header logo, and meta description. Tagline candidate: "Find the stack. Learn the stack. Ship the project."
- **Responsive MVP, phone priority today.** Design the Finder wizard + checkbox grid + dual-path output to work cleanly on phone AND desktop from day one. Where desktop and mobile fight for space (e.g. dual-column Easy/Best), phone layout wins; desktop gets a wider variant layered on top. Touch targets ≥44px, no hover-only states, sheet-based collection pickers on mobile.
- **Apply AI tab: merged into Learn.** Drops to 4 top-level tabs (Home · Learn · News/Media · Comply365). Old `Best tool per task` taskgrid becomes a compact view inside Learn → Tools. Old `Workflow recipes` become outputs of the Finder, saveable as Use cases in My Projects. No Apply AI tab remains.
- **Build strategy: fresh rewrite on a feature branch.** Keep scrapers (`scripts/`), data pipeline, CLAUDE.md design tokens, rollback tag. Rewrite `index.html`, `css/style.css`, `js/app.js` from scratch around the new IA rather than retrofit. Reason: existing `js/app.js` (1370 lines) is tangled around the old 5-tab model; absorbing a Finder wizard + tool pages + project workspace would churn most of it anyway.

## Claude hub (first-class inside Learn → Tools)

The Claude tool entry is more than one card — it expands to a dedicated hub page covering:

- **Basics** — Claude.ai, Projects, Artifacts, Max plan features.
- **Claude Code** — install, login, CLAUDE.md conventions, slash commands, hooks, output-styles, thinking modes.
- **Skills** — what skills are, when/how to author one, YAML frontmatter, invocation, examples.
- **MCP** — what MCP is, Claude's MCP client, writing an MCP server, config file location, notable community servers.
- **Agent SDK** — TS/Python SDKs, when to build custom vs use Claude Code.
- **Recent changes** — a "what's new" feed (see Claude-learning scraper below). This is how Skills/CLAUDE.md patterns stay fresh.

The hub renders the same shape as other tool pages (tagline + setup + videos + snippets + news) plus a `sections[]` array for sub-topics (Basics / Claude Code / Skills / MCP / Agent SDK).

## New scraper — Claude learning refresh

`scripts/fetch_claude_learning.js` — added to the 2h cron alongside existing scrapers. Pulls from sources that track Claude surface changes:

- **Anthropic docs changelog** — docs.claude.com changelog/RSS (if exposed; else sitemap diff).
- **Claude Code release notes** — github.com/anthropics/claude-code releases.
- **Anthropic Academy catalog** — anthropic.skilljar.com course list diff.
- **Claude Skills / MCP spec bumps** — github.com/modelcontextprotocol releases, Anthropic skill repos.
- **Curated YouTube channels** (added to `fetch_youtube.js`): channels regularly publishing Claude Skills / MCP / CLAUDE.md content — the hub's "what's new" surface pulls from here, filtered by Claude-related keywords.

Output written to `data/latest.json` under a new `sections.claude_learning` key. Claude hub page renders this section as a "Recently updated" card row.

**Fallback behavior** matches existing scrapers: empty fetch preserves prior data (no site blanking).

## Open questions (flag, don't block)

- **Do 365 tutorials unify with Learn tutorials, or stay siloed?** Default: siloed. 365 is audience-filtered; Learn is the owner's general curriculum.
- **Import/export of localStorage state** so the user can back up projects across devices? Default: JSON download/upload added in Phase 4.
- **Auth-gated author-only mode?** Default: no. All content is public; learner state is local.
- **Tool catalog curation burden** — tools.json is the spine and will drift as the field moves. Default: author once in Phase 1, then revise quarterly alongside the Home charts; each tool's `currentVersion` field is the main thing that rots. A future `data/tools/versions.json` could be auto-refreshed by a scraper if maintenance becomes painful.
