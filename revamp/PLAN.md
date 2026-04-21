# aiUniversity Revamp — Plan

## North star

aiUniversity is an AI-learning app with **three pathways**:

1. **Student** — foundational AI literacy.
2. **Office** — using AI without coding (C-suite / knowledge worker).
3. **Developer** — coding with AI, full-stack.

Users can:

- **Follow a structured learning path** (Khan-style tracks → topics → lessons/quizzes), OR
- **Build a custom pathway** by picking the topics they want to learn — the app orders them into the correct prerequisite flow automatically, so the user learns the right things in the right order without designing the sequence themselves, OR
- **Learn ad-hoc** from the Library of resources, OR
- **Start from a project idea and get trained for it.** The project flow sets up a tailored learning path (with short quizzes) to prepare the user *before* they touch AI tools. No "university required" — pick a goal, get the exact prep.

**Developer bootstrapper.** For the developer pathway, the app scaffolds the dev environment — tools, extensions, API hookups — so devs can start coding immediately without hunting for setup steps.

**Always-free AI.** The app will always include free ways to use AI. Paid tier (API calls) is additive, never gating. Free version stays online permanently.

**Stays current.** The ecosystem changes hourly; the app absorbs that churn so users don't have to. Linear-app simplicity with depth-on-demand. Greige/neutral light palette (+ dark mode), squared corners, tasteful accent glows.

## Sections

- **Dashboard** — quiet landing; overall progress, recent activity, quick resume.
- **Learn** — Khan-style mastery tracks, tagged by pathway (student/office/dev/all). Hand-authored.
- **Projects** — project-first onboarding: intake → stack picker → Easiest/Cheapest/Best routes → **gap analysis generates a pre-flight learning path with quizzes** → bootstrapper (dev pathway) scaffolds env.
- **Library** — searchable catalog of tool + doc + read bodies, pathway-tagged.
- **Inventory** — deferred UI; schema reserved.

## Pathway model

- Content (tracks, topics, Library items, project templates) carries an `audience` tag.
- Default filter per user pathway; user can widen to "all".
- No persona switcher UI — tag-based filtering.

## Project-first flow (the signature feature)

1. User describes the project (or picks a template).
2. App picks stack + route (Easiest / Cheapest / Best).
3. App diffs required skills vs. user's mastery → produces a **gap list**.
4. Gap list becomes a short, quiz-gated prep path.
5. On dev pathway: bootstrapper runs (env + extensions + API keys ready).
6. User starts the project already trained.

## Seed data policy

One polished sample of each content type per pathway. Scale later.

## Reference priority

Linear > Anthropic docs > Quizlet > Khan.

## Autonomy

No milestone pauses. Commit freely on `main`. Phone review between milestones only.
