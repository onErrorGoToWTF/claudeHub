export type ID = string

/** Pathway audience — five user tracks ordered by ascending code involvement:
 *  student   — learning AI concepts, often no code
 *  office    — Claude-as-coworker, zero code (docs, meetings, analysis)
 *  media     — generative media tools (image/video/voice), UI-driven, no code
 *  vibe      — AI-assisted building; ships software without hand-writing it
 *  dev       — writes and owns production code
 *  Content with an empty or missing audience list is visible to everyone. */
export type Audience = 'student' | 'office' | 'media' | 'vibe' | 'dev'

/** Top-level thematic grouping above Tracks — the "bookshelf" layer.
 *  Single-parent per Track. Cross-cutting lives at the tag layer, not here. */
export interface Category {
  id: ID
  title: string
  summary: string
  order: number
  /** Optional tags on the category itself (rarely used; primarily for future
   *  graph-viz enrichment). */
  tags?: string[]
}

export interface Track {
  id: ID
  title: string
  summary: string
  order: number
  audience?: Audience[]
  /** Thematic bookshelf this track lives under. Missing = "Other" bucket. */
  categoryId?: ID
  /** Optional tag set for the track itself. */
  tags?: string[]
}

export interface Topic {
  id: ID
  trackId: ID
  title: string
  summary: string
  order: number
  audience?: Audience[]
  /** Topic IDs that should come before this one in any learning path.
   *  Used by the custom-pathway builder to topologically order user picks.
   *  Directed edge — "must come first." */
  prereqTopicIds?: ID[]
  /** Shared-vocabulary tag list. Normalized lowercase, `/`-separated for
   *  eventual nesting (e.g., `ai/safety`, `prompting/patterns`). */
  tags?: string[]
  /** Symmetric "see-also" edges to other topics. Repo-level setRelated keeps
   *  both sides in sync; treat the arrays as the source of truth at query time. */
  relatedTopicIds?: ID[]
  /** Library items that relate to this topic. Bidirectional with
   *  LibraryItem.relatedTopicIds. */
  relatedLibraryIds?: ID[]
  /** Learning objectives — "By the end you'll be able to…" bullets.
   *  Verb-led, measurable. Shown at the top of the topic page. */
  objectives?: string[]
  /** Unix ms timestamp of the last content review / edit. Drives the
   *  "Last updated" footer + Freshness Pipeline's staleness signal. */
  updatedAt?: number
}

export interface Lesson {
  id: ID
  topicId: ID
  title: string
  summary: string
  minutes: number
  body: string   // markdown
  order: number
  /** Unix ms — last content review/edit timestamp. */
  updatedAt?: number
}

/** Multiple-choice. Original question shape; `kind` defaults to 'mcq' if missing. */
export interface MCQQuestion {
  kind?: 'mcq'
  id: ID
  prompt: string
  choices: string[]
  answerIdx: number
  explain?: string
}

/** Drag-to-order. User reorders `steps` to match `correctOrder` (an array of
 *  indices into `steps` in the order they should appear). Pass = exact match. */
export interface OrderedStepsQuestion {
  kind: 'ordered-steps'
  id: ID
  prompt: string
  steps: string[]
  /** Indices into `steps` in the correct final order. */
  correctOrder: number[]
  explain?: string
}

/** Fill-in-the-blank. `code` contains `{{blank}}`; user types; pass = string
 *  match after trimming and collapsing internal whitespace. Case-sensitive
 *  unless `caseInsensitive` is true. */
export interface CodeTypingQuestion {
  kind: 'code-typing'
  id: ID
  prompt: string
  /** Pre-filled code with `{{blank}}` where the user types. */
  code: string
  expected: string
  caseInsensitive?: boolean
  /** Optional language hint for syntax highlighting (e.g., 'ts', 'py'). */
  language?: string
  explain?: string
}

/** Free-text short answer. Either `expected` (case-insensitive equality after
 *  trim) OR `pattern` (regex matched with flag 'i'). `pattern` wins if both. */
export interface ShortAnswerQuestion {
  kind: 'short-answer'
  id: ID
  prompt: string
  expected?: string
  pattern?: string
  placeholder?: string
  explain?: string
}

export type QuizQuestion =
  | MCQQuestion
  | OrderedStepsQuestion
  | CodeTypingQuestion
  | ShortAnswerQuestion

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
  /** Topics this library item relates to. Bidirectional with
   *  Topic.relatedLibraryIds — repo-level setRelated keeps both sides synced. */
  relatedTopicIds?: ID[]
  /** Symmetric "related resource" edges to other library items. */
  relatedLibraryIds?: ID[]
  /** Unix ms — last content review/edit timestamp. */
  updatedAt?: number
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

/** Output shape for media-pathway projects. Missing = not a media project. */
export type MediaKind = 'image' | 'video' | 'youtube' | 'voice' | 'audio' | 'multi'

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
  /** Media-pathway-only. Undefined for vibe / dev / office projects. */
  mediaKind?: MediaKind
  /** Vibe/media-pathway-only free-text stack sketch (tools the user named
   *  beyond the picked inventory items). Not parsed — just preserved. */
  stackNotes?: string
  /** User-authored tag list for the project (shared-vocabulary with topics
   *  + library so cross-cutting themes surface everywhere). */
  tags?: string[]
  /** Broader than gapTopicIds — any topic relevant to the project, whether
   *  the user still needs to learn it or not. gapTopicIds stays focused on
   *  "still to learn"; relatedTopicIds is the full context surface. */
  relatedTopicIds?: ID[]
  /** Library items relevant to this project. */
  relatedLibraryIds?: ID[]
  createdAt: number
  updatedAt: number
}

/** Immutable audit event appended to a project's history.
 *  Today: created, status change, health change. */
export type ProjectEventKind =
  | 'created'
  | 'status_changed'
  | 'health_changed'

/** A correction/issue the user filed against a quiz question or a whole quiz.
 *  Local-only today; will sync when DB migration lands so an admin can triage. */
export type QuizReportKind = 'incorrect' | 'unclear' | 'typo' | 'other'

export interface QuizReport {
  id: ID                  // `qrep.<ts>.<quizId>[.<questionId>]`
  quizId: ID
  /** Missing when the user is reporting the whole quiz, not a specific question. */
  questionId?: ID
  kind: QuizReportKind
  note: string
  ts: number
  resolved?: boolean
}

/** A row in the user's persistent learning plan ("my pathway").
 *  Soft-delete by flipping status to 'archived' — never hard-delete so the
 *  user keeps a full learning record. Progress + mastery key off topicId,
 *  not membership, so toggling status never wipes scores. */
export interface UserPathwayItem {
  id: ID                 // `upi.<topicId>`
  topicId: ID
  status: 'active' | 'archived'
  /** Position within the active list (ascending). Archived rows keep their
   *  last-known position so re-activating is stable, but the sort key shown
   *  in the UI is `addedAt` descending for archived rows. */
  position: number
  addedAt: number
  /** How the row got there — 'seed' (template stamp), 'manual' (user pick),
   *  'project' (auto-merged from a project's gap topics). */
  source: 'seed' | 'manual' | 'project'
}

export interface ProjectEvent {
  id: ID                 // `evt.<projectId>.<ts>.<kind>`
  projectId: ID
  ts: number
  kind: ProjectEventKind
  from?: string | null
  to?: string | null
}
