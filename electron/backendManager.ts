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
}

class BackendManager {
  private process: ChildProcess | null = null
  private port = parseInt(process.env.ASTRION_BACKEND_PORT || '8088', 10)
  private isReady = false
  private lastError?: string
  private rootDir = path.resolve(__dirname, '..')

  public getStatus(): BackendStatus {
    return {
      running: this.process !== null && !this.process.killed,
      ready: this.isReady,
      port: this.port,
      url: `http://127.0.0.1:${this.port}`,
      error: this.lastError,
      pid: this.process?.pid,
    }
  }

  public getBackendUrl(): string {
    return `http://127.0.0.1:${this.port}`
  }

  private resolvePythonInterpreter(): string {
    if (process.env.ASTRION_PYTHON_PATH && fs.existsSync(process.env.ASTRION_PYTHON_PATH)) {
      return process.env.ASTRION_PYTHON_PATH
    }

    const venvPython = path.join(this.rootDir, 'backend', '.venv', 'bin', 'python')
    if (fs.existsSync(venvPython)) {
      return venvPython
    }

    const homebrewPython = '/opt/homebrew/bin/python3.12'
    if (fs.existsSync(homebrewPython)) {
      return homebrewPython
    }

    return 'python3'
  }

  public async start(): Promise<void> {
    if (this.process) {
      console.log('[ASTRION Backend] Backend process already launched (PID:', this.process.pid, ')')
      return
    }

    // Check if a backend is already running on this port (e.g. started externally)
    const alreadyHealthy = await this.checkHealth()
    if (alreadyHealthy) {
      console.log(`[ASTRION Backend] Backend already active and healthy on port ${this.port}. Reusing existing instance.`)
      this.isReady = true
      return
    }

    const pythonPath = this.resolvePythonInterpreter()
    console.log(`[ASTRION Backend] Starting Python backend with interpreter: ${pythonPath} on port ${this.port}`)

    const env = {
      ...process.env,
      PYTHONPATH: this.rootDir,
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
          cwd: this.rootDir,
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
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
        console.error('[ASTRION Backend] Failed to spawn Python backend:', err)
        this.lastError = err.message
        this.isReady = false
      })

      this.process.on('exit', (code, signal) => {
        console.log(`[ASTRION Backend] Process exited with code ${code}, signal ${signal}`)
        this.process = null
        this.isReady = false
      })

      // Wait for health endpoint to report ready
      await this.waitForHealth(15000)
    } catch (err: any) {
      console.error('[ASTRION Backend] Error starting backend:', err)
      this.lastError = err?.message || String(err)
    }
  }

  private checkHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        `http://127.0.0.1:${this.port}/health`,
        { timeout: 1000 },
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
    if (!this.process) return

    console.log('[ASTRION Backend] Terminating Python backend...')
    const proc = this.process
    this.process = null
    this.isReady = false

    try {
      proc.kill('SIGTERM')
      setTimeout(() => {
        if (!proc.killed) {
          try {
            proc.kill('SIGKILL')
          } catch {}
        }
      }, 2500)
    } catch (err) {
      console.error('[ASTRION Backend] Error while stopping backend process:', err)
    }
  }
}

export const backendManager = new BackendManager()
