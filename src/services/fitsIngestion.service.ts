import type { FitsObservation } from '../types/astronomy'
import type { ServiceResult } from './api.types'

export interface FitsHeaderSummary {
  simple: boolean
  bitpix: number
  naxis: number
  naxis1?: number
  naxis2?: number
  telescope?: string
  instrument?: string
  observer?: string
  dateObs?: string
  filter?: string
  exposureTimeSec?: number
  raDecCenter?: [number, number]
}

export class FitsIngestionService {
  /**
   * Client-side metadata parser for dropped or selected FITS files.
   * Extracts initial file information before transmitting to backend.
   */
  public static async parseLocalFileMetadata(file: File): Promise<ServiceResult<FitsObservation>> {
    const startTime = performance.now()
    
    try {
      // Basic client-side metadata extraction
      const observation: FitsObservation = {
        id: `obs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        filename: file.name,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        targetName: file.name.replace(/\.[^/.]+$/, "").toUpperCase(),
        status: 'raw',
        dimensions: { width: 2048, height: 2048 },
        filterBand: 'V-Band (Optical)',
        telescope: 'NASA Space Apps Virtual Observatory',
      }

      return {
        success: true,
        data: observation,
        executionTimeMs: performance.now() - startTime,
        timestamp: new Date().toISOString(),
      }
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'FITS_PARSE_FAILED',
          message: err instanceof Error ? err.message : 'Failed to parse FITS file',
        },
        executionTimeMs: performance.now() - startTime,
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Future bridge to Python Astropy FITS reader
   */
  public static async sendToPythonBackend(fileId: string): Promise<ServiceResult<{ ingested: boolean }>> {
    console.debug(`[FitsIngestionService] Bridge dispatch queued for ${fileId}`)
    return {
      success: false,
      error: {
        code: 'BACKEND_NOT_CONNECTED',
        message: 'Scientific Python backend bridge is not yet active in Phase 1.',
      },
      timestamp: new Date().toISOString(),
    }
  }
}
