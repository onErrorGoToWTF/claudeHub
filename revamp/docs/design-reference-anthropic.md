# Design reference — Anthropic "Research Preview" video

Captured from screenshots the user shared on 2026-04-20 as the target vibe.

## What stands out
- **Serif hero.** "What will you try next?" and "Let's knock something off your list" are set in a transitional serif (Anthropic's Tiempos family). Sans everywhere else. The serif is reserved for emotional/aspirational hero moments, not body copy.
- **Greige canvas with subtle grid.** Background is the same greige we're already using, with a very faint grid overlay on app surfaces. Feels drafting-table / blueprint.
- **Tight radii, soft shadows.** Cards and chips use ~12–16px radii, no tight pills. Shadow is a whisper — `0 1px` hair + a wide soft drop. No neon.
- **Numbered keyboard-shortcut pills.** List rows show a small numbered pill at the far right (`1`, `2`, `3`, `4`). Hints you can press the key. Greige-on-greige, very quiet. This is a signature Anthropic UX motif.
- **Row hover = filled, not outlined.** Selected/hovered row gets a subtle greige-tinted fill, not a border stroke. Keeps hierarchy calm.
- **Orange as rare accent.** A single orange lightning-bolt above the hero. Everything else is black-on-cream. The orange earns attention precisely because it's used once.
- **Icon cards.** "Create a file / Crunch data / Make a prototype" grid uses white cards with a thin hairline, small monochrome icon top-left, label right. Hovered tile fills greige, same logic as list rows.
- **Tiny animations.** The user noted this. Things move in with short, restrained transitions — nothing that announces itself. Likely 200–320ms, ease-out premium curves. Cursor cameo is the big tell that motion is intentional.

## Specific things to port into the revamp
- Add a **serif display family** (Tiempos-adjacent: `"Source Serif 4"`, `"Newsreader"`, or `"Lora"` via Google Fonts) and swap it in on page-header `<h1>` only. Keep body sans.
- Add a **subtle grid background overlay** on full-page empty states and hero moments. Fixed `background-image` with a very-low-contrast grid.
- On the **Projects intake flow**, add numbered shortcut pills (`1`, `2`, `3`, `4`) to each route/option row + wire `1–4` keypresses to pick.
- On **list rows** site-wide, switch selected state from accent-border to a greige-tinted fill — reserve the accent for true affordances (primary CTAs, progress, mastery).
- Use **the accent color sparingly** — keep indigo as the "earn-it" accent on CTAs and progress, not on every hover/active state.
- Add a **tiny accent glyph** (our mark, a sparkle, a circuit node) above empty-state heroes like the Anthropic lightning bolt — orients without crowding.

## Out of scope (for now)
- Three-column icon-card grid is already close to what Dashboard does with Tile; don't duplicate.
- Don't pull Anthropic's exact color values — our greige + indigo system is already aligned.
