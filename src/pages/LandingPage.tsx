import React from 'react'
import { CelestialCanvas } from '../components/landing/CelestialCanvas'
import { LandingNavbar } from '../components/landing/LandingNavbar'
import { HeroSection } from '../components/landing/HeroSection'
import { CapabilitiesSection } from '../components/landing/CapabilitiesSection'
import { PipelineWorkflowSection } from '../components/landing/PipelineWorkflowSection'
import { TechnologySection } from '../components/landing/TechnologySection'
import { LandingFooter } from '../components/landing/LandingFooter'

export const LandingPage: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="relative min-h-screen bg-space-900 text-slate-100 overflow-x-hidden selection:bg-astro-blue/30 selection:text-cyan-200">
      {/* Background Interactive Starfield & Celestial Canvas */}
      <CelestialCanvas />

      {/* Atmospheric Space Gradients */}
      <div className="fixed inset-0 radial-space-glow pointer-events-none z-0 opacity-70" />
      <div className="fixed top-0 left-0 right-0 h-96 radial-top-glow pointer-events-none z-0" />

      {/* Floating Header */}
      <LandingNavbar onScrollToSection={scrollToSection} />

      {/* Main Sections */}
      <main className="relative z-10">
        <HeroSection onExploreCapabilities={() => scrollToSection('capabilities')} />
        <CapabilitiesSection />
        <PipelineWorkflowSection />
        <TechnologySection />
      </main>

      {/* Footer */}
      <div className="relative z-10">
        <LandingFooter onScrollToSection={scrollToSection} />
      </div>
    </div>
  )
}
