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
}

export interface AstrionDesktopAPI {
  readonly isElectron: boolean
  getVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  selectFitsFiles: () => Promise<NativeFileSelectionResult>
  openExternalUrl: (url: string) => Promise<void>
  getBackendStatus: () => Promise<BackendProcessStatus>
}

declare global {
  interface Window {
    astrion?: AstrionDesktopAPI
  }
}

export {}
