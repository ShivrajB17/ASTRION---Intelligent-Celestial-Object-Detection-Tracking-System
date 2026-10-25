/**
 * Shared types for ASTRION native desktop bridge API.
 * Exposed securely to the renderer via contextBridge at window.astrion.
 */

export interface NativeFileSelectionResult {
  canceled: boolean
  filePaths: string[]
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
}

declare global {
  interface Window {
    astrion?: AstrionDesktopAPI
  }
}
