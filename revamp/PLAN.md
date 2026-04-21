# aiUniversity Revamp — Plan

## North star
The site is Alan's self-directed AI-learning playground, and eventually his resume. Linear-app simplicity with depth-on-demand. Greige/neutral light palette, squared-off corners, tasteful accent glows, smooth compositor-only transforms.

## Sections
- **Dashboard** — quiet landing; overall progress bar, recent activity, quick resume.
- **Learn** — Khan-style AI mastery broken into tracks → topics → lessons/quizzes. Hand-authored only (Alan writes; Claude API integration deferred).
- **Projects** — guided intake → stack picker → Easiest/Cheapest/Best routes → gap analysis vs Inventory → gaps listed for future Learn feed. Manual progress tracking. Bootstrapper deferred.
- **Inventory** — deferred UI; schema reserved.

## Seed data policy
One polished sample of each content type: one lesson, one quiz, one project, a handful of topics across 3-4 AI tracks. Everything else can come later.

## Build order
1. Scaffold + deps (done)
2. Durable state files
3. Design tokens (single source, cascade-safe)
4. App shell (routing, responsive nav)
5. Data layer (Dexie + repo interface)
6. Dashboard
7. Learn (list → topic → lesson + quiz)
8. Quiz engine
9. Projects (intake → routes)
10. Optional skill-map viz (only if it fits the minimalism)
11. Polish + Pages build

## Reference priority
Linear > Anthropic docs > Quizlet > Khan.

## Autonomy
No milestone pauses. No phone-review breaks. Commit freely on `claudeRevampAttempt`. Main branch untouched.
