import { contextBridge, ipcRenderer } from 'electron'
import type { AstrionDesktopAPI, BackendProcessStatus } from './types.d.ts'

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

  getBackendStatus: async () => {
    return ipcRenderer.invoke('astrion:get-backend-status')
  },

  restartBackend: async () => {
    return ipcRenderer.invoke('astrion:restart-backend')
  },

  onBackendStatusChange: (callback: (status: BackendProcessStatus) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: BackendProcessStatus) => {
      callback(status)
    }
    ipcRenderer.on('astrion:backend-status-changed', handler)
    return () => {
      ipcRenderer.removeListener('astrion:backend-status-changed', handler)
    }
  },
}

// Securely expose the desktop API to the renderer under window.astrion
contextBridge.exposeInMainWorld('astrion', desktopAPI)
