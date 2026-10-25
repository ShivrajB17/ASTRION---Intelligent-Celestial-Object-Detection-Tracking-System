import type { TrackingParameters } from '../types/astronomy'
import type { ServiceResult } from './api.types'

export interface TrajectoryFitResult {
  trackletId: string
  apparentMotionArcsecHr: number
  positionAngleDeg: number
  residualsRaArcsec: number
  residualsDecArcsec: number
  chiSquared: number
  orbitalClassificationHypothesis?: 'Main Belt Asteroid' | 'Near Earth Object' | 'Kuiper Belt Object' | 'Artificial Satellite' | 'Trans-Neptunian'
}

export class TrajectoryService {
  /**
   * Fits preliminary trajectory vectors, linear/great circle tracks, or Gauss initial orbit determination.
   */
  public static async estimateTrajectory(
    trackletId: string,
    params: TrackingParameters
  ): Promise<ServiceResult<TrajectoryFitResult>> {
    console.debug(`[TrajectoryService] Fitting trajectory for ${trackletId}`, params)
    return {
      success: false,
      error: {
        code: 'AWAITING_SCIENTIFIC_BACKEND',
        message: 'Awaiting trajectory and orbital determination engine (PyEphem / SciPy).',
      },
      timestamp: new Date().toISOString(),
    }
  }

  public static getDefaultParameters(): TrackingParameters {
    return {
      maxAngularVelocity: 15.0, // arcsec/hr
      minEpochDetections: 3,
      searchRadiusArcsec: 12.0,
      kalmanFilterEnabled: true,
      chiSquareMax: 4.5,
    }
  }
}
