import React from 'react'
import { Orbit, Sparkles } from 'lucide-react'
import { useAstrion } from '../../context/AstrionContext'

interface LandingFooterProps {
  onScrollToSection: (sectionId: string) => void
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onScrollToSection }) => {
  const { setViewMode, setActiveRoute } = useAstrion()

  const handleLaunch = () => {
    setViewMode('workspace')
    setActiveRoute('mission-control')
  }

  return (
    <footer className="relative border-t border-slate-800 bg-space-950 px-4 sm:px-8 py-16 text-slate-400">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand & Mission */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-astro-blue/15 border border-astro-blue/40 text-astro-cyan">
                <Orbit className="w-4 h-4" />
              </div>
              <span className="font-display font-bold text-lg tracking-widest text-white">
                ASTRION
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              Astronomical Intelligence & Object Tracking System designed to identify, track, and analyze potential moving celestial bodies across multi-epoch observation plates.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-space-900 border border-slate-800 text-[11px] font-mono text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-astro-cyan" />
              NASA Space Apps Challenge 2026 Project
            </div>
          </div>

          {/* Quick Nav */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Platform Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onScrollToSection('hero')}
                  className="hover:text-white transition-colors"
                >
                  Overview & Headline
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollToSection('capabilities')}
                  className="hover:text-white transition-colors"
                >
                  Astrodynamics Capabilities
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollToSection('workflow')}
                  className="hover:text-white transition-colors"
                >
                  Data Processing Pipeline
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollToSection('technology')}
                  className="hover:text-white transition-colors"
                >
                  Scientific Technologies
                </button>
              </li>
            </ul>
          </div>

          {/* Workspace Quick Links */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Workspace Direct Access</h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleLaunch}
                className="inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-space-850 border border-astro-blue/30 text-xs font-medium text-white hover:border-astro-cyan hover:bg-space-800 transition-all text-left"
              >
                <span>Open Mission Control</span>
                <span className="text-[10px] font-mono text-astro-cyan">ENTER →</span>
              </button>
              <div className="text-[11px] text-slate-500 pt-1">
                Desktop-grade environment prepared for macOS Electron bridge.
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © 2026 ASTRION Contributors. Open-source scientific astrometry platform.
          </div>
          <div className="text-center md:text-right max-w-xl text-[10px] text-slate-600">
            NASA Space Apps Challenge 2026 independent submission. Not an official NASA website, service, or endorsed product. All data models reference open astronomical standards (FITS, WCS, Astropy).
          </div>
        </div>
      </div>
    </footer>
  )
}
