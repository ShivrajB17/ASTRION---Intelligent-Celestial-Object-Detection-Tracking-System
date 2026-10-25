import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Orbit, Compass, Cpu, Layers, Sparkles, ChevronRight } from 'lucide-react'
import { useAstrion } from '../../context/AstrionContext'

interface LandingNavbarProps {
  onScrollToSection: (sectionId: string) => void
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onScrollToSection }) => {
  const { setViewMode, setActiveRoute } = useAstrion()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLaunch = () => {
    setViewMode('workspace')
    setActiveRoute('mission-control')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-8 pt-4 pb-2 transition-all duration-300">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`max-w-7xl mx-auto rounded-2xl transition-all duration-300 px-5 py-3 flex items-center justify-between ${
          scrolled
            ? 'glass-panel bg-space-900/85 shadow-glass border-slate-700/50'
            : 'bg-space-900/40 backdrop-blur-md border border-white/5'
        }`}
      >
        {/* Left: Branding */}
        <div 
          onClick={() => onScrollToSection('hero')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-space-800 to-space-950 border border-astro-blue/40 shadow-glow-blue group-hover:border-astro-cyan transition-colors">
            <Orbit className="w-5 h-5 text-astro-cyan animate-orbit-slow" />
            <div className="absolute inset-0 rounded-xl bg-astro-blue/10 blur-sm group-hover:bg-astro-cyan/20 transition-colors" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg tracking-widest text-white">
                ASTRION
              </span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-astro-blue/15 text-astro-cyan border border-astro-blue/30">
                v1.0 BETA
              </span>
            </div>
            <div className="text-[9px] font-mono tracking-wider text-slate-400 uppercase hidden sm:block">
              Astronomical Intelligence & Object Tracking
            </div>
          </div>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-300">
          <button
            onClick={() => onScrollToSection('overview')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-all"
          >
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            Overview
          </button>
          <button
            onClick={() => onScrollToSection('capabilities')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            Capabilities
          </button>
          <button
            onClick={() => onScrollToSection('workflow')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-400" />
            How It Works
          </button>
          <button
            onClick={() => onScrollToSection('technology')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-all"
          >
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            Technology
          </button>
        </nav>

        {/* Right: Launch Application CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleLaunch}
            className="relative group flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-astro-blue via-blue-600 to-astro-cyan hover:from-blue-500 hover:to-cyan-400 shadow-glow-blue transition-all duration-300 active:scale-95"
          >
            <span>Launch Application</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-astro-blue to-astro-cyan opacity-40 blur group-hover:opacity-75 transition-opacity -z-10" />
          </button>
        </div>
      </motion.div>
    </header>
  )
}
