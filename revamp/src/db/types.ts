export type ID = string

export interface Track {
  id: ID
  title: string
  summary: string
  order: number
}

export interface Topic {
  id: ID
  trackId: ID
  title: string
  summary: string
  order: number
}

export interface Lesson {
  id: ID
  topicId: ID
  title: string
  summary: string
  minutes: number
  body: string   // markdown
  order: number
}

export interface QuizQuestion {
  id: ID
  prompt: string
  choices: string[]
  answerIdx: number
  explain?: string
}

export interface Quiz {
  id: ID
  topicId: ID
  title: string
  questions: QuizQuestion[]
}

export interface Progress {
  id: ID                 // same as lesson/quiz id
  kind: 'lesson' | 'quiz'
  topicId: ID
  completedAt?: number
  score?: number         // 0..1 for quizzes
  attempts?: number
  updatedAt: number
}

export type Mastery = {
  topicId: ID
  score: number          // 0..1
  updatedAt: number
}

export type LibraryKind = 'tool' | 'document' | 'article' | 'video' | 'paper'

export interface LibraryItem {
  id: ID
  kind: LibraryKind
  title: string
  summary?: string
  url?: string
  tags: string[]
  pinned: boolean
  addedAt: number
  /** Tool-only fields. Meaningless for other kinds but kept here to keep one schema. */
  toolCategory?: 'model' | 'ide' | 'framework' | 'service' | 'tool'
  cost?: 'free' | 'paid' | 'subscription'
  owned?: boolean
  notes?: string
}

/** Legacy alias — still used by the Projects intake flow. */
export type InventoryItem = LibraryItem & { kind: 'tool'; toolCategory: NonNullable<LibraryItem['toolCategory']>; cost: NonNullable<LibraryItem['cost']>; owned: boolean }

export type ProjectStatus = 'draft' | 'active' | 'paused' | 'shipped'
export type ProjectRoute = 'easiest' | 'cheapest' | 'best'

export interface ProjectChecklistItem {
  id: ID
  label: string
  done: boolean
}

export interface Project {
  id: ID
  title: string
  summary: string
  status: ProjectStatus
  route: ProjectRoute
  stack: ID[]            // inventory ids
  gapTopicIds: ID[]      // topics user still needs
  checklist: ProjectChecklistItem[]
  liveUrl?: string
  repoUrl?: string
  createdAt: number
  updatedAt: number
}
