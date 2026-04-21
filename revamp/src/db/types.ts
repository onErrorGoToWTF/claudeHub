export type ID = string

/** Pathway audience — maps to the three user tracks in PLAN.md:
 *  student (foundational), office (AI without coding), dev (coding with AI).
 *  Content with an empty or missing audience list is visible to everyone. */
export type Audience = 'student' | 'office' | 'dev'

export interface Track {
  id: ID
  title: string
  summary: string
  order: number
  audience?: Audience[]
}

export interface Topic {
  id: ID
  trackId: ID
  title: string
  summary: string
  order: number
  audience?: Audience[]
  /** Topic IDs that should come before this one in any learning path.
   *  Used by the custom-pathway builder to topologically order user picks. */
  prereqTopicIds?: ID[]
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

export type LibraryKind = 'tool' | 'doc' | 'read' | 'video'

/** Logged when a user's Library search returned no matches. Lets us see
 *  what people want that isn't there yet so we can author/upload it. */
export interface SearchMiss {
  /** Normalized query (lowercase, trimmed) — used as primary key so repeats collapse. */
  id: ID
  /** Original query the user typed, last time they searched it. */
  query: string
  count: number
  firstAt: number
  lastAt: number
  /** Set once someone has addressed the gap (authored content or marked wontfix). */
  resolved?: boolean
}

export interface LibraryItem {
  id: ID
  kind: LibraryKind
  title: string
  summary?: string
  /** Optional markdown body — rendered in-app at /library/:id. */
  body?: string
  url?: string
  tags: string[]
  pinned: boolean
  addedAt: number
  /** Pathway audiences this item is relevant to. Missing/empty = visible to all. */
  audience?: Audience[]
  /** Tool-only fields. Meaningless for other kinds but kept here to keep one schema. */
  toolCategory?: 'model' | 'ide' | 'framework' | 'service' | 'tool'
  cost?: 'free' | 'paid' | 'subscription'
  owned?: boolean
  notes?: string
}

/** Legacy alias — still used by the Projects intake flow. */
export type InventoryItem = LibraryItem & { kind: 'tool'; toolCategory: NonNullable<LibraryItem['toolCategory']>; cost: NonNullable<LibraryItem['cost']>; owned: boolean }

export type ProjectStatus = 'backlog' | 'planned' | 'in_progress' | 'completed' | 'canceled'
export type ProjectHealth = 'on_track' | 'at_risk' | 'off_track' | null
export type ProjectRoute  = 'easiest' | 'cheapest' | 'best'

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
  health?: ProjectHealth
  route: ProjectRoute
  stack: ID[]            // inventory ids
  gapTopicIds: ID[]      // topics user still needs
  checklist: ProjectChecklistItem[]
  liveUrl?: string
  repoUrl?: string
  createdAt: number
  updatedAt: number
}

/** Immutable audit event appended to a project's history.
 *  Today: created, status change, health change. */
export type ProjectEventKind =
  | 'created'
  | 'status_changed'
  | 'health_changed'

export interface ProjectEvent {
  id: ID                 // `evt.<projectId>.<ts>.<kind>`
  projectId: ID
  ts: number
  kind: ProjectEventKind
  from?: string | null
  to?: string | null
}
