import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserPathway } from '../lib/audience'

interface UserState {
  pathway: UserPathway
  setPathway: (p: UserPathway) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      pathway: 'all',
      setPathway: (pathway) => set({ pathway }),
    }),
    {
      name: 'ai-user-prefs',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
