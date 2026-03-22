'use client'

import { useEffect, useRef, useState } from 'react'
import { X, MapPin, AlertTriangle, User, ArrowLeft, ExternalLink, Leaf } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Sighting {
  species_name:   string
  common_name:    string
  lat:            number
  lng:            number
  location:       string
  type:           'hardcoded' | 'user_reported' | 'native_habitat'
  severity:       string
  notes?:         string
  reported_by?:   string
  timestamp?:     string
  research_team?: string
  team_contact?:  string
  team_action?:   string
  team_url?:      string
  note?:          string
}

interface SightingsData {
  species_name:      string
  hardcoded:         Sighting[]
  user_reported:     Sighting[]
  native_habitats:   Sighting[]
  total:             number
  is_invasive:       boolean
  conservation_tips: string[]
}

interface DuplicateInfo {
  location:    string
  type:        string
  severity:    string
  distance_km: number
}

interface Props {
  speciesName: string
  commonName?: string
  onClose:     () => void
}

const SEVERITY_COLOR: Record<string, string> = {
  critical:       '#ef4444',
  high:           '#f97316',
  moderate:       '#eab308',
  reported:       '#a78bfa',
  user_reported:  '#a78bfa',
  native:         '#22c55e',
  native_habitat: '#22c55e',
}

const SEVERITY_SIZE: Record<string, number> = {
  critical:       0.7,
  high:           0.55,
  moderate:       0.4,
  reported:       0.35,
  user_reported:  0.35,
  native:         0.5,
  native_habitat: 0.5,
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371
  const dlat = (lat2 - lat1) * Math.PI / 180
  const dlng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dlat/2)**2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dlng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default function SpeciesGlobe({ speciesName, commonName, onClose }: Props) {
  const globeRef         = useRef<HTMLDivElement>(null)
  const globeInstanceRef = useRef<any>(null)

  const [sightings, setSightings]           = useState<SightingsData | null>(null)
  const [loading, setLoading]               = useState(true)
  const [selected, setSelected]             = useState<Sighting | null>(null)
  const [reportMode, setReportMode]         = useState(false)
  const [reportLat, setReportLat]           = useState('')
  const [reportLng, setReportLng]           = useState('')
  const [reportLocation, setReportLocation] = useState('')
  const [reportNotes, setReportNotes]       = useState('')
  const [submitting, setSubmitting]         = useState(false)
  const [submitted, setSubmitted]           = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [geocoding, setGeocoding]           = useState(false)
  const [duplicate, setDuplicate]           = useState<DuplicateInfo | null>(null)
  const [nearbyWarning, setNearbyWarning]   = useState<DuplicateInfo | null>(null)
  const [activeLayer, setActiveLayer]       = useState<'all' | 'invasive' | 'native'>('all')

  // Fetch sightings
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res  = await fetch(`${API_URL}/sightings/${encodeURIComponent(speciesName)}`)
        const data = await res.json()
        setSightings(data)
      } catch {
        setSightings({
          species_name: speciesName, hardcoded: [], user_reported: [],
          native_habitats: [], total: 0, is_invasive: false, conservation_tips: [],
        })
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [speciesName])

  // Build globe
  useEffect(() => {
    if (!sightings || !globeRef.current) return

    const init = async () => {
      if (!globeRef.current) return
      const GlobeGL = (await import('globe.gl')).default

      const invasivePoints = [
        ...(sightings.hardcoded || []).map(s => ({
          ...s, color: SEVERITY_COLOR[s.severity] || '#ef4444',
          size: SEVERITY_SIZE[s.severity] || 0.4,
        })),
        ...(sightings.user_reported || []).map(s => ({
          ...s, color: '#a78bfa', size: 0.35,
        })),
      ]

      const nativePoints = (sightings.native_habitats || []).map(s => ({
        ...s, color: '#22c55e', size: 0.5,
      }))

      const allPoints = activeLayer === 'invasive' ? invasivePoints
        : activeLayer === 'native' ? nativePoints
        : [...invasivePoints, ...nativePoints]

      const globe = new GlobeGL(globeRef.current!)
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
        .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
        .width(globeRef.current!.clientWidth)
        .height(globeRef.current!.clientHeight)
        .pointsData(allPoints)
        .pointLat('lat')
        .pointLng('lng')
        .pointColor('color')
        .pointRadius('size')
        .pointAltitude(0.02)
        .pointLabel((d: any) => `
          <div style="
            background:rgba(2,12,27,0.97);
            border:1px solid ${d.color};
            border-radius:10px;
            padding:10px 14px;
            font-family:'JetBrains Mono',monospace;
            font-size:11px;
            color:white;
            max-width:230px;
          ">
            <div style="color:${d.color};font-weight:bold;margin-bottom:5px;">
              ${d.type === 'native_habitat' ? '🟢 Natural Habitat' : d.type === 'user_reported' ? '👤 User Reported' : '⚠ Invasive Sighting'}
            </div>
            <div style="color:white;font-weight:bold;margin-bottom:3px;">${d.location}</div>
            <div style="color:rgba(255,255,255,0.5);font-size:10px;">
              ${d.note || (d.type === 'native_habitat' ? 'Native range' : `Severity: ${d.severity}`)}
            </div>
            ${d.research_team && d.research_team !== 'Community Report'
              ? `<div style="color:rgba(103,232,249,0.6);font-size:9px;margin-top:4px;">🔬 ${d.research_team}</div>`
              : ''}
            <div style="color:rgba(255,255,255,0.2);font-size:9px;margin-top:3px;">Click for details</div>
          </div>
        `)
        .onPointClick((point: any) => setSelected(point))

      globe.controls().autoRotate      = true
      globe.controls().autoRotateSpeed = 0.5

      // Focus on first relevant point or default view
      const focusPoint = allPoints[0]
      if (focusPoint) {
        globe.pointOfView({ lat: focusPoint.lat, lng: focusPoint.lng, altitude: 2.5 }, 1500)
      } else {
        globe.pointOfView({ lat: 20, lng: -40, altitude: 2.2 }, 1000)
      }

      globeInstanceRef.current = globe
    }

    init()

    return () => {
      globeInstanceRef.current?._destructor?.()
      globeInstanceRef.current = null
    }
  }, [sightings, activeLayer])

  // Resize
  useEffect(() => {
    const onResize = () => {
      if (globeInstanceRef.current && globeRef.current) {
        globeInstanceRef.current
          .width(globeRef.current.clientWidth)
          .height(globeRef.current.clientHeight)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleGeocode = async () => {
    if (!locationSearch.trim()) return
    setGeocoding(true)
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=json&limit=1`
      )
      const data = await res.json()
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0]
        const parsedLat = parseFloat(lat)
        const parsedLng = parseFloat(lon)
        setReportLat(parsedLat.toFixed(4))
        setReportLng(parsedLng.toFixed(4))
        setReportLocation(display_name.split(',').slice(0,3).join(','))
        checkNearby(parsedLat, parsedLng)
        globeInstanceRef.current?.pointOfView({ lat: parsedLat, lng: parsedLng, altitude: 1.8 }, 1000)
      } else {
        alert('Location not found. Try a more specific name.')
      }
    } catch {
      alert('Search failed. Please enter coordinates manually.')
    } finally {
      setGeocoding(false)
    }
  }

  
    const checkNearby = (lat: number, lng: number) => {
    if (!sightings) return
    const all = [...(sightings.hardcoded||[]), ...(sightings.user_reported||[])]
    const near = all.find(s => haversine(lat, lng, s.lat, s.lng) <= 50)
    if (near) {
      setNearbyWarning({
        location:    near.location,
        type:        near.type,
        severity:    near.severity,
        distance_km: Math.round(haversine(lat, lng, near.lat, near.lng)),
      })
    } else {
      setNearbyWarning(null)
    }
  }

  const handleLatLngChange = (lat: string, lng: string) => {
    const parsedLat = parseFloat(lat)
    const parsedLng = parseFloat(lng)
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      checkNearby(parsedLat, parsedLng)
    }
  }

  const handleReport = async () => {
    if (!reportLat || !reportLng) return
    setSubmitting(true)
    setDuplicate(null)
    try {
      const res  = await fetch(`${API_URL}/sightings/report`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          species_name: speciesName,
          common_name:  commonName || '',
          lat:          parseFloat(reportLat),
          lng:          parseFloat(reportLng),
          location:     reportLocation || 'User Reported',
          notes:        reportNotes,
          reported_by:  'Anonymous',
        }),
      })
      const data = await res.json()
      if (data.duplicate) { setDuplicate(data.existing); return }

      setSubmitted(true)
      setReportMode(false)
      setNearbyWarning(null)

      const r2 = await fetch(`${API_URL}/sightings/${encodeURIComponent(speciesName)}`)
      setSightings(await r2.json())
    } catch (err) {
      console.error('Report failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const allSightings = sightings
    ? [...(sightings.hardcoded||[]), ...(sightings.user_reported||[])]
    : []

  const nativeSightings = sightings?.native_habitats || []

  const severityOrder: Record<string,number> = { critical:0, high:1, moderate:2, reported:3, user_reported:4 }
  const top5 = [...allSightings]
    .sort((a,b) => (severityOrder[a.severity]??5) - (severityOrder[b.severity]??5))
    .slice(0,5)

  return (
    <div className="fixed inset-0 z-50 flex"
      style={{ background:'#020c1b', fontFamily:"'JetBrains Mono',monospace", height:'100vh', width:'100vw', overflow:'hidden' }}>

      {/* ── GLOBE ── */}
      <div className="relative" style={{ flex: 1, height: '100vh', minHeight: '100vh', overflow: 'hidden' }}>
        <div ref={globeRef} style={{ width:'100%', height:'100%vh' }} />

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background:'rgba(2,12,27,0.85)' }}>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full border-t-2 border-cyan-400 animate-spin" />
              <p className="text-xs tracking-widest uppercase" style={{ color:'rgba(6,182,212,0.5)' }}>
                Loading global data...
              </p>
            </div>
          </div>
        )}

        {/* Back */}
        <button onClick={onClose}
          className="absolute top-4 left-4 z-20 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase transition-all"
          style={{ background:'rgba(2,12,27,0.9)', border:'1px solid rgba(103,232,249,0.35)', color:'#67e8f9' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(6,182,212,0.15)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(2,12,27,0.9)' }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        {/* Layer toggle — top centre */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <div className="px-4 py-2 rounded-xl text-center"
            style={{ background:'rgba(2,12,27,0.85)', border:`1px solid ${sightings?.is_invasive ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
            <p className="text-xs tracking-widest uppercase mb-0.5"
              style={{ color: sightings?.is_invasive ? 'rgba(239,68,68,0.6)' : 'rgba(34,197,94,0.6)' }}>
              {sightings?.is_invasive ? '⚠ Invasive Species' : '🟢 Native Species'}
            </p>
            <p className="text-sm font-bold text-white">{commonName || speciesName}</p>
          </div>

          {/* Layer toggle buttons */}
          {sightings && (sightings.is_invasive || nativeSightings.length > 0) && (
            <div className="flex gap-1 rounded-xl overflow-hidden"
              style={{ border:'1px solid rgba(6,182,212,0.15)', background:'rgba(2,12,27,0.85)' }}>
              {[
                { key:'all',      label:'All',      color:'#67e8f9' },
                { key:'invasive', label:'⚠ Invasive', color:'#ef4444' },
                { key:'native',   label:'🟢 Habitat',  color:'#22c55e' },
              ].map(({ key, label, color }) => (
                <button key={key}
                  onClick={() => setActiveLayer(key as any)}
                  className="px-3 py-1.5 text-xs transition-all"
                  style={{
                    color:      activeLayer === key ? color : 'rgba(255,255,255,0.3)',
                    background: activeLayer === key ? `${color}15` : 'transparent',
                    fontFamily: "'JetBrains Mono',monospace",
                  }}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10">
          <div className="px-4 py-3 rounded-xl space-y-2"
            style={{ background:'rgba(2,12,27,0.85)', border:'1px solid rgba(6,182,212,0.15)' }}>
            <p className="text-xs tracking-widest uppercase mb-2" style={{ color:'rgba(6,182,212,0.4)' }}>Legend</p>
            {[
              { color:'#22c55e', label:'Native habitat (thriving)' },
              { color:'#ef4444', label:'Critical invasion zone'    },
              { color:'#f97316', label:'High risk area'            },
              { color:'#eab308', label:'Moderate spread'           },
              { color:'#a78bfa', label:'User reported'             },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background:color }} />
                <span className="text-xs" style={{ color:'rgba(255,255,255,0.5)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected popup */}
        {selected && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-80">
            <div className="px-5 py-4 rounded-2xl"
              style={{ background:'rgba(2,12,27,0.97)', border:`1px solid ${SEVERITY_COLOR[selected.severity]||'#67e8f9'}` }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs tracking-widest uppercase mb-1"
                    style={{ color: SEVERITY_COLOR[selected.severity]||'#67e8f9', fontSize:'9px' }}>
                    {selected.type === 'native_habitat' ? '🟢 Native Habitat'
                      : selected.type === 'user_reported' ? '👤 User Reported'
                      : '⚠ Invasive Sighting'}
                  </p>
                  <p className="text-sm font-bold text-white">{selected.location}</p>
                </div>
                <button onClick={() => setSelected(null)} style={{ color:'rgba(255,255,255,0.3)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Native habitat info */}
              {selected.type === 'native_habitat' && (
                <div className="rounded-lg p-3 mb-2"
                  style={{ background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.15)' }}>
                  <p className="text-xs mb-1 font-bold" style={{ color:'#4ade80' }}>Natural Range</p>
                  <p className="text-xs" style={{ color:'rgba(255,255,255,0.55)' }}>
                    {selected.note || 'This is part of the species native habitat range'}
                  </p>
                </div>
              )}

              {/* Research team */}
              {selected.research_team && selected.research_team !== 'Community Report' && selected.type !== 'native_habitat' && (
                <div className="rounded-lg p-3 mb-2"
                  style={{ background:'rgba(6,182,212,0.06)', border:'1px solid rgba(6,182,212,0.15)' }}>
                  <p className="text-xs tracking-widest uppercase mb-1.5" style={{ color:'rgba(6,182,212,0.5)' }}>
                    Research Team
                  </p>
                  <p className="text-xs font-bold text-white mb-1">{selected.research_team}</p>
                  {selected.team_action && (
                    <p className="text-xs mb-1.5" style={{ color:'rgba(255,255,255,0.5)' }}>{selected.team_action}</p>
                  )}
                  {selected.team_contact && (
                    <p className="text-xs" style={{ color:'rgba(103,232,249,0.6)' }}>📧 {selected.team_contact}</p>
                  )}
                  {selected.team_url && (
                    <a href={selected.team_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs mt-1.5 inline-flex items-center gap-1 transition-all"
                      style={{ color:'rgba(103,232,249,0.4)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='#67e8f9' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='rgba(103,232,249,0.4)' }}>
                      <ExternalLink className="w-3 h-3" /> Visit organization
                    </a>
                  )}
                </div>
              )}

              {/* User report */}
              {selected.type === 'user_reported' && (
                <div className="rounded-lg p-3"
                  style={{ background:'rgba(167,139,250,0.06)', border:'1px solid rgba(167,139,250,0.15)' }}>
                  {selected.notes && (
                    <p className="text-xs mb-1" style={{ color:'rgba(255,255,255,0.5)' }}>📝 {selected.notes}</p>
                  )}
                  <p className="text-xs" style={{ color:'rgba(167,139,250,0.6)' }}>
                    👤 {selected.reported_by || 'Anonymous'}
                  </p>
                  {selected.timestamp && (
                    <p className="text-xs mt-0.5" style={{ color:'rgba(255,255,255,0.2)' }}>
                      🕐 {new Date(selected.timestamp).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{
        width:'320px', minWidth:'320px', height:'100vh',
        display:'flex', flexDirection:'column', overflow:'hidden',
        background:'rgba(2,12,27,0.98)', borderLeft:'1px solid rgba(6,182,212,0.15)',
      }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom:'1px solid rgba(6,182,212,0.1)', flexShrink:0 }}>
          <div>
            <p className="text-xs tracking-widest uppercase" style={{ color:'rgba(6,182,212,0.4)' }}>
              Species Globe
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {sightings?.is_invasive ? 'Invasive Tracker' : 'Global Range Map'}
            </p>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-lg transition-all"
            style={{ color:'rgba(255,255,255,0.3)', border:'1px solid rgba(255,255,255,0.08)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='#f87171'; (e.currentTarget as HTMLElement).style.borderColor='rgba(239,68,68,0.3)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.08)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 px-5 py-4"
          style={{ borderBottom:'1px solid rgba(6,182,212,0.1)', flexShrink:0 }}>
          {[
            { label:'Known',   value:(sightings?.hardcoded||[]).length,       color:'#ef4444' },
            { label:'Reported',value:(sightings?.user_reported||[]).length,    color:'#a78bfa' },
            { label:'Habitat', value:(sightings?.native_habitats||[]).length,  color:'#22c55e' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl px-2 py-3 text-center"
              style={{ background:`${color}10`, border:`1px solid ${color}25` }}>
              <p className="text-xl font-black" style={{ color, fontFamily:"'Orbitron',monospace" }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color:'rgba(255,255,255,0.3)', fontSize:'9px' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Scrollable */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>

          {/* Invasive top 5 */}
          {top5.length > 0 && (
            <>
              <p className="text-xs tracking-widest uppercase mb-3" style={{ color:'rgba(239,68,68,0.5)' }}>
                Top {top5.length} Invasive Sightings
              </p>
              <div className="space-y-2 mb-4">
                {top5.map((s, i) => (
                  <div key={i}
                    className="rounded-xl px-3 py-3 cursor-pointer transition-all"
                    style={{ background:'rgba(239,68,68,0.03)', border:'1px solid rgba(239,68,68,0.08)' }}
                    onClick={() => {
                      setSelected(s)
                      globeInstanceRef.current?.pointOfView({ lat:s.lat, lng:s.lng, altitude:1.5 }, 1000)
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(239,68,68,0.25)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(239,68,68,0.08)' }}>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                        style={{ background:`${SEVERITY_COLOR[s.severity]||'#67e8f9'}20`, color:SEVERITY_COLOR[s.severity]||'#67e8f9', fontFamily:"'Orbitron',monospace" }}>
                        {i+1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{s.location}</p>
                        <p className="text-xs mt-0.5 capitalize" style={{ color:SEVERITY_COLOR[s.severity]||'#67e8f9' }}>
                          {s.type==='user_reported' ? 'User Reported' : s.severity}
                        </p>
                        {s.research_team && s.research_team !== 'Community Report' && (
                          <p className="text-xs mt-0.5 truncate" style={{ color:'rgba(103,232,249,0.4)', fontSize:'9px' }}>
                            🔬 {s.research_team}
                          </p>
                        )}
                      </div>
                      {s.type==='user_reported'
                        ? <User className="w-3 h-3 shrink-0 mt-1" style={{ color:'#a78bfa' }} />
                        : <AlertTriangle className="w-3 h-3 shrink-0 mt-1" style={{ color:SEVERITY_COLOR[s.severity] }} />
                      }
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Native habitat list */}
          {nativeSightings.length > 0 && (
            <>
              <p className="text-xs tracking-widest uppercase mb-3" style={{ color:'rgba(34,197,94,0.5)' }}>
                Native Habitat Zones
              </p>
              <div className="space-y-2 mb-4">
                {nativeSightings.map((s, i) => (
                  <div key={i}
                    className="rounded-xl px-3 py-3 cursor-pointer transition-all"
                    style={{ background:'rgba(34,197,94,0.03)', border:'1px solid rgba(34,197,94,0.1)' }}
                    onClick={() => {
                      setSelected(s)
                      globeInstanceRef.current?.pointOfView({ lat:s.lat, lng:s.lng, altitude:1.5 }, 1000)
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(34,197,94,0.3)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(34,197,94,0.1)' }}>
                    <div className="flex items-start gap-2">
                      <Leaf className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color:'#4ade80' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{s.location}</p>
                        <p className="text-xs mt-0.5" style={{ color:'rgba(34,197,94,0.6)' }}>
                          {s.note || 'Natural habitat'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Conservation tips */}
          {!sightings?.is_invasive && (sightings?.conservation_tips||[]).length > 0 && (
            <>
              <p className="text-xs tracking-widest uppercase mb-3" style={{ color:'rgba(34,197,94,0.5)' }}>
                How You Can Help
              </p>
              <div className="space-y-2">
                {sightings!.conservation_tips.map((tip, i) => (
                  <div key={i} className="rounded-xl px-3 py-3"
                    style={{ background:'rgba(34,197,94,0.03)', border:'1px solid rgba(34,197,94,0.1)' }}>
                    <p className="text-xs leading-relaxed" style={{ color:'rgba(255,255,255,0.55)' }}>
                      <span style={{ color:'rgba(34,197,94,0.6)' }}>▸ </span>{tip}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {top5.length === 0 && nativeSightings.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-xs" style={{ color:'rgba(255,255,255,0.2)' }}>No data for this species yet</p>
              <p className="text-xs mt-1" style={{ color:'rgba(6,182,212,0.3)' }}>Report a sighting below!</p>
            </div>
          )}
        </div>

        {/* Report section */}
        <div style={{ padding:'16px 20px', borderTop:'1px solid rgba(6,182,212,0.1)', flexShrink:0 }}>

          {submitted && (
            <div className="mb-3 px-3 py-2 rounded-lg text-xs text-center"
              style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', color:'#4ade80' }}>
              ✅ Sighting reported successfully!
            </div>
          )}

          {duplicate && (
            <div className="mb-3 px-3 py-3 rounded-lg text-xs"
              style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)' }}>
              <p className="font-bold mb-1" style={{ color:'#fbbf24' }}>⚠ Already recorded nearby!</p>
              <p style={{ color:'rgba(255,255,255,0.5)' }}>
                {duplicate.location} is already in database ({duplicate.distance_km}km away).
              </p>
              <button onClick={() => setDuplicate(null)} className="mt-2 text-xs underline"
                style={{ color:'rgba(245,158,11,0.6)' }}>
                Submit anyway
              </button>
            </div>
          )}

          {!reportMode ? (
            <button onClick={() => setReportMode(true)}
              className="w-full py-3 rounded-xl text-xs tracking-widest uppercase font-bold transition-all flex items-center justify-center gap-2"
              style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(239,68,68,0.15)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(239,68,68,0.08)' }}>
              <MapPin className="w-3.5 h-3.5" />
              Report Invasive Sighting
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs tracking-widest uppercase mb-2" style={{ color:'rgba(239,68,68,0.6)' }}>
                Report Sighting
              </p>

              {/* Location search */}
              <div className="flex gap-1">
                <input value={locationSearch}
                  onChange={e => setLocationSearch(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && handleGeocode()}
                  placeholder="Search location (e.g. Miami)"
                  className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background:'rgba(6,182,212,0.05)', border:'1px solid rgba(6,182,212,0.2)', color:'rgba(255,255,255,0.7)', fontFamily:"'JetBrains Mono',monospace" }}
                />
                <button onClick={handleGeocode} disabled={geocoding}
                  className="px-3 py-2 rounded-lg text-xs font-bold"
                  style={{ background:'rgba(6,182,212,0.1)', border:'1px solid rgba(6,182,212,0.25)', color:'#67e8f9' }}>
                  {geocoding ? '...' : 'Find'}
                </button>
              </div>

              <p className="text-xs text-center" style={{ color:'rgba(255,255,255,0.2)' }}>— or enter manually —</p>

              {nearbyWarning && (
                <div className="px-3 py-2 rounded-lg text-xs"
                  style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)' }}>
                  <p style={{ color:'#fbbf24' }}>
                    ⚠ Existing sighting {nearbyWarning.distance_km}km away at {nearbyWarning.location}
                  </p>
                </div>
              )}

              {[
                { placeholder:'Latitude (e.g. 25.7617)',         value:reportLat,      setter:(v:string)=>{ setReportLat(v); handleLatLngChange(v, reportLng) } },
                { placeholder:'Longitude (e.g. -80.1918)',       value:reportLng,      setter:(v:string)=>{ setReportLng(v); handleLatLngChange(reportLat, v) } },
                { placeholder:'Location name (e.g. Miami, FL)',  value:reportLocation, setter:(v:string)=>setReportLocation(v) },
                { placeholder:'Notes (optional)',                value:reportNotes,    setter:(v:string)=>setReportNotes(v) },
              ].map(({ placeholder, value, setter }) => (
                <input key={placeholder} value={value}
                  onChange={e => setter(e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(6,182,212,0.15)', color:'rgba(255,255,255,0.7)', fontFamily:"'JetBrains Mono',monospace" }}
                />
              ))}

              <div className="flex gap-2 mt-2">
                <button onClick={() => { setReportMode(false); setNearbyWarning(null); setDuplicate(null) }}
                  className="flex-1 py-2 rounded-lg text-xs"
                  style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.3)' }}>
                  Cancel
                </button>
                <button onClick={handleReport} disabled={submitting||!reportLat||!reportLng}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{ background:submitting?'rgba(239,68,68,0.05)':'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171', cursor:submitting||!reportLat||!reportLng?'not-allowed':'pointer' }}>
                  {submitting ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}