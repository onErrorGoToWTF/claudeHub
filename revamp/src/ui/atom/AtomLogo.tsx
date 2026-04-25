import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import * as THREE from 'three'
import { Atom } from './Atom'
import { ATOM, LOGO, type Rgb } from './constants'
import { easeOutCubic, type OrbitConfig, type Plane } from './Electron'
import s from './AtomLogo.module.css'

const ORBITS: OrbitConfig[] = [
  { plane: 'xy', speed: ATOM.orbit.speed, phase: 0,                 laps: 3.5, postLandVisibility: 0 },
  { plane: 'yz', speed: ATOM.orbit.speed, phase: (2 * Math.PI) / 3, laps: 5,   postLandVisibility: 0.33 },
  // Final electron gets a gentler spiral via custom settleDurationT (3π
  // = 1.5 laps) and smoothstep easing so the orbit→spiral handoff has
  // no velocity discontinuity.
  {
    plane: 'xz',
    speed: ATOM.orbit.speed,
    phase: (4 * Math.PI) / 3,
    laps: 6,
    postLandVisibility: 1,
    settleDurationT: 3 * Math.PI,
    settleEase: 'smoothstep',
  },
]

function rgba(rgb: Rgb, a: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a.toFixed(3)})`
}

function blendRgb(a: Rgb, b: Rgb, t: number): [number, number, number] {
  return [
    Math.round(a[0] * (1 - t) + b[0] * t),
    Math.round(a[1] * (1 - t) + b[1] * t),
    Math.round(a[2] * (1 - t) + b[2] * t),
  ]
}

// Strike 1 is a subtle tap, 2 lands harder, 3+ is the full slam. More
// than three strikes would stay at .aiPulse3.
function pulseClassForStrike(strike: number): string {
  if (strike <= 1) return s.aiPulse1
  if (strike === 2) return s.aiPulse2
  return s.aiPulse3
}

// Project a CSS-pixel point on the canvas to a world coordinate at z=0,
// then invert the group rotation to get local coordinates the Electron
// mesh can use directly. Camera at (0,0,camZ), fov 38°, aspect follows
// canvas DOM rect. Pure math, no three.js scene dependency.
function projectPixelToLocal(
  dotPageX: number,
  dotPageY: number,
  canvasRect: DOMRect,
  camZ: number,
): THREE.Vector3 {
  const dx = dotPageX - (canvasRect.left + canvasRect.width / 2)
  const dy = dotPageY - (canvasRect.top + canvasRect.height / 2)

  const fovRad = (38 * Math.PI) / 180
  const viewHeight = 2 * camZ * Math.tan(fovRad / 2)
  const aspect = canvasRect.width / canvasRect.height
  const viewWidth = viewHeight * aspect

  const worldX = dx * (viewWidth / canvasRect.width)
  const worldY = -dy * (viewHeight / canvasRect.height)

  const world = new THREE.Vector3(worldX, worldY, 0)
  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(
      ATOM.scene.groupRotation[0],
      ATOM.scene.groupRotation[1],
      ATOM.scene.groupRotation[2],
      'XYZ',
    ),
  )
  return world.applyMatrix4(rotationMatrix.invert())
}

// Flash-only style. Three driver states:
//   restProgress=0, progress=0  → fully invisible (text not yet revealed)
//   restProgress=0, progress=1  → bright white strike-flash with glow
//   restProgress=1, progress=*  → debossed/embossed resting state
// Intermediate restProgress blends white→debossed so the settle is smooth.
// Crucially: when restProgress=0 the RGB stays at white, so the CSS
// transition from progress=1→0 (after strikes 1 & 2) is alpha-only and
// the text fades out cleanly without passing through gray.
// `compact` (topbar) drops the multi-layer glow stack. `glowMultiplier`
// (0..1) scales the glow stack independently for the post-strike decay.
function buildAiStyle(
  progress: number,
  onDark: boolean,
  compact: boolean,
  glowMultiplier: number,
  restProgress: number = 0,
): CSSProperties {
  const g = progress
  const gm = glowMultiplier
  const r = restProgress
  if (onDark) {
    // Stays light throughout. Glow dissipates as r→1, top-emboss
    // highlight appears as r→1.
    const colorAlpha = g * 0.95
    const embossAlpha = r * 0.18
    const embossShadow = `0 1px 1px ${rgba(LOGO.ai.color.emboss, embossAlpha)}`
    return {
      color: rgba(LOGO.ai.color.litDark, colorAlpha),
      textShadow: compact
        ? (r > 0 ? embossShadow : 'none')
        : [
            embossShadow,
            `0 0 3px ${rgba(LOGO.ai.color.glow, 0.9 * g * gm * (1 - r))}`,
            `0 0 6px ${rgba(LOGO.ai.color.glow, 0.65 * g * gm * (1 - r))}`,
            `0 0 12px ${rgba(LOGO.ai.color.glow, 0.4 * g * gm * (1 - r))}`,
            `0 0 22px ${rgba(LOGO.ai.color.glow, 0.2 * g * gm * (1 - r))}`,
          ].join(', '),
    }
  }
  // Light mode: stays bright white throughout. Glow dissipates as r→1,
  // dark deboss shadow appears as r→1.
  const colorAlpha = g * 0.98
  const debossAlpha = r * 0.14
  const debossShadow = `0 -1px 1px ${rgba(LOGO.ai.color.deboss, debossAlpha)}`
  return {
    color: rgba(LOGO.ai.color.litLight, colorAlpha),
    textShadow: compact
      ? (r > 0 ? debossShadow : 'none')
      : [
          debossShadow,
          `0 0 3px ${rgba(LOGO.ai.color.glow, 0.9 * g * gm * (1 - r))}`,
          `0 0 6px ${rgba(LOGO.ai.color.glow, 0.65 * g * gm * (1 - r))}`,
          `0 0 12px ${rgba(LOGO.ai.color.glow, 0.4 * g * gm * (1 - r))}`,
          `0 0 22px ${rgba(LOGO.ai.color.glow, 0.2 * g * gm * (1 - r))}`,
        ].join(', '),
  }
}

// Per-letter "University" style. Once `triggered` is true, every letter
// gets an inline color so the neon flash reads white (overriding the
// debossed .university class color). When `restProgress` ramps 0→1, the
// inline color blends to the resting debossed/embossed state.
function buildUniversityStyle(
  triggered: boolean,
  restProgress: number,
  onDark: boolean,
  compact: boolean,
): CSSProperties {
  if (!triggered) return {}
  const r = restProgress
  if (onDark) {
    // Bright (1.0 alpha) → resting (0.55 alpha) — alpha-only blend
    const alpha = 1.0 * (1 - r) + 0.55 * r
    return {
      color: rgba(LOGO.uni.color.litDark, alpha),
      textShadow: r > 0
        ? `0 1px 1px ${rgba(LOGO.uni.color.emboss, r * 0.18)}`
        : 'none',
    }
  }
  // Light mode: blend RGB lit→deboss AND alpha 0.98→restAlpha together
  // so the dim feels like power draining (not just opacity fade).
  const restAlpha = compact ? 0.42 : 0.22
  const blended = blendRgb(LOGO.uni.color.litLight, LOGO.uni.color.deboss, r)
  const alpha = 0.98 * (1 - r) + restAlpha * r
  return {
    color: rgba(blended, alpha),
    textShadow: r > 0
      ? `0 -1px 1px ${rgba(LOGO.uni.color.deboss, r * 0.14)}`
      : 'none',
  }
}

// Live prefers-reduced-motion check. The logo skips the canvas entirely
// when matched and renders the wordmark in its FINAL settled state, so
// "aiUniversity" stays readable without animating.
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function AtomLogo({
  onlyPlane,
  settle,
  compact,
  onDark,
}: {
  onlyPlane?: Plane
  settle?: boolean
  compact?: boolean
  onDark?: boolean
}) {
  const reducedMotion = useReducedMotion()
  const aiRef = useRef<HTMLSpanElement>(null)
  const iRef = useRef<HTMLSpanElement>(null)
  const atomLayerRef = useRef<HTMLDivElement>(null)
  const cellRef = useRef<HTMLDivElement>(null)
  const [aiHalf, setAiHalf] = useState(0)
  const [atomLeft, setAtomLeft] = useState<number | null>(null)
  const [settleTarget, setSettleTarget] = useState<THREE.Vector3 | null>(null)
  const [strikeCount, setStrikeCount] = useState(0)
  const [landedCount, setLandedCount] = useState(0)
  const [pulsing, setPulsing] = useState(false)
  const [glowMultiplier, setGlowMultiplier] = useState(1)
  // After the final strike, "University" reveals letter-by-letter.
  const [universityTriggered, setUniversityTriggered] = useState(false)
  // After University finishes revealing, everything settles to the
  // debossed resting state via this 0→1 ramp.
  const [restProgress, setRestProgress] = useState(0)
  // Mirror restProgress into a ref so the in-Canvas Electron useFrame
  // can read it without re-renders. Used to sync the i-dot electron's
  // post-pulse fade with the University settle.
  const restProgressRef = useRef(0)
  useEffect(() => { restProgressRef.current = restProgress }, [restProgress])

  // Camera closer for the compact logo so the atom fills the smaller canvas.
  const camZ = compact ? 5.5 : 11
  const orbitsForRender = useMemo(
    () => (onlyPlane ? ORBITS.filter((o) => o.plane === onlyPlane) : ORBITS),
    [onlyPlane],
  )
  const totalElectrons = orbitsForRender.length

  // Strike fires slightly before landing (see ELECTRON.strikeLeadT) so the
  // stutter is already mid-cycle when the dot hits the i. The separate
  // landedCount drives the allLanded / permanent-lit logic on the
  // actual landing beat, after the strike has begun.
  const onStrike = useCallback(() => {
    setStrikeCount((c) => c + 1)
  }, [])
  const onLand = useCallback(() => {
    setLandedCount((c) => c + 1)
  }, [])

  // On each landing, fire the .aiPulse flash. 'ai' snaps bright +
  // flickers, then CSS transition either fades it back to debossed
  // (intermediate strikes) or leaves it at full brightness (final strike,
  // when allLanded below is true).
  useEffect(() => {
    if (strikeCount === 0) return
    setPulsing(true)
    const timer = setTimeout(() => setPulsing(false), LOGO.ai.strikePulseMs)
    return () => clearTimeout(timer)
  }, [strikeCount])

  // After the FINAL strike fires, 'ai' stays lit (progress=1). Strikes
  // 1 & 2 set pulsing→true→false, so progress flips 1→0 and the CSS
  // transition fades the text back to invisible (alpha 0). Only the
  // final strike keeps progress=1 permanently.
  const allLanded = settle === true && landedCount >= totalElectrons
  const finalStrike = strikeCount >= totalElectrons
  const progress = pulsing ? 1 : finalStrike ? 1 : 0

  // After the final landing + a short hold at full glow, decay the
  // white glow stack to zero so the wordmark resolves to clean flat
  // white text. Compact (topbar) has no glow to decay — skip.
  useEffect(() => {
    if (!allLanded || compact) return
    let rafId: number | undefined
    const holdTimer = setTimeout(() => {
      const startTime = performance.now()
      const tick = (now: number) => {
        const elapsed = now - startTime
        const p = Math.min(1, elapsed / LOGO.ai.glow.decayMs)
        setGlowMultiplier(1 - easeOutCubic(p))
        if (p < 1) rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
    }, LOGO.ai.glow.holdMs)
    return () => {
      clearTimeout(holdTimer)
      if (rafId !== undefined) cancelAnimationFrame(rafId)
    }
  }, [allLanded, compact])

  // After the final strike's pulse ends, kick off the "University"
  // letter-by-letter reveal (with a small breath so it doesn't step on
  // the strike's brightness flicker).
  useEffect(() => {
    if (!finalStrike || pulsing || universityTriggered) return
    const timer = setTimeout(() => setUniversityTriggered(true), LOGO.uni.revealDelayMs)
    return () => clearTimeout(timer)
  }, [finalStrike, pulsing, universityTriggered])

  // After "University" is fully revealed (all letters lit), wait a beat
  // then ramp restProgress 0→1 to dim everything to the debossed state.
  useEffect(() => {
    if (!universityTriggered) return
    const staggerMs = compact ? LOGO.uni.stagger.compactMs : LOGO.uni.stagger.labsMs
    const totalRevealMs = ('University'.length - 1) * staggerMs + LOGO.uni.flashMs
    let rafId: number | undefined
    const delayTimer = setTimeout(() => {
      const startTime = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - startTime) / LOGO.settle.durationMs)
        setRestProgress(easeOutCubic(p))
        if (p < 1) rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
    }, totalRevealMs + LOGO.settle.delayMs)
    return () => {
      clearTimeout(delayTimer)
      if (rafId !== undefined) cancelAnimationFrame(rafId)
    }
  }, [universityTriggered, compact])

  // First pass: measure 'ai' width + (compact only) the pixel offset of
  // ai's center within the cell, so the atom canvas's `left` can be set
  // to sit the atom's 3D origin over the 'ai' glyphs.
  useLayoutEffect(() => {
    if (reducedMotion) return
    function measure() {
      if (!aiRef.current) return
      const aiRect = aiRef.current.getBoundingClientRect()
      setAiHalf(aiRect.width / 2)
      if (compact && cellRef.current) {
        const cellRect = cellRef.current.getBoundingClientRect()
        setAtomLeft(aiRect.left + aiRect.width / 2 - cellRect.left)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [compact, reducedMotion])

  // Second pass: measure i-dot target. For compact mode we wait for
  // atomLeft to be set (so the canvas has been repositioned over 'ai');
  // for labs mode we wait for aiHalf (so the wordmark has shifted).
  useLayoutEffect(() => {
    if (reducedMotion) return
    if (!settle) return
    if (compact && atomLeft === null) return
    if (!compact && aiHalf === 0) return
    if (!iRef.current || !atomLayerRef.current) return
    const iRect = iRef.current.getBoundingClientRect()
    const canvasRect = atomLayerRef.current.getBoundingClientRect()
    // Empirical font-metric nudges (see LOGO.ai.iDotNudge) place the
    // landings right on the visual dot of the 'i'.
    const dotX = iRect.left + iRect.width / 2 + LOGO.ai.iDotNudge.x
    const dotY = iRect.top + iRect.height * 0.32 + LOGO.ai.iDotNudge.y
    const local = projectPixelToLocal(dotX, dotY, canvasRect, camZ)
    setSettleTarget(local)
  }, [settle, aiHalf, atomLeft, compact, camZ, reducedMotion])

  const cellClass         = compact ? s.cellCompact         : s.cell
  const atomLayerClass    = compact ? s.atomLayerCompact    : s.atomLayer
  const wordmarkLayerClass = compact ? s.wordmarkLayerCompact : s.wordmarkLayer
  const textShadowClass   = compact ? s.textShadowCompact   : s.textShadow
  // Compact layer is inline-flex, no absolute centering, so the JS offset
  // isn't needed — the wordmark sits at cell origin and flexes naturally.
  const wordmarkTransform = compact
    ? undefined
    : `translate(${-aiHalf}px, -50%)`

  // Reduced-motion path: render the wordmark in its final settled state
  // and skip the canvas entirely. Reads "aiUniversity" with no animation.
  if (reducedMotion) {
    const finalAiStyle = buildAiStyle(1, onDark ?? false, compact ?? false, 0, 1)
    return (
      <div ref={cellRef} className={cellClass}>
        <div className={atomLayerClass} aria-hidden="true" />
        <div className={wordmarkLayerClass}>
          <div className={textShadowClass} aria-hidden="true" />
          <span className={s.ai} style={finalAiStyle}>
            a<span>i</span>
          </span>
          <span
            className={`${s.university} ${onDark ? s.universityDark : ''} ${compact ? s.universityCompact : ''}`}
          >
            University
          </span>
        </div>
      </div>
    )
  }

  // Atom is fully done when every electron has landed AND the rest ramp
  // has completed. After that, Atom flips Canvas frameloop to 'demand'
  // (zero idle CPU, no further visual change expected).
  const atomIdle = allLanded && restProgress >= 1

  return (
    <div ref={cellRef} className={cellClass}>
      <div
        ref={atomLayerRef}
        className={atomLayerClass}
        style={compact && atomLeft !== null ? { left: `${atomLeft}px` } : undefined}
      >
        <Atom
          electrons={orbitsForRender}
          cameraZ={camZ}
          // AtomLogo handles reduced-motion at the wordmark level (above);
          // tell Atom to skip its own gate so we don't double-check.
          motionPolicy={{ respectReducedMotion: false }}
          idle={atomIdle}
          settleTarget={settleTarget ?? undefined}
          settle={settle}
          onLand={onLand}
          onStrike={onStrike}
          restProgressRef={restProgressRef}
        />
      </div>

      <div
        className={wordmarkLayerClass}
        style={wordmarkTransform ? { transform: wordmarkTransform } : undefined}
      >
        <div className={textShadowClass} aria-hidden="true" />
        <span
          ref={aiRef}
          className={`${s.ai} ${pulsing ? pulseClassForStrike(strikeCount) : ''} ${restProgress > 0 ? s.aiSettling : ''}`}
          style={buildAiStyle(progress, onDark ?? false, compact ?? false, glowMultiplier, restProgress)}
        >
          a<span ref={iRef}>i</span>
        </span>
        <span
          className={`${s.university} ${onDark ? s.universityDark : ''} ${compact ? s.universityCompact : ''}`}
        >
          {'University'.split('').map((ch, i) => {
            const staggerMs = compact ? LOGO.uni.stagger.compactMs : LOGO.uni.stagger.labsMs
            return (
              <span
                key={i}
                className={universityTriggered ? s.uniLetterOn : s.uniLetter}
                style={{
                  animationDelay: universityTriggered ? `${i * staggerMs}ms` : undefined,
                  ...buildUniversityStyle(universityTriggered, restProgress, onDark ?? false, compact ?? false),
                }}
              >
                {ch}
              </span>
            )
          })}
        </span>
      </div>
    </div>
  )
}
