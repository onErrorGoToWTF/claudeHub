import type { UserPathway } from './audience'

/** Starting pathway template per audience. The seed function filters to
 *  topics that actually exist in the DB at stamp time, so missing IDs
 *  (e.g., topics slated for the Chunk F content expansion) silently drop
 *  until they exist. Templates live here — not in the DB — so they ship
 *  with the build and can be iterated in code review. */
/** `'all'` has no template of its own — users on the "all" pathway see the
 *  whole catalog and don't get a starter plan stamped. Callers should skip
 *  seeding when the user's pathway is 'all'. */
export const PATHWAY_TEMPLATES: Record<Exclude<UserPathway, 'all'>, string[]> = {
  // Each array is in the suggested study order. First existing item
  // becomes position 0 at stamp time.
  student: [
    't.tokens',
    't.transformers',
    't.prompt-basics',
    't.prompt-patterns',
    't.models-compared',
  ],
  office: [
    't.prompt-basics',
    't.prompt-patterns',
    't.claude-for-office',
    't.docs-with-ai',
    't.meetings-with-ai',
  ],
  media: [
    't.prompt-basics',
    't.image-generation',
    't.video-generation',
    't.voice-cloning-ethics',
    't.media-workflow',
  ],
  // Vibe order revised per research: orient first (what/why), then
  // prompting basics, tool landscape, Claude Code, then the iteration loop
  // (the rename of the old vibe-workflow). Chunk F authors the content.
  vibe: [
    't.vibe-what-and-why',
    't.prompt-basics',
    't.vibe-tools-compared',
    't.claude-code-basics',
    't.vibe-iteration-loop',
  ],
  dev: [
    't.tokens',
    't.prompt-patterns',
    't.tool-use',
    't.agents-intro',
    't.streaming-ui',
  ],
}
