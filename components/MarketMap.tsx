'use client'

import { useState } from 'react'
import { companiesData, getAllSectors, getCompaniesBySector, Company } from '../lib/companiesData'
import SubmitCompanyForm from './SubmitCompanyForm'

interface MarketMapProps {
  // We'll use the companies data directly instead of grouped data
}

export default function MarketMap({}: MarketMapProps) {
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  
  const sectors = getAllSectors()
  
  const sectorColors = [
    { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
    { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500' },
    { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', dot: 'bg-green-500' },
    { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500' },
    { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', dot: 'bg-red-500' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
    { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', dot: 'bg-pink-500' },
    { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-500' }
  ]

  const getSectorColor = (sector: string) => {
    const index = sectors.indexOf(sector)
    return sectorColors[index % sectorColors.length]
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          {/* Title and Buttons Row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
            <div className="text-center lg:text-left mb-4 lg:mb-0">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                The Ethereum Infrastructure Atlas
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-end items-center">
              <a
                href="https://research.canhav.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-all duration-300"
              >
                Get Full Access
              </a>
              <button
                onClick={() => setShowSubmitForm(true)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-all duration-300"
              >
                Submit a Company
              </button>
            </div>
          </div>
          
          {/* Subtitle */}
          <div className="text-center">
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              A curated, research-driven map of Ethereum's infrastructure, protocols, and applications.
            </p>
          </div>
        </div>

        {/* Sector Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => setSelectedSector(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedSector === null
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {sectors.map((sector) => {
            const colorScheme = getSectorColor(sector)
            return (
              <button
                key={sector}
                onClick={() => setSelectedSector(selectedSector === sector ? null : sector)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedSector === sector
                    ? `${colorScheme.bg} ${colorScheme.text}`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {sector}
              </button>
            )
          })}
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
          {companiesData
            .filter(company => selectedSector === null || company.sector === selectedSector)
            .map((company, index) => {
              const colorScheme = getSectorColor(company.sector)
              return (
                <div
                  key={`${company.name}-${index}`}
                  className="group relative"
                >
                  <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-300 hover:border-gray-300 h-full flex flex-col items-center text-center">
                    {/* Company Logo Placeholder */}
                    <div className="w-12 h-12 bg-gray-100 rounded-lg mb-3 flex items-center justify-center flex-shrink-0">
                      <div className="w-6 h-6 bg-gray-300 rounded"></div>
                    </div>
                    
                    {/* Company Name */}
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {company.name}
                    </h3>
                    
                    {/* Sector Indicator */}
                    <div className="flex items-center justify-center mt-auto">
                      <div className={`w-2 h-2 rounded-full ${colorScheme.dot} mr-2`}></div>
                      <span className="text-xs text-gray-500 truncate">
                        {company.subsector}
                      </span>
                    </div>
                    
                    {/* Website Link */}
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 z-10"
                        aria-label={`Visit ${company.name} website`}
                      />
                    )}
                  </div>
                  
                  {/* Hover Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                    <div className="font-semibold">{company.name}</div>
                    <div className="text-gray-300">{company.sector}</div>
                    <div className="text-gray-400">{company.subsector}</div>
                  </div>
                </div>
              )
            })}
        </div>

        {/* Stats Section */}
        <div className="mt-16 text-center">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {sectors.length}
              </div>
              <div className="text-gray-600 text-sm">
                Major Sectors
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {new Set(companiesData.map(c => c.subsector)).size}
              </div>
              <div className="text-gray-600 text-sm">
                Subsectors
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {companiesData.length}+
              </div>
              <div className="text-gray-600 text-sm">
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
