import type { DetectionParameters } from '../types/astronomy'
import type { ServiceResult } from './api.types'

export interface DetectedSource {
  id: string
  x: number
  y: number
  ra: number
  dec: number
  flux: number
  fluxErr: number
  peak: number
  snr: number
  fwhm: number
  ellipticity: number
}

export class DetectionService {
  /**
   * Dispatches source detection request to future Python Astropy/SEP backend.
   */
  public static async detectSources(
    observationId: string,
    params: DetectionParameters
  ): Promise<ServiceResult<{ count: number; sources: DetectedSource[] }>> {
    console.debug(`[DetectionService] Prepared detection task for ${observationId} with sigma=${params.thresholdSigma}`)
    return {
      success: false,
      error: {
        code: 'AWAITING_SCIENTIFIC_BACKEND',
        message: 'Awaiting Python/Astropy DAOStarFinder backend integration.',
      },
      timestamp: new Date().toISOString(),
    }
  }

  public static getDefaultParameters(): DetectionParameters {
    return {
      thresholdSigma: 3.5,
      fwhmPixels: 3.0,
      minAreaPixels: 5,
      deblendThresholds: 32,
      algorithm: 'sep_astropy',
      backgroundMethod: '2d_mesh',
    }
  }
}
