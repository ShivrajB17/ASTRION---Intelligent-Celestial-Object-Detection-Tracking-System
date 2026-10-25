import React, { useState, useEffect } from 'react'
import { 
  Scan, 
  Sliders, 
  Layers, 
  Info, 
  Play, 
  Eye, 
  EyeOff,
  Crosshair,
  Download,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { useAstrion } from '../context/AstrionContext'
import { DetectionService, type DetectedSource } from '../services/detection.service'
import { backendApi } from '../services/backendApi.service'
import type { DetectionParameters } from '../types/astronomy'

export const DetectionLabPage: React.FC = () => {
  const { observations, selectedObservation, setSelectedObservation, notify } = useAstrion()
  const [params, setParams] = useState<DetectionParameters>(DetectionService.getDefaultParameters())
  const [showApertures, setShowApertures] = useState(true)
  const [showCentroids, setShowCentroids] = useState(true)
  const [activeLayer, setActiveLayer] = useState<'raw' | 'subtracted' | 'background'>('raw')
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectedSources, setDetectedSources] = useState<DetectedSource[]>([])
  const [selectedSource, setSelectedSource] = useState<DetectedSource | null>(null)
  const [backgroundMedian, setBackgroundMedian] = useState<number | null>(null)
  const [backgroundRms, setBackgroundRms] = useState<number | null>(null)
  const [execTimeMs, setExecTimeMs] = useState<number | null>(null)
  const [subtractedUrl, setSubtractedUrl] = useState<string | null>(null)
  const [bkgMapUrl, setBkgMapUrl] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [searchQuery, setSearchQuery] = useState('')

  const activeObs = selectedObservation || (observations.length > 0 ? observations[0] : null)

  // Load existing detection results if already run for this observation
  useEffect(() => {
    if (!activeObs) return
    let isMounted = true

    backendApi.getDetectionResults(activeObs.id).then((res) => {
      if (!isMounted || !res) return
      const mapped: DetectedSource[] = res.sources.map((s) => ({
        id: s.id,
        sourceNumber: s.source_number,
        x: s.x,
        y: s.y,
        centroidX: s.centroid_x,
        centroidY: s.centroid_y,
        centroidUncertainty: s.centroid_uncertainty,
        ra: s.ra_deg,
        dec: s.dec_deg,
        skyCoordAvailable: s.sky_coord_available,
        peak: s.peak,
        flux: s.flux,
        fwhm: s.fwhm,
        snr: s.snr,
        sharpness: s.sharpness,
        roundness: s.roundness,
        flags: s.flags,
        quality: s.quality,
      }))
      setDetectedSources(mapped)
      setBackgroundMedian(res.background_median)
      setBackgroundRms(res.background_rms)
      setExecTimeMs(res.execution_time_ms)
      setSubtractedUrl(backendApi.getDetectionSubtractedPreviewUrl(activeObs.id))
      setBkgMapUrl(backendApi.getDetectionBackgroundMapPreviewUrl(activeObs.id))
      if (mapped.length > 0) setSelectedSource(mapped[0])
    })

    return () => {
      isMounted = false
    }
  }, [activeObs?.id])

  const handleRunDetection = async () => {
    if (!activeObs) {
      notify('No Observation Selected', 'Import or select a FITS observation before running source detection.', 'warning')
      return
    }

    setIsDetecting(true)
    notify('Detection Dispatched', `Running Photutils ${params.algorithm} at ${params.thresholdSigma}σ...`, 'info')

    const result = await DetectionService.detectSources(activeObs.id, params)
    setIsDetecting(false)

    if (result.success && result.data) {
      setDetectedSources(result.data.sources)
      setBackgroundMedian(result.data.backgroundMedian)
      setBackgroundRms(result.data.backgroundRms)
      setExecTimeMs(result.data.executionTimeMs)
      setSubtractedUrl(backendApi.getDetectionSubtractedPreviewUrl(activeObs.id))
      setBkgMapUrl(backendApi.getDetectionBackgroundMapPreviewUrl(activeObs.id))
      if (result.data.sources.length > 0) {
        setSelectedSource(result.data.sources[0])
      }
      notify(
        'Detection Complete',
        `Extracted ${result.data.count} genuine sources in ${result.data.executionTimeMs}ms.`,
        'success'
      )
    } else {
      notify('Detection Failed', result.error?.message || 'Error executing source detection.', 'error')
    }
  }

  const exportCatalogCsv = () => {
    if (detectedSources.length === 0) return
    const headers = ['ID', 'Source_No', 'X', 'Y', 'Centroid_X', 'Centroid_Y', 'Centroid_Uncertainty_px', 'RA_deg', 'DEC_deg', 'Peak_ADU', 'Flux_ADU', 'FWHM_px', 'SNR', 'Quality']
    const rows = detectedSources.map((s) => [
      s.id,
      s.sourceNumber,
      s.x,
      s.y,
      s.centroidX,
      s.centroidY,
      s.centroidUncertainty,
      s.ra != null ? s.ra.toFixed(6) : 'N/A',
      s.dec != null ? s.dec.toFixed(6) : 'N/A',
      s.peak,
      s.flux,
      s.fwhm,
      s.snr,
      s.quality,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `astrion_sources_${activeObs?.id || 'catalog'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    notify('Catalog Exported', 'Saved detection catalog as CSV.', 'success')
  }

  const getCurrentImageUrl = (): string | null => {
    if (!activeObs) return null
    if (activeLayer === 'subtracted' && subtractedUrl) return subtractedUrl
    if (activeLayer === 'background' && bkgMapUrl) return bkgMapUrl
    return activeObs.hasPreview && activeObs.previewUrl ? activeObs.previewUrl : null
  }

  const imgWidth = activeObs?.dimensions?.width || 1000
  const imgHeight = activeObs?.dimensions?.height || 1000

  const filteredSources = detectedSources.filter(
    (s) =>
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.quality.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Scientific Header Notice */}
      <div className="p-3.5 rounded-xl bg-space-850/80 border border-astro-cyan/30 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-astro-cyan shrink-0" />
          <span>
            <strong className="text-white">Detection Lab:</strong> Authentic 2D background modeling (<code className="text-astro-cyan font-mono">photutils Background2D</code>), DAOStarFinder stellar point source detection, and sub-pixel intensity-weighted centroid extraction.
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-900 text-slate-400 border border-slate-700 shrink-0 hidden sm:inline-block">
          Photutils / Astropy Engine
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Viewport & Image Overlays */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-2xl bg-space-950 border border-slate-800 overflow-hidden shadow-glass flex flex-col h-[540px]">
            {/* Top Toolbar */}
            <div className="px-4 py-3 bg-space-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs z-10">
              <div className="flex items-center gap-2 min-w-0">
                <Scan className="w-4 h-4 text-astro-cyan shrink-0" />
                <span className="font-semibold text-white truncate">
                  {activeObs ? activeObs.filename : 'No Observation Loaded'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-space-800 text-slate-400 border border-slate-700 shrink-0">
                  {detectedSources.length} Sources
                </span>
              </div>

              {/* Layer View Switcher */}
              <div className="flex items-center gap-1.5 bg-space-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
                <button
                  onClick={() => setActiveLayer('raw')}
                  className={`px-2 py-0.5 rounded ${activeLayer === 'raw' ? 'bg-astro-blue/20 text-astro-cyan font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Raw FITS
                </button>
                <button
                  onClick={() => setActiveLayer('subtracted')}
                  className={`px-2 py-0.5 rounded ${activeLayer === 'subtracted' ? 'bg-astro-blue/20 text-astro-cyan font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Bkg-Subtracted
                </button>
                <button
                  onClick={() => setActiveLayer('background')}
                  className={`px-2 py-0.5 rounded ${activeLayer === 'background' ? 'bg-astro-blue/20 text-astro-cyan font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  2D Bkg Map
                </button>
              </div>

              {/* Overlay Toggles & Zoom */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowApertures((a) => !a)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                    showApertures ? 'bg-astro-blue/20 text-astro-cyan border border-astro-blue/40' : 'bg-space-800 text-slate-500'
                  }`}
                  title="Toggle 3xFWHM Photometric Apertures"
                >
                  {showApertures ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>Apertures</span>
                </button>
                <button
                  onClick={() => setShowCentroids((c) => !c)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                    showCentroids ? 'bg-astro-violet/20 text-astro-violet border border-astro-violet/40' : 'bg-space-800 text-slate-500'
                  }`}
                  title="Toggle Sub-Pixel Centroid Crosshairs"
                >
                  {showCentroids ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>Centroids</span>
                </button>
                <div className="h-4 w-px bg-slate-800 mx-0.5" />
                <button
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                  className="p-1 rounded bg-space-800 text-slate-400 hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="font-mono text-[10px] text-slate-400 w-8 text-center">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(300, z + 25))}
                  className="p-1 rounded bg-space-800 text-slate-400 hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Viewport Surface */}
            <div className="relative flex-1 bg-space-950 flex items-center justify-center overflow-hidden select-none">
              <div 
                className="relative flex items-center justify-center transition-transform duration-150"
                style={{ transform: `scale(${zoomLevel / 100})` }}
              >
                {getCurrentImageUrl() ? (
                  <div className="relative inline-block">
                    <img
                      src={getCurrentImageUrl()!}
                      alt="Astronomical Plate"
                      className="max-w-[500px] max-h-[440px] object-contain rounded-lg shadow-2xl block border border-slate-800"
                    />

                    {/* Detected Source Overlays mapped to genuine image coordinate space */}
                    {detectedSources.map((src) => {
                      // Invert Y for FITS coordinate mapping (FITS origin is bottom-left, web image origin is top-left)
                      const leftPercent = (src.centroidX / imgWidth) * 100
                      const bottomPercent = (src.centroidY / imgHeight) * 100
                      const isSelected = selectedSource?.id === src.id

                      return (
                        <div
                          key={src.id}
                          onClick={() => setSelectedSource(src)}
                          className="absolute -translate-x-1/2 translate-y-1/2 cursor-pointer group z-20"
                          style={{ left: `${leftPercent}%`, bottom: `${bottomPercent}%` }}
                        >
                          {/* Centroid Dot */}
                          <div
                            className={`w-2 h-2 rounded-full transition-all ${
                              isSelected
                                ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b] scale-125'
                                : 'bg-white shadow-[0_0_6px_#ffffff]'
                            }`}
                          />

                          {/* Photometric Aperture Ring (3 * FWHM scaled) */}
                          {showApertures && (
                            <div
                              className={`absolute -inset-3 rounded-full border pointer-events-none transition-colors ${
                                isSelected
                                  ? 'border-amber-400 bg-amber-400/15'
                                  : 'border-astro-cyan/60 group-hover:border-astro-cyan group-hover:bg-astro-cyan/10'
                              }`}
                            />
                          )}

                          {/* Centroid Crosshair */}
                          {showCentroids && (
                            <div className="absolute -inset-2 pointer-events-none">
                              <div className="w-full h-px bg-astro-violet/80 absolute top-1/2 -translate-y-1/2" />
                              <div className="h-full w-px bg-astro-violet/80 absolute left-1/2 -translate-x-1/2" />
                            </div>
                          )}

                          {/* Interactive Hover Tooltip */}
                          <div className="absolute left-4 top-0 hidden group-hover:block p-2 rounded-lg bg-space-900/95 border border-slate-700 text-[10px] font-mono text-slate-200 z-30 whitespace-nowrap shadow-2xl backdrop-blur-md">
                            <div className="text-astro-cyan font-bold">{src.id}</div>
                            <div>Peak: {src.peak.toLocaleString()} ADU</div>
                            <div>SNR: {src.snr.toFixed(1)}σ</div>
                            <div>Centroid: ({src.centroidX.toFixed(1)}, {src.centroidY.toFixed(1)})</div>
                            {src.skyCoordAvailable && (
                              <div className="text-slate-400">RA/Dec: {src.ra?.toFixed(4)}°, {src.dec?.toFixed(4)}°</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 font-mono text-xs">
                    No genuine observation preview available. Select or import a FITS observation.
                  </div>
                )}
              </div>

              {/* Status HUD Overlay */}
              <div className="absolute bottom-4 left-4 p-2.5 rounded-xl bg-space-900/90 border border-slate-800 text-[10px] font-mono text-slate-300 space-y-1 backdrop-blur-md z-30">
                <div>
                  <span className="text-slate-500">SKY NOISE RMS: </span>
                  <span className="text-white font-bold">{backgroundRms != null ? `${backgroundRms} ADU` : 'Pending Detection'}</span>
                </div>
                <div>
                  <span className="text-slate-500">SKY BACKGROUND: </span>
                  <span className="text-white font-bold">{backgroundMedian != null ? `${backgroundMedian} ADU / px` : 'Pending Detection'}</span>
                </div>
                {execTimeMs != null && (
                  <div>
                    <span className="text-slate-500">EXECUTION TIME: </span>
                    <span className="text-emerald-400 font-semibold">{execTimeMs} ms</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Bar: Action */}
            <div className="p-3 bg-space-900 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                Algorithm: <strong className="text-white">{params.algorithm}</strong> | Sigma: <strong className="text-astro-cyan">{params.thresholdSigma}σ</strong> | FWHM: <strong className="text-white">{params.fwhmPixels} px</strong>
              </span>
              <button
                onClick={handleRunDetection}
                disabled={isDetecting || !activeObs}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-astro-blue hover:bg-blue-600 shadow-glow-blue transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{isDetecting ? 'Extracting Sources...' : 'Execute Detection'}</span>
              </button>
            </div>
          </div>

          {/* Source Catalog Table */}
          <div className="p-4 rounded-2xl bg-space-850 border border-slate-800 shadow-glass space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white font-display">
                  Detected Source Catalog ({detectedSources.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter by ID or quality..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-2.5 py-1 bg-space-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-astro-blue w-44 font-mono"
                />
                <button
                  onClick={exportCatalogCsv}
                  disabled={detectedSources.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-space-800 hover:bg-space-750 text-xs font-mono text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
                  title="Export Catalog CSV"
                >
                  <Download className="w-3.5 h-3.5 text-astro-cyan" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {detectedSources.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center font-mono">
                No sources detected yet. Click "Execute Detection" to run Photutils DAOStarFinder on this frame.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-space-900 text-slate-400 text-[10px] uppercase sticky top-0">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Source ID</th>
                      <th className="p-2">Centroid (X, Y)</th>
                      <th className="p-2">Uncertainty</th>
                      <th className="p-2">RA (J2000)</th>
                      <th className="p-2">DEC (J2000)</th>
                      <th className="p-2">Peak (ADU)</th>
                      <th className="p-2">Flux (ADU)</th>
                      <th className="p-2">SNR</th>
                      <th className="p-2">Quality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSources.map((src) => {
                      const isSelected = selectedSource?.id === src.id
                      return (
                        <tr
                          key={src.id}
                          onClick={() => setSelectedSource(src)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-astro-blue/20 text-white'
                              : 'text-slate-300 hover:bg-space-800/60'
                          }`}
                        >
                          <td className="p-2 text-slate-500">{src.sourceNumber}</td>
                          <td className="p-2 font-bold text-astro-cyan">{src.id}</td>
                          <td className="p-2">({src.centroidX.toFixed(2)}, {src.centroidY.toFixed(2)})</td>
                          <td className="p-2 text-slate-400">±{src.centroidUncertainty.toFixed(3)} px</td>
                          <td className="p-2 text-slate-200">{src.ra != null ? `${src.ra.toFixed(4)}°` : 'N/A'}</td>
                          <td className="p-2 text-slate-200">{src.dec != null ? `${src.dec.toFixed(4)}°` : 'N/A'}</td>
                          <td className="p-2">{src.peak.toLocaleString()}</td>
                          <td className="p-2">{src.flux.toLocaleString()}</td>
                          <td className="p-2 font-semibold text-emerald-400">{src.snr.toFixed(1)}σ</td>
                          <td className="p-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                                src.quality === 'clean'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : src.quality === 'edge'
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : src.quality === 'saturated'
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                  : 'bg-slate-700/40 text-slate-400'
                              }`}
                            >
                              {src.quality}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Parameters & Selected Source Detail Inspector */}
        <div className="lg:col-span-4 space-y-4">
          {/* Selected Source Inspector Card */}
          {selectedSource && (
            <div className="p-4 rounded-2xl bg-space-850 border border-astro-cyan/30 shadow-glass space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5 text-astro-cyan" />
                  Source Inspector: {selectedSource.id}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                    selectedSource.quality === 'clean'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {selectedSource.quality}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-space-900 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">PEAK INTENSITY</div>
                  <div className="text-sm font-bold text-white mt-0.5">{selectedSource.peak.toLocaleString()} ADU</div>
                </div>
                <div className="p-2 rounded bg-space-900 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">APERTURE FLUX</div>
                  <div className="text-sm font-bold text-white mt-0.5">{selectedSource.flux.toLocaleString()} ADU</div>
                </div>
                <div className="p-2 rounded bg-space-900 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">CENTROID (X, Y)</div>
                  <div className="text-xs font-bold text-astro-cyan mt-0.5">
                    ({selectedSource.centroidX.toFixed(3)}, {selectedSource.centroidY.toFixed(3)})
                  </div>
                </div>
                <div className="p-2 rounded bg-space-900 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">CENTROID UNCERTAINTY</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">±{selectedSource.centroidUncertainty.toFixed(4)} px</div>
                </div>
                <div className="p-2 rounded bg-space-900 border border-slate-800 col-span-2">
                  <div className="text-slate-500 text-[10px]">CELESTIAL WCS COORDINATES</div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {selectedSource.skyCoordAvailable && selectedSource.ra != null && selectedSource.dec != null
                      ? `RA: ${selectedSource.ra.toFixed(6)}° | DEC: ${selectedSource.dec.toFixed(6)}°`
                      : 'Uncalibrated (WCS unavailable)'}
                  </div>
                </div>
                <div className="p-2 rounded bg-space-900 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">SNR</div>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5">{selectedSource.snr.toFixed(1)}σ</div>
                </div>
                <div className="p-2 rounded bg-space-900 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">SHARPNESS / ROUND</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">
                    {selectedSource.sharpness != null ? selectedSource.sharpness.toFixed(2) : 'N/A'} / {selectedSource.roundness != null ? selectedSource.roundness.toFixed(2) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Configurable Detection Parameters */}
          <div className="p-5 rounded-2xl bg-space-850 border border-slate-800 shadow-glass space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white font-display flex items-center gap-2">
                <Sliders className="w-4 h-4 text-astro-cyan" />
                Detection Parameters
              </h3>
              <button
                onClick={() => setParams(DetectionService.getDefaultParameters())}
                className="text-[10px] text-astro-cyan hover:underline font-mono"
              >
                Reset Defaults
              </button>
            </div>

            {/* Threshold Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Detection Threshold (Sigma)</span>
                <span className="font-mono text-astro-cyan font-bold">{params.thresholdSigma}σ</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="10.0"
                step="0.1"
                value={params.thresholdSigma}
                onChange={(e) => setParams({ ...params, thresholdSigma: parseFloat(e.target.value) })}
                className="w-full h-2 bg-space-900 rounded-lg appearance-none cursor-pointer accent-astro-cyan"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1.5σ (Faint)</span>
                <span>10.0σ (Bright Stars)</span>
              </div>
            </div>

            {/* FWHM Pixels */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Target Stellar PSF FWHM</span>
                <span className="font-mono text-white font-bold">{params.fwhmPixels} px</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.5"
                value={params.fwhmPixels}
                onChange={(e) => setParams({ ...params, fwhmPixels: parseFloat(e.target.value) })}
                className="w-full h-2 bg-space-900 rounded-lg appearance-none cursor-pointer accent-astro-blue"
              />
              <p className="text-[10px] text-slate-400">
                Gaussian kernel width for stellar starfinder match filter
              </p>
            </div>

            {/* Algorithm Select */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300">Detection Algorithm</label>
              <select
                value={params.algorithm}
                onChange={(e) => setParams({ ...params, algorithm: e.target.value as any })}
                className="w-full px-3 py-2 bg-space-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-astro-blue transition-colors cursor-pointer"
              >
                <option value="daofind">DAOStarFinder (Stellar PSF Match)</option>
                <option value="iraffind">IRAFStarFinder (IRAF Starfind Algorithm)</option>
              </select>
            </div>
          </div>

          {/* 2D Background Modeling Info */}
          <div className="p-4 rounded-2xl bg-space-850 border border-slate-800 shadow-glass space-y-3 text-xs font-mono">
            <h4 className="text-xs font-semibold text-white font-display flex items-center gap-2 border-b border-slate-800 pb-2">
              <Layers className="w-3.5 h-3.5 text-astro-violet" />
              2D Background Noise Mesh
            </h4>
            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Box Mesh Size:</span>
                <span className="text-white font-bold">64 × 64 px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Median Filter:</span>
                <span className="text-white font-bold">3 × 3 window</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sigma Clipping:</span>
                <span className="text-astro-cyan font-bold">3.0σ (5 iters)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Noise RMS:</span>
                <span className="text-white font-bold">{backgroundRms != null ? `${backgroundRms} ADU` : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
