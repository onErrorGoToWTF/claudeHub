/*
 * /labs/atom-motion — multi-electron gravity-handoff stage.
 *
 * Two draggable nuclei (A, B). 1, 2, or 3 electrons, each with its own
 * orbital plane (`upHat`, perpendicular to the shared chord axis).
 * Locked once Start fires:
 *   - A and B positions
 *   - Electron count
 *   - Tilt (3D perspective rotation)
 *   - Per-electron orbital plane assignment (derived from count)
 * Free during motion:
 *   - Speed, Loop ON/OFF
 *   - Start / End / Travel triggers
 *
 * Per-electron phase machine (autonomous):
 *   orbitA -> travelAB -> orbitB -> travelBA -> orbitA
 * Each electron tracks its own elapsed-in-phase. Far-tip wrap detection
 * (theta crossing pi for orbitA, 0 for orbitB) is the only phase-change
 * trigger for orbits — guarantees the lemniscate handoff at the chord-
 * line tip is position+tangent continuous in every plane independently.
 *
 * Travel button: round-robin per-electron counter. Each tap increments
 * the counter for the next index in [0..count); each electron's probe
 * consumes its own count at its own next far-tip wrap. So tap once per
 * electron to dispatch them sequentially.
 *
 * Loop ON: probes auto-advance at every far-tip wrap regardless of the
 * Travel counter — every electron just keeps cycling through the round-
 * trip on its own clock.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'
import { OrbitControls, Html, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import { ELECTRON } from '../ui/atom/constants'
import { makeFadeTexture } from '../ui/atom/Electron'
import { usePrefersReducedMotion } from '../ui/atom/usePrefersReducedMotion'
import type { Vec3 } from '../ui/atom/runtime/types'
import {
  buildLemniscate,
  sCurvePos,
  orbitPosAt,
  type OrbitDesc,
} from '../ui/atom/runtime/travel'
import s from './LabsAtomMotion.module.css'

extend({ MeshLineGeometry, MeshLineMaterial })

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module '@react-three/fiber' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ThreeElements {
    meshLineGeometry: object
    meshLineMaterial: object
  }
}

// --- Constants -------------------------------------------------------------

const ORBIT_OMEGA_BASE = 2.4
const ORBIT_PERIOD = (2 * Math.PI) / ORBIT_OMEGA_BASE
const FADE_DUR = 0.55
const LEMNISCATE_PERIOD = 6.0
const TRANSIT_DUR = LEMNISCATE_PERIOD / 2
// Number of full orbital laps loop mode runs before triggering a
// transit. Manual travel-button taps still fire on the very next wrap.
const LOOP_LAPS_BEFORE_TRAVEL = 3
// Global multiplier applied on top of the user-selected speed. Halved so the
// labelled "1×" is half as fast as before.
const SPEED_SCALE = 0.5
// Orbits are always circular (aspect = 1). Visual ellipses are purely a
// camera-angle effect on a 3D circle, not an actual orbital aspect.
const ORBIT_ASPECT = 1.0
// Default camera position (rotated 3-quarter view captured from the user's
// preferred starting orientation). Matches Preset 1.
const DEFAULT_CAMERA_POS: [number, number, number] = [-17.87, 7.26, -3.71]
const DEFAULT_CAMERA_TARGET: [number, number, number] = [1.16, -2.52, 1.28]
const FOV_DEG = 50

const INITIAL_POINT_A: Vec3 = [-8.5, 0, 0]
const INITIAL_POINT_B: Vec3 = [8.5, 0, 0]

const COMMIT: string =
  (import.meta.env.VITE_GIT_COMMIT as string | undefined) ?? 'dev-local'

// Generates a multi-ring radial texture for electron heads — bright hot
// core, alternating dim/bright shells, soft outer fade. Sized 512×512 so
// deep-zoom views render with crisp internal structure; at zoom-out the
// rings smear into a clean glow. White RGB is tinted by SpriteMaterial
// .color (per-electron), so this texture is shared across all 4.
function makeSoftOrbTexture(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  // Sharp core
  g.addColorStop(0.00, 'rgba(255, 255, 255, 1.00)')
  g.addColorStop(0.10, 'rgba(255, 255, 255, 1.00)')
  // First dim band
  g.addColorStop(0.14, 'rgba(255, 255, 255, 0.40)')
  g.addColorStop(0.22, 'rgba(255, 255, 255, 0.40)')
  // Bright ring
  g.addColorStop(0.26, 'rgba(255, 255, 255, 0.80)')
  g.addColorStop(0.34, 'rgba(255, 255, 255, 0.80)')
  // Second dim band
  g.addColorStop(0.38, 'rgba(255, 255, 255, 0.28)')
  g.addColorStop(0.55, 'rgba(255, 255, 255, 0.28)')
  // Outer fade
  g.addColorStop(0.78, 'rgba(255, 255, 255, 0.10)')
  g.addColorStop(1.00, 'rgba(255, 255, 255, 0.00)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// --- Types -----------------------------------------------------------------

type Existence = 'idle' | 'visible'
type MotionPhase = 'orbitA' | 'travelAB' | 'orbitB' | 'travelBA'

// Per-electron membership: not present, on atom A, or on atom B.
// Slot index is the electron's permanent identity 1..16. Holes are
// allowed; the user picks which slots are occupied and on which atom.
type SlotLocation = 'none' | 'A' | 'B'

// Identifiers for the toggleable right-edge panel system. Playback is
// no longer part of this set — it now lives as an always-visible
// top-center bar (see render below).
type PanelKey = 'electrons' | 'colors' | 'dimensions' | 'scene'

// Reusable slider row with tap-to-reveal ± nudge buttons (Chunk 7).
// Default state: clean slider only. Tapping the value label toggles
// inline ± buttons that step by `step`. The button-style label keeps
// the underlying value-text accessible while serving as the tap target.
function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  onActiveChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
  /** Fired with `true` when the user starts touching/dragging the
   *  slider, `false` when they release. Used to drive Guides
   *  dimension markers in the 3D scene. */
  onActiveChange?: (active: boolean) => void
}) {
  const [nudgeOpen, setNudgeOpen] = useState(false)
  const display = format ? format(value) : String(value)
  // Round step-aligned arithmetic to avoid 0.03 + 0.01 = 0.04000000000001.
  const stepDecimals = step < 1 ? Math.max(0, -Math.floor(Math.log10(step)) + 1) : 0
  const stepClamp = (v: number) => +Math.max(min, Math.min(max, v)).toFixed(stepDecimals)
  return (
    <div className={s.tiltSliderRow}>
      <div className={s.sliderLabelGroup}>
        <button
          type="button"
          className={s.sliderValueButton}
          onClick={() => setNudgeOpen((v) => !v)}
          aria-label={`${label} ${display}. Tap to toggle nudge buttons.`}
          aria-expanded={nudgeOpen}
        >
          {`${label}  ${display}`}
        </button>
        {nudgeOpen && (
          <>
            <button
              type="button"
              className={s.sliderNudge}
              onClick={() => onChange(stepClamp(value - step))}
              aria-label={`Decrease ${label}`}
            >
              −
            </button>
            <button
              type="button"
              className={s.sliderNudge}
              onClick={() => onChange(stepClamp(value + step))}
              aria-label={`Increase ${label}`}
            >
              +
            </button>
          </>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.currentTarget.value))}
        onPointerDown={() => onActiveChange?.(true)}
        onPointerUp={() => onActiveChange?.(false)}
        onPointerCancel={() => onActiveChange?.(false)}
        className={s.tiltSlider}
        aria-label={label}
      />
    </div>
  )
}

const PANEL_DEFINITIONS: { key: PanelKey; icon: string; label: string; chunk: number }[] = [
  { key: 'electrons', icon: '⚛', label: 'Electrons', chunk: 5 },
  { key: 'colors', icon: '◐', label: 'Colors', chunk: 6 },
  { key: 'dimensions', icon: '⊞', label: 'Dimensions', chunk: 7 },
  { key: 'scene', icon: '⊙', label: 'Scene', chunk: 8 },
]

type ElectronSpec = {
  upHat: Vec3
  cwAtA: boolean
  initialPhase: number
}

const DEFAULT_E_COLOR = '#ffdbd8'

// --- Per-electron plane assignments ---------------------------------------
// A plane through the chord axis is determined by an upHat direction; +up
// and -up span the same plane. So unique planes only span [0, π) of
// rotation around the chord — 180° / N gives evenly-spaced distinct planes.
// Specs are recomputed for the active N (1..MAX_ELECTRONS) so all electrons
// stay symmetrically placed at any count.

const MAX_ELECTRONS = 16

// Stepping values for the appearance-cluster +/− buttons. Granular
// 1–3 at the low end so the user can drop below 4 (destructive — the
// symmetric layout breaks but existing electrons keep their phase),
// then clean symmetry steps: 4 (square), 6 (hex), 8 (octagonal),
// 12 (sphere-ish), 16 (max / supercharge). Slider still allows any
// integer in [1, 16] for free tuning.
// Slot identity table — every one of the 16 slots gets its OWN
// distinct plane. No two slots ever share an orbit; one electron per
// orbit per atom is the locked rule. Fill order is bit-reversal-shaped
// so each prefix at a sweet-spot count (1, 2, 4, 8, 16) gives the
// most-evenly-spread plane set possible at that count, nested inside
// the next-up sweet spot:
//   N=1   { 0°}
//   N=2   { 0°,  90°}                                  perpendicular pair
//   N=4   { 0°,  90°, 135°,  45°}                       4 orthogonal orbits
//   N=8   { 0°,  90°, 135°,  45°, 22.5°, 112.5°, 157.5°, 67.5°}
//   N=16  all 16 planes 11.25° apart (one per slot)
// Slot k always occupies the same plane regardless of total count
// or which atom holds it — slot identity is permanent across
// grow/shrink and across atoms (e_k on B sits at the same plane,
// just on B's frame).
//
// Plane indices below are in [0, 16); angle = idx · π / 16.
// First four entries (slots 0..3) reproduce the original
// FILL_ORDER_4=[0,2,3,1] preference: 0°, 90°, 135°, 45° (fill upper
// half before lower so slot 3 lands opposite the empty upper-half
// quadrant left by slots 1+2). Slots 4..7 add the four planes that
// the N=8 sweet spot introduces; slots 8..15 add the eight planes
// that are new in N=16. Verified to be a permutation of [0..15].
const SLOT_PLANE_INDICES = [
  0,   // slot 1   →    0°
  8,   // slot 2   →   90°    perpendicular pair with slot 1
  12,  // slot 3   →  135°    upper-half first
  4,   // slot 4   →   45°    closes the 4-orbit set
  10,  // slot 5   →  112.5°  upper-half first among N=8 additions
  14,  // slot 6   →  157.5°
  2,   // slot 7   →   22.5°
  6,   // slot 8   →   67.5°
  11,  // slot 9   →  123.75° upper-half first among N=16 additions
  13,  // slot 10  →  146.25°
  9,   // slot 11  →  101.25°
  15,  // slot 12  →  168.75°
  3,   // slot 13  →   33.75°
  5,   // slot 14  →   56.25°
  1,   // slot 15  →   11.25°
  7,   // slot 16  →   78.75°
] as const

// Per-slot initial orbit angle at t=0. Avoids 0 and π — those are
// plane-independent axial points (chord-line tips) where any two
// slots would visually collide on the first frame regardless of
// plane. Cycles through four non-axial phases on a 4-slot period
// so consecutive spawns don't all start at the same angle.
const SLOT_PHASE_OFFSETS = [
  Math.PI / 2,
  3 * Math.PI / 4,
  5 * Math.PI / 4,
  7 * Math.PI / 4,
] as const

function slotPlaneAngle(slotIdx0: number): number {
  return (SLOT_PLANE_INDICES[slotIdx0] * Math.PI) / 16
}

function slotInitialPhase(slotIdx0: number): number {
  return SLOT_PHASE_OFFSETS[slotIdx0 % SLOT_PHASE_OFFSETS.length]
}

function buildElectronSpecs(N: number): ElectronSpec[] {
  const safeN = Math.max(0, Math.min(MAX_ELECTRONS, N))
  const out: ElectronSpec[] = []
  for (let k = 0; k < safeN; k++) {
    const planeAngle = slotPlaneAngle(k)
    out.push({
      upHat: [0, Math.cos(planeAngle), Math.sin(planeAngle)],
      cwAtA: true,
      initialPhase: slotInitialPhase(k),
    })
  }
  return out
}

// --- Color modes ----------------------------------------------------------

type ColorMode = 'solid' | 'individual' | 'gradient'

// Rainbow-friendly hue lerp via Three.js Color.lerpHSL — short-arc on the
// hue circle, perceptual enough for our purposes. Upgrade to oklch later
// if subtle warm/cool transitions need it.
function lerpHexColor(a: string, b: string, t: number): string {
  const ca = new THREE.Color(a)
  const cb = new THREE.Color(b)
  ca.lerpHSL(cb, t)
  return '#' + ca.getHexString()
}

// Travel-order sequence for auto-loop. Interleaves first-half slots
// with second-half slots so consecutive travels alternate between
// near-perpendicular planes — avoids the "rotating pinwheel" feel of
// slot-sequential travel where each next traveler is just one notch
// over from the last.
//   N=2: [0, 1]
//   N=4: [0, 2, 1, 3]
//   N=6: [0, 3, 1, 4, 2, 5]
//   N=8: [0, 4, 1, 5, 2, 6, 3, 7]
function travelOrderInterleaved(N: number): number[] {
  const half = Math.floor(N / 2)
  const order: number[] = []
  for (let i = 0; i < half; i++) {
    order.push(i)
    order.push(i + half)
  }
  if (N % 2 === 1) order.push(N - 1)
  return order
}

function deriveElectronColors(
  N: number,
  mode: ColorMode,
  solid: string,
  individual: string[],
  gStart: string,
  gEnd: string,
): string[] {
  if (mode === 'solid') return new Array(N).fill(solid)
  if (mode === 'gradient') {
    if (N === 1) return [gStart]
    return Array.from({ length: N }, (_, i) => lerpHexColor(gStart, gEnd, i / (N - 1)))
  }
  // individual: cycle the user's palette if N exceeds palette length
  if (individual.length === 0) return new Array(N).fill(DEFAULT_E_COLOR)
  return Array.from({ length: N }, (_, i) => individual[i % individual.length] ?? DEFAULT_E_COLOR)
}

// --- Geometry helpers ------------------------------------------------------

function chordHalfFrom(a: Vec3, b: Vec3): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]) / 2
}
function tiltZFrom(a: Vec3, b: Vec3): number {
  return Math.atan2(b[1] - a[1], b[0] - a[0])
}

function makeOrbitADesc(
  spec: ElectronSpec,
  chordHalf: number,
  orbitSize: number,
  entryAngle: number,
): OrbitDesc {
  return {
    center: [-chordHalf, 0, 0],
    plane: 'xy',
    upHat: spec.upHat,
    chordAxis: [1, 0, 0],
    size: orbitSize,
    aspect: ORBIT_ASPECT,
    omega: spec.cwAtA ? -ORBIT_OMEGA_BASE : ORBIT_OMEGA_BASE,
    phase: entryAngle,
  }
}

function makeOrbitBDesc(
  spec: ElectronSpec,
  chordHalf: number,
  orbitSize: number,
): OrbitDesc {
  // Omega flips sign at B vs A. The lemniscate's tangent at the right
  // tip (tau=2pi for travelAB) points in +upHat. Orbit-B at theta=0
  // also needs +upHat tangent to match the handoff — that's
  // omega > 0 (CCW around B) when omega < 0 (CW around A). Without
  // the flip the new orbit goes "the wrong direction" after capture.
  return {
    center: [chordHalf, 0, 0],
    plane: 'xy',
    upHat: spec.upHat,
    chordAxis: [1, 0, 0],
    size: orbitSize,
    aspect: ORBIT_ASPECT,
    omega: spec.cwAtA ? ORBIT_OMEGA_BASE : -ORBIT_OMEGA_BASE,
    phase: 0,
  }
}

// First-far-tip time within a phase given entry angle, omega, target.
function tOffsetTo(entryAngle: number, omega: number, target: number): number {
  const raw = (target - entryAngle) / omega
  return ((raw % ORBIT_PERIOD) + ORBIT_PERIOD) % ORBIT_PERIOD
}

// --- Camera + projection ---------------------------------------------------

// Camera HUD — pushes live camera position + OrbitControls target back up
// to the page so the build-label HUD shows them. Lets the user screenshot
// exact values after rotating/panning into a view they want as default.
function CameraDebugger({
  onUpdate,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef,
}: {
  onUpdate: (pos: [number, number, number], tgt: [number, number, number]) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: React.MutableRefObject<any>
}) {
  useFrame(({ camera }) => {
    const t = controlsRef.current?.target
    onUpdate(
      [
        +camera.position.x.toFixed(2),
        +camera.position.y.toFixed(2),
        +camera.position.z.toFixed(2),
      ],
      t
        ? [+t.x.toFixed(2), +t.y.toFixed(2), +t.z.toFixed(2)]
        : [0, 0, 0],
    )
  })
  return null
}

// Master clock — page-level scaled-time accumulator. Increments inside the
// Canvas via useFrame so the value progresses on the same render tick the
// electrons use. Each new electron snaps its entry angle to this clock,
// which keeps freshly-added electrons evenly spaced relative to existing
// ones regardless of when the user adds them.
function MasterClock({
  timeRef,
  speedMult,
  reducedMotion,
}: {
  timeRef: React.MutableRefObject<number>
  speedMult: number
  reducedMotion: boolean
}) {
  useFrame((_, delta) => {
    if (reducedMotion) return
    timeRef.current += Math.min(delta, 1 / 30) * speedMult * SPEED_SCALE
  })
  return null
}

// --- ElectronProbe (autonomous phase machine) -----------------------------

function ElectronProbe({
  spec,
  fadeTex,
  orbTex,
  reducedMotion,
  speedMult,
  chordHalf,
  orbitSize,
  existence,
  travelCount,
  atom,
  startSeed,
  trailColor,
  color,
  haloColor,
  headScale,
  haloScale,
  trailWidth,
  globalScaledTimeRef,
}: {
  spec: ElectronSpec
  fadeTex: THREE.DataTexture
  orbTex: THREE.CanvasTexture
  reducedMotion: boolean
  speedMult: number
  chordHalf: number
  orbitSize: number
  existence: Existence
  /** Legacy round-trip trigger; bumping = single transit at next far-tip wrap. */
  travelCount: number
  /** Target atom — when this differs from the probe's current orbit side,
   *  the probe transits at the next far-tip wrap. The two triggers
   *  (travelCount and atom) are OR-combined during the chunk-5 transition. */
  atom: 'A' | 'B'
  startSeed: number
  trailColor: string
  color: string
  haloColor: string
  headScale: number
  haloScale: number
  trailWidth: number
  globalScaledTimeRef: React.MutableRefObject<number>
}) {
  const headRef = useRef<THREE.Sprite>(null!)
  const headMatRef = useRef<THREE.SpriteMaterial>(null!)
  const haloRef = useRef<THREE.Mesh>(null!)
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trailGeomRef = useRef<any>(null!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trailMatRef = useRef<any>(null!)

  const phaseRef = useRef<MotionPhase>('orbitA')
  const phaseElapsedRef = useRef(0)
  const entryAngleRef = useRef(spec.initialPhase)
  const opacityRef = useRef(0)
  // Counts completed orbital laps in the current orbit phase. Loop mode
  // travels only after LOOP_LAPS_BEFORE_TRAVEL wraps.
  const lapsInPhaseRef = useRef(0)
  const lastPosRef = useRef<Vec3>([-chordHalf, 0, 0])
  const lastTravelCountRef = useRef(travelCount)
  const lastStartSeedRef = useRef(-1)

  const { size, invalidate } = useThree()
  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size.width, size.height],
  )

  const bufRef = useRef<Float32Array | null>(null)
  const insertIdxRef = useRef(0)
  if (!bufRef.current) {
    bufRef.current = new Float32Array(ELECTRON.trail.segments * 3)
  }

  // Reset probe on Start (startSeed bumps).
  useEffect(() => {
    if (lastStartSeedRef.current === startSeed) return
    lastStartSeedRef.current = startSeed
    phaseRef.current = 'orbitA'
    // Sync new electron to the master clock: enter at the angle this
    // electron WOULD be at if it had been running since global t=0. Same
    // formula across all electrons keeps them locked at constant phase
    // offsets (their evenly-spaced spec.initialPhase values).
    const omegaA = spec.cwAtA ? -ORBIT_OMEGA_BASE : ORBIT_OMEGA_BASE
    const syncedEntry = spec.initialPhase + omegaA * globalScaledTimeRef.current
    entryAngleRef.current = syncedEntry
    phaseElapsedRef.current = 0
    opacityRef.current = 0
    lapsInPhaseRef.current = 0
    // Catch up the travel-count baseline so old taps don't immediately
    // fire on the new run.
    lastTravelCountRef.current = travelCount
    const orbitA = makeOrbitADesc(spec, chordHalf, orbitSize, syncedEntry)
    const seed: Vec3 = orbitPosAt(orbitA, syncedEntry)
    if (bufRef.current) {
      for (let i = 0; i < ELECTRON.trail.segments; i++) {
        bufRef.current[i * 3] = seed[0]
        bufRef.current[i * 3 + 1] = seed[1]
        bufRef.current[i * 3 + 2] = seed[2]
      }
    }
    insertIdxRef.current = 0
    lastPosRef.current = seed
    if (headRef.current) headRef.current.position.set(seed[0], seed[1], seed[2])
    if (haloRef.current) haloRef.current.position.set(seed[0], seed[1], seed[2])
    if (headMatRef.current) headMatRef.current.opacity = 0
    if (haloMatRef.current) haloMatRef.current.opacity = 0
    if (trailMatRef.current) trailMatRef.current.opacity = 0
    invalidate()
  }, [startSeed, spec, chordHalf, orbitSize, travelCount, invalidate])

  // Reduced-motion: park at orbit-A entry angle, full opacity. No motion.
  useEffect(() => {
    if (!reducedMotion) return
    const orbitA = makeOrbitADesc(spec, chordHalf, orbitSize, spec.initialPhase)
    const restPos = orbitPosAt(orbitA, spec.initialPhase)
    if (bufRef.current) {
      for (let i = 0; i < ELECTRON.trail.segments; i++) {
        bufRef.current[i * 3] = restPos[0]
        bufRef.current[i * 3 + 1] = restPos[1]
        bufRef.current[i * 3 + 2] = restPos[2]
      }
    }
    insertIdxRef.current = 0
    lastPosRef.current = restPos
    if (headRef.current) headRef.current.position.set(restPos[0], restPos[1], restPos[2])
    if (haloRef.current) haloRef.current.position.set(restPos[0], restPos[1], restPos[2])
    if (headMatRef.current) headMatRef.current.opacity = 1
    if (haloMatRef.current) haloMatRef.current.opacity = 0.42
    if (trailMatRef.current) trailMatRef.current.opacity = 1
    opacityRef.current = 1
    invalidate()
  }, [reducedMotion, spec, chordHalf, orbitSize, invalidate])

  useFrame((_, delta) => {
    if (reducedMotion) return

    const dt = Math.min(delta, 1 / 30) * speedMult * SPEED_SCALE
    const prevLocalT = phaseElapsedRef.current
    phaseElapsedRef.current += dt
    let localT = phaseElapsedRef.current

    // Opacity lerp toward existence target. Wall-clock so speed doesn't
    // change visual fade rate.
    const targetOpacity = existence === 'visible' ? 1 : 0
    const opacityRate = delta / FADE_DUR
    if (opacityRef.current < targetOpacity) {
      opacityRef.current = Math.min(targetOpacity, opacityRef.current + opacityRate)
    } else if (opacityRef.current > targetOpacity) {
      opacityRef.current = Math.max(targetOpacity, opacityRef.current - opacityRate)
    }

    // Fully faded out — don't run motion math, just keep meshes hidden.
    if (existence === 'idle' && opacityRef.current === 0) {
      if (headMatRef.current) headMatRef.current.opacity = 0
      if (haloMatRef.current) haloMatRef.current.opacity = 0
      if (trailMatRef.current) trailMatRef.current.opacity = 0
      return
    }

    // Phase-change checks BEFORE position computation, so we render the
    // post-transition position on the same frame.
    let phase = phaseRef.current
    if (phase === 'orbitA' || phase === 'orbitB') {
      // Far-tip wrap detection.
      const targetAngle = phase === 'orbitA' ? Math.PI : 0
      const omega = spec.cwAtA ? -ORBIT_OMEGA_BASE : ORBIT_OMEGA_BASE
      const entry = phase === 'orbitA' ? entryAngleRef.current : 0
      const tOffset = tOffsetTo(entry, omega, targetAngle)
      const dist = (t: number) => (((t - tOffset) % ORBIT_PERIOD) + ORBIT_PERIOD) % ORBIT_PERIOD
      const dPrev = dist(prevLocalT)
      const dCurr = dist(localT)
      const wrapped = prevLocalT > 1e-3 && dPrev > dCurr && dPrev - dCurr > ORBIT_PERIOD / 2
      if (wrapped) {
        lapsInPhaseRef.current += 1
        // Two transit triggers (OR-combined during the chunk-5 transition):
        //   - Legacy `travelCount` bump — single transit per bump. Used
        //     by the autoReplay loop and the legacy ⇋ button.
        //   - `atom` prop differs from the probe's current orbit side —
        //     transit toward the new target atom. Used by the slot grid
        //     in chunk 5e and by the eventual loop refactor in 5d-2.
        const newTravel = travelCount > lastTravelCountRef.current
        const currentAtom: 'A' | 'B' = phase === 'orbitA' ? 'A' : 'B'
        const wantsAtomSwitch = atom !== currentAtom
        if (newTravel || wantsAtomSwitch) {
          phase = phase === 'orbitA' ? 'travelAB' : 'travelBA'
          phaseRef.current = phase
          phaseElapsedRef.current = 0
          localT = 0
          lapsInPhaseRef.current = 0
          lastTravelCountRef.current = travelCount
        }
      }
    } else {
      // Transit complete?
      if (localT >= TRANSIT_DUR) {
        const next: MotionPhase = phase === 'travelAB' ? 'orbitB' : 'orbitA'
        phase = next
        phaseRef.current = phase
        // Carry over excess so motion stays smooth at the boundary.
        const overshoot = localT - TRANSIT_DUR
        phaseElapsedRef.current = overshoot
        localT = overshoot
        // Reset lap counter for the new orbit phase.
        lapsInPhaseRef.current = 0
        // Re-entry orbits land at the chord-line far-tip exactly.
        if (next === 'orbitA') entryAngleRef.current = Math.PI
        // (orbit-B's entry angle is always 0 — built into makeOrbitBDesc.)
      }
    }

    // Compute position for current phase.
    const orbitA = makeOrbitADesc(spec, chordHalf, orbitSize, entryAngleRef.current)
    const orbitB = makeOrbitBDesc(spec, chordHalf, orbitSize)
    let pos: Vec3 = lastPosRef.current

    if (phase === 'orbitA') {
      const theta = entryAngleRef.current + orbitA.omega * localT
      pos = orbitPosAt(orbitA, theta)
    } else if (phase === 'orbitB') {
      const theta = 0 + orbitB.omega * localT
      pos = orbitPosAt(orbitB, theta)
    } else {
      // travelAB: tau = pi -> 2pi (left lobe tip -> right lobe tip)
      // travelBA: tau = 0 -> pi (right -> left, the other half)
      //
      // FUTURE — same-rotation transit pathway (user-requested re-add):
      // Pre-multi-electron there was a second mode that used a single
      // ellipse-arc transit (`buildTravel` + `evalTravel` from
      // runtime/travel.ts) instead of the lemniscate. It kept orbital
      // rotation the SAME at A and B (no omega flip) and produced a
      // gentler top-/bottom-sweep arc rather than the figure-8 S-curve.
      // User preferred its visual feel for some atoms — wants the
      // option to switch between the two pathways. Re-add as a per-
      // electron-spec or per-atom flag, gated by a panel toggle.
      // Constraint: same-rotation arc only generalizes cleanly when the
      // orbit's perpendicular direction is consistent with the transit's
      // wHat — need to thread an upHat fallback through buildTravel for
      // the multi-plane case (chord-line exit has perpLen ≈ 0).
      const lemnisc = buildLemniscate(
        [-chordHalf, 0, 0],
        [chordHalf, 0, 0],
        spec.upHat,
      )
      // S-curve fitted to current geometry: lobe-tips at orbit far-tips
      // (a = chordHalf + orbitSize), amplitude in the same aspect ratio
      // as the original Bernoulli lemniscate (a / 2√2).
      const a = chordHalf + orbitSize
      const amp = a / (2 * Math.SQRT2)
      const t01 = Math.min(localT / TRANSIT_DUR, 1)
      const direction = phase === 'travelAB' ? -1 : 1
      pos = sCurvePos(lemnisc.midpoint, lemnisc.uHat, lemnisc.wHat, a, amp, t01, direction)
    }

    lastPosRef.current = pos
    headRef.current.position.set(pos[0], pos[1], pos[2])
    if (haloRef.current) haloRef.current.position.set(pos[0], pos[1], pos[2])

    // Trail ring buffer.
    const buf = bufRef.current!
    const idx = insertIdxRef.current
    buf[idx * 3] = pos[0]
    buf[idx * 3 + 1] = pos[1]
    buf[idx * 3 + 2] = pos[2]
    insertIdxRef.current = (idx + 1) % ELECTRON.trail.segments
    const unroll = new Float32Array(ELECTRON.trail.segments * 3)
    for (let i = 0; i < ELECTRON.trail.segments; i++) {
      const src = (insertIdxRef.current + i) % ELECTRON.trail.segments
      unroll[i * 3] = buf[src * 3]
      unroll[i * 3 + 1] = buf[src * 3 + 1]
      unroll[i * 3 + 2] = buf[src * 3 + 2]
    }
    if (trailGeomRef.current?.setPoints) trailGeomRef.current.setPoints(unroll)

    if (headMatRef.current) headMatRef.current.opacity = opacityRef.current
    if (haloMatRef.current) haloMatRef.current.opacity = opacityRef.current * 0.42
    if (trailMatRef.current) trailMatRef.current.opacity = opacityRef.current
  })

  return (
    <>
      <mesh>
        <meshLineGeometry ref={trailGeomRef} />
        <meshLineMaterial
          ref={trailMatRef}
          color={trailColor}
          lineWidth={trailWidth}
          transparent
          opacity={0}
          depthWrite={false}
          alphaMap={fadeTex}
          useAlphaMap={1}
          toneMapped={false}
          resolution={resolution}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={haloRef} scale={haloScale}>
        <sphereGeometry args={[0.05, 32, 32]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color={haloColor}
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <sprite ref={headRef} scale={[headScale, headScale, 1]}>
        <spriteMaterial
          ref={headMatRef}
          map={orbTex}
          color={color}
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </sprite>
    </>
  )
}

// --- Nuclei ----------------------------------------------------------------

function Nuclei({ chordHalf, color }: { chordHalf: number; color: string }) {
  return (
    <>
      <mesh position={[-chordHalf, 0, 0]}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <mesh position={[chordHalf, 0, 0]}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.85} />
      </mesh>
    </>
  )
}

// --- Axis indicators ------------------------------------------------------
// Three short hash-marked segments at the chord midpoint along local +X
// (chord), +Y, +Z. Subtle, dashed feel — orientation cue, not chrome.
// Sit in the inner (tilt) group so they rotate with the atom.

function AxisLine({
  direction,
  length,
  color,
  opacity = 0.45,
  ticks = 4,
  tickSize = 0.06,
}: {
  direction: Vec3
  length: number
  color: string
  opacity?: number
  ticks?: number
  tickSize?: number
}) {
  const positions = useMemo(() => {
    const arr: number[] = []
    // Main axis from origin to direction*length
    arr.push(0, 0, 0, direction[0] * length, direction[1] * length, direction[2] * length)
    // Pick a perpendicular for tick orientation. Any vector not parallel
    // to direction works; cross with world up [0,1,0] unless direction
    // is also +/-Y, in which case use +X.
    const isY = Math.abs(direction[1]) > 0.99
    const ref: Vec3 = isY ? [1, 0, 0] : [0, 1, 0]
    // perp1 = direction × ref, normalized
    const px = direction[1] * ref[2] - direction[2] * ref[1]
    const py = direction[2] * ref[0] - direction[0] * ref[2]
    const pz = direction[0] * ref[1] - direction[1] * ref[0]
    const plen = Math.hypot(px, py, pz)
    const perp: Vec3 = [px / plen, py / plen, pz / plen]
    for (let i = 1; i <= ticks; i++) {
      const t = (i / ticks) * length
      const cx = direction[0] * t
      const cy = direction[1] * t
      const cz = direction[2] * t
      arr.push(
        cx - perp[0] * tickSize, cy - perp[1] * tickSize, cz - perp[2] * tickSize,
        cx + perp[0] * tickSize, cy + perp[1] * tickSize, cz + perp[2] * tickSize,
      )
    }
    return new Float32Array(arr)
  }, [direction, length, ticks, tickSize])

  return (
    <lineSegments renderOrder={-1}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        toneMapped={false}
        depthWrite={false}
        depthTest={false}
      />
    </lineSegments>
  )
}

// Blueprint-style dimension marker between the two nuclei (Chunk 8b).
// A thin chord-axis line + a centered numeric label showing the current
// chord-half distance. Visible only while the user is actively touching
// the spread slider AND the master Guides toggle is on. Lives inside
// the chord-aligned group so it rotates with the rest of the scene.
function DimensionMarker({
  pointA,
  pointB,
  visible,
  color,
}: {
  pointA: Vec3
  pointB: Vec3
  visible: boolean
  color: string
}) {
  const positions = useMemo(() => {
    return new Float32Array([
      pointA[0], pointA[1], pointA[2],
      pointB[0], pointB[1], pointB[2],
    ])
  }, [pointA, pointB])
  const distance = useMemo(() => {
    return Math.hypot(
      pointB[0] - pointA[0],
      pointB[1] - pointA[1],
      pointB[2] - pointA[2],
    )
  }, [pointA, pointB])
  const midpoint = useMemo<[number, number, number]>(() => [
    (pointA[0] + pointB[0]) / 2,
    (pointA[1] + pointB[1]) / 2 + 0.9,
    (pointA[2] + pointB[2]) / 2,
  ], [pointA, pointB])
  if (!visible) return null
  return (
    <>
      <lineSegments renderOrder={2}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={0.8}
          toneMapped={false}
          depthWrite={false}
          depthTest={false}
        />
      </lineSegments>
      <Html position={midpoint} center wrapperClass={s.guideHtmlWrapper}>
        <div className={s.guideLabel}>{distance.toFixed(1)}</div>
      </Html>
    </>
  )
}

function AxisIndicators({
  chordHalf,
  color,
  opacity,
}: {
  chordHalf: number
  color: string
  opacity: number
}) {
  // Extends past the inter-nucleus gap into the orbital region — guides
  // are now a single bg-derived tone (not 3 separate axis colors), so the
  // longer reach reads as orientation scaffolding, not "RGB axis tripod."
  const length = chordHalf * 1.2
  return (
    <>
      <AxisLine direction={[1, 0, 0]} length={length} color={color} opacity={opacity} />
      <AxisLine direction={[0, 1, 0]} length={length} color={color} opacity={opacity} />
      <AxisLine direction={[0, 0, 1]} length={length} color={color} opacity={opacity} />
    </>
  )
}

// Lightens a hex color in HSL space — used to derive the axis-guide tone
// from the active bgColor so the guides feel like a brighter shadow of
// the canvas, not a separate palette.
function lightenHex(hex: string, byL: number): string {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s, Math.min(1, hsl.l + byL))
  return '#' + c.getHexString()
}

// --- Theme palette ---------------------------------------------------------

type ThemeName = 'light' | 'dark'
const THEME_KEY = 'labs-atom-motion-theme'

const THEME_PALETTE: Record<ThemeName, {
  ink: string
  nucleus: string
  axisX: string
  axisY: string
  axisZ: string
  axisOpacity: number
}> = {
  light: {
    ink: '#141312',
    nucleus: '#ffffff',
    axisX: '#c45050',
    axisY: '#3d8f3d',
    axisZ: '#4a55c4',
    axisOpacity: 0.32,
  },
  dark: {
    ink: '#ffffff',
    nucleus: '#ffffff',
    axisX: '#ff8a8a',
    axisY: '#8aff8a',
    axisZ: '#8a8aff',
    axisOpacity: 0.45,
  },
}

// --- Presets --------------------------------------------------------------
// Curated example configurations. Order is the user-facing order. Append
// to grow. Preset 1 also doubles as the page's default state — applying
// it on a fresh load is a no-op visually.

type Preset = {
  name: string
  electronCount: number
  colorMode: ColorMode
  solidColor: string
  individualColors: string[]
  gradientStart: string
  gradientEnd: string
  bgColor: string
  spread: number
  speed: number
  loop: boolean
  showNuclei: boolean
  showAxis: boolean
  theme: ThemeName
  camPos: [number, number, number]
  camTgt: [number, number, number]
  headScale: number
  haloScale: number
  trailWidth: number
}

// Helper to keep the preset list compact: every existing preset is
// 'individual' mode with its specific palette. solid + gradient defaults
// fall through to a representative pick from the palette.
function preset(
  base: Omit<Preset, 'colorMode' | 'solidColor' | 'gradientStart' | 'gradientEnd'> & {
    individualColors: string[]
  },
): Preset {
  const cols = base.individualColors
  return {
    ...base,
    colorMode: 'individual',
    solidColor: cols[0] ?? DEFAULT_E_COLOR,
    gradientStart: cols[0] ?? DEFAULT_E_COLOR,
    gradientEnd: cols[cols.length - 1] ?? DEFAULT_E_COLOR,
  }
}

const PRESETS: Preset[] = [
  preset({
    // Default page state — empty stage, loop off. User adds electrons
    // manually via + and triggers transits manually via ⇋.
    name: '0',
    electronCount: 0,
    individualColors: ['#ffa57d', '#ffc5ab', '#ffa57d', '#93e3fd'],
    bgColor: '#59004c',
    spread: 8.5,
    speed: 3.5,
    loop: false,
    showNuclei: true,
    showAxis: false,
    theme: 'dark',
    camPos: [-17.87, 7.26, -3.71],
    camTgt: [1.16, -2.52, 1.28],
    headScale: 0.05,
    haloScale: 0.8,
    trailWidth: 0.07,
  }),
  preset({
    // Same as 0 but pre-populated with 4 electrons.
    name: '1',
    electronCount: 4,
    individualColors: ['#ffa57d', '#ffc5ab', '#ffa57d', '#93e3fd'],
    bgColor: '#59004c',
    spread: 8.5,
    speed: 3.5,
    loop: false,
    showNuclei: true,
    showAxis: false,
    theme: 'dark',
    camPos: [-17.87, 7.26, -3.71],
    camTgt: [1.16, -2.52, 1.28],
    headScale: 0.05,
    haloScale: 0.8,
    trailWidth: 0.07,
  }),
  preset({
    name: '2',
    electronCount: 4,
    individualColors: ['#ffc7c7', '#ffb8e7', '#ffe4ca', '#d7fff8'],
    bgColor: '#551029',
    spread: 15.1,
    speed: 4.5,
    loop: true,
    showNuclei: true,
    showAxis: false,
    theme: 'dark',
    // Camera on chord-axis line (y=0, z=0) so both nuclei project to
    // the same pixel. Target pulled down (y=-6) tilts view ~7°.
    camPos: [50, 0, 0],
    camTgt: [0, -6, 0],
    headScale: 0.16,
    haloScale: 1.7,
    trailWidth: 0.16,
  }),
  preset({
    name: '3',
    electronCount: 4,
    individualColors: ['#b4fff3', '#d6ffde', '#c2ffcf', '#d2f8ff'],
    bgColor: '#055a00',
    spread: 4.3,
    speed: 4,
    loop: true,
    showNuclei: false,
    showAxis: false,
    theme: 'dark',
    camPos: [-6.66, 25.45, -3.26],
    camTgt: [-2.43, -1.46, -1.59],
    headScale: 0.16,
    haloScale: 1.7,
    trailWidth: 0.16,
  }),
  preset({
    name: '4',
    electronCount: 4,
    individualColors: ['#bddbd8', '#7ddbd8', '#ffd689', '#ffccf0'],
    bgColor: '#b93600',
    spread: 15.1,
    speed: 4.5,
    loop: true,
    showNuclei: true,
    showAxis: true,
    theme: 'dark',
    camPos: [7.66, 0.64, 2.59],
    camTgt: [-0.88, -1.26, 1.9],
    headScale: 0.16,
    haloScale: 1.7,
    trailWidth: 0.16,
  }),
  preset({
    name: '5',
    electronCount: 4,
    individualColors: ['#ffa57d', '#ffc5ab', '#ffa57d', '#93e3fd'],
    bgColor: '#240c00',
    spread: 14.7,
    speed: 4.5,
    loop: true,
    showNuclei: true,
    showAxis: false,
    theme: 'dark',
    camPos: [34.54, 15.68, 6.14],
    camTgt: [3.39, -5, 0.78],
    headScale: 0.16,
    haloScale: 1.7,
    trailWidth: 0.16,
  }),
  preset({
    name: '6',
    electronCount: 4,
    individualColors: ['#ffa57d', '#ffc5ab', '#ffa57d', '#93e3fd'],
    bgColor: '#59004c',
    spread: 14.7,
    speed: 4.5,
    loop: true,
    showNuclei: false,
    showAxis: false,
    theme: 'dark',
    camPos: [33.4, 7.12, 5.41],
    camTgt: [3.46, -5.19, 0.41],
    headScale: 0.08,
    haloScale: 1.1,
    trailWidth: 0.07,
  }),
  {
    // 16-electron supercharge — gradient mode, orange → mint, on purple.
    name: '7',
    electronCount: 16,
    colorMode: 'gradient',
    solidColor: '#ff9e3c',
    individualColors: ['#ff9e3c'],
    gradientStart: '#ff9e3c',
    gradientEnd: '#5fffaf',
    bgColor: '#59004c',
    spread: 8.5,
    speed: 5,
    loop: true,
    showNuclei: false,
    showAxis: false,
    theme: 'dark',
    camPos: [-17.06, 4.08, -1.94],
    camTgt: [1.05, -2.7, 1.52],
    headScale: 0.05,
    haloScale: 0.8,
    trailWidth: 0.06,
  },
]

function useTheme(): [ThemeName, (next: ThemeName) => void] {
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof localStorage === 'undefined') return 'light'
    const stored = localStorage.getItem(THEME_KEY)
    return stored === 'dark' ? 'dark' : 'light'
  })
  const update = useCallback((next: ThemeName) => {
    setTheme(next)
    try { localStorage.setItem(THEME_KEY, next) } catch { /* ignore */ }
  }, [])
  return [theme, update]
}

// --- Page ------------------------------------------------------------------

export function LabsAtomMotion() {
  const [pointA, setPointA] = useState<Vec3>(INITIAL_POINT_A)
  const [pointB, setPointB] = useState<Vec3>(INITIAL_POINT_B)
  // Source of truth for electron membership. Each entry = slot k+1's
  // location ∈ {'none','A','B'}. Replaces the prior scalar `targetN`.
  // Default = all 'none' (empty stage; user adds electrons manually).
  // For Chunk 1 the existing UI keeps the legacy "fill prefix on A"
  // semantic — count pills, +/-, and presets pack slots [0..N-1] = 'A'.
  // The slot grid + per-slot picking land in Chunk 5.
  const [slotLocations, setSlotLocations] = useState<SlotLocation[]>(
    () => new Array(MAX_ELECTRONS).fill('none' as SlotLocation),
  )
  const [autoReplay, setAutoReplay] = useState(false)
  const [speedMult, setSpeedMult] = useState(3.5)
  // Per-slot start-seed nonce — bumped when an electron spawns into a
  // previously-empty slot so ElectronProbe re-syncs to the master clock
  // and lands at the slot's phase-clock-correct position on its first
  // frame. Slot grid (chunk 5e) is the only writer.
  const [startSeeds, setStartSeeds] = useState<number[]>(() =>
    new Array(MAX_ELECTRONS).fill(0),
  )
  // Per-slot travel counter — bumped by the autoReplay loop to fire a
  // single transit at the next far-tip wrap (legacy trigger). The
  // ElectronProbe `atom` prop is the primary trigger from chunk 5d
  // onward; travelCount remains as the loop's mechanism.
  const [travelCounts, setTravelCounts] = useState<number[]>(() =>
    new Array(MAX_ELECTRONS).fill(0),
  )
  const [showNuclei, setShowNuclei] = useState(true)
  const [showAxis, setShowAxis] = useState(false)
  // Tiny shimmering white starfield, off by default. Rendered as a
  // separate drei <Stars> layer outside the tilted group, so it sits
  // in world space behind the atoms regardless of chord tilt.
  const [showStars, setShowStars] = useState(false)
  // Pause/Play toggle (Chunk 4). When paused, MasterClock and ElectronProbe
  // see speedMult=0 so motion freezes in place; the autoReplay loop is
  // also gated. Resuming continues from the same state.
  const [paused, setPaused] = useState(false)
  // Slot grid armed-for-delete state. Tap an occupied slot once →
  // armed (warning visual + inline →B/←A actions appear). Tap the
  // same slot again within 3s → confirms delete. Tap elsewhere or
  // wait → auto-disarm. No explicit Delete button — tap-tap is the
  // only delete pathway, matching the two-tap-confirm rule for
  // destructive actions.
  const [armedSlot, setArmedSlot] = useState<number | null>(null)
  const armedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const disarmSlot = useCallback(() => {
    if (armedTimeoutRef.current) {
      clearTimeout(armedTimeoutRef.current)
      armedTimeoutRef.current = null
    }
    setArmedSlot(null)
  }, [])
  const armSlotForDelete = useCallback((k: number) => {
    if (armedTimeoutRef.current) clearTimeout(armedTimeoutRef.current)
    setArmedSlot(k)
    armedTimeoutRef.current = setTimeout(() => {
      setArmedSlot(null)
      armedTimeoutRef.current = null
    }, 3000)
  }, [])
  // New 5-panel system (chunks 3+). Each dock icon toggles its panel
  // independently; multiple panels may be open simultaneously. Panel
  // bodies fill in over chunks 4-8. First-load default opens Electrons
  // so the user is one tap away from adding their first electron;
  // chunk 5f pulses slot 1 to make that affordance discoverable.
  const [panelsOpen, setPanelsOpen] = useState<Record<PanelKey, boolean>>({
    electrons: true,
    colors: false,
    dimensions: false,
    scene: false,
  })
  const togglePanel = useCallback((key: PanelKey) => {
    setPanelsOpen((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])
  // Color mode + per-mode state. electronColors is derived below.
  // Gradient is the showcase default (most-used per user feedback).
  const [colorMode, setColorMode] = useState<ColorMode>('gradient')
  const [solidColor, setSolidColor] = useState('#ffa57d')
  const [individualColors, setIndividualColors] = useState<string[]>(() =>
    ['#ffa57d', '#ffc5ab', '#ffa57d', '#93e3fd'],
  )
  const [gradientStart, setGradientStart] = useState('#ffa57d')
  const [gradientEnd, setGradientEnd] = useState('#93e3fd')
  // "More modes" expander inside the Colors panel — collapses Solid +
  // Individual under a single chevron so the gradient pickers (the
  // primary, most-used surface) sit alone above the fold.
  const [moreModesOpen, setMoreModesOpen] = useState(false)
  // Background mode + gradient endpoints (Chunk 6). Solid mode uses the
  // legacy single bgColor; gradient mode does a top→bottom linear
  // interpolation between two user-picked colors.
  const [bgMode, setBgMode] = useState<'solid' | 'gradient'>('solid')
  const [bgGradientStart, setBgGradientStart] = useState('#7a3a8c')
  const [bgGradientEnd, setBgGradientEnd] = useState('#1a0a1a')
  // Master Guides toggle (Chunk 8b). Default ON. When OFF, no in-scene
  // measurement marker appears regardless of slider activity.
  const [guidesEnabled, setGuidesEnabled] = useState(true)
  // True only while the user is actively touching the spread slider.
  // Drives the blueprint dimension marker between the two nuclei.
  const [spreadActive, setSpreadActive] = useState(false)
  // Soft fade-out timer for the marker after release.
  const spreadActiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSpreadActiveChange = useCallback((active: boolean) => {
    if (active) {
      if (spreadActiveTimeoutRef.current) {
        clearTimeout(spreadActiveTimeoutRef.current)
        spreadActiveTimeoutRef.current = null
      }
      setSpreadActive(true)
    } else {
      // Brief lingering window so the marker doesn't snap to invisible
      // the instant the user lifts their finger.
      spreadActiveTimeoutRef.current = setTimeout(() => {
        setSpreadActive(false)
        spreadActiveTimeoutRef.current = null
      }, 600)
    }
  }, [])
  // True while the user is actively interacting with the canvas (rotate /
  // pinch / pan). Forces guides ON regardless of manual toggles.
  const [interacting, setInteracting] = useState(false)
  const interactingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [bgColor, setBgColor] = useState('#59004c')
  const [headScale, setHeadScale] = useState(0.03)
  const [haloScale, setHaloScale] = useState(0.0)
  const [trailWidth, setTrailWidth] = useState(0.05)
  const [theme, setTheme] = useTheme()
  const palette = THEME_PALETTE[theme]

  // Effective speed multiplier — zero when paused so MasterClock and
  // every ElectronProbe stop advancing in lockstep without per-component
  // pause-prop wiring. The autoReplay setInterval also reads this so
  // travel ticks halt cleanly when paused.
  const effectiveSpeedMult = paused ? 0 : speedMult
  // Highest occupied slot index across BOTH atoms (or -1 if none).
  // Drives the active layout — adding e_k for k ≥ current layout's
  // capacity expands to the next sweet spot.
  const highestOccupied = useMemo(() => {
    for (let i = slotLocations.length - 1; i >= 0; i--) {
      if (slotLocations[i] !== 'none') return i
    }
    return -1
  }, [slotLocations])
  // Smallest sweet spot ≥ (highestOccupied + 1). Sweet spots {1,2,4,8,16}
  // are the configurations where the slot table forms a perpendicular /
  // maximally-spread pattern. Layouts nest, so existing electrons keep
  // their (plane, phase) coordinates as the layout grows.
  const activeLayout = useMemo(() => {
    const need = highestOccupied + 1
    if (need <= 0) return 0
    for (const sweet of [1, 2, 4, 8, 16] as const) {
      if (sweet >= need) return sweet
    }
    return MAX_ELECTRONS
  }, [highestOccupied])
  const electronSpecs = useMemo(() => buildElectronSpecs(activeLayout), [activeLayout])
  const electronColors = useMemo(
    () => deriveElectronColors(activeLayout, colorMode, solidColor, individualColors, gradientStart, gradientEnd),
    [activeLayout, colorMode, solidColor, individualColors, gradientStart, gradientEnd],
  )

  const setIndividualColorAt = useCallback((idx: number, color: string) => {
    setIndividualColors((prev) => {
      const next = prev.slice()
      // Pad if needed so high-N edits don't clobber lower indices.
      while (next.length <= idx) next.push(DEFAULT_E_COLOR)
      next[idx] = color
      return next
    })
  }, [])
  // Switching INTO Individual pre-populates the swatches from the current
  // effective per-electron colors (resolved Gradient or duplicated Solid).
  // Subsequent re-entries preserve prior tweaks; only the entry that
  // CHANGES mode reseeds. Solid → Solid / Gradient → Gradient = no-op.
  const onSelectColorMode = useCallback((next: ColorMode) => {
    setColorMode((prev) => {
      if (next === 'individual' && prev !== 'individual') {
        const resolved = deriveElectronColors(
          MAX_ELECTRONS,
          prev,
          solidColor,
          individualColors,
          gradientStart,
          gradientEnd,
        )
        setIndividualColors(resolved)
      }
      return next
    })
  }, [solidColor, individualColors, gradientStart, gradientEnd])

  const reducedMotion = usePrefersReducedMotion()
  // Sharper fade (power 5) concentrates the visible trail near the head
  // and pushes the alpha-zero zone over a longer stretch. Hides the
  // head-vs-tail wrap seam that shows up as a "black notch" at higher
  // effective speeds, where the trail wraps around the orbit once.
  const fadeTex = useMemo(() => makeFadeTexture(5), [])
  const orbTex = useMemo(() => makeSoftOrbTexture(), [])
  // Master clock advancing on the same render tick as the electrons. Each
  // newly-added electron reads this value to compute its entry angle.
  const globalScaledTimeRef = useRef(0)
  // Live camera position (updated each frame by CameraDebugger). Visible
  // in the build-label HUD so the user can screenshot the exact values
  // and turn a rotated view into a new default.
  const [camPos, setCamPos] = useState<[number, number, number]>(DEFAULT_CAMERA_POS)
  const [camTgt, setCamTgt] = useState<[number, number, number]>(DEFAULT_CAMERA_TARGET)

  const chordHalf = useMemo(() => chordHalfFrom(pointA, pointB), [pointA, pointB])
  // Orbit size is fixed — atoms keep the same on-screen size regardless of
  // how far apart they're placed. The transit math (sCurvePos) generalises
  // to any chord/orbit ratio so the S-shape recalculates from the placed
  // positions.
  const orbitSize = useMemo(() => 3 * (Math.SQRT2 - 1), [])
  const groupTiltZ = useMemo(() => tiltZFrom(pointA, pointB), [pointA, pointB])

  // Slot-grid handlers. Tap empty → add e_k to A. Tap occupied →
  // arm for delete (3s auto-disarm). Tap an armed slot again → delete.
  // Tapping a different occupied slot moves the arm to that slot.
  const onSlotTap = useCallback((k: number) => {
    const loc = slotLocations[k]
    if (loc === 'none') {
      // Add to A.
      setSlotLocations((prev) => {
        const out = prev.slice()
        out[k] = 'A'
        return out
      })
      setStartSeeds((seeds) => {
        const ss = seeds.slice()
        ss[k] = (ss[k] ?? 0) + 1
        return ss
      })
      disarmSlot()
      return
    }
    if (armedSlot === k) {
      // Second tap on the armed slot → confirm delete.
      setSlotLocations((prev) => {
        const out = prev.slice()
        out[k] = 'none'
        return out
      })
      disarmSlot()
      return
    }
    // First tap on occupied slot (or switching arm to a different slot).
    armSlotForDelete(k)
  }, [slotLocations, armedSlot, disarmSlot, armSlotForDelete])
  const onSlotMoveToB = useCallback(() => {
    if (armedSlot === null) return
    setSlotLocations((prev) => {
      if (prev[armedSlot] !== 'A') return prev
      const out = prev.slice()
      out[armedSlot] = 'B'
      return out
    })
    disarmSlot()
  }, [armedSlot, disarmSlot])
  const onSlotMoveToA = useCallback(() => {
    if (armedSlot === null) return
    setSlotLocations((prev) => {
      if (prev[armedSlot] !== 'B') return prev
      const out = prev.slice()
      out[armedSlot] = 'A'
      return out
    })
    disarmSlot()
  }, [armedSlot, disarmSlot])
  // Quick controls (Playback panel). No which-slot picking — they
  // operate on the next-free slot for add and the highest-occupied
  // slot for everything else (LIFO). Same backing state as the slot
  // grid, just a faster path for the common cases.
  const onQuickAdd = useCallback(() => {
    setSlotLocations((prev) => {
      const k = prev.indexOf('none')
      if (k === -1) return prev
      const out = prev.slice()
      out[k] = 'A'
      setStartSeeds((seeds) => {
        const ss = seeds.slice()
        ss[k] = (ss[k] ?? 0) + 1
        return ss
      })
      return out
    })
    disarmSlot()
  }, [disarmSlot])
  const onQuickRemove = useCallback(() => {
    setSlotLocations((prev) => {
      for (let k = prev.length - 1; k >= 0; k--) {
        if (prev[k] !== 'none') {
          const out = prev.slice()
          out[k] = 'none'
          return out
        }
      }
      return prev
    })
    disarmSlot()
  }, [disarmSlot])
  const onQuickMoveToB = useCallback(() => {
    setSlotLocations((prev) => {
      for (let k = prev.length - 1; k >= 0; k--) {
        if (prev[k] === 'A') {
          const out = prev.slice()
          out[k] = 'B'
          return out
        }
      }
      return prev
    })
    disarmSlot()
  }, [disarmSlot])
  const onQuickMoveToA = useCallback(() => {
    setSlotLocations((prev) => {
      for (let k = prev.length - 1; k >= 0; k--) {
        if (prev[k] === 'B') {
          const out = prev.slice()
          out[k] = 'A'
          return out
        }
      }
      return prev
    })
    disarmSlot()
  }, [disarmSlot])
  // Full refresh — return to first-load defaults. Clears all electrons,
  // resets every slider/color/mode/theme/axis/nuclei back to defaults,
  // closes all panels, recenters camera. Triggered from the Playback
  // panel's Refresh button.
  const onRefresh = useCallback(() => {
    setSlotLocations(new Array(MAX_ELECTRONS).fill('none' as SlotLocation))
    setTravelCounts(new Array(MAX_ELECTRONS).fill(0))
    setStartSeeds(new Array(MAX_ELECTRONS).fill(0))
    globalScaledTimeRef.current = 0
    setPaused(false)
    setAutoReplay(false)
    setSpeedMult(3.5)
    setHeadScale(0.03)
    setHaloScale(0.0)
    setTrailWidth(0.05)
    setBgColor('#59004c')
    setBgMode('solid')
    setBgGradientStart('#7a3a8c')
    setBgGradientEnd('#1a0a1a')
    setShowAxis(false)
    setShowNuclei(true)
    setColorMode('gradient')
    setSolidColor('#ffa57d')
    setIndividualColors(['#ffa57d', '#ffc5ab', '#ffa57d', '#93e3fd'])
    setGradientStart('#ffa57d')
    setGradientEnd('#93e3fd')
    setMoreModesOpen(false)
    setGuidesEnabled(true)
    setSpreadActive(false)
    if (spreadActiveTimeoutRef.current) {
      clearTimeout(spreadActiveTimeoutRef.current)
      spreadActiveTimeoutRef.current = null
    }
    setPointA(INITIAL_POINT_A)
    setPointB(INITIAL_POINT_B)
    setTheme('light')
    setPanelsOpen({
      electrons: true,
      colors: false,
      dimensions: false,
      scene: false,
    })
    disarmSlot()
    orbitControlsRef.current?.reset?.()
  }, [setTheme, disarmSlot])
  // Centralized auto-loop. When autoReplay is on, fire travel bumps in
  // interleaved-perpendicular order at a tempo tied to the orbit period —
  // each in-play slot crosses A↔B once per cycle of LOOP_LAPS_BEFORE_TRAVEL
  // orbits, with the SEQUENCE perpendicular (slot 0, slot N/2, slot 1,
  // slot N/2+1, ...) so consecutive travels hit perpendicular planes.
  // Reads slotLocations through a ref so changing membership mid-loop
  // doesn't restart the interval and reset the cycle index.
  const slotLocationsRef = useRef(slotLocations)
  slotLocationsRef.current = slotLocations
  useEffect(() => {
    if (!autoReplay || paused) return
    const orbitPeriodMs = (2 * Math.PI * 1000) / (ORBIT_OMEGA_BASE * Math.max(0.5, speedMult) * SPEED_SCALE)
    // Approximate per-tick interval — averaged across the typical N range.
    // Exact pacing depends on current in-play count which is read at fire-time.
    const tickMs = (LOOP_LAPS_BEFORE_TRAVEL * orbitPeriodMs) / 8
    let cycleIdx = 0
    const fire = () => {
      const inPlay: number[] = []
      for (let i = 0; i < slotLocationsRef.current.length; i++) {
        if (slotLocationsRef.current[i] !== 'none') inPlay.push(i)
      }
      const N = inPlay.length
      if (N === 0) return
      const orderIdx = travelOrderInterleaved(N)[cycleIdx % N]
      const slot = inPlay[orderIdx]
      setTravelCounts((prev) => {
        const next = prev.slice()
        next[slot] = (next[slot] ?? 0) + 1
        return next
      })
      cycleIdx++
    }
    const handle = setInterval(fire, tickMs)
    return () => clearInterval(handle)
  }, [autoReplay, speedMult, paused])

  const setSpread = useCallback((newHalf: number) => {
    const mx = (pointA[0] + pointB[0]) / 2
    const my = (pointA[1] + pointB[1]) / 2
    const mz = (pointA[2] + pointB[2]) / 2
    const dx = pointA[0] - mx
    const dy = pointA[1] - my
    const dz = pointA[2] - mz
    const curHalf = Math.hypot(dx, dy, dz)
    if (curHalf < 1e-6) {
      setPointA([mx - newHalf, my, mz])
      setPointB([mx + newHalf, my, mz])
      return
    }
    const k = newHalf / curHalf
    setPointA([mx + dx * k, my + dy * k, mz + dz * k])
    setPointB([mx - dx * k, my - dy * k, mz - dz * k])
  }, [pointA, pointB])

  // Manual "recenter" — resets OrbitControls back to the initial camera
  // position and target, undoing whatever rotation/zoom the user has
  // applied via touch.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitControlsRef = useRef<any>(null)
  const onRecenter = useCallback(() => {
    orbitControlsRef.current?.reset?.()
  }, [])

  const applyPreset = useCallback((p: Preset) => {
    setColorMode(p.colorMode)
    setSolidColor(p.solidColor)
    setIndividualColors(p.individualColors.slice())
    setGradientStart(p.gradientStart)
    setGradientEnd(p.gradientEnd)
    setBgColor(p.bgColor)
    setPointA([-p.spread, 0, 0])
    setPointB([p.spread, 0, 0])
    setSpeedMult(p.speed)
    setAutoReplay(p.loop)
    setShowNuclei(p.showNuclei)
    setShowAxis(p.showAxis)
    setTheme(p.theme)
    setHeadScale(p.headScale)
    setHaloScale(p.haloScale)
    setTrailWidth(p.trailWidth)
    setSlotLocations(() => {
      const out = new Array(MAX_ELECTRONS).fill('none' as SlotLocation)
      const n = Math.max(0, Math.min(MAX_ELECTRONS, p.electronCount))
      for (let i = 0; i < n; i++) out[i] = 'A'
      return out
    })
    const ctrl = orbitControlsRef.current
    if (ctrl?.object?.position && ctrl?.target) {
      ctrl.object.position.set(p.camPos[0], p.camPos[1], p.camPos[2])
      ctrl.target.set(p.camTgt[0], p.camTgt[1], p.camTgt[2])
      ctrl.update?.()
    }
  }, [setTheme])

  // Capture current scene as a Preset-shaped JSON blob. Logged to the
  // console, written to clipboard (for phone), and rendered into a
  // visible <pre> below the preset row so the values can be selected
  // and pasted back to whoever is baking in the new preset.
  const [capturedPreset, setCapturedPreset] = useState<string | null>(null)
  const [captureFlash, setCaptureFlash] = useState(false)
  const onCapturePreset = useCallback(() => {
    const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p
    const electronCount = slotLocations.filter((s) => s !== 'none').length
    const data = {
      name: '<TBD>',
      electronCount,
      colorMode,
      solidColor,
      individualColors,
      gradientStart,
      gradientEnd,
      bgMode,
      bgColor,
      bgGradientStart,
      bgGradientEnd,
      spread: round(chordHalf),
      speed: speedMult,
      loop: autoReplay,
      showNuclei,
      showAxis,
      showStars,
      theme,
      camPos: camPos.map((n) => round(n)) as [number, number, number],
      camTgt: camTgt.map((n) => round(n)) as [number, number, number],
      headScale,
      haloScale,
      trailWidth,
    }
    const text = JSON.stringify(data, null, 2)
    setCapturedPreset(text)
    // eslint-disable-next-line no-console
    console.log('[atom-motion preset]', data)
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {})
    }
    setCaptureFlash(true)
    window.setTimeout(() => setCaptureFlash(false), 1200)
  }, [
    slotLocations,
    colorMode,
    solidColor,
    individualColors,
    gradientStart,
    gradientEnd,
    bgMode,
    bgColor,
    bgGradientStart,
    bgGradientEnd,
    chordHalf,
    speedMult,
    autoReplay,
    showNuclei,
    showAxis,
    showStars,
    theme,
    camPos,
    camTgt,
    headScale,
    haloScale,
    trailWidth,
  ])

  return (
    <div
      className={`${s.root} ${theme === 'light' ? s.themeLight : s.themeDark} ${bgMode === 'gradient' ? s.bgGradient : ''}`}
      style={{
        ['--lab-bg-base' as string]: bgColor,
        ['--lab-bg-grad-start' as string]: bgGradientStart,
        ['--lab-bg-grad-end' as string]: bgGradientEnd,
      }}
    >
      <div className={s.canvasArea}>
        <Canvas
          camera={{ position: DEFAULT_CAMERA_POS, fov: FOV_DEG }}
          frameloop="always"
          aria-hidden="true"
        >
          <OrbitControls
            ref={orbitControlsRef}
            makeDefault
            enableRotate
            enablePan
            enableZoom
            enableDamping
            dampingFactor={0.12}
            rotateSpeed={0.9}
            panSpeed={0.9}
            screenSpacePanning
            minDistance={4}
            maxDistance={80}
            target={DEFAULT_CAMERA_TARGET}
            onStart={() => {
              if (interactingTimeoutRef.current) clearTimeout(interactingTimeoutRef.current)
              setInteracting(true)
            }}
            onEnd={() => {
              if (interactingTimeoutRef.current) clearTimeout(interactingTimeoutRef.current)
              interactingTimeoutRef.current = setTimeout(() => setInteracting(false), 300)
            }}
          />
          <MasterClock
            timeRef={globalScaledTimeRef}
            speedMult={effectiveSpeedMult}
            reducedMotion={reducedMotion}
          />
          <CameraDebugger
            controlsRef={orbitControlsRef}
            onUpdate={(pos, tgt) => {
              setCamPos(pos)
              setCamTgt(tgt)
            }}
          />
          {showStars && (
            <Stars
              radius={80}
              depth={40}
              count={1500}
              factor={1}
              saturation={0}
              fade
              speed={0.6}
            />
          )}
          <group rotation={[0, 0, groupTiltZ]}>
            {(showAxis || interacting) && (
              <AxisIndicators
                chordHalf={chordHalf}
                color={lightenHex(bgColor, 0.45)}
                opacity={palette.axisOpacity}
              />
            )}
            {(showNuclei || interacting) && <Nuclei chordHalf={chordHalf} color={palette.nucleus} />}
            <DimensionMarker
              pointA={[-chordHalf, 0, 0]}
              pointB={[chordHalf, 0, 0]}
              visible={spreadActive && guidesEnabled}
              color={lightenHex(bgColor, 0.55)}
            />
            {electronSpecs.map((spec, i) => {
              const c = electronColors[i] ?? DEFAULT_E_COLOR
              return (
                <ElectronProbe
                  key={`e${i}`}
                  spec={spec}
                  fadeTex={fadeTex}
                  orbTex={orbTex}
                  headScale={headScale}
                  haloScale={haloScale}
                  trailWidth={trailWidth}
                  reducedMotion={reducedMotion}
                  speedMult={effectiveSpeedMult}
                  chordHalf={chordHalf}
                  orbitSize={orbitSize}
                  existence={slotLocations[i] !== 'none' ? 'visible' : 'idle'}
                  travelCount={travelCounts[i] ?? 0}
                  atom={slotLocations[i] === 'B' ? 'B' : 'A'}
                  startSeed={startSeeds[i] ?? 0}
                  trailColor={c}
                  color={c}
                  haloColor={c}
                  globalScaledTimeRef={globalScaledTimeRef}
                />
              )
            })}
          </group>
          <EffectComposer>
            <Bloom
              intensity={0.7}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.6}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>
      </div>


      {/* Top-center: atom quick controls. Always visible — one tap to
          add to the next empty slot, remove the highest, or move the
          highest electron between atoms. */}
      <div className={s.topAtomBar} aria-label="Atom quick controls">
        <button
          type="button"
          className={`${s.btn} ${s.btnIcon}`}
          onClick={onQuickAdd}
          disabled={!slotLocations.includes('none')}
          aria-label="Add electron to next empty orbit"
          title="Add electron"
        >
          +
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnIcon}`}
          onClick={onQuickRemove}
          disabled={highestOccupied === -1}
          aria-label="Remove highest electron"
          title="Remove electron"
        >
          −
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnIcon}`}
          onClick={onQuickMoveToB}
          disabled={!slotLocations.includes('A')}
          aria-label="Move highest A electron to B"
          title="→ B"
        >
          →B
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnIcon}`}
          onClick={onQuickMoveToA}
          disabled={!slotLocations.includes('B')}
          aria-label="Move highest B electron to A"
          title="← A"
        >
          ←A
        </button>
      </div>

      {/* Bottom-center: playback + speed. Always visible. Speed slider
          sits beneath the play/loop/refresh button cluster. */}
      <div className={s.bottomPlaybackBar} aria-label="Playback">
        <div className={s.bottomPlaybackButtons}>
          <button
            type="button"
            className={`${s.btn} ${s.btnIcon}`}
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Play' : 'Pause'}
            title={paused ? 'Play' : 'Pause'}
          >
            {paused ? '▶' : '‖'}
          </button>
          <button
            type="button"
            className={`${s.btn} ${s.btnIcon} ${autoReplay ? s.btnActive : ''}`}
            onClick={() => setAutoReplay((v) => !v)}
            aria-label={autoReplay ? 'Disable loop' : 'Enable loop'}
            title={autoReplay ? 'Loop on' : 'Loop off'}
          >
            {autoReplay ? '↻' : '○'}
          </button>
          <button
            type="button"
            className={`${s.btn} ${s.btnIcon}`}
            onClick={onRefresh}
            aria-label="Refresh — reset everything"
            title="Refresh"
          >
            ⟲
          </button>
        </div>
        <div className={s.bottomPlaybackSpeed}>
          <SliderRow
            label="speed"
            value={speedMult}
            min={0.5}
            max={10}
            step={0.5}
            onChange={setSpeedMult}
            format={(v) => `${v}×`}
          />
        </div>
      </div>

      {/* Right-edge dock + panel stack. Toggleable category panels
          (Electrons / Colors / Dimensions / Scene). Multiple may be
          open simultaneously. */}
      <div className={s.dock} aria-label="Panels">
        {PANEL_DEFINITIONS.map(({ key, icon, label }) => (
          <button
            key={key}
            type="button"
            className={`${s.btn} ${s.btnIcon} ${s.dockBtn} ${panelsOpen[key] ? s.btnActive : ''}`}
            onClick={() => togglePanel(key)}
            aria-label={`Toggle ${label} panel`}
            title={label}
          >
            {icon}
          </button>
        ))}
      </div>
      <div className={s.panelStack} aria-label="Open panels">
        {PANEL_DEFINITIONS.map(({ key, label, chunk }) => panelsOpen[key] ? (
          <div key={key} className={s.panel}>
            <div className={s.panelHeader}>
              <span className={s.panelTitle}>{label}</span>
              <button
                type="button"
                className={s.panelClose}
                onClick={() => togglePanel(key)}
                aria-label={`Close ${label} panel`}
                title="Close"
              >
                ×
              </button>
            </div>
            <div className={s.panelBody}>
              {key === 'colors' ? (
                <>
                  <div className={s.subSection}>
                    <div className={s.subSectionLabel}>Electrons</div>
                    <div className={s.gradientRow}>
                      <input
                        type="color"
                        value={gradientStart}
                        onChange={(e) => {
                          setGradientStart(e.currentTarget.value)
                          if (colorMode !== 'gradient') setColorMode('gradient')
                        }}
                        className={s.colorPicker}
                        aria-label="Electron gradient start"
                        title="Start"
                      />
                      <span className={s.gradientArrow}>→</span>
                      <input
                        type="color"
                        value={gradientEnd}
                        onChange={(e) => {
                          setGradientEnd(e.currentTarget.value)
                          if (colorMode !== 'gradient') setColorMode('gradient')
                        }}
                        className={s.colorPicker}
                        aria-label="Electron gradient end"
                        title="End"
                      />
                    </div>
                    <button
                      type="button"
                      className={s.subSectionToggle}
                      onClick={() => setMoreModesOpen((v) => !v)}
                      aria-expanded={moreModesOpen}
                    >
                      {moreModesOpen ? '▾' : '▸'} More modes
                    </button>
                    {moreModesOpen && (
                      <>
                        <div className={s.modeTabs}>
                          <button
                            type="button"
                            className={`${s.modeTab} ${colorMode === 'solid' ? s.modeTabActive : ''}`}
                            onClick={() => onSelectColorMode('solid')}
                          >
                            Solid
                          </button>
                          <button
                            type="button"
                            className={`${s.modeTab} ${colorMode === 'individual' ? s.modeTabActive : ''}`}
                            onClick={() => onSelectColorMode('individual')}
                          >
                            Individual
                          </button>
                          <button
                            type="button"
                            className={`${s.modeTab} ${colorMode === 'gradient' ? s.modeTabActive : ''}`}
                            onClick={() => onSelectColorMode('gradient')}
                          >
                            Gradient
                          </button>
                        </div>
                        {colorMode === 'solid' && (
                          <input
                            type="color"
                            value={solidColor}
                            onChange={(e) => setSolidColor(e.currentTarget.value)}
                            className={s.colorPicker}
                            aria-label="Solid color"
                          />
                        )}
                        {colorMode === 'individual' && (
                          <div className={s.individualGrid}>
                            {Array.from({ length: MAX_ELECTRONS }, (_, i) => (
                              <input
                                key={`pal-e${i}`}
                                type="color"
                                value={individualColors[i] ?? DEFAULT_E_COLOR}
                                onChange={(e) => setIndividualColorAt(i, e.currentTarget.value)}
                                className={s.colorPicker}
                                aria-label={`Electron ${i + 1} color`}
                                title={`Electron ${i + 1}`}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className={s.subSection}>
                    <div className={s.subSectionLabel}>Background</div>
                    <div className={s.modeTabs}>
                      <button
                        type="button"
                        className={`${s.modeTab} ${bgMode === 'solid' ? s.modeTabActive : ''}`}
                        onClick={() => setBgMode('solid')}
                      >
                        Solid
                      </button>
                      <button
                        type="button"
                        className={`${s.modeTab} ${bgMode === 'gradient' ? s.modeTabActive : ''}`}
                        onClick={() => setBgMode('gradient')}
                      >
                        Gradient
                      </button>
                    </div>
                    {bgMode === 'solid' && (
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.currentTarget.value)}
                        className={s.colorPicker}
                        aria-label="Background color"
                        title="Background"
                      />
                    )}
                    {bgMode === 'gradient' && (
                      <div className={s.gradientRow}>
                        <input
                          type="color"
                          value={bgGradientStart}
                          onChange={(e) => setBgGradientStart(e.currentTarget.value)}
                          className={s.colorPicker}
                          aria-label="Background gradient start"
                          title="Top"
                        />
                        <span className={s.gradientArrow}>→</span>
                        <input
                          type="color"
                          value={bgGradientEnd}
                          onChange={(e) => setBgGradientEnd(e.currentTarget.value)}
                          className={s.colorPicker}
                          aria-label="Background gradient end"
                          title="Bottom"
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : key === 'scene' ? (
                <>
                  <SliderRow
                    label="spread"
                    value={Math.min(20, Math.max(1.5, chordHalf))}
                    min={1.5}
                    max={20}
                    step={0.1}
                    onChange={setSpread}
                    onActiveChange={onSpreadActiveChange}
                    format={(v) => v.toFixed(1)}
                  />
                  <div className={s.subSectionLabel}>presets</div>
                  <div className={s.presetButtons}>
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        className={`${s.btn} ${s.btnPreset}`}
                        onClick={() => applyPreset(p)}
                        aria-label={`Apply preset ${p.name}`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <div className={s.subSectionLabel}>capture</div>
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnPreset}`}
                    onClick={onCapturePreset}
                    aria-label="Capture current scene as preset JSON"
                  >
                    {captureFlash ? 'copied ✓' : 'capture preset'}
                  </button>
                  {capturedPreset && (
                    <pre className={s.capturedBlock}>{capturedPreset}</pre>
                  )}
                  <div className={s.panelRow}>
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnIcon}`}
                      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                      aria-label="Toggle theme"
                      title={theme === 'light' ? 'Light' : 'Dark'}
                    >
                      {theme === 'light' ? '☼' : '☾'}
                    </button>
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnIcon} ${showNuclei ? s.btnActive : ''}`}
                      onClick={() => setShowNuclei((v) => !v)}
                      aria-label="Toggle nuclei"
                      title={showNuclei ? 'Nuclei on' : 'Nuclei off'}
                    >
                      {showNuclei ? '●' : '○'}
                    </button>
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnIcon} ${showAxis ? s.btnActive : ''}`}
                      onClick={() => setShowAxis((v) => !v)}
                      aria-label="Toggle axis"
                      title={showAxis ? 'Axis on' : 'Axis off'}
                    >
                      {showAxis ? '✦' : '✧'}
                    </button>
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnIcon} ${showStars ? s.btnActive : ''}`}
                      onClick={() => setShowStars((v) => !v)}
                      aria-label="Toggle stars"
                      title={showStars ? 'Stars on' : 'Stars off'}
                    >
                      {showStars ? '★' : '☆'}
                    </button>
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnIcon}`}
                      onClick={onRecenter}
                      aria-label="Recenter view"
                      title="Recenter"
                    >
                      ◎
                    </button>
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnIcon} ${guidesEnabled ? s.btnActive : ''}`}
                      onClick={() => setGuidesEnabled((v) => !v)}
                      aria-label={guidesEnabled ? 'Disable guides' : 'Enable guides'}
                      title={guidesEnabled ? 'Guides on' : 'Guides off'}
                    >
                      ⊿
                    </button>
                  </div>
                </>
              ) : key === 'dimensions' ? (
                <>
                  <SliderRow
                    label="head"
                    value={headScale}
                    min={0.0}
                    max={0.50}
                    step={0.01}
                    onChange={setHeadScale}
                    format={(v) => v.toFixed(2)}
                  />
                  <SliderRow
                    label="halo"
                    value={haloScale}
                    min={0.0}
                    max={5.0}
                    step={0.1}
                    onChange={setHaloScale}
                    format={(v) => v.toFixed(1)}
                  />
                  <SliderRow
                    label="trail"
                    value={trailWidth}
                    min={0.0}
                    max={0.50}
                    step={0.01}
                    onChange={setTrailWidth}
                    format={(v) => v.toFixed(2)}
                  />
                </>
              ) : key === 'electrons' ? (
                <>
                  <div className={s.slotGrid}>
                    {Array.from({ length: MAX_ELECTRONS }, (_, k) => {
                      const loc = slotLocations[k]
                      const isArmed = armedSlot === k
                      const cls =
                        loc === 'A'
                          ? s.slotOnA
                          : loc === 'B'
                            ? s.slotOnB
                            : s.slotEmpty
                      // Pulse slot 1 only while the entire stage is empty —
                      // signals "tap here to add your first electron." The
                      // pulse stops the moment any slot becomes occupied.
                      const shouldPulse = k === 0 && highestOccupied === -1
                      const ariaLabel = loc === 'none'
                        ? `Slot ${k + 1}: empty. Tap to add.`
                        : isArmed
                          ? `Slot ${k + 1} on ${loc}. Tap again to delete.`
                          : `Slot ${k + 1} on ${loc}. Tap to arm for delete.`
                      return (
                        <button
                          key={k}
                          type="button"
                          className={`${s.slotCell} ${cls} ${isArmed ? s.slotArmed : ''} ${shouldPulse ? s.slotPulse : ''}`}
                          onClick={() => onSlotTap(k)}
                          aria-label={ariaLabel}
                          aria-pressed={loc !== 'none'}
                        >
                          {k + 1}
                        </button>
                      )
                    })}
                  </div>
                  {armedSlot !== null && slotLocations[armedSlot] !== 'none' && (
                    <div className={s.panelRow}>
                      <span className={s.armedHint}>{`tap slot ${armedSlot + 1} again to remove`}</span>
                      {slotLocations[armedSlot] === 'A' && (
                        <button
                          type="button"
                          className={s.btn}
                          onClick={onSlotMoveToB}
                          aria-label="Move armed electron to atom B"
                        >
                          → B
                        </button>
                      )}
                      {slotLocations[armedSlot] === 'B' && (
                        <button
                          type="button"
                          className={s.btn}
                          onClick={onSlotMoveToA}
                          aria-label="Move armed electron to atom A"
                        >
                          ← A
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <span className={s.panelEmpty}>{`Migrating in chunk ${chunk}…`}</span>
              )}
            </div>
          </div>
        ) : null)}
      </div>

      {/* Always-visible diagnostic HUD pinned bottom-left. Per the labs
          screenshot-debug-complete rule: every /labs/* page surfaces
          commit hash + key live values so a single screenshot is
          debug-complete with no follow-ups. */}
      <div className={s.diagHud} aria-hidden="true">
        <span className={s.buildLabel}>
          {`build·${COMMIT} · cam (${camPos[0]}, ${camPos[1]}, ${camPos[2]}) · tgt (${camTgt[0]}, ${camTgt[1]}, ${camTgt[2]})`}
        </span>
        <span className={s.buildLabel}>
          {`A=${slotLocations.filter((l) => l === 'A').length} B=${slotLocations.filter((l) => l === 'B').length} layout=${activeLayout} bg=${bgMode}/${bgColor}`}
        </span>
      </div>
    </div>
  )
}
