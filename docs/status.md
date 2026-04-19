# aiUniversity — status + structure

Current release: **v0.6.111** on `main`. Live at https://onerrorgotowtf.github.io/claudeHub/. Phases 1, 1.5, 2, 3, 4, 5, 6, 7, 8 shipped. (Formerly "aiStacked" — visible brand flipped to **aiUniversity** in M8.12.5.)

## Current state — 2026-04-19

**Dashboard page: ~done.** Visual pass wraps up in M8.12.x:

- aiUniversity wordmark in nav.
- 365 tab fully decommissioned; four tabs remain: Dashboard · Learn · Projects · Tools.
- Panel layout: 2×2 quadrant grid per panel; title + CTA stacked left, identity icon lower-right (Learn/Projects nudged +6px), divider + glass item tiles below.
- Identity stripe marker restored left of each section heading (was experimenting with halving stripes / radial bloom / inline icons — all reverted in M8.12.17).
- Item tiles: fake cut-through to page bg (solid --bg-0 + glass-edge chrome; no backdrop-filter — CSS can't cut holes through opaque parents per-tile).
- CTAs converted to translucent Apple glass (M8.12.27).
- Nav chips: translucent glass with debossed/impressed labels (M8.12.37). Active chip stays solid white for prominence.
- YouTube tile: transparent glass; logo + wordmark read as a glass impression (M8.12.35/36).
- Tools panel now mirrors Learn/Projects — divider + glass tiles; seeded with three currently-in-use tools (Claude Pro Max 20×, GitHub Copilot Pro, SuperGrok Heavy). These will later weight the project-stack recommendation formula.

**Remaining dashboard polish (deferred):**
- Dashboard placeholder grid icon — grey for now; may get its own identity color.
- Orphaned --color-365-* / --accent-365-* tokens still referenced by unrelated gradients; cleanup when purple is retuned.

**Next up:** other tabs. Learn / Projects / Tools pages still reflect the older IA and need a similar design pass to match the dashboard's transparent-glass language.

---

## App structure (as of v0.5.6)

```
aiStacked
│
├── Home                          Dashboard — three cards
│   ├── Continue where you left off    up to 3 recent projects (tap → Projects → Saved)
│   ├── Start a new project            → Projects → + New project
│   └── State of AI →                  → charts (section-news-media, no chip)
│
├── Learn                         3 subpills
│   ├── What's new                     Text feed: Anthropic docs · GH releases
│   │                                  · Academy diffs · industry news articles
│   │                                  Filter pills: All · Anthropic · Industry
│   ├── Courses                        2 tabs
│   │   ├── Anthropic Academy          Flat list of all Academy courses
│   │   │                              grouped by bucket (Basics / Claude Code /
│   │   │                              Skills / MCP / Agent SDK). Each course
│   │   │                              expands to reveal its topic-matched
│   │   │                              snippets inline.
│   │   └── aiStacked Originals        Custom-authored courses (empty — M4+)
│   └── Tutorials & quizzes            6 lessons live
│       ├── Claude Code (3)             getting-started · claude-md-conventions
│       │                              · slash-commands-essentials
│       ├── Skills (1)                  when-to-author-a-skill
│       ├── MCP (1)                     mcp-first-server
│       └── Image / Video (1)           blender-ai-hybrid-hero (Young Carpets)
│                                       Each lesson: markdown + 3 MCQs with
│                                       reveal-on-answer explanations.
│
├── Tools                         18 tools; modality filter
│   ├── Claude stack (3)                Claude Code · Claude.ai · Claude Agent SDK
│   ├── Coding / IDE (3)                Cursor · Lovable · v0
│   ├── Automation (1)                  n8n
│   ├── Image (3)                       Nano Banana · Midjourney · Meshy
│   ├── Video (3)                       Veo 3.1 · Google Flow · DaVinci Resolve
│   ├── Voice (1)                       ElevenLabs
│   ├── Deploy / Data (2)               Vercel · Supabase
│   ├── 3D (1)                          Blender
│   └── Motion UI (1)                   Framer Motion
│   Each tool card → modal with tagline · pricing · Official/Docs
│                    · setupSnippet (copy-ready) · filtered snippets.
│
├── Projects                      List + wizard
│   ├── Saved                          project cards with path badge, stack
│   │                                  chips, pin counts, notes pad (autosave),
│   │                                  Export/Import/Storage toolbar
│   └── + New project                   Finder wizard
│       ├── Describe textarea           on Continue: keyword heuristic
│       │                              auto-checks matching caps (36 rules)
│       ├── Browse example projects    3 seed projects — one tap fills the
│       │                              textarea + capability boxes:
│       │                              · Young Carpets marketing site (3D hero)
│       │                              · Young Carpets employee portal
│       │                              · Commission calculator (ACCPAC DOS)
│       ├── Pick tools (deferred)       Mode B placeholder
│       ├── Browse by topic (deferred)  Mode C placeholder
│       ├── Capability grid             11 groups × ~34 caps
│       │                              (Foundation · Build · Agent · Voice ·
│       │                              Video · 3D/Motion · Image · Data ·
│       │                              Knowledge · Deploy · Glue · Local)
│       └── Dual output                 Easiest / Best columns → Save
│
├── YouTube                       Scraped video feed
│   └── Card grid                      saved-first sort, tap → in-app iframe
│                                      modal; Save button on every card
│
└── Comply365                     (design pass pending)
    ├── Tutorials                       hand-curated markdown tutorials
    ├── Resources                       Videos · Official sub-tabs
    └── News                            Comply365 + WebManuals / Flydocs /
                                        Ideagen scraped news
```

### Cross-cutting features

```
Save button              On every card. One picker: optional project pins +
                         optional note + Remove save. Storage: clhub.v1.saves.
                         Migration from old pin keys ran on first load.

cmd-K / ⌘+K              Global snippet search (topbar magnifier on phone).
                         Searches 44 snippets by title / summary / tags.

Storage monitor          Projects toolbar → Storage. Usage bar vs. 5 MB,
                         per-key breakdown, two-tap delete.

Backup export / import   Projects toolbar. Modal shows the JSON inline;
                         Copy · Save to laptop · Close. Save-to-laptop
                         POSTs to the dev server when available.

Theme toggle             Dark / light, topbar.

Footer pill              aiStacked v<ver> · M<milestone> · deployedAt
                         Proves which build is rendered.
```

### localStorage layout

```
cdih-theme                   dark | light
clhub.v1.projects            { id: { title, goal, path, caps, stack,
                                     notes, pinnedTools, pinnedSnippets,
                                     createdAt, updatedAt } }
clhub.v1.saves               { id: { kind, targetId|url, title, thumb,
                                     source, published, projectId?,
                                     note?, addedAt } }
clhub.v1.lessonProgress      { slug: { state, answers, startedAt,
                                       completedAt? } }
clhub.v1.finderCaps          current Finder capability selection
clhub.v1.finderDraft         textarea draft
clhub.v1.claudeWhatsNewLastSeen   timestamp for "N new" badge
clhub.v1.learningPins        legacy (pre-M3.10) — readable; no new writes
clhub.v1.savesMigrated       1  (migration-done flag)
```

### Data + scripts

```
data/
  latest.json                  2h-cron scraped feed (news/videos/academy/etc.)
  version.json                 footer pill values
  learn/
    tools.json                 18 tools — the Finder's spine
    snippets.json              44 snippets across 13 snippetTags
    lessons.json               lesson index + inline quiz data
    lessons/<slug>.md          lesson body (markdown)
    usecases.json              Finder example projects
    academy_courses.json       scraped Anthropic Academy catalog
    claude_hub_map.json        bucket → course-slug + bucket → snippet-tag
  365/
    tutorials.json             Comply365 tutorial index
    tutorials/<slug>.md        tutorial bodies
  backups/                     dev-server POST target (gitignored)

scripts/
  build_latest_json.js         orchestrator — runs every 2h via Actions
  dev_server.py                live-reload SSE + POST /__save_backup
  fetch_anthropic.js           Anthropic docs + news (sitemap)
  fetch_docs.js                platform.claude.com tutorial docs
  fetch_tutorials.js           cookbook + courses + releases
  fetch_youtube.js             per-channel YouTube Atom
  fetch_news.js                TechCrunch / Ars / Verge / HN
  fetch_hn.js                  HN Algolia
  fetch_status.js              status.anthropic.com
  fetch_365.js                 Comply365 + competitors
  fetch_claude_learning.js     Anthropic docs changelog + GH releases
  fetch_academy.js             Academy catalog diff
  lib/
    util.js, xml.js
```

---

## To-do (remaining work)

### Phase 3 leftover

- [ ] **M3.5 — Multi-collection pinning.** Mostly subsumed by unified Save
      (multi-project already works). Open piece: a dedicated Comply365
      collection + a Learning Paths pane inside Comply365 that renders
      saves tagged with it. Defer until Comply365 design pass.

### Phase 4 — more authored content (as-we-go)

- [ ] More Claude Code lessons — hooks · output styles · thinking modes ·
      multi-file edits in practice.
- [ ] More Skills lessons — bundled resources · allowed-tools pattern ·
      skills-for-end-users vs. skills-for-devs.
- [ ] More MCP lessons — HTTP transport + auth · MCP registry · writing
      a resource (not just a tool).
- [ ] Finder-track lessons — when Easiest vs. Best · overriding the
      stack · saving and evolving a project.
- [ ] Image / Video — Nano Banana prompt patterns · Veo first/last-frame
      deeper dive · DaVinci Resolve fast-grade workflow.
- [ ] No-code — Lovable → Cursor graduation · Bolt for internal tools.
- [ ] Local — Python + Tauri desktop UI · parsing other legacy formats.

No specific milestone numbers for these — each lesson is a small commit.
Aim: one lesson per sitting. Target ~25 lessons across tracks before
declaring "Phase 4 shipped".

### Phase 6 — user-authored workflows (reshaped)

Hard constraint: **no runtime Claude API calls**. M6.2, M6.3 REMOVED.

- [ ] **M6.1 — "Add workflow" button.** Writes user-authored workflows
      to `clhub.v1.userWorkflows`. Inputs: title + short description +
      optional URL. Rendered as cards in Projects or a new surface.
- [ ] **M6.4 — Copy research prompt flow.** Given a user workflow, the
      app generates a ready-to-paste research prompt. User runs it in
      their own Claude.ai session and pastes the result back as plain
      text. No outbound API call from the app.
- [ ] **M6.5 — Author-only promotion.** Export flow to promote vetted
      user-workflows into `data/learn/usecases.json` (the Finder example
      catalog). Local-only — the dev team reviews before committing.

### Comply365

- [ ] Design pass on Comply365 section — tighter hierarchy, subpill
      cross-fade tuning, tutorial typography.
- [ ] Learning Paths pane inside Comply365 (pairs with M3.5 when that
      lands).
- [ ] End-user-tone authored tutorials for aviation-compliance
      workflows (Claude.ai Projects, Artifacts, file uploads — NOT
      Claude Code CLI). Audience: compliance managers, not developers.

### Finder polish

- [ ] **Mode B (Pick tools).** Multi-select from the catalog; treat
      picks as fixed and fill remaining caps around them. Placeholder
      today.
- [ ] **Mode C (Browse by topic).** Topic picker → filter view
      aggregating lessons, snippets, videos, news, tool pages tagged
      with that topic. Placeholder today.
- [ ] Recalibrate `priorityScore` / `setupComplexity` after ~50
      Finder runs on real use cases. Don't pre-tune without data.

### Scrapers / data

- [ ] **M1.5.5b — Curated YouTube channels.** Add 3–5 verified
      Claude-focused creators (IndyDevDan, AI Jason, AICodeKing, etc.)
      to `fetch_youtube.js`.
- [ ] Monthly tool-catalog audit (`scripts/audit_tools.js`) — HTTP-200
      check on every officialUrl/docsUrl; flag stale `currentVersion`
      strings against vendor pages. Writes
      `data/learn/tool_audit.json` as a queue for human review.

### Infra / polish

- [ ] Reduced-motion audit — double-check every animation lives under
      `@media (prefers-reduced-motion: no-preference)`.
- [ ] Lighthouse a11y pass on every tab.
- [ ] Service worker refresh strategy — currently relies on cache-bust
      query strings. Consider a proper SW with skipWaiting on deploy.

### Locked rules (do not violate)

- **No runtime Claude API calls.** All content authored statically and
  checked in. Phase 6 research = "copy prompt, run in Claude.ai, paste
  back" flow only.
- **Videos above articles** in any mixed list.
- **Two-tap in-UI confirm** for destructive actions — never `confirm()`.
- **Pin / Save CTA** on every new feed/list.
- **95% confidence** before writing code; ask first if uncertain.
- **Milestone-size commits** with `data/version.json` bumped.
- **Verify SDK snippets** against real SDK source before shipping.
