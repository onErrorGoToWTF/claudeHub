/**
 * In-app bodies for tool Library items. Keyed by tool id.
 * Keeps seed.ts light and lets this file grow without cluttering the row data.
 *
 * Format follows the locked Library note template:
 *   **TL;DR** one-liner, ## sections, blockquote quotes, ## Sources at end.
 */
export const TOOL_BODIES: Record<string, string> = {
  'i.claude-code': `
**TL;DR** — Install the CLI, \`cd\` into a repo, run \`claude\`, and describe the work; Claude plans, edits files in place, and iterates — best for tasks that span multiple files.

## Install and first run

\`\`\`bash
npm install -g @anthropic-ai/claude-code
claude           # sign in on first run
cd your/repo && claude
\`\`\`

## Core idea

Claude Code is a terminal agent with long-context reasoning and tool access — it reads your files, edits them, runs commands, and verifies its work across steps. Unlike inline autocomplete, it's built for **long sessions** on real codebases, not single-prompt snippets.

## Skills

Skills (in \`.claude/skills/<name>/\`) are named capability bundles the agent invokes when the task matches. Each skill is a folder with a \`SKILL.md\` describing:

- A short \`description:\` of when to invoke.
- Scripts or rules Claude loads lazily.
- Reference docs in a co-located \`_resources/\` dir.

Skills keep the main context lean — Claude loads them only when the work calls.

## Hooks

Hooks (in \`.claude/settings.json\`) fire on events like \`PreToolUse\`, \`PostToolUse\`, \`Stop\`, \`UserPromptSubmit\`. They run shell commands. Use them to block dangerous commands, auto-format after edits, notify when the agent finishes, or inject preamble into every prompt.

## When to use

- **Use it for:** multi-file refactors, migrations, net-new features touching 5+ files.
- **Skip it for:** one-line fixes, throwaway scripts, whole-app scaffolds (a scaffolder is better).

## Keeping it on rails

- Write a \`CLAUDE.md\` at the repo root — user instructions, style rules, gotchas. Claude reads it every session.
- One task per session beats omnibus prompts.
- Review diffs. The agent is fast; you still own the code.

## Sources

- [Claude Code — product page](https://claude.com/claude-code)
- [Claude Code — docs](https://docs.claude.com/en/docs/claude-code)
- [Claude Code — hooks](https://docs.claude.com/en/docs/claude-code/hooks)
- [Claude Code — skills](https://docs.claude.com/en/docs/claude-code/skills)
`.trim(),

  'i.claude-agent-sdk': `
**TL;DR** — The Agent SDK is the library you reach for when Claude Code isn't the right shape — custom product UX, embedded agents, scheduled jobs, any app needing programmatic control over the agent loop.

## What it's for

- You want your own UX, not a terminal prompt.
- The agent lives inside a product, a backend job, a scheduled worker.
- You want tight control over tools, the context window, and error handling.

Otherwise, Claude Code is a better default — hooks, skills, MCP, and file editing without writing glue.

## Install

\`\`\`bash
# TypeScript
npm i @anthropic-ai/agent-sdk

# Python
pip install anthropic-agent-sdk
\`\`\`

## Shape of a session

Construct an \`Agent\` with:

- A **system prompt** (persona, constraints, style).
- **Tools** — typed function declarations the agent can call.
- **MCP clients** — external tool servers it can consume.
- **Options** — model, max tokens, temperature, streaming.

Then run it:

- Send a user turn.
- Receive a stream of messages: text, \`tool_use\`, \`tool_result\`.
- Tool calls execute locally; return results to the agent.
- Loop until the agent emits a final answer.

## Tools

Tools are the primary extension surface:

- A **name** (stable, identifier-style).
- An **input schema** (JSON Schema; the agent fills it).
- An **execute** function you implement.

Keep the tool surface tight. Three well-named tools beat fifteen overlapping ones.

## MCP

Instead of re-inventing tools, attach to MCP servers — GitHub, Linear, Slack, filesystems, databases. The agent calls them exactly like local tools.

## When NOT to use this SDK

- One-shot completions → use the Messages API directly.
- Building on a terminal → use Claude Code.
- Drop-in chat widget → most chat UIs already wrap Messages + tool use.

## Sources

- [Agent SDK — docs](https://docs.claude.com/en/docs/agent-sdk)
- [Agent SDK — TypeScript](https://docs.claude.com/en/docs/agent-sdk/typescript)
- [Agent SDK — Python](https://docs.claude.com/en/docs/agent-sdk/python)
- [MCP — Model Context Protocol](https://modelcontextprotocol.io/)
`.trim(),

  'i.framer-motion': `
**TL;DR** — Framer Motion (now Motion) is a React animation library with three core tools — \`motion\` components for declarative animation, \`AnimatePresence\` for mount/exit, and \`layout\` props for automatic layout transitions — and it composes with React rendering instead of fighting it.

## The three tools that carry most of the weight

- **\`<motion.div>\`** — drop-in replacement for any HTML/SVG element. Accepts \`initial\`, \`animate\`, \`exit\`, \`whileHover\`, \`whileTap\`, \`transition\`. Declarative: describe states, not tweens.
- **\`<AnimatePresence>\`** — wraps a tree whose children may unmount. Children with an \`exit\` prop get their exit animation before being removed from the DOM.
- **\`layout\` prop** — when a \`motion\` element's size/position changes across re-renders, Framer interpolates automatically using FLIP. Pairs with \`layoutId\` for shared-element transitions.

## Easing

Framer accepts standard CSS curves as tuples. The one this codebase uses everywhere:

\`\`\`tsx
transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
\`\`\`

That's our \`--ease-premium\`. Compose transitions per-property when durations diverge.

## Reduced motion

Wrap your app in \`MotionConfig\`:

\`\`\`tsx
<MotionConfig reducedMotion="user">{app}</MotionConfig>
\`\`\`

All descendant \`motion\` elements then skip transform/scale animations and keep opacity/color fades — matching Apple's reduced-motion levels.

## Gotchas

- **Never animate \`width\`/\`height\` directly** — layout-triggering. Use \`layout\` + scale, or rely on grid transitions.
- **\`key\` changes remount children.** For exit animation, parent needs \`AnimatePresence mode="wait"\`.
- **Don't stack a \`transform\` with \`layout\` on the same element.** One animation source of truth per element.

## Sources

- [Motion — main docs](https://motion.dev/)
- [Motion — animation](https://motion.dev/docs/react-animation)
- [Motion — AnimatePresence](https://motion.dev/docs/react-animate-presence)
- [Motion — layout animations](https://motion.dev/docs/react-layout-animations)
`.trim(),

  'i.vite': `
**TL;DR** — Vite is a zero-config frontend build tool that runs your app instantly in dev (native ES modules, no bundling) and ships a tiny, tree-shaken production build with Rollup — it's the reason this revamp has no \`webpack.config.js\`.

## Dev vs. build

- **Dev server** serves raw ES modules over HTTP. No bundle. Changes hot-reload in milliseconds because the browser re-fetches only what changed.
- **Production build** uses Rollup under the hood for aggressive tree-shaking, code-splitting, and asset hashing. Output lands in \`dist/\`.

## Scaffold a project

\`\`\`bash
npm create vite@latest my-app -- --template react-ts
cd my-app && npm install && npm run dev
\`\`\`

Templates: \`vanilla\`, \`react\`, \`react-ts\`, \`vue\`, \`svelte\`, \`preact\`, \`lit\`, \`solid\`, plus \`-ts\` variants.

## Config essentials

\`\`\`ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/my-app/' : '/',  // subpath for GH Pages
}))
\`\`\`

The \`base\` option is what makes \`/claudeHub/\` work on GitHub Pages. Locally it stays \`/\`.

## Env vars

Any variable prefixed \`VITE_\` is exposed to client code via \`import.meta.env.VITE_FOO\`. Anything without the prefix stays server-only.

## Plugin model

Plugins are thin wrappers around Rollup hooks plus Vite-specific dev-server hooks. Most integrations (React, Vue, Tailwind, MDX) ship as a single \`@vitejs/plugin-*\` or \`vite-plugin-*\`.

## Gotchas

- **Don't import Node built-ins** from client code — they're stripped. Use platform-appropriate APIs.
- **Assets referenced in CSS via \`url(...)\`** are fine. Assets imported in JS (\`import foo from './foo.png'\`) give you a hashed URL back.
- **\`public/\` files** are copied verbatim; reference them with absolute paths that include \`base\` — e.g. \`\${import.meta.env.BASE_URL}favicon.svg\`.

## Sources

- [Vite — docs](https://vite.dev/)
- [Vite — guide](https://vite.dev/guide/)
- [Vite — config reference](https://vite.dev/config/)
- [vitejs/vite — GitHub](https://github.com/vitejs/vite)
`.trim(),

  'i.react': `
**TL;DR** — React is a UI library that makes components the unit of reuse; write pure functions of props → JSX, compose them, and React re-renders what changed. Everything else (state, effects, context) exists to keep that model honest.

## The mental model

- **Components are pure functions.** Same props + same state → same output.
- **Rendering is cheap; side effects aren't.** Keep them in \`useEffect\` or event handlers.
- **State is local by default.** Lift only when two components need to share it.

## Core hooks (the essentials)

- \`useState(initial)\` — local state.
- \`useEffect(fn, deps)\` — run \`fn\` after render whenever \`deps\` change. Return a cleanup function for teardown.
- \`useMemo(fn, deps)\` — memoize an expensive computation.
- \`useCallback(fn, deps)\` — memoize a function reference (useful when passing to memoized children).
- \`useRef(initial)\` — a mutable box that survives renders without causing one.
- \`useContext(Context)\` — read a context value without prop-drilling.

## When to memoize (and when not)

- **Memoize when** a child is wrapped in \`memo()\` and would otherwise re-render needlessly; when a computation is genuinely expensive.
- **Don't memoize** when the function/object is cheap to recreate — React's renderer is fast; \`useMemo\` has its own cost.

## Effects: the trap

An effect reading state it doesn't list in \`deps\` captures a stale closure. A common source of bugs.

\`\`\`tsx
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000)
  return () => clearInterval(id)
  // Wrong: count is captured from the first render and stays 0.
}, [])

useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000)
  return () => clearInterval(id)
  // Right: functional setState reads the latest value.
}, [])
\`\`\`

## Server vs. client

Modern React (via frameworks like Next.js, Remix) splits components into **server** (runs on the server, streams HTML) and **client** (runs in the browser, has state + effects). Vanilla Vite apps are client-only.

## Sources

- [React — official docs](https://react.dev/)
- [React — learn](https://react.dev/learn)
- [React — reference](https://react.dev/reference/react)
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
`.trim(),

  'i.supabase': `
**TL;DR** — Supabase is a Postgres-first backend-as-a-service — real database, auth, storage, realtime, and edge functions — with a free tier large enough to ship real products on; the open-source alternative to Firebase that speaks SQL.

## What's in the box

- **Postgres** — a full Postgres database with \`psql\` access, extensions (\`pgvector\`, \`pg_graphql\`, etc.), and Row-Level Security.
- **Auth** — email + OAuth providers, magic links, MFA, session JWTs.
- **Storage** — S3-compatible object storage, access-controlled by Postgres policies.
- **Realtime** — listen to Postgres changes over websockets.
- **Edge Functions** — Deno-based serverless functions on Supabase's edge.
- **Vector search** — \`pgvector\` built in; use any embedding model.

## Three ways to talk to it

1. **\`@supabase/supabase-js\`** — typed client for browser + server.
2. **REST** — auto-generated from your schema (PostgREST).
3. **Direct Postgres** — connection strings for server-side pooling (Prisma, Drizzle, raw SQL).

## Auth in one snippet

\`\`\`ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

await supabase.auth.signInWithPassword({ email, password })
const { data: { user } } = await supabase.auth.getUser()
\`\`\`

## Row-Level Security (the thing to learn first)

RLS is Postgres-native row-scoped access. Default-deny every table, then add policies like "user can read their own rows":

\`\`\`sql
alter table notes enable row level security;

create policy "own notes" on notes
for select using (auth.uid() = user_id);
\`\`\`

With RLS on, the anon key is safe to put in your client — Postgres enforces access.

## When Supabase fits

- Anything needing a real database (not just K/V).
- Products that might outgrow Firebase limits.
- Vector/RAG apps (pgvector).
- Apps where you want to leave without a migration nightmare — you own the Postgres.

## When to pick something else

- **Firebase** if you want Google's ecosystem (FCM, Analytics) wired up.
- **PlanetScale / Neon** for a pure Postgres/MySQL with serverless scaling; BYO auth/storage.
- **Dexie + local-first** (like this app) when the data is genuinely single-user and offline-first.

## Sources

- [Supabase — main site](https://supabase.com/)
- [Supabase — docs](https://supabase.com/docs)
- [Supabase — auth](https://supabase.com/docs/guides/auth)
- [Supabase — Row-Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
`.trim(),

  'i.v0': `
**TL;DR** — v0 is Vercel's prompt-to-React-component generator — describe a UI, get JSX built on Shadcn UI + Tailwind + TypeScript, iterate with follow-up prompts, and deploy to Vercel in one click.

## The loop

1. Describe the component or screen ("a dashboard card with a title, a trend arrow, and a sparkline").
2. v0 generates three variants.
3. Click one, then iterate conversationally ("make the sparkline green", "add a dropdown for the time range").
4. Copy the code into your repo, or click **Deploy** for an instant Vercel URL.

## What it generates

- React (or Vue in beta) components.
- Styled with Tailwind; uses **Shadcn UI** primitives under the hood.
- TypeScript by default.
- Clean, readable code — not minified black-box output. You can read and edit it.

## When to use it

- Starting a new component and the "empty file" is blocking you.
- Visual exploration — try five layouts in ten minutes.
- Building out an internal tool UI where pixel-fidelity matters less than ship-speed.

## When not to use it

- You need to match an existing design system precisely — v0 will default to Shadcn's look unless explicitly steered.
- You want deep custom animations or non-standard interactions — hand-written usually wins.
- You're optimizing bundle size — v0 pulls in Shadcn's full component kit generously.

## Pricing

Free tier to explore. Premium unlocks higher generation limits + private generations.

## Pairs with

- **Shadcn UI** — the component primitives v0 speaks natively.
- **Cursor** or **Claude Code** — for everything v0 doesn't generate (logic, data fetching, state).
- **Vercel** — one-click deploys straight from the v0 canvas.

## Sources

- [v0 — main site](https://v0.app/)
- [v0 — docs](https://v0.app/docs)
- [Shadcn UI](https://ui.shadcn.com/)
- [Vercel — about v0](https://vercel.com/blog/announcing-v0-generative-ui)
`.trim(),

  'i.n8n': `
**TL;DR** — n8n is a self-hostable visual workflow runner — drag nodes, connect them, and you've got a durable automation; ships with 70+ AI nodes (LLMs, embeddings, vector stores) and persistent agent memory for building stateful assistants without writing backend glue.

## The mental model

A **workflow** is a directed graph of nodes:

- A **trigger node** starts a run — webhook, schedule, manual, email, etc.
- **Action nodes** transform or act on data — HTTP requests, DB queries, LLM calls, file ops.
- **Logic nodes** route and branch — \`If\`, \`Switch\`, \`Merge\`, \`Loop\`.

Every execution is stored — you can inspect inputs/outputs at each node, replay runs, and debug visually.

## AI-specific nodes

- \`AI Agent\` — a tool-using Claude/GPT/Gemini node with memory backends.
- \`Vector Store\` — Pinecone, Qdrant, Postgres/pgvector.
- \`LLM Chain\` — classic LangChain-style retrieval + generation.
- \`Tool\` nodes — let the agent call any other n8n action as a tool.

## Self-host in one command

\`\`\`bash
docker run -d --name n8n \\
  -p 5678:5678 \\
  -v n8n_data:/home/node/.n8n \\
  n8nio/n8n
\`\`\`

Open \`http://localhost:5678\`, create an account, start dragging.

## When n8n fits

- You want durable workflows with inspection, retry, and scheduling out of the box.
- You're gluing 3+ services (GitHub → Slack → Claude → DB) and want version control on the wiring.
- You want visual handoff — hand a workflow to a non-coder and they can read it.

## When to pick something else

- **Zapier / Make** — you'd rather not self-host and your workflows are simple.
- **Custom code** — your workflow is one-off, isolated, or needs latency below n8n's overhead.
- **LangGraph / direct SDK** — you want code-first agent graphs with full programmatic control.

## Pricing

Self-host is free (fair-code license). Cloud tier starts at ~$20/mo for hosted + team features.

## Sources

- [n8n — main site](https://n8n.io/)
- [n8n — docs](https://docs.n8n.io/)
- [n8n — AI nodes](https://docs.n8n.io/advanced-ai/)
- [n8n — self-hosting](https://docs.n8n.io/hosting/)
`.trim(),

  'i.claude-opus': `
**TL;DR** — Claude Opus 4.7 is the most capable model in Anthropic's 4.x family — built for deep, long-context reasoning and multi-step agentic work; pick it when quality matters more than speed or cost.

## What it's good at

- **Long-context reasoning.** Holds and reasons over large codebases, long documents, sprawling research material.
- **Agentic work.** Multi-turn tool use without losing the plot. The backbone of Claude Code's longest sessions.
- **Judgment-heavy writing.** Strategy docs, design critiques, sensitive comms.
- **Code across files.** Refactors, migrations, greenfield features that span many files.

## When to reach for something else

- **Sonnet 4.6** — most everyday Claude work. 80–90% of Opus' quality at a fraction of the cost / latency.
- **Haiku 4.5** — classification, routing, summarization. Low-stakes high-volume tasks.

## Context window

\`claude-opus-4-7\` ships with a 1M token context window variant (\`claude-opus-4-7[1m]\`). The full 1M is expensive — default to the 200K version unless you actually need the headroom.

## Pricing (subscription-side)

- **Pro** ($20/mo) — limited Opus via Claude.ai.
- **Max 5×** ($100/mo) — 5× higher Opus usage.
- **Max 20×** ($200/mo) — 20× Pro; heaviest Opus use.

On the API: Opus is priced per-token at a premium vs. Sonnet. Use prompt caching to soften the cost on stable system prompts / context docs.

## Sources

- [Anthropic — models overview](https://www.anthropic.com/claude)
- [Claude — model card](https://docs.claude.com/en/docs/about-claude/models)
- [Anthropic — pricing](https://www.anthropic.com/pricing)
- [Prompt caching](https://docs.claude.com/en/docs/build-with-claude/prompt-caching)
`.trim(),

  'i.claude-sonnet': `
**TL;DR** — Claude Sonnet 4.6 is the default workhorse — fast, cheap, and smart enough for ~90% of real work; reserve Opus for the genuinely hard stuff and Haiku for cheap bulk.

## Why it's the default

- **Price / latency / quality** hit the right spot. Faster than Opus, cheaper, and still strong across reasoning, coding, and writing.
- **Long context without Opus pricing.** 200K token window for most use cases.
- **Production-friendly.** Teams running Claude in products usually default to Sonnet and only escalate specific calls to Opus.

## When to escalate to Opus

- Judgment calls where a subtle miss is expensive (strategy memos, legal nuance, security-sensitive decisions).
- Multi-step agentic sessions where drift compounds.
- Tasks where correctness on the first try saves more than the price delta.

## When to de-escalate to Haiku 4.5

- Classification, routing, tagging, summarization.
- Wrapping or reformatting existing text.
- Any high-volume call where latency or cost dominates.

## Model ID

API: \`claude-sonnet-4-6\`. On Claude.ai: selectable in the model picker on paid plans; the free tier also grants limited Sonnet access.

## Pairing pattern

A common stack: **Haiku routes → Sonnet handles → Opus escalates.** Let Haiku classify the incoming query, Sonnet does the work, and only the hardest cases bubble up to Opus.

## Sources

- [Claude — model card](https://docs.claude.com/en/docs/about-claude/models)
- [Anthropic — pricing](https://www.anthropic.com/pricing)
- [Build with Claude — choosing a model](https://docs.claude.com/en/docs/build-with-claude/models)
`.trim(),

  'i.vercel': `
**TL;DR** — Vercel is opinionated hosting for modern web apps — \`git push\` and it builds, deploys, and gives you preview URLs per branch; it's Next.js's home but handles most static and SSR stacks gracefully.

## The core loop

1. Connect a GitHub/GitLab/Bitbucket repo.
2. Every push to the main branch → production deploy.
3. Every pull request → an isolated **preview deployment** at its own URL.
4. Comment the preview URL on the PR; share with anyone.

## What you get for free

- **HTTPS + custom domains** — one click, automatic certs.
- **Edge network** — assets served from the nearest region.
- **Image optimization** — \`next/image\` or equivalent.
- **Serverless / Edge functions** — run TypeScript or Go at the edge without managing servers.
- **Analytics** — basic web analytics in the free tier.

## When Vercel fits best

- Next.js apps (native home).
- Static SPAs (Vite, Astro, SvelteKit) — works fine; you're not really using the SSR side.
- Apps with a light serverless backend (auth, webhooks, DB queries).

## When to pick something else

- **GitHub Pages** — pure static, zero build complexity, no server runtime needed.
- **Cloudflare Pages / Workers** — lower egress cost at scale, better edge compute model for some workloads.
- **A VPS** — long-running processes, WebSockets at scale, anything with state that doesn't fit the serverless shape.

## Pricing sharp edges

The free (Hobby) tier is generous but has **bandwidth + function invocation limits**. A viral moment on Hobby can rate-limit you. Pro starts at $20/mo/seat and raises all the limits; scrutinize usage if you get popular.

## Sources

- [Vercel — main site](https://vercel.com/)
- [Vercel — docs](https://vercel.com/docs)
- [Vercel — pricing](https://vercel.com/pricing)
- [Vercel — limits](https://vercel.com/docs/limits/overview)
`.trim(),

  'i.vscode': `
**TL;DR** — VS Code is a free, cross-platform editor built on Electron that's become the default for web dev through sheer plugin gravity; pair it with Claude Code or Cursor and it's the workspace most AI-era coding happens in.

## Why it stuck

- **Fast, hackable, multi-language.** TypeScript support is first-party; everything else lands via extensions.
- **Built-in terminal, Git, debug, task runner.** No context-switching.
- **Settings Sync** — log in with GitHub; every machine has your keybinds, extensions, themes.
- **Remote dev** via SSH, Containers, or WSL — your VS Code UI is local, the project files + tools run somewhere else.

## The one settings file that matters

\`settings.json\` (user and workspace scopes) controls everything. Start minimal:

\`\`\`json
{
  "editor.fontFamily": "JetBrains Mono, Menlo, monospace",
  "editor.fontSize": 13,
  "editor.tabSize": 2,
  "editor.formatOnSave": true,
  "files.trimTrailingWhitespace": true,
  "workbench.colorTheme": "Default Light+"
}
\`\`\`

Command Palette → \`Preferences: Open Settings (JSON)\`.

## Extensions worth having

- **Prettier** — auto-format JS/TS/CSS on save.
- **ESLint** — inline lint errors.
- **GitLens** — per-line blame + commit history in the editor.
- **Error Lens** — render errors inline, not just in the Problems panel.
- **Tailwind CSS IntelliSense** — if you use Tailwind.
- **Path Intellisense** — autocomplete \`import\` paths.

## Keyboard you'll actually use

- \`Cmd/Ctrl+P\` — fuzzy file open.
- \`Cmd/Ctrl+Shift+P\` — Command Palette (all actions).
- \`Cmd/Ctrl+D\` — add next match to selection.
- \`Cmd/Ctrl+Shift+F\` — search across project.
- \`F2\` — rename symbol everywhere.
- \`Option/Alt+↑/↓\` — move line up/down.

## Sources

- [VS Code — main site](https://code.visualstudio.com/)
- [VS Code — docs](https://code.visualstudio.com/docs)
- [VS Code — keybindings](https://code.visualstudio.com/docs/getstarted/keybindings)
- [VS Code — Remote Development](https://code.visualstudio.com/docs/remote/remote-overview)
`.trim(),

  'i.cursor': `
**TL;DR** — Cursor is a fork of VS Code with AI woven through the editor — tab-completion that reads your whole codebase, inline chat on any selection, and a composer for multi-file agent edits — and your VS Code muscle memory transfers intact.

## What's actually different vs VS Code

- **Tab** — inline completions that often span multiple lines; aware of surrounding files, not just the current one.
- **\`Cmd/Ctrl+K\`** — inline edit on a selection ("rewrite this function", "add error handling", "convert to async").
- **Chat panel** — conversation with the codebase. Reference files with \`@\`, pin them, scope retrieval.
- **Composer / Agent** — make changes across many files from a single prompt. Preview diffs, accept or reject.
- **Rules files** (\`.cursorrules\`) — persistent instructions Cursor reads every session.

Everything else is VS Code — same extensions, same keybinds, same settings.

## When to pick Cursor over VS Code + Claude Code

- **Cursor** — you want AI edit affordances inline with your editing flow; short-turn, feedback-heavy work.
- **Claude Code** — you want a long-session autonomous agent on a whole task; you're OK living in a terminal.

They're not competitors so much as different shapes of the same idea. Some people use both (Claude Code for long tasks, Cursor Tab for live typing).

## Setup worth doing once

- Sign in with your existing VS Code settings (Settings Sync imports them).
- Write a \`.cursorrules\` at the repo root — house style, banned patterns, "always use X library" — Cursor reads it.
- Pin your \`CLAUDE.md\` or equivalent in the chat so the assistant sees it.

## Pricing

Free tier for exploration. Pro ($20/mo) unlocks Claude Opus / Sonnet + higher Tab limits. Business tier adds privacy mode + SSO.

## Sources

- [Cursor — main site](https://cursor.com/)
- [Cursor — docs](https://docs.cursor.com/)
- [Cursor — rules](https://docs.cursor.com/context/rules)
- [Cursor — features overview](https://docs.cursor.com/features)
`.trim(),

  'i.github-pages': `
**TL;DR** — GitHub Pages serves static files from any GitHub repo over HTTPS for free; point it at a branch (or a GitHub Actions artifact) and your site is live at \`https://<user>.github.io/<repo>/\`.

## Two ways to deploy

- **Deploy from a branch** — Pages serves \`/\` or \`/docs\` of a chosen branch. Simplest if you commit a pre-built \`dist\`.
- **GitHub Actions** — a workflow builds your site and uploads the result as a Pages artifact. What this project uses.

Switch between them in **Repo → Settings → Pages**.

## Actions deploy pattern (what this app uses)

\`\`\`yaml
# .github/workflows/deploy-pages.yml
on:
  push: { branches: [main], paths: ['app/**'] }
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: npm }
      - run: npm ci && npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: app/dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: github-pages
    steps:
      - uses: actions/deploy-pages@v4
\`\`\`

## Base path gotcha

User sites (\`<user>.github.io\`) serve at \`/\`. Project sites serve at \`/<repo>/\`. Most SPAs break here because they assume root. In Vite:

\`\`\`ts
export default defineConfig({ base: '/<repo>/' })
\`\`\`

React Router needs a matching \`basename\` (Vite exposes the base path via \`import.meta.env.BASE_URL\`).

## What Pages is good at

- Docs sites, marketing pages, static SPAs.
- Personal resumes and portfolios.
- Preview builds off long-lived branches.

## What it's not

- **No server-side rendering.** Static files only.
- **No edge functions.** Use Vercel / Cloudflare Pages / Netlify for that.
- **No custom backend.** Build static, hit public APIs from the client, or host the backend elsewhere.

## Custom domain

Add a \`CNAME\` file with your domain; point your DNS at GitHub's Pages IPs or a \`CNAME\` record. HTTPS is automatic via Let's Encrypt once DNS propagates.

## Sources

- [GitHub Pages — docs](https://docs.github.com/en/pages)
- [GitHub Pages — quickstart](https://docs.github.com/en/pages/quickstart)
- [actions/deploy-pages](https://github.com/actions/deploy-pages)
- [Vite — GitHub Pages deploy guide](https://vite.dev/guide/static-deploy.html#github-pages)
`.trim(),

  'i.claude-ai': `
**TL;DR** — Claude.ai is the web/mobile/desktop home for chatting with Claude — the same models that power the API, wrapped with Projects (persistent knowledge), Artifacts (rendered output), and uploads, across free and paid plans.

## Plans at a glance

- **Free** — access to Haiku and usage-limited Sonnet.
- **Pro** ($20/mo) — unlocks Opus + higher limits + Projects.
- **Max 5×** ($100/mo) — 5× higher usage than Pro, priority access.
- **Max 20×** ($200/mo) — 20× Pro, plus earliest access to new features.

## Projects

A Project is a persistent workspace: a system prompt + attached files + chat history. Use them for ongoing work (a codebase, a book draft, a research area) so Claude doesn't re-read context every session.

## Artifacts

When a response contains substantial, reusable output — code, a document, a diagram, a small app — Claude renders it in a side panel you can edit and iterate on without losing the conversation. Artifacts can run (HTML, React, Python via pyodide).

## Files

Paid plans let you upload PDFs, images, spreadsheets, and more into any chat. Files attached to a Project are shared across every conversation in that project.

## When to use Claude.ai vs. the API / Claude Code

- **Claude.ai** — thinking, writing, research, document work. Anything you'd otherwise do in ChatGPT.
- **Claude Code** — long-session coding on real repos. Terminal, not a browser.
- **API / SDK** — embedding Claude in your own product or automation.

Most work starts in Claude.ai; when it becomes repetitive, graduate to Code or the API.

## Sources

- [Claude.ai](https://claude.ai)
- [Anthropic — plans](https://www.anthropic.com/pricing)
- [Claude — Projects](https://docs.claude.com/en/docs/build-with-claude/projects)
- [Claude — Artifacts](https://docs.claude.com/en/docs/build-with-claude/artifacts)
`.trim(),

  'i.dexie': `
**TL;DR** — Dexie gives you the ergonomics of an ORM on top of IndexedDB — declare your schema once, write chainable queries, get typed results, and never touch \`IDBRequest\` directly.

## Mental model

A Dexie \`Database\` holds **stores** (tables). Each store has one primary key plus optional **indexes**. Stores are declared as comma-separated strings:

\`\`\`ts
db.version(1).stores({
  tracks:    'id, order',
  topics:    'id, trackId, order',
  progress:  'id, kind, topicId, updatedAt',
})
\`\`\`

The first token is the primary key. The rest are indexes. Prefix with \`&\` for unique, \`*\` for multi-entry, \`++\` for auto-increment.

## Schema migrations

Bump the version; Dexie upgrades in place.

\`\`\`ts
db.version(2).stores({
  inventory: null,                  // drop a store
  library:   'id, kind, pinned, addedAt',
})
\`\`\`

Provide an \`.upgrade()\` callback on the new version to transform old rows. No callback = Dexie adds/drops stores but leaves row data alone.

## Queries

Every store exposes a chainable query builder:

\`\`\`ts
await db.library.where('kind').equals('tool').toArray()
await db.progress.orderBy('updatedAt').reverse().limit(10).toArray()
await db.library.filter(x => x.pinned).toArray()
\`\`\`

\`filter()\` is a JS predicate — no index required. \`where()\` uses indexes and is far faster on large stores.

## Transactions

Wrap multi-store writes in a transaction:

\`\`\`ts
await db.transaction('rw', [db.tracks, db.topics], async () => {
  await db.tracks.bulkPut(rows)
  await db.topics.bulkPut(topicRows)
})
\`\`\`

If anything throws, the whole transaction rolls back.

## Gotchas

- **Indexes are declared at schema time, not at write time.** \`where()\` on a non-indexed field returns nothing — use \`filter()\` instead, or add the index in a new version.
- **Dexie is local-first; it does not sync.** Use Dexie Cloud or build your own sync layer.
- **Safari has quotas.** ~50 MB per origin in Private Mode; more in normal mode, but subject to eviction. Don't store binaries here.

## Sources

- [Dexie — main docs](https://dexie.org/)
- [Dexie — schema syntax](https://dexie.org/docs/Version/Version.stores())
- [Dexie — queries](https://dexie.org/docs/Collection/Collection)
- [MDN — IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
`.trim(),
}
