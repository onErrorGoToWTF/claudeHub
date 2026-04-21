import type { Audience, LibraryItem } from '../db/types'

/** User's selected pathway. 'all' = no filter. */
export type UserPathway = 'all' | Audience

export const PATHWAYS: { id: UserPathway; label: string; short: string }[] = [
  { id: 'all',     label: 'All pathways',   short: 'All' },
  { id: 'student', label: 'Student',        short: 'Student' },
  { id: 'office',  label: 'Office',         short: 'Office' },
  { id: 'dev',     label: 'Developer',      short: 'Dev' },
]

/** Content with missing/empty audience is visible to everyone. */
export function matchesPathway(p: UserPathway, audience?: Audience[]): boolean {
  if (p === 'all') return true
  if (!audience || audience.length === 0) return true
  return audience.includes(p)
}

/** True when this item should float to the top for the user's pathway.
 *  - `all` → everything is primary (no sort preference).
 *  - `dev` → everything is primary. Devs get exposure to all sides so they
 *    can build for student/office users; no "everything else" bucket.
 *  - `student`/`office` → only matching items are primary. Non-matching
 *    content is still fully available; it just sits below the primary list. */
export function isPrimaryForPathway(p: UserPathway, audience?: Audience[]): boolean {
  if (p === 'all' || p === 'dev') return true
  if (!audience || audience.length === 0) return true
  return audience.includes(p)
}

/** Split a list into `primary` (matches pathway) and `rest` (everything
 *  else). `split === false` for `all` and `dev` — render as one list. */
export function splitByPathway<T>(
  items: T[],
  audienceOf: (item: T) => Audience[] | undefined,
  p: UserPathway,
): { primary: T[]; rest: T[]; split: boolean } {
  if (p === 'all' || p === 'dev') return { primary: items, rest: [], split: false }
  const primary: T[] = []
  const rest: T[]    = []
  for (const it of items) {
    if (isPrimaryForPathway(p, audienceOf(it))) primary.push(it)
    else rest.push(it)
  }
  return { primary, rest, split: true }
}

/** Short audience tag for chip rendering. Items in multiple audiences show
 *  the one that matters most for the active pathway when possible. */
export function audienceBadge(p: UserPathway, audience?: Audience[]): Audience | null {
  if (!audience || audience.length === 0) return null
  if (audience.length === 1) return audience[0]
  // Prefer the one that matches the active pathway, if any.
  if (p !== 'all' && p !== 'dev' && audience.includes(p)) return p
  // Otherwise first alphabetical for stability.
  const sorted = [...audience].sort()
  return sorted[0] ?? null
}

/** Human label for an Audience tag. */
export const AUDIENCE_LABEL: Record<Audience, string> = {
  student: 'Student',
  office:  'Office',
  dev:     'Dev',
}

/** Derive a sensible default audience for a Library item from its shape.
 *  Used at seed time when an item doesn't carry an explicit audience. */
export function deriveLibraryAudience(item: LibraryItem): Audience[] {
  if (item.audience && item.audience.length > 0) return item.audience
  const tags = new Set(item.tags ?? [])
  const cat = item.toolCategory
  const has = (t: string) => tags.has(t)

  // Foundational references — relevant to everyone.
  if (has('foundations') || has('reference')) return ['student', 'office', 'dev']

  // Anything code-shaped → dev only.
  if (cat === 'ide' || cat === 'framework') return ['dev']
  if (has('coding') || has('cli') || has('sdk') || has('orm') || has('ssr') || has('react')
      || has('routing') || has('language') || has('state') || has('build')
      || has('devops') || has('container') || has('vcs')) {
    return ['dev']
  }

  // Creative / no-code surfaces — office + student.
  if (has('image') || has('video') || has('voice') || has('audio') || has('automation')) {
    return ['office', 'student']
  }

  // Frontier chat models + hosting the whole team sees — everyone.
  if (cat === 'model' || has('chat')) return ['student', 'office', 'dev']

  // Infra/hosting/db/services default to dev (they require code to use).
  if (cat === 'service') {
    if (has('hosting') || has('db') || has('vector') || has('edge') || has('infra')) return ['dev']
    // generative services with no code path → creators
    if (has('generative')) return ['office', 'student']
    return ['dev']
  }

  // Generic tools — default visible to all so nothing disappears silently.
  return ['student', 'office', 'dev']
}
