# Vibe Pathway — Content Audit + Default-Template Review

Research-only. No code changes. Commissioned 2026-04-22.

Scope: the "vibe coder" pathway — people who build shippable software with AI
assistance without hand-writing most of the code (Cursor, Claude Code, v0,
Lovable, Replit, Bolt, Windsurf, Supabase, etc.).

---

## Part 1 — Content coverage audit

### 1a. What a vibe coder lands on today

**Learn — tracks they are primary audience for (`audience` includes `vibe`):**

- `foundations` (AI Foundations)
- `prompt-eng` (Prompt Engineering)
- `agents` (Agents & Tool Use)
- `frontend-ai` (AI Frontend)

All four tracks. Nothing is vibe-exclusive; vibe overlaps with dev on
`agents` + `frontend-ai` and with everyone on `foundations` + `prompt-eng`.

**Learn — topics that actually exist in `seed.ts`:**

| Topic ID | Track | Title | Lesson? | Quiz? |
|---|---|---|---|---|
| t.tokens | foundations | Tokens & Tokenization | Yes (`l.tokens.intro`) | Yes (7 Qs, all 4 question kinds) |
| t.transformers | foundations | How Transformers Think | No | No |
| t.sampling | foundations | Sampling & Temperature | No | No |
| t.clear-prompts | prompt-eng | Writing Clear Prompts | No | No |
| t.few-shot | prompt-eng | Few-Shot Examples | No | No |
| t.tool-use | agents | Tool Use Basics | No | No |
| t.memory | agents | Memory Patterns | No | No |
| t.streaming | frontend-ai | Streaming UIs | No | No |
| t.glass-motion | frontend-ai | Glass, Motion & Feel | No | No |

Net: nine topic rows, one real lesson, one real quiz. A vibe coder opening
Learn today sees a well-framed skeleton and one finished topic (tokens).
Everything else is a title + one-line summary.

**Library — items a vibe coder sees as primary via `deriveLibraryAudience`:**

- IDEs + frameworks → `vibe + dev`: Cursor, VS Code, Vite, React, Next.js,
  Tailwind, Shadcn, TypeScript, Zustand, React Router, Astro, SvelteKit,
  Framer Motion, Dexie, Prisma, LangChain, Claude Agent SDK.
- Hosting / infra / DB → `vibe + dev`: Vercel, GitHub Pages, Cloudflare
  Pages, Supabase, Neon, Pinecone, Groq, Replicate, Hugging Face.
- `coding`-tagged non-IDE → `vibe + dev`: v0.
- Automation → `office + vibe`: n8n.
- Chat / model / foundations → everyone (Claude Opus/Sonnet/Haiku, GPT,
  Gemini, Grok, Llama, Mistral, DeepSeek, Claude.ai, Anthropic docs, etc.).
- Dev-only (hidden from vibe unless cross-pathway): Claude Code (CLI)
  [has `'cli'` tag], Docker, Git, Whisper, Python [has `'language'` tag].

**Library long-form notes (`seedLibraryNotes.ts`) — 16 entries:**

Apple HIG × 7 (motion, typography, color, a11y, layout, gestures, materials),
Liquid Glass × 2 (fundamentals, web), Linear workflow, Claude as a Coworker,
MCP, Khan dashboard, Quizlet Learn, Prompt Engineering — Anthropic's playbook.

Only three of those are substantively vibe-relevant (MCP, Claude as Coworker,
Prompt Engineering). The rest are design-system research that surfaces under
cross-pathway foundations tags.

**Tool bodies (`toolBodies.ts`) — 48 tools have in-app detail pages**, 
including Cursor, Claude Code, v0, Supabase, Vercel, Vite, React, Next.js,
Tailwind, Shadcn, Zustand, React Router, Framer Motion, Astro, SvelteKit,
Cloudflare Pages, Neon, Pinecone, Groq, Replicate, Prisma, LangChain, n8n,
Claude Agent SDK, TypeScript. This is the strongest part of the vibe
experience today — the stack-picker + in-app tool docs are fleshed out.

**Audit flag — bug-class item:**

`i.claude-code` has tag `'cli'`, so `deriveLibraryAudience` routes it to
**`dev` only**. This is wrong — Claude Code is the canonical vibe tool and
should surface for vibe too. Two fixes possible: (a) remove `'cli'` from its
tag set, (b) special-case `'cli' + 'agent'` combo in `deriveLibraryAudience`
to include vibe. Recommend (b) so future CLI-y agentic tools inherit. Same
scrutiny warranted for Python (`'language'` → dev only) — arguably fine for
vibe since glue scripts are usually generated, not hand-written.

### 1b. Gaps for a non-coder-who-ships-software

A fresh vibe coder opening the app today can learn what a token is and read
a Cursor page. They cannot learn, from the app alone, how to actually ship
software. Concrete missing territory:

1. **Setup & environment.** No "install Node/git/VS Code (or skip it for
   Lovable)", no "sign in to Claude and GitHub", no "what is a terminal and
   when will an AI ask you to use one". The Library has Git + VS Code tool
   pages, but nothing walks a vibe-coder through their first setup.
2. **Choosing a stack.** Tool detail pages exist, but no lesson compares
   Cursor vs. Claude Code vs. v0 vs. Lovable vs. Replit on the axes a
   vibe-coder actually cares about: how much code do I see, how technical
   do I need to be, web-app vs. mobile-app vs. script, free tier vs. paid.
3. **Prompt-to-plan.** No topic teaches the planning loop — write a one-
   paragraph spec, have the AI expand it into a file tree + task list,
   review and trim before it writes code. This is the single highest-
   leverage habit in vibe coding and it's absent.
4. **Iteration loops.** No topic on how to drive a change cycle (state the
   change → read the diff → run it → report the result back). No
   treatment of "accept all" vs. "review each hunk".
5. **Debugging with AI.** No topic on how to capture an error (copy the
   full stack trace, not the last line), when to paste the whole file,
   when to share only the diff, and how to break a reproduction.
6. **Deploying.** Vercel, Cloudflare Pages, GitHub Pages are in the Library
   as tool rows, but no end-to-end lesson takes a working local app to a
   live URL. No treatment of environment variables or preview deploys.
7. **Limits & pitfalls.** No content on context-window exhaustion,
   hallucinated APIs, dead-loop rewrites, over-eager refactors, or the
   signature failure mode "the AI rewrites three files when I asked it to
   fix one line".
8. **Security.** Zero coverage of the vibe-specific threats that are now
   well-documented industry-wide: hardcoded credentials in committed code
   (2× the human-baseline rate per CSA 2026), XSS in AI-generated output
   (86% in the Georgetown study), SSRF in routing/image-proxy features,
   over-permissive Supabase RLS, leaking service-role keys to the client.
9. **Cost.** No treatment of what a Claude Code session actually costs, how
   to cap spend, when to drop to a smaller model for boilerplate, how
   Cursor / Lovable pricing models differ, and how to estimate a monthly
   burn rate for a side project.
10. **Version control for people who don't write code.** Git tool page
    exists but no lesson on the minimum a vibe coder needs: commit often,
    branch for experiments, how to roll back when the AI destroys
    something, what "the AI and I disagree about this file" looks like in
    a merge.

**Adjacent but worth flagging:** there's no topic on **MCP + tool servers**
even though the MCP long-form note exists in the Library. Vibe coders
increasingly run MCP servers to give Claude access to Figma, Linear, their
own DBs, etc., and the app should have a learn-surface for it, not just a
reference note.

---

## Part 2 — Default pathway template evaluation

Current locked template (STATE.md, Chunk D):

```
t.prompt-basics, t.prompt-patterns, t.agents-intro,
t.claude-code-basics, t.vibe-workflow
```

### Does the ordering progress sensibly?

Mostly yes. The implied arc is:

1. prompt-basics   → what a prompt is
2. prompt-patterns → how to shape prompts
3. agents-intro    → what "an AI that does things" means
4. claude-code-basics → pick the canonical vibe tool
5. vibe-workflow   → ship and iterate without breaking everything

That's a clean "understand → pick → ship" progression for a developer-
adjacent learner. **It has one structural weakness:** the template drops a
fresh vibe-coder directly into prompts with no orientation to what vibe
coding itself is, what they're going to be doing, what the stack choices
mean, or whether they even need Claude Code specifically. A Lovable-first
user will feel mis-sold by topic 4.

It also **omits three of the pathway's highest-value slots**: debugging
with AI, deploying, and security/cost/limits. `t.vibe-workflow` could fold
iteration + deploy + debug into one heavy topic, but that overloads it.

### Evaluation of each slot

**`t.prompt-basics` — keep as-is.** Correct first-principles entry.
Audiences: student, office, media, vibe, dev.

**`t.prompt-patterns` — keep, but scope carefully.** This shouldn't become
a taxonomy lecture (zero-shot, one-shot, few-shot, CoT, ReAct…). For vibe,
the useful subset is: system-prompt scaffolds, role prompts, examples,
"show me the plan before the code", and the "critique-then-fix" pattern.

**`t.agents-intro` — rename to `t.agents-for-vibe` or merge into
`t.claude-code-basics`.** A generic "what is an agent" topic risks being
too abstract for the vibe audience. Recommend either (a) rename to signal
vibe framing — "Agents that build things" — or (b) collapse into the
Claude Code topic, since Claude Code *is* the concrete agent they're
going to meet. Recommend (a) for flexibility — dev pathway reuses the
same row.

**`t.claude-code-basics` — keep, but broaden to `t.vibe-tools-compared` 
FIRST, then keep `t.claude-code-basics` as a sibling.** Claude Code is
one of five or six legit entry points and isn't the right default for
everyone. Splitting the slot:

- NEW `t.vibe-tools-compared` — Cursor / Claude Code / v0 / Lovable /
  Replit / Bolt / Windsurf on "how much code do I see", "what am I good
  at", "cost". Lets a user pick their lane before committing.
- KEEP `t.claude-code-basics` — depth on the one most people land on.

**`t.vibe-workflow` — split into two topics.** As written, this has to
cover: spec-to-plan, iteration loops, commit hygiene, rollbacks,
debugging, deploys, limits/pitfalls. That's 2–3 topics of content. Split:

- NEW `t.vibe-iteration-loop` — the inner loop: spec → plan → diff →
  run → report → next change. Commit-often + rollback-when-it-breaks
  included.
- NEW `t.vibe-ship-and-survive` — deploy + env vars + cost + the
  classic failure modes (hallucinated APIs, over-eager refactors,
  context-window rot, committed secrets).

Security gets a dedicated slot in the **non-template** catalog (below), not
the default plan — it's an important topic but loading it into the
5-topic default bloats the starter path.

### Concrete suggested edits

**Revised default (still 5 topics, still locked):**

```
1. t.vibe-what-and-why        (NEW — orientation: what vibe coding is, what you'll ship)
2. t.prompt-basics            (keep)
3. t.vibe-tools-compared      (NEW — replaces the generic agents-intro slot)
4. t.claude-code-basics       (keep)
5. t.vibe-iteration-loop      (renamed + scoped from t.vibe-workflow)
```

**Rationale for the swap:**

- `t.vibe-what-and-why` replaces the hidden assumption that a vibe-coder
  already knows what they're signing up for. 3–5 min topic, short quiz.
- `t.prompt-patterns` drops out of the default; it's still in the catalog
  as an opt-in add-on for users who want prompt depth. A first-pass vibe
  coder learns prompt patterns implicitly through Claude Code.
- `t.agents-intro` drops out of the default; it's still in the `agents`
  track for dev pathway. Vibe meets agents through the one agent they
  actually use (Claude Code), not abstractly.
- `t.vibe-iteration-loop` replaces the vague `t.vibe-workflow` slug.

**Non-template catalog additions (authored but not in the default 5):**

- `t.vibe-ship-and-survive` — deploy + env vars + cost + failure modes.
- `t.vibe-security` — hardcoded secrets, RLS pitfalls, XSS/SSRF baseline.
- `t.vibe-debug-with-ai` — capturing errors, repro-building, knowing when
  to restart a session.
- `t.mcp-for-vibe` — one step further: giving your agent access to your
  tools (Figma, Linear, your DB). Promotes the existing MCP long-form
  note into a real learn-topic.

### Authoring status per template slot

| Slot | Needed | Can reuse existing? |
|---|---|---|
| t.vibe-what-and-why | NEW lesson + NEW quiz | No — nothing like this exists. Short (3–5 min) lesson. |
| t.prompt-basics | NEW lesson + NEW quiz | Partial — the `t.clear-prompts` topic already exists. Can rename/merge. Recommend keeping the slug `t.prompt-basics` (matches STATE.md lock) and migrating `t.clear-prompts` content into it with an alias. |
| t.vibe-tools-compared | NEW lesson + NEW quiz | Partial — content can be assembled by reading across existing tool bodies (Cursor, Claude Code, v0, Lovable, Replit, Supabase). The comparison framing itself is new. |
| t.claude-code-basics | NEW lesson + NEW quiz | Partial — `toolBodies['i.claude-code']` has a detail body. That's a product reference, not a pedagogical walkthrough; can be quoted, not reused whole. |
| t.vibe-iteration-loop | NEW lesson + NEW quiz | No — nothing like this exists. This is the single highest-value original lesson to author. |

**Summary:** five new lessons + five new quizzes. Two (`t.prompt-basics`,
`t.vibe-tools-compared`) can lean on existing seed content for raw
material. Three (`t.vibe-what-and-why`, `t.claude-code-basics`,
`t.vibe-iteration-loop`) are from-scratch authoring.

This aligns with the STATE.md Chunk F budget of "~5 full topics with
full lessons + full quizzes" — the vibe pathway alone consumes the full
Chunk-F budget if it's authored end-to-end. If the run must cover all
five pathways in Chunk F, recommend authoring `t.prompt-basics` +
`t.vibe-iteration-loop` deeply (as the two "heavy" topics), and the
other three as shorter drafts that can be expanded in a later wave.

### Cross-template reuse

`t.prompt-basics` appears in the student, office, and vibe templates. If
authored once, it seeds three pathways. Worth authoring first in any
sequencing.

`t.claude-code-basics` is vibe-specific in the current template but the
dev pathway will want it too. Author once with `audience: ['vibe', 'dev']`.

---

## Sources

Grounding for the 2026 vibe-coding practice claims (tool landscape, failure
modes, security stats):

- [Cursor vs Claude Code vs Codex — Vibe Coding 2026](https://medium.com/@mkteam/cursor-vs-claude-code-vs-codex-which-is-better-for-vibe-coding-in-2026-fcbd4f6406d4)
- [10 Best Vibe Coding Tools in 2026 — Manus](https://manus.im/blog/best-vibe-coding-tools)
- [Best Vibe Coding Tools in 2026 — Lovable](https://lovable.dev/guides/best-vibe-coding-tools-2026-build-apps-chatting)
- [Vibe Coding Tools: The 2026 Intent-Driven Dev Playbook](https://blog.eif.am/vibe-coding-tools-2026/)
- [Vibe Coding Security — Risks & Vulnerabilities (Checkmarx)](https://checkmarx.com/blog/security-in-vibe-coding/)
- [The Real Risk of Vibecoding (Trend Micro, Mar 2026)](https://www.trendmicro.com/en_us/research/26/c/the-real-risk-of-vibecoding.html)
- [The Risks of Vibe Coding — Enterprise Pitfalls (Retool)](https://retool.com/blog/vibe-coding-risks)
- [Passing the Security Vibe Check (Databricks)](https://www.databricks.com/blog/passing-security-vibe-check-dangers-vibe-coding)
