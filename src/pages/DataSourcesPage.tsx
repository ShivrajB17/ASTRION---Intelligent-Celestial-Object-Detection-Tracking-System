import React, { useState, useEffect } from 'react'
import { Database, HardDrive, Globe, Plus, Cpu, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { useAstrion } from '../context/AstrionContext'
import { backendApi } from '../services/backendApi.service'
import type { BackendHealth } from '../services/backendApi.service'

export const DataSourcesPage: React.FC = () => {
  const { notify, setIsImportModalOpen } = useAstrion()
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkBackend = async () => {
    setIsChecking(true)
    try {
      const { health } = await backendApi.checkHealth()
      setBackendHealth(health)
    } catch {
      setBackendHealth(null)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkBackend()
  }, [])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="p-6 rounded-2xl bg-space-850 border border-slate-800 shadow-glass space-y-2">
        <h2 className="text-xl font-bold text-white font-display">
          Astronomical Data Feeds & Catalogs
        </h2>
        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
          Manage local FITS data directories, synthetic benchmark datasets, and open astronomical ephemeris providers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Python Scientific Engine Card */}
        <div className="p-5 rounded-2xl bg-space-850 border border-slate-800 shadow-glass flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-astro-violet/10 text-astro-violet border border-astro-violet/20">
                <Cpu className="w-5 h-5" />
              </div>
              {backendHealth ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  OFFLINE
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-white font-display">Astropy Scientific Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {backendHealth
                ? `Local Python backend active at port 8088. Version v${backendHealth.version} (Uptime: ${backendHealth.uptime_seconds}s).`
                : 'Local Python FastAPI backend is disconnected or starting up.'}
            </p>
          </div>
          <button
            onClick={checkBackend}
            disabled={isChecking}
            className="mt-6 flex items-center justify-center gap-2 py-2 rounded-xl bg-space-800 hover:bg-space-700 text-xs font-semibold text-slate-200 hover:text-white border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-astro-cyan' : ''}`} />
            <span>{isChecking ? 'Checking Engine...' : 'Check Engine Status'}</span>
          </button>
        </div>
        {/* Local FITS Workspace */}
        <div className="p-5 rounded-2xl bg-space-850 border border-slate-800 shadow-glass flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-astro-blue/10 text-astro-blue border border-astro-blue/20">
                <HardDrive className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <h3 className="text-base font-semibold text-white font-display">Local FITS Workspace</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              In-memory client-side session store for dragged or selected astronomical observation plates.
            </p>
          </div>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="mt-6 flex items-center justify-center gap-2 py-2 rounded-xl bg-space-800 hover:bg-space-700 text-xs font-semibold text-slate-200 hover:text-white border border-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Load FITS Files</span>
          </button>
        </div>

        {/* NASA SPHEREx Benchmark Field */}
        <div className="p-5 rounded-2xl bg-space-850 border border-slate-800 shadow-glass flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-astro-cyan/10 text-astro-cyan border border-astro-cyan/20">
                <Globe className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-900 text-slate-400 border border-slate-700">
                BENCHMARK
              </span>
            </div>
            <h3 className="text-base font-semibold text-white font-display">SPHEREx Survey Matrix</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Synthetic multi-band NIR spectral cubes modeled on SPHEREx deep survey calibration specifications.
            </p>
          </div>
          <button
            onClick={() => notify('Benchmark Dataset', 'SPHEREx deep survey test plate ready in Import modal.', 'info')}
            className="mt-6 flex items-center justify-center gap-2 py-2 rounded-xl bg-space-800 hover:bg-space-700 text-xs font-semibold text-slate-200 hover:text-white border border-slate-700 transition-colors"
          >
            <span>View Specifications</span>
          </button>
        </div>

        {/* Minor Planet Center Catalog */}
        <div className="p-5 rounded-2xl bg-space-850 border border-slate-800 shadow-glass flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-astro-violet/10 text-astro-violet border border-astro-violet/20">
                <Database className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-900 text-slate-400 border border-slate-700">
                STANDALONE
              </span>
            </div>
            <h3 className="text-base font-semibold text-white font-display">Minor Planet Center (MPC)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              IAU Minor Planet Center orbital database containing all known asteroids, comets, and designated NEOs.
            </p>
          </div>
          <button
            onClick={() => notify('MPC Catalog', 'External query interface connects in Phase 2 via Python Astroquery.', 'info')}
            className="mt-6 flex items-center justify-center gap-2 py-2 rounded-xl bg-space-800 hover:bg-space-700 text-xs font-semibold text-slate-200 hover:text-white border border-slate-700 transition-colors"
          >
            <span>Query API Gateway</span>
          </button>
        </div>
      </div>
    </div>
  )
}
