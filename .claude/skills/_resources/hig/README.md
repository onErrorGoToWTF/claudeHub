# `hig/` — older Apple Human Interface Guidelines foundations

Interaction behaviors, gesture vocabulary, layout conventions, and accessibility principles that predate Liquid Glass but still inform how Apple-native behavior should feel. Use these files for **behavior** questions (tap targets, swipe semantics, sheet presentation, VoiceOver). Use `liquid-glass/` for **material** / glass / visual-language questions.

## TL;DR

- **Tap targets:** ≥ 44×44 points minimum.
- **Destructive swipe:** trailing side (right-to-left gesture).
- **Never override system gestures:** edge swipe back, notification pull-down, Control Center, home.
- **Dynamic Type:** use semantic text styles (`.body`, `.headline`, `.caption`), not hardcoded sizes.
- **Reduce Motion / Transparency / Bold Text:** system-level toggles; respect all three.
- **Color:** never convey info by color alone; pair with text / icons / shapes.

## Files in this folder

| File | What's in it |
|---|---|
| `layout.md` | Safe areas, tap target 44×44 rule, thumb zone, responsive sizing |
| `gestures-and-drag.md` | Tap, swipe, long-press, drag/drop, reorder, swipe-action direction semantics |
| `modality.md` | Sheets, popovers, action sheets, dismiss conventions |
| `motion.md` | Easing curves, durations, reduced-motion behavior |
| `typography.md` | Dynamic Type, semantic text styles, custom font scaling |
| `color.md` | System colors, Dark Mode adaptation, contrast requirements |
| `materials.md` | System materials (thin / regular / thick / ultra), vibrancy |
| `accessibility.md` | VoiceOver, Bold Text, Reduce Motion, Switch Control, semantic labels |
| `community-extras.md` | Workarounds Apple doesn't document (sindresorhus + ehmo) |
| `resources.md` | External links |

## When to load what

- UI handling a new interaction (tap / swipe / drag) → `gestures-and-drag.md` + `layout.md`
- New sheet / modal / popover → `modality.md`
- Accessibility audit → `accessibility.md` (+ `typography.md` for Dynamic Type + `color.md` for contrast)
- Designing a new animation → `motion.md`
- Edge case / "Apple doesn't document this" situation → `community-extras.md` first
- Full audit → all files (~2000 lines budget)
