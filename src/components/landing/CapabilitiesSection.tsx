import React from 'react'
import { motion } from 'framer-motion'
import { 
  Scan, 
  Layers, 
  Orbit, 
  TrendingUp, 
  ShieldCheck, 
  FileText, 
  ArrowUpRight 
} from 'lucide-react'

const CAPABILITIES = [
  {
    icon: Scan,
    title: 'Astronomical Source Detection',
    subtitle: 'PSF Photometry & Noise Modeling',
    description: 'Automated 2D background estimation, sigma clipping and point-spread function centroiding on full-frame FITS observations.',
    metrics: 'Sub-pixel Centroiding (<0.05 px)',
    color: 'blue' as const,
  },
  {
    icon: Layers,
    title: 'Multi-Epoch Observation Analysis',
    subtitle: 'WCS Astrometric Projection',
    description: 'High-precision coordinate registration across time-separated observation epochs to isolate transient movements from stationary stellar fields.',
    metrics: 'Astroalign & WCS Coordinate Mesh',
    color: 'cyan' as const,
  },
  {
    icon: Orbit,
    title: 'Intelligent Object Tracking',
    subtitle: 'Automated Tracklet Linking',
    description: 'Spatial-temporal association algorithms link moving detections across epochs while filtering cosmic rays, optical flares, and sensor artifacts.',
    metrics: 'KD-Tree Velocity Vector Match',
    color: 'violet' as const,
  },
  {
    icon: TrendingUp,
    title: 'Trajectory Estimation',
    subtitle: 'Apparent Motion & Orbital Fitting',
    description: 'Calculates angular velocity (arcsec/hr), position angles, and preliminary orbital state vectors for near-Earth asteroids and high-speed transients.',
    metrics: 'Linear & Gauss Initial Orbit Fit',
    color: 'blue' as const,
  },
  {
    icon: ShieldCheck,
    title: 'Candidate Intelligence',
    subtitle: 'Catalog Cross-Validation',
    description: 'Autonomous cross-referencing with Minor Planet Center (MPC) and JPL Horizons catalogs to separate known bodies from novel discoveries.',
    metrics: 'MPC Catalog & Ephemeris Verification',
    color: 'cyan' as const,
  },
  {
    icon: FileText,
    title: 'Scientific Reporting',
    subtitle: 'Publication-Ready Documentation',
    description: 'Export observational logs, astrometric tables, residual plots, and target summary cards in standard LaTeX, PDF, and FITS table formats.',
    metrics: 'PDF, LaTeX & FITS Table Exporters',
    color: 'violet' as const,
  },
]

export const CapabilitiesSection: React.FC = () => {
  return (
    <section id="capabilities" className="relative py-24 px-4 sm:px-8 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-astro-blue/10 border border-astro-blue/30 text-xs font-mono text-astro-cyan">
            <span>Core Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight">
            Scientific Capabilities Built for Modern Astrometry
          </h2>
          <p className="text-base text-slate-400 font-normal leading-relaxed">
            Engineered to process dense astronomical datasets, distinguish ultra-faint moving objects, and accelerate planetary defense research.
          </p>
        </div>

        {/* 6 Capabilities Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((cap, idx) => {
            const Icon = cap.icon
            let colorClasses = {
              badge: 'bg-astro-blue/15 text-blue-400 border-astro-blue/30',
              hoverBorder: 'hover:border-astro-blue/50',
              hoverGlow: 'hover:shadow-glow-blue',
              iconBg: 'bg-astro-blue/10 text-astro-blue',
            }

            if (cap.color === 'cyan') {
              colorClasses = {
                badge: 'bg-astro-cyan/15 text-cyan-300 border-astro-cyan/30',
                hoverBorder: 'hover:border-astro-cyan/50',
                hoverGlow: 'hover:shadow-glow-cyan',
                iconBg: 'bg-astro-cyan/10 text-astro-cyan',
              }
            } else if (cap.color === 'violet') {
              colorClasses = {
                badge: 'bg-astro-violet/15 text-violet-300 border-astro-violet/30',
                hoverBorder: 'hover:border-astro-violet/50',
                hoverGlow: 'hover:shadow-glow-violet',
                iconBg: 'bg-astro-violet/10 text-astro-violet',
              }
            }

            return (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className={`group relative p-7 rounded-2xl bg-space-850/80 border border-slate-800 backdrop-blur-md transition-all duration-300 ${colorClasses.hoverBorder} ${colorClasses.hoverGlow} flex flex-col justify-between`}
              >
                <div>
                  {/* Card Header with Icon */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`p-3 rounded-xl border border-white/5 ${colorClasses.iconBg} transition-transform group-hover:scale-110 duration-300`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono text-slate-500">0{idx + 1}</span>
                  </div>

                  {/* Subtitle & Title */}
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                    {cap.subtitle}
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-cyan-200 transition-colors mb-3">
                    {cap.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {cap.description}
                  </p>
                </div>

                {/* Bottom Metric Badge */}
                <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between">
                  <span className={`text-[11px] font-mono px-2.5 py-1 rounded-md border ${colorClasses.badge}`}>
                    {cap.metrics}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
