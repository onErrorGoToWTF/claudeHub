import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AppShell } from './AppShell'
import { Dashboard } from '../pages/Dashboard'
import { Learn } from '../pages/Learn'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { seedIfEmpty } from '../db/seed'

// Code-split heavier + less-frequently-reached routes so the initial bundle
// stays lean. Dashboard + Learn stay eager (they're the most-likely landings
// and the AppShell renders them fastest with no Suspense flicker).
const CustomPathway   = lazy(() => import('../pages/CustomPathway').then(m => ({ default: m.CustomPathway })))
const Me              = lazy(() => import('../pages/Me').then(m => ({ default: m.Me })))
const Colophon        = lazy(() => import('../pages/Colophon').then(m => ({ default: m.Colophon })))
const Feedback        = lazy(() => import('../pages/Feedback').then(m => ({ default: m.Feedback })))
const TopicDetail     = lazy(() => import('../pages/TopicDetail').then(m => ({ default: m.TopicDetail })))
const LessonView      = lazy(() => import('../pages/LessonView').then(m => ({ default: m.LessonView })))
const QuizView        = lazy(() => import('../pages/QuizView').then(m => ({ default: m.QuizView })))
const Projects        = lazy(() => import('../pages/Projects').then(m => ({ default: m.Projects })))
const ProjectNew      = lazy(() => import('../pages/ProjectNew').then(m => ({ default: m.ProjectNew })))
const ProjectDetail   = lazy(() => import('../pages/ProjectDetail').then(m => ({ default: m.ProjectDetail })))
const Library         = lazy(() => import('../pages/Library').then(m => ({ default: m.Library })))
const LibraryDetail   = lazy(() => import('../pages/LibraryDetail').then(m => ({ default: m.LibraryDetail })))
const LibraryWishlist = lazy(() => import('../pages/LibraryWishlist').then(m => ({ default: m.LibraryWishlist })))
const Settings        = lazy(() => import('../pages/Settings').then(m => ({ default: m.Settings })))
const SignIn          = lazy(() => import('../pages/SignIn').then(m => ({ default: m.SignIn })))
const LabsAtom        = lazy(() => import('../pages/LabsAtom').then(m => ({ default: m.LabsAtom })))
const LabsAtomBlend   = lazy(() => import('../pages/LabsAtomBlend').then(m => ({ default: m.LabsAtomBlend })))

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
    return (
      <ErrorBoundary>
        <Suspense fallback={null}><SignIn /></Suspense>
      </ErrorBoundary>
    )
  }

  // /labs/* — diagnostic / experimental stages. Renders bare, outside
  // the AppShell topbar + bottom nav, so the page is a full canvas for
  // prototyping. Not linked from anywhere; direct URL access.
  if (location.pathname.startsWith('/labs/')) {
    return (
      <ErrorBoundary>
        <Suspense fallback={null}>
          <Routes location={location}>
            <Route path="/labs/atom" element={<LabsAtom />} />
            <Route path="/labs/atom-blend-test" element={<LabsAtomBlend />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
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
            <Suspense fallback={null}>
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
                <Route path="/colophon" element={<Colophon />} />
                <Route path="/feedback" element={<Feedback />} />
                {/* /labs/* routes render bare, outside the shell — see early return above. */}
                {/* Legacy: /onboarding now redirects to home — onboarding retired. */}
                <Route path="/onboarding" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Dashboard />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </AppShell>
    </ErrorBoundary>
  )
}
