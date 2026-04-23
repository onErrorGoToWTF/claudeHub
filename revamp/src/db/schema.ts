import Dexie, { type Table } from 'dexie'
import type {
  Track, Topic, Lesson, Quiz, Progress, Mastery,
  LibraryItem, Project, SearchMiss, ProjectEvent, UserPathwayItem, QuizReport,
  Category, Feedback, QuizAttempt,
} from './types'

export class AiUniversityDB extends Dexie {
  tracks!:        Table<Track, string>
  topics!:        Table<Topic, string>
  lessons!:       Table<Lesson, string>
  quizzes!:       Table<Quiz, string>
  progress!:      Table<Progress, string>
  mastery!:       Table<Mastery, string>
  library!:       Table<LibraryItem, string>
  projects!:      Table<Project, string>
  searchMisses!:  Table<SearchMiss, string>
  projectEvents!: Table<ProjectEvent, string>
  userPathwayItems!: Table<UserPathwayItem, string>
  quizReports!: Table<QuizReport, string>
  categories!: Table<Category, string>
  feedback!: Table<Feedback, string>
  quizAttempts!: Table<QuizAttempt, string>

  constructor() {
    super('aiUniversity')
    this.version(1).stores({
      tracks:    'id, order',
      topics:    'id, trackId, order',
      lessons:   'id, topicId, order',
      quizzes:   'id, topicId',
      progress:  'id, kind, topicId, updatedAt',
      mastery:   'topicId, updatedAt',
      inventory: 'id, category, owned',
      projects:  'id, status, updatedAt',
    })
    this.version(2).stores({
      inventory: null,                                    // drop old table
      library:   'id, kind, pinned, addedAt, toolCategory',
    })
    this.version(3).stores({
      searchMisses: 'id, count, lastAt, resolved',
    })
    this.version(4).stores({
      projectEvents: 'id, projectId, ts, kind',
    })
    this.version(5).stores({
      userPathwayItems: 'id, topicId, status, position, addedAt',
    })
    this.version(6).stores({
      quizReports: 'id, quizId, questionId, ts, resolved',
    })
    this.version(7).stores({
      categories: 'id, order',
    })
    this.version(8).stores({
      feedback: 'id, kind, ts, resolved',
    })
    this.version(9).stores({
      // Full per-attempt record: every answer, every timestamp, optional
      // lock flag. Enables post-submit review for the learner and a future
      // admin "submission history" surface à la edX. Latest attempt still
      // drives mastery; this table is additive.
      quizAttempts: 'id, quizId, topicId, finishedAt, locked',
    })
  }
}

export const db = new AiUniversityDB()
