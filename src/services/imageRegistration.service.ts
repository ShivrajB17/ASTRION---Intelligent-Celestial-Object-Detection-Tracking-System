import type { ServiceResult } from './api.types'

export interface AlignmentMatrix {
  affineTransform: [number, number, number, number, number, number]
  rotationDeg: number
  translationPixels: [number, number]
  scaleFactor: number
  residualRms: number
}

export class ImageRegistrationService {
  /**
   * Aligns multi-epoch FITS frames via WCS coordinate projection or point-set matching (Astroalign / OpenCV).
   */
  public static async registerFrames(
    referenceObsId: string,
    targetObsIds: string[]
  ): Promise<ServiceResult<{ reference: string; aligned: string[]; matrices: Record<string, AlignmentMatrix> }>> {
    console.debug(`[ImageRegistrationService] Frame alignment requested: ${referenceObsId} against ${targetObsIds.length} frames`)
    return {
      success: false,
      error: {
        code: 'AWAITING_SCIENTIFIC_BACKEND',
        message: 'Awaiting image registration engine (Astroalign / WCS reproject).',
      },
      timestamp: new Date().toISOString(),
    }
  }
}
