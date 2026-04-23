import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AppShell } from './AppShell'
import { Dashboard } from '../pages/Dashboard'
import { Learn } from '../pages/Learn'
import { CustomPathway } from '../pages/CustomPathway'
import { Me } from '../pages/Me'
import { TopicDetail } from '../pages/TopicDetail'
import { LessonView } from '../pages/LessonView'
import { QuizView } from '../pages/QuizView'
import { Projects } from '../pages/Projects'
import { ProjectNew } from '../pages/ProjectNew'
import { ProjectDetail } from '../pages/ProjectDetail'
import { Library } from '../pages/Library'
import { LibraryDetail } from '../pages/LibraryDetail'
import { LibraryWishlist } from '../pages/LibraryWishlist'
import { Settings } from '../pages/Settings'
import { SignIn } from '../pages/SignIn'
import { seedIfEmpty } from '../db/seed'

export function App() {
  const location = useLocation()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    seedIfEmpty().then(() => setReady(true))
  }, [])

  // Scroll to top on route change. Without this, navigating Learn → a
  // topic → back to Learn keeps you mid-scroll on the previous page.
  // Fine for in-page anchor changes; applies per pathname change only.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  if (!ready) return null

  // Sign-in preview — renders outside the normal shell. Not linked
  // from anywhere; reachable by direct URL while the UX is iterated.
  if (location.pathname === '/signin') {
    return <SignIn />
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
            <Route path="/learn/pathway" element={<Navigate to="/me" replace />} />
            <Route path="/learn/topic/:topicId" element={<TopicDetail />} />
            <Route path="/learn/lesson/:lessonId" element={<LessonView />} />
            <Route path="/learn/quiz/:quizId" element={<QuizView />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/new" element={<ProjectNew />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/library" element={<Library />} />
            <Route path="/library/wishlist" element={<LibraryWishlist />} />
            <Route path="/library/:id" element={<LibraryDetail />} />
            <Route path="/me" element={<Me />} />
            <Route path="/settings" element={<Settings />} />
            {/* Legacy: /onboarding now redirects to home — onboarding retired. */}
            <Route path="/onboarding" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </AppShell>
  )
}
