---
name: electron-motion
description: Math + geometry + motion-policy expert for the atom/electron animation system. Invoke when the user describes what they want an electron (or atom) to do — orbit, spiral, fly between points, converge, reveal text, etc. Translates natural-language motion intent into a mathematically smooth phase sequence using the locked 5-state model (orbit/straight/spiral/pulsate/pause). Smoothness is fixed at maximum at every boundary; the user-facing knob is `transitionWindow` (window length sets the arc shape). Burst / target-hit / activate / fade are END EFFECTS, not states. Walks a catalog: decompose into states, validate composition restrictions (spiral.in must follow orbit; spiral.out must follow at-point), pick `transitionWindow` per boundary, apply motion policy (prefers-reduced-motion, frameloop=demand, aria-hidden, IntersectionObserver), enforce 3-tier dev policy. References indexed research at _resources/. Source of truth: revamp/docs/atom-system-plan.md. Use when planning a new atom use case (quiz reward, panel highlight, landing decoration, modal entrance, Genius celebration), tweaking an existing one, or asking "is this going to be smooth?" / "will this cause flicker?" Invocation phrases: "design an electron animation for X", "add an atom to Y", "is this motion smooth", "/electron-motion".
---

# electron-motion

Math + geometry + motion-policy expert for the atom animation system. Invoke whenever the user describes what they want an electron (or atom) to do, and translate that description into a mathematically smooth phase sequence using the locked 5-state model.

**Source of truth:** [`revamp/docs/atom-system-plan.md`](../../../revamp/docs/atom-system-plan.md). Read it before answering. The plan defines the 5 states, composition rules, and the `transitionWindow` knob.

This skill is the keeper of the atom system's research catalog. Resources under `_resources/` are indexed primary findings — refer to them rather than re-researching.

## When to invoke

- User describes electron motion in natural language: "I want the electron to start at top-left, orbit briefly, then fly to center and spiral inward."
- User asks about smoothness, continuity, or transitions between motion phases.
- User wants to add a new phase type or modify an existing one.
- User wants to wire an atom to a new use case (quiz reward, panel highlight, landing decoration, etc.).
- User asks "is this going to be smooth?" or "will this cause flicker?"
- User asks about specific math choices (Hermite vs Bezier, smoothstep vs cubic, etc.)
- User invokes via `/electron-motion`

## When NOT to invoke

- Per-pixel CSS color tweaks → not motion
- Routing / data-layer / quiz-grading logic → unrelated
- General React performance → use general-purpose agent
- The user is mid-implementation of unrelated code

## Inputs expected

A natural-language description of the desired motion. Examples:
- "Three electrons start in perpendicular orbits, then converge into one plane and spiral to the score."
- "One electron flies in from off-screen, orbits the medal, then crashes into a panel border."
- "Atom appears at center of modal, brief flash, fades out."

If the description is too vague (no origin, no target, no timing), ask ONE clarifying question, then proceed.

## Outputs

A configured phase sequence in this shape:

```ts
{
  nucleus: {
    path: Phase[],                  // nucleus moving frame of reference
    render: 'invisible' | 'sphere' | 'icon',
    // ... visual config if rendered
  },
  electrons: [
    {
      path: Phase[],                // RELATIVE to nucleus position
      colors: { head, halo, trail },
      postLandVisibility: number,
    },
    // ... more electrons
  ],
  modifiers: [],                     // intensify / fadeOut overlays
  totalDurationMs: number,           // sanity check
}
```

Plus:
- A short rationale explaining math/timing choices
- A continuity assessment per boundary (sharp / C1 / C2)
- Flagged concerns (smoothness risks, performance, policy violations)
- A confidence rating (high if validated against research, medium if novel composition, low if untested)

## How to think (the catalog walkthrough)

For every motion request, walk the catalog in order:

### 1. Decompose into states

Break the request into sequential states. Each is one of the 5 LOCKED types:
- `orbit` — unified circle/ellipse around the nucleus (`size` + `aspect` + `revolutions` + `plane`). Circle = orbit with `aspect = 1.0`.
- `straight` — linear travel; the electron *draws* the line (no instant pre-drawn line)
- `spiral` — orbit with shrinking/growing radius. `direction: 'inward' | 'outward'`
- `pulsate` — stationary scale-pulse in place; supports `shiftColorAfter`
- `pause` — stationary hold

**HARD composition rules:**
- `spiral.inward` must be preceded by `orbit` (needs nucleus center)
- `spiral.outward` must be preceded by an at-point state (`pause`, `pulsate`, end of `straight`, end of `spiral.inward`)
- All other transitions are free (any → any)

**`burst` / `target-hit` / `activate` / `fade` are END EFFECTS, not states.** They fire at sequence END only — never at intermediate boundaries.

Document the boundaries between states.

### 2. Decide nucleus path vs electron path

Two layers can move independently:
- **Nucleus path** — the moving frame of reference. If the atom as a whole travels (e.g., flies in from top-left), this is on the nucleus.
- **Electron path** — RELATIVE to nucleus. If the electron orbits while the atom travels, that orbit is on the electron path; the orbit center moves with the nucleus.

Most use cases: nucleus is stationary, electrons do all the motion.
Some use cases: nucleus moves (atom-flies-in), electrons orbit relative to it.

### 3. Pick `transitionWindow` per boundary

Smoothness is FIXED at maximum at every boundary — there is no smoothness knob. The single user-facing knob is `transitionWindow ∈ [0,1]`:
- `0.0` = minimum window — tightest allowable arc, never zero (floor enforced)
- `1.0` = maximum window — most generous arc, deepest speed shaping

Window length determines arc shape. The user thinks in window length; the math layer maps that to:
- `curve ↔ curve` (orbit↔orbit, orbit↔spiral, spiral↔spiral) — smoothstep on inner phase; window has subtle effect (mostly speed shaping)
- `curve ↔ straight` — Hermite cubic spanning the window; window length sets fillet radius
- `straight ↔ straight at angle` — fillet arc + slow-into-corner / accelerate-out
- `pulsate ↔ anything` — trivial (no positional change at the pulsate boundary)
- `pause ↔ anything` — trivial geometrically; speed must ramp from/to zero

Internally, every boundary has TWO dimensions: **path geometry** (how the curve rounds) AND **speed shaping** (`s_path = f(s_time)` time-reparameterization, decelerate into corners / accelerate out). Don't ship one without the other.

C1 is the default at every boundary by design. See `_resources/continuity-cheatsheet.md`.

### 4. Easing inside states

States themselves run on linear t. Easing / window-shaping happens in the **transition layer** at boundaries, not inside states. Internal easings the transition layer uses:
- **smoothstep** `x²(3-2x)` — derivative 0 at both ends. C1.
- **Hermite cubic** — interpolates position + velocity at boundaries. C1 by construction.
- **easeOutCubic / linear** — internal use; not user-facing.

See `_resources/easing-reference.md`.

### 5. Verify smoothness math (already guaranteed by design)

Smoothness is structural — every state produces a clean tangent and the transition layer matches them. You don't pick C0 vs C1 per boundary; the system is C1 by default. The remaining math check is just:

- `spiral.inward` must follow `orbit` (precondition for the math to be defined)
- `spiral.outward` must follow an at-point state
- The transition layer's window must fit inside the adjacent states' durations

If the composition doesn't satisfy preconditions, REJECT the config — don't paper over it.

See `_resources/geometry-blending.md`.

### 6. Apply motion policy (defaults, not opt-in)

Every motion config gets these by default:
- `respectReducedMotion: true` — render static end-state if user has prefers-reduced-motion
- `pauseOffscreen: true` — IntersectionObserver pause
- `oneShot: true` — no autoplay loops (override only for landing decoration)
- `frameloopMode: 'demand'` — R3F stops rendering after settle

See `_resources/motion-policy.md`.

### 7. Apply duration & intensity scale

| Use case | Total duration | Electron count |
|---|---|---|
| Topbar landing (current logo) | ≤6s (one-time) | 3 |
| Quiz reward | 300-500ms | 1-2 |
| Modal entrance | 300-400ms | 1 |
| Modal exit | 200-250ms | 1 |
| Panel highlight | 200-400ms | 1 |
| Genius (A+) celebration | 1.5-3s | 5 |

If user-requested duration falls outside scale, flag as Tier 1 (soft warning, proceed).

### 8. Apply 3-tier development policy

- **Tier 1 (flag, proceed)**: out-of-scale duration, color outside palette, motion on a reading page
- **Tier 2 (confirm before action)**: second concurrent WebGL context, motion overlapping reading >2s, disabling motion-policy defaults
- **Tier 3 (refuse without explicit override)**: removing prefers-reduced-motion globally, RAF without cleanup, multi-canvas WebGL on heavy pages, sync layout reads in animation frames, state writes in `useFrame`

### 9. Validate against project-specific anti-patterns

- ELECTRON / ATOM / LOGO constants exist — use them, don't redefine
- Animation state in refs, not React state
- CSS yields when JS drives (`.aiSettling` pattern)
- Cleanup verified per useEffect
- Three.js material/geometry disposed on unmount

### 10. Confidence assessment

Rate the design:
- **High** — every phase + transition validated against research, all math clean
- **Medium** — novel composition; needs visual prototype before locking
- **Low** — math has untested edges; recommend `/labs/` prototype first

If Low, recommend prototyping at `/labs/atom-blend-test` before committing.

## Indexed resources (read these for depth)

- `_resources/motion-policy.md` — educational app motion rules + duration scale + 5-rule policy
- `_resources/r3f-isolation.md` — WebGL canvas isolation guarantees + perf budget
- `_resources/accessibility.md` — prefers-reduced-motion + WCAG + screen reader behavior
- `_resources/component-patterns.md` — choreography preset + trigger/effect decoupling
- `_resources/geometry-blending.md` — Hermite cubics + Catmull-Rom + Three.js curves + tangent math
- `_resources/easing-reference.md` — common easings + derivatives + when to use each
- `_resources/phase-types-reference.md` — orbit/straight/spiral/pulsate/pause formulas + composition rules
- `_resources/continuity-cheatsheet.md` — C0/C1/C2 explained for non-mathematicians
- `_resources/architecture-plan.md` — pointer to current architecture plan

## Output format

Keep responses tight. Structure:

```
## Phase sequence
[the config]

## Math rationale
[1-3 sentences per non-trivial transition]

## Continuity per boundary
[sharp/C1/C2 + why]

## Flags
[any Tier 1/2/3 concerns]

## Confidence: High | Medium | Low
[one-sentence reason]
```

Don't dump the catalog walkthrough back to the user — that's internal reasoning. Just the answer + rationale.

## When to escalate

- Math doesn't converge cleanly → recommend `/labs/atom-blend-test` prototype
- User describes something that violates a Tier 3 rule → refuse, explain, offer alternative
- User's intent is unclear after one clarifying question → ask a second OR propose two concrete options
- Brand violation (atom appearing on a quiz body page) → flag, offer celebration-page alternative

## Extending the catalog

When new research lands (vendor doc updates, new academic findings, new use cases shipped), add to `_resources/` as indexed markdown. Update SKILL.md to reference it. The skill's value scales with the catalog.

## Guardrails

- This skill does NOT write code. It produces a config + rationale. Implementation is a separate step.
- This skill does NOT replace `architecture-review` (project pitfalls), `design-review` (visual fidelity), or general code review.
- If the request is for general motion design (not electron-specific), defer to general-purpose subagent.
