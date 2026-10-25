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

export interface PixelStatistics {
  min: number | null
  max: number | null
  mean: number | null
  median: number | null
  std: number | null
  valid_pixels: number
  nan_pixels: number
  inf_pixels: number
  total_pixels: number
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
  dtype?: string
  equinox?: number
  selectedHduIndex?: number
  selectedHduName?: string
  selectedHduType?: string
  totalHdus?: number
  dimensions?: { width: number; height: number; naxis?: number; depth?: number | null }
  wcsAvailable?: boolean
  pixelScaleArcsec?: number
  statistics?: PixelStatistics
  headersSummary?: Record<string, string | number | boolean>
  inspectionSource?: 'astropy_backend' | 'client_parser' | 'sample_benchmark'
  hasPreview?: boolean
  previewUrl?: string
  fileExists?: boolean
  status: 'raw' | 'preprocessed' | 'analyzed' | 'missing_file'
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
