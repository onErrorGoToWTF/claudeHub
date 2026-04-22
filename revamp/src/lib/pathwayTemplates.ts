import type { UserPathway } from './audience'

/** Starting pathway template per audience. The seed function filters to
 *  topics that actually exist in the DB at stamp time, so missing IDs
 *  silently drop until they exist. Templates live here — not in the DB —
 *  so they ship with the build and can be iterated in code review.
 *
 *  `'all'` has no template of its own — users on the "all" pathway see the
 *  whole catalog and don't get a starter plan stamped. Callers should skip
 *  seeding when the user's pathway is 'all'.
 *
 *  Coverage revised per docs/research-pathway-coverage.md (2026-04-22):
 *    - student + office lead with literacy, not mechanics.
 *    - dev adds prompt caching (highest-leverage production feature);
 *      fixes the t.streaming-ui → t.streaming slug mismatch by removing
 *      the slot (streaming stays available via the catalog).
 *    - media leads with t.generative-media-101 (orientation + rights).
 *    - vibe unchanged — strongest of the five already. */
export const PATHWAY_TEMPLATES: Record<Exclude<UserPathway, 'all'>, string[]> = {
  student: [
    't.ai-literacy',        // literacy before mechanics
    't.prompt-basics',
    't.tokens',             // the one foundations concept a student benefits from
    't.models-compared',
    't.ai-for-students',    // integrity + study use + privacy
  ],
  office: [
    't.prompt-basics',
    't.ai-literacy-at-work', // verify, sign your name, confidentiality
    't.claude-for-office',
    't.docs-with-ai',
    't.meetings-with-ai',
  ],
  media: [
    't.generative-media-101', // orientation + rights + literacy in one
    't.prompt-basics',
    't.image-generation',
    't.video-generation',
    't.voice-and-audio',
  ],
  vibe: [
    't.vibe-what-and-why',
    't.prompt-basics',
    't.vibe-tools-compared',
    't.claude-code-basics',
    't.vibe-iteration-loop',
  ],
  dev: [
    't.tokens',
    't.prompt-basics',       // universal on-ramp; prompt-patterns demotes to catalog
    't.tool-use',
    't.agents-intro',
    't.prompt-caching',      // highest-leverage single SDK feature in 2026
  ],
}
