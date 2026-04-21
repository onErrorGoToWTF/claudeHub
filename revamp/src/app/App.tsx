import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AppShell } from './AppShell'
import { Dashboard } from '../pages/Dashboard'
import { Learn } from '../pages/Learn'
import { CustomPathway } from '../pages/CustomPathway'
import { TopicDetail } from '../pages/TopicDetail'
import { LessonView } from '../pages/LessonView'
import { QuizView } from '../pages/QuizView'
import { Projects } from '../pages/Projects'
import { ProjectNew } from '../pages/ProjectNew'
import { ProjectDetail } from '../pages/ProjectDetail'
import { Library } from '../pages/Library'
import { LibraryDetail } from '../pages/LibraryDetail'
import { LibraryWishlist } from '../pages/LibraryWishlist'
import { Onboarding } from '../pages/Onboarding'
import { Settings } from '../pages/Settings'
import { seedIfEmpty } from '../db/seed'
import { useUserStore } from '../state/userStore'

export function App() {
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const onboardingSeen = useUserStore(s => s.onboardingSeen)

  useEffect(() => {
    seedIfEmpty().then(() => setReady(true))
  }, [])

  if (!ready) return null

  // First-run redirect: first visit (no dismissal flag yet) lands on
  // /onboarding. Users who skip or finish get flagged and never auto-
  // redirect again; they can still visit /onboarding manually.
  const shouldRedirectToOnboarding =
    !onboardingSeen && location.pathname !== '/onboarding'
  if (shouldRedirectToOnboarding) {
    return <Navigate to="/onboarding" replace />
  }

  // Onboarding renders outside the normal AppShell (no topbar / bottom
  // nav) to keep first-run focused on the flow.
  if (location.pathname === '/onboarding') {
    return <Onboarding />
  }

  return (
    <AppShell>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
          style={{ minHeight: '100%' }}
        >
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/learn/custom" element={<CustomPathway />} />
            <Route path="/learn/topic/:topicId" element={<TopicDetail />} />
            <Route path="/learn/lesson/:lessonId" element={<LessonView />} />
            <Route path="/learn/quiz/:quizId" element={<QuizView />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/new" element={<ProjectNew />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/library" element={<Library />} />
            <Route path="/library/wishlist" element={<LibraryWishlist />} />
            <Route path="/library/:id" element={<LibraryDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </AppShell>
  )
}
