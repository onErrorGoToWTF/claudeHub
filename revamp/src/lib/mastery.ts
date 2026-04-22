/** Score is 0..1. Thresholds reflect a real-world grading system:
 *  < 50%  — In progress (didn't pass)
 *  ≥ 50%  — Completed    (passed, letter grade D/C/B/A depending)
 *  ≥ 90%  — Mastered     (A+ / "Genius" tier — gets extra accolades)
 *
 *  Separately, 80% is the "true understanding" bar — not a status gate,
 *  but surfaced on the report card as the line where the app considers
 *  someone to genuinely know the material (A-grade or better).
 */
export const PASS_THRESHOLD = 0.50
export const MASTERY_THRESHOLD = 0.90
export const TRUE_UNDERSTANDING_BAR = 0.80

export type MasteryStatus = 'not_started' | 'in_progress' | 'completed' | 'mastered'

export function masteryStatus(score: number | undefined): MasteryStatus {
  if (!score || score <= 0) return 'not_started'
  if (score >= MASTERY_THRESHOLD) return 'mastered'
  if (score >= PASS_THRESHOLD) return 'completed'
  return 'in_progress'
}

export const MASTERY_LABEL: Record<MasteryStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed:   'Completed',
  mastered:    'Mastered',
}

export type LetterGrade = 'F' | 'D' | 'C' | 'B' | 'A' | 'A+'

/** Letter grade from a 0..1 score.
 *  F < 50 · D 50-59 · C 60-69 · B 70-79 · A 80-89 · A+ 90+ */
export function letterGrade(score: number): LetterGrade {
  const pct = score * 100
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B'
  if (pct >= 60) return 'C'
  if (pct >= 50) return 'D'
  return 'F'
}

/** Accolade tier — only B / A / A+ get visual celebration.
 *  D and C are passes but quiet; F isn't a pass at all. */
export type AccoladeTier = 'none' | 'B' | 'A' | 'genius'
export function accoladeTier(score: number): AccoladeTier {
  const pct = score * 100
  if (pct >= 90) return 'genius'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B'
  return 'none'
}
