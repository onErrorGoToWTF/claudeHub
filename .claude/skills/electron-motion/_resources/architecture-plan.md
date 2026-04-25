# Pointer to Active Architecture Plan

The full electron/atom system architecture plan lives at:

```
c:\dev\claudeHub\revamp\docs\atom-system-plan.md
```

This is the **source of truth**. Read it before any motion-design work. This pointer file tracks high-level status only.

## Current architecture summary

Three layers of abstraction, each independently importable:

- **ELECTRON** — primitive: head/halo/trail rendering, electron-level timing
- **ATOM** — composition: nucleus + electrons. Nucleus is the moving frame of reference.
- **LOGO** — brand-specific: ATOM + ai wordmark + uni wordmark + settle timing

```ts
worldPosition[i] = nucleus.position + electron[i].relativePosition
```

## Components (shipped)

```
revamp/src/ui/atom/
  ├── constants.ts     ← ELECTRON / ATOM / LOGO / Rgb type alias
  ├── Electron.tsx     ← single electron primitive (head/halo/trail)
  ├── Atom.tsx         ← nucleus + electrons composition (the reusable unit)
  └── AtomLogo.tsx     ← wraps <Atom> + wordmark (current logo, refactored)
```

## Status

- ✅ Constants split (ELECTRON / ATOM / LOGO grouping) — shipped
- ✅ `<Atom>` component extraction — shipped
- ✅ Motion policy enforcement — shipped (`respectReducedMotion`, frameloop=demand, aria-hidden)
- ✅ Phase blending math prototype — shipped at `/labs/atom-blend-test`; validated hand-rolled smoothstep cannot achieve C1 between orbit-like and lerp-like phases. Hermite cubic over a window is required.
- 🔄 5-state model lock-in — in-flight: states + transitions locked in plan; end effects walkthrough next
- ⏳ Lab redesign (HIG-clean controls + always-on HUD) — planned
- ⏳ States lab + Transitions lab as separate diagnostic surfaces — planned
- ⏳ First choreography preset (quiz reward) — gated on use case

## Key decisions locked

- **5 STATE types**: `orbit` / `straight` / `spiral` / `pulsate` / `pause`. Burst, target-hit, activate, fade are END EFFECTS, not states.
- **Composition restrictions**: `spiral.inward` must follow `orbit`; `spiral.outward` must follow an at-point state.
- **Single user-facing knob**: `transitionWindow ∈ [0,1]` controls window length; arc shape is a derived consequence. Smoothness is fixed at max.
- **Dual runtime contract**: every state implements `positionFn` AND `scaleFn` (forced by `pulsate`).
- **Nucleus-as-frame-of-reference** (electrons relative to nucleus).
- **Hand-rolled Hermite cubic** for boundary blending — validated by `/labs/atom-blend-test`.
- **EventTarget pub/sub** for cross-component coordination (NOT Context).
- **Three-tier development policy**: soft / hard / absolute restrictions.

## See also

- `revamp/docs/atom-system-plan.md` — locked design (THIS IS THE SOURCE OF TRUTH)
- `revamp/docs/atom-baseline-2026-04-25.md` — verbatim record of pre-refactor tuned constants
- `revamp/docs/atom-choreography-spec.md` — design spec (synced to 5-state model)
- Memory `project_atom_rework_plan.md` — pointer + execution context
