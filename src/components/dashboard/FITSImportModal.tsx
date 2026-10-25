import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, FileText, Check, X, AlertCircle, Database, Sparkles, FolderOpen } from 'lucide-react'
import { useAstrion, mapBackendRecordToObservation } from '../../context/AstrionContext'
import { FitsIngestionService } from '../../services/fitsIngestion.service'
import { backendApi } from '../../services/backendApi.service'
import type { FitsObservation } from '../../types/astronomy'

const SAMPLE_ASTRONOMICAL_DATASETS: Array<{
  name: string
  filename: string
  size: number
  target: string
  filter: string
  telescope: string
  ra: number
  dec: number
}> = [
  {
    name: 'SPHEREx Deep Survey Field 04',
    filename: 'SPHEREx_D04_EPOCH1_2026.fits',
    size: 34502800,
    target: 'NEO-HUNT-04',
    filter: 'NIR Band 3 (2.4-3.8µm)',
    telescope: 'SPHEREx All-Sky Surveyor',
    ra: 184.2254,
    dec: 29.8142,
  },
  {
    name: 'SPHEREx Deep Survey Field 04 (Epoch 2)',
    filename: 'SPHEREx_D04_EPOCH2_2026.fits',
    size: 34502800,
    target: 'NEO-HUNT-04',
    filter: 'NIR Band 3 (2.4-3.8µm)',
    telescope: 'SPHEREx All-Sky Surveyor',
    ra: 184.2258,
    dec: 29.8145,
  },
  {
    name: 'Pan-STARRS1 Ecliptic Plane Survey',
    filename: 'PS1_ECLIPTIC_G_202610.fits',
    size: 28940000,
    target: 'MAIN-BELT-SURVEY',
    filter: 'g-band (Optical 486nm)',
    telescope: 'Pan-STARRS PS1 1.8m',
    ra: 42.8711,
    dec: 14.1952,
  },
  {
    name: 'Palomar Transient Factory Epoch A',
    filename: 'PTF_EPOCH_A_R_BAND.fits',
    size: 19820000,
    target: 'FIELD-PTF-88',
    filter: 'r-band (Optical 658nm)',
    telescope: 'Samuel Oschin 48-inch Schmidt',
    ra: 210.5112,
    dec: -5.3219,
  },
]

export const FITSImportModal: React.FC = () => {
  const { isImportModalOpen, setIsImportModalOpen, addObservations, notify } = useAstrion()
  const [dragOver, setDragOver] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<FitsObservation[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isImportModalOpen) return null

  const inspectFileWithBestService = async (file: File): Promise<FitsObservation | null> => {
    try {
      // 1. Attempt authentic Astropy ingestion & SQLite persistence via local Python backend
      const res = await backendApi.ingestFitsFile(file)
      if (res.status === 'duplicate') {
        notify('Duplicate FITS Detected', `Observation '${file.name}' was already ingested. Re-using stored record.`, 'info')
      }
      return mapBackendRecordToObservation(res.observation)
    } catch (err: any) {
      if (err.message && err.message.includes('FITS ingestion failed')) {
        notify('FITS Ingestion Error', err.message, 'error')
        return null
      }
      // 2. Graceful fallback to client-side reader if backend is offline in browser mode
      const clientResult = await FitsIngestionService.parseLocalFileMetadata(file)
      if (clientResult.success && clientResult.data) {
        return {
          ...clientResult.data,
          inspectionSource: 'client_parser',
        }
      }
      notify('FITS Parsing Error', clientResult.error?.message || 'Failed to parse file.', 'error')
      return null
    }
  }

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    setIsProcessing(true)

    const newObservations: FitsObservation[] = []
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i]
      const obs = await inspectFileWithBestService(file)
      if (obs) newObservations.push(obs)
    }

    setStagedFiles((prev) => [...prev, ...newObservations])
    setIsProcessing(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleNativeDesktopSelect = async () => {
    if (!window.astrion?.isElectron) {
      fileInputRef.current?.click()
      return
    }
    setIsProcessing(true)
    try {
      const res = await window.astrion.selectFitsFiles()
      if (!res.canceled && res.filePaths.length > 0) {
        const newObservations: FitsObservation[] = res.filePaths.map((fp, index) => {
          const filename = fp.split('/').pop() || fp
          return {
            id: `obs-native-${Date.now()}-${index}`,
            filename,
            sizeBytes: 16777216,
            uploadedAt: new Date().toISOString(),
            targetName: filename.replace(/\.(fits|fit|fts|gz)$/i, ''),
            filterBand: 'Visible / Near-IR',
            telescope: 'Native Desktop Importer (macOS)',
            raCenter: 184.22 + index * 0.05,
            decCenter: 29.81 + index * 0.04,
            status: 'raw',
            dimensions: { width: 2048, height: 2048 },
          }
        })
        setStagedFiles((prev) => [...prev, ...newObservations])
      }
    } catch (err) {
      console.error('Error opening native file picker:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return

    setIsProcessing(true)
    const newObservations: FitsObservation[] = []
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      const file = e.dataTransfer.files[i]
      const obs = await inspectFileWithBestService(file)
      if (obs) newObservations.push(obs)
    }
    setStagedFiles((prev) => [...prev, ...newObservations])
    setIsProcessing(false)
  }

  const addSampleDataset = (sample: typeof SAMPLE_ASTRONOMICAL_DATASETS[0]) => {
    const obs: FitsObservation = {
      id: `obs-sample-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      filename: sample.filename,
      sizeBytes: sample.size,
      uploadedAt: new Date().toISOString(),
      targetName: sample.target,
      filterBand: sample.filter,
      telescope: sample.telescope,
      raCenter: sample.ra,
      decCenter: sample.dec,
      status: 'raw',
      inspectionSource: 'sample_benchmark',
      dimensions: { width: 2048, height: 2048 },
    }
    setStagedFiles((prev) => [...prev, obs])
  }

  const removeStaged = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const commitImport = () => {
    if (stagedFiles.length === 0) return
    addObservations(stagedFiles)
    setStagedFiles([])
    setIsImportModalOpen(false)
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-space-850 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-space-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-astro-blue/10 border border-astro-blue/30 text-astro-cyan">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white tracking-wide">Import FITS Observations</h3>
                <p className="text-xs text-slate-400">Load astronomical images, multi-epoch plates, or survey benchmark datasets</p>
              </div>
            </div>
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* File Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (window.astrion?.isElectron) {
                  handleNativeDesktopSelect()
                } else {
                  fileInputRef.current?.click()
                }
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
                dragOver
                  ? 'border-astro-cyan bg-astro-cyan/5 scale-[1.01]'
                  : 'border-slate-700/80 hover:border-astro-blue/60 hover:bg-space-800/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".fits,.fit,.fts,.tar,.gz"
                onChange={handleFileSelection}
                className="hidden"
              />
              <div className="p-4 rounded-full bg-astro-blue/10 border border-astro-blue/20 text-astro-cyan mb-3">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="text-sm font-medium text-slate-200">
                Click to browse or drop astronomical <span className="text-astro-cyan font-mono">.fits / .fit</span> files here
              </p>
              <p className="text-xs text-slate-400 mt-1.5">
                Supports FITS, FITS.GZ, Flexible Image Transport System standard HDUs
              </p>
              {window.astrion?.isElectron && (
                <div className="mt-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <FolderOpen className="w-3 h-3" />
                  macOS Native File Dialog Enabled
                </div>
              )}
            </div>

            {/* Quick Benchmark Datasets */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Simulated Benchmark Templates (NASA Space Apps 2026)
                </span>
                <span className="text-[11px] text-amber-500/80 font-mono">Simulated Demo Data</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SAMPLE_ASTRONOMICAL_DATASETS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => addSampleDataset(sample)}
                    className="flex flex-col text-left p-3 rounded-xl bg-space-800/60 hover:bg-space-700/80 border border-slate-800 hover:border-amber-500/40 transition-all group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-medium text-white group-hover:text-amber-300 transition-colors truncate">
                        {sample.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">
                        {formatBytes(sample.size)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 truncate">
                      {sample.telescope} • {sample.filter}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Staged Files List */}
            {stagedFiles.length > 0 && (
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-space-900/60">
                <div className="px-4 py-2.5 bg-space-800/60 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">
                    Staged Observations ({stagedFiles.length})
                  </span>
                  <button
                    onClick={() => setStagedFiles([])}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-800/60 p-1">
                  {stagedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between px-3 py-2 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-astro-blue shrink-0" />
                        <span className="text-slate-200 font-mono truncate">{file.filename}</span>
                        <span className="text-slate-500 shrink-0">({formatBytes(file.sizeBytes)})</span>
                        {file.inspectionSource === 'astropy_backend' ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                            ASTROPY INGESTED
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                            SIMULATED BENCHMARK
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeStaged(file.id)}
                        className="text-slate-400 hover:text-rose-400 p-1"
                        aria-label="Remove staged file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-astro-cyan font-mono animate-pulse">
                <div className="w-3 h-3 rounded-full border-2 border-astro-cyan border-t-transparent animate-spin" />
                Reading and parsing FITS binary headers...
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-800 bg-space-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <AlertCircle className="w-4 h-4 text-slate-500" />
              <span>Phase 1 loads files into the client-side session matrix.</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitImport}
                disabled={stagedFiles.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-astro-blue hover:bg-blue-500 text-white shadow-glow-blue disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Check className="w-4 h-4" />
                Import {stagedFiles.length > 0 ? `(${stagedFiles.length})` : ''} Observations
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
