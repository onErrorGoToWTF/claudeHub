# aiUniversity — revamp

> This IS the app. The files at the parent repo root are legacy / reference-only.

## When the user says "continue"

1. Open **`STATE.md`** (in this folder).
2. Pick the top **Active** task from the "Remaining work" section.
3. State it in one sentence, then build.

## The app, in one paragraph

aiUniversity is a self-directed AI-learning playground: Dashboard (Learn + Projects + Library panels), Learn (Khan-style mastery tracks with lessons + quizzes), Projects (Linear-style status + health, guided intake, three routes — Easiest/Cheapest/Best), Library (searchable catalog of in-app tool + doc + read bodies). Solo today. Dexie persists everything locally. Ocean-blue accent, warm greige canvas, squared radii, Apple-system font, Linear-minimal feel.

## Non-negotiables (from user feedback + decisions)

- **Single-knob theming.** All accent surfaces flow from `--accent-base` in `src/styles/tokens.css`. Never hardcode colors in component CSS.
- **All data through `src/db/repo.ts`.** Don't call Dexie directly from pages or components.
- **No persona switcher.** Tag-based filtering instead.
- **No teams.** Solo-only today; read-only friend-view is planned, not built.
- **Squared pills, no 999px.** `--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 14px`.
- **Inline citations, not blockquotes.** `>` in markdown → quiet italic text with a hover-tooltip carrying the attribution from the following `—` line.
- **Code blocks are dark copy-windows with syntax highlighting** (see `src/ui/Markdown.tsx`).
- **Library only surfaces items with `body`.** Tool entries without bodies still exist (they feed the Projects intake stack picker) but are hidden from the Library list.

## Content additions follow a locked format

See comment at top of `src/db/seedLibraryNotes.ts`. Every new Library note:

1. `**TL;DR**` one-sentence takeaway.
2. `##` sections.
3. Verbatim quotes in `>` blockquotes with `— Source` on the line immediately after.
4. `## Sources` section at the end with `[title](url)` links.

## Tool bodies

Tool in-app bodies live in `src/db/toolBodies.ts` keyed by tool id (e.g., `'i.cursor'`). The map is merged onto matching entries in `library[]` at seed time.

## Deploy

Auto — every push to `main` touching `revamp/**` runs `.github/workflows/deploy-pages.yml`. No manual step needed.

## Do NOT

- Modify files outside `revamp/` unless explicitly asked.
- Propose teams / auth / multi-user features (out of scope).
- Propose an electrified-circuit skill-map viz (deferred).
- Propose a persona switcher (rejected).
