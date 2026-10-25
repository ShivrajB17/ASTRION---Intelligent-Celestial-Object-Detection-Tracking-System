import React, { useState, useEffect } from 'react'
import { Cpu, Monitor, Sliders, RotateCcw, Check, ShieldCheck, Activity, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAstrion } from '../context/AstrionContext'
import { backendApi } from '../services/backendApi.service'
import type { BackendHealth, BackendSystemInfo } from '../services/backendApi.service'

export const SettingsPage: React.FC = () => {
  const { notify, clearObservations, resetPipeline } = useAstrion()
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  const [coordinateFormat, setCoordinateFormat] = useState<'decimal' | 'sexagesimal'>('decimal')
  const [velocityUnit, setVelocityUnit] = useState<'arcsec_hr' | 'deg_day'>('arcsec_hr')
  const [pythonPort, setPythonPort] = useState('8088')
  const [desktopInfo, setDesktopInfo] = useState<{ version: string; platform: string } | null>(null)

  // Python Backend State
  const [isCheckingBackend, setIsCheckingBackend] = useState(false)
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null)
  const [backendSystem, setBackendSystem] = useState<BackendSystemInfo | null>(null)
  const [backendLatency, setBackendLatency] = useState<number | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkBackendConnection = async () => {
    setIsCheckingBackend(true)
    setBackendError(null)
    try {
      backendApi.setBaseUrl(`http://127.0.0.1:${pythonPort}`)
      const { health, latencyMs } = await backendApi.checkHealth()
      setBackendHealth(health)
      setBackendLatency(latencyMs)
      setLastChecked(new Date())

      // Fetch system info
      const sys = await backendApi.getSystemInfo()
      setBackendSystem(sys)
    } catch (err: any) {
      setBackendHealth(null)
      setBackendSystem(null)
      setBackendLatency(null)
      setBackendError(err.message || 'Connection refused')
    } finally {
      setIsCheckingBackend(false)
    }
  }

  useEffect(() => {
    let unsubscribeStatus: (() => void) | undefined
    if (window.astrion?.isElectron) {
      Promise.all([
        window.astrion.getVersion?.() ?? Promise.resolve('Unknown'),
        window.astrion.getPlatform?.() ?? Promise.resolve('darwin'),
      ]).then(([version, platform]) => {
        setDesktopInfo({ version, platform })
      }).catch((e) => console.error('Failed to query electron metadata', e))

      if (window.astrion.onBackendStatusChange) {
        unsubscribeStatus = window.astrion.onBackendStatusChange((status) => {
          if (status.ready) {
            checkBackendConnection()
          } else if (!status.running) {
            setBackendHealth(null)
            setBackendError(status.error || 'Backend process offline')
          }
        })
      }
    }

    // Check Python backend connection on mount
    checkBackendConnection()

    return () => {
      unsubscribeStatus?.()
    }
  }, [])

  const handleRestartEngine = async () => {
    if (!window.astrion?.restartBackend) return
    setIsCheckingBackend(true)
    notify('Engine Restarting', 'Triggering clean restart of the Python scientific backend...', 'info')
    try {
      await window.astrion.restartBackend()
      await checkBackendConnection()
      notify('Engine Ready', 'Python scientific backend successfully restarted.', 'success')
    } catch (err: any) {
      notify('Restart Error', err.message || 'Failed to restart backend process.', 'error')
    } finally {
      setIsCheckingBackend(false)
    }
  }

  const handleSave = () => {
    backendApi.setBaseUrl(`http://127.0.0.1:${pythonPort}`)
    notify('Settings Saved', 'Workspace configuration updated successfully.', 'success')
  }

  const handleResetSession = () => {
    clearObservations()
    resetPipeline()
    notify('Session Reset', 'All cached data and pipeline state cleared.', 'info')
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="p-6 rounded-2xl bg-space-850 border border-slate-800 shadow-glass space-y-2">
        <h2 className="text-xl font-bold text-white font-display">
          Workspace Settings & Scientific Engine Bridge
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Manage astrometric units, display preferences, and monitor the local Python scientific backend.
        </p>
      </div>

      {/* Preferences Sections */}
      <div className="p-6 rounded-2xl bg-space-850 border border-slate-800 shadow-glass space-y-6">
        {/* Astrometric Units */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white font-display flex items-center gap-2 border-b border-slate-800 pb-2">
            <Sliders className="w-4 h-4 text-astro-cyan" />
            Astrometric Coordinate Units
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">RA / Dec Notation</label>
              <select
                value={coordinateFormat}
                onChange={(e) => setCoordinateFormat(e.target.value as any)}
                className="w-full px-3 py-2 bg-space-900 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="decimal">Decimal Degrees (184.2254°, +29.8142°)</option>
                <option value="sexagesimal">Sexagesimal (12h 16m 54s, +29° 48' 51")</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Apparent Velocity Metric</label>
              <select
                value={velocityUnit}
                onChange={(e) => setVelocityUnit(e.target.value as any)}
                className="w-full px-3 py-2 bg-space-900 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="arcsec_hr">Arcseconds per Hour (″/hr)</option>
                <option value="deg_day">Degrees per Day (°/day)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Python Scientific Backend Runtime */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-semibold text-white font-display flex items-center gap-2">
              <Cpu className="w-4 h-4 text-astro-violet" />
              Python Scientific Engine (Astropy / NumPy)
            </h3>
            <div className="flex items-center gap-2">
              {window.astrion?.isElectron && (
                <button
                  onClick={handleRestartEngine}
                  disabled={isCheckingBackend}
                  className="px-2.5 py-1 text-xs font-mono rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Restart Python backend process"
                >
                  <RotateCcw className="w-3 h-3 text-rose-400" />
                  <span>Restart Engine</span>
                </button>
              )}
              <button
                onClick={checkBackendConnection}
                disabled={isCheckingBackend}
                className="px-2.5 py-1 text-xs font-mono rounded-lg bg-space-900 hover:bg-space-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingBackend ? 'animate-spin text-astro-cyan' : ''}`} />
                <span>{isCheckingBackend ? 'Checking...' : 'Test Connection'}</span>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-space-900 border border-slate-800 space-y-3.5 text-xs">
            {/* Status Indicator */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Connection Status:</span>
              {backendHealth ? (
                <span className="font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Connected ({backendHealth.status.toUpperCase()})
                </span>
              ) : backendError ? (
                <span className="font-mono text-rose-400 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Disconnected ({backendError})
                </span>
              ) : (
                <span className="font-mono text-amber-400 font-bold flex items-center gap-1.5">
                  <Activity className="w-4 h-4 animate-pulse" />
                  Checking connection...
                </span>
              )}
            </div>

            {/* Health & Latency */}
            {backendHealth && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Backend Version:</span>
                  <span className="font-mono text-white font-semibold">
                    v{backendHealth.version} (Uptime: {backendHealth.uptime_seconds}s)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Round-trip Health Check Latency:</span>
                  <span className="font-mono text-astro-cyan">
                    {backendLatency} ms
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last Successful Heartbeat:</span>
                  <span className="font-mono text-slate-300">
                    {lastChecked ? lastChecked.toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </>
            )}

            {/* Scientific Dependencies */}
            {backendSystem && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase font-mono">
                  Scientific Runtime Stack
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 rounded bg-space-850 border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400">Python</div>
                    <div className="font-mono text-xs text-white font-bold">{backendSystem.python_version}</div>
                  </div>
                  <div className="p-2 rounded bg-space-850 border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400">Astropy</div>
                    <div className="font-mono text-xs text-astro-cyan font-bold">
                      v{backendSystem.dependencies.astropy || 'N/A'}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-space-850 border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400">NumPy</div>
                    <div className="font-mono text-xs text-astro-cyan font-bold">
                      v{backendSystem.dependencies.numpy || 'N/A'}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-space-850 border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400">FastAPI</div>
                    <div className="font-mono text-xs text-emerald-400 font-bold">
                      v{backendSystem.dependencies.fastapi || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Shell Info */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Desktop Shell:</span>
                {desktopInfo ? (
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Electron v{desktopInfo.version} ({desktopInfo.platform})
                  </span>
                ) : (
                  <span className="font-mono text-slate-400">
                    Web Browser Mode (Local API Active)
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Scientific Backend Port:</span>
                <input
                  type="text"
                  value={pythonPort}
                  onChange={(e) => setPythonPort(e.target.value)}
                  className="w-24 px-2 py-1 bg-space-850 border border-slate-700 rounded font-mono text-xs text-white text-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-semibold text-white font-display flex items-center gap-2 border-b border-slate-800 pb-2">
            <Monitor className="w-4 h-4 text-astro-blue" />
            Visual Display & Motion
          </h3>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <div>
              <div className="text-xs font-semibold text-white">Animated Starfield & Particles</div>
              <div className="text-[11px] text-slate-400">Render dynamic 60fps orbital canvas</div>
            </div>
            <input
              type="checkbox"
              checked={animationsEnabled}
              onChange={(e) => setAnimationsEnabled(e.target.checked)}
              className="w-4 h-4 rounded bg-space-900 border-slate-700 text-astro-blue focus:ring-astro-blue"
            />
          </label>
        </div>

        {/* Danger Zone / Reset */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleResetSession}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Active Session Data</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-astro-blue hover:bg-blue-600 shadow-glow-blue transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  )
}
