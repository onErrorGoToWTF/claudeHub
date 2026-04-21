import type { ProjectStatus, ProjectHealth } from '../db/types'

export const STATUSES: { id: ProjectStatus; label: string }[] = [
  { id: 'backlog',      label: 'Backlog' },
  { id: 'planned',      label: 'Planned' },
  { id: 'in_progress',  label: 'In progress' },
  { id: 'completed',    label: 'Completed' },
  { id: 'canceled',     label: 'Canceled' },
]

export const HEALTHS: { id: NonNullable<ProjectHealth>; label: string }[] = [
  { id: 'on_track',  label: 'On track' },
  { id: 'at_risk',   label: 'At risk' },
  { id: 'off_track', label: 'Off track' },
]

export const STATUS_LABEL = Object.fromEntries(STATUSES.map(s => [s.id, s.label])) as Record<ProjectStatus, string>
export const HEALTH_LABEL = Object.fromEntries(HEALTHS.map(h => [h.id, h.label])) as Record<NonNullable<ProjectHealth>, string>

/** Health only surfaces while the project is actively being worked on. */
export function showsHealth(status: ProjectStatus) {
  return status === 'planned' || status === 'in_progress'
}

/** Legacy → Linear vocabulary. Applied in seed on boot for existing DBs. */
export function migrateLegacyStatus(status: string): ProjectStatus {
  switch (status) {
    case 'draft':   return 'backlog'
    case 'active':  return 'in_progress'
    case 'paused':  return 'backlog'
    case 'shipped': return 'completed'
    default:        return (status as ProjectStatus)
  }
}
