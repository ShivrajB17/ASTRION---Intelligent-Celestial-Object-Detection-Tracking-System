export type { AstrionDesktopAPI, NativeFileSelectionResult } from '../../electron/types.d.ts'

declare global {
  interface Window {
    astrion?: import('../../electron/types.d.ts').AstrionDesktopAPI
  }
}
