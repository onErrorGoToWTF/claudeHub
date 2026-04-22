/**
 * Repository layer. Views and mutations should ONLY touch this module —
 * swapping IndexedDB for a hosted backend (Supabase/Turso/etc.) means
 * reimplementing this file, nothing else.
 */
import { db } from './schema'
import type {
  Track, Topic, Lesson, Quiz, Progress, Mastery,
  LibraryItem, LibraryKind, InventoryItem, Project, SearchMiss, ProjectEvent,
  UserPathwayItem, QuizReport,
} from './types'
import { PASS_THRESHOLD } from '../lib/mastery'
import { PATHWAY_TEMPLATES } from '../lib/pathwayTemplates'
import type { UserPathway } from '../lib/audience'

export const repo = {
  // ---------- tracks / topics ----------
  async listTracks(): Promise<Track[]> {
    return db.tracks.orderBy('order').toArray()
  },
  async listTopics(trackId?: string): Promise<Topic[]> {
    const all = await db.topics.orderBy('order').toArray()
    return trackId ? all.filter(t => t.trackId === trackId) : all
  },
  async getTopic(id: string) { return db.topics.get(id) },
  async getTrack(id: string) { return db.tracks.get(id) },

  // ---------- lessons ----------
  async listLessons(topicId: string): Promise<Lesson[]> {
    return (await db.lessons.where('topicId').equals(topicId).toArray())
      .sort((a, b) => a.order - b.order)
  },
  async getLesson(id: string) { return db.lessons.get(id) },

  // ---------- quizzes ----------
  async listQuizzesByTopic(topicId: string): Promise<Quiz[]> {
    return db.quizzes.where('topicId').equals(topicId).toArray()
  },
  async getQuiz(id: string) { return db.quizzes.get(id) },

  // ---------- progress ----------
  async getProgress(id: string) { return db.progress.get(id) },
  async listProgress(): Promise<Progress[]> { return db.progress.toArray() },
  async markLessonComplete(lessonId: string, topicId: string) {
    const now = Date.now()
    await db.progress.put({
      id: lessonId, kind: 'lesson', topicId,
      completedAt: now, updatedAt: now,
    })
    await recomputeMastery(topicId)
  },
  async recordQuiz(quizId: string, topicId: string, score: number) {
    const now = Date.now()
    const prev = await db.progress.get(quizId)
    // Latest attempt wins. A lower score on retake overwrites the old one —
    // Khan-style truth over high-water mark. Report card will persist history.
    await db.progress.put({
      id: quizId, kind: 'quiz', topicId,
      score,
      attempts: (prev?.attempts ?? 0) + 1,
      completedAt: score >= PASS_THRESHOLD ? now : undefined,
      updatedAt: now,
    })
    await recomputeMastery(topicId)
  },

  // ---------- mastery ----------
  async listMastery(): Promise<Mastery[]> { return db.mastery.toArray() },
  async getMastery(topicId: string) { return db.mastery.get(topicId) },

  // ---------- library ----------
  async listLibrary(): Promise<LibraryItem[]> {
    return (await db.library.toArray()).sort((a, b) => b.addedAt - a.addedAt)
  },
  async listLibraryByKind(kind: LibraryKind): Promise<LibraryItem[]> {
    return (await db.library.where('kind').equals(kind).toArray())
      .sort((a, b) => b.addedAt - a.addedAt)
  },
  async getLibraryItem(id: string) { return db.library.get(id) },
  async putLibraryItem(item: LibraryItem) { await db.library.put(item) },
  async deleteLibraryItem(id: string) { await db.library.delete(id) },
  async togglePinned(id: string, pinned: boolean) { await db.library.update(id, { pinned }) },

  // ---------- inventory (tool-filtered library, for Projects intake) ----------
  async listInventory(): Promise<InventoryItem[]> {
    const tools = await db.library.where('kind').equals('tool').toArray()
    return tools as InventoryItem[]
  },
  async setOwned(id: string, owned: boolean) {
    await db.library.update(id, { owned })
  },

  // ---------- projects ----------
  async listProjects(): Promise<Project[]> {
    return (await db.projects.toArray()).sort((a, b) => b.updatedAt - a.updatedAt)
  },
  async getProject(id: string) { return db.projects.get(id) },
  /** Upsert a project; append immutable audit events for status/health changes
   *  (and a `created` event on first insert). Events live in `projectEvents`. */
  async putProject(p: Project) {
    const now = Date.now()
    const prev = await db.projects.get(p.id)
    p.updatedAt = now
    await db.projects.put(p)

    const events: ProjectEvent[] = []
    if (!prev) {
      events.push({
        id: `evt.${p.id}.${now}.created`,
        projectId: p.id, ts: now, kind: 'created',
        from: null, to: p.status,
      })
    } else {
      if (prev.status !== p.status) {
        events.push({
          id: `evt.${p.id}.${now}.status`,
          projectId: p.id, ts: now, kind: 'status_changed',
          from: prev.status, to: p.status,
        })
      }
      const prevHealth = prev.health ?? null
      const nextHealth = p.health ?? null
      if (prevHealth !== nextHealth) {
        events.push({
          id: `evt.${p.id}.${now}.health`,
          projectId: p.id, ts: now, kind: 'health_changed',
          from: prevHealth, to: nextHealth,
        })
      }
    }
    if (events.length) await db.projectEvents.bulkPut(events)

    // Auto-merge project gap topics into the user's active pathway.
    // Non-blocking: failures here must not fail the save.
    try { await mergeProjectGapsIntoPathway(p.gapTopicIds ?? []) }
    catch (err) { console.warn('[repo.putProject] pathway auto-merge failed', err) }
  },
  async deleteProject(id: string) {
    await db.projects.delete(id)
    const related = await db.projectEvents.where('projectId').equals(id).primaryKeys()
    await db.projectEvents.bulkDelete(related as string[])
  },
  async listProjectEvents(projectId: string): Promise<ProjectEvent[]> {
    const all = await db.projectEvents.where('projectId').equals(projectId).toArray()
    return all.sort((a, b) => b.ts - a.ts)
  },

  // ---------- search misses ----------
  /** Log a library-search query that returned nothing. Repeats increment count
   *  instead of inserting, so the `searchMisses` table stays a deduped wishlist. */
  async logSearchMiss(query: string): Promise<SearchMiss> {
    const normalized = query.trim().toLowerCase()
    if (!normalized) throw new Error('empty query')
    const now = Date.now()
    const prev = await db.searchMisses.get(normalized)
    const next: SearchMiss = prev
      ? { ...prev, query: query.trim(), count: prev.count + 1, lastAt: now }
      : { id: normalized, query: query.trim(), count: 1, firstAt: now, lastAt: now }
    await db.searchMisses.put(next)
    return next
  },
  async listSearchMisses(): Promise<SearchMiss[]> {
    return (await db.searchMisses.toArray()).sort((a, b) => b.lastAt - a.lastAt)
  },
  async resolveSearchMiss(id: string, resolved = true) {
    await db.searchMisses.update(id, { resolved })
  },

  // ---------- quiz reports (user-filed corrections) ----------
  async logQuizReport(r: Omit<QuizReport, 'id' | 'ts'> & { ts?: number }): Promise<QuizReport> {
    const ts = r.ts ?? Date.now()
    const id = `qrep.${ts}.${r.quizId}${r.questionId ? `.${r.questionId}` : ''}`
    const row: QuizReport = { ...r, id, ts }
    await db.quizReports.put(row)
    return row
  },
  async listQuizReports(): Promise<QuizReport[]> {
    return (await db.quizReports.toArray()).sort((a, b) => b.ts - a.ts)
  },
  async resolveQuizReport(id: string, resolved = true) {
    await db.quizReports.update(id, { resolved })
  },
  async deleteQuizReport(id: string) {
    await db.quizReports.delete(id)
  },

  // ---------- user pathway ("my pathway") ----------
  async listPathwayItems(): Promise<UserPathwayItem[]> {
    // Stable order: active rows ascending by position; archived rows after
    // (UI groups them separately, but this keeps the list deterministic).
    const all = await db.userPathwayItems.toArray()
    const activeAsc  = all.filter(r => r.status === 'active').sort((a, b) => a.position - b.position)
    const archivedBy = all.filter(r => r.status === 'archived').sort((a, b) => b.addedAt - a.addedAt)
    return [...activeAsc, ...archivedBy]
  },
  async hasAnyPathwayItems(): Promise<boolean> {
    return (await db.userPathwayItems.count()) > 0
  },
  async addPathwayItem(topicId: string, source: UserPathwayItem['source'] = 'manual'): Promise<UserPathwayItem | null> {
    const existing = await db.userPathwayItems.get(`upi.${topicId}`)
    if (existing) {
      if (existing.status === 'archived') {
        // Un-archive and push to end of active list.
        const active = await db.userPathwayItems.where('status').equals('active').toArray()
        const nextPos = active.length
        const row: UserPathwayItem = { ...existing, status: 'active', position: nextPos }
        await db.userPathwayItems.put(row)
        return row
      }
      return existing
    }
    const active = await db.userPathwayItems.where('status').equals('active').toArray()
    const row: UserPathwayItem = {
      id: `upi.${topicId}`,
      topicId,
      status: 'active',
      position: active.length,
      addedAt: Date.now(),
      source,
    }
    await db.userPathwayItems.put(row)
    return row
  },
  async archivePathwayItem(topicId: string) {
    const id = `upi.${topicId}`
    const row = await db.userPathwayItems.get(id)
    if (!row || row.status === 'archived') return
    await db.userPathwayItems.update(id, { status: 'archived' })
    // Compact positions of remaining active rows so gaps don't accumulate.
    await compactActivePositions()
  },
  async unarchivePathwayItem(topicId: string) {
    const id = `upi.${topicId}`
    const row = await db.userPathwayItems.get(id)
    if (!row || row.status === 'active') return
    const active = await db.userPathwayItems.where('status').equals('active').toArray()
    await db.userPathwayItems.update(id, { status: 'active', position: active.length })
  },
  async deletePathwayItem(topicId: string) {
    await db.userPathwayItems.delete(`upi.${topicId}`)
    await compactActivePositions()
  },
  async reorderPathwayItems(activeTopicIds: string[]) {
    // activeTopicIds is the new full ordering of the active list.
    await db.transaction('rw', db.userPathwayItems, async () => {
      for (let i = 0; i < activeTopicIds.length; i++) {
        await db.userPathwayItems.update(`upi.${activeTopicIds[i]}`, { position: i })
      }
    })
  },
  /** Stamp the default template for a given pathway onto the user's plan.
   *  Respects history: does nothing if ANY pathway items already exist. */
  async seedPathwayFromTemplate(pathway: UserPathway): Promise<number> {
    if (await repo.hasAnyPathwayItems()) return 0
    if (pathway === 'all') return 0
    const template = PATHWAY_TEMPLATES[pathway] ?? []
    if (!template.length) return 0
    // Filter to topics that actually exist today — missing IDs silently drop
    // until Chunk F lands their content.
    const existing = new Set((await db.topics.toArray()).map(t => t.id))
    const picks = template.filter(id => existing.has(id))
    const now = Date.now()
    const rows: UserPathwayItem[] = picks.map((topicId, i) => ({
      id: `upi.${topicId}`,
      topicId,
      status: 'active',
      position: i,
      addedAt: now + i, // distinct-ish so sorts stay stable
      source: 'seed',
    }))
    if (rows.length) await db.userPathwayItems.bulkPut(rows)
    return rows.length
  },
  /** Reset: wipe all rows and re-stamp the template for the current pathway. */
  async resetPathway(pathway: UserPathway): Promise<number> {
    await db.userPathwayItems.clear()
    if (pathway === 'all') return 0
    // Manual call path — bypass the "any-items-exist" guard by re-inserting
    // after the clear above.
    const template = PATHWAY_TEMPLATES[pathway] ?? []
    const existing = new Set((await db.topics.toArray()).map(t => t.id))
    const picks = template.filter(id => existing.has(id))
    const now = Date.now()
    const rows: UserPathwayItem[] = picks.map((topicId, i) => ({
      id: `upi.${topicId}`, topicId,
      status: 'active', position: i, addedAt: now + i, source: 'seed',
    }))
    if (rows.length) await db.userPathwayItems.bulkPut(rows)
    return rows.length
  },
}

/** Compact position field on active rows so they remain 0..n-1 contiguous. */
async function compactActivePositions() {
  const active = (await db.userPathwayItems.where('status').equals('active').toArray())
    .sort((a, b) => a.position - b.position)
  await db.transaction('rw', db.userPathwayItems, async () => {
    for (let i = 0; i < active.length; i++) {
      if (active[i].position !== i) {
        await db.userPathwayItems.update(active[i].id, { position: i })
      }
    }
  })
}

/** Merge project gap topics into the active pathway. For each gap topic not
 *  already active, insert (or un-archive) at the end of the active list with
 *  source 'project'. Dedup by topicId. */
async function mergeProjectGapsIntoPathway(gapTopicIds: string[]) {
  if (!gapTopicIds.length) return
  const existing = new Set((await db.topics.toArray()).map(t => t.id))
  const candidates = Array.from(new Set(gapTopicIds)).filter(id => existing.has(id))
  if (!candidates.length) return

  for (const topicId of candidates) {
    const id = `upi.${topicId}`
    const row = await db.userPathwayItems.get(id)
    if (!row) {
      const active = await db.userPathwayItems.where('status').equals('active').toArray()
      await db.userPathwayItems.put({
        id, topicId,
        status: 'active',
        position: active.length,
        addedAt: Date.now(),
        source: 'project',
      })
    } else if (row.status === 'archived') {
      const active = await db.userPathwayItems.where('status').equals('active').toArray()
      await db.userPathwayItems.update(id, { status: 'active', position: active.length })
    }
    // else: already active — no-op (dedup)
  }
}

/** Mastery = avg(lesson completion rate, best quiz score) across a topic. */
async function recomputeMastery(topicId: string) {
  const lessons = await db.lessons.where('topicId').equals(topicId).toArray()
  const quizzes = await db.quizzes.where('topicId').equals(topicId).toArray()
  const progress = await db.progress.where('topicId').equals(topicId).toArray()

  const lessonRate = lessons.length === 0 ? 0
    : progress.filter(p => p.kind === 'lesson' && p.completedAt).length / lessons.length

  const quizBest = quizzes.length === 0 ? 0
    : quizzes.reduce((acc, q) => {
        const pr = progress.find(p => p.id === q.id && p.kind === 'quiz')
        return acc + (pr?.score ?? 0)
      }, 0) / quizzes.length

  const score =
    lessons.length && quizzes.length ? (lessonRate * 0.5 + quizBest * 0.5)
    : lessons.length ? lessonRate
    : quizBest

  await db.mastery.put({ topicId, score, updatedAt: Date.now() })
}

export async function overallProgress(): Promise<{ score: number; topics: number; completed: number }> {
  const mastery = await db.mastery.toArray()
  const topics = await db.topics.count()
  if (topics === 0) return { score: 0, topics: 0, completed: 0 }
  const sum = mastery.reduce((a, m) => a + m.score, 0)
  return {
    score: sum / topics,
    topics,
    completed: mastery.filter(m => m.score >= PASS_THRESHOLD).length,
  }
}
