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
    { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
    { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
    { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Ethereum Market Map
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Explore the comprehensive ecosystem of Ethereum infrastructure, protocols, and applications
          </p>
          <button
            onClick={() => setShowSubmitForm(true)}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Submit a Company
          </button>
        </div>

        {/* Market Map Grid */}
        <div className="grid gap-8">
          {sectors.map((sector, sectorIndex) => {
            const colorScheme = sectorColors[sectorIndex % sectorColors.length]
            return (
            <div key={sector} className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
              <div className="flex items-center mb-6">
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${colorScheme.bg} ${colorScheme.text} ${colorScheme.border} border mr-4`}>
                  {sector}
                </span>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupedData[sector]?.map((item: MarketMapItem, index: number) => (
                  <div
                    key={`${sector}-${index}`}
                    className="relative group"
                    onMouseEnter={() => setHoveredSubsector(`${sector}-${index}`)}
                    onMouseLeave={() => setHoveredSubsector(null)}
                  >
                    <div className="bg-white hover:bg-gray-50 rounded-xl p-4 transition-all duration-300 border border-gray-200 hover:border-gray-300 hover:shadow-md h-full flex flex-col">
                      {/* Logo placeholder */}
                      <div className="w-12 h-12 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                        <div className="w-6 h-6 bg-gray-300 rounded"></div>
                      </div>
                      
                      {/* Subsector name */}
                      <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {item.subsector}
                      </h3>
                      
                      {/* Examples */}
                      <p className="text-sm text-gray-600 mb-3 flex-grow leading-relaxed">
                        {item.examples}
                      </p>
                      
                      {/* Tooltip for definition */}
                      {hoveredSubsector === `${sector}-${index}` && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 z-10">
                          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl max-w-sm">
                            <p className="text-sm text-gray-100">
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
            )
          })}
        </div>

        {/* Stats Section */}
        <div className="mt-16 text-center">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {sectors.length}
              </div>
              <div className="text-gray-600">
                Major Sectors
              </div>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {Object.values(groupedData).flat().length}
              </div>
              <div className="text-gray-600">
                Subsectors
              </div>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                1000+
              </div>
              <div className="text-gray-600">
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
