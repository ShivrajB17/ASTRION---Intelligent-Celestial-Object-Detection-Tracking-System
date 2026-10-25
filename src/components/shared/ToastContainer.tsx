import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { useAstrion } from '../../context/AstrionContext'

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useAstrion()

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          let Icon = Info
          let iconColor = 'text-astro-cyan'
          let borderColor = 'border-astro-cyan/30'
          let glow = 'shadow-glow-cyan'

          if (toast.type === 'success') {
            Icon = CheckCircle2
            iconColor = 'text-emerald-400'
            borderColor = 'border-emerald-500/30'
            glow = 'shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]'
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle
            iconColor = 'text-amber-400'
            borderColor = 'border-amber-500/30'
            glow = 'shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)]'
          } else if (toast.type === 'error') {
            Icon = AlertCircle
            iconColor = 'text-rose-400'
            borderColor = 'border-rose-500/30'
            glow = 'shadow-[0_0_20px_-5px_rgba(244,63,94,0.3)]'
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl glass-panel ${borderColor} ${glow} bg-space-800/90 text-slate-100 shadow-xl backdrop-blur-xl border`}
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold tracking-wide text-white">{toast.title}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">{toast.timestamp}</span>
                </div>
                {toast.description && (
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded-md"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
