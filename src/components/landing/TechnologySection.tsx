import React from 'react'
import { motion } from 'framer-motion'
import { Cpu, Shield, CheckCircle } from 'lucide-react'

const TECHNOLOGIES = [
  {
    category: 'Astronomical Data Standard',
    name: 'NASA SPHEREx Data Standard',
    tag: 'SURVEY DATA FORMAT',
    type: 'data_format',
    description: 'Designed for compatibility with NASA SPHEREx all-sky spectral survey data products, multi-band FITS mosaics, and spectral energy distribution cubes.',
    role: 'Target Mission Data Structure (Compatible)',
    badgeColor: 'border-astro-blue/40 text-blue-300 bg-astro-blue/10',
  },
  {
    category: 'Core Astrometry Engine',
    name: 'Astropy',
    tag: 'ASTRONOMICAL CORE',
    type: 'library',
    description: 'Powers FITS I/O, World Coordinate System (WCS) celestial transformations, unit calculations, and high-precision stellar flux extraction.',
    role: 'Astrometric & Coordinate Standard',
    badgeColor: 'border-astro-cyan/40 text-cyan-300 bg-astro-cyan/10',
  },
  {
    category: 'High-Performance Computation',
    name: 'NumPy',
    tag: 'VECTORIZED ARRAYS',
    type: 'library',
    description: 'Handles multidimensional FITS pixel matrix calculations, vectorized 2D convolutions, and memory-mapped array processing.',
    role: 'Numerical Matrix Operations',
    badgeColor: 'border-slate-600 text-slate-300 bg-space-800',
  },
  {
    category: 'Scientific Algorithms',
    name: 'SciPy',
    tag: 'OPTIMIZATION & MESHING',
    type: 'library',
    description: 'Executes spatial KD-Trees for cross-epoch source matching, 2D spline background estimation, and non-linear trajectory least-squares fits.',
    role: 'Spatial KD-Tree & Optimization',
    badgeColor: 'border-astro-violet/40 text-violet-300 bg-astro-violet/10',
  },
  {
    category: 'Computer Vision & Alignment',
    name: 'OpenCV',
    tag: 'IMAGE REGISTRATION',
    type: 'library',
    description: 'Applies robust point matching (RANSAC), sub-pixel contour analysis, and affine image warping to align multi-epoch sky plates.',
    role: 'Frame Registration & Affine Warping',
    badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  },
  {
    category: 'Scientific Execution Runtime',
    name: 'Python Ecosystem',
    tag: 'SCIENTIFIC RUNTIME',
    type: 'runtime',
    description: 'Underpins the computational engine for scientific astrometry, interoperating with the desktop shell via fast local bridges.',
    role: 'Scientific Computational Backend',
    badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
  },
]

export const TechnologySection: React.FC = () => {
  return (
    <section id="technology" className="relative py-24 px-4 sm:px-8 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-astro-violet/10 border border-astro-violet/30 text-xs font-mono text-astro-violet">
            <Cpu className="w-3.5 h-3.5" />
            <span>Open-Science Technology Stack</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight">
            Scientific Foundation & Computational Stack
          </h2>
          <p className="text-base text-slate-400 font-normal leading-relaxed">
            ASTRION combines astronomical libraries with modern high-performance frameworks to process deep-sky survey data.
          </p>
        </div>

        {/* Clarity Banner on Tech Stack vs Data Connections */}
        <div className="mb-10 p-4 rounded-xl bg-space-850/90 border border-astro-blue/20 flex items-start sm:items-center gap-3 text-xs text-slate-300">
          <Shield className="w-5 h-5 text-astro-cyan shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <span className="font-semibold text-white">Engineering Clarity:</span>{' '}
            Libraries listed below define the target algorithmic backend. Data from survey missions (such as SPHEREx or Pan-STARRS) represent compatible astronomical formats ingested locally—no official real-time satellite telemetry uplink is claimed.
          </div>
        </div>

        {/* 6 Technology Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TECHNOLOGIES.map((tech, idx) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.07 }}
              className="p-6 rounded-2xl bg-space-850/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${tech.badgeColor}`}>
                    {tech.tag}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {tech.category}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-white mb-2 font-display">
                  {tech.name}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {tech.description}
                </p>
              </div>

              <div className="pt-4 mt-5 border-t border-slate-800/80 flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <CheckCircle className="w-3.5 h-3.5 text-astro-cyan shrink-0" />
                <span className="truncate">{tech.role}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
