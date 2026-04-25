---
title: Atom Choreography Spec — POINTER ONLY
status: superseded
supersedes_history: this file used to be the design spec; superseded by atom-system-plan.md on 2026-04-25
last_updated: 2026-04-25
---

# Atom Choreography Spec — POINTER ONLY

This document used to carry the atom-system design spec. As of 2026-04-25 it is superseded by:

[atom-system-plan.md](atom-system-plan.md)

The plan is the **single source of truth** for:

- The 5-state model (`orbit` / `straight` / `spiral` / `pulsate` / `pause`)
- Composition rules (`spiral.inward` must follow `orbit`; `spiral.outward` must follow an at-point state)
- The `transitionWindow` knob and its locked formula (`windowMs = transitionWindow · 0.5 · min(durLeft, durRight)`)
- The four-concept model (start effects + phases + transitions + end effects)
- The unified moment-accent catalog (`target-hit`, `activate`, `burst`, `fade` / `appear`)
- The dual `positionFn` + `scaleFn` runtime contract
- `TargetSpec` shape (`{ space: 'nucleus' | 'canvas' | 'viewport' | 'dom-ref'; value: ... }`)
- The trail invariant (trails dissipate autonomously; `fade` does not touch them)
- Lab page architecture (`/labs/atom-states`, `/labs/atom-transitions`, HUD spec)
- Motion policy (reduced-motion gate, frameloop demand, IntersectionObserver pause)
- All deferred concerns (color system, consumer trigger API, `speedShaping` escape hatch, start-only accents)

## Why this file became a pointer

Prior to consolidation, this spec and the plan diverged twice — first on phase taxonomy, then on the transition vocabulary. Maintaining two parallel specs invited drift even with active syncing. Collapsing this file to a pointer eliminates the divergence surface entirely.

## Skill catalog (also synced to the plan)

The `electron-motion` skill in `.claude/skills/electron-motion/` references the plan as its source of truth. Relevant indexed resources:

- `SKILL.md` — catalog walkthrough
- `_resources/phase-types-reference.md` — state formulas
- `_resources/architecture-plan.md` — pointer + status
- `_resources/component-patterns.md` — discriminated-union types
- `_resources/continuity-cheatsheet.md` — internal C0/C1/C2 vocabulary
- `_resources/easing-reference.md` — curve derivatives
- `_resources/geometry-blending.md` — Hermite cubic math
- `_resources/motion-policy.md` — reduced-motion + duration scale
- `_resources/r3f-isolation.md` — WebGL canvas isolation
- `_resources/accessibility.md` — prefers-reduced-motion / WCAG

If any of those files diverge from the plan, the plan wins.
