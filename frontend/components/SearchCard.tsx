'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Search, Loader } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const SUGGESTIONS = [
  'Blue Tang', 'Clownfish', 'Manta Ray', 'Hammerhead Shark',
  'Staghorn Coral', 'Brain Coral', 'Elkhorn Coral', 'Sea Fan',
  'Parrotfish', 'Lionfish', 'Mantis Shrimp', 'Moray Eel',
  'Acropora', 'Platygyra', 'Pocillopora', 'Montipora',
]

export default function SearchCard() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [analysisType, setAnalysisType] = useState<'fish' | 'coral'>('fish')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtered, setFiltered] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length > 0) {
      const f = SUGGESTIONS.filter(s =>
        s.toLowerCase().includes(query.toLowerCase())
      )
      setFiltered(f)
      setShowDropdown(f.length > 0)
    } else {
      setShowDropdown(false)
    }
  }, [query])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearch = async (searchQuery?: string) => {
    const finalQuery = searchQuery || query
    if (!finalQuery.trim()) {
      setError('Please enter a species name')
      return
    }
    setLoading(true)
    setError(null)
    setShowDropdown(false)
    try {
      const response = await axios.post(
        `${API_URL}/search`,
        { species_name: finalQuery.trim(), analysis_type: analysisType },
        { timeout: 30000 }
      )
      localStorage.setItem('aquaai_result', JSON.stringify(response.data))
      router.push('/results')
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="space-y-5">

      {/* Type toggle */}
      <div className="flex gap-2">
        {[
          { key: 'fish',  icon: '🐠', label: 'Fish'  },
          { key: 'coral', icon: '🪸', label: 'Coral' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setAnalysisType(t.key as 'fish' | 'coral')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-mono transition-all duration-200"
            style={{
              background: analysisType === t.key ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.03)',
              border: analysisType === t.key ? '1px solid rgba(6,182,212,0.5)' : '1px solid rgba(255,255,255,0.06)',
              color: analysisType === t.key ? '#67e8f9' : 'rgba(255,255,255,0.4)',
              boxShadow: analysisType === t.key ? '0 0 15px rgba(6,182,212,0.1)' : 'none',
            }}>
            <span>{t.icon}</span>
            <span className="tracking-wider uppercase text-xs">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-4 h-4 text-cyan-400/60 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length > 0 && setShowDropdown(filtered.length > 0)}
            placeholder={analysisType === 'fish'
              ? 'e.g. Blue Tang, Clownfish, Manta Ray...'
              : 'e.g. Brain Coral, Staghorn, Acropora...'}
            className="w-full pl-11 pr-4 py-4 rounded-xl text-white placeholder-white/20 font-mono text-sm focus:outline-none transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(6,182,212,0.2)',
              caretColor: '#67e8f9',
            }}
            onMouseEnter={e => { (e.target as HTMLInputElement).style.border = '1px solid rgba(6,182,212,0.4)' }}
            onMouseLeave={e => { (e.target as HTMLInputElement).style.border = '1px solid rgba(6,182,212,0.2)' }}
          />
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
            style={{ background: 'rgba(2,12,27,0.98)', border: '1px solid rgba(6,182,212,0.2)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            {filtered.slice(0, 6).map((suggestion, i) => (
              <button
                key={i}
                onClick={() => { setQuery(suggestion); setShowDropdown(false); handleSearch(suggestion) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-mono transition-all duration-150"
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  borderBottom: i < filtered.slice(0, 6).length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(6,182,212,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#67e8f9' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)' }}>
                <Search className="w-3 h-3 text-cyan-500/40" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick picks */}
      <div className="space-y-2">
        <p className="text-xs font-mono text-white/20 tracking-widest uppercase">Popular searches</p>
        <div className="flex flex-wrap gap-2">
          {(analysisType === 'fish'
            ? ['Blue Tang', 'Clownfish', 'Lionfish', 'Manta Ray', 'Parrotfish']
            : ['Brain Coral', 'Staghorn Coral', 'Acropora', 'Elkhorn Coral', 'Sea Fan']
          ).map(s => (
            <button key={s}
              onClick={() => { setQuery(s); handleSearch(s) }}
              className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200"
              style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', color: 'rgba(103,232,249,0.6)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(6,182,212,0.15)'; (e.currentTarget as HTMLButtonElement).style.color='#67e8f9'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(6,182,212,0.4)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(6,182,212,0.06)'; (e.currentTarget as HTMLButtonElement).style.color='rgba(103,232,249,0.6)'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(6,182,212,0.15)' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg px-4 py-3 text-sm font-mono"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
          ⚠ {error}
        </div>
      )}

      {/* Search button */}
      <button
        onClick={() => handleSearch()}
        disabled={!query.trim() || loading}
        className="w-full py-4 rounded-xl font-mono font-bold text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3"
        style={{
          background: query.trim() && !loading ? 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(14,116,144,0.4))' : 'rgba(255,255,255,0.03)',
          border: query.trim() && !loading ? '1px solid rgba(6,182,212,0.5)' : '1px solid rgba(255,255,255,0.06)',
          color: query.trim() && !loading ? '#67e8f9' : 'rgba(255,255,255,0.2)',
          boxShadow: query.trim() && !loading ? '0 0 30px rgba(6,182,212,0.15)' : 'none',
          cursor: !query.trim() || loading ? 'not-allowed' : 'pointer',
        }}>
        {loading ? (
          <><Loader className="w-4 h-4 animate-spin" />Searching Ocean Database...</>
        ) : (
          <><Search className="w-4 h-4" />Search Species</>
        )}
      </button>

    </div>
  )
}