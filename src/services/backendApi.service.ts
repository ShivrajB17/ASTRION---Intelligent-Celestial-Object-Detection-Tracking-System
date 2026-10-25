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
}

export const backendApi = new BackendApiService()
