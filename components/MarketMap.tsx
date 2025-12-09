'use client'

import { useState } from 'react'
import { GroupedMarketMap, MarketMapItem } from '../lib/ethereumMap'
import SubmitCompanyForm from './SubmitCompanyForm'

interface MarketMapProps {
  groupedData: GroupedMarketMap
  sectors: string[]
}

export default function MarketMap({ groupedData, sectors }: MarketMapProps) {
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [hoveredSubsector, setHoveredSubsector] = useState<string | null>(null)

  const sectorColors = [
    'from-blue-600 to-blue-700',
    'from-purple-600 to-purple-700', 
    'from-green-600 to-green-700',
    'from-orange-600 to-orange-700',
    'from-red-600 to-red-700',
    'from-indigo-600 to-indigo-700',
    'from-pink-600 to-pink-700',
    'from-teal-600 to-teal-700'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-blue-900">
      {/* Header */}
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-6">
            Ethereum Market Map
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Explore the comprehensive ecosystem of Ethereum infrastructure, protocols, and applications
          </p>
          <button
            onClick={() => setShowSubmitForm(true)}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-lg font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
          >
            Submit a Company
          </button>
        </div>

        {/* Market Map Grid */}
        <div className="grid gap-8">
          {sectors.map((sector, sectorIndex) => (
            <div key={sector} className="glass rounded-2xl p-8">
              <h2 className={`text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r ${sectorColors[sectorIndex % sectorColors.length]} bg-clip-text text-transparent`}>
                {sector}
              </h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {groupedData[sector]?.map((item: MarketMapItem, index: number) => (
                  <div
                    key={`${sector}-${index}`}
                    className="relative group"
                    onMouseEnter={() => setHoveredSubsector(`${sector}-${index}`)}
                    onMouseLeave={() => setHoveredSubsector(null)}
                  >
                    <div className="bg-gray-800/50 hover:bg-gray-700/50 rounded-xl p-6 transition-all duration-300 border border-gray-700/50 hover:border-blue-400/50 h-full flex flex-col">
                      {/* Logo placeholder */}
                      <div className="w-12 h-12 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg mb-4 flex items-center justify-center">
                        <div className="w-6 h-6 bg-gray-400 rounded opacity-50"></div>
                      </div>
                      
                      {/* Subsector name */}
                      <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-blue-400 transition-colors">
                        {item.subsector}
                      </h3>
                      
                      {/* Examples */}
                      <p className="text-sm text-gray-400 mb-4 flex-grow">
                        {item.examples}
                      </p>
                      
                      {/* Tooltip for definition */}
                      {hoveredSubsector === `${sector}-${index}` && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 z-10">
                          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl">
                            <p className="text-sm text-gray-300">
                              {item.definition}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-16 text-center">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass rounded-xl p-8">
              <div className="text-4xl font-bold gradient-text mb-2">
                {sectors.length}
              </div>
              <div className="text-gray-400">
                Major Sectors
              </div>
            </div>
            <div className="glass rounded-xl p-8">
              <div className="text-4xl font-bold gradient-text mb-2">
                {Object.values(groupedData).flat().length}
              </div>
              <div className="text-gray-400">
                Subsectors
              </div>
            </div>
            <div className="glass rounded-xl p-8">
              <div className="text-4xl font-bold gradient-text mb-2">
                1000+
              </div>
              <div className="text-gray-400">
                Companies
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Company Modal */}
      {showSubmitForm && (
        <SubmitCompanyForm
          sectors={sectors}
          onClose={() => setShowSubmitForm(false)}
        />
      )}
    </div>
  )
}
