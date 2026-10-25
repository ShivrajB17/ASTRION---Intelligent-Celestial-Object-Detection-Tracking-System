import { backendApi, type RegistrationResponse as ApiRegistrationResponse } from './backendApi.service'
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
   * Aligns multi-epoch FITS frames via star-based triangulation (Astroalign / SimilarityTransform).
   */
  public static async registerFrames(
    referenceObsId: string,
    targetObsId: string
  ): Promise<ServiceResult<ApiRegistrationResponse>> {
    try {
      const result = await backendApi.runRegistration(referenceObsId, targetObsId)
      return {
        success: result.success,
        data: result,
        error: result.success ? undefined : {
          code: 'REGISTRATION_CONVERGENCE_FAILED',
          message: result.message,
        },
        timestamp: new Date().toISOString(),
      }
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'REGISTRATION_API_ERROR',
          message: err.message || 'Image registration failed.',
        },
        timestamp: new Date().toISOString(),
      }
    }
  }
}
