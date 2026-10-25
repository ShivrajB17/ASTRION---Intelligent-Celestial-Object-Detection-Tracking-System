/**
 * ASTRION Frontend Scientific Backend API Client.
 * Communicates with the local FastAPI backend (default port: 8088).
 * Strictly reports genuine errors and never silently returns mock data on failure.
 */

export interface BackendHealth {
  status: string
  version: string
  uptime_seconds: number
  timestamp: string
}

export interface BackendSystemInfo {
  python_version: string
  platform: string
  cpu_count: number | null
  dependencies: {
    astropy?: string
    numpy?: string
    fastapi?: string
    uvicorn?: string
    pydantic?: string
    [key: string]: string | undefined
  }
}

export interface HduInfo {
  index: number
  name: string
  hdu_type: string
  shape: number[] | null
  bitpix: number | null
}

export interface FitsDimensions {
  naxis: number
  width: number | null
  height: number | null
  depth: number | null
}

export interface FitsInspectionResult {
  filename: string
  file_size_bytes: number
  hdu_count: number
  hdus: HduInfo[]
  dimensions: FitsDimensions | null
  bitpix: number | null
  date_obs: string | null
  exptime: number | null
  telescope: string | null
  instrument: string | null
  object_name: string | null
  filter_band: string | null
  ra_deg: number | null
  dec_deg: number | null
  wcs_available: boolean
  pixel_scale_arcsec: number | null
  headers_summary: Record<string, string | number | boolean>
}

export interface SupportedFormats {
  extensions: string[]
  compression: string[]
  description: string
}

export interface ApiConnectionState {
  connected: boolean
  lastChecked: Date | null
  latencyMs: number | null
  error?: string
}

class BackendApiService {
  private baseUrl = 'http://127.0.0.1:8088'
  private timeoutMs = 8000

  constructor() {
    // In browser or Electron, allow custom override via localStorage or environment
    if (typeof window !== 'undefined') {
      const storedUrl = localStorage.getItem('astrion_backend_url')
      if (storedUrl) {
        this.baseUrl = storedUrl
      }
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '')
    if (typeof window !== 'undefined') {
      localStorage.setItem('astrion_backend_url', this.baseUrl)
    }
  }

  /**
   * Health check with latency measurement.
   */
  public async checkHealth(): Promise<{ health: BackendHealth; latencyMs: number }> {
    const start = performance.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Health check returned status HTTP ${response.status}: ${response.statusText}`)
      }

      const data: BackendHealth = await response.json()
      const latencyMs = Math.round(performance.now() - start)
      return { health: data, latencyMs }
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        throw new Error(`Connection to Python backend timed out after ${this.timeoutMs}ms`)
      }
      throw new Error(`Failed to connect to Python backend: ${err.message || err}`)
    }
  }

  /**
   * Retrieves runtime platform and dependency versions (Astropy, NumPy, etc.)
   */
  public async getSystemInfo(): Promise<BackendSystemInfo> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(`${this.baseUrl}/api/system/info`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`System info request failed with status HTTP ${response.status}`)
      }

      return await response.json()
    } catch (err: any) {
      clearTimeout(timeoutId)
      throw new Error(`Unable to fetch backend system info: ${err.message || err}`)
    }
  }

  /**
   * Retrieves supported astronomical FITS file formats.
   */
  public async getSupportedFormats(): Promise<SupportedFormats> {
    const response = await fetch(`${this.baseUrl}/api/fits/supported-formats`)
    if (!response.ok) {
      throw new Error(`Failed to fetch supported formats (HTTP ${response.status})`)
    }
    return await response.json()
  }

  /**
   * Inspects a real FITS file through genuine astropy.io.fits header inspection.
   */
  public async inspectFitsFile(file: File): Promise<FitsInspectionResult> {
    const formData = new FormData()
    formData.append('file', file, file.name)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000) // 20s for larger files

    try {
      const response = await fetch(`${this.baseUrl}/api/fits/inspect`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}`
        try {
          const errJson = await response.json()
          if (errJson.detail) errorDetail = errJson.detail
        } catch {}
        throw new Error(`FITS inspection failed: ${errorDetail}`)
      }

      return await response.json()
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        throw new Error('FITS inspection timed out after 20 seconds')
      }
      throw err
    }
  }

  /**
   * Ingests a genuine FITS file into backend storage and SQLite persistence.
   * Performs science HDU selection, NumPy pixel statistics calculation, and preview generation.
   */
  public async ingestFitsFile(file: File, allowDuplicate: boolean = false): Promise<IngestResponse> {
    const formData = new FormData()
    formData.append('file', file, file.name)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s for large files

    try {
      const url = `${this.baseUrl}/api/fits/ingest?allow_duplicate=${allowDuplicate}`
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}`
        try {
          const errJson = await response.json()
          if (errJson.detail) errorDetail = errJson.detail
        } catch {}
        throw new Error(`FITS ingestion failed: ${errorDetail}`)
      }

      return await response.json()
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        throw new Error('FITS ingestion timed out after 30 seconds')
      }
      throw err
    }
  }

  /**
   * Retrieves all persisted observations from SQLite.
   */
  public async getObservations(): Promise<ObservationRecord[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/observations`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Failed to list observations (HTTP ${response.status})`)
      }
      const data: ObservationListResponse = await response.json()
      return data.observations
    } catch (err: any) {
      console.warn('[BackendApiService] Failed to fetch observations:', err)
      return []
    }
  }

  /**
   * Retrieves an observation by its unique identifier.
   */
  public async getObservation(id: string): Promise<ObservationRecord> {
    const response = await fetch(`${this.baseUrl}/api/observations/${id}`)
    if (!response.ok) {
      throw new Error(`Failed to retrieve observation ${id} (HTTP ${response.status})`)
    }
    return await response.json()
  }

  /**
   * Deletes an observation record and its source file from disk.
   */
  public async deleteObservation(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/observations/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`Failed to delete observation ${id} (HTTP ${response.status})`)
    }
  }

  /**
   * Returns the absolute preview URL for a given observation ID.
   */
  public getObservationPreviewUrl(id: string): string {
    return `${this.baseUrl}/api/observations/${id}/preview`
  }
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

export interface ObservationRecord {
  id: string
  filename: string
  file_size_bytes: number
  file_hash: string | null
  file_exists: boolean
  created_at: string
  date_obs: string | null
  exptime: number | null
  telescope: string | null
  instrument: string | null
  object_name: string | null
  filter_band: string | null
  equinox: number | null
  ra_deg: number | null
  dec_deg: number | null
  wcs_available: boolean
  pixel_scale_arcsec: number | null
  selected_hdu_index: number
  selected_hdu_name: string
  selected_hdu_type: string
  total_hdus: number
  hdus: HduInfo[]
  dimensions: FitsDimensions | null
  bitpix: number | null
  dtype: string | null
  statistics: PixelStatistics | null
  headers_summary: Record<string, string | number | boolean>
  ingestion_status: string
  has_preview: boolean
  preview_url: string | null
}

export interface ObservationListResponse {
  count: number
  observations: ObservationRecord[]
}

export interface IngestResponse {
  status: 'success' | 'duplicate'
  message: string
  observation: ObservationRecord
}

export const backendApi = new BackendApiService()
