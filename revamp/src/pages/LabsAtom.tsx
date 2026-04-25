import { AtomLogo } from '../ui/atom/AtomLogo'
import { LabsNav } from '../ui/atom/LabsNav'
import s from './LabsAtom.module.css'

export function LabsAtom() {
  return (
    <div className={s.wrap}>
      {/* Single-orbit test cells — kept as backup for debugging one
          electron at a time. Uncomment to compare side-by-side.
          <AtomLogo onlyPlane="xy" settle />
          <AtomLogo onlyPlane="yz" settle />
          <AtomLogo onlyPlane="xz" settle /> */}
      <AtomLogo settle />
      <LabsNav />
    </div>
  )
}
