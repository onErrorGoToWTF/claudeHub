# Dashboard: housing action + reflection without a 5th tab

Research dated 2026-04-22. Goal: add a reflective view (full pathway + mastery, report card, project rollup, recent activity) to the Dashboard without expanding the 4-tab navbar, and without violating the Linear/Apple minimalism rule.

---

## 1. What real sites actually do

### Khan Academy — Learner Home
Single home page stitches both modes together. Assignments split **Active / Past** via tabs at the top; the separate **Learning Dashboard** surfaces mastery, skill levels, energy points and badges in a dedicated area. Progress updates in real time but lives in its own region rather than replacing the assignment list. Pattern: **tabs-in-page for time slice, separate sub-surface for reflection.**
- https://support.khanacademy.org/hc/en-us/articles/360030629852
- https://blog.khanacademy.org/introducingthe-learning-dashboard/

### Duolingo — Home
One scrolling path. No mode switch. The linear path *is* the action view (next lesson = next circle) and the progress view (how far down you've walked). Practice Hub and streak live as satellite surfaces, not as a mode toggle. Pattern: **single artifact doing both jobs — path as progress.**
- https://blog.duolingo.com/new-duolingo-home-screen-design/
- https://support.duolingo.com/hc/en-us/articles/6448984613773

### Coursera — Dashboard
List of enrolled courses with inline progress bars. A **"Next step" CTA** jumps you to the exact next lecture/assignment. No separate reflection view — reflection is the progress bar per course. Pattern: **action + reflection fused on every row.**
- https://blog.coursera.org/new-progress-tracking-features-on-coursera/
- https://blog.coursera.org/whats-new-on-coursera-dashboard-and-course-home/

### Brilliant — Today
**Today tab** is the default action view (today's lesson preview, streak). Progress/courses-completed visuals live in a sibling tab. Pattern: **Today vs. Courses as sibling sub-tabs inside Home.**
- https://brilliant.org/

### Notion — Home
Modular widgets: upcoming calendar events, My Tasks, recently visited, shortcuts. Reflection (habits, goals) is whatever the user builds into a dashboard page, often as a linked child. Pattern: **scroll-depth stack of small modules.**
- https://www.notion.com/help/home-and-my-tasks
- https://www.notion.com/help/guides/personal-work-dashboard

### Linear — My Issues / Inbox
**My Issues** is 4 sibling tabs (assigned / created / subscribed / recent activity). **Inbox** is a separate top-level destination — notifications never mix with the issue list. Custom dashboards exist but are opt-in builds, not the landing surface. Pattern: **tabs-in-page for slices of one entity; separate top-level for a different entity.**
- https://linear.app/docs/my-issues
- https://linear.app/docs/inbox

### GitHub — Personal dashboard
Single scroll: "For you" recommendations near the top, Recent activity below. Filters dropdown refines the feed in place. Pattern: **scroll-depth, filter-in-place.**
- https://docs.github.com/en/account-and-profile/get-started/personal-dashboard-quickstart

### Cal.com — Bookings
Sub-tabs: Upcoming / Unconfirmed / Recurring / Past / Canceled. Same data, sliced by status. Pattern: **tabs-in-page as status filter.**
- https://cal.com/blog/a-complete-walkthrough-of-cal-com-s-booking-dashboard-its-key-features

### Strava — You tab
Mobile: You > Progress opens a dedicated Training Log surface. Feed stays on Home. Reflection is a **navigation step deeper**, not a mode flip. Pattern: **drill-down from entity list to reflection view.**
- https://support.strava.com/hc/en-us/articles/206535704-Training-Log

### Obsidian — Daily note + graph
Two genuinely different artifacts reachable from the left rail; users don't mode-switch, they open each when the task demands. Dashboard-style homepages exist but are user-built canvas/dataview constructs, not a product pattern. Pattern: **separate surfaces for separate jobs.**
- https://help.obsidian.md/plugins/daily-notes
- https://medium.com/obsidian-observer/my-obsidian-canvas-homepage-dashboard-67c6ce1613c5

---

## 2. Patterns, ranked by fit

Constraints recap: 4-tab budget, minimal info at one time, Linear/Apple/Obsidian feel.

| # | Pattern | Who uses it | Scales with content? | Minimal at a glance? | Fit |
|---|---|---|---|---|---|
| 1 | **Tabs-in-page (sibling sub-tabs)** | Khan (Active/Past), Linear My Issues, Cal.com bookings, Brilliant | Yes — add a tab per slice | Yes if each tab is one module | **Strongest** |
| 2 | **Segmented-control flip (two modes, same surface)** | iOS Maps (Map/Transit/Satellite), analytics time toggles | Poor — only two states; adding a third strains the metaphor | Yes | Strong for exactly 2 modes |
| 3 | **Fused row (action + reflection on each item)** | Coursera, Duolingo path | Great — one artifact | Moderate — density grows with course count | Good as a complement, not the whole answer |
| 4 | **Scroll-depth stack** | GitHub dashboard, Notion home | OK | Fails — everything is visible at once, cluttered by definition | Poor fit |
| 5 | **Drill-down to separate surface** | Strava You > Progress, Obsidian graph | Great | Yes — reflection lives in its own room | Good, but risks feeling hidden without a nav entry |
| 6 | **Collapsible sections** | Various admin UIs | OK | Fails once >2 collapsed blocks — "where is it?" problem | Poor |
| 7 | **Hover-card peek** | Linear issue previews, GitHub PR hovercards | N/A — auxiliary | N/A | Not a primary-view pattern |

Key observations:
- **Apple HIG explicitly warns: one segmented control per screen, five or fewer segments.** Segmented controls are for "closely related but mutually exclusive" views of the *same content*. Tabs switch between distinct *sections*. (https://developer.apple.com/design/human-interface-guidelines/segmented-controls, https://mobbin.com/glossary/segmented-control)
- The cleanest professional products (Linear, Cal.com, Khan) converge on **tabs-in-page**, not flips. Flips show up mostly on mobile for small, equivalent slices (Map/Transit/Satellite, time granularity toggles in analytics).
- **Scroll-depth is how to kill minimalism.** GitHub and Notion look busy by default; both are explicitly maximalist product aesthetics, not Linear/Apple.

---

## 3. Recommendation for aiUniversity

**Ship tabs-in-page inside Dashboard.** Two sibling sub-tabs at the top of the Dashboard route: **Today** (default) and **Progress**. Use a Linear-style squared segmented pill — but conceptually it's tabs (different content sections), so label them as tabs and route them with hash or child segment (`/dashboard` → Today, `/dashboard/progress` → Progress). Same nav, no 5th tab.

### Today (default landing)
One screen, three blocks max, stacked:
1. **Continue** — the single next-up CTA (current lesson or quiz resume). One card.
2. **Learn panel** — same condensed list already on Dashboard today.
3. **Projects panel** — same condensed list.

No pathway map. No report card. No mastery rollup. This is the action view. Fast to load, fast to read, one decision to make.

### Progress (second sub-tab)
One screen, four blocks, stacked top-to-bottom, each a single module so "minimal at a glance" survives:
1. **Report card** — letter grade + 4 status buckets (Not started / In progress / Completed / Mastered) from `src/lib/mastery.ts`. Single row, numbers-forward.
2. **Pathway map** — the full selected pathway (student/office/media/vibe/dev) as a vertical list of topics with inline mastery status. Linear-style: topic name, status chip, diagonal-fold ribbon for % where applicable. Collapsed by default if topic count exceeds ~12 — show first N, "Show all" reveals the rest. No drawers inside drawers.
3. **Project rollup** — projects grouped by Linear status vocabulary; counts only, not tiles. Tap through goes to Projects tab.
4. **Recent activity** — last 5 events (quiz passed, lesson read, project moved). Plain list, timestamp right-aligned.

### The control itself
- Squared pill, two segments, 6px radius, same easing as existing pill components. No underline tab style (that's GitHub — wrong aesthetic).
- Placed directly under the page title, left-aligned. Linear puts `My Issues` tabs in exactly this position.
- Persists selection in `localStorage` so return visits land on whichever mode the user last chose. Default on first visit: Today.
- Route-backed (`/dashboard` vs. `/dashboard/progress`) so deep links work and browser back works. Apple HIG treats segmented controls as intra-view filters; because we are routing, we are honestly in tabs-territory. Label them Tabs.

### Why this matches the constraints
- **4-tab budget preserved.** Dashboard remains one navbar item.
- **Minimal at any one time.** Today shows ~3 cards. Progress shows 4 modules, each doing one job. Neither surface mixes action with reflection.
- **Linear/Apple feel.** Tabs-in-page is the Linear pattern for My Issues; Khan uses it for Active/Past; Cal.com uses it for booking status. This is the idiomatic professional-product move.
- **Scales.** If a 3rd reflection surface ever emerges (e.g., "Streak" for dev-pathway practice cadence), it's one more sub-tab, not a navbar change.

---

## 4. Is "flipping feels unintuitive" confirmed?

**Partially confirmed; re-framing resolves it.**

The concern is real when the two views are labeled as modes of the same object (a flip). Apple HIG's segmented-control guidance is "closely related but mutually exclusive *views of the same content*" — Map/Transit/Satellite all show the same map, just rendered differently. Today vs. Progress aren't renderings of one object; they're different content. Forcing them into a segmented-control flip miscasts the relationship and makes the control feel like a gimmick.

**Re-framed as tabs-in-page**, the intuition problem dissolves. Users have a strong mental model for sub-tabs from Linear, Khan, Cal.com, GitHub repo pages. The tab strip is a sibling navigation, not a mode toggle. The user's instinct that "flipping feels unintuitive" is correct about *flips*; it doesn't apply to tabs.

Practical rules that keep it feeling professional and not gimmicky:
- **Route-backed, not just state.** Deep-linkable.
- **No animation crossfade between modes.** Just swap content. Linear does this; it feels instant and honest. Crossfades make it feel like a trick.
- **No "secret" reflection behind a flip affordance.** Both tabs are labeled and equally weighted in the UI. Nothing hidden.
- **Default to Today.** First impression is always the action view. Reflection is opt-in per session.

---

## If you ship one thing, ship this

- **Add a two-tab strip (Today | Progress) to `/dashboard`, route-backed, Linear-pill styled.** Default landing is Today; Today stays exactly what Dashboard is today.
- **Progress = four stacked single-purpose modules: report card, pathway map, project rollup, recent activity.** No pathway nested inside report card, no activity nested inside projects. Flat.
- **No animation between tabs, no segmented-control flip metaphor, no 5th navbar item.** Tabs, not flips; the distinction is what makes it feel Linear instead of gimmicky.
