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
    id: 'n.claude-cowork',
    kind: 'doc',
    title: 'Claude as a Coworker',
    summary: 'Working with Claude day-to-day — meetings, documents, decisions, comms. Not coding. For leaders and knowledge workers.',
    url: 'https://claude.ai',
    tags: ['claude', 'workflow', 'leadership', 'beginner'],
    pinned: true,
    addedAt: L(0),
    body: `
**TL;DR** — Treat Claude as a thinking partner, not a search engine — set up a small number of persistent Projects that know your context, start each session with "what's on your mind," and let Claude draft, critique, and summarize while you make the calls.

## The shift in mindset

The first instinct with any AI tool is to ask one-off questions. That's fine, but the value compounds when you stop treating it like a search box and start treating it like a colleague who reads along with you.

A Claude coworker relationship has three properties:

- **It remembers context.** Projects (on Claude.ai Pro / Max) hold system prompts and attached files across every chat in that project.
- **It drafts, doesn't decide.** Claude produces first passes; you edit, approve, or discard. You stay accountable.
- **It thinks out loud.** When you ask "what would you push back on here?", real answers come back — not flattery.

## Projects are load-bearing

A Project is a workspace for a recurring domain. Reasonable ones to stand up:

- **Board & Stakeholders** — bios, prior updates, recent decisions, upcoming asks.
- **Team & People** — org chart, direct reports, goals, recent 1:1 notes.
- **Product / Strategy** — current priorities, market context, customer insights.
- **Inbox Triage** — thread context so Claude can draft replies in your voice.

For each, attach a short **context note** (1–2 pages), a **style note** (how you write), and any **living docs** (current plan, current OKRs). Claude reads them on every message in that Project.

## A daily rhythm that works

**Morning.** Open your exec Project. "Given my calendar today and the open threads, what should I have crisp answers to by 9am?" Surfaces angles you'd otherwise discover mid-meeting.

**Before a meeting.** Paste the invite + any attached doc. "I have 15 minutes to read this. What are the three questions I should be ready to ask, and the one I should be ready to answer?"

**After a meeting.** Paste your notes. "Summarize for my files, and give me a short version I could send to the team."

**Comms drafting.** "Draft a short note to [person] addressing [point]. Direct tone, no filler, 4 sentences max. Show me three versions."

**End of week.** "Here's my week. Give me a three-sentence status for myself and a two-sentence status I could send up."

## Working with documents

Claude.ai handles PDFs, Word, slides, spreadsheets, and images. Pragmatic patterns:

- **Long doc in, summary out.** Board packet → one-page brief + three open questions.
- **Comparison.** Two contract drafts → table of meaningful differences.
- **Structured extraction.** Meeting transcript → action items with owners + due dates.
- **Stress-test a plan.** "What's the strongest objection to this proposal? Who would make it, and what's the honest response?"

## Artifacts (for non-coders)

Artifacts are the side-panel renders Claude makes when output is long or visual. For leaders the useful ones are:

- **One-page briefs** rendered as a formatted document.
- **Decision tables** — pros/cons, who-what-when grids.
- **Simple charts** — bar/line charts for back-of-envelope numbers.
- **Slide outlines** you can paste into Keynote / PowerPoint.

Artifacts edit live; keep iterating until it's right, then copy out.

## What to watch for

- **Over-delegation.** Claude is confident even when it's wrong. Check anything leaving your desk.
- **Context bleed.** A great answer Monday becomes a stale answer Thursday. Refresh the Project's context note weekly.
- **Private data.** Consumer Claude.ai doesn't use chats to train by default; confirm your plan's privacy posture for sensitive material. Enterprise tiers give stronger guarantees.
- **Tone drift.** If Claude starts sounding like its defaults, re-paste your voice samples. A short style note goes a long way.

## When to graduate

- **Same question every day?** → Add it to a custom instruction or a dedicated Project.
- **Connected data you touch often?** → MCP connectors (setup usually handled by IT / a dev partner).
- **Cross-team workflow?** → You're at the edge of what solo Claude.ai is for; start thinking about team tooling.

## Sources

- [Claude.ai](https://claude.ai)
- [Claude — Projects](https://docs.claude.com/en/docs/build-with-claude/projects)
- [Claude — Artifacts](https://docs.claude.com/en/docs/build-with-claude/artifacts)
- [Anthropic — pricing](https://www.anthropic.com/pricing)
`.trim(),
  },

  {
    id: 'n.mcp',
    kind: 'doc',
    title: 'MCP — Model Context Protocol',
    summary: "Anthropic's open protocol for connecting AI assistants to tools, data, and external systems. The plumbing that lets Claude (and others) talk to your stuff.",
    url: 'https://modelcontextprotocol.io/',
    tags: ['claude', 'protocol', 'agent'],
    pinned: true,
    addedAt: L(0),
    body: `
**TL;DR** — MCP is a client-server protocol where an AI assistant (the client) talks to MCP servers (the tools) over JSON-RPC; one server plugs Claude into GitHub, another into your database, another into Slack, all using the same shape. Think of it as "USB for AI tools."

## The three roles

- **Host** — the app the user interacts with (Claude Desktop, Claude Code, Cursor, an IDE). Contains one or more clients.
- **Client** — a connection to a specific MCP server. Manages its lifecycle.
- **Server** — a program exposing tools, resources, or prompts. Local (stdio) or remote (HTTP/SSE).

The Host / Client lives on the user's side. The Server can live anywhere — local process, remote endpoint, cloud service.

## What a server exposes

Every server can expose some or all of:

- **Tools** — callable functions (\`create_issue\`, \`query_db\`, \`send_message\`). The AI decides when to call them.
- **Resources** — readable data sources (files, records, knowledge bases). The AI can read them into context.
- **Prompts** — user-selectable templates (\`/run-report\`, \`/draft-pr-description\`). Users pick them; the server returns a prepared prompt.

Most servers start with just tools, then add resources.

## Transport

Two main transports:

- **stdio** — local process, pipes in/out. Fastest, simplest for developer-machine tools.
- **HTTP + SSE** — remote server; supports streaming. Used for hosted services (Linear's MCP, Slack's MCP, etc.).

## A minimal TypeScript server

\`\`\`ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const server = new Server({ name: 'demo', version: '0.1.0' }, { capabilities: { tools: {} } })

server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'add',
    description: 'Add two numbers',
    inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a','b'] },
  }],
}))

server.setRequestHandler('tools/call', async (req) => {
  if (req.params.name === 'add') {
    const { a, b } = req.params.arguments as { a: number; b: number }
    return { content: [{ type: 'text', text: String(a + b) }] }
  }
  throw new Error('Unknown tool')
})

await server.connect(new StdioServerTransport())
\`\`\`

That's a complete, valid MCP server.

## Wiring it into Claude Code

In \`.claude/mcp.json\`:

\`\`\`json
{
  "mcpServers": {
    "demo": {
      "command": "node",
      "args": ["./servers/demo.js"]
    }
  }
}
\`\`\`

Claude Code launches the process, lists its tools, and exposes them to the agent.

## When MCP beats a custom integration

- **Portability.** The same server works in Claude Code, Claude Desktop, Cursor, and any future MCP host.
- **Ecosystem.** Hundreds of existing servers (databases, Git, Slack, Notion, calendars, search).
- **Auth + security are pushed to the server.** The AI never sees your credentials directly.

## When to skip MCP

- **One-off tool use inside your own app.** Use the Agent SDK's native tool facility directly; no protocol overhead needed.
- **Very latency-sensitive loops.** JSON-RPC + process boundaries add ms; tight inner loops should stay in-process.

## Sources

- [Model Context Protocol — main site](https://modelcontextprotocol.io/)
- [MCP — specification](https://spec.modelcontextprotocol.io/)
- [MCP — SDK repos (TS + Python)](https://github.com/modelcontextprotocol)
- [Anthropic — MCP announcement](https://www.anthropic.com/news/model-context-protocol)
`.trim(),
  },
]
