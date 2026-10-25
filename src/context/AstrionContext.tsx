import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
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
import { backendApi, type ObservationRecord } from '../services/backendApi.service'

export function mapBackendRecordToObservation(rec: ObservationRecord): FitsObservation {
  return {
    id: rec.id,
    filename: rec.filename,
    sizeBytes: rec.file_size_bytes,
    uploadedAt: rec.created_at,
    targetName: rec.object_name || rec.filename.replace(/\.[^/.]+$/, ""),
    filterBand: rec.filter_band || 'Scientific Band',
    telescope: rec.telescope || 'Astronomical Instrument',
    instrument: rec.instrument || undefined,
    epochTime: rec.date_obs || undefined,
    exptime: rec.exptime ?? undefined,
    bitpix: rec.bitpix ?? undefined,
    dtype: rec.dtype ?? undefined,
    equinox: rec.equinox ?? undefined,
    raCenter: rec.ra_deg ?? undefined,
    decCenter: rec.dec_deg ?? undefined,
    wcsAvailable: rec.wcs_available,
    pixelScaleArcsec: rec.pixel_scale_arcsec ?? undefined,
    selectedHduIndex: rec.selected_hdu_index,
    selectedHduName: rec.selected_hdu_name,
    selectedHduType: rec.selected_hdu_type,
    totalHdus: rec.total_hdus,
    dimensions: rec.dimensions
      ? {
          width: rec.dimensions.width || 0,
          height: rec.dimensions.height || 0,
          naxis: rec.dimensions.naxis,
          depth: rec.dimensions.depth,
        }
      : undefined,
    statistics: rec.statistics || undefined,
    headersSummary: rec.headers_summary,
    inspectionSource: 'astropy_backend',
    hasPreview: rec.has_preview,
    previewUrl: rec.preview_url ? backendApi.getObservationPreviewUrl(rec.id) : undefined,
    fileExists: rec.file_exists,
    status: rec.file_exists ? 'raw' : 'missing_file',
  }
}

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
  removeObservation: (id: string) => Promise<void>
  clearObservations: () => void
  reloadObservations: () => Promise<void>
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

  // Astronomical Observations - Initially loaded from SQLite persistence
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

  const reloadObservations = useCallback(async () => {
    try {
      const records = await backendApi.getObservations()
      if (records && records.length > 0) {
        const mapped = records.map(mapBackendRecordToObservation)
        setObservations(mapped)
        setSelectedObservation((prev) => {
          if (!prev) return mapped[0]
          return mapped.find((m) => m.id === prev.id) || mapped[0]
        })
      }
    } catch (err) {
      console.warn('[AstrionContext] Could not load persisted observations:', err)
    }
  }, [])

  // Auto-load observations from SQLite on initial mount
  useEffect(() => {
    reloadObservations()
  }, [reloadObservations])

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev)
  }, [])

  const addObservations = useCallback((newObs: FitsObservation[]) => {
    setObservations((prev) => {
      // Avoid duplicate IDs
      const existingIds = new Set(prev.map((o) => o.id))
      const filteredNew = newObs.filter((o) => !existingIds.has(o.id))
      const combined = [...prev, ...filteredNew]
      if (!selectedObservation && combined.length > 0) {
        setSelectedObservation(combined[0])
      }
      return combined
    })
    notify(
      `Observation${newObs.length > 1 ? 's' : ''} Added`,
      `Successfully loaded ${newObs.length} FITS file${newObs.length > 1 ? 's' : ''} into active workspace.`,
      'success'
    )
  }, [selectedObservation, notify])

  const removeObservation = useCallback(async (id: string) => {
    try {
      await backendApi.deleteObservation(id)
    } catch (err) {
      console.warn(`[AstrionContext] Local deletion fallback for ${id}:`, err)
    }
    setObservations((prev) => prev.filter((o) => o.id !== id))
    if (selectedObservation?.id === id) {
      setSelectedObservation(null)
    }
    notify('Observation Removed', 'Observation removed from workspace and storage.', 'info')
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
        reloadObservations,
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
