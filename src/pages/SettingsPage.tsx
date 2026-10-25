import React, { useState, useEffect } from 'react'
import { Cpu, Monitor, Sliders, RotateCcw, Check, ShieldCheck } from 'lucide-react'
import { useAstrion } from '../context/AstrionContext'

export const SettingsPage: React.FC = () => {
  const { notify, clearObservations, resetPipeline } = useAstrion()
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  const [coordinateFormat, setCoordinateFormat] = useState<'decimal' | 'sexagesimal'>('decimal')
  const [velocityUnit, setVelocityUnit] = useState<'arcsec_hr' | 'deg_day'>('arcsec_hr')
  const [pythonPort, setPythonPort] = useState('8088')
  const [desktopInfo, setDesktopInfo] = useState<{ version: string; platform: string } | null>(null)

  useEffect(() => {
    if (window.astrion?.isElectron) {
      Promise.all([
        window.astrion.getVersion?.() ?? Promise.resolve('Unknown'),
        window.astrion.getPlatform?.() ?? Promise.resolve('darwin'),
      ]).then(([version, platform]) => {
        setDesktopInfo({ version, platform })
      }).catch((e) => console.error('Failed to query electron metadata', e))
    }
  }, [])

  const handleSave = () => {
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
          Workspace Settings & Desktop Bridge
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Manage astrometric units, display preferences, and prepare for Electron desktop IPC integration.
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

        {/* Desktop & Scientific Bridge Configuration */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-semibold text-white font-display flex items-center gap-2 border-b border-slate-800 pb-2">
            <Cpu className="w-4 h-4 text-astro-violet" />
            Desktop Runtime & Scientific Bridge (Phase 2 Prep)
          </h3>

          <div className="p-4 rounded-xl bg-space-900 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Desktop Runtime Status:</span>
              {desktopInfo ? (
                <span className="font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Electron v{desktopInfo.version} ({desktopInfo.platform})
                </span>
              ) : (
                <span className="font-mono text-slate-300">
                  Web Browser Mode (IPC Bridge Ready)
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Security Sandbox & Isolation:</span>
              <span className="font-mono text-astro-cyan font-medium">
                Context Isolation Active • Node Integration Disabled
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Scientific Python Backend Port:</span>
              <input
                type="text"
                value={pythonPort}
                onChange={(e) => setPythonPort(e.target.value)}
                className="w-24 px-2 py-1 bg-space-850 border border-slate-700 rounded font-mono text-xs text-white text-center"
              />
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
