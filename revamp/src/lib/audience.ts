import type { Audience, LibraryItem } from '../db/types'

/** User's selected pathway. 'all' = no filter. */
export type UserPathway = 'all' | Audience

export const PATHWAYS: { id: UserPathway; label: string; short: string }[] = [
  { id: 'all',     label: 'All pathways',   short: 'All' },
  { id: 'student', label: 'Student',        short: 'Student' },
  { id: 'office',  label: 'Office',         short: 'Office' },
  { id: 'media',   label: 'Media creator',  short: 'Media' },
  { id: 'vibe',    label: 'Vibe coder',     short: 'Vibe' },
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
 *  - `student`/`office`/`dev` → only audience-matching items are primary.
 *    Non-matching content is still fully available; it sits below the
 *    primary list and — for dev — is collapsed by default
 *    (see shouldCollapseRestByDefault). */
export function isPrimaryForPathway(p: UserPathway, audience?: Audience[]): boolean {
  if (p === 'all') return true
  if (!audience || audience.length === 0) return true
  return audience.includes(p)
}

/** Split a list into `primary` (matches pathway) and `rest` (everything
 *  else). `split === false` only for `all` — one merged list, no labels. */
export function splitByPathway<T>(
  items: T[],
  audienceOf: (item: T) => Audience[] | undefined,
  p: UserPathway,
): { primary: T[]; rest: T[]; split: boolean } {
  if (p === 'all') return { primary: items, rest: [], split: false }
  const primary: T[] = []
  const rest: T[]    = []
  for (const it of items) {
    if (isPrimaryForPathway(p, audienceOf(it))) primary.push(it)
    else rest.push(it)
  }
  return { primary, rest, split: true }
}

/** Whether the "Everything else" band should start collapsed.
 *  Only `dev` defaults to collapsed — devs already know most basics and
 *  want the foundational / office material tucked away until they ask.
 *  Student + office default to expanded because exposure to the rest
 *  broadens their learning. */
export function shouldCollapseRestByDefault(p: UserPathway): boolean {
  return p === 'dev'
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
  media:   'Media',
  vibe:    'Vibe',
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
  if (has('foundations') || has('reference')) return ['student', 'office', 'media', 'vibe', 'dev']

  // IDEs + frameworks — building software; vibe coders use them too.
  if (cat === 'ide' || cat === 'framework') return ['vibe', 'dev']

  // Deep engineering tags — real dev only.
  if (has('cli') || has('sdk') || has('orm') || has('ssr') || has('react')
      || has('routing') || has('language') || has('state') || has('build')
      || has('devops') || has('container') || has('vcs')) {
    return ['dev']
  }
  // Generic "coding" tag — dev + vibe.
  if (has('coding')) return ['vibe', 'dev']

  // Image/video/voice/audio → media creators (primary) + office (decks, presentations).
  if (has('image') || has('video') || has('voice') || has('audio')) {
    return ['media', 'office']
  }
  // Automation / no-code workflow tools → office + vibe.
  if (has('automation')) return ['office', 'vibe']

  // Frontier chat models + generic chat — everyone.
  if (cat === 'model' || has('chat')) return ['student', 'office', 'media', 'vibe', 'dev']

  // Services — depends on shape.
  if (cat === 'service') {
    if (has('hosting') || has('db') || has('vector') || has('edge') || has('infra')) return ['vibe', 'dev']
    if (has('generative')) return ['media', 'office']
    return ['vibe', 'dev']
  }

  // Generic tools — default visible to all so nothing disappears silently.
  return ['student', 'office', 'media', 'vibe', 'dev']
}
