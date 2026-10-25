import React, { useState } from 'react'
import { 
  UploadCloud, 
  ZoomIn, 
  ZoomOut, 
  Crosshair, 
  Info, 
  Layers, 
  Grid, 
  FileCode
} from 'lucide-react'
import { useAstrion } from '../context/AstrionContext'

export const ObservationExplorerPage: React.FC = () => {
  const { observations, selectedObservation, setSelectedObservation, setIsImportModalOpen, notify } = useAstrion()
  const [zoomLevel, setZoomLevel] = useState(100)
  const [colorMap, setColorMap] = useState<'greyscale' | 'viridis' | 'heat' | 'plasma'>('greyscale')
  const [contrastStretch, setContrastStretch] = useState<'linear' | 'log' | 'asinh' | 'zscale'>('zscale')
  const [showGrid, setShowGrid] = useState(true)
  const [showReticle, setShowReticle] = useState(true)

  const activeObs = selectedObservation || (observations.length > 0 ? observations[0] : null)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Honest Scientific Backend Notice */}
      <div className="p-3.5 rounded-xl bg-space-850/80 border border-astro-blue/25 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-astro-cyan shrink-0" />
          <span>
            <strong className="text-white">Observation Explorer:</strong> Interactive FITS viewer shell. In Phase 2, this viewport streams full-resolution 32-bit float matrix arrays from the Astropy backend.
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-900 text-slate-400 border border-slate-700 shrink-0 hidden sm:inline-block">
          WCS Astrometry Standard
        </span>
      </div>

      {/* Main Grid: Viewer + Metadata Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive FITS Viewer */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-2xl bg-space-950 border border-slate-800 overflow-hidden shadow-glass flex flex-col h-[520px]">
            {/* Viewer Top Controls Bar */}
            <div className="px-4 py-3 bg-space-900/90 border-b border-slate-800 flex items-center justify-between gap-3 text-xs z-10">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-semibold text-white truncate">
                  {activeObs ? activeObs.filename : 'NO_FRAME_LOADED.FITS'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-space-800 text-slate-400 border border-slate-700 shrink-0">
                  {activeObs ? `${activeObs.dimensions?.width}×${activeObs.dimensions?.height} px` : 'STANDALONE'}
                </span>
              </div>

              {/* Viewport Zoom & Filter Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(25, z - 25))}
                  className="p-1.5 rounded-lg bg-space-800 text-slate-400 hover:text-white transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] text-slate-300 w-10 text-center">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(400, z + 25))}
                  className="p-1.5 rounded-lg bg-space-800 text-slate-400 hover:text-white transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <div className="h-4 w-px bg-slate-800 mx-1" />
                <button
                  onClick={() => setShowGrid((g) => !g)}
                  className={`p-1.5 rounded-lg transition-colors ${showGrid ? 'bg-astro-blue/20 text-astro-cyan' : 'bg-space-800 text-slate-400'}`}
                  title="Toggle Astrometric Grid"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowReticle((r) => !r)}
                  className={`p-1.5 rounded-lg transition-colors ${showReticle ? 'bg-astro-blue/20 text-astro-cyan' : 'bg-space-800 text-slate-400'}`}
                  title="Toggle RA/Dec Crosshair"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Viewport Canvas Surface */}
            <div className="relative flex-1 bg-space-950 flex items-center justify-center overflow-hidden select-none">
              {/* Background Plate Simulation with Celestial Stars */}
              <div 
                className="relative w-full h-full flex items-center justify-center transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel / 100})` }}
              >
                {/* Simulated Astronomical Plate Grid */}
                {showGrid && (
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#141e38_1px,transparent_1px),linear-gradient(to_bottom,#141e38_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 pointer-events-none" />
                )}

                {/* Simulated Star Cluster & Nebula Dust */}
                <div className="relative w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-astro-blue/5 via-astro-cyan/5 to-transparent blur-2xl pointer-events-none" />

                {/* Simulated Point Sources */}
                <div className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff] top-1/3 left-1/4" />
                <div className="absolute w-3 h-3 rounded-full bg-cyan-100 shadow-[0_0_12px_#22D3EE] top-1/2 left-1/2" />
                <div className="absolute w-1.5 h-1.5 rounded-full bg-white top-2/3 right-1/3" />
                <div className="absolute w-2.5 h-2.5 rounded-full bg-blue-100 shadow-[0_0_10px_#3B82F6] bottom-1/4 left-1/3" />
                <div className="absolute w-1.5 h-1.5 rounded-full bg-white top-1/4 right-1/4" />

                {/* Central Reticle */}
                {showReticle && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-24 h-24 border border-astro-cyan/40 rounded-full flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-astro-cyan" />
                      <div className="absolute w-full h-px bg-astro-cyan/30" />
                      <div className="absolute h-full w-px bg-astro-cyan/30" />
                    </div>
                  </div>
                )}
              </div>

              {/* Real-time Viewport Coordinate Overlay */}
              <div className="absolute bottom-4 left-4 p-2.5 rounded-xl bg-space-900/90 border border-slate-800 text-[10px] font-mono text-slate-300 space-y-0.5 backdrop-blur-md">
                <div>
                  <span className="text-slate-500">RA (J2000): </span>
                  <span className="text-white font-bold">{activeObs?.raCenter ? `${activeObs.raCenter.toFixed(4)}°` : '184.2254° (12h 16m 54.1s)'}</span>
                </div>
                <div>
                  <span className="text-slate-500">DEC (J2000): </span>
                  <span className="text-white font-bold">{activeObs?.decCenter ? `+${activeObs.decCenter.toFixed(4)}°` : '+29.8142° (+29° 48\' 51")'}</span>
                </div>
                <div>
                  <span className="text-slate-500">PIXEL SCALE: </span>
                  <span className="text-astro-cyan">0.82″ / pixel</span>
                </div>
              </div>

              {/* Palette / Colormap indicator */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2 p-1.5 rounded-xl bg-space-900/90 border border-slate-800 text-[10px] font-mono backdrop-blur-md">
                <span className="text-slate-400">COLORMAP:</span>
                <span className="text-astro-cyan uppercase font-bold">{colorMap}</span>
              </div>
            </div>

            {/* Viewer Bottom Controls */}
            <div className="p-3 bg-space-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Palette:</span>
                {(['greyscale', 'viridis', 'heat', 'plasma'] as const).map((map) => (
                  <button
                    key={map}
                    onClick={() => setColorMap(map)}
                    className={`px-2 py-1 rounded text-[11px] font-mono capitalize transition-colors ${
                      colorMap === map
                        ? 'bg-astro-blue/20 text-astro-cyan border border-astro-blue/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {map}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Stretch:</span>
                {(['zscale', 'asinh', 'log', 'linear'] as const).map((stretch) => (
                  <button
                    key={stretch}
                    onClick={() => setContrastStretch(stretch)}
                    className={`px-2 py-1 rounded text-[11px] font-mono uppercase transition-colors ${
                      contrastStretch === stretch
                        ? 'bg-space-800 text-white border border-slate-700'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {stretch}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Epoch Timeline / Loaded Observations Switcher */}
          <div className="p-4 rounded-xl bg-space-850 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-astro-blue" />
                Observation Frame Sequence ({observations.length} Loaded)
              </span>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="text-xs text-astro-cyan hover:underline flex items-center gap-1 font-mono"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Import More Frames
              </button>
            </div>

            {observations.length === 0 ? (
              <div className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-800 rounded-lg">
                No observations loaded in active session. Click <button onClick={() => setIsImportModalOpen(true)} className="text-astro-cyan underline">Import FITS</button> to add multi-epoch plates.
              </div>
            ) : (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {observations.map((obs, idx) => (
                  <button
                    key={obs.id}
                    onClick={() => setSelectedObservation(obs)}
                    className={`px-3 py-2 rounded-lg text-left text-xs font-mono shrink-0 transition-all border ${
                      activeObs?.id === obs.id
                        ? 'bg-astro-blue/15 border-astro-blue text-white shadow-glow-blue'
                        : 'bg-space-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-white truncate max-w-[140px]">
                      Epoch #{idx + 1}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                      {obs.filename}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scientific Metadata Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-space-850 border border-slate-800 shadow-glass space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white font-display flex items-center gap-2">
                <FileCode className="w-4 h-4 text-astro-cyan" />
                FITS Header Metadata
              </h3>
              {activeObs?.inspectionSource === 'astropy_backend' ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  ASTROPY VALIDATED
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-900 text-slate-400 border border-slate-800">
                  PRIMARY HDU
                </span>
              )}
            </div>

            {/* Metadata Fields */}
            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">OBJECT:</span>
                <span className="text-slate-200 font-semibold">{activeObs?.targetName || 'UNTITLED'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">TELESCOPE:</span>
                <span className="text-slate-200">{activeObs?.telescope || 'N/A'}</span>
              </div>
              {activeObs?.instrument && (
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">INSTRUMENT:</span>
                  <span className="text-slate-200">{activeObs.instrument}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">FILTER BAND:</span>
                <span className="text-astro-cyan">{activeObs?.filterBand || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">EXPOSURE:</span>
                <span className="text-slate-200">{activeObs?.exptime != null ? `${activeObs.exptime} s` : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">RA / DEC:</span>
                <span className="text-slate-200">
                  {activeObs?.raCenter != null && activeObs?.decCenter != null
                    ? `${activeObs.raCenter.toFixed(4)}°, ${activeObs.decCenter.toFixed(4)}°`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">WCS CALIBRATION:</span>
                <span className={activeObs?.wcsAvailable ? 'text-emerald-400' : 'text-slate-400'}>
                  {activeObs?.wcsAvailable ? 'Celestial Validated' : 'Uncalibrated'}
                </span>
              </div>
              {activeObs?.pixelScaleArcsec != null && (
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">PIXEL SCALE:</span>
                  <span className="text-astro-cyan">{activeObs.pixelScaleArcsec}″/px</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">BITPIX:</span>
                <span className="text-slate-200">{activeObs?.bitpix != null ? `${activeObs.bitpix}` : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">DIMENSIONS:</span>
                <span className="text-slate-200">
                  {activeObs?.dimensions ? `${activeObs.dimensions.width} × ${activeObs.dimensions.height} px` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Quick Astrometric Actions */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  if (activeObs?.headersSummary && Object.keys(activeObs.headersSummary).length > 0) {
                    const text = Object.entries(activeObs.headersSummary)
                      .map(([k, v]) => `${k.padEnd(8)} = ${v}`)
                      .join('\n')
                    navigator.clipboard.writeText(text)
                    notify('FITS Header Export', 'Copied authentic Astropy header cards to clipboard.', 'success')
                  } else {
                    notify('Header Export', 'No additional header cards stored for this frame.', 'info')
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-space-800 hover:bg-space-750 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
              >
                Copy Raw Header Cards
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
