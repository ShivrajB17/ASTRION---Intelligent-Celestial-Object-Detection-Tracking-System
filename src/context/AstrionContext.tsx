import React, { createContext, useContext, useState, useCallback } from 'react'
import type { 
  AppViewMode, 
  NavigationRoute 
} from '../types/navigation'
import type { 
  FitsObservation, 
  PipelineStage, 
  AnalysisSession, 
  ToastMessage 
} from '../types/astronomy'

const INITIAL_PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'stage-1',
    name: 'FITS Ingestion',
    description: 'Header parsing, WCS extraction, and data integrity verification',
    status: 'pending',
    progress: 0,
  },
  {
    id: 'stage-2',
    name: 'Preprocessing',
    description: '2D background estimation, noise floor modeling, and bias subtraction',
    status: 'pending',
    progress: 0,
  },
  {
    id: 'stage-3',
    name: 'Source Detection',
    description: 'Aperture flux photometry and point-spread function (PSF) extraction',
    status: 'pending',
    progress: 0,
  },
  {
    id: 'stage-4',
    name: 'Cross-Epoch Matching',
    description: 'Multi-frame alignment and stationary background star elimination',
    status: 'pending',
    progress: 0,
  },
  {
    id: 'stage-5',
    name: 'Trajectory Analysis',
    description: 'Tracklet vector calculation, angular velocity and apparent motion fit',
    status: 'pending',
    progress: 0,
  },
  {
    id: 'stage-6',
    name: 'Candidate Validation',
    description: 'MPC/Horizons cross-referencing and confidence scoring',
    status: 'pending',
    progress: 0,
  },
]

interface AstrionContextType {
  // Navigation & Shell
  viewMode: AppViewMode
  setViewMode: (mode: AppViewMode) => void
  activeRoute: NavigationRoute
  setActiveRoute: (route: NavigationRoute) => void
  isSidebarCollapsed: boolean
  toggleSidebar: () => void

  // Astronomical Data
  observations: FitsObservation[]
  addObservations: (newObs: FitsObservation[]) => void
  removeObservation: (id: string) => void
  clearObservations: () => void
  selectedObservation: FitsObservation | null
  setSelectedObservation: (obs: FitsObservation | null) => void

  // Pipeline Execution
  pipelineStages: PipelineStage[]
  isPipelineRunning: boolean
  runPipelineSimulation: () => void
  resetPipeline: () => void

  // Analysis Sessions
  activeAnalysis: AnalysisSession | null
  createAnalysis: (title: string, targetField: string) => void

  // Modals
  isNewAnalysisModalOpen: boolean
  setIsNewAnalysisModalOpen: (open: boolean) => void
  isImportModalOpen: boolean
  setIsImportModalOpen: (open: boolean) => void

  // Notifications
  toasts: ToastMessage[]
  notify: (title: string, description?: string, type?: ToastMessage['type']) => void
  dismissToast: (id: string) => void
}

const AstrionContext = createContext<AstrionContextType | undefined>(undefined)

export const AstrionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewMode, setViewMode] = useState<AppViewMode>('landing')
  const [activeRoute, setActiveRoute] = useState<NavigationRoute>('mission-control')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Astronomical Observations - Initially empty as required
  const [observations, setObservations] = useState<FitsObservation[]>([])
  const [selectedObservation, setSelectedObservation] = useState<FitsObservation | null>(null)

  // Pipeline Stages - Initially all pending as required
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(INITIAL_PIPELINE_STAGES)
  const [isPipelineRunning, setIsPipelineRunning] = useState(false)

  // Active Analysis
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisSession | null>(null)

  // Modals
  const [isNewAnalysisModalOpen, setIsNewAnalysisModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const notify = useCallback((title: string, description?: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const newToast: ToastMessage = {
      id,
      title,
      description,
      type,
      timestamp: new Date().toLocaleTimeString(),
    }
    
    setToasts((prev) => [...prev, newToast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev)
  }, [])

  const addObservations = useCallback((newObs: FitsObservation[]) => {
    setObservations((prev) => [...prev, ...newObs])
    notify(
      `Observation${newObs.length > 1 ? 's' : ''} Added`,
      `Successfully loaded ${newObs.length} FITS file${newObs.length > 1 ? 's' : ''} into active workspace.`,
      'success'
    )
  }, [notify])

  const removeObservation = useCallback((id: string) => {
    setObservations((prev) => prev.filter((o) => o.id !== id))
    if (selectedObservation?.id === id) {
      setSelectedObservation(null)
    }
    notify('Observation Removed', 'Observation removed from workspace.', 'info')
  }, [selectedObservation, notify])

  const clearObservations = useCallback(() => {
    setObservations([])
    setSelectedObservation(null)
    notify('Workspace Cleared', 'All loaded observations have been cleared.', 'info')
  }, [notify])

  const resetPipeline = useCallback(() => {
    setPipelineStages(INITIAL_PIPELINE_STAGES)
    setIsPipelineRunning(false)
    notify('Pipeline Reset', 'Pipeline status reset to pending idle state.', 'info')
  }, [notify])

  const runPipelineSimulation = useCallback(() => {
    if (observations.length === 0) {
      notify(
        'No Observations Loaded',
        'Please import at least one FITS observation before starting the pipeline.',
        'warning'
      )
      return
    }

    if (isPipelineRunning) return

    setIsPipelineRunning(true)
    notify('Pipeline Started', 'Commencing automated astronomical processing sequence...', 'info')

    // Simulate stage-by-stage progression with realistic timing
    const stages = [...INITIAL_PIPELINE_STAGES]
    let currentIdx = 0

    const advanceStage = () => {
      if (currentIdx < stages.length) {
        setPipelineStages((prev) =>
          prev.map((s, idx) => {
            if (idx === currentIdx) {
              return { ...s, status: 'running', progress: 50 }
            } else if (idx < currentIdx) {
              return { ...s, status: 'completed', progress: 100, executionTime: `${(0.4 + idx * 0.3).toFixed(1)}s` }
            }
            return s
          })
        )

        setTimeout(() => {
          setPipelineStages((prev) =>
            prev.map((s, idx) => {
              if (idx === currentIdx) {
                return { ...s, status: 'completed', progress: 100, executionTime: `${(0.5 + idx * 0.3).toFixed(1)}s` }
              }
              return s
            })
          )
          currentIdx++
          if (currentIdx < stages.length) {
            advanceStage()
          } else {
            setIsPipelineRunning(false)
            notify(
              'Pipeline Completed',
              'Ingestion, preprocessing and source tracking completed in simulation mode.',
              'success'
            )
          }
        }, 800)
      }
    }

    advanceStage()
  }, [observations.length, isPipelineRunning, notify])

  const createAnalysis = useCallback((title: string, targetField: string) => {
    const session: AnalysisSession = {
      id: `analysis-${Date.now()}`,
      title,
      targetField,
      createdAt: new Date().toISOString(),
      observationIds: observations.map((o) => o.id),
      status: 'pending',
    }
    setActiveAnalysis(session)
    notify('New Analysis Session Created', `Target field: ${targetField}`, 'success')
  }, [observations, notify])

  return (
    <AstrionContext.Provider
      value={{
        viewMode,
        setViewMode,
        activeRoute,
        setActiveRoute,
        isSidebarCollapsed,
        toggleSidebar,
        observations,
        addObservations,
        removeObservation,
        clearObservations,
        selectedObservation,
        setSelectedObservation,
        pipelineStages,
        isPipelineRunning,
        runPipelineSimulation,
        resetPipeline,
        activeAnalysis,
        createAnalysis,
        isNewAnalysisModalOpen,
        setIsNewAnalysisModalOpen,
        isImportModalOpen,
        setIsImportModalOpen,
        toasts,
        notify,
        dismissToast,
      }}
    >
      {children}
    </AstrionContext.Provider>
  )
}

export const useAstrion = () => {
  const context = useContext(AstrionContext)
  if (!context) {
    throw new Error('useAstrion must be used within an AstrionProvider')
  }
  return context
}
