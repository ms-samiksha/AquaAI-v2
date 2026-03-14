'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ChatPanel from '@/components/ChatPanel'
import { ArrowLeft, X, AlertTriangle, CheckCircle, Leaf, Heart } from 'lucide-react'

interface VisualFeatures {
  organism_type?: string
  body_shape?: string
  dominant_color?: string
  pattern?: string
  coral_structure?: string
  branching_pattern?: string
  possible_bleaching?: boolean
  bleaching_severity?: string
  creature_class?: string
  notable_features?: string
  size_estimate?: string
  appendages?: string
}

interface Species {
  species_name: string
  confidence: number
  description?: string
  common_names?: string[]
  natural_habitat?: string
  ecosystem_role?: string
  rarity_level?: string
  reef_dependency?: string
  reef_role?: string
  coral_health_status?: string
  danger_level?: string
  sensitivity_level?: string
  possible_bleaching_causes?: string[]
  recommended_actions?: string[]
  interesting_facts?: string[]
  health_status?: string
  observed_conditions?: string[]
  health_notes?: string
}

interface AnalysisResult {
  image_url: string
  s3_key: string
  analysis_type?: string
  visual_features: VisualFeatures
  species: Species
}

interface ModalInfo {
  icon: string
  label: string
  value: string
}

async function fetchWikipediaImage(name: string): Promise<string | null> {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data?.originalimage?.source || data?.thumbnail?.source || null
  } catch { return null }
}

function truncate(text: string | undefined, maxWords = 10): string {
  if (!text) return '—'
  const words = text.split(' ')
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(' ') + '...'
}

function healthColor(status?: string) {
  if (!status || status === 'healthy') return 'rgba(34,197,94,0.08)'
  if (status === 'parasitized' || status === 'diseased') return 'rgba(220,38,38,0.08)'
  if (status === 'injured') return 'rgba(249,115,22,0.08)'
  return 'rgba(245,158,11,0.08)'
}
function healthBorderColor(status?: string) {
  if (!status || status === 'healthy') return 'rgba(34,197,94,0.25)'
  if (status === 'parasitized' || status === 'diseased') return 'rgba(220,38,38,0.3)'
  if (status === 'injured') return 'rgba(249,115,22,0.3)'
  return 'rgba(245,158,11,0.25)'
}
function healthTextColor(status?: string) {
  if (!status || status === 'healthy') return '#4ade80'
  if (status === 'parasitized' || status === 'diseased') return '#f87171'
  if (status === 'injured') return '#fb923c'
  return '#fbbf24'
}
function healthEmoji(status?: string) {
  if (!status || status === 'healthy') return '✅'
  if (status === 'parasitized') return '🦠'
  if (status === 'injured') return '🩹'
  if (status === 'diseased') return '⚠️'
  return '⚠️'
}

export default function ResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [imgUrl, setImgUrl] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'facts' | 'conservation'>('overview')
  const [modal, setModal] = useState<ModalInfo | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('aquaai_result')
    if (!stored) { router.push('/'); return }
    try { setResult(JSON.parse(stored)) }
    catch { router.push('/') }
    setLoading(false)
  }, [router])

  useEffect(() => {
    if (!result) return
    ;(async () => {
      if (result.image_url?.startsWith('http')) { setImgUrl(result.image_url); return }
      const w = await fetchWikipediaImage(result.species.species_name)
      if (w) { setImgUrl(w); return }
      const c = result.species.common_names?.[0]
      if (c) { const f = await fetchWikipediaImage(c); if (f) { setImgUrl(f); return } }
    })()
  }, [result])

  if (loading || !result) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#020c1b' }}>
      <div className="text-center space-y-4">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full border border-cyan-500/20" />
          <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400 animate-spin" />
          <div className="absolute inset-3 rounded-full border-t border-cyan-300/40 animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '0.7s' }} />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🌊</div>
        </div>
        <p className="font-mono text-xs tracking-widest uppercase" style={{ color: 'rgba(6,182,212,0.5)' }}>
          Initializing marine scan...
        </p>
      </div>
    </div>
  )

  const isCoral   = result.analysis_type === 'coral'
  const isMarine  = result.analysis_type === 'marine'
  const isImageUpload = !!result.s3_key
  const pct = Math.min(Math.max(result.species.confidence * 100, 0), 100)
  const dl  = result.species.danger_level || 'low'
  const sl  = result.species.sensitivity_level || ''
  const dColor: Record<string, string> = { critical: '#ef4444', high: '#f97316', moderate: '#eab308', low: '#22c55e', healthy: '#22c55e' }
  const dIcon:  Record<string, string> = { critical: '🔴', high: '🟠', moderate: '🟡', low: '🟢', healthy: '🟢' }
  const dc = dColor[dl] || '#22c55e'

  const coralHealthColor  = (s?: string) => { if (!s) return 'rgba(34,197,94,0.12)'; if (s.includes('severe')) return 'rgba(220,38,38,0.15)'; if (s.includes('bleach')) return 'rgba(239,68,68,0.12)'; if (s.includes('stress')) return 'rgba(245,158,11,0.12)'; return 'rgba(34,197,94,0.12)' }
  const coralHealthBorder = (s?: string) => { if (!s) return 'rgba(34,197,94,0.3)'; if (s.includes('severe')) return 'rgba(220,38,38,0.4)'; if (s.includes('bleach')) return 'rgba(239,68,68,0.3)'; if (s.includes('stress')) return 'rgba(245,158,11,0.3)'; return 'rgba(34,197,94,0.3)' }

  const fishCards = [
    { icon: '🌍', label: 'Habitat',        value: result.species.natural_habitat || '' },
    { icon: '⚙️', label: 'Ecosystem Role', value: result.species.ecosystem_role  || '' },
    { icon: '📊', label: 'Rarity',         value: result.species.rarity_level    || '' },
    { icon: '🪸', label: 'Reef Link',      value: result.species.reef_dependency || '' },
  ]
  const marineCards = [
    { icon: '🌍', label: 'Habitat',        value: result.species.natural_habitat || '' },
    { icon: '⚙️', label: 'Ecosystem Role', value: result.species.ecosystem_role  || '' },
    { icon: '📊', label: 'Rarity',         value: result.species.rarity_level    || '' },
    { icon: '🌊', label: 'Ocean Role',     value: result.species.reef_dependency || '' },
  ]
  const coralSearchCards = [
    { icon: '🌍', label: 'Habitat',     value: result.species.natural_habitat || '' },
    { icon: '🌡️', label: 'Sensitivity', value: sl || result.species.rarity_level || '' },
  ]

  const hasHealthData = !!(result.species.health_status || (result.species.observed_conditions?.length ?? 0) > 0 || result.species.health_notes)

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;900&family=JetBrains+Mono:wght@300;400;500&display=swap');
        @keyframes fadeUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanline  { from{transform:translateY(-100%)} to{transform:translateY(100vh)} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 12px rgba(6,182,212,0.2)} 50%{box-shadow:0 0 28px rgba(6,182,212,0.5)} }
        @keyframes shimmer   { from{background-position:200% center} to{background-position:-200% center} }
        @keyframes modalIn   { from{opacity:0;transform:scale(0.92) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .fu { animation: fadeUp 0.5s ease forwards; opacity:0; }
        .d1{animation-delay:0.05s} .d2{animation-delay:0.15s}
        .d3{animation-delay:0.25s} .d4{animation-delay:0.35s}
        .d5{animation-delay:0.45s} .d6{animation-delay:0.55s}
        .img-glow { animation: glowPulse 3s ease-in-out infinite; }
        .hover-card { transition: all 0.2s ease; cursor: pointer; }
        .hover-card:hover { transform: translateY(-3px) scale(1.02); border-color: rgba(6,182,212,0.45) !important; background: rgba(6,182,212,0.1) !important; box-shadow: 0 8px 25px rgba(6,182,212,0.12); }
        .shimmer-text { background: linear-gradient(90deg,#fff 0%,#67e8f9 30%,#0891b2 50%,#67e8f9 70%,#fff 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: shimmer 4s linear infinite; }
        .modal-enter { animation: modalIn 0.25s ease forwards; }
      `}</style>

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(2,12,27,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setModal(null)}>
          <div className="modal-enter rounded-2xl p-8 max-w-lg w-full relative"
            style={{ background: '#0a1628', border: '1px solid rgba(6,182,212,0.3)', boxShadow: '0 0 60px rgba(6,182,212,0.15),0 25px 50px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-cyan-400 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-cyan-400 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-cyan-400 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-cyan-400 rounded-br-2xl" />
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)' }}>
                  {modal.icon}
                </div>
                <div>
                  <p className="text-xs tracking-widest uppercase mb-0.5" style={{ color: 'rgba(6,182,212,0.5)', fontFamily: "'JetBrains Mono',monospace" }}>{modal.label}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono',monospace" }}>{result.species.species_name}</p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg transition-all"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='#f87171'; (e.currentTarget as HTMLElement).style.background='rgba(239,68,68,0.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.background='transparent' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: "'JetBrains Mono',monospace", lineHeight: '1.8' }}>
              {modal.value || 'No data available.'}
            </p>
            <button onClick={() => setModal(null)}
              className="mt-6 w-full py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all"
              style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', color: 'rgba(103,232,249,0.6)', fontFamily: "'JetBrains Mono',monospace" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(6,182,212,0.15)'; (e.currentTarget as HTMLElement).style.color='#67e8f9' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(6,182,212,0.08)'; (e.currentTarget as HTMLElement).style.color='rgba(103,232,249,0.6)' }}>
              Close
            </button>
          </div>
        </div>
      )}

      <main className="min-h-screen relative overflow-x-hidden" style={{ background: '#020c1b', fontFamily: "'JetBrains Mono',monospace" }}>

        {imgUrl && (
          <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${imgUrl}')`, filter: 'blur(80px) saturate(0.22)', transform: 'scale(1.2)', opacity: 0.45 }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,rgba(2,12,27,0.95) 0%,rgba(2,12,27,0.75) 50%,rgba(2,12,27,0.97) 100%)' }} />
          </div>
        )}
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(6,182,212,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.025) 1px,transparent 1px)', backgroundSize: '50px 50px' }} />
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute left-0 right-0 h-px opacity-20" style={{ background: 'linear-gradient(90deg,transparent,rgba(6,182,212,0.6),transparent)', animation: 'scanline 12s linear infinite' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-6">

          {/* NAV */}
          <nav className="fu d1 flex items-center justify-between mb-6">
            <button onClick={() => router.push('/')}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200"
              style={{ border: '1px solid rgba(6,182,212,0.18)', color: 'rgba(103,232,249,0.55)' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='rgba(6,182,212,0.45)'; el.style.color='#67e8f9'; el.style.background='rgba(6,182,212,0.07)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='rgba(6,182,212,0.18)'; el.style.color='rgba(103,232,249,0.55)'; el.style.background='transparent' }}>
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-xs tracking-widest uppercase">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  border: `1px solid ${isCoral ? 'rgba(251,146,60,0.35)' : isMarine ? 'rgba(167,139,250,0.35)' : 'rgba(6,182,212,0.3)'}`,
                  background: isCoral ? 'rgba(251,146,60,0.06)' : isMarine ? 'rgba(167,139,250,0.06)' : 'rgba(6,182,212,0.06)',
                }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: isCoral ? '#fb923c' : isMarine ? '#a78bfa' : '#67e8f9' }} />
                <span className="text-xs tracking-widest uppercase"
                  style={{ color: isCoral ? '#fb923c' : isMarine ? '#a78bfa' : '#67e8f9' }}>
                  {isCoral ? 'Coral Health' : isMarine ? 'Marine Life' : 'Species ID'} · Nova
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ border: '1px solid rgba(255,153,0,0.2)', background: 'rgba(255,153,0,0.04)' }}>
                <span className="text-xs" style={{ color: 'rgba(255,153,0,0.7)' }}>☁️ AWS Bedrock</span>
              </div>
            </div>
          </nav>

          {/* HERO */}
          <div className="fu d2 mb-6">
            <p className="text-xs tracking-widest mb-1" style={{ color: 'rgba(6,182,212,0.4)' }}>// ANALYSIS_COMPLETE · {new Date().toLocaleDateString()}</p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-2 shimmer-text" style={{ fontFamily: "'Orbitron',monospace" }}>
              {result.species.species_name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {result.species.common_names?.slice(0, 3).map((n, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                  style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                  {n}
                </span>
              ))}
              <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                style={{ color: pct >= 80 ? '#67e8f9' : pct >= 60 ? '#fbbf24' : '#f87171', border: `1px solid ${pct >= 80 ? 'rgba(6,182,212,0.3)' : 'rgba(251,191,36,0.3)'}`, background: `${pct >= 80 ? 'rgba(6,182,212,0.06)' : 'rgba(251,191,36,0.06)'}` }}>
                {pct.toFixed(1)}% match
              </span>
            </div>
          </div>

          {/* MAIN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">

            {/* LEFT PANEL */}
            <div className="fu d3 lg:col-span-3 flex flex-col gap-3">

              {/* Image */}
              <div className="img-glow rounded-2xl overflow-hidden relative"
                style={{ border: '1px solid rgba(6,182,212,0.25)', background: 'rgba(2,12,27,0.9)' }}>
                {['tl','tr','bl','br'].map(c => (
                  <div key={c} className={`absolute w-4 h-4 z-10 ${c==='tl'?'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg':c==='tr'?'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg':c==='bl'?'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg':'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg'} border-cyan-400`} />
                ))}
                <div style={{ height: '240px' }}>
                  {imgUrl
                    ? <img src={imgUrl} alt={result.species.species_name} className="w-full h-full object-cover" />
                    : <div className="flex flex-col items-center justify-center h-full gap-2">
                        <span className="text-5xl opacity-15">{isCoral ? '🪸' : isMarine ? '🦞' : '🐟'}</span>
                        <p className="text-xs text-white/20">NO_IMAGE</p>
                      </div>
                  }
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(to bottom,rgba(6,182,212,0.06) 0%,transparent 25%,transparent 75%,rgba(6,182,212,0.06) 100%)' }} />
                </div>
                <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(6,182,212,0.1)' }}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-white/25 tracking-widest uppercase">Confidence</span>
                    <span className="text-xs font-bold text-cyan-300">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width:`${pct}%`, background: pct>80?'linear-gradient(90deg,#0891b2,#67e8f9)':pct>60?'linear-gradient(90deg,#d97706,#fbbf24)':'linear-gradient(90deg,#dc2626,#f87171)', boxShadow:'0 0 8px rgba(6,182,212,0.5)' }} />
                  </div>
                </div>
              </div>

              {/* Visual scan */}
              {(result.visual_features?.body_shape || result.visual_features?.coral_structure || result.visual_features?.creature_class) && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(2,12,27,0.8)', border: '1px solid rgba(6,182,212,0.1)' }}>
                  <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'rgba(6,182,212,0.4)' }}>// Visual Scan</p>
                  <div className="space-y-2">
                    {(isCoral ? [
                      ['Structure', result.visual_features.coral_structure],
                      ['Color',     result.visual_features.dominant_color],
                      ['Bleaching', result.visual_features.possible_bleaching ? '⚠ Detected' : '✓ None'],
                      ['Severity',  result.visual_features.bleaching_severity],
                    ] : isMarine ? [
                      ['Class',   result.visual_features.creature_class],
                      ['Color',   result.visual_features.dominant_color],
                      ['Notable', result.visual_features.notable_features],
                      ['Size',    result.visual_features.size_estimate],
                    ] : [
                      ['Shape',   result.visual_features.body_shape],
                      ['Color',   result.visual_features.dominant_color],
                      ['Pattern', result.visual_features.pattern],
                    ]).filter(([,v]) => v).map(([k, v]) => (
                      <div key={k as string} className="flex justify-between">
                        <span className="text-xs text-white/22">{k}</span>
                        <span className="text-xs capitalize ml-2 text-right" style={{ color: 'rgba(103,232,249,0.65)' }}>{v as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Known as */}
              {(result.species.common_names?.length ?? 0) > 0 && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(2,12,27,0.8)', border: '1px solid rgba(6,182,212,0.1)' }}>
                  <p className="text-xs tracking-widest uppercase mb-2.5" style={{ color: 'rgba(6,182,212,0.4)' }}>// Known As</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.species.common_names!.map((n, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-md"
                        style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.13)', color: 'rgba(103,232,249,0.6)' }}>
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CENTER: TABS */}
            <div className="fu d3 lg:col-span-6 flex flex-col gap-4">

              <div className="flex gap-0" style={{ borderBottom: '1px solid rgba(6,182,212,0.1)' }}>
                {(['overview', 'facts', 'conservation'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className="px-4 py-2.5 text-xs tracking-widest uppercase transition-all duration-200"
                    style={{ color: activeTab===tab ? '#67e8f9' : 'rgba(255,255,255,0.25)', borderBottom: activeTab===tab ? '2px solid #67e8f9' : '2px solid transparent', background: 'transparent' }}>
                    {tab === 'overview' ? '📋 Overview' : tab === 'facts' ? '💡 Facts' : '🌿 Conservation'}
                  </button>
                ))}
              </div>

              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4">

                  {/* Description */}
                  <div className="rounded-2xl p-5" style={{ background: 'rgba(2,12,27,0.85)', border: '1px solid rgba(6,182,212,0.13)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-0.5 h-4 rounded-full bg-cyan-400" />
                      <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(6,182,212,0.5)' }}>Species Overview</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{result.species.description}</p>
                  </div>

                  {/* ── HEALTH PANEL — all types ── */}
                  {hasHealthData && (
                    <div className="rounded-2xl p-5"
                      style={{ background: healthColor(result.species.health_status), border: `1px solid ${healthBorderColor(result.species.health_status)}` }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4" style={{ color: healthTextColor(result.species.health_status) }} />
                          <span className="text-xs tracking-widest uppercase" style={{ color: healthTextColor(result.species.health_status), opacity: 0.8 }}>
                            Health Assessment
                          </span>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full capitalize font-bold flex items-center gap-1.5"
                          style={{ background: healthColor(result.species.health_status), color: healthTextColor(result.species.health_status), border: `1px solid ${healthBorderColor(result.species.health_status)}` }}>
                          <span>{healthEmoji(result.species.health_status)}</span>
                          {result.species.health_status || 'unknown'}
                        </span>
                      </div>

                      {/* Condition chips */}
                      {(result.species.observed_conditions?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {result.species.observed_conditions!.map((c, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded-full"
                              style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${healthBorderColor(result.species.health_status)}`, color: healthTextColor(result.species.health_status) }}>
                              {c}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Health notes */}
                      {result.species.health_notes && (
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {result.species.health_notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Fish stat cards */}
                  {!isCoral && !isMarine && (
                    <div className="grid grid-cols-2 gap-3">
                      {fishCards.map(({ icon, label, value }) => (
                        <div key={label} className="hover-card rounded-xl p-4"
                          style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.1)' }}
                          onClick={() => value && value !== '—' && setModal({ icon, label, value })}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-sm">{icon}</span>
                            <span className="text-xs tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>{label}</span>
                          </div>
                          <p className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.7)' }}>{truncate(value, 10)}</p>
                          {value && value !== '—' && <p className="text-xs mt-2" style={{ color: 'rgba(6,182,212,0.4)' }}>Click for more →</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Marine stat cards */}
                  {isMarine && (
                    <div className="grid grid-cols-2 gap-3">
                      {marineCards.map(({ icon, label, value }) => (
                        <div key={label} className="hover-card rounded-xl p-4"
                          style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.1)' }}
                          onClick={() => value && value !== '—' && setModal({ icon, label, value })}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-sm">{icon}</span>
                            <span className="text-xs tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>{label}</span>
                          </div>
                          <p className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.7)' }}>{truncate(value, 10)}</p>
                          {value && value !== '—' && <p className="text-xs mt-2" style={{ color: 'rgba(167,139,250,0.4)' }}>Click for more →</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Coral overview */}
                  {isCoral && (
                    <div className="space-y-3">
                      <div className="rounded-xl p-4" style={{ background: coralHealthColor(result.species.coral_health_status), border: `1px solid ${coralHealthBorder(result.species.coral_health_status)}` }}>
                        <p className="text-xs tracking-wider uppercase mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Health Status</p>
                        <p className="text-sm font-bold text-white capitalize">{result.species.coral_health_status || 'Healthy'}</p>
                      </div>
                      {isImageUpload && (
                        <div className="rounded-xl p-4" style={{ background: `${dc}12`, border: `1px solid ${dc}40` }}>
                          <p className="text-xs tracking-wider uppercase mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Danger Level</p>
                          <div className="flex items-center gap-2">
                            <span className="text-base">{dIcon[dl] || '🟢'}</span>
                            <p className="text-sm font-bold capitalize" style={{ color: dc }}>{dl}</p>
                          </div>
                        </div>
                      )}
                      {!isImageUpload && sl && (
                        <div className="hover-card rounded-xl p-4"
                          style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)' }}
                          onClick={() => setModal({ icon: '🌡️', label: 'Sensitivity', value: sl })}>
                          <p className="text-xs tracking-wider uppercase mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>🌡️ Sensitivity</p>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{truncate(sl, 10)}</p>
                          <p className="text-xs mt-2" style={{ color: 'rgba(6,182,212,0.4)' }}>Click for more →</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {coralSearchCards.map(({ icon, label, value }) => (
                          <div key={label} className="hover-card rounded-xl p-4"
                            style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.1)' }}
                            onClick={() => value && value !== '—' && setModal({ icon, label, value })}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-sm">{icon}</span>
                              <span className="text-xs tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>{label}</span>
                            </div>
                            <p className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.7)' }}>{truncate(value, 10)}</p>
                            {value && value !== '—' && <p className="text-xs mt-2" style={{ color: 'rgba(6,182,212,0.4)' }}>Click for more →</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FACTS TAB */}
              {activeTab === 'facts' && (
                <div className="rounded-2xl p-5" style={{ background: 'rgba(2,12,27,0.85)', border: '1px solid rgba(6,182,212,0.13)' }}>
                  {(result.species.interesting_facts ?? []).length > 0 ? (
                    <div className="space-y-3">
                      {result.species.interesting_facts!.map((f, i) => (
                        <div key={i} className="hover-card flex gap-3 p-3 rounded-xl"
                          style={{ background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.08)' }}>
                          <span className="text-xs font-bold shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(6,182,212,0.12)', color: '#67e8f9', fontFamily: "'Orbitron',monospace" }}>
                            {i + 1}
                          </span>
                          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{f}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-3xl mb-3">🔍</p>
                      <p className="text-xs text-white/25 mb-1">No facts in this result</p>
                      <p className="text-xs" style={{ color: 'rgba(6,182,212,0.35)' }}>Try asking AquaAI in the chat →</p>
                    </div>
                  )}
                </div>
              )}

              {/* CONSERVATION TAB */}
              {activeTab === 'conservation' && (
                <div className="space-y-4">
                  {isCoral && (result.species.possible_bleaching_causes ?? []).length > 0 && (
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(2,12,27,0.85)', border: '1px solid rgba(251,146,60,0.15)' }}>
                      <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                        <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(251,146,60,0.6)' }}>Bleaching Causes</span>
                      </div>
                      <ul className="space-y-2.5">
                        {result.species.possible_bleaching_causes!.map((c, i) => (
                          <li key={i} className="flex gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            <span className="shrink-0 mt-0.5" style={{ color: 'rgba(251,146,60,0.6)' }}>▸</span>{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {isCoral && (result.species.recommended_actions ?? []).length > 0 && (
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(2,12,27,0.85)', border: '1px solid rgba(34,197,94,0.15)' }}>
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(34,197,94,0.6)' }}>Recovery Actions</span>
                      </div>
                      <ul className="space-y-2.5">
                        {result.species.recommended_actions!.map((a, i) => (
                          <li key={i} className="flex gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            <span className="shrink-0 mt-0.5" style={{ color: 'rgba(34,197,94,0.6)' }}>✓</span>{a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!isCoral && (
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(2,12,27,0.85)', border: '1px solid rgba(6,182,212,0.13)' }}>
                      <div className="flex items-center gap-2 mb-4">
                        <Leaf className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(6,182,212,0.5)' }}>Ecological Role</span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {result.species.ecosystem_role || 'No conservation data available.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: CHAT + STATS */}
            <div className="fu d4 lg:col-span-3 flex flex-col gap-3">
              {!chatOpen && (
                <>
                  <button onClick={() => setChatOpen(true)}
                    className="hover-card rounded-2xl p-5 text-left w-full"
                    style={{ background: 'rgba(2,12,27,0.85)', border: '1px solid rgba(6,182,212,0.22)', boxShadow: '0 0 20px rgba(6,182,212,0.04)' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='rgba(6,182,212,0.5)'; el.style.boxShadow='0 0 35px rgba(6,182,212,0.15)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='rgba(6,182,212,0.22)'; el.style.boxShadow='0 0 20px rgba(6,182,212,0.04)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: 'linear-gradient(135deg,rgba(6,182,212,0.15),rgba(14,116,144,0.2))', border: '1px solid rgba(6,182,212,0.25)' }}>
                      <span className="text-lg">💬</span>
                    </div>
                    <p className="font-bold text-white mb-1" style={{ fontFamily: "'Orbitron',monospace", fontSize: '11px' }}>AQUAAI ASSISTANT</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Deep-dive into {result.species.species_name} — behavior, threats, health, and more.
                    </p>
                    <div className="flex items-center gap-1.5 mt-4 pt-3" style={{ borderTop: '1px solid rgba(6,182,212,0.08)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-xs" style={{ color: 'rgba(6,182,212,0.5)' }}>Nova AI · Online</span>
                    </div>
                  </button>

                  <div className="rounded-2xl p-4" style={{ background: 'rgba(2,12,27,0.8)', border: '1px solid rgba(6,182,212,0.1)' }}>
                    <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'rgba(6,182,212,0.4)' }}>// Quick Stats</p>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Analysis', value: isCoral ? 'Coral Health' : isMarine ? 'Marine Life' : 'Fish ID' },
                        { label: 'Engine',   value: 'Amazon Nova' },
                        { label: 'Match',    value: `${pct.toFixed(1)}%` },
                        { label: 'Source',   value: isImageUpload ? 'Image Upload' : 'Text Search' },
                        { label: 'Health',   value: result.species.health_status || (isCoral ? result.species.coral_health_status : null) || '—' },
                      ].map(({ label, value }) => value && (
                        <div key={label} className="flex justify-between items-center">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.22)' }}>{label}</span>
                          <span className="text-xs font-medium capitalize"
                            style={{ color: label === 'Health' && value !== '—' && value !== 'healthy' ? '#fbbf24' : 'rgba(103,232,249,0.7)' }}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(isCoral ? result.species.reef_role : result.species.rarity_level) && (
                    <div className="hover-card rounded-xl p-4"
                      style={{ background: 'rgba(2,12,27,0.75)', border: '1px solid rgba(6,182,212,0.09)' }}
                      onClick={() => {
                        const val = isCoral ? result.species.reef_role : result.species.rarity_level
                        if (val) setModal({ icon: isCoral ? '🪸' : '📊', label: isCoral ? 'Reef Role' : 'Rarity', value: val })
                      }}>
                      <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'rgba(6,182,212,0.35)' }}>
                        {isCoral ? '// Reef Role' : '// Rarity'}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {truncate(isCoral ? result.species.reef_role : result.species.rarity_level, 18)}
                      </p>
                      <p className="text-xs mt-2" style={{ color: 'rgba(6,182,212,0.35)' }}>Click for more →</p>
                    </div>
                  )}

                  <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                    style={{ background: 'rgba(255,153,0,0.03)', border: '1px solid rgba(255,153,0,0.1)' }}>
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.15)' }}>Powered by</p>
                      <p className="text-xs font-bold" style={{ color: 'rgba(255,153,0,0.6)', fontFamily: "'Orbitron',monospace", fontSize: '10px' }}>AMAZON NOVA · AWS</p>
                    </div>
                    <span className="text-xl">☁️</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* CHAT PANEL */}
          {chatOpen && (
            <div className="fu d3 mb-4">
              <ChatPanel speciesName={result.species.species_name} onClose={() => setChatOpen(false)} />
            </div>
          )}

          <div className="fu d6 text-center pt-5" style={{ borderTop: '1px solid rgba(6,182,212,0.06)' }}>
            <p className="text-xs tracking-widest" style={{ color: 'rgba(6,182,212,0.15)', fontFamily: "'Orbitron',monospace" }}>
              AQUAAI · MARINE ECOSYSTEM INTELLIGENCE · HACKATHON 2026
            </p>
          </div>

        </div>
      </main>
    </>
  )
}