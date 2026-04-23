import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageHeader, Section } from '../ui'
import { Markdown } from '../ui/Markdown'

/** Colophon — tech stack + build notes + (eventually) maker bio.
 *  Not on the navbar; reached from the footer link on every page.
 *  Named after the classic print convention: the page that says how
 *  the book was made and who made it. */
export function Colophon() {
  return (
    <div className="page">
      <Link to="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 'var(--text-sm)', color: 'var(--ink-3)', marginBottom: 'var(--space-4)',
      }}>
        <ArrowLeft size={14} /> Back
      </Link>

      <PageHeader
        eyebrow="Colophon"
        title="How this was built"
        subtitle="The tech, the approach, the person. The kind of page people who care about how things are made will click."
      />

      <Section title="The app">
        <Markdown text={`
**aiUniversity** is a solo-built learning app — a place to study AI and ship small projects alongside the learning. The live deploy is a read-only snapshot of the maker's own path through the material; it's not a chatbot, there's no live model behind it.

## Stack

- **Frontend:** Vite + React + TypeScript (no SSR)
- **Routing:** React Router
- **Local data:** Dexie (IndexedDB) behind a single repository module — swap-ready for a hosted backend
- **State:** Zustand
- **Motion:** Framer Motion
- **Icons:** lucide-react
- **Code highlighting:** highlight.js (Library notes)
- **Styling:** CSS Modules + CSS custom properties. Single-knob accent system: change \`--accent-base\` / \`--danger-base\` / \`--mastery-base\` in \`src/styles/tokens.css\` and the whole palette re-tints.
- **Hosting:** GitHub Pages, auto-deploy on every push to \`main\`

## Approach

Built vibe-coded with Claude Code in the terminal — plan → implement → observe → commit. Every feature lands as its own milestone chunk; the commit log is the design history. The bigger decisions have research docs in \`revamp/docs/\` (taxonomy, pathway coverage, dashboard patterns). The journey itself is logged in \`learning-journal.md\` + \`troubleshooting-log.md\` so the stumbles stay visible, not hidden.

## What this isn't (yet)

- No runtime Claude API — content is authored statically and committed. A separate Claude API integration project is on the roadmap; it's deliberately NOT a step inside this build.
- No accounts / auth — everything persists locally. DB migration to Supabase (with auth + TOTP) is planned; users have been warned progress won't migrate.
- No user-to-user features. Solo use today; read-only friend-view is future work.
`.trim()} />
      </Section>

      <Section title="The maker">
        <Markdown text={`
_Bio goes here — short personal note, what I'm trying to learn, why this app exists at all. Leaving it blank for now; I'd rather write it when I've earned the words._
`.trim()} />
      </Section>

      <Section title="Editorial policy">
        <Markdown text={`
How content here is made and cited, stated out loud.

## Authorship

Lessons are **original synthesis** — text written for this app, informed by the sources listed in each lesson's Sources section. They are not copies of external material with a link dropped at the bottom. When a specific phrase comes from a specific source, it's quoted inline (\`>\` block with a \`— Source\` attribution line) so the quoted portion is visible and credited.

## AI-assisted authoring

Every lesson carries an explicit **AI-assisted authoring** disclosure. Lessons are drafted with Claude and reviewed by a human before they ship. Specifics (numbers, names, citations, API shapes) can drift; readers are directed to verify against the Sources section for anything they'll act on.

## Citation practice

- **All external sources** consulted to write a lesson appear in a \`## Sources\` block at the bottom of that lesson.
- **Direct quotes** are kept short (a sentence or two), clearly visible in \`>\` blocks, with inline attribution.
- **Paraphrased ideas** are cited via the footer Sources list, without inline markers (those are visually distracting).
- **External links** don't appear in the prose — only in the Sources section and the Library.

## Scope + purpose

Non-commercial, educational. The app is a solo-built learning space, free to use, with no ads, no tracking, no paywall. If that changes — commercial use, paid tiers, redistribution — the editorial approach will be reviewed first.

## Corrections

If a specific claim looks wrong, a quote looks uncredited, or a source looks misused: the quiet flag on every quiz question accepts reports, and a general feedback channel is in the roadmap. Corrections welcome; nothing here claims to be infallible.

## License-specific sources

Content under Creative Commons or other explicit licenses is attributed in the format that license requires (CC-BY-SA keeps its share-alike; CC-BY includes the exact attribution string; etc.). If a source's terms disallow reproduction even with attribution, it isn't reproduced — just cited.
`.trim()} />
      </Section>

      <Section title="Practice what we teach">
        <Markdown text={`
Every lesson in this app carries an **AI-assisted authoring** disclosure — because the literacy material teaches exactly that kind of verification, and hiding the fact that the lessons were drafted with AI would be the wrong way to teach it. The app tries to model the rules it's teaching: transparent about generation, structured like the prompting patterns it recommends, committed in small iteration loops, tested on a phone.
`.trim()} />
      </Section>
    </div>
  )
}
