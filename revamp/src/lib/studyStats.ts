import type { Progress } from '../db/types'
import { PASS_THRESHOLD } from './mastery'

const DAY_MS = 86_400_000

/** YYYY-MM-DD in local time — the day-bucket key. */
function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Set of YYYY-MM-DD keys for every day that had any study activity. */
function activeDays(progress: Progress[]): Set<string> {
  const days = new Set<string>()
  for (const p of progress) {
    if (p.updatedAt) days.add(dayKey(p.updatedAt))
  }
  return days
}

/** Consecutive days of activity ending today (or yesterday if today is
 *  empty — no break yet). Zero if there's nothing in the last 2 days. */
export function currentStreak(progress: Progress[]): number {
  const days = activeDays(progress)
  if (days.size === 0) return 0
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Start from today; if today is empty, fall back one day so a mid-day
  // check before studying doesn't reset a long streak. Past that is a break.
  let cursor = today.getTime()
  if (!days.has(dayKey(cursor))) {
    cursor -= DAY_MS
    if (!days.has(dayKey(cursor))) return 0
  }
  while (days.has(dayKey(cursor))) {
    streak++
    cursor -= DAY_MS
  }
  return streak
}

/** Distinct days with any activity in the last 7 days (inclusive of today). */
export function daysThisWeek(progress: Progress[]): number {
  const days = activeDays(progress)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  let count = 0
  for (let i = 0; i < 7; i++) {
    if (days.has(dayKey(now.getTime() - i * DAY_MS))) count++
  }
  return count
}

/** A topic is "due for review" if its last quiz pass was > `staleDays` ago
 *  AND the most-recent progress for that topic was a pass. Crude v1 —
 *  proper spaced-repetition intervals arrive with the DB migration. */
export function dueForReview(progress: Progress[], staleDays = 7): string[] {
  // Find most-recent quiz progress per topic.
  const latestByTopic = new Map<string, Progress>()
  for (const p of progress) {
    if (p.kind !== 'quiz' || !p.updatedAt) continue
    const prev = latestByTopic.get(p.topicId)
    if (!prev || (prev.updatedAt ?? 0) < p.updatedAt) latestByTopic.set(p.topicId, p)
  }
  const threshold = Date.now() - staleDays * DAY_MS
  const due: { topicId: string; ts: number }[] = []
  for (const [topicId, p] of latestByTopic) {
    const passed = (p.score ?? 0) >= PASS_THRESHOLD
    if (passed && (p.updatedAt ?? 0) < threshold) {
      due.push({ topicId, ts: p.updatedAt ?? 0 })
    }
  }
  // Oldest first — most overdue at the top.
  return due.sort((a, b) => a.ts - b.ts).map(d => d.topicId)
}
