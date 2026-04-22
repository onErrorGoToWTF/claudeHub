import type { QuizQuestion } from '../db/types'

/** Normalize whitespace: trim ends, collapse runs of internal whitespace to one space. */
function collapseWs(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

/** Kind discriminator default: legacy rows without `kind` are MCQ. */
export function questionKind(q: QuizQuestion): 'mcq' | 'ordered-steps' | 'code-typing' | 'short-answer' {
  return q.kind ?? 'mcq'
}

/** Grade a submitted answer against the question definition. Returns true if correct.
 *  `answer` shape depends on kind:
 *   - mcq:           number (choice index) | null
 *   - ordered-steps: number[] (current order, indices into steps)
 *   - code-typing:   string
 *   - short-answer:  string
 */
export function gradeQuestion(q: QuizQuestion, answer: unknown): boolean {
  const kind = questionKind(q)
  if (kind === 'mcq') {
    const mcq = q as Extract<QuizQuestion, { kind?: 'mcq' }>
    return typeof answer === 'number' && answer === mcq.answerIdx
  }
  if (kind === 'ordered-steps') {
    const os = q as Extract<QuizQuestion, { kind: 'ordered-steps' }>
    if (!Array.isArray(answer)) return false
    if (answer.length !== os.correctOrder.length) return false
    for (let i = 0; i < os.correctOrder.length; i++) {
      if (answer[i] !== os.correctOrder[i]) return false
    }
    return true
  }
  if (kind === 'code-typing') {
    const ct = q as Extract<QuizQuestion, { kind: 'code-typing' }>
    if (typeof answer !== 'string') return false
    const sub = collapseWs(answer)
    const exp = collapseWs(ct.expected)
    return ct.caseInsensitive ? sub.toLowerCase() === exp.toLowerCase() : sub === exp
  }
  if (kind === 'short-answer') {
    const sa = q as Extract<QuizQuestion, { kind: 'short-answer' }>
    if (typeof answer !== 'string') return false
    const sub = answer.trim()
    if (sa.pattern) {
      try {
        return new RegExp(sa.pattern, 'i').test(sub)
      } catch {
        return false
      }
    }
    if (sa.expected) {
      return sub.toLowerCase() === sa.expected.trim().toLowerCase()
    }
    return false
  }
  return false
}

/** Can `advance` fire with the current draft answer? (Non-null / non-empty check.) */
export function isAnswerable(q: QuizQuestion, answer: unknown): boolean {
  const kind = questionKind(q)
  if (kind === 'mcq') return typeof answer === 'number'
  if (kind === 'ordered-steps') return Array.isArray(answer) && answer.length > 0
  if (kind === 'code-typing') return typeof answer === 'string' && answer.trim().length > 0
  if (kind === 'short-answer') return typeof answer === 'string' && answer.trim().length > 0
  return false
}
