import Dexie, { type Table } from 'dexie'
import type {
  Track, Topic, Lesson, Quiz, Progress, Mastery,
  InventoryItem, Project,
} from './types'

export class AiUniversityDB extends Dexie {
  tracks!:    Table<Track, string>
  topics!:    Table<Topic, string>
  lessons!:   Table<Lesson, string>
  quizzes!:   Table<Quiz, string>
  progress!:  Table<Progress, string>
  mastery!:   Table<Mastery, string>
  inventory!: Table<InventoryItem, string>
  projects!:  Table<Project, string>

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
  }
}

export const db = new AiUniversityDB()
