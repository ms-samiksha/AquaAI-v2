'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader, AlertCircle } from 'lucide-react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type AnalysisType = 'fish' | 'coral' | 'marine'

const TYPE_CONFIG: Record<AnalysisType, { icon: string; label: string; sub: string; color: string; border: string; bg: string }> = {
  fish:   { icon: '🐟', label: 'Fish',        sub: 'Reef fish, tropical species',     color: '#67e8f9', border: 'rgba(6,182,212,0.45)',   bg: 'rgba(6,182,212,0.12)'   },
  coral:  { icon: '🪸', label: 'Coral',       sub: 'Coral health & bleaching',        color: '#fb923c', border: 'rgba(251,146,60,0.45)',  bg: 'rgba(251,146,60,0.12)'  },
  marine: { icon: '🦞', label: 'Marine Life', sub: 'Lobsters, crabs, turtles & more', color: '#a78bfa', border: 'rgba(167,139,250,0.45)', bg: 'rgba(167,139,250,0.12)' },
}

export default function UploadCard() {
  const router = useRouter()
  const [analysisType, setAnalysisType] = useState<AnalysisType>('fish')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    setFile(f)
    setError(null)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]; if (f) handleFile(f)
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) handleFile(f)
  }

  const handleAnalyze = async () => {
    if (!file) { setError('Please select an image first.'); return }
    setLoading(true); setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('analysis_type', analysisType)

      const res = await axios.post(`${API_URL}/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      })

      localStorage.setItem('aquaai_result', JSON.stringify({ ...res.data, analysis_type: analysisType }))
      router.push('/results')
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.detail || 'Analysis failed. Please try again.' : 'Connection error.')
    } finally {
      setLoading(false)
    }
  }

  const cfg = TYPE_CONFIG[analysisType]

  return (
    <>
      <style jsx>{`
        .upload-zone { transition: all 0.2s ease; }
        .upload-zone:hover { border-color: rgba(6,182,212,0.4) !important; background: rgba(6,182,212,0.04) !important; }
        .type-btn { transition: all 0.2s ease; cursor: pointer; }
        .type-btn:hover { transform: translateY(-1px); }
      `}</style>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(2,12,27,0.9)', border: '1px solid rgba(6,182,212,0.15)', boxShadow: '0 0 40px rgba(6,182,212,0.06)' }}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#67e8f9,#0891b2)' }} />
            <h3 className="text-sm font-bold text-white" style={{ fontFamily: "'Orbitron', monospace", letterSpacing: '0.05em' }}>IMAGE ANALYSIS</h3>
          </div>
          <p className="text-xs ml-3.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Upload any marine creature photo</p>
        </div>

        <div className="p-5 space-y-4">

          {/* Type selector */}
          <div>
            <p className="text-xs tracking-widest uppercase mb-2.5" style={{ color: 'rgba(6,182,212,0.4)' }}>// Analysis Type</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(TYPE_CONFIG) as [AnalysisType, typeof TYPE_CONFIG[AnalysisType]][]).map(([type, c]) => (
                <button key={type} onClick={() => setAnalysisType(type)}
                  className="type-btn rounded-xl py-3 px-2 text-center"
                  style={{
                    background: analysisType === type ? c.bg : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${analysisType === type ? c.border : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: analysisType === type ? `0 0 16px ${c.bg}` : 'none',
                  }}>
                  <div className="text-xl mb-1">{c.icon}</div>
                  <div className="text-xs font-bold" style={{ color: analysisType === type ? c.color : 'rgba(255,255,255,0.4)', fontFamily: "'Orbitron', monospace", fontSize: '9px' }}>
                    {c.label.toUpperCase()}
                  </div>
                  <div className="text-xs mt-0.5 leading-tight hidden sm:block" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px' }}>
                    {c.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            className="upload-zone rounded-xl relative overflow-hidden"
            style={{
              border: `1.5px dashed ${isDragging ? cfg.border : 'rgba(6,182,212,0.2)'}`,
              background: isDragging ? 'rgba(6,182,212,0.04)' : 'transparent',
              minHeight: '160px',
            }}
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}>

            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full object-cover rounded-xl" style={{ maxHeight: '200px' }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-xl" />
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                  <div>
                    <p className="text-xs text-white/70 truncate max-w-[140px]">{file?.name}</p>
                    {/* ✅ FIXED: use cfg.label not c.label */}
                    <p className="text-xs" style={{ color: cfg.color }}>{cfg.label} selected</p>
                  </div>
                  <button onClick={() => { setFile(null); setPreview(null) }}
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                    ✕ Clear
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-full cursor-pointer py-8 px-4">
                <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.15)' }}>
                  <Upload className="w-5 h-5" style={{ color: 'rgba(6,182,212,0.5)' }} />
                </div>
                <p className="text-sm text-white/50 text-center mb-1">
                  Drop image here or <span style={{ color: cfg.color }}>browse</span>
                </p>
                <p className="text-xs text-white/20 text-center">JPG, PNG, WEBP supported</p>
                <div className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                  <span className="text-sm">{cfg.icon}</span>
                  <span className="text-xs font-bold" style={{ color: cfg.color, fontFamily: "'Orbitron', monospace", fontSize: '9px' }}>
                    {cfg.label.toUpperCase()} MODE
                  </span>
                </div>
              </label>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {/* Analyze button */}
          <button onClick={handleAnalyze} disabled={!file || loading}
            className="w-full py-3 rounded-xl font-bold transition-all duration-200"
            style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: '11px',
              letterSpacing: '0.1em',
              background: file && !loading ? `linear-gradient(135deg, ${cfg.bg.replace('0.12', '0.25')}, rgba(14,116,144,0.3))` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${file && !loading ? cfg.border : 'rgba(255,255,255,0.06)'}`,
              color: file && !loading ? cfg.color : 'rgba(255,255,255,0.2)',
              boxShadow: file && !loading ? `0 0 20px ${cfg.bg}` : 'none',
              cursor: file && !loading ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={e => { if (file && !loading) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-3.5 h-3.5 animate-spin" />
                SCANNING...
              </span>
            ) : (
              `ANALYZE ${cfg.label.toUpperCase()} →`
            )}
          </button>

        </div>
      </div>
    </>
  )
}