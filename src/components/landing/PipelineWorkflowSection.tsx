import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  FileCode, 
  Sparkles, 
  Crosshair, 
  GitMerge, 
  Compass, 
  CheckCircle2, 
  ArrowRight,
  Info
} from 'lucide-react'

const PIPELINE_STEPS = [
  {
    step: '01',
    id: 'fits-data',
    name: 'FITS DATA',
    icon: FileCode,
    headline: 'Ingestion & WCS Extraction',
    details: 'Raw Flexible Image Transport System (FITS) frames are parsed. World Coordinate System (WCS) headers map CCD pixel matrices to celestial coordinates (RA/Dec).',
    badge: 'FITS / WCS Astrometry',
  },
  {
    step: '02',
    id: 'preprocessing',
    name: 'PREPROCESSING',
    icon: Sparkles,
    headline: '2D Background & Noise Modeling',
    details: 'Calculates local spatial background mesh and RMS noise floor. Hot pixels, cosmic rays and satellite streaks are masked or normalized.',
    badge: 'Sigma Clipping / 2D Mesh',
  },
  {
    step: '03',
    id: 'detection',
    name: 'DETECTION',
    icon: Crosshair,
    headline: 'Centroid & PSF Photometry',
    details: 'Point sources exceeding the significance threshold (typically 3.0σ–5.0σ) are extracted with sub-pixel Gaussian/Moffat PSF centroid fitting.',
    badge: 'DAOStarFinder / SEP',
  },
  {
    step: '04',
    id: 'matching',
    name: 'MATCHING',
    icon: GitMerge,
    headline: 'Multi-Epoch Cross-Registration',
    details: 'Stationary stars across temporal epochs are registered with affine/homography transforms. Non-stationary residual sources are isolated.',
    badge: 'Astroalign KD-Tree',
  },
  {
    step: '05',
    id: 'tracking',
    name: 'TRACKING',
    icon: Compass,
    headline: 'Tracklet Linking & Motion Fit',
    details: 'Multi-epoch source positions are linked into continuous motion vectors. Computes apparent speed (arcsec/hr) and position angle.',
    badge: 'Kalman / Gauss Fit',
  },
  {
    step: '06',
    id: 'validation',
    name: 'VALIDATION',
    icon: CheckCircle2,
    headline: 'Catalog Verification & Scoring',
    details: 'Cross-checks against Minor Planet Center (MPC) and JPL Horizons ephemerides to verify whether tracklet is a known or novel celestial body.',
    badge: 'MPC / JPL Horizons Match',
  },
]

export const PipelineWorkflowSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0)

  return (
    <section id="workflow" className="relative py-24 px-4 sm:px-8 border-t border-slate-800/80 bg-space-950/40">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-astro-cyan/10 border border-astro-cyan/30 text-xs font-mono text-astro-cyan">
            <span>Automated Analysis Pipeline</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight">
            From Raw Pixels to Celestial Intelligence
          </h2>
          <p className="text-base text-slate-400 font-normal leading-relaxed">
            A high-throughput astrometry pipeline built to discover, correlate, and validate moving celestial bodies.
          </p>
        </div>

        {/* Horizontal Pipeline Steps Ribbon */}
        <div className="relative mb-12">
          {/* Subtle connecting line across cards */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-astro-blue/20 via-astro-cyan/40 to-astro-violet/20 -translate-y-1/2 z-0" />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10">
            {PIPELINE_STEPS.map((step, idx) => {
              const Icon = step.icon
              const isSelected = activeStep === idx

              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`group relative p-4 rounded-xl text-left transition-all duration-300 flex flex-col items-start ${
                    isSelected
                      ? 'bg-space-800 border-2 border-astro-cyan shadow-glow-cyan'
                      : 'bg-space-850/90 border border-slate-800 hover:border-slate-700 hover:bg-space-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <span className={`text-[11px] font-mono font-bold ${isSelected ? 'text-astro-cyan' : 'text-slate-500'}`}>
                      {step.step}
                    </span>
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-astro-cyan' : 'text-slate-400 group-hover:text-white'}`} />
                  </div>
                  <div className="text-xs font-semibold tracking-wide text-white font-display">
                    {step.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 truncate w-full">
                    {step.badge}
                  </div>
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <div className="lg:hidden mt-2 text-slate-600">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Active Step Detailed Showcase Panel */}
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-8 rounded-2xl bg-space-850 border border-astro-blue/20 shadow-glass backdrop-blur-xl max-w-4xl mx-auto"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-astro-blue/20 text-astro-cyan border border-astro-blue/30">
                  STAGE {PIPELINE_STEPS[activeStep].step} OF 06
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {PIPELINE_STEPS[activeStep].name}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white font-display">
                {PIPELINE_STEPS[activeStep].headline}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {PIPELINE_STEPS[activeStep].details}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-space-900 border border-slate-800 shrink-0 w-full md:w-64 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <Info className="w-4 h-4 text-astro-cyan shrink-0" />
                <span>Stage Configuration</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 space-y-1 pt-1 border-t border-slate-800">
                <div className="flex justify-between">
                  <span>Engine:</span>
                  <span className="text-white">Scientific Astropy</span>
                </div>
                <div className="flex justify-between">
                  <span>Cadence:</span>
                  <span className="text-white">Multi-Epoch</span>
                </div>
                <div className="flex justify-between">
                  <span>Execution:</span>
                  <span className="text-emerald-400">Deterministic</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
