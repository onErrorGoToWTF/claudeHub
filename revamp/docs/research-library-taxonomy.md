# Library + Catalog Taxonomy — Research

Research-only. No code changes. Commissioned 2026-04-22.

Scope: how to restructure the Learn catalog and Library so that (a) courses
that belong together appear together, (b) a topic can sit in multiple
categories without forcing a rigid folder, and (c) we leave the door open to
an Obsidian-style graph view later. User constraints are locked: 4-tab
navbar, Linear-minimal, minimal info at once, tags-over-folders sensibility.

---

## Part 0 — Current state (grounded)

From `src/db/types.ts` + `src/db/seed.ts` + `src/pages/{Learn,Library}.tsx`:

- Catalog is **strict 3-level hierarchy**: `Track → Topic → Lesson|Quiz`.
  Each `Topic.trackId` is a single parent — a topic cannot belong to two
  tracks. 8 tracks today: `literacy`, `foundations`, `prompt-eng`, `agents`,
  `frontend-ai`, `vibe-coding`, `office-ai`, `generative-media`.
- `Topic` has `prereqTopicIds: ID[]` — the only cross-cutting edge that
  already exists. It's used by the custom-pathway builder to topologically
  order picks.
- `LibraryItem` is a **flat list**. Fields: `kind` (tool/doc/read/video),
  `tags: string[]`, `audience[]`, `pinned`. No link to `Topic` or `Track`.
- `Library.tsx` filters by kind + text + audience soft-split; tags render as
  chips but aren't searchable as a facet.
- Audience-tagging (`Audience[]`) is the one truly multi-valued
  classification already in production, so the "one thing belongs to many
  buckets" pattern has precedent.

Problem the user is naming: a visitor sees eight tracks as a flat row, and
the Library's kind-facet doesn't expose the thematic clusters
(e.g., "Foundations", "Communication tools", "Media"). There's no way for
"Claude Code Basics" (a Topic under `vibe-coding`) to also appear under a
"Claude ecosystem" cluster that spans `agents` + `frontend-ai` + Library
docs like `doc.claude-code`.

---

## Part 1 — How other platforms handle this

### Coursera — rigid 3-level, soft tags on top
`Specialization → Course → Module → Lesson`. A Specialization is a curated
sequence of 3–6 Courses usually ending in a capstone.
([Coursera Help](https://www.coursera.support/s/article/208280296-Specializations),
[Class Central](https://www.classcentral.com/help/what-are-coursera-specializations))
Cross-cutting handled via **search keywords + skill tags** layered on top
of the hierarchy — a course about "LLM prompting" surfaces for both the
"Generative AI" specialization page and the "Machine Learning" skill tag.
No graph view. Navigation is hierarchy-first, tags are search-only.

### Khan Academy — strict hierarchy, mastery per leaf
`Course → Unit → Lesson → Skill`. Course challenges are 30-question
cross-unit tests; unit tests sit at the Unit boundary; each Lesson has its
own quiz.
([Khan Academy Help](https://support.khanacademy.org/hc/en-us/articles/115002552631-What-are-Course-and-Unit-Mastery),
[content & standards video](https://www.khanacademy.org/khan-for-educators/indiacourse/xb6e0f5a42f01e035:get-started-with-khan-academy-eng/xb6e0f5a42f01e035:know-khan-academy/v/content-and-course-structure))
Cross-cutting: essentially none. A concept like "fractions" lives in
exactly one Unit; if it matters in multiple courses it's **duplicated**.
This works because Khan grades K-12 subjects where duplication maps to
grade level. No graph. Khan's UI is also widely criticized as clunky —
don't copy it ([user feedback on record in MEMORY.md]).

### freeCodeCamp — linear, project-gated
`Certification → Superblock → Block → Lesson (challenge)`. Certification =
~300 hours, 5 required projects, exam.
([contribute.freecodecamp.org](https://contribute.freecodecamp.org/curriculum-file-structure/),
[fCC news](https://www.freecodecamp.org/news/freecodecamps-new-coding-curriculum-is-now-live-with-1400-coding-lessons-and-6-developer-certifications-you-can-earn/))
Pure hierarchy, no tags, no graph. The "certification" tier is the
category layer — it's what groups multiple courses under a theme (e.g.,
"Front End Libraries"). Cross-cutting content (HTML basics needed for
three certs) is duplicated across certs.

### Notion — relations + tags + views over a database
Notion has no hierarchy at all. Content lives in databases; structure is
produced by (1) `multi-select` properties that act as free tags, (2)
`relation` properties that join one database to another, (3) **views**
(table / board / gallery / timeline) that re-render the same rows through
different lenses.
([Notion Help — intro to databases](https://www.notion.com/help/intro-to-databases),
[Notion VIP — relations & rollups](https://www.notion.vip/insights/the-power-of-relations-and-rollups))
Cross-cutting is native — a page in a `Topics` DB can `relation` into
`Tracks`, `Projects`, and `Library` DBs at once, and a `rollup` surfaces
counts back. No graph view. The mental model: data is flat; structure is
a query.

### Obsidian — folders optional, tags + wikilinks primary, graph native
A note can sit in one folder but carry any number of `#tags` and
`[[wikilinks]]`. The Graph View is a first-class panel where nodes = notes
and edges = links; filter-by-tag isolates clusters.
([Obsidian Forum — folders vs linking vs tags](https://forum.obsidian.md/t/folders-vs-linking-vs-tags-the-definitive-guide-extremely-short-read-this/78468),
[Obsidian Forum — structure notes](https://forum.obsidian.md/t/how-to-structure-notes-categories-tags-and-folders/103125))
Consensus among power users is **folders for macro, tags for micro** —
folders give you a filesystem-safe home, tags make the note discoverable
through as many lenses as you care to define. Graph view pays off only
when you've actually linked things; a tag-only vault produces a clustered
but sparsely-edged graph.

### Bear / Craft / Logseq / Roam — tags and backlinks scale to graph
Logseq and Roam are outliners where `[[page]]` and `#tag` are the same
primitive — every mention is a backlink, and every page has an automatic
"Linked References" section. The graph view shows every block's embed
count; larger nodes = more inbound references.
([Logseq Community Hub — onboarding](https://hub.logseq.com/getting-started/uQdEHALJo7RWnDLLLP7uux/onboarding-learn-the-fundamentals-of-logseq-in-70-minutes/iPUPLPx7dZgPuASHtqNu2m),
[Nodus Labs — backlinks to network graph](https://support.noduslabs.com/hc/en-us/articles/6829955215634-How-Are-Backlinks-from-Roam-Research-Obsidian-Logseq-Converted-into-a-Network-Graph))
Bear uses nested `#parent/child` tags as its **sole** hierarchy — no
folders at all; the tag tree is the sidebar. Craft leans folders-first
but exposes cross-links.

The lesson: **a graph has substance only if every content item has at
least one outbound link**. If we want a graph future, we need to start
logging link edges _now_, even before a viewer exists.

### MDN — categories + topic tags, both required
Every article needs at minimum a `category` tag (reference/guide/tutorial/
sample) _and_ a `topic` tag (which API/tech it's about).
([MDN Tagging Standards](http://www.devdoc.net/web/developer.mozilla.org/en-US/docs/Project:MDN/Contributing/Tagging_standards.html))
Category drives the shape of the landing page (reference tables vs
tutorial flow); topic drives cross-page search + related-content widgets.
Two orthogonal axes, both taxonomical, both required. No graph view —
navigation is still a tree per product area.

### Wikipedia — categories are many-to-many, redirects multiply coverage
An article can belong to any number of categories; each category can have
multiple parent categories; redirects can themselves be categorized so the
same page surfaces under an alternate taxonomy without duplication.
([Wikipedia:Categorization](https://en.wikipedia.org/wiki/Wikipedia:Categorization_and_subcategories),
[Wikipedia:Categorizing redirects](https://en.wikipedia.org/wiki/Wikipedia:Categorizing_redirects))
The category graph is a DAG, not a tree. There is no visual graph, but
"What links here" plus the category tree give you the same information.
Infoboxes act as structured metadata (Notion-style properties) alongside
the free-form prose.

---

## Part 2 — The five taxonomy models, ranked against our constraints

User constraints (locked): 4 tabs, Linear-minimal, very little info at
once, tags-over-folders sensibility, eventual graph.

| Model | Example | Multi-parent? | Graph-ready? | Linear-minimal fit | Fit for us |
|---|---|---|---|---|---|
| **Pure hierarchy** | Khan, fCC | No (duplicate) | No | Good | Weak — we already have it and the user is asking to move past it |
| **Flat + faceted** | Today's Library | No (facets are filters, not parents) | No | Great | OK for Library; doesn't solve catalog grouping |
| **Hierarchy + tags** | Coursera, MDN | Tags yes, parent still single | Weak (tags aren't edges) | Good | Solid — minimal change from today |
| **Tags-first** | Obsidian, Bear | Yes (tag = multi-parent) | Good | Good if tag tree is disciplined | **Strong** — matches user's stated sensibility |
| **Graph** | Roam, Logseq | Everything is an edge | Native | Hard — graphs are dense by nature | Premature; good as a _view_ over tags later |

The distilled recommendation: **tags-first for relationships, retain a
light hierarchy (Category → Track) as the landing-page scaffold**. This is
the Obsidian pattern (folders for macro, tags for micro) applied to a
learning catalog.

---

## Part 3 — Proposed model for aiUniversity

### 3.1 Three-layer content spine, one tag cloud

```
Category   (new — "Foundations", "Building with AI", "Generative Media", "AI at Work")
   │
   ├── Track          (existing — "Prompt Engineering", "Agents & Tool Use", ...)
   │     └── Topic    (existing — "Writing Clear Prompts", ...)
   │           └── Lesson / Quiz  (existing)
   │
   └── Library items  (existing — docs, tools, reads, videos)

Tags: orthogonal, many-per-thing, shared vocabulary across Topics AND Library items.
```

**Category** is a thin new layer _above_ Track. It groups tracks thematically
on the Learn landing page. Four to six categories max; they should read
like bookshelves, not like a syllabus. Draft set grounded in today's
tracks:

| Category | Tracks today that roll up |
|---|---|
| Foundations | `literacy`, `foundations`, `prompt-eng` |
| Building with AI | `agents`, `frontend-ai`, `vibe-coding` |
| AI at Work | `office-ai` |
| Generative Media | `generative-media` |

Category is **single-parent per track** (a track lives in exactly one
category). That's intentional — the hierarchy exists to give the landing
page structure, not to express every relationship. Multi-parent relations
happen at the tag layer.

### 3.2 Tags are the cross-cutting layer — and they span Library too

Today `LibraryItem.tags: string[]` exists but `Topic` has no tag field.
Add `Topic.tags: string[]` so the same tag vocabulary covers both. Examples
the current seed data already implies:

- `#claude-code` — hits `t.claude-code-basics`, `doc.claude-code`, tool
  entries like `i.claude-code`.
- `#prompting` — hits `t.clear-prompts`, `t.few-shot`, `t.prompt-basics`,
  any Library read on prompting technique.
- `#ethics` — cross-cuts `literacy` and parts of `office-ai`.
- `#frontend` — spans `frontend-ai` topics and Library videos on streaming
  UIs.

A single topic can carry 3-5 tags. The "Foundations + Ethics" dual-membership
case becomes `{ category: 'Foundations', tags: ['ethics', 'safety'] }`.
No duplication, no second parent.

### 3.3 Link Library items to Topics (the missing edge)

Right now `Learn → Claude Code Basics` and `Library → Claude Code doc` have
no data connection. Add an optional `LibraryItem.relatedTopicIds: ID[]` and
(symmetrically) `Topic.relatedLibraryIds: ID[]` — or pick one direction and
derive the other at query time. One direction is cheaper; two directions
make graph rendering trivial later.

Concrete UI payoff: on a Topic page, a small "Further reading" list of
linked Library items; on a Library item page, "Relates to topics" with
chips. Zero new pages.

### 3.4 Graph-future wiring — what to log _now_ even without a viewer

A graph view is useful only if nodes have edges. If we ship only hierarchy
+ audience tags, the future graph will be boring (only category/track edges).
To prepare:

1. **Tags as edges.** Two items sharing a tag = an implicit edge. Cheap to
   materialize later.
2. **`relatedTopicIds` / `relatedLibraryIds`.** Explicit typed edges —
   much stronger graph signal than shared tags.
3. **`prereqTopicIds`** already exists — it's a directed edge. Keep adding
   them as topics land; don't let this field rot.
4. **Project → Topic edges.** `Project.gapTopicIds` is already a typed
   edge. Project nodes in a future graph come for free.

Net: four edge types (tag, related, prereq, project-gap), all already
expressible in existing or trivially-extended types. No viewer needed
today; the data will already be there when the graph lands.

### 3.5 Minimal UI implications

**Learn page:**
- Today: flat row of 8 tracks, soft-split by pathway.
- Proposed: Category heading rows (e.g., "Foundations" sub-label, then
  its tracks beneath). Categories are non-collapsing on desktop, collapsible
  on mobile. The pathway split still applies _within_ each category —
  "For you" buckets first, "Everything else" disclosure below, per
  section.
- This is one new heading level — ~20 lines of JSX — and it makes the 8
  tracks scan as 4 clusters.

**Library page:**
- Today: kind-facet + audience soft-split. Tags render but aren't
  searchable as a facet.
- Proposed: add a **Tag facet** (chip row that shows top ~8 tags by
  frequency, "more" opens a popover). Facet state is `kind` AND `tag`;
  chips are toggleable AND'd filters. Keep search + pathway split
  untouched.
- Add **Category badge** to Library rows where `relatedTopicIds` ties the
  item into a Track — renders as a quiet chip that links to the Track.
  This is the "Library → Claude Code doc connects to Learn → Claude Code
  Basics topic" bridge.

**Topic page:**
- Add a "Further reading" band pulling `relatedLibraryIds`. 3-5 inline
  links; no new route.

**No new tabs.** All changes live inside Learn / Library. The 4-tab
constraint holds.

### 3.6 Data-shape diff summary

```ts
// types.ts — all additive, all optional:
export interface Category {
  id: ID               // 'cat.foundations' etc.
  title: string
  summary: string
  order: number
}

export interface Track {
  // ... existing fields
  categoryId?: ID      // new; undefined tracks render under an "Other" bucket
}

export interface Topic {
  // ... existing fields
  tags?: string[]              // new — shared vocab with LibraryItem.tags
  relatedLibraryIds?: ID[]     // new — Topic → Library edges
}

export interface LibraryItem {
  // ... existing fields
  relatedTopicIds?: ID[]       // new — Library → Topic edges
}
```

Notice what's _not_ changing: `Topic.trackId` stays single-parent,
`Track` stays without tags, `Audience[]` stays as-is. The Category layer
is where the new single-parent edge lives; tags are where multi-membership
lives.

---

## Part 4 — Do now (design) vs wait for DB

User said: "we're probably gonna have to do research on that structure, but
not gather all the data until the databases set up." Here's the split:

**Can ship today (pre-DB, Dexie-safe):**
- Define the `Category` set in `seed.ts` — four categories, assign
  `categoryId` to existing tracks.
- Add `Category` heading rows to `Learn.tsx`.
- Add optional `tags?: string[]` to `Topic` and backfill a shared
  vocabulary on the ~30 existing topics. Cheap — maybe 3 tags per topic.
- Expose the tag facet on `Library.tsx` (chip row, AND'd with kind).
- Hand-author `relatedTopicIds` / `relatedLibraryIds` on the ~10 pairs
  that are obvious today (`t.claude-code-basics` ↔ `doc.claude-code`,
  `t.prompt-basics` ↔ any prompting read, etc.). Keep it opportunistic —
  don't try to be exhaustive.
- Ship a "Further reading" band on the Topic page.

**Wait for DB (post-migration):**
- **Don't** author the full topic×tag matrix by hand at scale. Past ~50
  topics the maintenance cost outruns the Dexie seed pattern. Tag
  management wants an admin UI, which wants a real DB.
- **Don't** build the graph viewer. It has low ROI until there are
  >100 nodes and a typical user drills in more than once per session.
  Also, it's the "electrified-circuit skill-map" the user explicitly
  deferred.
- **Don't** let users author tags yet. Runtime tag creation needs
  normalization (typo dedupe, rename propagation, synonym lookup) that's
  also a DB-layer concern.
- **Don't** build a category editor / admin UI. Categories are few and
  slow-moving; they can live as seed data forever, and when an admin UI
  lands it inherits the category schema for free.

---

## If you ship one structural change, ship this

1. **Add a Category layer above Track** — four thematic buckets in
   `seed.ts`, one new heading level in `Learn.tsx`. Makes the catalog
   scan as clusters instead of a flat row of eight, with near-zero
   schema cost and nothing to maintain at scale.
2. **Give `Topic` a `tags[]` field and share vocabulary with
   `LibraryItem.tags`.** Tags become the one place cross-cutting concerns
   live, and the Library tag-facet starts doing useful work immediately.
3. **Hand-author the first ~10 `relatedTopicIds` / `relatedLibraryIds`
   pairs** — the explicit edges that will make a future graph view
   non-boring and that power a "Further reading" band on Topic pages
   today. Edges are the hardest thing to backfill later; start logging
   now even without a viewer.

---

## Sources

- [Coursera Help — Specializations](https://www.coursera.support/s/article/208280296-Specializations)
- [Class Central — What are Coursera Specializations](https://www.classcentral.com/help/what-are-coursera-specializations)
- [Khan Academy Help — Course and Unit Mastery](https://support.khanacademy.org/hc/en-us/articles/115002552631-What-are-Course-and-Unit-Mastery)
- [Khan Academy — content & standards video](https://www.khanacademy.org/khan-for-educators/indiacourse/xb6e0f5a42f01e035:get-started-with-khan-academy-eng/xb6e0f5a42f01e035:know-khan-academy/v/content-and-course-structure)
- [freeCodeCamp — Curriculum File Structure](https://contribute.freecodecamp.org/curriculum-file-structure/)
- [freeCodeCamp — new coding curriculum](https://www.freecodecamp.org/news/freecodecamps-new-coding-curriculum-is-now-live-with-1400-coding-lessons-and-6-developer-certifications-you-can-earn/)
- [Notion Help — intro to databases](https://www.notion.com/help/intro-to-databases)
- [Notion VIP — the power of relations and rollups](https://www.notion.vip/insights/the-power-of-relations-and-rollups)
- [Obsidian Forum — folders vs linking vs tags, the definitive guide](https://forum.obsidian.md/t/folders-vs-linking-vs-tags-the-definitive-guide-extremely-short-read-this/78468)
- [Obsidian Forum — how to structure notes](https://forum.obsidian.md/t/how-to-structure-notes-categories-tags-and-folders/103125)
- [Logseq Community Hub — onboarding](https://hub.logseq.com/getting-started/uQdEHALJo7RWnDLLLP7uux/onboarding-learn-the-fundamentals-of-logseq-in-70-minutes/iPUPLPx7dZgPuASHtqNu2m)
- [Nodus Labs — how backlinks convert to a network graph](https://support.noduslabs.com/hc/en-us/articles/6829955215634-How-Are-Backlinks-from-Roam-Research-Obsidian-Logseq-Converted-into-a-Network-Graph)
- [MDN — tagging standards](http://www.devdoc.net/web/developer.mozilla.org/en-US/docs/Project:MDN/Contributing/Tagging_standards.html)
- [Wikipedia:Categorization](https://en.wikipedia.org/wiki/Wikipedia:Categorization_and_subcategories)
- [Wikipedia:Categorizing redirects](https://en.wikipedia.org/wiki/Wikipedia:Categorizing_redirects)
