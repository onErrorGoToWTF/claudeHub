import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'
import s from './ui.module.css'

export function PageHeader({ eyebrow, title, subtitle, right }: {
  eyebrow?: string; title: string; subtitle?: string; right?: ReactNode
}) {
  return (
    <div className={s.header}>
      {eyebrow && <div className={s.eyebrow}>{eyebrow}</div>}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <h1 className={s.title}>{title}</h1>
        {right}
      </div>
      {subtitle && <p className={s.subtitle}>{subtitle}</p>}
    </div>
  )
}

export function Section({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className={s.section}>
      <div className={s.sectionHead}>
        <h2 className={s.sectionTitle}>{title}</h2>
        {meta && <div className={s.sectionMeta}>{meta}</div>}
      </div>
      {children}
    </section>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'ghost' | 'danger' }
export function Button({ variant = 'default', className, ...rest }: BtnProps) {
  return (
    <button
      className={clsx(
        s.btn,
        variant === 'primary' && s.btnPrimary,
        variant === 'ghost'   && s.btnGhost,
        variant === 'danger'  && s.btnDanger,
        className,
      )}
      {...rest}
    />
  )
}

export function Chip({ children, variant }: { children: ReactNode; variant?: 'accent' | 'mastery' | 'danger' }) {
  return (
    <span className={clsx(
      s.chip,
      variant === 'accent'  && s.chipAccent,
      variant === 'mastery' && s.chipMastery,
      variant === 'danger'  && s.chipDanger,
    )}>
      {children}
    </span>
  )
}

export function ProgressBar({ value }: { value: number /* 0..1 */ }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={s.bar} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={s.barFill} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Tile({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className={s.tile} data-tappable="true" onClick={onClick}>
      {children}
    </button>
  )
}

export const TileTitle = ({ children }: { children: ReactNode }) => <div className={s.tileTitle}>{children}</div>
export const TileMeta  = ({ children }: { children: ReactNode }) => <div className={s.tileMeta}>{children}</div>
export const TileRow   = ({ children }: { children: ReactNode }) => <div className={s.tileRow}>{children}</div>

export function Empty({ children }: { children: ReactNode }) { return <div className={s.empty}>{children}</div> }

export const grid = s.grid
export const grid3 = s.grid3
