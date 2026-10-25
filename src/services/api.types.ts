/**
 * Common API Response and Error Contract for ASTRION Scientific Backend Services.
 * Designed for future Electron IPC or local Python REST/WebSocket bridge.
 */

export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  executionTimeMs?: number
  timestamp: string
}

export interface BackendBridgeStatus {
  connected: boolean
  version: string
  mode: 'standalone_renderer' | 'electron_ipc' | 'python_bridge'
  availableEngines: {
    astropy: boolean
    scipy: boolean
    opencv: boolean
    spherex_loader: boolean
  }
  lastHeartbeat?: string
}
