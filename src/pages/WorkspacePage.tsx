import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppSidebar } from '../components/layout/AppSidebar'
import { AppTopBar } from '../components/layout/AppTopBar'
import { MissionControlPage } from './MissionControlPage'
import { ObservationExplorerPage } from './ObservationExplorerPage'
import { DetectionLabPage } from './DetectionLabPage'
import { TrackingStudioPage } from './TrackingStudioPage'
import { CandidateIntelligencePage } from './CandidateIntelligencePage'
import { ScientificReportsPage } from './ScientificReportsPage'
import { DataSourcesPage } from './DataSourcesPage'
import { SettingsPage } from './SettingsPage'
import { FITSImportModal } from '../components/dashboard/FITSImportModal'
import { NewAnalysisModal } from '../components/dashboard/NewAnalysisModal'
import { useAstrion } from '../context/AstrionContext'

export const WorkspacePage: React.FC = () => {
  const { activeRoute } = useAstrion()

  const renderActiveRoute = () => {
    switch (activeRoute) {
      case 'mission-control':
        return <MissionControlPage />
      case 'observation-explorer':
        return <ObservationExplorerPage />
      case 'detection-lab':
        return <DetectionLabPage />
      case 'tracking-studio':
        return <TrackingStudioPage />
      case 'candidate-intelligence':
        return <CandidateIntelligencePage />
      case 'scientific-reports':
        return <ScientificReportsPage />
      case 'data-sources':
        return <DataSourcesPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <MissionControlPage />
    }
  }

  return (
    <div className="flex h-screen w-full bg-space-900 text-slate-100 overflow-hidden select-none">
      {/* Workspace Sidebar */}
      <AppSidebar />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar */}
        <AppTopBar />

        {/* Scrollable Viewport Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 bg-space-900">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRoute}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="h-full"
            >
              {renderActiveRoute()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <FITSImportModal />
      <NewAnalysisModal />
    </div>
  )
}
