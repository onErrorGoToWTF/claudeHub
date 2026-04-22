import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

/** Collapsible band with a section label + caret affordance.
 *  Used to tuck "Everything else" (or similar) below the primary content
 *  without hiding it. Caret rotates; the region stays in the DOM when
 *  open so rendered anim / progress bars can replay on re-mount. */
export function Disclosure({
  label,
  meta,
  defaultOpen = false,
  tone = 'muted',
  children,
}: {
  label: string
  meta?: string
  defaultOpen?: boolean
  tone?: 'muted' | 'default'
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-3)',
          width: '100%',
          margin: 'var(--space-8) 0 var(--space-2)',
          paddingBottom: 6,
          borderBottom: '1px solid var(--hair)',
          background: 'transparent',
          border: 0,
          borderBottomWidth: 1,
          borderBottomStyle: 'solid',
          borderBottomColor: 'var(--hair)',
          cursor: 'pointer',
          color: tone === 'muted' ? 'var(--ink-3)' : 'var(--ink-2)',
          textAlign: 'left',
        }}
      >
        <ChevronDown
          size={13}
          strokeWidth={2}
          style={{
            transition: 'transform var(--dur-2) var(--ease-premium)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            flexShrink: 0,
            marginRight: -2,
          }}
        />
        <span style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>{label}</span>
        {meta && (
          <span style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--ink-3)',
            fontWeight: 500,
            marginLeft: 'auto',
          }}>{meta}</span>
        )}
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}
