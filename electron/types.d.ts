/**
 * Shared types for ASTRION native desktop bridge API.
 * Exposed securely to the renderer via contextBridge at window.astrion.
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
  /** True when running inside native Electron desktop shell */
  readonly isElectron: boolean

  /** Retrieves the native Electron application version */
  getVersion: () => Promise<string>

  /** Retrieves the host operating system platform (e.g., 'darwin') */
  getPlatform: () => Promise<string>

  /** Secure native macOS file dialog allowing user to pick FITS observation files */
  selectFitsFiles: () => Promise<NativeFileSelectionResult>

  /** Opens an approved external web URL in the macOS default browser */
  openExternalUrl: (url: string) => Promise<void>

  /** Returns current status of the integrated Python scientific engine */
  getBackendStatus: () => Promise<BackendProcessStatus>

  /** Triggers a clean restart of the integrated Python scientific engine */
  restartBackend: () => Promise<BackendProcessStatus>

  /** Subscribes to realtime backend status changes */
  onBackendStatusChange: (callback: (status: BackendProcessStatus) => void) => () => void
}

declare global {
  interface Window {
    astrion?: AstrionDesktopAPI
  }
}
