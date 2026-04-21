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

  'i.claude-haiku': `
**TL;DR** — Claude Haiku 4.5 is the speedy, cheap end of the Claude family — fast enough for routing, classification, and high-volume bulk work where Sonnet or Opus would be overkill, while still inheriting the family's voice and safety posture.

## What it's built for

- **Classification and routing.** Is this ticket bug / feature / spam? → Haiku.
- **Summarization at volume.** Collapse 5,000 reviews into themes.
- **Data extraction.** Pulling structured fields out of messy text.
- **First-pass drafts** that a human or a Sonnet call refines.

## When to step up to Sonnet

- Answers need nuance, not just categories.
- Multi-step reasoning across several documents.
- User-facing writing where voice and judgment matter.

## Pairing pattern

The canonical "smart-funnel" shape:

> **Haiku classifies → Sonnet handles → Opus escalates.**

Haiku decides "does this need more thinking?" Sonnet does the work. Opus only sees the hardest 10%. You get Opus-quality judgment on the high-stakes cases without paying Opus prices for the whole volume.

## Pricing

On the API, Haiku 4.5 is multiple times cheaper than Sonnet per token, and ~20× cheaper than Opus. Prompt caching helps even more if your system prompt is stable across many Haiku calls.

## Recent releases

- **Haiku 4.5** *(current)* — faster, more accurate for classification + extraction.
- **Haiku 4** — 4.x debut of the small model.
- **Haiku 3.5** — previous generation.

## Sources

- [Claude — models overview](https://docs.claude.com/en/docs/about-claude/models)
- [Anthropic — pricing](https://www.anthropic.com/pricing)
- [Prompt caching](https://docs.claude.com/en/docs/build-with-claude/prompt-caching)
`.trim(),

  'i.gemini': `
**TL;DR** — Gemini is Google's frontier model family, strongest when you need big context windows, tight integration with Google surfaces (Workspace, Search, YouTube, Android), or Google-exclusive generative media (Nano Banana, Veo, Imagen); the main flavors are Pro (quality), Flash (speed), and Nano (on-device).

## The family

- **Gemini Pro** — the flagship reasoning model. Comparable to GPT / Sonnet for most tasks.
- **Gemini Flash** — fast + cheap; used inside Google products and for high-volume API work.
- **Gemini Nano** — runs on-device on Pixel / select Androids for local AI features.
- **Deep Research** — an agentic mode in the Gemini app that researches, cites, and reports.

## Where Gemini genuinely shines

- **Very long context.** 1M-token window on Gemini Pro (experimental 2M variants); good for whole-codebase reading or multi-hour transcripts.
- **Multimodal defaults.** Vision + audio inputs are native and strong.
- **Google-surface integration.** Gmail, Docs, Sheets, Calendar, YouTube — Gemini can read and act on them with your account.
- **Generative media.** Nano Banana (fast image), Veo (video), Imagen (image) are all under the Gemini umbrella.

## Access

- **Consumer:** [gemini.google.com](https://gemini.google.com). Free tier + Gemini Advanced ($20/mo within Google One AI Premium).
- **Developer:** [Google AI Studio](https://aistudio.google.com/) and Vertex AI (enterprise tier).

## When to reach for Gemini over Claude / GPT

- Massive context (1M tokens) on a single call.
- You need generative image or video inline with the chat.
- You're building on Google Workspace data.
- You want free generous limits on Flash for bulk work.

## Sources

- [Gemini](https://gemini.google.com/)
- [Google DeepMind — Gemini](https://deepmind.google/technologies/gemini/)
- [Google AI Studio](https://aistudio.google.com/)
- [Vertex AI — Gemini](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/overview)
`.trim(),

  'i.grok': `
**TL;DR** — Grok is xAI's frontier model, integrated deeply with X (Twitter); distinctive for real-time social-graph data access, an unfiltered voice, and native generative image + video under the Aurora + Grok Imagine features.

## What's distinct

- **Real-time X data.** Grok can pull recent posts, threads, and trending topics — useful for news-aware answers in a way most models lack.
- **Aurora image gen.** Strong text-in-image and photoreal defaults.
- **Grok Imagine (video).** Native video generation for short-form clips inside the Grok app.
- **Less-filtered tone** than Claude / Gemini; occasionally a feature, often a liability.

## Access

- **Consumer:** [grok.com](https://grok.com/) or the Grok app on X.
- **X Premium+** includes Grok access as part of the subscription.
- **Developer:** xAI API at [x.ai](https://x.ai/) — OpenAI-compatible endpoint schema.

## When to reach for Grok

- You need current-moment social context (news, sports, market chatter) baked into the answer.
- You want generative image/video tied to the same chat context.
- You're building on the X ecosystem.

## When to skip it

- Safety- or brand-sensitive deployments — Grok's tone is less reliably professional.
- Long-running agentic tasks — other models have more mature tool-use + SDK stories.
- Ecosystem depth (Workspace, MCP, first-class IDE integrations) isn't here yet.

## Sources

- [Grok](https://grok.com/)
- [xAI — API](https://x.ai/)
- [xAI — models](https://docs.x.ai/docs/models)
`.trim(),

  'i.llama': `
**TL;DR** — Llama is Meta's open-weights model family — free to download, fine-tune, and run on your own hardware; the default choice when you need a model you *own* rather than rent, with ecosystem support from Groq, Cerebras, Together, and most inference providers.

## Why it matters

- **Open weights.** You can download and host it; no API lock-in.
- **Fine-tunable.** LoRA / QLoRA training on consumer GPUs, full fine-tuning on cloud GPUs.
- **Licensing.** Llama's license permits commercial use with some restrictions (very large businesses need Meta's approval).

## The variants

- **Llama 3.x / 4.x Instruct** — chat-tuned, what you use out of the box.
- **Llama Vision** — multimodal image + text.
- **Llama Code** — code-specialized checkpoints (some generations).

Parameter counts range from small (8B, fits on a laptop GPU) to huge (405B+, cloud-only).

## How to actually run it

- **Laptop / desktop:** [Ollama](https://ollama.com/) — one command to download and run.
- **Browser:** WebLLM (runs fully in the browser via WebGPU).
- **API (hosted):** Groq, Together, Fireworks, Replicate, Amazon Bedrock.
- **Self-host at scale:** vLLM or TGI on your own GPUs.

## When to reach for Llama over Claude / GPT

- Privacy: sensitive data never leaves your infrastructure.
- Cost at scale: hosted Llama on Groq is dramatically cheaper per token than frontier closed models.
- Customization: you need a model fine-tuned on your domain.
- Offline: air-gapped environments where API access isn't possible.

## When to stay closed

- You care more about peak quality than ownership.
- You don't want to manage inference infra.
- You need the tool-use / MCP / agent tooling that the closed ecosystems have more of.

## Sources

- [Meta AI — Llama](https://ai.meta.com/llama/)
- [Llama — Hugging Face](https://huggingface.co/meta-llama)
- [Ollama](https://ollama.com/)
- [Groq — hosted Llama](https://console.groq.com/)
`.trim(),

  'i.mistral': `
**TL;DR** — Mistral is a French AI company shipping both open-weights models (Mistral 7B, Mixtral, Ministral) and a commercial frontier model (Mistral Large, Mistral Medium 3); leaner than Meta's open models, strong on European languages, and the leading European frontier-model alternative.

## The lineup

- **Mistral Large / Medium** — frontier-level proprietary models via La Plateforme (Mistral's API).
- **Mixtral 8×22B / 8×7B** — mixture-of-experts open-weights; fast per-token.
- **Mistral 7B / Ministral** — compact open-weights for edge + self-hosting.
- **Codestral** — code-specialized model.
- **Pixtral** — multimodal variant.

## Why people pick Mistral

- **European data residency.** EU-hosted inference for GDPR-sensitive deployments.
- **Multilingual defaults.** Strong on French, German, Spanish, Italian; often beats US-centric models on those.
- **Open + closed mix.** You can start on La Plateforme and graduate to self-hosting the open weights as scale grows.

## Access

- **API:** La Plateforme at [console.mistral.ai](https://console.mistral.ai).
- **Open models:** Hugging Face, Ollama, Together, Groq.
- **Chat:** [Le Chat](https://chat.mistral.ai/) — Mistral's consumer chat UI (free tier).

## When to reach for Mistral

- Your team / users are in Europe and data residency matters.
- You want open weights with Apache 2.0 licensing.
- Multilingual workloads where Mistral's European-language tuning pays off.

## When to skip

- You need frontier-level reasoning — Claude / GPT / Gemini generally lead benchmarks today.
- You're already on Llama — Mistral's open models are great but you probably don't need both.

## Sources

- [Mistral AI](https://mistral.ai/)
- [La Plateforme — docs](https://docs.mistral.ai/)
- [Le Chat](https://chat.mistral.ai/)
- [Mistral on Hugging Face](https://huggingface.co/mistralai)
`.trim(),

  'i.deepseek': `
**TL;DR** — DeepSeek is a Chinese open-weights lab whose R1 reasoning model made frontier-tier reasoning freely available at a fraction of the cost; its V3 + R1 releases reshaped the cost curve for deep-thinking models in 2025.

## Why it shook things up

- **R1** — open-weights chain-of-thought reasoning model competitive with OpenAI's o1 at a fraction of the training + inference cost.
- **V3** — the base model behind R1; strong general-purpose with very favorable pricing.
- **Open weights + reasoning traces** — you can download R1 and see how it thinks, which also enables fine-tuning on top of its reasoning style.

## Where it fits

- **Reasoning-heavy tasks** where you'd otherwise reach for Opus or o1, at much lower cost.
- **Open-weights self-hosting** — like Llama and Mistral, you can run DeepSeek on your own infra.
- **Code + math benchmarks** where DeepSeek performs at or near frontier.

## Access

- **Chat:** [chat.deepseek.com](https://chat.deepseek.com/) — free tier.
- **API:** DeepSeek API, OpenAI-compatible.
- **Open weights:** Hugging Face, Ollama.
- **Hosted on:** Together, Fireworks, and several Chinese clouds.

## Caveats

- Chinese provenance matters for some deployments — data residency, regulatory, and geopolitical considerations.
- Tool-use and ecosystem tooling (MCP, Agent SDKs) trail Anthropic / OpenAI.
- The chat product is censored on some topics per Chinese regulation; self-hosted weights aren't.

## When to reach for it

- Tight budget, reasoning-heavy use case (code debugging, math, complex planning).
- You want open-weights reasoning to experiment with or fine-tune.
- A second-opinion model that's meaningfully different from Claude / GPT / Gemini.

## Sources

- [DeepSeek](https://www.deepseek.com/)
- [DeepSeek — API docs](https://api-docs.deepseek.com/)
- [DeepSeek on Hugging Face](https://huggingface.co/deepseek-ai)
`.trim(),

  'i.gpt': `
**TL;DR** — OpenAI's GPT family (via ChatGPT + the OpenAI API) is the other frontier LLM you should know; pragmatically handy as a second opinion or for features where OpenAI's ecosystem (Whisper, DALL·E, Sora, Realtime voice) is what you actually need.

## Why keep access

- **Second opinion.** When Claude pushes back hard or isn't landing, GPT's disagreement or agreement is data.
- **Ecosystem features.** Realtime voice API, Whisper (ASR), Sora (video), DALL·E (image), Canvas. Some of these have no direct Anthropic equivalent today.
- **Assistants + Tool-use parity.** Function calling, structured outputs, vision — covered.

## Plans to know

- **Free** — limited GPT-4o mini + basic GPT-4o, rate-limited.
- **Plus** ($20/mo) — higher limits, image gen, Canvas, Advanced Voice.
- **Pro** ($200/mo) — \`o1\` / \`o1-pro\` for heavy reasoning, higher Sora limits.
- **Team / Enterprise** — admin, privacy guarantees, SSO.

## When to reach for GPT over Claude

- You want image or video gen inline with chat (DALL·E, Sora).
- You're on a Realtime voice project — OpenAI's Realtime API is ahead of Anthropic's offerings today.
- A specific benchmark or eval you care about ranks GPT higher for your task shape.

## When to stay on Claude

- Long-context code and writing — Opus and Sonnet lead on many practical agentic + long-doc tasks.
- Your workflow is built around Claude Code / Agent SDK / MCP.
- You care about Anthropic's safety posture + constitutional framing specifically.

## Sources

- [OpenAI — main site](https://openai.com/)
- [OpenAI API — docs](https://platform.openai.com/docs)
- [OpenAI — pricing](https://openai.com/pricing)
- [OpenAI — models overview](https://platform.openai.com/docs/models)
`.trim(),

  'i.elevenlabs': `
**TL;DR** — ElevenLabs is the reference for AI narration — expressive text-to-speech, accurate voice cloning, multilingual dubbing, and a real-time conversational voice API; if an AI product needs to *sound* polished, this is usually the answer.

## What it does best

- **Narration.** Audiobook and documentary-grade TTS that genuinely sounds like a person performing.
- **Voice cloning.** Instant clone from 1 minute of audio; Professional Voice Clone from ~30 min for top fidelity.
- **Multilingual.** One voice across 30+ languages with consistent character.
- **Real-time Conversational AI.** Low-latency voice-in / voice-out API for phone-style AI agents.
- **Dubbing.** Translate + re-voice a video while preserving the original performance.

## Settings worth knowing

- **Stability** — lower = more expressive and variable; higher = more consistent but flatter.
- **Similarity** — how closely the output tracks the cloned voice.
- **Style** — (v2 voices) how exaggerated the performance is.

Common recipe: stability 40–60, similarity 70–80, style 0–20 for natural narration.

## API example

\`\`\`ts
import { ElevenLabsClient } from 'elevenlabs'

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! })
const audio = await client.textToSpeech.convert('voice_id_here', {
  text: 'Hello from ElevenLabs.',
  modelId: 'eleven_multilingual_v2',
})
\`\`\`

## When to reach for it

- Any narration-quality voice-over.
- Voice cloning for consistent branded narration across episodes.
- Real-time AI phone / agent voice.

## When something else fits

- **Browser SpeechSynthesis** — free, terrible sound, but zero dependency.
- **OpenAI TTS** — cheaper, decent quality, simpler API if you're already in OpenAI.
- **Cartesia / PlayHT** — alternatives closing in on ElevenLabs; worth comparing on price/latency for your voice.

## Pricing

Free tier: ~10K characters/month. Starter ($5/mo), Creator ($22), Pro ($99), Scale + Enterprise. Real-time voice + Professional Clones are higher tiers.

## Sources

- [ElevenLabs — main site](https://elevenlabs.io/)
- [ElevenLabs — docs](https://elevenlabs.io/docs)
- [ElevenLabs — voice lab](https://elevenlabs.io/voice-lab)
- [ElevenLabs — conversational AI](https://elevenlabs.io/conversational-ai)
`.trim(),

  'i.davinci': `
**TL;DR** — DaVinci Resolve is a free, professional-grade video editor + color-grading + audio-post suite — the same tool used on major films — with a free tier powerful enough for almost everything short of IMAX-tier finishing.

## What's in it

Seven integrated pages (tabs), each a complete tool:

- **Media** — import, organize, proxy generation.
- **Cut** — fast-paced editing for social and docs.
- **Edit** — traditional timeline editing (think Premiere).
- **Fusion** — node-based VFX + motion graphics (think After Effects).
- **Color** — industry-leading color grading (what DaVinci was born for).
- **Fairlight** — multitrack audio post.
- **Deliver** — render to any codec/format.

Every tab shares one project file — no round-tripping between apps.

## Free vs. Studio

**Free** covers 90% of needs: unlimited tracks, H.264/H.265, most Fusion effects, full color.

**Studio** ($295 one-time) adds: 4K+ export, advanced noise reduction, stereoscopic 3D, more Fusion nodes, hardware accel for some codecs. One-time purchase; no subscription.

## Why people stick

- **Color grading** is genuinely best-in-class — the reason Hollywood colorists use it.
- **One file, no round-tripping.** Edit, grade, mix in the same project.
- **Hardware-aware** — scales with GPU; a modern Mac or PC runs it well.
- **No subscription.** Unlike Premiere + After Effects, you can use Resolve forever free.

## Learning curve

Real — especially Fusion (node-based is a different mindset than layer-based). Start in **Edit**, grade in **Color**, ignore Fusion until you need motion graphics. Blackmagic's free training courses + Casey Faris's YouTube channel are the two best learning paths.

## When to pick something else

- **CapCut** — social content, quick cuts, you don't need color.
- **Final Cut Pro** — you're on Mac and want the Apple-integrated pipeline.
- **Premiere + After Effects** — your team already lives in Adobe and a switch would cost more than it saves.

## Sources

- [Blackmagic — DaVinci Resolve](https://www.blackmagicdesign.com/products/davinciresolve)
- [DaVinci Resolve — training](https://www.blackmagicdesign.com/products/davinciresolve/training)
- [Blackmagic — manuals + downloads](https://www.blackmagicdesign.com/support/family/davinci-resolve-and-fusion)
`.trim(),

  'i.midjourney': `
**TL;DR** — Midjourney is the painterly / cinematic end of AI image generation — the strongest aesthetic defaults of any model, best when you want a finished-looking image from a short prompt, and still a subscription service you mostly drive from the web or a Discord bot.

## What it's best at

- **Cinematic photos** — moody lighting, anamorphic lens looks, depth-of-field.
- **Painterly illustration** — watercolor, oil, gouache, concept-art energy.
- **Character + environment studies** — consistent style across variants.

## What it's weaker at

- **Text inside images** — still uneven. Use Nano Banana or Ideogram for typography-heavy images.
- **Tight editorial control** — it loves dramatic; getting clean product-photography plate shots takes prompt wrestling.
- **Multi-subject compositions** with precise placement — draft the layout elsewhere and use Midjourney for a pass.

## Prompt basics

- Lead with subject, then setting, then mood/lens cues.
- \`--ar 16:9\` sets aspect ratio. \`--stylize 100\` dials the aesthetic push; lower = more literal.
- \`--sref <url>\` conditions on a style reference image. \`--cref <url>\` conditions on a character reference.
- \`--no\` excludes concepts from the image ("--no text" often helps).

## Iteration pattern

- Generate 4 variants (default grid).
- \`V1–V4\` re-rolls that variant. \`U1–U4\` upscales. \`Vary (Strong/Subtle)\` explores adjacent takes.
- Save style seeds you like; reuse via \`--sref\`.

## Access

Web UI at midjourney.com (main way to use it as of 2025). Discord bot still works but most users have moved to the web. Subscription plans start around $10/mo.

## Sources

- [Midjourney — main site](https://www.midjourney.com/)
- [Midjourney — docs](https://docs.midjourney.com/)
- [Midjourney — prompt guide](https://docs.midjourney.com/hc/en-us/articles/32528614141581-Prompts)
`.trim(),

  'i.nano-banana': `
**TL;DR** — Nano Banana is Google's nickname for Gemini 3.1 Flash Image — the fastest in-chat image generator with genuinely accurate text rendering; use it when you want an image *right now*, or when words need to show up inside the picture.

## Why it's distinct

- **Speed.** Generations return in a second or two; fast enough to ideate interactively.
- **Text inside images.** Signs, titles, labels, UI mockups all render legibly — a long-standing weakness for image models.
- **In-chat.** It's part of Gemini Chat; no separate app or Discord bot.
- **Free tier** on the Gemini consumer app.

## Prompting

Plainspoken prompts work best:

> "A poster reading 'aiUniversity' in bold serif, cream background, faint grid, small orange lightning bolt above the title."

Add constraints with plain language: "no people", "flat vector style", "4:5 aspect ratio".

## When to reach for it

- Social posts, quick marketing imagery, meeting mocks.
- Diagrams or signage that need accurate letters.
- Ideation — iterate twenty prompts in the time Midjourney fetches one.

## When to switch to Midjourney

- You want polish and mood depth over speed and accuracy.
- The final image is camera-perfect or illustrative rather than utility-first.

## Access

Free via [gemini.google.com](https://gemini.google.com) on any Google account. Also available via the Gemini API for programmatic use.

## Sources

- [Gemini](https://gemini.google.com/)
- [Google DeepMind — Gemini](https://deepmind.google/technologies/gemini/)
- [Google — generative AI image overview](https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview)
`.trim(),

  'i.veo': `
**TL;DR** — Veo 3.1 is Google DeepMind's best-in-class generative video model — 4K @ 60fps, synchronized audio, and first/last-frame conditioning for interpolation; practically the only model that gives you finished-looking video from a prompt.

## What sets it apart

- **Synchronized audio.** Sound effects, ambient noise, even subtle dialogue aligned to the action — not just silent clips.
- **4K @ 60fps.** Upscaling + frame-rate support that past video models couldn't touch.
- **First-frame / last-frame conditioning.** Provide two stills (from Nano Banana, Midjourney, or photos) and Veo animates the interpolation.
- **Prompt-to-scene fidelity.** Camera moves, subject actions, lighting cues — it listens.

## Prompt ingredients that matter

- **Subject.** "A golden retriever."
- **Action.** "Chasing a red ball across wet grass."
- **Camera.** "Slow dolly-in, shallow depth of field."
- **Lighting.** "Warm late-afternoon backlight."
- **Audio cue.** "Soft paw splashes, distant birdsong."

Treat it like a director's shot list, not a one-liner.

## Clip length

Most public access caps at ~8s clips today. Chain clips with first/last-frame conditioning to build longer sequences. **Google Flow** is the canvas that makes this chaining visual.

## Access

- **Gemini Advanced** subscribers get Veo in the Gemini app for free-form prompts.
- **Google AI Studio / Vertex AI** for API access.
- **Google Flow** for keyframe-chained productions.

## When Veo fits

- Short-form social content.
- Motion storyboards — previz for something you'll shoot or animate properly.
- Product shots with light motion ("package rotating, soft studio light").

## Sources

- [Veo — product page](https://deepmind.google/technologies/veo/)
- [Google Flow](https://labs.google/flow/)
- [Gemini Advanced — video](https://gemini.google.com/)
- [Vertex AI — generative video](https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview)
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

## Recent releases

- **Opus 4.7** *(current)* — 1M-token variant, stronger agentic tool-use, improved reasoning on long tasks.
- **Opus 4.6** — preceding flagship; 4.x family's first major step up in agentic steadiness.
- **Opus 4 / 4.1** — introduced the 4.x architecture and extended thinking.
- **Opus 3 / 3.5** — the predecessor generation. Still referenced in third-party benchmarks.

Dates and exact deltas drift. Check the model card for the authoritative current list.

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

## Recent releases

- **Sonnet 4.6** *(current)* — the workhorse revision of the 4.x family; long-context, tool-use, and coding all bumped.
- **Sonnet 4.5** — previous revision; still performant and cheaper on older tiers.
- **Sonnet 4** — the 4.x family's debut Sonnet.
- **Sonnet 3.7 / 3.5** — predecessor generation; benchmark reference point.

Dates and deltas drift. Check the model card for the authoritative list.

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
