'use client'

import { AlertCircle } from 'lucide-react'

interface SpeciesInfo {
  natural_habitat?: string
  ecosystem_role?: string
  rarity_level?: string
  reef_dependency?: string
  coral_health_status?: string
  danger_level?: string
  possible_bleaching_causes?: string[]
  recommended_actions?: string[]
  interesting_facts?: string[]
}

interface ResultCardProps {
  imageUrl?: string
  speciesName?: string
  confidence?: number
  speciesDescription?: string
  species?: SpeciesInfo | null
  analysisType?: 'fish' | 'coral'
}

export default function ResultCard({
  imageUrl = '',
  speciesName = 'Unknown Species',
  confidence = 0,
  speciesDescription = '',
  species,
  analysisType = 'fish',
}: ResultCardProps) {

  const safeSpecies: SpeciesInfo = species ?? {}

  const confidencePercent = Math.min(
    Math.max(confidence * 100, 0),
    100
  ).toFixed(1)

  return (
    <div className="space-y-6">

      {/* Main Card */}
      <div className="bg-slate-900/95 rounded-xl p-6 border border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Image */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-full aspect-square rounded-lg overflow-hidden shadow-lg bg-slate-800">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={speciesName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.removeAttribute('style')
                  }}
                />
              ) : null}
              <div
                className="flex items-center justify-center h-full text-white/40 text-sm"
                style={{ display: imageUrl ? 'none' : 'flex' }}
              >
                🐟 Image unavailable
              </div>
            </div>

            {/* Confidence */}
            <div className="w-full text-center">
              <p className="text-white/60 text-sm mb-2">Confidence Level</p>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-500"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
              <p className="text-white font-bold mt-2">{confidencePercent}%</p>
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center space-y-6">

            <div>
              <h2 className="text-3xl font-bold text-white mb-2">{speciesName}</h2>
              <p className="text-blue-300 text-sm italic mb-4">
                {analysisType === 'coral' ? 'Coral Health Analysis' : 'Marine Fish Analysis'}
              </p>
              <p className="text-white/80 leading-relaxed">{speciesDescription}</p>
            </div>

            {/* Fish Stats */}
            {analysisType === 'fish' && (
              <div className="grid grid-cols-2 gap-3">

                <div className="bg-slate-800/80 rounded-lg p-3 text-center">
                  <p className="text-2xl mb-1">🌍</p>
                  <p className="text-white/60 text-xs">Habitat</p>
                  <p className="text-white font-semibold text-sm">
                    {safeSpecies.natural_habitat || '-'}
                  </p>
                </div>

                <div className="bg-slate-800/80 rounded-lg p-3 text-center">
                  <p className="text-2xl mb-1">⚙️</p>
                  <p className="text-white/60 text-xs">Ecosystem Role</p>
                  <p className="text-white font-semibold text-sm">
                    {safeSpecies.ecosystem_role || '-'}
                  </p>
                </div>

                <div className="bg-slate-800/80 rounded-lg p-3 text-center">
                  <p className="text-2xl mb-1">📈</p>
                  <p className="text-white/60 text-xs">Rarity</p>
                  <p className="text-white font-semibold text-sm">
                    {safeSpecies.rarity_level || '-'}
                  </p>
                </div>

                <div className="bg-slate-800/80 rounded-lg p-3 text-center">
                  <p className="text-2xl mb-1">🪸</p>
                  <p className="text-white/60 text-xs">Reef Dependency</p>
                  <p className="text-white font-semibold text-sm">
                    {safeSpecies.reef_dependency || '-'}
                  </p>
                </div>

              </div>
            )}

            {/* Coral Health */}
            {analysisType === 'coral' && (
              <div className="space-y-3">
                <div className="bg-red-500/20 border border-red-400 rounded-lg p-4 text-white">
                  <p className="font-bold text-lg">⚠ Coral Health Status</p>
                  <p>{safeSpecies.coral_health_status || 'Unknown'}</p>
                </div>
                <div className="bg-orange-500/20 border border-orange-400 rounded-lg p-4 text-white">
                  <p className="font-bold">Danger Level</p>
                  <p>{safeSpecies.danger_level || 'Unknown'}</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Coral Bleaching Causes */}
      {analysisType === 'coral' &&
        (safeSpecies.possible_bleaching_causes ?? []).length > 0 && (
          <div className="bg-slate-900/95 rounded-xl p-6 border border-white/10">
            <h3 className="font-bold text-white text-lg mb-4">Possible Bleaching Causes</h3>
            {(safeSpecies.possible_bleaching_causes ?? []).map((cause: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-white/80 text-sm mb-2">
                <AlertCircle className="w-4 h-4 text-orange-400" />
                {cause}
              </div>
            ))}
          </div>
        )}

      {/* Coral Recovery Actions */}
      {analysisType === 'coral' &&
        (safeSpecies.recommended_actions ?? []).length > 0 && (
          <div className="bg-slate-900/95 rounded-xl p-6 border border-white/10">
            <h3 className="font-bold text-white text-lg mb-4">Recommended Actions</h3>
            <ul className="space-y-2">
              {(safeSpecies.recommended_actions ?? []).map((action: string, i: number) => (
                <li key={i} className="text-white/80 text-sm">• {action}</li>
              ))}
            </ul>
          </div>
        )}

      {/* Interesting Facts */}
      {(safeSpecies.interesting_facts ?? []).length > 0 && (
        <div className="bg-slate-900/95 rounded-xl p-6 border border-white/10">
          <h3 className="font-bold text-white text-lg mb-4">Interesting Facts</h3>
          <ul className="space-y-2">
            {(safeSpecies.interesting_facts ?? []).map((fact: string, i: number) => (
              <li key={i} className="text-white/80 text-sm">• {fact}</li>
            ))}
          </ul>
        </div>
      )}

    </div>
  )
}