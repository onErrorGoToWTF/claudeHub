/*
 * /labs/elements — single 3D Bohr atom on stage.
 *
 * First element on stage: Og (oganesson, Z=118) — the largest of the 118,
 * 7 shells deep, picked because it stress-tests the layout: 32 electrons
 * on shells 4 + 5, 8 on the outer shell, full nucleus glow.
 *
 * Visuals replicate the textbook Bohr-diagram look from the Three.js
 * reference at bamer.biruni.edu.tr/lab/interactive-periodic-table:
 *
 *   - flat coplanar ring shells on y=0
 *   - all electrons orbit the y=0 plane (cos/sin in x/z only)
 *   - per-element random initial tilt on x/z so the rings read as 3D
 *   - UnrealBloom on emissive nucleus + electrons for the glow
 *   - light grey rings, faint and translucent
 *   - cosmic backdrop, OrbitControls so the user can spin around
 *
 * HUD reuses AtomLabHud (4-line bottom-pinned mono) so a single phone
 * screenshot is debug-complete: build hash, route, viewport, config,
 * live math state, mount events.
 */
import { useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { ACESFilmicToneMapping } from 'three'
import { LabsNav } from '../ui/atom/LabsNav'
import { AtomLabHud, type AtomLabMathState, type AtomLabEvent } from '../ui/atom/AtomLabHud'
import { BohrModel } from '../ui/element/BohrModel'
import { ELEMENTS } from '../db/elements'
import s from './LabsElements.module.css'

const ELEMENT = ELEMENTS.Og

const BLOOM_STRENGTH = 0.1
const BLOOM_RADIUS = 0.2
const BLOOM_THRESHOLD = 0.85

// Camera placement — Og's outer ring sits at radius ~2.6 (scale=1). Camera
// is on the +z axis looking straight at the xy-plane so the rings render
// as perfect concentric circles, perfectly flat to the viewer.
const CAMERA_POSITION: [number, number, number] = [0, 0, 9]
const CAMERA_FOV = 45

export function LabsElements() {
  const totalElectrons = ELEMENT.electronsPerShell.reduce((a, b) => a + b, 0)
  const valence = ELEMENT.electronsPerShell[ELEMENT.electronsPerShell.length - 1] ?? 0

  const config = useMemo(
    () => ({
      element: ELEMENT.symbol,
      Z: ELEMENT.number,
      shells: `[${ELEMENT.electronsPerShell.join(',')}]`,
      total: totalElectrons,
      valence,
      category: ELEMENT.category,
      bloomStr: BLOOM_STRENGTH,
      bloomR: BLOOM_RADIUS,
      bloomTh: BLOOM_THRESHOLD,
    }),
    [totalElectrons, valence],
  )

  // BohrModel writes its own animation; we just give the HUD a static math
  // line summarizing the orbit ranges (innermost shell speed → outermost).
  // No useFrame back-pressure required.
  const mathRef = useRef<AtomLabMathState>({
    phase: 'orbit',
    stateName: ELEMENT.category,
    t: 0,
    vMag: 0,
    extra: `shells=${ELEMENT.electronsPerShell.length} outerR=${(0.15 + ELEMENT.electronsPerShell.length * 0.35).toFixed(2)}`,
  })

  const events = useMemo<AtomLabEvent[]>(
    () => [{ ts: Date.now(), action: `mount ${ELEMENT.symbol} (Z=${ELEMENT.number})` }],
    [],
  )

  return (
    <div className={s.page}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV, near: 0.1, far: 200 }}
        gl={{
          alpha: false,
          antialias: true,
          stencil: false,
          powerPreference: 'high-performance',
          toneMapping: ACESFilmicToneMapping,
        }}
      >
        <color attach="background" args={['#050510']} />

        <ambientLight intensity={0.4} color={0xcccccc} />
        <directionalLight position={[5, 15, 10]} intensity={1.5} />
        <pointLight position={[0, 0, 10]} intensity={0.8} distance={100} />

        <Stars radius={120} depth={60} count={4000} factor={3} fade saturation={0} />

        <BohrModel element={ELEMENT} />

        <OrbitControls
          enableDamping
          dampingFactor={0.07}
          minDistance={1.5}
          maxDistance={30}
          enablePan={false}
        />

        <EffectComposer>
          <Bloom
            intensity={BLOOM_STRENGTH}
            luminanceThreshold={BLOOM_THRESHOLD}
            luminanceSmoothing={BLOOM_RADIUS}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      <LabsNav />
      <AtomLabHud config={config} mathRef={mathRef} events={events} tone="dark" />
    </div>
  )
}
