'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamic import — globe.gl needs browser, not SSR
const SpeciesGlobe = dynamic(() => import('@/components/SpeciesGlobe'), { ssr: false })

export default function GlobePage() {
  const router = useRouter()
  const [speciesName, setSpeciesName] = useState('')
  const [commonName, setCommonName]   = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('aquaai_result')
    if (!stored) { router.push('/'); return }
    try {
      const result = JSON.parse(stored)
      setSpeciesName(result.species.species_name || '')
      setCommonName(result.species.common_names?.[0] || '')
    } catch {
      router.push('/')
    }
  }, [router])

  if (!speciesName) return null

  return (
    <SpeciesGlobe
      speciesName={speciesName}
      commonName={commonName}
      onClose={() => router.push('/results')}
    />
  )
}