import type { Progress, Project, LibraryItem, Topic } from '../db/types'

export type ActivityKind =
  | 'lesson_done'
  | 'quiz_taken'
  | 'project_new'
  | 'project_updated'
  | 'library_added'
  | 'library_pinned'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  ts: number
  title: string
  sub: string
  to?: string
}

/** Build a unified, time-sorted event stream across the app.
 *  Pure — no DB calls — callers pass in the raw lists they already fetched. */
export function buildActivity(
  progs: Progress[],
  topicsById: Map<string, Topic>,
  projects: Project[],
  library: LibraryItem[],
): ActivityItem[] {
  const out: ActivityItem[] = []

  for (const p of progs) {
    const topic = topicsById.get(p.topicId)
    const topicTitle = topic?.title ?? p.topicId
    if (p.kind === 'lesson' && p.completedAt) {
      out.push({
        id: `prog.${p.id}.lesson`,
        kind: 'lesson_done',
        ts: p.completedAt,
        title: topicTitle,
        sub: 'Lesson complete',
        to: `/learn/lesson/${p.id}`,
      })
    }
    if (p.kind === 'quiz') {
      const pct = Math.round((p.score ?? 0) * 100)
      out.push({
        id: `prog.${p.id}.quiz`,
        kind: 'quiz_taken',
        ts: p.updatedAt,
        title: topicTitle,
        sub: `Quiz · ${pct}%`,
        to: `/learn/quiz/${p.id}`,
      })
    }
  }

  for (const proj of projects) {
    if (proj.createdAt === proj.updatedAt) {
      out.push({
        id: `proj.${proj.id}.new`,
        kind: 'project_new',
        ts: proj.createdAt,
        title: proj.title,
        sub: 'New project',
        to: `/projects/${proj.id}`,
      })
    } else {
      out.push({
        id: `proj.${proj.id}.upd`,
        kind: 'project_updated',
        ts: proj.updatedAt,
        title: proj.title,
        sub: 'Project updated',
        to: `/projects/${proj.id}`,
      })
    }
  }

  for (const item of library) {
    // Only include items the user can actually open (have a body).
    if (!item.body) continue
    if (item.pinned) {
      out.push({
        id: `lib.${item.id}.pin`,
        kind: 'library_pinned',
        // Pin doesn't carry its own timestamp; use addedAt as a proxy so pinned
        // items don't bury the stream. A future enhancement: persist pinnedAt.
        ts: item.addedAt,
        title: item.title,
        sub: 'Pinned in Library',
        to: `/library/${item.id}`,
      })
    } else {
      out.push({
        id: `lib.${item.id}.add`,
        kind: 'library_added',
        ts: item.addedAt,
        title: item.title,
        sub: 'Added to Library',
        to: `/library/${item.id}`,
      })
    }
  }

  return out.sort((a, b) => b.ts - a.ts)
}

export function whenShort(ts: number): string {
  const d = Date.now() - ts
  const m = Math.floor(d / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d`
  const w = Math.floor(days / 7)
  if (w < 5)  return `${w}w`
  const mo = Math.floor(days / 30)
  return `${mo}mo`
}
