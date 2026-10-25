import { contextBridge, ipcRenderer } from 'electron'
import type { AstrionDesktopAPI } from './types.d.ts'

const desktopAPI: AstrionDesktopAPI = {
  isElectron: true,

  getVersion: async (): Promise<string> => {
    return ipcRenderer.invoke('astrion:get-version')
  },

  getPlatform: async (): Promise<string> => {
    return ipcRenderer.invoke('astrion:get-platform')
  },

  selectFitsFiles: async () => {
    return ipcRenderer.invoke('astrion:select-fits-files')
  },

  openExternalUrl: async (url: string): Promise<void> => {
    if (typeof url !== 'string') return
    return ipcRenderer.invoke('astrion:open-external-url', url)
  },
}

// Securely expose the desktop API to the renderer under window.astrion
contextBridge.exposeInMainWorld('astrion', desktopAPI)
