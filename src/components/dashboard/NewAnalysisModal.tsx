import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, X, Telescope, Settings2, Sliders, Layers } from 'lucide-react'
import { useAstrion } from '../../context/AstrionContext'

export const NewAnalysisModal: React.FC = () => {
  const { 
    isNewAnalysisModalOpen, 
    setIsNewAnalysisModalOpen, 
    createAnalysis, 
    observations,
    runPipelineSimulation
  } = useAstrion()

  const [title, setTitle] = useState('Deep Sky Transient Survey #01')
  const [targetField, setTargetField] = useState('Ecliptic Plane / RA 184.22° Dec +29.81°')
  const [algorithm, setAlgorithm] = useState<'sep_astropy' | 'daofind' | 'wavelet'>('sep_astropy')
  const [thresholdSigma, setThresholdSigma] = useState(3.5)
  const [runImmediately, setRunImmediately] = useState(true)

  if (!isNewAnalysisModalOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createAnalysis(title, targetField)
    setIsNewAnalysisModalOpen(false)

    if (runImmediately && observations.length > 0) {
      setTimeout(() => {
        runPipelineSimulation()
      }, 400)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-space-850 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-space-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-astro-violet/10 border border-astro-violet/30 text-astro-violet">
                <Telescope className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white tracking-wide">Configure New Analysis</h3>
                <p className="text-xs text-slate-400">Initialize multi-epoch celestial tracking & source detection run</p>
              </div>
            </div>
            <button
              onClick={() => setIsNewAnalysisModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              {/* Investigation Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Investigation Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-space-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-astro-blue transition-colors"
                  placeholder="e.g. SPHEREx Transient Search 2026"
                  required
                />
              </div>

              {/* Target Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Field / Sky Region
                </label>
                <input
                  type="text"
                  value={targetField}
                  onChange={(e) => setTargetField(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-space-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-astro-blue transition-colors"
                  placeholder="e.g. RA 12h 16m 54s Dec +29° 48' 51''"
                  required
                />
              </div>

              {/* Algorithm & Sensitivity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5 text-astro-cyan" />
                    Detection Engine
                  </label>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-space-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-astro-blue transition-colors cursor-pointer"
                  >
                    <option value="sep_astropy">SEP / Source Extractor (Astropy)</option>
                    <option value="daofind">DAOStarFinder (Stellar PSF)</option>
                    <option value="wavelet">Wavelet Multiscale Transform</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-astro-cyan" />
                      Threshold (σ)
                    </label>
                    <span className="text-xs font-mono text-astro-cyan font-bold">{thresholdSigma}σ</span>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="8.0"
                    step="0.1"
                    value={thresholdSigma}
                    onChange={(e) => setThresholdSigma(parseFloat(e.target.value))}
                    className="w-full h-2 bg-space-900 rounded-lg appearance-none cursor-pointer accent-astro-cyan mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>1.5σ (High Sensitivity)</span>
                    <span>8.0σ (Conservative)</span>
                  </div>
                </div>
              </div>

              {/* Attached Observations Info */}
              <div className="p-3.5 rounded-xl bg-space-900/70 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-astro-blue" />
                  <div>
                    <div className="text-xs font-medium text-slate-200">
                      Observations in Scope
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {observations.length > 0
                        ? `${observations.length} FITS file${observations.length > 1 ? 's' : ''} available in current session`
                        : 'No observations loaded yet (Pipeline will initiate in idle state)'}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-space-800 text-astro-cyan border border-slate-700">
                  {observations.length} Frames
                </span>
              </div>

              {/* Trigger Immediately Toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={runImmediately}
                  onChange={(e) => setRunImmediately(e.target.checked)}
                  className="w-4 h-4 rounded bg-space-900 border-slate-700 text-astro-blue focus:ring-astro-blue"
                />
                <span className="text-xs text-slate-300">
                  Automatically start pipeline upon session launch
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-space-800/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsNewAnalysisModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-astro-blue to-astro-violet hover:from-blue-600 hover:to-violet-600 text-white shadow-glow-blue transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                Initialize Investigation
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
