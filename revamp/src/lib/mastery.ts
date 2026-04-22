export const MASTERY_THRESHOLD = 0.8

export type MasteryStatus = 'not_started' | 'in_progress' | 'mastered'

export function masteryStatus(score: number | undefined): MasteryStatus {
  if (!score || score <= 0) return 'not_started'
  if (score >= MASTERY_THRESHOLD) return 'mastered'
  return 'in_progress'
}

export const MASTERY_LABEL: Record<MasteryStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  mastered:    'Completed',
}
