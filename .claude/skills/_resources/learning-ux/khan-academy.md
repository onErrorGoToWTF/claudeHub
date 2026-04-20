---
topic: Khan Academy — Learning Dashboard + progress tracking
last_fetched: 2026-04-20
staleness_days: 30
sources:
  - https://blog.khanacademy.org/introducingthe-learning-dashboard/
  - https://support.khanacademy.org/hc/en-us/articles/360039664491-What-can-I-do-from-the-Khan-Academy-Parent-Dashboard
  - https://support.khanacademy.org/hc/en-us/articles/360031129891-What-reporting-options-are-available-on-Khan-Academy-for-teachers-to-track-student-performance
---

# Khan Academy — Learning Dashboard patterns

Of the three learning apps in this cache, Khan Academy's design is the closest in spirit to what the user has said they want: **personal, minimal, and dashboard-centric without a dedicated Awards page.** Most of Khan Academy's "achievement" signal is inlined into the dashboard itself — points, badges, and skill levels sit alongside the Recommended Tasks list, not on a separate screen.

## TOC

1. Mental model — "personal homepage"
2. Dashboard composition
3. Mastery tasks + daily cadence
4. Progress visualization
5. Activity / real-time update pattern
6. User-review signal
7. Patterns worth porting / anti-porting

## 1. Mental model — "personal homepage" `[verbatim, Khan blog]`

Khan Academy frames the Learning Dashboard as **"your personal homepage on Khan Academy"** whose job is to help you **"find the best next things for you to do"**. That phrasing is the thesis: the dashboard is *prescriptive* (suggest the next action) not merely *descriptive* (summarize past state).

Practical consequence: the dominant UI element is a list of recommended tasks, not a leaderboard or an analytics panel.

## 2. Dashboard composition `[verbatim, Khan blog]`

Primary elements:

- **Recommended task list** — skills selected as optimal for individual practice. Users can customize (add preferred skills); coaches can contribute additions.
- **Mastery tasks** — unlock daily (see §3).
- **Dashboard progress bar** — allows real-time monitoring of overall progression.
- **Points / badges / skill levels** — **"all visible and updated in realtime"** `[verbatim]` directly on the dashboard.

No separate "achievements" page is needed; achievement signals are ambient on the dashboard.

## 3. Mastery tasks + daily cadence

Mastery tasks **"on the dashboard unlock daily"** `[verbatim]`. Khan's rationale `[verbatim]`: **"proving what you know over time is a really great way to ensure that you actually remember what you've learned."**

This is a spaced-retrieval pattern surfaced in UI: the learner doesn't have to remember to review; the dashboard offers today's review items. The daily unlock creates **a cadence without a streak** — the learner has something new to do each day without the loss-aversion overtone of "don't break your streak."

## 4. Progress visualization

Khan Academy's visualizations (per current docs + screenshots in the linked blog):

- **Progress bar** — linear, per-skill or per-course. Multi-tier (e.g., Familiar → Proficient → Mastered).
- **Skill-level glyph** — small icon-plus-label at skill/task level reflecting the mastery tier.
- **Points** — numeric totals, updated real-time.
- **Badges** — earned milestones, shown inline near the dashboard panels (not in a wall-of-badges view).

Notably absent: streaks, flames, or leaderboard-style comparisons on the dashboard. That restraint is what makes Khan the closest analog to claudeHub's aesthetic goals.

## 5. Activity / real-time update pattern

Khan's dashboard is **live-updated** `[verbatim, paraphrase]`: as a learner completes practice, the dashboard progress bar, points total, and badge state update without navigation. This pairs with the Recommended Tasks list, which re-ranks based on what's been completed.

This is subtly different from Linear's "manual update" posture (§7 of `linear-workflow.md`): Khan's progress is a *fact* (points earned is deterministic), while Linear's project status is a *claim* (human decides when shipped). Both approaches are valid depending on whether progress is objective (quiz grade) or interpretive (project lifecycle).

## 6. User-review signal `[secondary]`

App Store / review-aggregator signal, from public UX case studies:
- Praise: clarity of what-to-do-next, dashboard legibility.
- Friction: feature sprawl over time (badges expanded, AI tutor "Khanmigo" added); some users report the dashboard has become noisier.

This should be treated as directional only — no single-source hard claim.

## 7. Patterns worth porting / anti-porting

### Port:

- **Dashboard-is-the-destination.** No separate Awards page. Points/badges/skill-levels sit inline on the dashboard, near the surfaces they relate to.
- **Next-best-action list as dominant element.** "Recommended Tasks" structure maps cleanly onto claudeHub's "Up Next" concept already in the Learn refactor plan.
- **Daily cadence without streak.** Something new unlocks each day; no penalty for missing a day.
- **Multi-tier skill progression** (Familiar → Proficient → Mastered). Maps onto a 3-4 stage Learn mastery scheme if one's wanted.
- **Live-updated progress bar** on the dashboard surface itself — updates as activity happens, not on page reload.

### Anti-port:

- **Badge proliferation.** Khan has 100+ badge types; maintenance cost is high and reward value diminishes. If badges appear at all in claudeHub, keep the vocabulary to a single digit.
- **Leaderboards.** Not in claudeHub's scope (single-user app).
- **Coach/parent/teacher dashboards.** Out of scope (same reason).

## Bootstrap log

- 2026-04-20 — initial rehydration from Khan Academy blog + help center. Dashboard-level material from the blog post; reporting-tier material from help articles (less relevant for claudeHub's single-user case, summarized briefly).
