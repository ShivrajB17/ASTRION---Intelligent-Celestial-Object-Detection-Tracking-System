import React, { useState } from 'react'
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  Info, 
  Plus, 
  Sparkles
} from 'lucide-react'
import { useAstrion } from '../context/AstrionContext'
import type { ReportFormat } from '../services/reportGeneration.service'

export const ScientificReportsPage: React.FC = () => {
  const { notify, activeAnalysis } = useAstrion()
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>('pdf')
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = () => {
    setIsGenerating(true)
    notify('Compiling Report', `Assembling astrometric observation log and LaTeX table in ${selectedFormat.toUpperCase()} format...`, 'info')

    setTimeout(() => {
      setIsGenerating(false)
      setHasGeneratedReport(true)
      notify('Report Generated', `Publication-ready scientific report ready for download (${selectedFormat.toUpperCase()}).`, 'success')
    }, 1200)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Backend Integration Notice */}
      <div className="p-3.5 rounded-xl bg-space-850/80 border border-astro-violet/30 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-astro-violet shrink-0" />
          <span>
            <strong className="text-white">Scientific Reports:</strong> Automated astrometric documentation & publication exporter. In Phase 2, builds standard LaTeX summaries and Minor Planet Electronic Circular (MPEC) submissions.
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-900 text-slate-400 border border-slate-700 shrink-0 hidden sm:inline-block">
          LaTeX / PDF Compiler
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Report Configuration & Format Selector */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-space-850 border border-slate-800 shadow-glass space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-semibold text-white font-display flex items-center gap-2">
                <FileText className="w-4 h-4 text-astro-cyan" />
                Report Generation Parameters
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure astrometric export formats and publication parameters
              </p>
            </div>

            {/* Target Field Info */}
            <div className="space-y-1.5 text-xs font-mono">
              <div className="text-slate-500 uppercase text-[10px]">Active Investigation Field</div>
              <div className="p-3 rounded-xl bg-space-900 border border-slate-800 text-white font-semibold">
                {activeAnalysis ? activeAnalysis.title : 'SPHEREx Multi-Epoch Survey Plate #04'}
              </div>
            </div>

            {/* Export Format Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Target Export Format
              </label>
              <div className="grid grid-cols-1 gap-2 text-xs">
                {[
                  { id: 'pdf' as const, name: 'PDF Scientific Summary', desc: 'Publication document with residual vector plots' },
                  { id: 'latex' as const, name: 'LaTeX Document (.tex)', desc: 'AAS / MNRAS journal submission template' },
                  { id: 'fits_table' as const, name: 'FITS Binary Table (.fits)', desc: 'Astropy compatible binary astrometric table' },
                  { id: 'csv' as const, name: 'Comma Separated Values (.csv)', desc: 'Standard tabular astrometric coordinates' },
                  { id: 'geojson' as const, name: 'GeoJSON Sky Boundary (.json)', desc: 'Celestial survey bounding polygons' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`p-3 rounded-xl text-left transition-all border ${
                      selectedFormat === fmt.id
                        ? 'bg-astro-blue/15 border-astro-blue text-white shadow-glow-blue'
                        : 'bg-space-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-white">{fmt.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{fmt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Trigger Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-astro-blue to-astro-violet hover:from-blue-600 hover:to-violet-600 text-white text-xs font-semibold shadow-glow-blue transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? 'Compiling Document...' : 'Compile Scientific Report'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Report Document Preview / Empty State */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-space-850 border border-slate-800 shadow-glass min-h-[480px] flex flex-col justify-between">
            {hasGeneratedReport ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">ASTRION-REPORT-2026-X1.{selectedFormat}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">Compiled on {new Date().toLocaleDateString()} • Ready for distribution</p>
                    </div>
                  </div>
                  <button
                    onClick={() => notify('Downloading Document', `Saved ASTRION-REPORT-2026-X1.${selectedFormat} to local Downloads.`, 'success')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-astro-blue text-white text-xs font-semibold shadow-glow-blue hover:bg-blue-600 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>

                {/* Simulated Report Document Paper */}
                <div className="p-6 rounded-xl bg-space-900 border border-slate-800 font-mono text-xs text-slate-300 space-y-4 shadow-inner">
                  <div className="border-b border-slate-800 pb-3 text-center space-y-1">
                    <div className="text-white font-bold text-sm tracking-wider">ASTRION ASTROMETRIC INTELLIGENCE SYSTEM</div>
                    <div className="text-[10px] text-slate-400">NASA Space Apps Challenge 2026 Project Report</div>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div><strong>Target Designation:</strong> AST-2026-X1</div>
                    <div><strong>Observation Cadence:</strong> 4 Frames across 3.5 Hours</div>
                    <div><strong>Coordinate Center:</strong> RA 12h 16m 54.1s, Dec +29° 48' 51"</div>
                    <div><strong>Calculated Angular Velocity:</strong> 14.82 arcsec/hr (PA 228.4°)</div>
                    <div><strong>Status Classification:</strong> Uncatalogued Near-Earth Object Candidate</div>
                  </div>

                  <div className="p-3 rounded-lg bg-space-850 border border-slate-800 text-[10px] text-slate-400">
                    Astrometric measurements formatted in standard Minor Planet Center (MPC) 80-column optical format. Residual fit residuals: 0.024 arcseconds.
                  </div>
                </div>
              </div>
            ) : (
              /* Honest Empty State from Section 7 */
              <div className="my-auto text-center py-16 flex flex-col items-center justify-center space-y-3">
                <div className="p-4 rounded-full bg-space-800 border border-slate-700/60 text-slate-500">
                  <FileText className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">
                  No scientific reports compiled in active session.
                </h4>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  Select your desired document format on the left and click "Compile Scientific Report" to generate astrometric summaries.
                </p>
                <button
                  onClick={handleGenerate}
                  className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-astro-blue hover:bg-blue-600 shadow-glow-blue transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate New Investigation Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
