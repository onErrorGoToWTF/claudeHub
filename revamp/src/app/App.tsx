import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AppShell } from './AppShell'
import { Dashboard } from '../pages/Dashboard'
import { Learn } from '../pages/Learn'
import { TopicDetail } from '../pages/TopicDetail'
import { LessonView } from '../pages/LessonView'
import { QuizView } from '../pages/QuizView'
import { Projects } from '../pages/Projects'
import { ProjectNew } from '../pages/ProjectNew'
import { ProjectDetail } from '../pages/ProjectDetail'
import { Library } from '../pages/Library'
import { LibraryDetail } from '../pages/LibraryDetail'
import { seedIfEmpty } from '../db/seed'

export function App() {
  const location = useLocation()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    seedIfEmpty().then(() => setReady(true))
  }, [])

  if (!ready) return null

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
            <Route path="/learn/topic/:topicId" element={<TopicDetail />} />
            <Route path="/learn/lesson/:lessonId" element={<LessonView />} />
            <Route path="/learn/quiz/:quizId" element={<QuizView />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/new" element={<ProjectNew />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/library" element={<Library />} />
            <Route path="/library/:id" element={<LibraryDetail />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </AppShell>
  )
}
