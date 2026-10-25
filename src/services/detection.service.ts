import { backendApi, type DetectionResponse as ApiDetectionResponse, type DetectedSource as ApiDetectedSource } from './backendApi.service'
import type { DetectionParameters } from '../types/astronomy'
import type { ServiceResult } from './api.types'

export interface DetectedSource {
  id: string
  sourceNumber: number
  x: number
  y: number
  centroidX: number
  centroidY: number
  centroidUncertainty: number
  ra: number | null
  dec: number | null
  skyCoordAvailable: boolean
  peak: number
  flux: number
  fwhm: number
  snr: number
  sharpness: number | null
  roundness: number | null
  flags: number
  quality: string
}

export class DetectionService {
  /**
   * Dispatches source detection request to Python Astropy/Photutils backend.
   */
  public static async detectSources(
    observationId: string,
    params: DetectionParameters
  ): Promise<ServiceResult<{ count: number; sources: DetectedSource[]; backgroundMedian: number; backgroundRms: number; executionTimeMs: number; bkgSubPreviewUrl: string | null; bkgMapPreviewUrl: string | null }>> {
    try {
      const response: ApiDetectionResponse = await backendApi.runDetection(observationId, {
        threshold_sigma: params.thresholdSigma,
        fwhm_pixels: params.fwhmPixels,
        box_size: 64,
        filter_size: 3,
        algorithm: params.algorithm === 'daofind' ? 'daofind' : 'daofind',
      })

      const sources: DetectedSource[] = response.sources.map((s: ApiDetectedSource) => ({
        id: s.id,
        sourceNumber: s.source_number,
        x: s.x,
        y: s.y,
        centroidX: s.centroid_x,
        centroidY: s.centroid_y,
        centroidUncertainty: s.centroid_uncertainty,
        ra: s.ra_deg,
        dec: s.dec_deg,
        skyCoordAvailable: s.sky_coord_available,
        peak: s.peak,
        flux: s.flux,
        fwhm: s.fwhm,
        snr: s.snr,
        sharpness: s.sharpness,
        roundness: s.roundness,
        flags: s.flags,
        quality: s.quality,
      }))

      return {
        success: true,
        data: {
          count: response.source_count,
          sources,
          backgroundMedian: response.background_median,
          backgroundRms: response.background_rms,
          executionTimeMs: response.execution_time_ms,
          bkgSubPreviewUrl: response.bkg_subtracted_preview_url,
          bkgMapPreviewUrl: response.bkg_map_preview_url,
        },
        timestamp: new Date().toISOString(),
      }
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'DETECTION_FAILED',
          message: err.message || 'Source detection failed.',
        },
        timestamp: new Date().toISOString(),
      }
    }
  }

  public static getDefaultParameters(): DetectionParameters {
    return {
      thresholdSigma: 3.5,
      fwhmPixels: 3.0,
      minAreaPixels: 5,
      deblendThresholds: 32,
      algorithm: 'daofind',
      backgroundMethod: '2d_mesh',
    }
  }
}
