import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Compass, Zap } from 'lucide-react'
import { useAstrion } from '../../context/AstrionContext'

interface HeroSectionProps {
  onExploreCapabilities: () => void
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onExploreCapabilities }) => {
  const { setViewMode, setActiveRoute } = useAstrion()

  const handleLaunch = () => {
    setViewMode('workspace')
    setActiveRoute('mission-control')
  }

  return (
    <section id="hero" className="relative min-h-[92vh] flex items-center justify-center pt-28 pb-16 px-4 sm:px-8 overflow-hidden">
      {/* Background Radial Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-astro-blue/15 via-astro-cyan/10 to-transparent blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/3 w-[450px] h-[350px] bg-astro-violet/10 blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Hero Copy */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="lg:col-span-7 space-y-6 text-center lg:text-left"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-space-800/90 border border-astro-blue/30 text-xs font-mono text-cyan-300 shadow-glass">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-astro-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-astro-cyan"></span>
            </span>
            <span>NASA Space Apps Challenge 2026 Initiative</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Autonomous Astrometry</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl xl:text-7xl font-display font-extrabold tracking-tight text-white leading-[1.08]">
            Explore the Sky.{' '}
            <span className="block mt-1 bg-gradient-to-r from-astro-cyan via-astro-blue to-astro-violet bg-clip-text text-transparent">
              Detect the Unknown.
            </span>
          </h1>

          {/* Supporting Text */}
          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
            An intelligent astronomical analysis platform designed to identify, track and investigate potential moving celestial objects across multi-epoch observations.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-3">
            <button
              onClick={handleLaunch}
              className="group relative flex items-center gap-3 px-7 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-astro-blue to-astro-cyan hover:from-blue-600 hover:to-cyan-400 shadow-glow-blue transition-all duration-300 active:scale-95"
            >
              <span>Launch ASTRION</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onExploreCapabilities}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-medium text-sm sm:text-base text-slate-300 hover:text-white bg-space-800/80 hover:bg-space-700/80 border border-slate-700/70 hover:border-slate-500 transition-all active:scale-95 shadow-glass"
            >
              <Compass className="w-4 h-4 text-astro-cyan" />
              <span>Explore Capabilities</span>
            </button>
          </div>

          {/* Real-time telemetry badges */}
          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-800/80 max-w-lg mx-auto lg:mx-0">
            <div className="p-3 rounded-xl bg-space-850/60 border border-slate-800">
              <div className="text-[10px] font-mono uppercase text-slate-400">Precision Cadence</div>
              <div className="text-sm font-semibold font-mono text-astro-cyan mt-0.5">Multi-Epoch</div>
              <div className="text-[10px] text-slate-500">Cross-Frame Astrometry</div>
            </div>
            <div className="p-3 rounded-xl bg-space-850/60 border border-slate-800">
              <div className="text-[10px] font-mono uppercase text-slate-400">Target Range</div>
              <div className="text-sm font-semibold font-mono text-white mt-0.5">NEO & MBAs</div>
              <div className="text-[10px] text-slate-500">Fast-moving transients</div>
            </div>
            <div className="p-3 rounded-xl bg-space-850/60 border border-slate-800">
              <div className="text-[10px] font-mono uppercase text-slate-400">Data Format</div>
              <div className="text-sm font-semibold font-mono text-astro-violet mt-0.5">FITS Standard</div>
              <div className="text-[10px] text-slate-500">WCS Projected Plates</div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Cinematic Astronomical Visualization Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          className="lg:col-span-5 relative"
        >
          {/* Orbital Rings Backing Visual */}
          <div className="relative w-full aspect-square max-w-[480px] mx-auto rounded-3xl p-1 bg-gradient-to-br from-astro-blue/40 via-astro-violet/20 to-astro-cyan/30 shadow-2xl">
            <div className="relative w-full h-full rounded-[22px] bg-space-950/90 backdrop-blur-xl border border-white/10 overflow-hidden flex flex-col justify-between p-6">
              
              {/* Celestial Graphic with Orbital Vectors */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Orbit 1 */}
                <div className="absolute w-72 h-72 rounded-full border border-astro-blue/20 animate-orbit-slow" />
                {/* Orbit 2 */}
                <div className="absolute w-56 h-56 rounded-full border border-astro-cyan/25 border-dashed animate-orbit-reverse" />
                {/* Center Core */}
                <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-tr from-space-900 via-astro-blue/30 to-astro-cyan/20 border border-astro-cyan/40 shadow-glow-cyan">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-astro-cyan to-astro-blue blur-sm animate-pulse-subtle" />
                  <div className="absolute w-3 h-3 rounded-full bg-white shadow-lg" />
                </div>
              </div>

              {/* Top Telemetry Header inside visualization */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-medium text-slate-300">
                    SURVEY RADAR: ACTIVE
                  </span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-space-800 text-slate-400 border border-slate-700">
                  FOV: 3.5° × 3.5°
                </span>
              </div>

              {/* Floating Tracklet Card Overlay */}
              <div className="relative z-10 p-4 rounded-xl bg-space-900/85 border border-astro-blue/30 backdrop-blur-md shadow-glass space-y-2 mt-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-astro-cyan" />
                    <span className="text-xs font-mono font-bold text-white">
                      CANDIDATE TRACKLET #2026-X1
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-astro-cyan/15 text-astro-cyan border border-astro-cyan/30">
                    HIGH CONFIDENCE (94.2%)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1">
                  <div>
                    <span className="text-slate-500">MOTION: </span>
                    <span className="text-slate-200">14.8″ / hr</span>
                  </div>
                  <div>
                    <span className="text-slate-500">EPOCHS: </span>
                    <span className="text-slate-200">4 detections</span>
                  </div>
                  <div>
                    <span className="text-slate-500">POS ANGLE: </span>
                    <span className="text-slate-200">228.4° (SW)</span>
                  </div>
                  <div>
                    <span className="text-slate-500">EST MAG: </span>
                    <span className="text-slate-200">18.4 V-band</span>
                  </div>
                </div>
              </div>

              {/* Corner decorative crosses */}
              <div className="absolute top-3 left-3 text-slate-600 font-mono text-[9px]">+</div>
              <div className="absolute top-3 right-3 text-slate-600 font-mono text-[9px]">+</div>
              <div className="absolute bottom-3 left-3 text-slate-600 font-mono text-[9px]">+</div>
              <div className="absolute bottom-3 right-3 text-slate-600 font-mono text-[9px]">+</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
