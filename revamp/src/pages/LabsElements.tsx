/*
 * /labs/elements — periodic-table tile feature, first 8 elements (H–O).
 *
 * Bohr-Rutherford "Lewis-style" tiles. Adjustable proton / neutron /
 * electron counts via a floating control bar. Swipe (or arrow keys, or
 * the on-screen ‹ › buttons) to cycle through each element's default
 * isotope state.
 *
 * Stepping protons crosses element boundaries — the n + e values stick
 * (intentional: lets the user produce ions / synthetic isotopes by
 * adding particles). Swiping resets to the new element's default.
 */
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { ElementTile } from '../ui/element/ElementTile'
import { ParticleControlBar } from '../ui/element/ParticleControlBar'
import { findElementByZ } from '../db/seedElements'
import s from './LabsElements.module.css'

const P_RANGE: [number, number] = [1, 8]
const N_RANGE: [number, number] = [0, 12]
const E_RANGE: [number, number] = [0, 10]

function defaultStateForZ(z: number) {
  const el = findElementByZ(z)
  if (!el) return { protons: 1, neutrons: 0, electrons: 1 }
  const iso = el.isotopes.find(i => i.name === el.defaultIsotope) ?? el.isotopes[0]
  return { protons: iso.protons, neutrons: iso.neutrons, electrons: iso.electrons }
}

export function LabsElements() {
  const [{ protons, neutrons, electrons }, setState] = useState(defaultStateForZ(1))
  // swipeIdx drives the slide animation — bumped only on explicit
  // navigation (swipe / arrow keys / nav buttons), NOT on control-bar
  // p/n/e tweaks. Tweaks update the tile in place.
  const [swipeIdx, setSwipeIdx] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const z = protons

  const gotoElement = useCallback((nextZ: number) => {
    if (nextZ < P_RANGE[0] || nextZ > P_RANGE[1]) return
    setDirection(nextZ > protons ? 1 : -1)
    setSwipeIdx(s => s + 1)
    setState(defaultStateForZ(nextZ))
  }, [protons])

  function adjustProtons(next: number) {
    if (next < P_RANGE[0] || next > P_RANGE[1]) return
    setState(prev => ({ ...prev, protons: next }))
  }

  function adjustNeutrons(next: number) {
    if (next < N_RANGE[0] || next > N_RANGE[1]) return
    setState(prev => ({ ...prev, neutrons: next }))
  }

  function adjustElectrons(next: number) {
    if (next < E_RANGE[0] || next > E_RANGE[1]) return
    setState(prev => ({ ...prev, electrons: next }))
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') gotoElement(z - 1)
      else if (e.key === 'ArrowRight') gotoElement(z + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [z, gotoElement])

  function onDragEnd(_: unknown, info: PanInfo) {
    const SWIPE = 60
    if (info.offset.x < -SWIPE) gotoElement(z + 1)
    else if (info.offset.x > SWIPE) gotoElement(z - 1)
  }

  return (
    <div className={s.page}>
      <div className={s.stage}>
        <button
          type="button"
          className={`${s.nav} ${s.navLeft}`}
          onClick={() => gotoElement(z - 1)}
          disabled={z <= P_RANGE[0]}
          aria-label="previous element"
        >
          ‹
        </button>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={swipeIdx}
            className={s.tileWrap}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={onDragEnd}
            initial={{ opacity: 0, x: direction * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -80 }}
            transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <ElementTile protons={protons} neutrons={neutrons} electrons={electrons} />
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          className={`${s.nav} ${s.navRight}`}
          onClick={() => gotoElement(z + 1)}
          disabled={z >= P_RANGE[1]}
          aria-label="next element"
        >
          ›
        </button>
      </div>

      <div className={s.controlsWrap}>
        <ParticleControlBar
          protons={protons}
          neutrons={neutrons}
          electrons={electrons}
          pRange={P_RANGE}
          nRange={N_RANGE}
          eRange={E_RANGE}
          onProtons={adjustProtons}
          onNeutrons={adjustNeutrons}
          onElectrons={adjustElectrons}
        />
      </div>
    </div>
  )
}
