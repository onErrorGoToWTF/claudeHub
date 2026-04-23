import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserPathway } from '../lib/audience'

/** Device types the user owns / uses. Informs bootstrapper + tool
 *  recommendations once those surfaces exist. */
export type Device = 'mac' | 'windows' | 'linux' | 'iphone' | 'android' | 'ipad'

/** Work-style tags. Permissive set — a single user can be multiple
 *  ('engineer' + 'frontend', 'no_code' + 'vibe_code', etc.). Free-form
 *  strings on the DB side so we can grow the vocabulary without a
 *  migration. Keep the TS union honest as the canonical list. */
export type WorkStyle =
  | 'no_code'     // Office — prompts + Projects + Artifacts only
  | 'vibe_code'   // Office — light prompting-for-code without being a dev
  | 'engineer'    // Dev — software engineer generally
  | 'frontend'    // Dev — frontend-leaning
  | 'backend'     // Dev — backend-leaning
  | 'fullstack'   // Dev — both ends
  | 'research'    // Dev/student — ML / paper reading / analysis

/** Profile fields are ALL optional. The profile is a permissive help
 *  surface — the app works without any of it set. Filled via a future
 *  settings / onboarding page. */
export interface UserProfile {
  pathway:        UserPathway        // required, drives default content filter
  handle?:        string
  workStyles?:    WorkStyle[]
  devices?:       Device[]
  yearsCoding?:   number
  /** Topics the user has told us they already know — Learn can dim,
   *  collapse, or auto-complete them. */
  knownTopicIds?: string[]
}

interface UserState extends UserProfile {
  /** Set after the user skips or finishes onboarding. First-run guard
   *  in App.tsx uses this to decide whether to auto-redirect to the
   *  onboarding flow. Users can always revisit /onboarding manually. */
  onboardingSeen:   boolean
  setPathway:       (p: UserPathway)        => void
  setHandle:        (h: string | undefined) => void
  setWorkStyles:    (s: WorkStyle[])        => void
  setDevices:       (d: Device[])           => void
  setYearsCoding:   (y: number | undefined) => void
  setKnownTopicIds: (ids: string[])         => void
  /** Mark/unmark a single topic as known. */
  toggleKnownTopic: (topicId: string)       => void
  markOnboardingSeen: ()                    => void
  /** Wipe every optional field back to defaults. Handy for "reset profile". */
  resetProfile:     ()                      => void
}

const DEFAULTS: UserProfile & { onboardingSeen: boolean } = {
  pathway: 'all',
  // Default "signed-in-as-admin" handle for the pre-auth build. Once real
  // auth lands, the initial value comes from the session and this default
  // becomes a fallback for offline/guest.
  handle: 'admin',
  workStyles: [],
  devices: [],
  yearsCoding: undefined,
  knownTopicIds: [],
  onboardingSeen: false,
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setPathway:       (pathway)       => set({ pathway }),
      setHandle:        (handle)        => set({ handle }),
      setWorkStyles:    (workStyles)    => set({ workStyles }),
      setDevices:       (devices)       => set({ devices }),
      setYearsCoding:   (yearsCoding)   => set({ yearsCoding }),
      setKnownTopicIds: (knownTopicIds) => set({ knownTopicIds }),
      toggleKnownTopic: (topicId) => set((prev) => {
        const curr = new Set(prev.knownTopicIds ?? [])
        if (curr.has(topicId)) curr.delete(topicId)
        else curr.add(topicId)
        return { knownTopicIds: [...curr] }
      }),
      markOnboardingSeen: () => set({ onboardingSeen: true }),
      resetProfile: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'ai-user-prefs',
      storage: createJSONStorage(() => localStorage),
      // Bump version when the shape changes. Zustand drops older payloads.
      version: 2,
    },
  ),
)
