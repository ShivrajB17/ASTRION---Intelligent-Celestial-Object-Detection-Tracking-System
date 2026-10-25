import { spawn, ChildProcess } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

export interface BackendStatus {
  running: boolean
  ready: boolean
  port: number
  url: string
  error?: string
  pid?: number
  restarts: number
}

export type StatusChangeCallback = (status: BackendStatus) => void

class BackendManager {
  private process: ChildProcess | null = null
  private port = parseInt(process.env.ASTRION_BACKEND_PORT || '8088', 10)
  private isReady = false
  private lastError?: string
  private restartCount = 0
  private maxRestarts = 3
  private isIntentionalShutdown = false
  private statusListeners: StatusChangeCallback[] = []

  // Resolve project root for dev or production
  private getProjectRoot(): string {
    const isPackaged = process.mainModule?.filename.indexOf('app.asar') !== -1
    if (isPackaged && process.resourcesPath) {
      return path.join(process.resourcesPath, 'backend')
    }
    return path.resolve(__dirname, '..')
  }

  public onStatusChange(callback: StatusChangeCallback): () => void {
    this.statusListeners.push(callback)
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback)
    }
  }

  private notifyStatus(): void {
    const status = this.getStatus()
    for (const listener of this.statusListeners) {
      try {
        listener(status)
      } catch (err) {
        console.error('[ASTRION Backend] Error in status change listener:', err)
      }
    }
  }

  public getStatus(): BackendStatus {
    return {
      running: this.process !== null && !this.process.killed,
      ready: this.isReady,
      port: this.port,
      url: `http://127.0.0.1:${this.port}`,
      error: this.lastError,
      pid: this.process?.pid,
      restarts: this.restartCount,
    }
  }

  public getBackendUrl(): string {
    return `http://127.0.0.1:${this.port}`
  }

  private resolvePythonInterpreter(): string {
    if (process.env.ASTRION_PYTHON_PATH && fs.existsSync(process.env.ASTRION_PYTHON_PATH)) {
      return process.env.ASTRION_PYTHON_PATH
    }

    const rootDir = this.getProjectRoot()
    const candidates = [
      path.join(rootDir, 'backend', '.venv', 'bin', 'python'),
      path.join(rootDir, '.venv', 'bin', 'python'),
      '/opt/homebrew/bin/python3.12',
      '/usr/local/bin/python3.12',
      '/opt/homebrew/bin/python3',
      '/usr/local/bin/python3',
      'python3',
    ]

    for (const candidate of candidates) {
      if (candidate.startsWith('/') && fs.existsSync(candidate)) {
        return candidate
      }
    }

    return 'python3'
  }

  public async start(): Promise<void> {
    this.isIntentionalShutdown = false

    if (this.process && !this.process.killed) {
      console.log(`[ASTRION Backend] Backend already active (PID: ${this.process.pid})`)
      return
    }

    // Check if an existing healthy backend is already running on this port
    const alreadyHealthy = await this.checkHealth()
    if (alreadyHealthy) {
      console.log(`[ASTRION Backend] Backend already active and responsive on port ${this.port}. Reusing existing instance.`)
      this.isReady = true
      this.lastError = undefined
      this.notifyStatus()
      return
    }

    const rootDir = this.getProjectRoot()
    const pythonPath = this.resolvePythonInterpreter()
    console.log(`[ASTRION Backend] Launching Python backend with: ${pythonPath} at ${rootDir} on port ${this.port}`)

    const env = {
      ...process.env,
      PYTHONPATH: rootDir,
      ASTRION_BACKEND_PORT: String(this.port),
      ASTRION_BACKEND_HOST: '127.0.0.1',
    }

    try {
      this.process = spawn(
        pythonPath,
        [
          '-m',
          'uvicorn',
          'backend.app.main:app',
          '--host',
          '127.0.0.1',
          '--port',
          String(this.port),
          '--log-level',
          'info',
        ],
        {
          cwd: rootDir,
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false,
        }
      )

      this.process.stdout?.on('data', (data) => {
        const text = data.toString().trim()
        if (text) {
          console.log(`[ASTRION Python Backend] ${text}`)
        }
      })

      this.process.stderr?.on('data', (data) => {
        const text = data.toString().trim()
        if (text) {
          console.error(`[ASTRION Python Backend Error] ${text}`)
        }
      })

      this.process.on('error', (err) => {
        console.error('[ASTRION Backend] Process spawn error:', err)
        this.lastError = `Failed to spawn Python process: ${err.message}`
        this.isReady = false
        this.notifyStatus()
      })

      this.process.on('exit', (code, signal) => {
        console.log(`[ASTRION Backend] Process terminated (code ${code}, signal ${signal})`)
        this.process = null
        this.isReady = false
        this.notifyStatus()

        // Handle unexpected crash restart
        if (!this.isIntentionalShutdown && this.restartCount < this.maxRestarts) {
          this.restartCount++
          const delayMs = 1500 * this.restartCount
          console.warn(`[ASTRION Backend] Unexpected exit. Attempting automatic restart #${this.restartCount}/${this.maxRestarts} in ${delayMs}ms...`)
          setTimeout(() => {
            if (!this.isIntentionalShutdown) {
              this.start().catch((err) => console.error('[ASTRION Backend] Auto-restart failed:', err))
            }
          }, delayMs)
        }
      })

      // Wait for health endpoint to report ready
      const ok = await this.waitForHealth(15000)
      if (ok) {
        this.restartCount = 0 // Reset on successful boot
      }
      this.notifyStatus()
    } catch (err: any) {
      console.error('[ASTRION Backend] Startup error:', err)
      this.lastError = err?.message || String(err)
      this.isReady = false
      this.notifyStatus()
    }
  }

  public async restart(): Promise<BackendStatus> {
    console.log('[ASTRION Backend] Manual restart requested...')
    this.stop()
    await new Promise((r) => setTimeout(r, 1000))
    await this.start()
    return this.getStatus()
  }

  private checkHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        `http://127.0.0.1:${this.port}/health`,
        { timeout: 1500 },
        (res) => {
          if (res.statusCode === 200) {
            resolve(true)
          } else {
            resolve(false)
          }
        }
      )

      req.on('error', () => {
        resolve(false)
      })

      req.on('timeout', () => {
        req.destroy()
        resolve(false)
      })
    })
  }

  private async waitForHealth(timeoutMs: number): Promise<boolean> {
    const start = Date.now()
    const checkInterval = 250

    while (Date.now() - start < timeoutMs) {
      const ok = await this.checkHealth()
      if (ok) {
        this.isReady = true
        this.lastError = undefined
        console.log(`[ASTRION Backend] Health check passed! Backend active at http://127.0.0.1:${this.port}`)
        return true
      }
      await new Promise((r) => setTimeout(r, checkInterval))
    }

    this.lastError = `Backend did not respond on http://127.0.0.1:${this.port}/health within ${timeoutMs}ms`
    console.warn(`[ASTRION Backend] Warning: ${this.lastError}`)
    return false
  }

  public stop(): void {
    this.isIntentionalShutdown = true
    if (!this.process) return

    console.log('[ASTRION Backend] Terminating Python backend process...')
    const proc = this.process
    this.process = null
    this.isReady = false
    this.notifyStatus()

    try {
      proc.kill('SIGTERM')
      setTimeout(() => {
        if (!proc.killed) {
          try {
            proc.kill('SIGKILL')
          } catch {}
        }
      }, 2000)
    } catch (err) {
      console.error('[ASTRION Backend] Error stopping process:', err)
    }
  }
}

export const backendManager = new BackendManager()
