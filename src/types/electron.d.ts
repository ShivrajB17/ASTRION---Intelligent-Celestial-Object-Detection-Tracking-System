/**
 * Frontend typing declaration for window.astrion Electron desktop bridge API.
 */

export interface NativeFileSelectionResult {
  canceled: boolean
  filePaths: string[]
}

export interface BackendProcessStatus {
  running: boolean
  ready: boolean
  port: number
  url: string
  error?: string
  pid?: number
  restarts?: number
}

export interface AstrionDesktopAPI {
  readonly isElectron: boolean
  getVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  selectFitsFiles: () => Promise<NativeFileSelectionResult>
  openExternalUrl: (url: string) => Promise<void>
  getBackendStatus: () => Promise<BackendProcessStatus>
  restartBackend: () => Promise<BackendProcessStatus>
  onBackendStatusChange: (callback: (status: BackendProcessStatus) => void) => () => void
}

declare global {
  interface Window {
    astrion?: AstrionDesktopAPI
  }
}

export {}
