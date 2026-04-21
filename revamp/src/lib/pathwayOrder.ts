import type { Topic } from '../db/types'

/**
 * Order a user's selected topics into a prerequisite-respecting learning path.
 *
 * Algorithm: Kahn's topological sort over the subgraph induced by the
 * selected IDs. Prereqs referencing topics the user DIDN'T select are
 * treated as satisfied (we only order among the picks — we don't auto-add
 * missing prereqs, that's the user's decision to make in the picker).
 *
 * Tie-breaker when multiple topics are ready at the same step: original
 * track order, then topic.order. Keeps adjacent topics from the same track
 * clustered, which reads more naturally than pure alphabetical.
 *
 * If a cycle is detected (shouldn't happen with well-authored seeds), the
 * leftover topics are appended in fallback order and a console warning fires.
 */
export function orderByPrereqs(all: Topic[], selectedIds: string[]): Topic[] {
  const selected = new Set(selectedIds)
  const picked = all.filter(t => selected.has(t.id))
  const byId = new Map(picked.map(t => [t.id, t]))

  // Adjacency: for each picked topic, prereqs that are ALSO picked.
  const inDegree = new Map<string, number>()
  const outEdges = new Map<string, string[]>()
  for (const t of picked) {
    inDegree.set(t.id, 0)
    outEdges.set(t.id, [])
  }
  for (const t of picked) {
    for (const p of t.prereqTopicIds ?? []) {
      if (selected.has(p)) {
        inDegree.set(t.id, (inDegree.get(t.id) ?? 0) + 1)
        outEdges.get(p)!.push(t.id)
      }
    }
  }

  const trackIndex = new Map<string, number>()
  let next = 0
  for (const t of all) {
    if (!trackIndex.has(t.trackId)) trackIndex.set(t.trackId, next++)
  }
  const sortReady = (ids: string[]) =>
    ids.sort((a, b) => {
      const ta = byId.get(a)!, tb = byId.get(b)!
      const ti = (trackIndex.get(ta.trackId) ?? 0) - (trackIndex.get(tb.trackId) ?? 0)
      if (ti !== 0) return ti
      return ta.order - tb.order
    })

  const ready = sortReady(picked.filter(t => (inDegree.get(t.id) ?? 0) === 0).map(t => t.id))
  const out: Topic[] = []
  while (ready.length > 0) {
    const id = ready.shift()!
    out.push(byId.get(id)!)
    for (const next of outEdges.get(id) ?? []) {
      const d = (inDegree.get(next) ?? 0) - 1
      inDegree.set(next, d)
      if (d === 0) {
        ready.push(next)
        sortReady(ready)
      }
    }
  }

  if (out.length < picked.length) {
    console.warn('[pathwayOrder] cycle detected; appending remaining topics in fallback order')
    const placed = new Set(out.map(t => t.id))
    for (const t of picked) if (!placed.has(t.id)) out.push(t)
  }
  return out
}
