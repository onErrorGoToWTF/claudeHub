# Learning Journal

Running log of my actual journey building aiUniversity — stuck points, easy wins, aha moments, decisions, milestones. Not polished. Meant to capture the shape of the learning so future users can see how someone who wasn't an AI expert got there.

Eventually this goes native inside the app — journal entries become a Dexie table, linkable to topics + library items via Chunk H edges, with a visibility field (private → friend-view → public). Your journey becomes content.

## How to use

Each entry is dated and tagged by flavor. Keep entries short — the point is volume over polish.

- `#stuck` — hit a wall
- `#easy-win` — turned out simpler than I expected
- `#aha` — something clicked conceptually
- `#decision` — a call I'm making, reasoning preserved so future-me remembers why
- `#progress` — a milestone worth marking

Append-only. Don't edit old entries; add a new one if your understanding improves and reference the prior one.

---

## 2026-04-23 — `#aha` — "Flipping feels unintuitive" was a real signal

I was circling on whether the Dashboard should flip between "today view" and "progress view." Kept thinking I should like the flip but couldn't. Research on how real learning apps handle this revealed: what I was calling a "flip" is a *segmented-control for mutually-exclusive renderings of the same content* — Apple HIG is explicit about this pattern. Today vs. Progress is **different content**, not different views of the same content. That's why it felt wrong. The right pattern is sub-tabs on a page (Linear My Issues, Khan Active/Past, Cal.com Bookings). Trust the instinct when something "feels off" — there's usually a known-pattern reason.

## 2026-04-23 — `#aha` — Pathway is emergent, not identity

Spent a lot of cycles trying to engineer the "right" onboarding for picking a pathway. Kept hitting edges (what about guests? what about users who skip? what about career changes?). Eventually realized the premise was wrong — pathway shouldn't be a thing you pick, it should be a thing you are, computed from what you've actually done. Duolingo's achievements work this way. GitHub's "top language" works this way. My identity is a function of my history, not a declaration at signup. Cut onboarding entirely as a result.

## 2026-04-23 — `#decision` — Obsidian-style over hierarchical

Picked tags-first taxonomy + thin Category layer + bidirectional edges between nodes. Reasoning: our catalog will grow, cross-cutting themes (`#ethics`, `#prompting`, `#production`) don't fit cleanly in one parent, and eventually a graph view becomes the reflective home. Obsidian power-users say "folders for macro, tags for micro." Applied that to a learning catalog: Category (bookshelf) for macro, tags for micro, edges for graph-ready. Categories stay single-parent per track; everything else lives at the tag layer.

## 2026-04-23 — `#decision` — 0% hard-delete, >0% archive forever

Item in your plan at 0% progress? You can hard-delete it — no record to preserve. Any progress > 0%? Archive only, never hard-delete. Learning apps (Khan, Duolingo, Coursera) never let you delete completed work. Linear archives done issues. Convergent pattern: "your record is sacred; your backlog isn't." Nice rule because it respects exploration (try something, decide it's not for you, remove cleanly) without letting you accidentally erase your learning.

## 2026-04-23 — `#easy-win` — SPA 404 fallback is one line

Deep-link refresh on GitHub Pages was 404'ing. Expected it to be a gnarly routing problem. Actual fix: one line in the deploy workflow — `cp dist/index.html dist/404.html`. GitHub Pages serves 404.html for unknown paths; because it's the SPA shell, React Router picks up where the server left off. Took two minutes. The gnarliest things sometimes have the cleanest fixes.

## 2026-04-23 — `#stuck` — CI caught what my local build didn't

Three deploys in a row silently failed. Local `tsc --noEmit` passed. CI `tsc -b` failed on `[laughs]` inside a template literal — inner backticks terminated the outer template, making `laughs` an undefined identifier. Lesson: run the same compile command CI runs. Also: when the user says "it's not updating," check the deploy status first, not the browser cache. Every minute I spent telling them to hard-refresh was a minute that could have been a two-second `gh run list` check.

## 2026-04-23 — `#progress` — Full taxonomy refactor shipped in a day

Chunks H through L: new Category layer, shared tag vocabulary, bidirectional edges, `/me` reflective page, Learn restructured by category, Starter packs, onboarding cut, Settings overhauled with transparency labels, topic cross-links, Library tag facet, engagement prompt on lesson start. 5 commits, all green, deployed live. Felt like a lot going in; felt natural once the pieces were sequenced correctly. Rule learned: when the research doc is solid, execution is mostly typing.

---

## Template for new entries

    ## YYYY-MM-DD — `#flavor` — One-line title

    The entry body in 2–6 sentences. What happened, what it taught me,
    what I'd do differently (or the same) next time. Reference prior
    entries if this builds on one.
