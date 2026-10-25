import React from 'react'
import { 
  Plus, 
  UploadCloud, 
  Bell, 
  Cpu, 
  Database
} from 'lucide-react'
import { useAstrion } from '../../context/AstrionContext'
import type { NavigationRoute } from '../../types/navigation'

const ROUTE_TITLES: Record<NavigationRoute, { title: string; subtitle: string }> = {
  'mission-control': {
    title: 'Mission Control',
    subtitle: 'Central command for astronomical observation & celestial object tracking',
  },
  'observation-explorer': {
    title: 'Observation Explorer',
    subtitle: 'Inspect FITS image matrix, WCS coordinate metadata, and epoch layers',
  },
  'detection-lab': {
    title: 'Detection Lab',
    subtitle: 'PSF photometry, 2D background estimation, and centroid extraction',
  },
  'tracking-studio': {
    title: 'Tracking Studio',
    subtitle: 'Multi-epoch blink comparator, tracklet linkage, and apparent motion vectors',
  },
  'candidate-intelligence': {
    title: 'Candidate Intelligence',
    subtitle: 'Tracklet scoring, MPC ephemeris verification, and object classification',
  },
  'scientific-reports': {
    title: 'Scientific Reports',
    subtitle: 'Generate publication-ready astrometric documentation and LaTeX exports',
  },
  'data-sources': {
    title: 'Data Sources & Catalogs',
    subtitle: 'FITS directories, synthetic benchmark fields, and ephemeris tables',
  },
  'settings': {
    title: 'System Settings',
    subtitle: 'Display preferences, astrometric defaults, and scientific bridge config',
  },
}

export const AppTopBar: React.FC = () => {
  const { 
    activeRoute, 
    observations, 
    setIsNewAnalysisModalOpen, 
    setIsImportModalOpen,
    activeAnalysis,
    notify
  } = useAstrion()

  const currentInfo = ROUTE_TITLES[activeRoute] || {
    title: 'Workspace',
    subtitle: 'Astronomical analysis workspace',
  }

  return (
    <header className="h-16 border-b border-slate-800/80 bg-space-950/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 select-none z-20">
      {/* Page Title & Active Project */}
      <div className="flex items-center gap-4 min-w-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold text-white tracking-wide truncate font-display">
              {currentInfo.title}
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-850 text-slate-400 border border-slate-700 hidden sm:inline-block">
              {activeAnalysis ? activeAnalysis.title : 'DEFAULT SURVEY PROJECT'}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate hidden md:block">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls: Honest Status Indicators & Action CTAs */}
      <div className="flex items-center gap-3">
        {/* Dataset Connection Indicator */}
        <div 
          onClick={() => notify('Dataset Status', observations.length > 0 ? `${observations.length} local FITS files loaded in memory.` : 'No dataset connected. Upload local FITS files or load benchmark plates.', 'info')}
          className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-space-900 border border-slate-800 text-[11px] font-mono cursor-pointer hover:border-slate-700 transition-colors"
          title="FITS Dataset Status"
        >
          <Database className="w-3.5 h-3.5 text-astro-blue" />
          <span className="text-slate-400">FITS:</span>
          {observations.length > 0 ? (
            <span className="text-emerald-400 font-semibold">{observations.length} Frames</span>
          ) : (
            <span className="text-slate-500">Standalone (0 Loaded)</span>
          )}
        </div>

        {/* Backend Bridge Status Indicator */}
        <div 
          onClick={() => notify('Runtime Environment', window.astrion?.isElectron ? 'Running inside native macOS Electron desktop shell with secure context isolation.' : 'Running in Web Browser mode.', 'info')}
          className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-space-900 border border-slate-800 text-[11px] font-mono cursor-pointer hover:border-slate-700 transition-colors"
          title="Runtime Environment"
        >
          <Cpu className="w-3.5 h-3.5 text-astro-cyan" />
          <span className="text-slate-400">Runtime:</span>
          {window.astrion?.isElectron ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              macOS Desktop
            </span>
          ) : (
            <span className="text-astro-cyan font-semibold">Web Browser</span>
          )}
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => notify('Notification Center', 'System telemetry is operational. 0 anomaly alerts.', 'info')}
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-space-850 border border-transparent hover:border-slate-800 transition-colors"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-astro-cyan" />
        </button>

        {/* Import FITS Button */}
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-space-850 hover:bg-space-800 border border-slate-700 hover:border-slate-600 transition-all shadow-sm"
        >
          <UploadCloud className="w-4 h-4 text-astro-cyan" />
          <span className="hidden sm:inline">Import FITS</span>
        </button>

        {/* New Analysis Button */}
        <button
          onClick={() => setIsNewAnalysisModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-astro-blue to-blue-600 hover:from-blue-500 hover:to-blue-600 shadow-glow-blue transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Analysis</span>
        </button>
      </div>
    </header>
  )
}
