# Pointer to Active Architecture Plan

The full electron/atom system architecture plan lives at:

```
C:\Users\alany\.claude\plans\atom-system-architecture.md
```

This is a separate document because it's the live working plan; this skill catalog stays stable while the plan evolves.

## Current architecture summary

Three layers of abstraction, each independently importable:

- **ELECTRON** — primitive: head/halo/trail rendering, electron-level timing
- **ATOM** — composition: nucleus + electrons. Nucleus is the moving frame of reference.
- **LOGO** — brand-specific: ATOM + ai wordmark + uni wordmark + settle timing

```ts
worldPosition[i] = nucleus.position + electron[i].relativePosition
```

## Components

```
src/ui/atom/
  ├── Electron.tsx     ← single electron primitive (head/halo/trail)
  ├── Atom.tsx         ← nucleus + electrons composition (the reusable unit)
  └── AtomLogo.tsx     ← wraps <Atom> + wordmark (current logo, refactored)
```

## Status

- **Constants split (ELECTRON / ATOM / LOGO grouping)** — planned, not yet executed
- **`<Atom>` component extraction** — planned
- **Motion policy enforcement** — planned (defaults: prefers-reduced-motion, frameloop=demand, aria-hidden, IntersectionObserver, oneShot)
- **Phase blending math prototype** — gating decision; build at `/labs/atom-blend-test` first
- **First choreography preset (quizModalReward)** — when use case arrives

## Key decisions locked

- 5 phase types: orbit / straight / spiral / pause / burst
- Nucleus-as-frame-of-reference model (electrons relative to nucleus)
- Hand-rolled Hermite cubic for blending (vs GSAP) — pending prototype validation
- EventTarget pub/sub for cross-component coordination (NOT Context)
- Three-tier development policy: soft/hard/absolute restrictions

## See also

- Logo defaults block in `revamp/src/pages/LabsAtom.tsx` — current tuned values
- Memory `project_atom_rework_plan.md` — pointer + execution context
