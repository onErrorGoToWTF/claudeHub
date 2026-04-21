import type { LibraryItem } from './types'

const NOW = Date.now()
const L = (n: number) => NOW - n * 86400_000

/**
 * Curated, concise in-app notes distilled from primary sources.
 *
 * Format (locked):
 *   1. Body opens with **TL;DR** — one sentence takeaway.
 *   2. Sections use `##` headings.
 *   3. Verbatim quotes go in `>` blockquote blocks, with attribution on the
 *      line immediately after the blockquote.
 *   4. Body ends with `## Sources` containing [title](url) links, one per line.
 */
export const libraryNotes: LibraryItem[] = [
  {
    id: 'n.hig-motion',
    kind: 'doc',
    title: 'Apple HIG — Motion & Reduced Motion',
    summary: 'How Apple thinks about animation: short, precise, meaningful. Plus the three reduced-motion levels and the ms values worth knowing.',
    url: 'https://developer.apple.com/design/human-interface-guidelines/motion',
    tags: ['design', 'motion', 'apple'],
    pinned: true,
    addedAt: L(2),
    body: `
**TL;DR** — Motion should be short, precise, and carry meaning; when Reduce Motion is on, swap large movement for a subtle alternative instead of removing the signal entirely.

## The three principles

- **Motion has meaning.** If removing an animation loses no information, remove it.
- **Brevity + precision.** Quick animations feel lightweight; slow ones feel intrusive.
- **Sequence, don't stack.** Coordinated effects chain cleanly — one layer owns each time slot.

> "Beautiful, fluid motions bring the interface to life, conveying status, providing feedback and instruction, and enriching the visual experience of your app or game."

— Apple HIG, Motion

> "Prefer quick, precise animations ... animations that combine brevity and precision tend to feel more lightweight and less intrusive."

— Apple HIG, Motion

## Reduced Motion — three levels to support

1. **Full motion** — default.
2. **Reduced, status still shown** — swap parallax / scale / translate for dissolve, crossfade, or color shift. Preserve the *information* the motion carried.
3. **Absolute minimum** — static state change only.

> "if the motion itself conveys some meaning, such as a status change or a hierarchical context transition, don't remove the animation entirely. Instead, consider providing a new animation that avoids motion, or at least reduces full screen motion, such as a dissolve, highlight fade, or color shift."

— Apple HIG, Motion

## Web pattern

\`\`\`css
@media (prefers-reduced-motion: reduce) {
  * { transition: none; animation: none; }
  .card-pre-reveal { opacity: 1; transform: none; } /* final state */
}
@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform 0.3s var(--ease-premium); }
}
\`\`\`

## Timing reference

Apple's HIG does not publish ms values. These are community-surveyed from UIKit defaults; treat as directional.

- Tap / press state — 100–150 ms
- Hover highlight — 150–200 ms
- Tab crossfade — ~180 ms
- Sibling translation (drag reorder) — 180–220 ms
- Modal dismiss — 250–350 ms
- Sheet slide-up — 300–400 ms
- Long-press activation — 500 ms

## Sources

- [Apple HIG — Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Apple HIG — Accessibility (Reduce Motion)](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [ehmo/platform-design-skills — UIKit default timings](https://github.com/ehmo/platform-design-skills)
`.trim(),
  },

  {
    id: 'n.liquid-glass-fundamentals',
    kind: 'doc',
    title: 'Liquid Glass — Fundamentals',
    summary: "Apple's 2025 material. What it is, the three layers, the material variants, and what actually ports to web.",
    url: 'https://developer.apple.com/documentation/technologyoverviews/liquid-glass',
    tags: ['design', 'glass', 'apple'],
    pinned: true,
    addedAt: L(3),
    body: `
**TL;DR** — Liquid Glass is a translucent *functional-layer* material for controls — nav bars, toolbars, floating buttons — not content; it lenses, reflects, and responds to motion, and over-applying it (or stacking it on itself) dilutes the effect.

## What Apple calls it

> "a new dynamic material called Liquid Glass, which combines the optical properties of glass with a sense of fluidity."

— Apple, TechnologyOverviews / Adopting Liquid Glass

> "This material forms a distinct functional layer for controls and navigation elements ... It affects how the interface looks, feels, and moves, adapting in response to a variety of factors to help bring focus to the underlying content."

— Apple, TechnologyOverviews / Adopting Liquid Glass

> "translucent and behaves like glass in the real world ... Its color is informed by surrounding content and intelligently adapts between light and dark environments ... uses real-time rendering and dynamically reacts to movement with specular highlights."

— Apple Newsroom, June 2025

## The effects that compose it

- **Translucency** — foreground lets background show through.
- **Lensing** — glass *bends* light. Different from traditional blur (scatter).
- **Reflection** — picks up ambient content + wallpaper.
- **Specular highlights** — real-time highlights tracking device motion.
- **Adaptive shadows** — depth scales with how far the surface sits above content.
- **Fluid motion** — elements behave like a drop of liquid on motion.

## The three-layer model (load-bearing)

1. **Content layer** — lists, photos, text. **No glass.**
2. **Functional layer** — nav bars, tab bars, floating buttons, toolbars. **Glass lives here.**
3. **Overlay / vibrancy** — text + icons + fills on top of glass. Automatic vibrancy.

This separation is why Apple's rule is *no glass on glass* — stacking glass surfaces dilutes the material's distinctness.

## Material variants

- **\`.regular\`** — default. Toolbars, nav, standard controls.
- **\`.clear\`** — high transparency. Only over media-rich content, when a dim layer is tolerable, and the text on top is bold + bright.
- **\`.identity\`** — disables glass entirely (conditional fallback).

## What ports to web

- Translucency, lensing (\`backdrop-filter: blur() saturate()\`), adaptive shadow, static specular highlight — yes.
- Real device-motion-coupled specular — no, not without permission prompts. A static inset highlight is the honest stand-in.
- The "no glass on glass" guardrail is useful: treat floating nav + floating panels as *one* glass layer, not stacked.

## Sources

- [Apple — Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/liquid-glass/adopting-liquid-glass)
- [Apple Newsroom — New software design (June 2025)](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)
- [conorluddy/LiquidGlassReference — SwiftUI reference](https://github.com/conorluddy/LiquidGlassReference)
`.trim(),
  },

  {
    id: 'n.linear-workflow',
    kind: 'doc',
    title: 'Linear — Project workflow patterns',
    summary: 'How Linear models work: state transitions over gamification. Issue states, project states, health signals, milestones, and why status updates are deliberately manual.',
    url: 'https://linear.app/docs/configuring-workflows',
    tags: ['product', 'workflow', 'linear'],
    pinned: true,
    addedAt: L(4),
    body: `
**TL;DR** — Linear treats progress as explicit state transitions (not XP or streaks): every issue and every project lives in one clear state, health is an orthogonal signal, and status is always updated by a human.

## Mental model

Linear's thesis: progress is a **state transition**, not a score. Every issue lives in one state; every project lives in one state. The UI makes those states unambiguous at a glance and lets them roll up into higher views (project → initiative → roadmap) without extra work.

No XP. No streaks. No mascots.

## Issue states

Default flow:

> "Backlog > Todo > In Progress > Done > Canceled"

— Linear docs, Configuring Workflows

A sixth \`Triage\` category acts as an inbox for integrations.

- **Backlog** — where new issues land.
- **Todo** — unstarted work.
- **In Progress** — active work.
- **Done** — complete.
- **Canceled** — rejected / dismissed (duplicates land here too).

Statuses can be renamed and recolored, and rearranged *within* a category — but categories themselves can't be reordered.

## Project states (distinct from issue states)

\`Backlog, Planned, In Progress, Completed, Canceled\`.

Key rule — status is a human claim:

> "Project statuses are updated manually—we do not do this automatically, even if all issues are completed."

— Linear docs, Project status

A project with 100% issue completion can still be \`In Progress\` until the lead marks it shipped.

## Health indicators

Orthogonal to lifecycle: \`On track\` / \`At risk\` / \`Off track\`. A project can be \`In Progress\` + \`At risk\` simultaneously.

Every update pairs a **health pill** (at-a-glance signal) with a **rich-text description** (the why). Both are load-bearing — the pill fails the context test alone; the description fails the scan test alone.

## Milestones

A diamond icon. Active milestone gets a **yellow** diamond; completed ones fill in. Each milestone carries its own completion %.

## Update cadence

Reminders run on a schedule (weekly / biweekly, specific day + time). Leads get nudged in their local timezone. Missed windows trigger follow-ups at +1 day and +2 working days.

## What to port

- Lifecycle badge on Projects.
- Health pill + short narrative on status updates.
- Manual state updates — don't auto-flip \`In Progress → Done\` on completion.
- Activity feed that *collapses* property-change events and keeps human updates prominent.

## Sources

- [Linear — Configuring workflows](https://linear.app/docs/configuring-workflows)
- [Linear — Project status](https://linear.app/docs/project-status)
- [Linear — Project milestones](https://linear.app/docs/project-milestones)
- [Linear — Project progress graph](https://linear.app/docs/project-graph)
- [Linear — Inbox](https://linear.app/docs/inbox)
- [The Linear Method](https://linear.app/method)
`.trim(),
  },

  {
    id: 'n.claude-code',
    kind: 'doc',
    title: 'Claude Code — CLI reference',
    summary: 'Terminal-first coding agent for multi-file sessions. Install, point it at a repo, hand it work.',
    url: 'https://docs.claude.com/en/docs/claude-code',
    tags: ['claude', 'agent', 'cli'],
    pinned: true,
    addedAt: L(0),
    body: `
**TL;DR** — Install the CLI, \`cd\` into a repo, run \`claude\`, and describe the work; Claude plans, edits files in place, and iterates — best for tasks that span multiple files.

## Install and first run

\`\`\`
npm install -g @anthropic-ai/claude-code
claude           # sign in on first run
cd your/repo && claude
\`\`\`

## Core idea

Claude Code is a terminal agent with long-context reasoning and tool access — it reads your files, edits them, runs commands, and verifies its work across steps. Unlike inline autocomplete, it's built for **long sessions** on real codebases, not single-prompt snippets.

## Skills

Skills (in \`.claude/skills/<name>/\`) are named capability bundles the agent can invoke when the task matches. Each skill is a folder with a \`SKILL.md\` describing:

- A short \`description:\` of when to invoke.
- Scripts or rules Claude loads lazily.
- Reference docs in a co-located \`_resources/\` dir.

Skills keep the main context lean — Claude loads the skill only when the work calls for it.

## Hooks

Hooks (in \`.claude/settings.json\`) fire on events like \`PreToolUse\`, \`PostToolUse\`, \`Stop\`, \`UserPromptSubmit\`. They run shell commands. Use them to:

- Block dangerous commands before they run.
- Auto-format code after edits.
- Send a notification when the agent finishes.
- Inject preamble into every user prompt.

## When to use (and when not)

- **Use it for:** multi-file refactors, migrations, net-new features touching 5+ files, codebases too large for a single IDE prompt.
- **Skip it for:** one-line fixes, whole-app scaffolding from scratch (use a scaffolder), or throwaway scripts.

## Keeping it on rails

- Write a \`CLAUDE.md\` at the repo root — user instructions, style rules, gotchas. Claude reads it every session.
- Keep sessions focused. One task per session beats omnibus prompts.
- Review diffs, don't rubber-stamp. The agent is fast; you still own the code.

## Sources

- [Claude Code — product page](https://claude.com/claude-code)
- [Claude Code — docs](https://docs.claude.com/en/docs/claude-code)
- [Claude Code — hooks reference](https://docs.claude.com/en/docs/claude-code/hooks)
- [Claude Code — skills](https://docs.claude.com/en/docs/claude-code/skills)
`.trim(),
  },

  {
    id: 'n.claude-agent-sdk',
    kind: 'doc',
    title: 'Claude Agent SDK — TS / Python',
    summary: 'SDK for building custom agentic apps on Claude. Tool use, MCP clients, streaming, typed responses.',
    url: 'https://docs.claude.com/en/docs/agent-sdk',
    tags: ['claude', 'sdk', 'agent', 'mcp'],
    pinned: true,
    addedAt: L(0),
    body: `
**TL;DR** — The Agent SDK is the library you reach for when Claude Code isn't the right shape — custom product UX, embedded agents, scheduled jobs, or any app where you need programmatic control over the agent loop.

## What it's for

- You want your own UX, not a terminal prompt.
- You want the agent to live inside a product, a backend job, a scheduled worker.
- You want tight control over tools, the context window, and error handling.

Otherwise, Claude Code is a better default — you get hooks, skills, MCP, and file editing without writing any glue.

## Install

\`\`\`
# TypeScript
npm i @anthropic-ai/agent-sdk

# Python
pip install anthropic-agent-sdk
\`\`\`

## Shape of a session

You construct an \`Agent\` with:

- A **system prompt** (persona, constraints, style).
- **Tools** — typed function declarations the agent can call.
- **MCP clients** — external tool servers it can consume.
- **Options** — model, max tokens, temperature, streaming.

Then you run a session:

- Send a user turn.
- Receive a stream of messages: text, tool_use, tool_result.
- Tool calls execute locally; you return results to the agent.
- Loop until the agent emits a final answer.

## Tools

Tools are the primary extension surface. Each tool has:

- A **name** (stable, identifier-style).
- An **input schema** (JSON Schema; the agent fills it).
- An **execute** function you implement.

Keep tool surface tight. Three well-named tools beat fifteen overlapping ones.

## MCP

Instead of re-inventing tools the SDK can attach to MCP servers — GitHub, Linear, Slack, filesystems, databases. The agent calls them exactly like local tools.

## When NOT to use this SDK

- You only need one-shot completions → use the Messages API directly.
- You're building on a terminal → use Claude Code.
- You want a drop-in chat widget → most chat UIs already wrap Messages + tool use.

## Sources

- [Agent SDK — docs](https://docs.claude.com/en/docs/agent-sdk)
- [Agent SDK — TypeScript reference](https://docs.claude.com/en/docs/agent-sdk/typescript)
- [Agent SDK — Python reference](https://docs.claude.com/en/docs/agent-sdk/python)
- [MCP — Model Context Protocol](https://modelcontextprotocol.io/)
`.trim(),
  },

  {
    id: 'n.framer-motion',
    kind: 'doc',
    title: 'Framer Motion — React motion quick reference',
    summary: 'Animate React components without fighting the cascade. Mount/exit, layout transitions, gesture-driven motion.',
    url: 'https://motion.dev/',
    tags: ['react', 'motion', 'framework'],
    pinned: true,
    addedAt: L(0),
    body: `
**TL;DR** — Framer Motion is a React animation library with three core tools — \`motion\` components for declarative animation, \`AnimatePresence\` for mount/exit, and \`layout\` props for automatic layout transitions — and it composes with React rendering instead of fighting it.

## The three tools that carry most of the weight

- **\`<motion.div>\`** — a drop-in replacement for any HTML/SVG element that accepts \`initial\`, \`animate\`, \`exit\`, \`whileHover\`, \`whileTap\`, and \`transition\`. Declarative: you describe the states, not the tweens.
- **\`<AnimatePresence>\`** — wraps a tree whose children may unmount. Children with an \`exit\` prop get their exit animation before being removed from the DOM.
- **\`layout\` prop** — set \`layout\` on a \`motion\` element; when its size or position changes (even across re-renders), Framer interpolates automatically using FLIP. Pairs with \`layoutId\` for shared-element transitions between screens.

## Easing

Framer accepts standard CSS curves as tuples. The one this codebase uses everywhere:

\`\`\`
transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
\`\`\`

That's our \`--ease-premium\` — slow-fast-slow with a long tail. Compose transitions per-property when durations diverge.

## Reduced motion

Framer respects \`prefers-reduced-motion\` via the \`MotionConfig\` component. Wrap your app:

\`\`\`
<MotionConfig reducedMotion="user">{app}</MotionConfig>
\`\`\`

All descendant \`motion\` elements then skip transform/scale animations and keep opacity/color fades — matching Apple's reduced-motion levels.

## Gotchas

- **Never animate \`width\`/\`height\` directly** — layout-triggering, expensive. Use \`layout\` + scale, or rely on grid transitions.
- **\`key\` changes remount children.** If you want exit animation, parent needs \`AnimatePresence mode="wait"\` so exits finish before the new child mounts.
- **Don't stack a \`transform\` with a \`layout\` on the same element.** Pick one animation source of truth per element.

## Sources

- [Motion (successor of Framer Motion) — main docs](https://motion.dev/)
- [Motion — animation reference](https://motion.dev/docs/react-animation)
- [Motion — AnimatePresence](https://motion.dev/docs/react-animate-presence)
- [Motion — layout animations](https://motion.dev/docs/react-layout-animations)
`.trim(),
  },

  {
    id: 'n.dexie',
    kind: 'doc',
    title: 'Dexie — IndexedDB wrapper',
    summary: 'A thin, typed wrapper around IndexedDB. Schemas as versioned strings, queries as chainable methods, transactions as callbacks.',
    url: 'https://dexie.org/',
    tags: ['db', 'local-first', 'framework'],
    pinned: true,
    addedAt: L(0),
    body: `
**TL;DR** — Dexie gives you the ergonomics of an ORM on top of IndexedDB — declare your schema once, write chainable queries, get typed results, and never touch \`IDBRequest\` directly.

## Mental model

A Dexie \`Database\` holds **stores** (tables). Each store has one primary key plus optional **indexes** on fields you want to query. Stores are declared as comma-separated strings:

\`\`\`
db.version(1).stores({
  tracks:    'id, order',
  topics:    'id, trackId, order',
  progress:  'id, kind, topicId, updatedAt',
})
\`\`\`

The first token is the primary key. The rest are indexes. Prefix with \`&\` for unique, \`*\` for multi-entry, \`++\` for auto-increment.

## Schema migrations

Bump the version; Dexie upgrades in place.

\`\`\`
db.version(2).stores({
  inventory: null,                  // drop a store
  library:   'id, kind, pinned, addedAt',
})
\`\`\`

Provide an \`.upgrade()\` callback on the new version to transform old rows. No callback = Dexie adds/drops stores but leaves row data alone.

## Queries

Every store exposes a chainable query builder:

\`\`\`
await db.library.where('kind').equals('tool').toArray()
await db.progress.orderBy('updatedAt').reverse().limit(10).toArray()
await db.library.filter(x => x.pinned).toArray()
\`\`\`

\`filter()\` is a JS predicate — no index required. \`where()\` uses indexes and is far faster on large stores.

## Transactions

Wrap multi-store writes in a transaction:

\`\`\`
await db.transaction('rw', [db.tracks, db.topics], async () => {
  await db.tracks.bulkPut(...)
  await db.topics.bulkPut(...)
})
\`\`\`

If anything throws, the whole transaction rolls back.

## Gotchas

- **Indexes are created at schema declaration, not at write time.** Adding a \`where()\` on a non-indexed field returns nothing unless you use \`filter()\` instead.
- **Dexie is local-first; it does not sync.** Use Dexie Cloud or build your own sync layer.
- **Safari has quotas.** ~50 MB per origin in Private Mode; more in normal mode, but subject to eviction. Don't store binaries here.

## Sources

- [Dexie — main docs](https://dexie.org/)
- [Dexie — schema syntax](https://dexie.org/docs/Version/Version.stores())
- [Dexie — queries](https://dexie.org/docs/Collection/Collection)
- [MDN — IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
`.trim(),
  },
]
