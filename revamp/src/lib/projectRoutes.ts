import type { InventoryItem, ProjectRoute } from '../db/types'

export const ROUTE_LABELS: Record<ProjectRoute, string> = {
  easiest:  'Easiest path',
  cheapest: 'Cheapest path',
  best:     'Best path',
}

export const ROUTE_BLURBS: Record<ProjectRoute, string> = {
  easiest:  'Uses tools you already know. Lowest friction, fastest to start.',
  cheapest: 'Free tier or already-paid tools only. Zero extra spend.',
  best:     'Top-shelf AI tooling for maximum leverage. May cost more.',
}

/** Filter the inventory down to what each route would recommend for a given stack pick. */
export function routeStack(
  route: ProjectRoute,
  picked: InventoryItem[],
  inventory: InventoryItem[],
): InventoryItem[] {
  if (route === 'easiest')  return picked.filter(i => i.owned)
  if (route === 'cheapest') return picked.filter(i => i.cost === 'free' || i.owned)
  // best: include picked + unowned premium items flagged as category=model/tool
  const extras = inventory.filter(i => !picked.includes(i) && (i.category === 'model' || i.category === 'tool'))
  return [...picked, ...extras.slice(0, 2)]
}
