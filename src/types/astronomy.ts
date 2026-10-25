export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface PipelineStage {
  id: string
  name: string
  description: string
  status: PipelineStatus
  progress?: number
  executionTime?: string
  details?: string
}

export interface FitsObservation {
  id: string
  filename: string
  sizeBytes: number
  uploadedAt: string
  targetName?: string
  raCenter?: number // Right Ascension in degrees
  decCenter?: number // Declination in degrees
  filterBand?: string
  telescope?: string
  instrument?: string
  epochTime?: string
  exptime?: number
  bitpix?: number
  dimensions?: { width: number; height: number; naxis?: number }
  wcsAvailable?: boolean
  pixelScaleArcsec?: number
  headersSummary?: Record<string, string | number | boolean>
  inspectionSource?: 'astropy_backend' | 'client_parser' | 'sample_benchmark'
  status: 'raw' | 'preprocessed' | 'analyzed'
}

export interface CelestialCandidate {
  id: string
  designation: string
  ra: number
  dec: number
  magnitude: number
  velocityArcsecHr: number
  trajectoryAngleDeg: number
  confidenceScore: number
  epochCount: number
  detectionStatus: 'candidate' | 'confirmed' | 'rejected' | 'under_review'
  possibleIdentity?: string
  sourceIds: string[]
}

export interface DetectionParameters {
  thresholdSigma: number
  fwhmPixels: number
  minAreaPixels: number
  deblendThresholds: number
  algorithm: 'daofind' | 'sep_astropy' | 'wavelet_transform'
  backgroundMethod: 'median_filter' | '2d_mesh' | 'sextractor_like'
}

export interface TrackingParameters {
  maxAngularVelocity: number // arcsec/hour
  minEpochDetections: number
  searchRadiusArcsec: number
  kalmanFilterEnabled: boolean
  chiSquareMax: number
}

export interface AnalysisSession {
  id: string
  title: string
  createdAt: string
  targetField: string
  observationIds: string[]
  status: PipelineStatus
  notes?: string
}

export interface ToastMessage {
  id: string
  title: string
  description?: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: string
}
