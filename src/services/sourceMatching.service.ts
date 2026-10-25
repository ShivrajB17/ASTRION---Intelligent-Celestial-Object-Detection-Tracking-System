import type { ServiceResult } from './api.types'

export interface MatchedTracklet {
  trackletId: string
  detections: Array<{
    epochIndex: number
    ra: number
    dec: number
    timeUtc: string
  }>
  isStationary: boolean
}

export class SourceMatchingService {
  /**
   * Matches sources across registered multi-epoch frames to distinguish fixed background stars from moving objects.
   */
  public static async crossMatchEpochs(
    epochObservations: string[],
    toleranceArcsec: number = 1.5
  ): Promise<ServiceResult<{ matchedCount: number; tracklets: MatchedTracklet[] }>> {
    console.debug(`[SourceMatchingService] Cross-matching ${epochObservations.length} epochs with tolerance ${toleranceArcsec}"`)
    return {
      success: false,
      error: {
        code: 'AWAITING_SCIENTIFIC_BACKEND',
        message: 'Awaiting KD-tree cross-epoch source matching engine.',
      },
      timestamp: new Date().toISOString(),
    }
  }
}
