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
]
