import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  GitCommit, 
  Play, 
  Pause, 
  Sliders, 
  Info, 
  TrendingUp
} from 'lucide-react'
import { useAstrion } from '../context/AstrionContext'
import { TrajectoryService } from '../services/trajectory.service'
import type { TrackingParameters } from '../types/astronomy'

export const TrackingStudioPage: React.FC = () => {
  const { notify } = useAstrion()
  const [activeEpochIndex, setActiveEpochIndex] = useState(0)
  const [isBlinking, setIsBlinking] = useState(false)
  const [blinkSpeedMs, setBlinkSpeedMs] = useState(500)
  const [params, setParams] = useState<TrackingParameters>(TrajectoryService.getDefaultParameters())

  // Automated Blink Comparator Animation
  useEffect(() => {
    if (!isBlinking) return
    const interval = setInterval(() => {
      setActiveEpochIndex((prev) => (prev + 1) % 3)
    }, blinkSpeedMs)
    return () => clearInterval(interval)
  }, [isBlinking, blinkSpeedMs])

  // Simulated Epochs for the Blink Comparator
  const epochs = [
    { name: 'Epoch 1 (T0 + 00:00)', targetPos: { x: '35%', y: '40%' }, date: '2026-10-25 14:00 UTC' },
    { name: 'Epoch 2 (T0 + 01:15)', targetPos: { x: '45%', y: '48%' }, date: '2026-10-25 15:15 UTC' },
    { name: 'Epoch 3 (T0 + 02:30)', targetPos: { x: '55%', y: '56%' }, date: '2026-10-25 16:30 UTC' },
  ]

  const handleRunTracking = () => {
    notify('Trajectory Fit Dispatched', `Fitting tracklets with max velocity ${params.maxAngularVelocity}"/hr and Kalman filter active.`, 'info')
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Backend Integration Notice */}
      <div className="p-3.5 rounded-xl bg-space-850/80 border border-astro-violet/30 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-astro-violet shrink-0" />
          <span>
            <strong className="text-white">Tracking Studio:</strong> Multi-epoch blink comparator & trajectory state vector estimation. In Phase 2, this links detected centroids via KD-Tree spatial correlation.
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-900 text-slate-400 border border-slate-700 shrink-0 hidden sm:inline-block">
          KD-Tree / Kalman Filter
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Multi-Epoch Blink Comparator & Trajectory Plot */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-2xl bg-space-950 border border-slate-800 overflow-hidden shadow-glass flex flex-col h-[520px]">
            {/* Top Toolbar */}
            <div className="px-4 py-3 bg-space-900/90 border-b border-slate-800 flex items-center justify-between gap-3 text-xs z-10">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-astro-cyan" />
                <span className="font-semibold text-white">Multi-Epoch Blink Comparator</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-space-800 text-astro-cyan border border-slate-700">
                  {epochs[activeEpochIndex].name}
                </span>
              </div>

              {/* Blink Play/Pause & Speed */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBlinking((b) => !b)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isBlinking
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-astro-blue text-white shadow-glow-blue'
                  }`}
                >
                  {isBlinking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                  <span>{isBlinking ? 'Pause Blink' : 'Auto Blink'}</span>
                </button>

                <select
                  value={blinkSpeedMs}
                  onChange={(e) => setBlinkSpeedMs(parseInt(e.target.value))}
                  className="px-2 py-1 bg-space-800 border border-slate-700 rounded-lg text-xs text-slate-300 font-mono"
                >
                  <option value={300}>Fast (300ms)</option>
                  <option value={500}>Medium (500ms)</option>
                  <option value={1000}>Slow (1s)</option>
                </select>
              </div>
            </div>

            {/* Viewport: Dynamic Blink comparator canvas */}
            <div className="relative flex-1 bg-space-950 flex items-center justify-center overflow-hidden">
              {/* Background Plate Stars (Stationary) */}
              <div className="absolute w-2 h-2 rounded-full bg-white top-1/4 left-1/5 shadow-[0_0_8px_#ffffff]" />
              <div className="absolute w-3 h-3 rounded-full bg-cyan-100 top-2/3 left-1/4" />
              <div className="absolute w-2.5 h-2.5 rounded-full bg-blue-100 top-1/5 right-1/3" />
              <div className="absolute w-2 h-2 rounded-full bg-white bottom-1/5 right-1/4" />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-white top-1/2 right-1/5" />

              {/* Moving Asteroid / Candidate Marker - Shifts per active epoch! */}
              <motion.div
                key={activeEpochIndex}
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="absolute group cursor-pointer"
                style={{
                  left: epochs[activeEpochIndex].targetPos.x,
                  top: epochs[activeEpochIndex].targetPos.y,
                }}
              >
                {/* Moving Object Pulse */}
                <div className="w-3.5 h-3.5 rounded-full bg-astro-cyan shadow-glow-cyan" />
                <div className="absolute -inset-2.5 rounded-full border border-astro-cyan animate-ping opacity-75" />
                
                {/* Candidate Tracklet Tag */}
                <div className="absolute left-6 -top-2 whitespace-nowrap bg-space-900/90 border border-astro-cyan/40 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-200">
                  CANDIDATE #2026-X1 (Moving)
                </div>
              </motion.div>

              {/* Trajectory Vector Vector Line showing linked path */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                <defs>
                  <linearGradient id="trajGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                {/* Motion Vector Line */}
                <line
                  x1="35%"
                  y1="40%"
                  x2="55%"
                  y2="56%"
                  stroke="url(#trajGrad)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <circle cx="35%" cy="40%" r="4" fill="#3B82F6" />
                <circle cx="45%" cy="48%" r="4" fill="#60A5FA" />
                <circle cx="55%" cy="56%" r="4" fill="#22D3EE" />
              </svg>

              {/* Telemetry Box */}
              <div className="absolute bottom-4 left-4 p-3 rounded-xl bg-space-900/90 border border-slate-800 text-[10px] font-mono text-slate-300 space-y-1 backdrop-blur-md">
                <div className="text-astro-cyan font-bold">CALCULATED APPARENT MOTION:</div>
                <div>Velocity: <span className="text-white">14.82″ / hour</span></div>
                <div>Position Angle (PA): <span className="text-white">228.4° (South-West)</span></div>
                <div>Linear Correlation RMS: <span className="text-emerald-400">0.024″</span></div>
              </div>

              {/* Epoch Indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 p-1.5 rounded-xl bg-space-900/90 border border-slate-800 text-[11px] font-mono backdrop-blur-md">
                {epochs.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setIsBlinking(false)
                      setActiveEpochIndex(idx)
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                      activeEpochIndex === idx
                        ? 'bg-astro-cyan text-space-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    E{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="p-3 bg-space-900 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                3 Epoch Plates Registered • 1 Moving Vector Identified
              </span>
              <button
                onClick={handleRunTracking}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-astro-blue to-astro-violet hover:from-blue-600 hover:to-violet-600 shadow-glow-blue transition-all"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Compute Orbit Determination</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Tracking Parameters & Trajectory State */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-space-850 border border-slate-800 shadow-glass space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white font-display flex items-center gap-2">
                <Sliders className="w-4 h-4 text-astro-cyan" />
                Tracklet Linking Parameters
              </h3>
            </div>

            {/* Max Angular Velocity */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Max Angular Velocity</span>
                <span className="font-mono text-astro-cyan font-bold">{params.maxAngularVelocity}"/hr</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="50.0"
                step="0.5"
                value={params.maxAngularVelocity}
                onChange={(e) => setParams({ ...params, maxAngularVelocity: parseFloat(e.target.value) })}
                className="w-full h-2 bg-space-900 rounded-lg appearance-none cursor-pointer accent-astro-cyan"
              />
              <p className="text-[10px] text-slate-400">
                Covers typical Main Belt Asteroids (1–15″/hr) and fast NEOs (15–40″/hr)
              </p>
            </div>

            {/* Min Detections */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Min Epoch Detections</span>
                <span className="font-mono text-white font-bold">{params.minEpochDetections} epochs</span>
              </div>
              <input
                type="range"
                min="2"
                max="5"
                step="1"
                value={params.minEpochDetections}
                onChange={(e) => setParams({ ...params, minEpochDetections: parseInt(e.target.value) })}
                className="w-full h-2 bg-space-900 rounded-lg appearance-none cursor-pointer accent-astro-blue"
              />
            </div>

            {/* Kalman Filter Toggle */}
            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-white">Kalman Filter Predictor</div>
                  <div className="text-[10px] text-slate-400">Smooth state noise & extrapolate next frame</div>
                </div>
                <input
                  type="checkbox"
                  checked={params.kalmanFilterEnabled}
                  onChange={(e) => setParams({ ...params, kalmanFilterEnabled: e.target.checked })}
                  className="w-4 h-4 rounded bg-space-900 border-slate-700 text-astro-cyan focus:ring-astro-cyan"
                />
              </label>
            </div>

            {/* Chi-Square Max */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Max Chi-Squared (χ²)</span>
                <span className="font-mono text-white font-bold">{params.chiSquareMax}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={params.chiSquareMax}
                onChange={(e) => setParams({ ...params, chiSquareMax: parseFloat(e.target.value) })}
                className="w-full h-2 bg-space-900 rounded-lg appearance-none cursor-pointer accent-astro-blue"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
