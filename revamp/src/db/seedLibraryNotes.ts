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

  {
    id: 'n.hig-typography',
    kind: 'doc',
    title: 'Apple HIG — Typography & Dynamic Type',
    summary: 'Use semantic text styles, let layouts reflow up to ~200%, pick SF Pro unless you have a reason not to. The rules that make iOS text feel right at every size.',
    url: 'https://developer.apple.com/design/human-interface-guidelines/typography',
    tags: ['design', 'typography', 'apple'],
    pinned: false,
    addedAt: L(0),
    body: `
**TL;DR** — Use **semantic text styles** (\`.body\`, \`.headline\`, \`.title\`…) so type scales with Dynamic Type, design layouts that can **reflow up to ~200%**, and default to **SF Pro** / system fonts unless you have a reason to diverge.

## Semantic styles, not hardcoded sizes

> Always use semantic text styles rather than hardcoded sizes. These scale automatically with Dynamic Type.

— ehmo platform-design-skills, iOS §3.1 (distilled from Apple HIG)

iOS semantic styles, from largest to smallest: \`.largeTitle\`, \`.title\`, \`.title2\`, \`.title3\`, \`.headline\`, \`.subheadline\`, \`.body\`, \`.callout\`, \`.footnote\`, \`.caption\`, \`.caption2\`.

Use them directly — \`Text("Hi").font(.body)\`. Never \`.font(.system(size: 17))\`; that ignores the user's Dynamic Type preference.

## Dynamic Type can scale to ~200%

> Dynamic Type can scale text up to approximately 200% at the largest accessibility sizes. Layouts must reflow — never truncate or clip essential text.

— ehmo platform-design-skills, iOS §3.2

This means a horizontal row of three chips may need to stack vertically at AX sizes. Use \`ViewThatFits\` or detect \`dynamicTypeSize.isAccessibilitySize\` in SwiftUI and swap layout.

## SF Pro as the default

SF Pro (Text for body, Display for large headers) is the default system face on Apple platforms. It's designed for on-screen reading and tuned for optical sizes. Reach for a custom font only when brand or character demands it — and scale it with Dynamic Type if you do.

## Minimum text sizes

HIG guidance: never go below 11pt for body copy, 10pt for sparingly-used captions. iOS-default body is 17pt — the right starting point for most UI text.

## Web translation

- **Semantic CSS \`font-size\`** keyed to a fluid scale (\`clamp()\`), or variables tied to a \`:root\` scale.
- Respect the user's browser default size — don't set \`html { font-size: 14px }\` without intention.
- Use \`em\` / \`rem\` for type so layouts reflow when the user zooms.

## Sources

- [Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Apple — SF Pro](https://developer.apple.com/fonts/)
- [Apple — Dynamic Type](https://developer.apple.com/design/human-interface-guidelines/typography#Dynamic-Type)
- [ehmo/platform-design-skills](https://github.com/ehmo/platform-design-skills)
`.trim(),
  },

  {
    id: 'n.hig-color',
    kind: 'doc',
    title: 'Apple HIG — Color, Dark Mode & Contrast',
    summary: 'Semantic colors adapt automatically, contrast must hit WCAG AA (4.5:1), and color alone can never carry meaning — a compact pass through the rules that actually matter.',
    url: 'https://developer.apple.com/design/human-interface-guidelines/color',
    tags: ['design', 'color', 'accessibility', 'apple'],
    pinned: false,
    addedAt: L(0),
    body: `
**TL;DR** — Use **semantic system colors** so light/dark adapt automatically, pair **every color cue with a second channel** (icon, text, shape), and meet **WCAG AA contrast** (4.5:1 body, 3:1 large text) — these three rules handle most real-world color work.

## Semantic colors over hardcoded hex

> Use system-provided semantic colors that automatically adapt to light and dark modes.

— ehmo platform-design-skills, iOS §4.1

SwiftUI: \`.foregroundStyle(.primary)\`, \`.foregroundStyle(.secondary)\`, \`Color(.systemBackground)\`. Never \`Color.black\` / \`Color.white\` — they ignore Dark Mode.

Web equivalent: \`color-mix\` + CSS custom properties tied to a theme, or \`light-dark()\` for the simplest cases.

## Never rely on color alone

> Ensure that everyone can perceive and understand the information your app provides — don't rely on color as the only way to convey important information.

— Apple HIG, Color

Red for "error" paired with an X icon. Green for "success" paired with a checkmark. Status conveyed by both color **and** shape, so colorblind users — ~8% of men — don't lose the signal.

## WCAG AA contrast ratios

- **4.5:1** — regular body text against its background.
- **3:1** — large text (≥18pt regular or 14pt bold) and critical UI elements.
- **7:1** — WCAG AAA; aim higher than AA when the context is reading-heavy.

Use a contrast checker; don't eyeball it. Greige on greige backgrounds is where most hand-crafted designs quietly fail AA.

## Three-level background hierarchy

Apple designs surfaces in three tiers:

1. **Base background** — the root surface.
2. **Secondary background** — cards, grouped sections.
3. **Tertiary background** — deeper wells, code blocks, inline containers.

In this app: \`--bg-page\` → \`--bg-canvas\` → \`--bg-card\` / \`--bg-sunken\`. Same pattern.

## One accent color

Apple designs iOS around one tint color per app. Anything interactive inherits it; non-interactive chrome stays neutral. This is why a blue checkbox means "tap me" without any explanation.

This app's \`--accent-base\` serves the same purpose.

## Display P3 wide gamut

On modern displays, Display P3 adds saturation headroom outside sRGB — oranges and greens look punchier. Most OS-level tools work in P3 now; if you're emitting sRGB hex, you're leaving some richness on the table. CSS \`oklch()\` gives you wide-gamut without the manual math.

## Sources

- [Apple HIG — Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Apple HIG — Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [WCAG 2.2 — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WebAIM — contrast checker](https://webaim.org/resources/contrastchecker/)
`.trim(),
  },

  {
    id: 'n.hig-accessibility',
    kind: 'doc',
    title: 'Apple HIG — Accessibility',
    summary: "VoiceOver labels on everything interactive, honor Reduce Motion / Increase Contrast / Bold Text, always provide a non-gesture alternative. The floor every app should clear.",
    url: 'https://developer.apple.com/design/human-interface-guidelines/accessibility',
    tags: ['design', 'accessibility', 'a11y', 'apple'],
    pinned: false,
    addedAt: L(0),
    body: `
**TL;DR** — Every interactive element needs a meaningful label, every gesture needs a non-gesture alternative, every system preference (Reduce Motion, Bold Text, Increase Contrast, Dynamic Type) needs a graceful response — the four rules that cover most accessibility work on real products.

## Label every interactive element

> Every button, control, and interactive element must have a meaningful accessibility label.

— ehmo platform-design-skills, iOS §5.1

- **SwiftUI:** \`.accessibilityLabel("Add to cart")\` on icon-only buttons.
- **Web:** \`aria-label\` on icon-only \`<button>\` / \`<a>\`. Close-X buttons → \`aria-label="Close"\`. Pin / delete / drag handles → explicit labels.

An icon alone tells a sighted user enough; VoiceOver or NVDA cannot read an SVG.

## Logical reading order

> Ensure VoiceOver reads elements in a logical order — not dictated by layout coordinates.

— ehmo platform-design-skills, iOS §5.2

In SwiftUI use \`accessibilitySortPriority\`. On the web, DOM order IS reading order — design your markup so a linear top-to-bottom read makes sense before you style it.

## Honor system preferences

- **Bold Text.** On iOS, users can force stronger weights. Use \`.fontWeight(.bold)\` only for actual emphasis; never to fake \`bold\` with faux-bold rendering that breaks at AX text sizes.
- **Reduce Motion.** Replace parallax / scale / translate with dissolve, color shift, or static state. Never strip the **information** the motion carried.
- **Increase Contrast.** On iOS, this dims lots of transparency. If your UI leans heavily on glass or low-alpha overlays, add a higher-contrast fallback.
- **Dynamic Type.** Layouts reflow up to ~200%. See the Typography note for specifics.

## Every gesture needs an alternative

Swipe-to-delete, pinch-to-zoom, two-finger scroll — all fine as enhancements, none acceptable as the only path.

- Swipe-to-delete → also expose a Delete button on long-press / selection mode.
- Pinch zoom → also a + / − button pair.
- Drag-reorder → also an up/down move control when the user taps a row.

AssistiveTouch, Switch Control, and Voice Control users can't perform complex gestures. The alternative is required, not nice-to-have.

## Color is never the only signal

Pair color with icon or text. See the Color note for why.

## What to test with

- **VoiceOver** (iOS/macOS) / **TalkBack** (Android) / **NVDA** (Windows, free) — turn it on, navigate your app without looking.
- **Reduce Motion** — toggle it in system prefs, re-run key flows.
- **Dynamic Type → Largest** — run through the app at AX5; look for clipped or overlapping text.
- **Contrast checker** — verify every piece of meaningful text against its background.

## Sources

- [Apple HIG — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Apple — VoiceOver guide](https://www.apple.com/accessibility/vision/)
- [WCAG 2.2 — Understanding](https://www.w3.org/WAI/WCAG22/Understanding/)
- [WebAIM](https://webaim.org/)
- [ehmo/platform-design-skills](https://github.com/ehmo/platform-design-skills)
`.trim(),
  },

  {
    id: 'n.hig-layout',
    kind: 'doc',
    title: 'Apple HIG — Layout, Tap Targets & Safe Areas',
    summary: '44×44 hit areas, primary actions in the bottom-third thumb zone, respect every safe-area inset. The spatial floor every mobile UI should clear.',
    url: 'https://developer.apple.com/design/human-interface-guidelines/layout',
    tags: ['design', 'layout', 'mobile', 'apple'],
    pinned: false,
    addedAt: L(0),
    body: `
**TL;DR** — Tappable targets should be **≥ 44×44 pt** including padding, **primary actions** belong near the user's thumb (bottom third of the screen), and every layout should **respect safe-area insets** (notch, Dynamic Island, home indicator) even if that just means reserving the space.

## The 44×44 rule

> Create controls that measure at least 44 points × 44 points so they can be accurately tapped with a finger.

— Apple UI Design Tips

The 44pt minimum applies to the **hit area**, not necessarily the visible element. A 28×28 icon button is fine *if* it sits inside a 44×44 tappable bounding box via padding.

> Place at least 8pt between tappable controls so users don't accidentally hit the wrong target.

— ehmo platform-design-skills, iOS §1.3

## Thumb zone

Modern iPhones are hard to reach top-of-screen with one hand. Put primary actions in the **bottom third**.

- Main action bar / tab bar → bottom of the screen.
- Destructive buttons (delete, wipe) → further from the thumb rest; guard with two-tap confirm.
- Floating action buttons → bottom-right (or bottom-center) by default.

## Safe-area insets

- **Top** — status bar, Dynamic Island, camera notch.
- **Bottom** — home indicator area.
- **Sides** — landscape mode on most iPhones.

Never render content under any of these without intention.

Web translation:

\`\`\`css
.container {
  padding-top: max(16px, env(safe-area-inset-top));
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  padding-left:  max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
}
\`\`\`

Needs \`<meta name="viewport" content="..., viewport-fit=cover" />\` to activate.

## Hit-area padding (web recipe)

\`\`\`css
/* Visible 28×28 icon, 44×44 tap target */
.icon-btn {
  position: relative;
  width: 28px; height: 28px;
}
.icon-btn::after {
  content: '';
  position: absolute; inset: -8px;  /* expands hit area by 8px on all sides */
}
\`\`\`

## Test sizes

- **Narrowest phone:** ~320 px (iPhone SE).
- **Widest phone:** ~430 px (Pro Max).
- **Tablet portrait:** ~768 px.
- **Tablet landscape / small desktop:** ~1024 px.

If the app works cleanly at 320 px and 1024 px, everything in between usually falls out.

## Sources

- [Apple HIG — Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple — UI Design Tips](https://developer.apple.com/design/tips/)
- [ehmo/platform-design-skills](https://github.com/ehmo/platform-design-skills)
`.trim(),
  },

  {
    id: 'n.liquid-glass-web',
    kind: 'doc',
    title: 'Liquid Glass — Web Implementation',
    summary: "Translating Apple's 2025 material vocabulary into CSS. What's high-fidelity on the web (translucency, soft lensing, static specular) vs. what simply doesn't port (device-motion highlights).",
    url: 'https://developer.apple.com/documentation/technologyoverviews/liquid-glass',
    tags: ['design', 'glass', 'css', 'apple'],
    pinned: false,
    addedAt: L(0),
    body: `
**TL;DR** — On the web, Liquid Glass translates to **backdrop-filter blur + saturate** for translucency, a **static inset specular** for the highlight, and — if you want real lensing — an **SVG \`<feDisplacementMap>\`** filter behind \`backdrop-filter: url(...)\`. Most of the motion-coupled magic simply doesn't port; accept the static version gracefully.

## What ports, what doesn't

| Liquid Glass concept | Web equivalent | Fidelity |
|---|---|---|
| Translucency | \`backdrop-filter: blur() saturate()\` | High |
| Lensing / refraction | SVG \`<feDisplacementMap>\` via \`backdrop-filter: url(#...)\` | Medium (no Safari) |
| Static specular highlight | \`box-shadow: inset 0 1px 0 rgba(255,255,255,α)\` | Medium-high |
| Motion-coupled specular | JS pointer / DeviceOrientation (permission prompt) | Low on mobile web |
| Adaptive shadow | \`filter: drop-shadow()\` + hover/scroll state | Medium |
| Scroll edge effect | \`position: sticky\` + gradient mask | High |
| Reduced transparency | \`@media (prefers-reduced-transparency: reduce)\` | Native |

## Blur vs. lensing — the key distinction

**Glassmorphism** (the 2020 trend) uses Gaussian blur — light scatters, background becomes a soft wash.

**Liquid Glass** uses lensing — light bends, background is compressed and optically shifted.

On the web you can get real lensing via SVG filters, but Safari doesn't support \`backdrop-filter: url(...)\`. Feature-detect and fall back:

\`\`\`css
.glass {
  background: linear-gradient(180deg, rgba(255,255,255,0.68), rgba(255,255,255,0.44));
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
          backdrop-filter: blur(18px) saturate(1.2);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.55), 0 1px 0 rgba(20,19,18,0.04);
}
@supports (backdrop-filter: url(#lg-refract)) {
  .glass.with-lensing { backdrop-filter: blur(12px) saturate(1.2) url(#lg-refract); }
}
\`\`\`

## Minimal SVG filter

\`\`\`html
<svg width="0" height="0" style="position:absolute">
  <filter id="lg-refract">
    <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
    <feTurbulence baseFrequency="0.02" numOctaves="1" result="turb" />
    <feDisplacementMap in="blur" in2="turb" scale="10" />
  </filter>
</svg>
\`\`\`

Tune \`stdDeviation\` (blur amount), \`baseFrequency\` (lens granularity), and \`scale\` (displacement strength) to taste.

## Accessibility media queries

- \`prefers-reduced-motion\` — turn off glass animations, keep static state.
- \`prefers-reduced-transparency\` — swap translucent backgrounds for opaque ones.
- \`prefers-contrast: more\` — boost border opacity, raise text contrast.

These should be the **first** thing you wire up, not the last.

## Performance notes

- \`backdrop-filter\` is expensive; don't animate blur radius on every frame.
- Nested glass-on-glass multiplies the cost. Apple's own rule says avoid it anyway.
- On older Android / low-end devices, consider a no-glass fallback using a solid near-white background with a hairline border.

## Sources

- [Apple — Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/liquid-glass/adopting-liquid-glass)
- [conorluddy/LiquidGlassReference](https://github.com/conorluddy/LiquidGlassReference)
- [nikdelvin/liquid-glass (Astro + SVG)](https://github.com/nikdelvin/liquid-glass)
- [MDN — backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
`.trim(),
  },

  {
    id: 'n.khan-dashboard',
    kind: 'doc',
    title: 'Khan Academy — Learning Dashboard patterns',
    summary: "The dashboard-as-homepage thesis, mastery tasks on a daily cadence, achievements inlined (not a separate wall). The minimal end of the learning-app spectrum.",
    url: 'https://blog.khanacademy.org/introducingthe-learning-dashboard/',
    tags: ['learning', 'ux', 'dashboard'],
    pinned: false,
    addedAt: L(0),
    body: `
**TL;DR** — Khan's Learning Dashboard is your personal homepage that tells you what to do *next*, not what you've already done — prescriptive, minimal, and with achievement signals (points, badges, levels) inlined on the dashboard rather than banished to a separate Awards page.

## The framing

> Your personal homepage on Khan Academy — find the best next things for you to do.

— Khan Academy blog

The dashboard is prescriptive ("here's what to do next") rather than descriptive ("here's what you've done"). The dominant UI element is a **recommended task list**, not a leaderboard or analytics panel.

## Composition

- **Recommended tasks** — skills the system picks as optimal for this session. Users can customize; teachers / coaches can contribute.
- **Mastery tasks** — small reviews that unlock daily.
- **Overall progress bar** — real-time across the current course or topic.
- **Points, badges, skill levels** — all visible on the dashboard, updated in real time.

No separate achievements screen. The signal is ambient.

## Mastery tasks + daily cadence

> Mastery tasks on the dashboard unlock daily ... proving what you know over time is a really great way to ensure that you actually remember what you've learned.

— Khan Academy blog

This is **spaced retrieval surfaced as UI**. The learner doesn't need to remember to review; the dashboard offers today's items. It creates **a cadence without a streak** — something to do each day, without the loss-aversion pressure of "don't break your streak."

## What Khan does NOT do

- No streak fires.
- No XP shop.
- No mascot.
- No leaderboard comparisons on the dashboard.

That restraint is exactly what makes Khan the closest analog to a calm, adult-serious learning app. The **mastery tier** carries progress; streak / XP gamification is deliberately absent.

## What to port

- Dashboard-first structure: the home view *is* the prescription for what to work on next.
- Ambient achievements — chips / badges inlined beside the content, not on a dedicated page.
- Mastery tiers (Familiar → Proficient → Mastered) as the progress vocabulary.
- Daily cadence without streak pressure.

## What to leave alone

- Khan's visual density — there's a lot on one page; a quieter layout (this app's direction) works better for adult users.
- Explicit points as a currency — progress-bar fill already carries the signal.

## Sources

- [Introducing the Learning Dashboard — Khan blog](https://blog.khanacademy.org/introducingthe-learning-dashboard/)
- [Khan Academy — parent dashboard](https://support.khanacademy.org/hc/en-us/articles/360039664491)
- [Khan Academy — teacher reporting](https://support.khanacademy.org/hc/en-us/articles/360031129891)
- [Khan Academy](https://www.khanacademy.org/)
`.trim(),
  },

  {
    id: 'n.hig-gestures',
    kind: 'doc',
    title: 'Apple HIG — Gestures, Drag & Swipe Actions',
    summary: "The standard gesture vocabulary, system gestures you can't override, and the directional semantics for swipe actions (trailing = destructive, leading = contextual).",
    url: 'https://developer.apple.com/design/human-interface-guidelines/gestures',
    tags: ['design', 'interaction', 'gestures', 'apple'],
    pinned: false,
    addedAt: L(0),
    body: `
**TL;DR** — Use the standard gesture vocabulary users already know (tap, long-press, swipe, pinch), never override the system gestures (back-swipe, home, notification pull), and keep swipe-action direction semantic — **trailing for destructive**, **leading for contextual**.

## The standard vocabulary

| Gesture | Standard meaning |
|---|---|
| Tap | Primary action, selection |
| Long press | Context menu, preview, drag lift |
| Swipe horizontal | Delete (trailing), archive/pin (leading), back (left edge) |
| Swipe vertical | Scroll, dismiss sheet (down) |
| Pinch | Zoom |
| Two-finger rotate | Rotate content |

Stick to these. Custom gestures are discoverability traps.

## System gestures you cannot override

- **Swipe from left edge** → back navigation.
- **Swipe down from top-left** → Notification Center.
- **Swipe down from top-right** → Control Center.
- **Swipe up from bottom** → home / app switcher.

Any UI that fights these breaks fundamental navigation.

## Swipe-action direction semantics

> The trailing edge is reserved for destructive actions (Delete). The leading edge is for contextual actions (Pin, Archive, Mark as Read).

— Apple HIG, Lists and Tables (distilled)

- Swipe **left-to-right** on a row → contextual actions reveal on the leading side.
- Swipe **right-to-left** on a row → destructive action reveals on the trailing side.

Mail's swipe-to-delete matches this; every good iOS list follows it.

## Drag-and-drop

- **Lift state** — source item scales up slightly (~1.04), shadow grows, surface brightens. Never darkens.
- **Drop target feedback** — the destination highlights as the drag enters it.
- **Drop animation** — the item settles into place with a brief spring; don't just snap.
- **Cancel gesture** — releasing outside a valid drop target should return the item to its origin.

## Long-press

On iOS, the standard long-press duration is ~500ms. Uses:

- Reveal a context menu.
- Preview a piece of content.
- Initiate a drag lift.

Don't reuse long-press for arbitrary actions users can't discover.

## Every gesture needs an alternative

Swipe-to-delete users who can't swipe (motor impairment, external keyboard, Switch Control) need a Delete button too. See the Accessibility note.

## Sources

- [Apple HIG — Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures)
- [Apple HIG — Drag and Drop](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop)
- [Apple HIG — Lists and Tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
- [ehmo/platform-design-skills](https://github.com/ehmo/platform-design-skills)
`.trim(),
  },

  {
    id: 'n.hig-materials',
    kind: 'doc',
    title: 'Apple HIG — System Materials (ultraThin → ultraThick)',
    summary: "The named translucent-blur levels pre-Liquid-Glass — Ultra Thin, Thin, Regular, Thick, Ultra Thick — and how vibrancy automatically adapts text that sits on them.",
    url: 'https://developer.apple.com/design/human-interface-guidelines/foundations/materials',
    tags: ['design', 'materials', 'glass', 'apple'],
    pinned: false,
    addedAt: L(0),
    body: `
**TL;DR** — Apple's **named materials** (\`ultraThin\` → \`ultraThick\`) are pre-tuned translucent-blur backgrounds — pick the level by how much content-behind visibility you want, and **vibrancy** handles legible text on top automatically. Liquid Glass (2025) is a separate material category that sits atop this older family.

## What a material is

> A material imparts translucency and blurring to a background, creating a sense of visual separation between foreground and background layers.

— Apple HIG, Materials (aggregated)

Think of it as a physical layer — glass that blurs what's behind it so text and controls sitting on top stay legible.

## The five named levels

| SwiftUI | UIKit | Feel | Typical use |
|---|---|---|---|
| \`.ultraThinMaterial\` | systemUltraThinMaterial | Softest blur | Small floating controls — content behind still clearly visible |
| \`.thinMaterial\` | systemThinMaterial | Subtle | Tab bars, nav bars where content continuity matters |
| \`.regularMaterial\` | systemMaterial | Standard | **Default.** Sheets, popovers, sidebars |
| \`.thickMaterial\` | systemThickMaterial | Heavy blur | Modal overlays where focus fully shifts |
| \`.ultraThickMaterial\` | systemUltraThickMaterial | Nearly opaque | Rare; high-focus contexts |

Apple doesn't publish the exact blur/opacity values — they're tuned per-platform and per-context.

## Vibrancy

When text or icons sit on a material, apply a **vibrancy** color instead of a flat color. Vibrancy blends the foreground with the material behind, lifting the content's tone toward what's legible on that specific backdrop.

- SwiftUI: \`.foregroundStyle(.primary)\` / \`.secondary\` / \`.tertiary\` already carries vibrancy on material backgrounds.
- UIKit: \`UIVisualEffectView\` with \`UIVibrancyEffect\`.

## Dark Mode adaptation

All materials auto-adapt. \`.regularMaterial\` in light mode looks near-white; in dark mode, dark-translucent. You don't write two variants.

## Relationship to Liquid Glass

Liquid Glass (introduced 2025) is a **new material category** with explicit lensing, specular highlights, and motion response — not a replacement. Older materials still exist for:

- Apps not yet rebuilt on iOS 26+.
- System surfaces Apple hasn't migrated.
- Contexts where Liquid Glass is inappropriate (content-layer blurs, dense text backdrops).

Most UIs in the 2026 era use BOTH — Liquid Glass for the nav / functional layer, named materials for secondary surfaces (sheets, popovers).

## Web equivalent

CSS \`backdrop-filter: blur() saturate()\` with tuned values:

\`\`\`css
.ultra-thin { backdrop-filter: blur(8px)  saturate(1.1); background: rgba(255,255,255,0.35); }
.thin       { backdrop-filter: blur(12px) saturate(1.15); background: rgba(255,255,255,0.5); }
.regular    { backdrop-filter: blur(18px) saturate(1.2);  background: rgba(255,255,255,0.65); }
.thick      { backdrop-filter: blur(28px) saturate(1.25); background: rgba(255,255,255,0.8); }
\`\`\`

Tune opacity against your ambient bg tone. Pair with an inset 1px top-edge white highlight for the specular feel.

## Sources

- [Apple HIG — Materials](https://developer.apple.com/design/human-interface-guidelines/foundations/materials)
- [Apple HIG — Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [MDN — backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
`.trim(),
  },

  {
    id: 'n.quizlet-learn',
    kind: 'doc',
    title: 'Quizlet — Learn mode & tri-state progress',
    summary: "The least ambitious progress tracking of the major learning apps — tri-state completion (not started / started / finished) + adaptive per-term loop — and that restraint is the whole lesson.",
    url: 'https://quizlet.com/',
    tags: ['learning', 'ux', 'progress'],
    pinned: false,
    addedAt: L(0),
    body: `
**TL;DR** — Quizlet tracks progress with a simple **tri-state** (not started / started / finished) at the set level, plus an **adaptive per-term loop** inside Learn mode — no streaks, no XP, no mascot. The restraint is the lesson; most apps over-build this.

## Tri-state at the set level

Every study set lives in one of three states:

- **Not started** — no terms reviewed.
- **Started** — partial progress; a progress bar fills as terms cross thresholds.
- **Finished** — all terms reviewed to completion; a small green check appears on the set tile.

Five states is theatre when the question is just "has the user engaged with this or not?"

## The set-tile signal

- Small **green checkmark** on completion — ambient, not celebratory.
- Progress bar for in-progress sets (terms-reviewed / terms-total).
- The list view stays scannable because progress is encoded on every tile, not in a separate stats surface.

## Learn mode — adaptive per-term

Inside a set, Learn mode tracks per-term difficulty:

- Every term starts "unseen."
- Correct answers advance it toward "known."
- Wrong answers reset / demote it.
- Hard terms return more often; easy terms fade out of the loop.

This is classic spaced retrieval, served as an interactive loop rather than a daily-review queue (Khan's pattern).

## What Quizlet does NOT do

- No streak fire / day counter.
- No XP store / cosmetics.
- No mascot.
- No social leaderboard on the Learn surface.

(The app *does* have gamified modes — Match, Gravity, Live — but these are side-modes, not load-bearing.)

## What to port

- **Tri-state is enough** for engagement-level progress on any browseable content list.
- **Ambient completion check** on the list item — not a celebratory popup.
- **Per-term adaptive loop inside a quiz** — if a user gets a concept wrong, it returns sooner.

## What to leave

- Quizlet's set-creator UX is aimed at students memorizing vocabulary; it doesn't generalize.
- The gamified side modes are a distraction for an adult-serious learning app.

## Sources

- [Quizlet — main site](https://quizlet.com/)
- [Quizlet — Learn mode announcement](https://quizlet.com/blog/new-a-smarter-learn-mode)
- [Quizlet — Class Progress](https://help.quizlet.com/hc/en-us/articles/360030512432)
`.trim(),
  },

  {
    id: 'n.prompt-eng',
    kind: 'doc',
    title: 'Prompt Engineering — Anthropic\'s playbook',
    summary: 'What Claude responds to best: specificity, structure, examples, role + context framing, and a handful of techniques (XML tags, chain-of-thought, prefilled responses) that compound across long prompts.',
    url: 'https://docs.claude.com/en/docs/build-with-claude/prompt-engineering',
    tags: ['claude', 'prompting', 'beginner'],
    pinned: true,
    addedAt: L(0),
    body: `
**TL;DR** — Good Claude prompts are **specific, structured, example-bearing, and context-carrying**. Anthropic's techniques — XML tags, chain-of-thought, prefilling, multi-shot examples — each compound; combine them for long or high-stakes prompts and reach for simpler ones for quick chats.

## The four levers that matter most

- **Specificity.** "Summarize this" → "Summarize this 600-word post into three bullets aimed at a product manager who hasn't read the article."
- **Structure.** Break your prompt into sections. Claude responds to structure as meta-information.
- **Examples.** One or two good examples beat a page of abstract instructions.
- **Context.** Tell Claude who it is, who the audience is, and what the output is for.

## XML tags — the signature Claude move

Claude was trained heavily on XML-tagged content. Structure your prompts with tags and Claude's adherence jumps sharply.

\`\`\`xml
<context>
You are reviewing pull requests for a React codebase.
</context>

<instructions>
For each diff below, flag anything that could break production.
Be concrete; name files and line numbers.
</instructions>

<diff>
{{paste diff here}}
</diff>
\`\`\`

Tag names are arbitrary — what matters is consistent delineation. Use them when a prompt has multiple parts.

## Chain-of-thought

For complex reasoning, ask Claude to think step by step — but give it a **place** to think:

> Before you answer, write your reasoning inside \`<thinking>\` tags. Then give the final answer outside.

You can also use Claude's built-in **extended thinking** mode (on API + Claude.ai Pro/Max) where the model produces hidden reasoning without cluttering the final answer.

## Prefilling the assistant's response

API only, but powerful: pre-write the start of Claude's reply. It finishes in the shape you started.

\`\`\`json
{
  "role": "assistant",
  "content": "{"
}
\`\`\`

Claude will complete valid JSON from there. Use for any structured output where you want to enforce a shape.

## Multi-shot examples

Beats single-example or zero-shot for anything non-obvious:

> Here are three examples of the style I want:
> 1. "Dense: X happens when Y."
> 2. "Direct: Do X; avoid Y."
> 3. "Technical: X is defined by Y."
> Write five more in that same style for these topics: ...

## Role framing

- "You are a senior editor reviewing a draft..." — changes tone and the errors Claude catches.
- "You are a skeptical investor..." — changes what Claude pushes back on.
- "You are a kindergarten teacher explaining..." — changes vocabulary and pacing.

Role-framing isn't magic; it biases the output distribution in the direction you named.

## Techniques that DON'T help much

- Saying "this is important" without specifying why.
- Threats or emotional loading ("or you'll be shut down"). Claude ignores them.
- Pleading ("please please please"). Specify clearly instead.

## The escape hatch

When a prompt isn't working, before adding more instructions, try **simplifying** — often the prompt is overloaded and Claude is splitting attention across instructions. Strip to one goal and iterate.

## Sources

- [Anthropic — prompt engineering](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering)
- [Anthropic — long-context tips](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/long-context-tips)
- [Anthropic — prompt caching](https://docs.claude.com/en/docs/build-with-claude/prompt-caching)
- [Anthropic — extended thinking](https://docs.claude.com/en/docs/build-with-claude/extended-thinking)
`.trim(),
  },
]
