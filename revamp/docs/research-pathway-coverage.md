# Pathway Coverage Research — Default Templates + Pathway Completeness

Research-only. No code changes. Commissioned 2026-04-22.

Two questions from the user:

1. **Coverage per pathway.** "Ensure default pathways cover the overall concepts they need. I don't want a vibe coder missing a critical step. Start to finish of learning."
2. **Pathway completeness.** "Ensure all possible pathways of using AI / learning AI are encapsulated with this program."

Prior art reused: `docs/research-vibe-pathway.md` (vibe section is summarised, not re-derived).

Content inventory grounded in `src/db/seed.ts` as of 2026-04-22. Topics
that currently have both a lesson and a quiz:

- `t.tokens`, `t.prompt-basics`, `t.vibe-what-and-why`, `t.vibe-tools-compared`,
  `t.claude-code-basics`, `t.vibe-iteration-loop`

Topics that exist as title+summary only (no lesson/quiz yet):

- `t.transformers`, `t.sampling`, `t.clear-prompts`, `t.few-shot`,
  `t.tool-use`, `t.memory`, `t.streaming`, `t.glass-motion`

Topics referenced by the default templates that do NOT yet exist as rows in
seed.ts (will silently drop at stamp time — see `pathwayTemplates.ts` comment):

- `t.prompt-patterns` (student, office, dev)
- `t.models-compared` (student)
- `t.claude-for-office`, `t.docs-with-ai`, `t.meetings-with-ai` (office)
- `t.image-generation`, `t.video-generation`, `t.voice-cloning-ethics`,
  `t.media-workflow` (media)
- `t.agents-intro`, `t.streaming-ui` (dev — note: `t.streaming` exists,
  `t.streaming-ui` does not; likely a slug mismatch)

This means three of the five default templates (student, office, media, and
half of dev) are mostly ghost slots today. The audit below treats them as
intended content, since they are in `pathwayTemplates.ts`.

---

## Task 1 — Per-pathway start-to-finish coverage audit

### 1. Student pathway

**Who it serves.** A high-school or undergrad learner trying to understand
what AI actually is — curious, not yet building products, wants to be able
to hold a conversation about AI and use it well in school.

**The start-to-finish arc (canonical milestones).**

1. **Orientation — "what is this thing?"** Plain-language definition of an
   LLM. What "trained on the internet" actually means. Why it's called
   generative.
2. **AI literacy — what to trust and when.** Hallucinations, confidence
   vs. correctness, the "it sounds right" trap. How to fact-check.
3. **How a model actually works (lightweight).** Tokens, pattern matching
   over huge corpora, no internal truth model. Transformers conceptually
   (not mathematically).
4. **Getting good answers — prompt basics.** The five pieces, examples,
   constraints.
5. **Models compared.** Claude vs. ChatGPT vs. Gemini — what to pick for
   what, and where the free tiers are.
6. **Using AI for schoolwork without cheating yourself.** Study aid,
   explanation-on-demand, practice-problem generation. Integrity lines.
7. **Privacy + ethics basics.** What not to paste in. Data retention.
   Bias. Why "the model said so" isn't a citation.
8. **What's next.** Where to go after this — code pathways, media,
   academic research, etc.

**Current default template (5).**

```
t.tokens, t.transformers, t.prompt-basics, t.prompt-patterns, t.models-compared
```

**Coverage verdict.** Inverted. The current template front-loads
mechanical internals (tokens, transformers) before the student has any
reason to care. Milestones 1, 2, 6, and 7 are entirely absent. A student
following this plan learns what a token is before they learn that Claude
sometimes just makes things up — exactly the failure mode the user flagged
("AI-literacy milestone a beginner needs").

Missing: orientation, hallucinations / trust, study-use, privacy + ethics.
Superfluous at position 1–2: tokens + transformers lead with mechanism
instead of meaning. Mis-ordered: internals should come after literacy,
not before.

**Recommended template.**

```
1. t.ai-literacy            (NEW — what an LLM is, hallucinations, when not to trust)
2. t.prompt-basics          (exists — get good answers)
3. t.tokens                 (exists — the one internals concept that pays off)
4. t.models-compared        (authored slot — pick a model for a task)
5. t.ai-for-students        (NEW — study aid, integrity lines, privacy)
```

Rationale:

- `t.ai-literacy` — opens with meaning before mechanism. NEW content.
- `t.prompt-basics` — already shipped. Second because every other milestone
  depends on being able to drive the tool.
- `t.tokens` — the one foundations concept a student actually benefits
  from (context limits, cost, why replies cut off). Already shipped.
- `t.models-compared` — placeholder in template today; needs authoring.
  Keep it.
- `t.ai-for-students` — NEW. Folds schoolwork-integrity + privacy + ethics
  into one lesson; keeps the default at 5 slots.

Drop from default: `t.transformers` (too mechanical for a student default;
survives as an optional deepening topic), `t.prompt-patterns` (prompt
depth is optional for a student — they rarely need system prompts or
few-shot).

**Needs new content:** `t.ai-literacy`, `t.ai-for-students`,
`t.models-compared` (slot exists, body doesn't).
**Already exists:** `t.prompt-basics`, `t.tokens`.

---

### 2. Office pathway

**Who it serves.** A non-developer knowledge worker (Lisa is the archetype)
using Claude as a coworker — drafting, summarising, meeting support,
research synthesis, presentation prep.

**The start-to-finish arc.**

1. **Orientation — "AI as a coworker, not a search engine."** What the
   model can and can't hold, why it needs context you wouldn't give a
   colleague.
2. **AI literacy at work.** Hallucinations in a professional setting,
   confidentiality (do not paste the NDA draft into a public model),
   verifying numbers, the "sign your name to it" rule.
3. **Prompt basics.** Five pieces. In an office context: role, context
   (the doc you're working from), task, tone, format.
4. **Document work.** Drafting, rewriting, shortening, tone-shifting,
   summarising a long doc, turning bullets into prose and back.
5. **Meetings + communication.** Prep for a meeting, summarise the
   transcript after, turn a recording into an action list, draft
   follow-up emails.
6. **Research + synthesis.** Multi-source reading, fact-checking the
   model's claims, citations you can defend.
7. **Workflow integration.** Claude Projects / custom instructions /
   saved prompts. When to use claude.ai vs. a Copilot-in-Word vs. a
   purpose-built tool.
8. **Data + privacy at work.** What data goes where. Company policy.
   Enterprise vs. personal plans.

**Current default template (5).**

```
t.prompt-basics, t.prompt-patterns, t.claude-for-office, t.docs-with-ai, t.meetings-with-ai
```

**Coverage verdict.** Decent shape, but skips AI-literacy-at-work (#2) and
data-privacy-at-work (#8) — both of which matter more in an office
setting than any prompt-patterns taxonomy. `t.prompt-patterns` is
too technical for this audience.

Missing: AI literacy at work (trust + hallucinations), privacy/data.
Superfluous: `t.prompt-patterns` (depth a non-dev rarely needs).

**Recommended template.**

```
1. t.prompt-basics          (exists — entry point)
2. t.ai-literacy-at-work    (NEW — trust, verify, what not to paste, sign-your-name)
3. t.claude-for-office      (authored slot — Claude-as-coworker orientation)
4. t.docs-with-ai           (authored slot — draft/rewrite/summarise)
5. t.meetings-with-ai       (authored slot — prep, summary, follow-ups)
```

Rationale:

- `t.prompt-basics` first — it's the universal on-ramp.
- `t.ai-literacy-at-work` replaces `t.prompt-patterns`. Higher leverage
  for an office user; NEW content. Can reuse 60% of the student
  `t.ai-literacy` with workplace framing.
- Remaining three stay — they are the office-specific product lessons.

Defer to catalog (not default): `t.prompt-patterns` (for office users who
want depth), `t.office-data-privacy` (a lighter supplement; the literacy
topic covers the essentials), `t.research-with-ai` (synthesis + citations
— worth authoring post-default).

**Needs new content:** `t.ai-literacy-at-work`, `t.claude-for-office`,
`t.docs-with-ai`, `t.meetings-with-ai` (all four are slot-only today).
**Already exists:** `t.prompt-basics`.

---

### 3. Media pathway

**Who it serves.** A creator using generative media — Midjourney, Sora,
Veo, ElevenLabs, Runway — to produce images, video, voice, audio. Not
necessarily a developer; not necessarily hand-editing in DaVinci.

**The start-to-finish arc.**

1. **Orientation — "what generative media is."** Difference between
   sampling a latent space and "AI edits my video." What it means that
   it's generating, not retrieving.
2. **AI literacy for creators.** Hallucinated content (hands, text,
   physics), style-stealing debates, deepfakes, rights + consent. This
   is the trust milestone in the creator key.
3. **Prompt basics for media.** Subject, composition, style, lighting,
   mood, negatives. How media prompting differs from text prompting.
4. **Image generation.** Midjourney vs. Nano Banana vs. Ideogram —
   painterly vs. fast vs. typography. Workflow: reference images,
   iteration, upscaling.
5. **Video generation.** Veo / Sora / Runway. Shot prompting,
   first/last-frame conditioning, duration and cost. Stitching shots.
6. **Voice + audio.** ElevenLabs / Cartesia. Cloning consent,
   expressiveness controls, when to narrate vs. when to generate music.
7. **Post-production loop.** DaVinci Resolve + generative assets. Where
   AI stops and editing starts.
8. **Ethics + rights.** Consent for voice/face, model-training data,
   disclosure, what platforms reject.

**Current default template (5).**

```
t.prompt-basics, t.image-generation, t.video-generation, t.voice-cloning-ethics, t.media-workflow
```

**Coverage verdict.** Good instincts — the right five domains are
named. Two gaps: no orientation (#1) and no general AI-literacy-for-
creators (#2); the current ethics slot is scoped specifically to voice
cloning, which understates the category. `t.media-workflow` is vague —
it probably needs to be "post-production loop" (how generative + DaVinci
compose).

Missing: orientation / what generative media is, broader AI-literacy-for-
creators (hallucinated hands, rights, disclosure).

**Recommended template.**

```
1. t.generative-media-101   (NEW — orientation + literacy + rights, merged)
2. t.prompt-basics          (exists — with one media-specific section added)
3. t.image-generation       (authored slot — Midjourney / Nano Banana / Ideogram)
4. t.video-generation       (authored slot — Veo / Runway, shot prompting)
5. t.voice-and-audio        (authored slot — broaden voice-cloning-ethics to cover both voice + music)
```

Rationale:

- `t.generative-media-101` replaces `t.media-workflow` at the top and
  folds in orientation + rights + literacy. This is the single highest-
  leverage lesson in the pathway.
- Drop `t.voice-cloning-ethics` as a standalone slot; fold ethics into
  (a) the 101 topic (industry-wide rights/disclosure) and (b)
  `t.voice-and-audio` (consent-specific). This keeps the default at 5.
- `t.media-workflow` (post-production loop) moves to catalog, not
  default — it's the deepening topic, not the entry.

**Needs new content:** `t.generative-media-101`, `t.image-generation`,
`t.video-generation`, `t.voice-and-audio` (all four slot-only today).
**Already exists:** `t.prompt-basics`.

---

### 4. Vibe pathway

**Who it serves.** Someone who wants to ship real software using AI to do
most of the typing — Cursor, Claude Code, v0, Lovable, Replit. Not
necessarily a developer, but more technical than Office.

**The start-to-finish arc.** (From `research-vibe-pathway.md`; restated.)

1. **Orientation — "what vibe coding is (and isn't)."**
2. **Prompt basics.**
3. **The vibe stack.** Cursor vs. Claude Code vs. v0 vs. Lovable vs. Replit vs. Supabase.
4. **Pick a tool + day-one moves.** Claude Code basics as the reference
   walkthrough (the underlying pattern transfers).
5. **The iteration loop.** Describe → observe → correct → commit.
6. **Debugging + the two-fix rule.** Capturing errors, when to reset.
7. **Ship it.** Deploy + env vars + cost + classic failure modes.
8. **Security basics.** Secrets in repos, RLS, XSS/SSRF, LLM-generated
   code's signature vulnerabilities.
9. **MCP + agent tool access.** Giving your agent hands — Figma, Linear,
   your DB. The next rung up.

**Current default template (5).**

```
t.vibe-what-and-why, t.prompt-basics, t.vibe-tools-compared, t.claude-code-basics, t.vibe-iteration-loop
```

**Coverage verdict.** This is the strongest of the five default templates
— all five slots shipped with lessons + quizzes today, and the ordering
matches the canonical arc for milestones 1–5. The gap (deliberately
deferred per the vibe research) is milestones 6–9: debugging, deploy,
security, MCP. Those live as catalog adds, not default.

No changes recommended. Keep as-is. The catalog add-ons already scoped:

- `t.vibe-debug-with-ai` (capturing errors, two-fix rule)
- `t.vibe-ship-and-survive` (deploy + env vars + cost + failure modes)
- `t.vibe-security` (secrets, RLS, XSS/SSRF)
- `t.mcp-for-vibe` (agent tool access)

**Needs new content:** none in the default. Catalog adds above.
**Already exists:** all five default slots.

---

### 5. Developer pathway

**Who it serves.** A programmer building AI products — writing the code
themselves, shipping with an SDK, caring about streaming, tool use,
agents, cost, latency.

**The start-to-finish arc.**

1. **Foundations — tokens, context, cost.** The one mechanical layer a
   dev actually needs in their head at all times.
2. **Prompt basics + patterns.** Role, system, few-shot, chain-of-
   thought, structured output, schema-constrained generation.
3. **The SDK surface.** Messages API, parameters (temperature,
   max_tokens, top_p), streaming, stop sequences, system prompts.
4. **Tool use.** Defining tools, parsing tool_use blocks, returning
   tool_result, multi-turn tool loops.
5. **Agents.** The agent loop (plan → act → observe), memory patterns,
   when to use SDK agents vs. your own state machine.
6. **Streaming UIs.** Rendering tokens as they arrive, structured
   streaming, cancellation, backpressure.
7. **Production concerns.** Caching (prompt caching is table stakes),
   batching, cost monitoring, rate limits, retries.
8. **Eval + safety.** Offline evals, prompt injection, jailbreaks,
   refusal handling, PII scrubbing.
9. **Deployment patterns.** Background tasks, webhooks, streaming
   proxies, MCP servers.

**Current default template (5).**

```
t.tokens, t.prompt-patterns, t.tool-use, t.agents-intro, t.streaming-ui
```

**Coverage verdict.** Tracks the current dev track ordering the user
referenced (prompt → tool-use → agents → streaming). Two issues:

1. `t.prompt-patterns` as slot 2 skips `t.prompt-basics` — a dev who
   doesn't already have the five-pieces model is missing foundations.
   Recommendation: lead with `t.prompt-basics` (already shipped), then
   patterns as a deepening catalog topic.
2. No production concerns (#7 — prompt caching, rate limits, retries).
   For a dev default, this is a bigger gap than abstract agents.
   Anthropic ships prompt caching now and it's the highest-leverage
   single SDK feature; a dev default without it is behind the current
   stack.

Also: `t.streaming-ui` is a slug mismatch — seed has `t.streaming`, the
template has `t.streaming-ui`. The template slot silently drops today.

**Recommended template.**

```
1. t.tokens                 (exists — keep)
2. t.prompt-basics          (exists — replaces t.prompt-patterns in default)
3. t.tool-use               (authored slot — exists as title only today)
4. t.agents-intro           (authored slot — "agents that build things")
5. t.prompt-caching         (NEW — production concern, highest single-feature leverage)
```

Rationale:

- Lead with tokens — devs need the cost/context model.
- Prompt-basics is universal; prompt-patterns demotes to catalog
  (`t.prompt-patterns`).
- Tool-use and agents-intro stay — the canonical dev arc.
- Replace `t.streaming-ui` with `t.prompt-caching`. Streaming is real
  but mostly a UI concern; most devs building today feel caching's
  absence before they feel streaming's. Streaming stays in the catalog
  (`t.streaming` slug).
- Fix the `t.streaming-ui` → `t.streaming` slug mismatch regardless.

Alternative if the user disagrees on caching: keep the current slot
order but fix the slug: `t.streaming-ui` → `t.streaming`. This is the
minimum change that stops the template from silently dropping a slot.

**Needs new content:** `t.prompt-caching`, `t.tool-use` (title only),
`t.agents-intro` (title only).
**Already exists:** `t.tokens`, `t.prompt-basics`.
**Bug to fix:** template references `t.streaming-ui`; seed has
`t.streaming`. One of the two needs to win.

---

## Task 2 — Pathway completeness check

### Potential audiences vs. existing pathways

| Audience | Best-fit pathway | Verdict |
|---|---|---|
| High schooler / curious kid | **student** | Covered. Template should mention age-appropriate framing; no pathway change needed. |
| Teacher / educator | **student** (inverted — teaching instead of learning) | **Mismatch.** A teacher needs lesson-planning, student-detection, integrity-enforcement framing — inverse of the student pathway. Recommend catalog topics (`t.ai-for-teachers`) inside the student pathway rather than a full new pathway. |
| Academic researcher (ML papers) | **dev** (closest) | **Mismatch.** Dev pathway is product-oriented; an academic cares about papers, reproducibility, evals, benchmarks. Covered weakly; recommend a catalog topic (`t.research-reading`) but no new pathway — audience is small. |
| Journalist / writer using AI for investigation | **office** | Mostly covered. Template should flag sourcing + citation + deepfake detection sub-cases. Covered, mention this sub-case in `t.ai-literacy-at-work`. |
| Small-business owner (non-tech — dentist, plumber) | **office** | Covered. They use claude.ai for docs, email, scheduling copy. Template's office arc fits. No action. |
| Data analyst / BI professional | **between office and dev** | **Gap.** This is the most under-served real audience. SQL generation, dashboard prose, Python notebooks, PII scrubbing — neither office nor dev fits. Recommend either (a) catalog sub-path in dev (`t.ai-for-analysts`), or (b) a 6th pathway "analyst." Given audience size, recommend (a) first; watch signups for escalation. |
| Lawyer / paralegal / compliance | **office** | Covered but risky. The confidentiality + hallucinated-citation failure modes (Mata v. Avianca) are severe. Needs a dedicated catalog topic (`t.ai-in-regulated-work`) — mention sub-case in office template. |
| Hardware + robotics + edge-AI tinkerer | **dev** (weak fit) | **Mismatch.** Edge inference, on-device models, quantization, robotics APIs are absent from the dev track (which is frontier-API-shaped). Small but distinct audience; recommend catalog topic only for now (`t.edge-and-on-device`). Not a pathway candidate yet. |
| Game developer | **dev** | Covered weakly. Dev pathway fits for LLM-in-game NPC work; add catalog topic `t.ai-in-games` (NPC dialogue, procgen, asset pipelines). No new pathway. |
| Security / red-team / AI safety | **dev** | Covered but under-weighted. Recommend catalog topic `t.ai-security-redteam` (prompt injection, jailbreaks, data exfiltration, PII leakage); mention as sub-case in dev template's eval/safety slot. |
| Prompt engineer as a job | spans **office + vibe + dev** | Covered. Prompt engineering is a skill, not an audience — the prompt-basics/patterns topics across pathways handle it. Flag: prompt-engineering-as-career content (interview prep, portfolio prompts) could be one catalog topic (`t.prompt-eng-career`). No pathway change. |
| AI-curious retiree | **student** or **office** | Covered by student. Template voice matters — "student" as a label may mis-signal; consider a neutral label like "Beginner / Curious" in future copy. No pathway change, a label rename is worth flagging. |
| Enterprise integration / ops person wiring LLMs into existing systems | **dev** | Weakly covered. MCP + webhooks + streaming proxies + batch jobs are absent. Recommend catalog topic cluster (`t.enterprise-integration`, `t.mcp-servers`) inside dev pathway. No new pathway — this is a dev sub-specialty. |
| Non-English-native speaker | **orthogonal** to all pathways | **Meta-gap.** Language isn't a pathway; it's a cross-cutting concern. Covered only implicitly. Flag as an accessibility + i18n item for the app itself (UI localisation + a catalog note on model behaviour across languages). No pathway change. |

### Meta-gaps the list missed

- **Parents of kids using AI.** "How do I help my kid use this well?" —
  distinct from the student pathway (which assumes the learner IS the
  user). Small audience; catalog topic, not a pathway.
- **Claude power-user-as-a-user.** Someone not building, not studying —
  just getting maximum value out of claude.ai daily. Overlaps office
  heavily but is broader (personal life admin, health research,
  travel, hobbies). Arguably the largest real audience of AI. Could be
  the sixth pathway — "everyday" or "personal" — but there's meaningful
  overlap with office. Worth the user's consideration, not an obvious
  yes. See recommendations.
- **Accessibility.** Blind / low-vision / motor-impaired users have
  distinct AI needs (voice-first, screen-reader integration). Not a
  pathway but a cross-cutting concern.

### Pathway verdict

The five-pathway set is solid — it covers the majority of real AI
learners in 2026, especially when each pathway admits catalog
sub-topics for under-served adjacencies. Three serious flags:

1. **Data analysts** are genuinely between office and dev; either pathway
   fits poorly. The strongest single "should we split?" candidate.
2. **"Everyday / personal" AI users** may be the largest audience and
   fit office only partially. Worth user consideration.
3. **Regulated professions** (law, medicine, compliance) are covered but
   the failure modes are high-stakes enough that a catalog topic is
   non-optional.

No other case in the list justifies a 6th pathway today; all are
catalog-topic or template-copy fixes.

---

## If you make three changes, make these

Ranked by leverage.

### 1. Fix the student + office defaults to lead with literacy, not mechanics

Swap `t.tokens`/`t.transformers` out of the student default position 1–2;
lead with a new `t.ai-literacy` topic. Same pattern for office: replace
`t.prompt-patterns` with `t.ai-literacy-at-work`. One new lesson authored
with two framings (student + office) covers the highest-leverage gap the
user explicitly flagged ("AI-literacy milestone a beginner needs").

**Effort:** 1 new lesson + 2 quizzes (one per framing), plus template
edit in `pathwayTemplates.ts`.

### 2. Fix the dev template's silent drops + add prompt caching

Three dev template slots are ghost rows today: `t.prompt-patterns`,
`t.agents-intro`, `t.streaming-ui` (slug mismatch with `t.streaming`).
Author `t.prompt-basics` + `t.tool-use` into the default, fix the
`t.streaming-ui` slug, and add `t.prompt-caching` as slot 5 — the single
highest-leverage production feature a dev default can include.

**Effort:** Fix slug + bodies for `t.tool-use` + `t.agents-intro` +
`t.prompt-caching` (3 new lessons + 3 quizzes). Template edit.

### 3. Decide on the analyst / everyday-user question before shipping a 6th pathway

Two plausible "should we split?" cases surfaced in Task 2 (data analyst;
everyday personal-AI user). Neither is an obvious yes. Recommend the
user make an explicit call once — adding a catalog sub-path inside an
existing pathway is cheap; adding a 6th pathway is a DB + UI change with
ordering implications. The recommendation is **no 6th pathway today**:
ship catalog sub-topics (`t.ai-for-analysts`, `t.ai-for-everyday`) inside
dev and office respectively, and revisit if usage signals demand a split.

**Effort:** Zero code change now; one decision.

---

## Summary of new content needed (union across Task 1 recommendations)

Lessons (with matching quizzes) that do not exist today and are called for
by the recommended templates:

**Universal / cross-pathway:**

- `t.ai-literacy` (student default) — reusable as `t.ai-literacy-at-work`
  (office default) with ~40% office-specific rewrite.

**Student-specific:**

- `t.ai-for-students` (integrity + study-use + privacy)
- `t.models-compared` (slot exists in template today, body doesn't)

**Office-specific:**

- `t.claude-for-office`, `t.docs-with-ai`, `t.meetings-with-ai` (all
  slot-only today)

**Media-specific:**

- `t.generative-media-101` (orientation + rights + literacy, merged)
- `t.image-generation`, `t.video-generation`, `t.voice-and-audio` (all
  slot-only today)

**Dev-specific:**

- `t.tool-use`, `t.agents-intro` (title only in seed.ts)
- `t.prompt-caching` (NEW)
- Slug fix: `t.streaming-ui` → `t.streaming`

**Vibe-specific:** none for the default (already shipped). Catalog adds:
`t.vibe-debug-with-ai`, `t.vibe-ship-and-survive`, `t.vibe-security`,
`t.mcp-for-vibe`.

Total: **14 new lesson/quiz pairs** + 1 slug fix. `t.ai-literacy` is the
highest-leverage single piece (reuses across student + office, addresses
the user's explicit ask, and unblocks both weakest default templates).

---

## Sources

- `revamp/src/lib/pathwayTemplates.ts` — default templates
- `revamp/src/db/seed.ts` — topics, lessons, quizzes that exist
- `revamp/src/lib/audience.ts` — pathway model
- `revamp/docs/research-vibe-pathway.md` — prior vibe-pathway research (reused)
- `revamp/STATE.md` — shipped + active chunk log
