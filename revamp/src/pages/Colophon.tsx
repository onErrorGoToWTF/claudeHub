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

      <Section title="Practice what we teach">
        <Markdown text={`
Every lesson in this app carries an **AI-assisted authoring** disclosure — because the literacy material teaches exactly that kind of verification, and hiding the fact that the lessons were drafted with AI would be the wrong way to teach it. The app tries to model the rules it's teaching: transparent about generation, structured like the prompting patterns it recommends, committed in small iteration loops, tested on a phone.
`.trim()} />
      </Section>
    </div>
  )
}
