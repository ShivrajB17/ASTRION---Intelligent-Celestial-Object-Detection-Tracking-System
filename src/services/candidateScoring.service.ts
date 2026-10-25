import type { CelestialCandidate } from '../types/astronomy'
import type { ServiceResult } from './api.types'

export interface ScoringMetrics {
  snrConsistency: number // 0-1
  linearityRms: number // arcsec
  velocityConsistency: number // 0-1
  knownCatalogMatch: {
    matched: boolean
    mpcDesignation?: string
    offsetArcsec?: number
  }
}

export class CandidateScoringService {
  /**
   * Evaluates tracklet confidence score against Minor Planet Center (MPC) and JPL Horizons catalogs.
   */
  public static async scoreCandidate(
    candidateId: string
  ): Promise<ServiceResult<{ candidate: CelestialCandidate; metrics: ScoringMetrics }>> {
    console.debug(`[CandidateScoringService] Scoring candidate ${candidateId}`)
    return {
      success: false,
      error: {
        code: 'AWAITING_SCIENTIFIC_BACKEND',
        message: 'Awaiting candidate scoring and MPC catalog cross-referencing engine.',
      },
      timestamp: new Date().toISOString(),
    }
  }
}
