import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AstrionProvider, useAstrion } from './context/AstrionContext'
import { LandingPage } from './pages/LandingPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { ToastContainer } from './components/shared/ToastContainer'

const AppContent: React.FC = () => {
  const { viewMode } = useAstrion()

  return (
    <div className="relative min-h-screen bg-space-900 text-slate-100 overflow-x-hidden selection:bg-astro-blue/30 selection:text-cyan-200">
      <AnimatePresence mode="wait">
        {viewMode === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <LandingPage />
          </motion.div>
        ) : (
          <motion.div
            key="workspace"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <WorkspacePage />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  )
}

export function App() {
  return (
    <AstrionProvider>
      <AppContent />
    </AstrionProvider>
  )
}

export default App
