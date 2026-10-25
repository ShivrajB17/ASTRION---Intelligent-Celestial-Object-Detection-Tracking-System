/**
 * Full-Stack End-to-End & Process Cleanup Integration Test.
 * Validates Python backend startup, health check, FITS inspection,
 * backend unavailable error handling, and clean process termination.
 */

import { spawn } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const TEST_PORT = 8089 // Dedicated test port to avoid conflicting with dev server
const pythonPath = fs.existsSync(path.join(rootDir, 'backend', '.venv', 'bin', 'python'))
  ? path.join(rootDir, 'backend', '.venv', 'bin', 'python')
  : '/opt/homebrew/bin/python3.12'

function log(msg) {
  console.log(`[Integration Test] ${msg}`)
}

function checkHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 1000 }, (res) => {
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

async function waitForHealth(port, maxWaitMs = 12000) {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    if (await checkHealth(port)) return true
    await new Promise((r) => setTimeout(r, 200))
  }
  return false
}

async function runTests() {
  log('Starting full-stack integration and lifecycle audit...')

  // 1. Verify backend unavailable state handling
  log('Test 1: Verifying backend unavailable behavior on idle port...')
  const initialAvailable = await checkHealth(TEST_PORT)
  if (initialAvailable) {
    throw new Error(`Expected test port ${TEST_PORT} to be free, but a service is already running!`)
  }
  log('✓ Port is idle. Offline state correctly detected (ECONNREFUSED).')

  // 2. Spawn Python backend on TEST_PORT
  log(`Test 2: Spawning Python scientific backend on port ${TEST_PORT}...`)
  const backendProc = spawn(
    pythonPath,
    [
      '-m',
      'uvicorn',
      'backend.app.main:app',
      '--host',
      '127.0.0.1',
      '--port',
      String(TEST_PORT),
      '--log-level',
      'warning',
    ],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        PYTHONPATH: rootDir,
        ASTRION_BACKEND_PORT: String(TEST_PORT),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )

  let stderrLogs = ''
  backendProc.stderr.on('data', (d) => {
    stderrLogs += d.toString()
  })

  try {
    const isReady = await waitForHealth(TEST_PORT)
    if (!isReady) {
      throw new Error(`Backend failed to become healthy on port ${TEST_PORT}. Logs: ${stderrLogs}`)
    }
    log(`✓ Python backend booted successfully and responded healthy on port ${TEST_PORT}.`)

    // 3. Test /health payload
    log('Test 3: Querying /health...')
    const healthData = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${TEST_PORT}/health`, (res) => {
        let raw = ''
        res.on('data', (c) => (raw += c))
        res.on('end', () => resolve(JSON.parse(raw)))
      }).on('error', reject)
    })
    if (healthData.status !== 'healthy' || typeof healthData.uptime_seconds !== 'number') {
      throw new Error(`Unexpected health payload: ${JSON.stringify(healthData)}`)
    }
    log(`✓ /health verified: status=${healthData.status}, version=${healthData.version}`)

    // 4. Test /api/system/info
    log('Test 4: Querying /api/system/info...')
    const sysData = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${TEST_PORT}/api/system/info`, (res) => {
        let raw = ''
        res.on('data', (c) => (raw += c))
        res.on('end', () => resolve(JSON.parse(raw)))
      }).on('error', reject)
    })
    if (!sysData.dependencies?.astropy || !sysData.dependencies?.numpy) {
      throw new Error(`Missing astropy or numpy in dependencies: ${JSON.stringify(sysData)}`)
    }
    log(`✓ /api/system/info verified: Astropy v${sysData.dependencies.astropy}, NumPy v${sysData.dependencies.numpy}`)

    // 5. Test invalid FITS upload rejection
    log('Test 5: Sending corrupted FITS payload to /api/fits/inspect...')
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2)
    const corruptBody =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="corrupt_test.fits"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n` +
      `CORRUPT_NOT_FITS_DATA\r\n` +
      `--${boundary}--\r\n`

    const corruptRes = await new Promise((resolve, reject) => {
      const req = http.request(
        `http://127.0.0.1:${TEST_PORT}/api/fits/inspect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': Buffer.byteLength(corruptBody),
          },
        },
        (res) => {
          let raw = ''
          res.on('data', (c) => (raw += c))
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }))
        }
      )
      req.on('error', reject)
      req.write(corruptBody)
      req.end()
    })

    if (corruptRes.status !== 422 || corruptRes.body.status !== 'error') {
      throw new Error(`Expected HTTP 422 structured error for corrupted FITS, got: ${JSON.stringify(corruptRes)}`)
    }
    log(`✓ Corrupt FITS rejected cleanly with HTTP 422 and structured error response.`)

    // 6. Test /api/observations
    log('Test 6: Querying /api/observations...')
    const obsList = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${TEST_PORT}/api/observations`, (res) => {
        let raw = ''
        res.on('data', (c) => (raw += c))
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }))
      }).on('error', reject)
    })
    if (obsList.status !== 200 || typeof obsList.body.count !== 'number') {
      throw new Error(`Failed to list observations: ${JSON.stringify(obsList)}`)
    }
    log(`✓ /api/observations verified: status=${obsList.status}, count=${obsList.body.count}`)

    // 7. Test process cleanup and shutdown
    log('Test 7: Testing clean backend termination via SIGTERM...')
    backendProc.kill('SIGTERM')

    await new Promise((resolve) => {
      backendProc.on('exit', (code, sig) => {
        log(`✓ Backend process exited cleanly with code=${code}, signal=${sig}`)
        resolve()
      })
    })

    // Verify port is freed
    const stillAlive = await checkHealth(TEST_PORT)
    if (stillAlive) {
      throw new Error(`Backend process was killed but port ${TEST_PORT} is still accepting connections!`)
    }
    log('✓ Port freed. Process cleanup verified. No orphaned process remaining.')

    log('=============================================')
    log('ALL INTEGRATION & HARDENING TESTS PASSED! 🎉')
    log('=============================================')
  } finally {
    if (!backendProc.killed) {
      backendProc.kill('SIGKILL')
    }
  }
}

runTests().catch((err) => {
  console.error('[Integration Test Error]', err)
  process.exit(1)
})
