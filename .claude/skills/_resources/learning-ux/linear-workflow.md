---
topic: Linear — workflow, project progress, activity feed patterns
last_fetched: 2026-04-20
staleness_days: 30
sources:
  - https://linear.app/docs/configuring-workflows
  - https://linear.app/docs/project-status
  - https://linear.app/docs/project-graph
  - https://linear.app/docs/project-milestones
  - https://linear.app/docs/initiative-and-project-updates
  - https://linear.app/docs/inbox
  - https://linear.app/changelog/2025-04-03-collapsed-issue-history
---

# Linear — workflow and progress patterns

Linear is the highest-quality reference in this topic because it **publishes its design rationale publicly** (in-docs, not gated). Almost every claim below is tagged `[verbatim, Linear docs]` or paraphrased from the linked page.

## TOC

1. Mental model — workflow as first-class
2. Issue-state vocabulary
3. Project-state vocabulary
4. Health indicators (On track / At risk / Off track)
5. Milestones + completion %
6. Project progress graph
7. Activity feed + Inbox patterns
8. Update cadence (manual rhythm over auto)
9. What ports cleanly to claudeHub

## 1. Mental model — workflow as first-class

Linear's core thesis: progress tracking is **defined by state transitions**, not by gamification. Every issue lives in exactly one state; every project lives in exactly one state. The UI's job is to make those states unambiguous at a glance and let them roll up into higher-level views (project → initiative → roadmap) without extra work.

Claude-neutral observation: this matches claudeHub's existing bias — there is no XP system, no streaks, no mascots, and the design language would actively reject any of that. Linear's lineage (Brian Lovin, Karri Saarinen, all ex-Airbnb/Coinbase designers) is the direct spiritual ancestor of claudeHub's visual restraint.

## 2. Issue-state vocabulary `[verbatim, Linear docs]`

Default issue workflow: **"Backlog > Todo > In Progress > Done > Canceled"**. A sixth **Triage** category acts as **"an Inbox for your team,"** used with integrations.

Five primary categories:

- **Backlog** — starting point for new issues
- **Todo** — unstarted work
- **In Progress** — active work
- **Done** — completed work
- **Canceled** — rejected or dismissed

Rules `[verbatim, Linear docs]`:
- Statuses can be **edited for name, color, or description**.
- **"Statuses can be rearranged within a category but categories cannot be moved around."**
- The first Backlog status is the default for newly created issues.
- When an issue is marked duplicate, status changes to **Canceled** (unless a custom replacement is configured).

## 3. Project-state vocabulary `[verbatim, Linear docs]`

Distinct from issue states: **"Backlog, Planned, In Progress, Completed, and Canceled"**. Customizable in `Settings → Projects → Statuses`.

Key behavior `[verbatim, Linear docs]`: **"Project statuses are updated manually—we do not do this automatically, even if all issues are completed."**

This is deliberate. Linear wants the project lead to *decide* when a project is done, not have the system infer it from issue count. Implications:

- A project with 100% issue completion can still be "In Progress" if the lead hasn't marked it shipped.
- The lifecycle badge is a human claim, not a metric.

**Display surfaces:** **"next to the project name in the initiative or project timeline pages as well as in an icon on the project bar."**

## 4. Health indicators — On track / At risk / Off track `[verbatim, Linear docs]`

Three discrete states attached to initiatives and projects: **"On track, At risk, or Off track."** Different dimension from lifecycle state — you can be `In Progress` + `At risk` simultaneously.

Update composition `[verbatim, Linear docs]`: **"a health indicator that provides high-level signal of the current state and a rich text description"**. The health pill is the at-a-glance signal; the rich-text description is the why. This pairing is load-bearing — a health state without narrative is too thin; narrative without health state fails the scan test.

**Update cadence:** admins **"choose how often reminders are sent, such as weekly or biweekly"** + day/time. Project leads get **"reminders in the designated time window in their local timezone."** Follow-up nudges at 1 then 2 working days after.

**Update surface:** most-recent update shows on overview; prior updates live in a chronological "Updates" tab alongside property-change events.

## 5. Milestones + completion % `[verbatim, Linear docs]`

Each milestone renders as a **diamond icon** whose appearance changes by completion status. **"The diamond icon for the milestone will change depending on the completion status and the milestone currently being worked towards will have a yellow icon to show focus."**

Quantification: **"When viewing milestones in the project details pane, we will show a completion percentage for each milestone. This is the percentage of issues in the milestone that have been moved to a completed status."**

So milestones have:
1. A glyph that indicates state (done / active / pending).
2. A yellow variant flagging the *current* focus milestone.
3. A numeric percentage (issues-completed / issues-total).

## 6. Project progress graph `[verbatim, Linear docs]`

Autogenerates once a project moves into a Started status.

Visual elements:
- **Scope line:** **"A gray line shows you the project scope and how it has changed over time"** — baseline that can move up (scope added) or down (scope cut).
- **Work in-flight vs. done:** separate lines for Started and Completed issues.
- **Completion bars:** **"Blue bars also indicate completed issues over time."**
- **Target date:** **"If you have a target date set, it'll show up as a red vertical line."**
- **Projections:** dotted-line continuation of current completion trend, showing best / expected / worst shipping windows. Linear weights **"recent weeks... more heavily"** in the calculation.

Breakdowns: **"by assignee and label, showing what percentage of issues in those categories have been completed."**

Estimate math: remaining work points include **"a 1/4 modifier for any in-progress issues."** For teams without estimates, **"all issues are treated as 1 estimate point."**

Scope-drop explanation: **"when someone deletes or removes issues from a project, cancels issues, or reduces issue scope"** — progress appearing to decline is acknowledged rather than hidden.

## 7. Activity feed + Inbox patterns `[verbatim + paraphrase, Linear docs]`

### Activity collapsing

**"To reduce clutter and keep the issue activity feed focused, Linear groups similar consecutive events and collapse older activity between comment threads."** `[verbatim, Linear docs]` Reinforced by the 2025-04-03 changelog entry "Collapsed issue history."

This is the single most-copyable pattern for any "recent activity" feed: **don't show every event; group identical consecutive ones, collapse older runs, expand on demand.**

### Inbox as universal destination

All notifications land in Inbox. Subscription sources:
- Auto-subscribed on issue create / assign / @mention.
- Manual subscribe via Activity menu.

### Inbox interactions

- **Snooze:** temporarily hides a notification; at specified time it **"re-appear[s] as a new notification and unread"**.
- **Inline actions:** delete, snooze, update issue properties — directly from list view.
- **Filter:** `Cmd/Ctrl+F` brings up quick search; filter by title, issue ID, notification type, or assignee.

### What this builds

A single at-a-glance surface that's state-ful (read/unread, snoozed) and actionable (don't leave the Inbox to do the thing). Activity isn't a firehose; it's curated.

## 8. Update cadence — manual rhythm over auto

Linear's rhythm is deliberate:
- Statuses change when humans say so, not when the math says so.
- Project updates are prompted on a schedule but composed by the lead.
- Follow-up nudges escalate over 1–2 working days, then stop.

This is anti-dashboard-staleness by design. The alternative — auto-progress — tends to present numbers that no human has endorsed, and readers learn to mistrust them.

## 9. What ports cleanly to claudeHub

The short list. See `claudehub-recommendations.md` for concrete surface mappings.

| Linear pattern | claudeHub opportunity |
|---|---|
| Issue-state vocabulary (Backlog/Todo/In Progress/Done) | Direct analog for Projects lifecycle badge (Idea → Building → Shipped → Archived, or similar) |
| Project-state manual update | Lifecycle badge owned by the user, not inferred from lesson-completion % |
| Health indicator (3-state) separate from lifecycle | Could sit alongside lifecycle on Project tiles for in-flight projects |
| Milestone diamond + yellow "current focus" | Matches the user's existing `.continue-row` eyebrow idea |
| Milestone completion % as `done / total` | Matches Learn zone tiles (e.g., `3 / 5 quizzes`) |
| Activity feed with consecutive-event collapsing | Directly portable to a Dashboard "Recent activity" strip |
| Inbox-as-destination (universal) | Matches claudeHub's single-page paradigm; Dashboard IS the inbox |

### What to leave behind

- **Burndown-style projection graphs.** Out of scope for personal learning + projects; would need time-series data claudeHub doesn't record.
- **Triage as a discrete category.** No incoming work-item queue; nothing to triage.
- **Weekly update reminders.** claudeHub has no cadence mechanism; phone-review-between-milestones is the cadence.

## Bootstrap log

- 2026-04-20 — initial rehydration from 5 Linear docs pages + changelog. All `[verbatim, Linear docs]` marks verified against page source. No conflicts to resolve.
