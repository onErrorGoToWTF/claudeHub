# Build State

Running ledger. Rehydrate from this after compaction.

## Done
- Scaffold: Vite + React + TS via `npm create vite@latest`
- Deps installed: dexie, react-router-dom, framer-motion, lucide-react, clsx, zustand
- Durable state files written (PLAN/DECISIONS/STATE)

## In progress
- Design tokens + global CSS

## Next
- App shell: routing + responsive nav
- Data layer (Dexie + repo)
- Dashboard → Learn → Quiz → Projects

## Key knobs (once set)
- Accent base: `--accent-base` in `src/styles/tokens.css` — one value drives every accent surface.
- Danger: `--danger-base` in same file.
- Radii: `--radius-sm/md/lg`.

## Key file paths (planned)
- `src/styles/tokens.css` — design tokens (single source)
- `src/styles/global.css` — reset + typography
- `src/app/AppShell.tsx` — responsive nav + routing
- `src/db/schema.ts` — Dexie schema
- `src/db/repo.ts` — repository interface (swap-ready)
- `src/pages/{Dashboard,Learn,Projects}.tsx`
- `src/features/quiz/*`
- `src/seed/*.ts`

## Port
Dev server: `npm run dev` — Vite defaults to 5173.
