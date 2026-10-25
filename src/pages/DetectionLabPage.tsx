import React, { useState } from 'react'
import { 
  Scan, 
  Sliders, 
  Layers, 
  Info, 
  Play, 
  Eye, 
  EyeOff
} from 'lucide-react'
import { useAstrion } from '../context/AstrionContext'
import { DetectionService } from '../services/detection.service'
import type { DetectionParameters } from '../types/astronomy'

export const DetectionLabPage: React.FC = () => {
  const { observations, notify } = useAstrion()
  const [params, setParams] = useState<DetectionParameters>(DetectionService.getDefaultParameters())
  const [showApertures, setShowApertures] = useState(true)
  const [showCentroids, setShowCentroids] = useState(true)
  const [isDetecting, setIsDetecting] = useState(false)

  const handleRunDetection = () => {
    if (observations.length === 0) {
      notify('No Observation Selected', 'Import a FITS observation before running source detection.', 'warning')
      return
    }

    setIsDetecting(true)
    notify('Detection Dispatched', `Invoking ${params.algorithm} algorithm with ${params.thresholdSigma}σ threshold...`, 'info')

    setTimeout(() => {
      setIsDetecting(false)
      notify('Detection Completed (Demo Shell)', 'Extracted candidate point sources in viewport overlay.', 'success')
    }, 1200)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Backend Integration Notice */}
      <div className="p-3.5 rounded-xl bg-space-850/80 border border-astro-cyan/30 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-astro-cyan shrink-0" />
          <span>
            <strong className="text-white">Detection Lab:</strong> Automated PSF photometry and 2D background estimation interface. Designed to connect to Astropy <code className="text-astro-cyan font-mono">photutils / sep</code> engines.
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-900 text-slate-400 border border-slate-700 shrink-0 hidden sm:inline-block">
          Photutils / SEP Astropy
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Source Detection Visualization & Overlays */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-2xl bg-space-950 border border-slate-800 overflow-hidden shadow-glass flex flex-col h-[520px]">
            {/* Top Toolbar */}
            <div className="px-4 py-3 bg-space-900/90 border-b border-slate-800 flex items-center justify-between gap-3 text-xs z-10">
              <div className="flex items-center gap-2">
                <Scan className="w-4 h-4 text-astro-cyan" />
                <span className="font-semibold text-white">Detection Viewport & Aperture Overlay</span>
              </div>

              {/* Overlay Toggles */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowApertures((a) => !a)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                    showApertures ? 'bg-astro-blue/20 text-astro-cyan border border-astro-blue/40' : 'bg-space-800 text-slate-500'
                  }`}
                >
                  {showApertures ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>Apertures (3×FWHM)</span>
                </button>
                <button
                  onClick={() => setShowCentroids((c) => !c)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                    showCentroids ? 'bg-astro-violet/20 text-astro-violet border border-astro-violet/40' : 'bg-space-800 text-slate-500'
                  }`}
                >
                  {showCentroids ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>Centroid Crosses</span>
                </button>
              </div>
            </div>

            {/* Viewport Canvas Simulation */}
            <div className="relative flex-1 bg-space-950 flex items-center justify-center overflow-hidden">
              {/* Subtle background FITS noise plate */}
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

              {/* Sample Detected Stars with Photometric Apertures */}
              {[
                { x: '25%', y: '30%', flux: '14,290 ADU', snr: '42.8σ', id: 'SRC-01' },
                { x: '52%', y: '48%', flux: '31,840 ADU', snr: '88.1σ', id: 'SRC-02' },
                { x: '70%', y: '25%', flux: '4,120 ADU', snr: '8.4σ', id: 'SRC-03' },
                { x: '35%', y: '75%', flux: '8,950 ADU', snr: '18.2σ', id: 'SRC-04' },
                { x: '80%', y: '65%', flux: '2,640 ADU', snr: '4.6σ', id: 'SRC-05' },
              ].map((src) => (
                <div
                  key={src.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  style={{ left: src.x, top: src.y }}
                >
                  {/* Star Light Dot */}
                  <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />

                  {/* Photometric Aperture Ring */}
                  {showApertures && (
                    <div className="absolute -inset-3.5 rounded-full border border-astro-cyan/60 group-hover:border-astro-cyan group-hover:bg-astro-cyan/10 transition-colors pointer-events-none" />
                  )}

                  {/* Centroid Crosshair */}
                  {showCentroids && (
                    <div className="absolute -inset-2 pointer-events-none">
                      <div className="w-full h-px bg-astro-violet/70 absolute top-1/2 -translate-y-1/2" />
                      <div className="h-full w-px bg-astro-violet/70 absolute left-1/2 -translate-x-1/2" />
                    </div>
                  )}

                  {/* Tooltip on Hover */}
                  <div className="absolute left-6 top-0 hidden group-hover:block p-2 rounded-lg bg-space-900/95 border border-slate-700 text-[10px] font-mono text-slate-200 z-20 whitespace-nowrap shadow-xl">
                    <div className="text-astro-cyan font-bold">{src.id}</div>
                    <div>Flux: {src.flux}</div>
                    <div>SNR: {src.snr}</div>
                  </div>
                </div>
              ))}

              {/* Status overlay */}
              <div className="absolute bottom-4 left-4 p-2.5 rounded-xl bg-space-900/90 border border-slate-800 text-[10px] font-mono text-slate-300 backdrop-blur-md">
                <div>ESTIMATED NOISE RMS: <span className="text-white font-bold">12.4 ADU</span></div>
                <div>SKY BACKGROUND: <span className="text-white font-bold">142.1 ADU / px</span></div>
              </div>
            </div>

            {/* Bottom Bar: Action */}
            <div className="p-3 bg-space-900 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                Algorithm: <strong className="text-white">{params.algorithm}</strong> | Sigma: <strong className="text-astro-cyan">{params.thresholdSigma}σ</strong>
              </span>
              <button
                onClick={handleRunDetection}
                disabled={isDetecting}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-astro-blue hover:bg-blue-600 shadow-glow-blue transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{isDetecting ? 'Detecting...' : 'Execute Detection'}</span>
              </button>
            </div>
          </div>

          {/* 2D Background Estimation Panel */}
          <div className="p-5 rounded-2xl bg-space-850 border border-slate-800 shadow-glass space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white font-display flex items-center gap-2">
                <Layers className="w-4 h-4 text-astro-violet" />
                2D Background Mesh Modeling
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-900 text-slate-400">
                {params.backgroundMethod}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-space-900 border border-slate-800">
                <div className="text-slate-500 text-[10px]">BOX SIZE</div>
                <div className="text-sm font-bold text-white mt-1">64 × 64 px</div>
                <div className="text-[10px] text-slate-400">Local background mesh</div>
              </div>
              <div className="p-3 rounded-xl bg-space-900 border border-slate-800">
                <div className="text-slate-500 text-[10px]">FILTER SIZE</div>
                <div className="text-sm font-bold text-white mt-1">3 × 3</div>
                <div className="text-[10px] text-slate-400">Median smoothing window</div>
              </div>
              <div className="p-3 rounded-xl bg-space-900 border border-slate-800">
                <div className="text-slate-500 text-[10px]">CLIPPING ITERATIONS</div>
                <div className="text-sm font-bold text-white mt-1">5 Iterations</div>
                <div className="text-[10px] text-slate-400">3.0σ outliers rejected</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detection Controls & Parameters Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-space-850 border border-slate-800 shadow-glass space-y-5">
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
                <span className="font-semibold text-slate-300">Detection Threshold</span>
                <span className="font-mono text-astro-cyan font-bold">{params.thresholdSigma}σ</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="8.0"
                step="0.1"
                value={params.thresholdSigma}
                onChange={(e) => setParams({ ...params, thresholdSigma: parseFloat(e.target.value) })}
                className="w-full h-2 bg-space-900 rounded-lg appearance-none cursor-pointer accent-astro-cyan"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1.5σ (Faint)</span>
                <span>8.0σ (Bright Only)</span>
              </div>
            </div>

            {/* FWHM Pixels */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">PSF FWHM Target</span>
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
                Full-width at half-maximum for stellar Gaussian kernel
              </p>
            </div>

            {/* Min Area Pixels */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Minimum Connected Pixels</span>
                <span className="font-mono text-white font-bold">{params.minAreaPixels} px</span>
              </div>
              <input
                type="range"
                min="3"
                max="25"
                step="1"
                value={params.minAreaPixels}
                onChange={(e) => setParams({ ...params, minAreaPixels: parseInt(e.target.value) })}
                className="w-full h-2 bg-space-900 rounded-lg appearance-none cursor-pointer accent-astro-blue"
              />
              <p className="text-[10px] text-slate-400">
                Filters single-pixel cosmic ray strikes
              </p>
            </div>

            {/* Algorithm Select */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300">
                Detection Algorithm
              </label>
              <select
                value={params.algorithm}
                onChange={(e) => setParams({ ...params, algorithm: e.target.value as any })}
                className="w-full px-3 py-2 bg-space-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-astro-blue transition-colors cursor-pointer"
              >
                <option value="sep_astropy">SEP (Source Extractor Python)</option>
                <option value="daofind">DAOStarFinder (Stellar PSF)</option>
                <option value="wavelet_transform">Wavelet Multiscale Transform</option>
              </select>
            </div>

            {/* Deblend Thresholds */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Deblending Sub-Thresholds
              </label>
              <select
                value={params.deblendThresholds}
                onChange={(e) => setParams({ ...params, deblendThresholds: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-space-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-astro-blue transition-colors cursor-pointer"
              >
                <option value={16}>16 levels (Fast)</option>
                <option value={32}>32 levels (Standard Balanced)</option>
                <option value={64}>64 levels (Dense Star Cluster)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
