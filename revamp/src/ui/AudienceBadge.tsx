import type { Audience } from '../db/types'
import { AUDIENCE_LABEL, audienceBadge, type UserPathway } from '../lib/audience'

/** Tiny pill showing which pathway an item is primarily for.
 *  Discreet — greyscale on non-matching items, subtle accent on matches. */
export function AudienceBadge({ audience, pathway }: {
  audience?: Audience[]
  pathway:   UserPathway
}) {
  const tag = audienceBadge(pathway, audience)
  if (!tag) return null
  const isPrimary =
    pathway === 'all' || pathway === 'dev' ||
    (audience?.includes(pathway) ?? false)
  const tone = isPrimary ? primary : secondary
  return (
    <span style={{ ...base, ...tone }} aria-label={`${AUDIENCE_LABEL[tag]} audience`}>
      {AUDIENCE_LABEL[tag].toLowerCase()}
    </span>
  )
}

const base = {
  display: 'inline-block',
  padding: '1px 7px',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.02em',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--hair)',
  lineHeight: 1.5,
} as const

const primary = {
  color: 'var(--accent-ink)',
  background: 'var(--accent-surface)',
  borderColor: 'var(--accent-border)',
} as const

const secondary = {
  color: 'var(--ink-3)',
  background: 'var(--bg-sunken)',
} as const
