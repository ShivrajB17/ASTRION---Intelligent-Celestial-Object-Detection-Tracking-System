import path from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { backendManager } from './backendManager.ts'

// Retain a global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173'

function createWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, 'preload.cjs')

  mainWindow = new BrowserWindow({
    title: 'ASTRION — Astronomical Intelligence & Object Tracking System',
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 740,
    backgroundColor: '#050816',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  })

  // Prevent flicker: only show window once DOM is fully painted
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Intercept window open requests to launch external links in the default macOS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(parsed.href).catch((err) => {
          console.error('[ASTRION Main] Failed to open external link:', err)
        })
      }
    } catch {}
    return { action: 'deny' }
  })

  // Security: prevent renderer navigation away from allowed local origins
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl)
      const isLocalDev = parsed.origin === 'http://127.0.0.1:5173' || parsed.origin === 'http://localhost:5173'
      const isLocalFile = parsed.protocol === 'file:'

      if (!isLocalDev && !isLocalFile) {
        event.preventDefault()
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          shell.openExternal(parsed.href).catch(console.error)
        }
      }
    } catch {
      event.preventDefault()
    }
  })

  // Load either Vite dev server or production built index.html
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(devServerUrl).catch((err) => {
      console.error('[ASTRION Main] Failed to load Vite dev server:', err)
    })
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html')
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[ASTRION Main] Failed to load production index.html:', err)
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

// Register secure IPC handlers for contextBridge
function registerIpcHandlers(): void {
  ipcMain.handle('astrion:get-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('astrion:get-platform', () => {
    return process.platform
  })

  ipcMain.handle('astrion:select-fits-files', async () => {
    if (!mainWindow) {
      return { canceled: true, filePaths: [] }
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Astronomical Observations (FITS)',
      buttonLabel: 'Select Observations',
      filters: [
        { name: 'FITS Astronomical Data', extensions: ['fits', 'fit', 'fts', 'gz', 'tar'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })

    return {
      canceled: result.canceled,
      filePaths: result.filePaths,
    }
  })

  ipcMain.handle('astrion:open-external-url', async (_event, rawUrl: string) => {
    if (typeof rawUrl !== 'string') return
    try {
      const parsed = new URL(rawUrl)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        await shell.openExternal(parsed.href)
      }
    } catch {
      console.warn('[ASTRION Main] Rejected invalid external URL:', rawUrl)
    }
  })

  ipcMain.handle('astrion:get-backend-status', () => {
    return backendManager.getStatus()
  })

  ipcMain.handle('astrion:restart-backend', async () => {
    return backendManager.restart()
  })
}

// Application Lifecycle
app.whenReady().then(async () => {
  registerIpcHandlers()

  // Subscribe to backend status updates to notify the frontend
  backendManager.onStatusChange((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('astrion:backend-status-changed', status)
    }
  })

  // Launch Python backend process asynchronously
  backendManager.start().catch((err) => {
    console.error('[ASTRION Main] Background launch error:', err)
  })

  createWindow()

  // macOS activation behavior: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Cleanly stop backend when Electron terminates
app.on('before-quit', () => {
  backendManager.stop()
})

process.on('exit', () => {
  backendManager.stop()
})

process.on('SIGINT', () => {
  backendManager.stop()
  app.quit()
})

process.on('SIGTERM', () => {
  backendManager.stop()
  app.quit()
})

// macOS standard behavior: keep application running in dock when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
