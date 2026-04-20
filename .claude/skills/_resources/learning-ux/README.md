---
topic: learning-ux — overview + file index
last_fetched: 2026-04-20
staleness_days: 30
---

# `learning-ux/` — progress tracking + dashboard UX patterns

Cache of external references on how top learning / workflow apps handle progress tracking, dashboard composition, and activity feeds. Built as reference material for future claudeHub Learn + Projects surface decisions — **not acting on any of it immediately**.

## TL;DR

- **Linear** is the best-fit reference. Ships public design docs with state vocabulary, health indicators, and a collapsed-activity pattern that ports almost verbatim. `[verbatim, Linear docs]` heavy.
- **Khan Academy** is the closest-in-spirit learning app — dashboard-first, restrained, no streaks. `[verbatim, Khan blog]` partial.
- **Duolingo** is documented for awareness. Most patterns won't port: mascot, streaks, XP, leagues conflict with claudeHub's minimal / light-only / no-gamification brief.
- **Quizlet** proves three states suffice for set-level lifecycle (`not started / started / finished`). Minimal in a useful way.

## When to read this topic

- User asks about progress UI patterns, activity timelines, lifecycle badges, or "how apps like X do it."
- Design-review hits a new tile that needs a status vocabulary.
- Design-amend wants to introduce a new pill or progress indicator; want a reference to template on.
- A future pass wants to implement a proposal from `claudehub-recommendations.md`.

## File index

| File | Purpose | Lines |
|---|---|---|
| `linear-workflow.md` | Linear's state vocab + health + milestones + activity feed. Best-fit reference. | ~180 |
| `khan-academy.md` | Learning Dashboard design, Mastery pattern, inline achievement signal. | ~140 |
| `duolingo.md` | Streak / XP / path / mascot mechanics. Mostly anti-port. | ~160 |
| `quizlet.md` | Tri-state completion + adaptive Learn mode. Minimal-patterns reference. | ~130 |
| `minimal-patterns.md` | Synthesis: patterns that survive the user's constraints. Filter applied. | ~170 |
| `claudehub-recommendations.md` | Per-surface proposal menu (Learn / Projects / Dashboard). Not-yet-actioned reference. | ~230 |
| `resources.md` | External links, citations, source-quality notes. | ~130 |

## How to use

**Scoped query** (most common): `Read` one file matching your question — e.g., "how does Linear show progress?" → `linear-workflow.md`.

**Synthesis query:** `Read` `minimal-patterns.md` for the distilled set of patterns that fit claudeHub.

**"What should we do about progress on Projects?"** → `Read` `claudehub-recommendations.md` → §5 (Projects surface).

**"What external sources back this?"** → `Read` `resources.md`.

## Source-quality summary

| App | Primary-source access | Default tag |
|---|---|---|
| Linear | Public docs, server-rendered | `[verbatim, Linear docs]` |
| Khan Academy | Blog posts server-rendered; some help articles also verbatim | `[verbatim, Khan blog]` where applicable, else `[secondary]` |
| Duolingo | Mostly third-party UX analyses; `design.duolingo.com` not fetched this session | `[secondary]` default; upgrade by user-paste |
| Quizlet | Some blog posts 403'd; content partially from search-result excerpts | `[secondary]` default; upgrade by user-paste |

## Non-goals enforced by this cache

Repeated up front so any downstream reader sees them without digging:

- **No Awards/Badges page.** Achievement signal is inline on tiles.
- **No streak / XP / gems.** Loss-aversion mechanics explicitly ruled out.
- **No mascot.** Breaks Apple-glass aesthetic.
- **No leaderboards.** Single-user app.
- **No runtime API calls.** Revisit only post-DB-migration + Claude-API-integration.

## Cross-references

- **Master dispatcher:** `_resources/INDEX.md`
- **Related topics:**
  - `_resources/liquid-glass/` — material + visual language (relevant when designing the *appearance* of proposed UI).
  - `_resources/hig/` — tap-target, gestures, motion (relevant when designing the *behavior* of proposed UI).
- **Project-side docs:**
  - `CLAUDE.md` — design language + tile idiom.
  - `docs/plans/v0.7-design-system-refactor.md` — Learn (M9.4) + Projects (M9.5) refactor milestones.

## Bootstrap log

- 2026-04-20 — initial cache created from one research pass covering Linear (5 docs pages + changelog), Khan Academy (blog + help), Duolingo (third-party analyses), Quizlet (blog + review aggregators). All files tagged; no conflicts to resolve.
