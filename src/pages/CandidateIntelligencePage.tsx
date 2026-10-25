import React, { useState } from 'react'
import { 
  Crosshair, 
  Search, 
  ShieldCheck, 
  Info, 
  Download
} from 'lucide-react'
import { useAstrion } from '../context/AstrionContext'
import type { CelestialCandidate } from '../types/astronomy'

// Reference candidate dataset illustrating the candidate intelligence data structure
const REFERENCE_CANDIDATES: CelestialCandidate[] = [
  {
    id: 'cand-001',
    designation: 'AST-2026-X1',
    ra: 184.2254,
    dec: 29.8142,
    magnitude: 18.4,
    velocityArcsecHr: 14.82,
    trajectoryAngleDeg: 228.4,
    confidenceScore: 0.942,
    epochCount: 4,
    detectionStatus: 'candidate',
    possibleIdentity: 'Uncatalogued Near-Earth Object Candidate',
    sourceIds: ['src-101', 'src-102', 'src-103', 'src-104'],
  },
  {
    id: 'cand-002',
    designation: 'AST-2026-B4',
    ra: 184.1890,
    dec: 29.7401,
    magnitude: 16.2,
    velocityArcsecHr: 4.15,
    trajectoryAngleDeg: 260.1,
    confidenceScore: 0.988,
    epochCount: 5,
    detectionStatus: 'confirmed',
    possibleIdentity: '(1566) Icarus Cross-Match (0.12″ offset)',
    sourceIds: ['src-201', 'src-202', 'src-203', 'src-204', 'src-205'],
  },
  {
    id: 'cand-003',
    designation: 'AST-2026-T9',
    ra: 184.3015,
    dec: 29.9050,
    magnitude: 20.1,
    velocityArcsecHr: 28.50,
    trajectoryAngleDeg: 195.8,
    confidenceScore: 0.725,
    epochCount: 3,
    detectionStatus: 'under_review',
    possibleIdentity: 'High-speed fast rotator / potential satellite glint',
    sourceIds: ['src-301', 'src-302', 'src-303'],
  },
]

export const CandidateIntelligencePage: React.FC = () => {
  const { notify } = useAstrion()
  const [selectedCandidate, setSelectedCandidate] = useState<CelestialCandidate>(REFERENCE_CANDIDATES[0])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [minConfidence, setMinConfidence] = useState<number>(0.7)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCandidates = REFERENCE_CANDIDATES.filter((c) => {
    if (filterStatus !== 'all' && c.detectionStatus !== filterStatus) return false
    if (c.confidenceScore < minConfidence) return false
    if (searchQuery && !c.designation.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Backend Integration Notice */}
      <div className="p-3.5 rounded-xl bg-space-850/80 border border-astro-cyan/30 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-astro-cyan shrink-0" />
          <span>
            <strong className="text-white">Candidate Intelligence:</strong> Ephemeris verification & catalog cross-referencing interface. In Phase 2, queries the Minor Planet Center (MPC) and JPL Horizons APIs in real time.
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-900 text-slate-400 border border-slate-700 shrink-0 hidden sm:inline-block">
          MPC / JPL Horizons Gateway
        </span>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-4 rounded-2xl bg-space-850 border border-slate-800 shadow-glass flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by candidate designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-space-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-astro-blue transition-colors font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">STATUS:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-space-900 border border-slate-700 rounded-xl text-xs text-slate-200 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="candidate">Unconfirmed Candidate</option>
              <option value="confirmed">Catalog Confirmed</option>
              <option value="under_review">Under Review</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">MIN CONF:</span>
            <span className="text-astro-cyan font-bold">{Math.round(minConfidence * 100)}%</span>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              className="w-20 h-1.5 bg-space-900 rounded-lg appearance-none cursor-pointer accent-astro-cyan"
            />
          </div>

          <button
            onClick={() => notify('Export Candidates', 'Exported 3 candidate records to standard VO-Table format.', 'success')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-space-800 hover:bg-space-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Candidates Table + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Candidate Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-space-850 border border-slate-800 overflow-hidden shadow-glass">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-astro-cyan" />
                <h3 className="text-sm font-semibold text-white font-display">
                  Detected Celestial Candidates ({filteredCandidates.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Sorted by Confidence Score
              </span>
            </div>

            <div className="divide-y divide-slate-800">
              {filteredCandidates.map((cand) => {
                const isSelected = selectedCandidate.id === cand.id

                return (
                  <div
                    key={cand.id}
                    onClick={() => setSelectedCandidate(cand)}
                    className={`p-4 flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-space-800/90 border-l-4 border-l-astro-cyan'
                        : 'hover:bg-space-800/40 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-xs text-white">
                          {cand.designation}
                        </span>
                        {cand.detectionStatus === 'confirmed' ? (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            CATALOG MATCH
                          </span>
                        ) : cand.detectionStatus === 'candidate' ? (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-astro-cyan/15 text-astro-cyan border border-astro-cyan/30">
                            NEW CANDIDATE
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            UNDER REVIEW
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        RA: {cand.ra.toFixed(4)}° • Dec: +{cand.dec.toFixed(4)}° • Mag: {cand.magnitude} V
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="font-mono text-xs font-bold text-astro-cyan">
                        {Math.round(cand.confidenceScore * 100)}% Conf
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {cand.velocityArcsecHr}"/hr • {cand.epochCount} epochs
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Intelligence Breakdown */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-space-850 border border-slate-800 shadow-glass space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Candidate Dossier
                </span>
                <h3 className="text-lg font-bold font-mono text-white mt-0.5">
                  {selectedCandidate.designation}
                </h3>
              </div>
              <div className="p-3 rounded-xl bg-astro-blue/10 border border-astro-blue/30 text-astro-cyan font-mono font-bold text-sm">
                {Math.round(selectedCandidate.confidenceScore * 100)}%
              </div>
            </div>

            {/* Possible Catalog Classification */}
            <div className="p-3.5 rounded-xl bg-space-900 border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono uppercase text-slate-500">
                Catalog Verification Hypothesis
              </div>
              <div className="text-xs font-semibold text-white">
                {selectedCandidate.possibleIdentity}
              </div>
            </div>

            {/* Astrometric Telemetry Grid */}
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-500">APPARENT VELOCITY:</span>
                <span className="text-white font-semibold">{selectedCandidate.velocityArcsecHr} arcsec/hr</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-500">POSITION ANGLE:</span>
                <span className="text-white">{selectedCandidate.trajectoryAngleDeg}°</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-500">APPARENT MAGNITUDE:</span>
                <span className="text-white">{selectedCandidate.magnitude} V-Band</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-500">CORRELATED FRAMES:</span>
                <span className="text-astro-cyan">{selectedCandidate.epochCount} multi-epoch plates</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-500">CENTROID RESIDUAL RMS:</span>
                <span className="text-emerald-400">0.038 arcsec</span>
              </div>
            </div>

            {/* Candidate Actions */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => notify('MPC Verification Dispatched', `Preparing astrometric 80-column punch card for Minor Planet Center reporting.`, 'info')}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-astro-blue hover:bg-blue-600 text-white text-xs font-semibold shadow-glow-blue transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Submit to MPC Ephemeris Checker</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
