# Component Isolation Patterns — Reusable Animation Systems

Distilled from Radix UI, Headless UI, Mantine, Framer Motion, GSAP. Last updated 2026-04-25.

## The core contract

**Animation component declares WHAT it animates; consumer provides WHEN.**

```tsx
// Animation is a pure function of state
const AnimatedAtom = ({ isOpen, children }) => (
  <motion.div animate={{ opacity: isOpen ? 1 : 0 }} transition={{ duration: 0.3 }}>
    {children}
  </motion.div>
)
```

Component owns: choreography (what plays), timing curves, visual mechanics.
Consumer owns: trigger state, mount point, end-effect handling.

## Choreography preset library pattern

Both Framer Motion (variants) and GSAP (Timeline + labels) name animation states/sequences:

**Framer Motion variants:**
```tsx
const atomVariants = {
  initial: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1 },
  hover: { scale: 1.1 },
}
```

**GSAP Timeline + labels:**
```ts
const tl = gsap.timeline()
tl.add("start", 0)
  .to(".atom", { scale: 1, opacity: 1 }, "start")
  .add("complete", "+=0.5")
```

**Why named presets > raw duration/delay:**
- Discoverable
- Versionable
- Shareable across instances
- Self-documenting

## Provider vs Context vs prop-drilling

| Scenario | Best pattern | Why |
|---|---|---|
| Single instance (topbar atom) | Prop drilling | Predictable. Context overhead unjustified. |
| Modal-triggered animation | Local state + ref | Triggered by modal lifecycle, not global. |
| 5 components coordinating | **EventTarget** (NOT Context) | Context re-renders all consumers on every state change. EventTarget broadcasts without re-render overhead. |

**Critical:** Never use Context for animation state that changes every frame. Re-render storm.

## Imperative vs declarative trigger API

**Default declarative** (state boolean → animate). Easier to test, audit, reason about.

**Imperative escape hatch** for "fire this animation right now without changing app state":

```tsx
const atomRef = useRef(null)
useImperativeHandle(ref, () => ({
  play: () => gsap.to(...),
}))

// Consumer:
const triggerAnimation = () => atomRef.current?.play()
```

**When imperative wins:** error shake, success pulse — visual responses where state shouldn't persist.

## Decoupling "what plays" from "where it plays"

**Choreography = pure data**, independent of mounting point:

```tsx
const atomChoreography = {
  enter: { duration: 0.4, easing: "easeOut" },
  exit: { duration: 0.2 },
  hover: { scale: 1.05 },
}

<AnimatedAtom motion={atomChoreography} trigger={isOpen}>...</AnimatedAtom>
```

Store choreographies in separate module. Import where needed. Swap without touching component code. Enables design-token changes, A/B testing, theme-specific motion curves.

## Trigger ↔ effect decoupling

**EventTarget pattern (browser-native, no library):**

```ts
const animationBus = new EventTarget()

// Component A fires:
animationBus.dispatchEvent(new CustomEvent('quiz-complete', { detail: { score: 95 } }))

// Component B (unrelated) listens:
useEffect(() => {
  const handler = (e) => {
    // Trigger convergence animation
  }
  animationBus.addEventListener('quiz-complete', handler)
  return () => animationBus.removeEventListener('quiz-complete', handler)
}, [])
```

**Why not Redux/Context:** triggers re-renders. EventTarget: zero render overhead, broadcasting is free.

## Type design (discriminated unions)

Prevent misconfiguration at compile time:

```ts
type Phase =
  | { type: 'orbit';    shape: 'circular' | { rx: number; ry: number }; duration: number }
  | { type: 'straight'; target: TargetSpec; duration: number }
  | { type: 'spiral';   target: TargetSpec; duration: number; revolutions?: number }
  | { type: 'pause';    duration: number }
  | { type: 'burst';    intensity: number; duration: number }
```

TypeScript narrows on `type` field. Try to use `straight.shape` → compile error. Forget a phase type in a switch → exhaustiveness check fails.

## Versioning & migration

**Pattern: optional expansion (not breaking changes)**

```ts
type AtomChoreography_v1 = { enter: {...}, exit: {...} }
type AtomChoreography_v2 = AtomChoreography_v1 & {
  converge?: {...}  // NEW, optional
}

// Adapter for old consumers
const migrate = (old: v1): v2 => ({
  ...old,
  converge: { duration: 0.6 } // sensible default
})
```

Add optional fields. Deprecate old ones slowly with warnings. Never remove. Semver: PATCH for defaults, MINOR for new optional phases, MAJOR only for removing required phase (rare).

## Sources

- Motion (Framer Motion) docs
- GSAP Timeline Documentation
- Radix UI Primitives
- Maxime Heckel: Advanced Animation Patterns with Framer Motion
- React: useImperativeHandle
- Discriminated Unions in TypeScript (LogRocket)
- Event Emitters for Component Communication
- API Versioning and Backward Compatibility
