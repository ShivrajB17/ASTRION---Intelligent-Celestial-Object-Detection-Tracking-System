import React from 'react'
import { motion } from 'framer-motion'
import { 
  Orbit, 
  LayoutDashboard, 
  Telescope, 
  Scan, 
  GitCommit, 
  Crosshair, 
  FileText, 
  Database, 
  Settings, 
  PanelLeftClose, 
  PanelLeftOpen, 
  ArrowLeft
} from 'lucide-react'
import { useAstrion } from '../../context/AstrionContext'
import type { NavigationRoute } from '../../types/navigation'

interface NavOption {
  id: NavigationRoute
  label: string
  icon: React.ElementType
  badge?: string
}

const PRIMARY_NAV_ITEMS: NavOption[] = [
  {
    id: 'mission-control',
    label: 'Mission Control',
    icon: LayoutDashboard,
  },
  {
    id: 'observation-explorer',
    label: 'Observation Explorer',
    icon: Telescope,
  },
  {
    id: 'detection-lab',
    label: 'Detection Lab',
    icon: Scan,
  },
  {
    id: 'tracking-studio',
    label: 'Tracking Studio',
    icon: GitCommit,
  },
  {
    id: 'candidate-intelligence',
    label: 'Candidate Intelligence',
    icon: Crosshair,
  },
  {
    id: 'scientific-reports',
    label: 'Scientific Reports',
    icon: FileText,
  },
]

const BOTTOM_NAV_ITEMS: NavOption[] = [
  {
    id: 'data-sources',
    label: 'Data Sources',
    icon: Database,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
  },
]

export const AppSidebar: React.FC = () => {
  const { 
    activeRoute, 
    setActiveRoute, 
    isSidebarCollapsed, 
    toggleSidebar, 
    setViewMode,
    observations
  } = useAstrion()

  return (
    <aside
      className={`relative z-30 h-screen flex flex-col bg-space-950/95 border-r border-slate-800/80 backdrop-blur-xl transition-all duration-300 ease-in-out shrink-0 select-none ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Branding Section */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/80 h-16">
        <div 
          onClick={() => setActiveRoute('mission-control')}
          className="flex items-center gap-3 cursor-pointer overflow-hidden"
        >
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-space-850 border border-astro-blue/40 shadow-glow-blue shrink-0">
            <Orbit className="w-5 h-5 text-astro-cyan animate-orbit-slow" />
          </div>
          {!isSidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col"
            >
              <span className="font-display font-bold text-base tracking-wider text-white">
                ASTRION
              </span>
              <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                Astrometric Intelligence
              </span>
            </motion.div>
          )}
        </div>

        {/* Sidebar Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-space-800 transition-colors"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Return to Landing Page Action */}
      <div className="p-3 border-b border-slate-850">
        <button
          onClick={() => setViewMode('landing')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-space-800/70 transition-all group"
          title="Return to Public Landing Page"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform shrink-0" />
          {!isSidebarCollapsed && (
            <span className="font-medium truncate">Return to Overview</span>
          )}
        </button>
      </div>

      {/* Primary Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {!isSidebarCollapsed && (
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Scientific Navigation
          </div>
        )}

        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeRoute === item.id
          const hasBadge = item.id === 'observation-explorer' && observations.length > 0

          return (
            <button
              key={item.id}
              onClick={() => setActiveRoute(item.id)}
              title={isSidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative ${
                isActive
                  ? 'bg-astro-blue/15 text-white border border-astro-blue/40 shadow-glow-blue'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-space-800/50 border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-astro-cyan' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {!isSidebarCollapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
              {hasBadge && !isSidebarCollapsed && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-astro-blue/30 text-astro-cyan border border-astro-blue/40">
                  {observations.length}
                </span>
              )}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-astro-cyan" />
              )}
            </button>
          )
        })}
      </div>

      {/* Bottom Auxiliary Navigation (Data Sources, Settings) */}
      <div className="p-3 border-t border-slate-800/80 space-y-1">
        {!isSidebarCollapsed && (
          <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
            System & Feeds
          </div>
        )}

        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeRoute === item.id

          return (
            <button
              key={item.id}
              onClick={() => setActiveRoute(item.id)}
              title={isSidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-space-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-space-800/40'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-astro-cyan' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {!isSidebarCollapsed && (
                <span className="truncate text-left">{item.label}</span>
              )}
            </button>
          )
        })}

        {/* Status Indicator Card inside sidebar */}
        {!isSidebarCollapsed && (
          <div className="mt-3 p-2.5 rounded-xl bg-space-900 border border-slate-800 text-[11px] font-mono">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                SHELL READY
              </span>
              <span className="text-slate-500">PHASE 1</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
