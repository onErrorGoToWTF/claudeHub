/**
 * Repository layer. Views and mutations should ONLY touch this module —
 * swapping IndexedDB for a hosted backend (Supabase/Turso/etc.) means
 * reimplementing this file, nothing else.
 */
import { db } from './schema'
import type {
  Track, Topic, Lesson, Quiz, Progress, Mastery,
  LibraryItem, LibraryKind, InventoryItem, Project,
} from './types'

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
    await db.progress.put({
      id: quizId, kind: 'quiz', topicId,
      score: Math.max(prev?.score ?? 0, score),
      attempts: (prev?.attempts ?? 0) + 1,
      completedAt: score >= 0.8 ? now : prev?.completedAt,
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
  async putProject(p: Project) {
    p.updatedAt = Date.now()
    await db.projects.put(p)
  },
  async deleteProject(id: string) { await db.projects.delete(id) },
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
    completed: mastery.filter(m => m.score >= 0.8).length,
  }
}
