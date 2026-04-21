import Dexie, { type Table } from 'dexie'
import type {
  Track, Topic, Lesson, Quiz, Progress, Mastery,
  LibraryItem, Project, SearchMiss,
} from './types'

export class AiUniversityDB extends Dexie {
  tracks!:       Table<Track, string>
  topics!:       Table<Topic, string>
  lessons!:      Table<Lesson, string>
  quizzes!:      Table<Quiz, string>
  progress!:     Table<Progress, string>
  mastery!:      Table<Mastery, string>
  library!:      Table<LibraryItem, string>
  projects!:     Table<Project, string>
  searchMisses!: Table<SearchMiss, string>

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
  }
}

export const db = new AiUniversityDB()
