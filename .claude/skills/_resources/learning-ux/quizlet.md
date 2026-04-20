---
topic: Quizlet — Learn mode, study progress, tri-state completion
last_fetched: 2026-04-20
staleness_days: 30
sources:
  - https://quizlet.com/blog/new-a-smarter-learn-mode
  - https://help.quizlet.com/hc/en-us/articles/360030512432-Using-Class-Progress
  - https://quizlet.com/blog/progress-update-learn-mode-qqq-reliability-advertising-etc/
  - https://atomisystems.com/elearning/quizlet-review-2026-pros-cons-and-comparison/
  - https://unlearninglabs.com/2022/04/07/quizlet-learning-tools-and-flashcards/
---

# Quizlet — Learn mode + study progress

Quizlet's progress tracking is the **least ambitious** of the three learning apps in this cache — which is what makes it instructive. Most of Quizlet's progress UI is a simple tri-state (not started / started / finished) plus an adaptive per-term study loop. No streaks, no XP, no mascot. Its restraint is the pattern worth studying.

Sourcing for this file is mostly `[secondary]` — Quizlet's own blog posts were partially gated (403 on direct WebFetch), so material comes from third-party reviews and search-engine snippets of the Quizlet blog. Treat specific UI claims as directional; the *shape* of patterns here is reliable even if pixel-level detail isn't.

## TOC

1. Mental model — tri-state + adaptive
2. Set-level completion signal
3. Learn mode's adaptive loop
4. Class Progress (teacher surface)
5. User-review signal
6. Patterns worth porting

## 1. Mental model — tri-state + adaptive `[secondary]`

At set level, every study item lives in one of three states:

- **Not started** — no terms reviewed
- **Started** — partial progress
- **Finished** — all terms reviewed to completion

This is a distilled version of Linear's 5-state workflow. For learning content that the user either *has* or *hasn't* engaged with, three states is enough — five would be theatre.

Adjacent to set-level state is the per-term state tracked by Learn mode (see §3), which is finer-grained but invisible at the set list view.

## 2. Set-level completion signal `[secondary]`

- **Green check mark** on completion of a set — appears on the set tile in list view.
- Visual indicators distinguish "not started / started / finished" at a glance.
- Progress bar on an in-progress set shows terms-reviewed / terms-total.

The green check is small and ambient — not a celebratory popup. It marks state persistently so the list view is scannable.

## 3. Learn mode's adaptive loop `[secondary]`

Quizlet's Learn mode (2023+ redesign) does per-term difficulty tracking:

- The system analyzes which terms the user has struggled with.
- Struggling terms appear more frequently in subsequent rounds.
- Mastered terms drop out until spaced review suggests reintroduction.
- Learn mode surfaces a **round-level progress signal** — "round 2 of 3" or equivalent, showing the learner how close they are to completing the current study session.

2024-2025 additions (per Quizlet blog):
- AI generates multiple-choice distractors automatically.
- AI-assisted short-answer grading.
- Write + Spell (previously separate modes) integrated into Learn.

**Implication for claudeHub:** if quizzes were to have a mastery loop (beyond just "quiz taken / not taken"), the per-term-difficulty pattern is the canonical shape. But it requires quiz-item tagging claudeHub doesn't currently have.

## 4. Class Progress (teacher surface) `[secondary]`

Teacher-facing view that shows per-student set progress. Out of scope for claudeHub (single-user app) but worth noting one pattern: the teacher view is *just the same tri-state badges, aggregated*. Same visual language at different scale. That's the principle — one lifecycle vocabulary applied consistently at item level and collection level.

## 5. User-review signal `[secondary]`

Review aggregators + Student Doctor Network forum thread on the 2023 Learn mode redesign:
- Positive: adaptive difficulty feels responsive.
- Mixed: UI refresh generally well-received; some users prefer the old Learn flow.
- Friction: premium paywall for some AI features is a common complaint (not a UX issue per se).

Directional only; no single-source hard claim.

## 6. Patterns worth porting

### Port:

- **Tri-state set completion** (not started / started / finished). Minimal, scannable. Directly applicable to claudeHub Learn item tiles in the **Up Next / Everything else / Done** zone layout, and to Project tiles.
- **Ambient green check on completion.** Not a popup, not a badge collection — just a persistent mark on the tile.
- **Progress bar on the tile itself** (when in-progress). No separate "progress dashboard" needed.
- **One lifecycle vocabulary at multiple scales.** The same badge vocabulary reads at item level (one set) and collection level (a folder of sets).

### Anti-port:

- **Premium / paywall UI patterns.** Irrelevant for claudeHub.
- **Per-term difficulty tracking** unless claudeHub grows quiz-item-level metadata (not currently in scope).
- **AI MCQ generation.** Covered by `project_no_runtime_api_calls.md`.

## Bootstrap log

- 2026-04-20 — initial rehydration. Quizlet blog 403'd on direct WebFetch; content sourced from search-result excerpts + third-party reviews. If higher-fidelity detail on Learn mode visuals becomes needed, user-paste of `quizlet.com/blog/new-a-smarter-learn-mode` would upgrade claims from `[secondary]` to `[verbatim, Quizlet blog]`.
