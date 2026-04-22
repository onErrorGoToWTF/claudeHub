import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import clsx from 'clsx'
import { HelpCircle, Lightbulb, Zap, CheckCircle2, XCircle } from 'lucide-react'
import { useInViewReplay } from '../lib/useInViewReplay'
import s from './ui.module.css'

export function PageHeader({ eyebrow, title, subtitle, right }: {
  eyebrow?: string; title: string; subtitle?: string; right?: ReactNode
}) {
  return (
    <div className={s.header}>
      {eyebrow && <div className={s.eyebrow}>{eyebrow}</div>}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <h1 className={`${s.title} serif-display`}>{title}</h1>
        {right}
      </div>
      {subtitle && <p className={s.subtitle}>{subtitle}</p>}
    </div>
  )
}

export function Section({ title, meta, children }: { title: ReactNode; meta?: ReactNode; children: ReactNode }) {
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

export function Chip({ children, variant }: { children: ReactNode; variant?: 'accent' | 'muted' | 'mastery' | 'danger' }) {
  return (
    <span className={clsx(
      s.chip,
      variant === 'accent'  && s.chipAccent,
      variant === 'muted'   && s.chipMuted,
      variant === 'mastery' && s.chipMastery,
      variant === 'danger'  && s.chipDanger,
    )}>
      {children}
    </span>
  )
}

/**
 * Electrified progress bar — thin glowing line that grows left-to-right,
 * with optional milestone nodes that "light up" as the front crosses them.
 *
 * Animation re-triggers every time the bar re-enters the viewport
 * (IntersectionObserver). Only one motion at a time: gradient drift / shimmer
 * are intentionally absent so the growth reveal is the only thing moving.
 * Reduced-motion: static end state, no replay.
 *
 * `value` + each `milestones[i]` are 0..1.
 */
export function ProgressBar({ value, milestones }: {
  value: number
  milestones?: number[]
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  const [ref, playKey] = useInViewReplay<HTMLDivElement>()
  const GROW_MS = 900

  return (
    <div
      ref={ref}
      className={s.bar}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={s.barTrack} />
      <div
        key={`fill-${playKey}`}
        className={s.barFill}
        style={{ ['--target' as string]: `${pct}%` } as CSSProperties}
      />
      {milestones?.map((m, i) => {
        const mpct = Math.max(0, Math.min(1, m)) * 100
        const lit = pct >= mpct
        const delayMs = Math.round((mpct / 100) * GROW_MS)
        return (
          <span
            key={`node-${i}-${playKey}`}
            className={clsx(s.barNode, lit && s.barNodeLit)}
            style={{
              left: `${mpct}%`,
              ['--lit-delay' as string]: `${delayMs}ms`,
            } as CSSProperties}
          />
        )
      })}
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

/** Small colored icon in the top-right corner of a relatively-positioned card.
 *  Replaces the heavier ribbon — quieter, readable at a glance. */
export function StatusIcon({ tone, label }: {
  tone: 'backlog' | 'planned' | 'in_progress' | 'completed' | 'canceled'
  label: string
}) {
  const Icon =
    tone === 'backlog'     ? HelpCircle    :
    tone === 'planned'     ? Lightbulb     :
    tone === 'in_progress' ? Zap           :
    tone === 'completed'   ? CheckCircle2  :
                             XCircle
  const cls =
    tone === 'backlog'     ? s.cornerBacklog :
    tone === 'planned'     ? s.cornerPlanned :
    tone === 'in_progress' ? s.cornerInProgress :
    tone === 'completed'   ? s.cornerCompleted :
                             s.cornerCanceled
  return (
    <span className={clsx(s.cornerIcon, cls)} aria-label={label} title={label}>
      <Icon size={16} strokeWidth={2} />
    </span>
  )
}

export const TileTitle = ({ children }: { children: ReactNode }) => <div className={s.tileTitle}>{children}</div>
export const TileMeta  = ({ children }: { children: ReactNode }) => <div className={s.tileMeta}>{children}</div>
export const TileRow   = ({ children }: { children: ReactNode }) => <div className={s.tileRow}>{children}</div>

export function Empty({ children }: { children: ReactNode }) { return <div className={s.empty}>{children}</div> }

export function List({ children }: { children: ReactNode }) { return <div className={s.list}>{children}</div> }

export function Row({
  title, sub, shortcut, selected, done, right, onClick, disabled,
}: {
  title: ReactNode
  sub?: ReactNode
  shortcut?: ReactNode
  selected?: boolean
  done?: boolean
  right?: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={clsx(s.row, selected && s.rowOn, done && s.rowDone)}
      onClick={onClick}
      disabled={disabled}
      data-tappable="true"
    >
      <div className={s.rowBody}>
        <div className={s.rowTitle}>{title}</div>
        {sub && <div className={s.rowSub}>{sub}</div>}
      </div>
      {right}
      {shortcut !== undefined && <span className={s.rowShortcut} aria-hidden>{shortcut}</span>}
    </button>
  )
}

// Grid class-name constants live in ui/grid.ts — import them from there.
// (Keeping this file component-only so Vite fast-refresh stays happy.)
