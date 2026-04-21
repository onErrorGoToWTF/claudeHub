import type { LibraryItem } from './types'

const NOW = Date.now()
const L = (n: number) => NOW - n * 86400_000

/**
 * Curated, concise in-app notes distilled from the old project's research cache
 * (.claude/skills/_resources/). Each body is a short, scannable summary — not a
 * full reproduction of the source. Use the `url` to jump to the authoritative
 * page; use the body to skim before doing that.
 */
export const libraryNotes: LibraryItem[] = [
  {
    id: 'n.hig-motion',
    kind: 'document',
    title: 'Apple HIG — Motion & Reduced Motion',
    summary: 'How Apple thinks about animation: short, precise, meaningful. Plus the three reduced-motion levels and the ms values worth knowing.',
    url: 'https://developer.apple.com/design/human-interface-guidelines/motion',
    tags: ['design', 'motion', 'apple'],
    pinned: true,
    addedAt: L(2),
    body: `
# Motion & reduced motion

Apple's motion philosophy is short: **quick, precise, meaningful**. Animation conveys relationship, hierarchy, or state change — never decoration.

## The three principles

- **Motion has meaning.** If an animation can be removed without losing information, remove it.
- **Brevity + precision.** "Animations that combine brevity and precision tend to feel more lightweight and less intrusive."
- **Sequence, don't stack.** Multiple effects chain cleanly — one layer owns each time slot.

## Reduced Motion — three levels to support

1. **Full motion** — default.
2. **Reduced, status still shown** — replace parallax / scale / translate with dissolve, crossfade, or color shift. Preserve the *information* the motion carried.
3. **Absolute minimum** — static state change only.

Never leave content mid-transition when reduced-motion is active.

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

Apple's HIG does **not** publish ms values. These are community-surveyed from UIKit defaults.

- Tap / press state — 100–150 ms
- Hover highlight — 150–200 ms
- Tab crossfade — ~180 ms
- Sibling translation (drag reorder) — 180–220 ms
- Modal dismiss — 250–350 ms
- Sheet slide-up — 300–400 ms
- Long-press activation — 500 ms

Treat as directional. Apple leaves exact numbers out on purpose — they want *feel*, not mechanical adherence.
`.trim(),
  },

  {
    id: 'n.liquid-glass-fundamentals',
    kind: 'document',
    title: 'Liquid Glass — Fundamentals',
    summary: 'Apple\'s 2025 material. What it is, the three layers, the material variants, and what actually ports to web.',
    url: 'https://developer.apple.com/documentation/technologyoverviews/liquid-glass',
    tags: ['design', 'glass', 'apple'],
    pinned: true,
    addedAt: L(3),
    body: `
# Liquid Glass — fundamentals

Apple's words: "a new dynamic material ... which combines the optical properties of glass with a sense of fluidity ... translucent, and behaves like glass in the real world. Its color is informed by surrounding content and intelligently adapts between light and dark environments."

## The effects that compose it

- **Translucency** — foreground lets background show through.
- **Lensing** — glass *bends* light, it doesn't scatter it. (Different from traditional blur.)
- **Reflection** — picks up ambient content + wallpaper around it.
- **Specular highlights** — real-time highlights that track device motion.
- **Adaptive shadows** — shadow depth tracks how far the surface sits above the content.
- **Fluid motion** — elements behave like a drop of liquid on motion.

## The three-layer model (load-bearing)

1. **Content layer** — your lists, photos, text. **No glass.**
2. **Functional layer** — nav bars, tab bars, floating buttons, toolbars. **This is where glass lives.**
3. **Overlay / vibrancy** — text + icons + fills on top of glass. Automatic vibrancy.

Over-applying glass to the content layer dilutes the effect. This is why Apple's rule is *no glass on glass*.

## Material variants

- **\`.regular\`** — default. Toolbars, nav, standard controls.
- **\`.clear\`** — high transparency. Only over media-rich content, when a dim layer is tolerable, and the text on top is bold + bright.
- **\`.identity\`** — disables glass entirely (conditional fallback).

## What ports to web

- Translucency, lensing (backdrop-filter blur + saturate), adaptive shadow, static specular highlight — yes.
- Real device-motion-coupled specular — not without permission prompts. A static inset highlight is the honest stand-in.
- Apple's "no glass on glass" is a useful guardrail — treat floating nav + floating panels as *one* glass surface, not stacked glass.
`.trim(),
  },

  {
    id: 'n.linear-workflow',
    kind: 'document',
    title: 'Linear — Project workflow patterns',
    summary: 'How Linear models work: state transitions over gamification. Issue states, project states, health signals, milestones, and why status updates are deliberately manual.',
    url: 'https://linear.app/docs/configuring-workflows',
    tags: ['product', 'workflow', 'linear'],
    pinned: true,
    addedAt: L(4),
    body: `
# Linear — workflow patterns

Linear's thesis: **progress is a state transition, not a score**. Every issue lives in one state; every project lives in one state. Make the states unambiguous at a glance; let them roll up without extra work.

No XP. No streaks. No mascots. This is the direct spiritual ancestor of the look I want.

## Issue states

Default flow — \`Backlog → Todo → In Progress → Done → Canceled\`. A sixth \`Triage\` category acts as an inbox for integrations.

- **Backlog** — where new issues land.
- **Todo** — unstarted work.
- **In Progress** — active work.
- **Done** — complete.
- **Canceled** — rejected / dismissed (duplicates also land here).

Statuses can be renamed and recolored, and rearranged *within* a category. Categories themselves can't be reordered.

## Project states (distinct from issue states)

\`Backlog, Planned, In Progress, Completed, Canceled\`.

**Key rule:** project status is updated *manually*. Even if 100% of issues are Done, the project stays \`In Progress\` until the lead marks it shipped. The lifecycle badge is a human claim, not a metric.

## Health indicators

Orthogonal to lifecycle: \`On track\` / \`At risk\` / \`Off track\`. A project can be \`In Progress\` + \`At risk\` at the same time.

Every update pairs a **health pill** (at-a-glance signal) with a **rich-text description** (the why). Both are load-bearing — the pill fails the context test alone, the description fails the scan test alone.

## Milestones

A diamond icon. The active milestone gets a yellow diamond; completed ones fill in. Each milestone shows its own completion %.

## Update cadence

Reminders are scheduled (e.g. weekly / biweekly, specific day + time). Project leads get nudged in their local timezone. If they miss the window, follow-up nudges fire at +1 day and +2 working days.

## What to port

- Lifecycle badge on Projects.
- Health pill + short narrative on status updates.
- Manual state updates — don't auto-flip \`In Progress → Done\` on completion.
- Activity feed that *collapses* property-change events and keeps human updates prominent.
`.trim(),
  },
]
