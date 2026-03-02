'use client'

import { useState, useMemo, Fragment } from 'react'
import { companiesData, Company } from '../lib/companiesData'
import JotFormModal from './JotFormModal'

interface MarketMapProps {
  // We'll use the companies data directly instead of grouped data
}

type ViewMode = 'grid' | 'grouped'
type SortOption = 'name' | 'sector'

export default function MarketMap({}: MarketMapProps) {
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  const [showAccessPrompt, setShowAccessPrompt] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  // Get all unique sectors from static data
  const sectors = useMemo(() => {
    const sectorSet = new Set(companiesData.map(c => c.sector))
    return Array.from(sectorSet).sort()
  }, [])
  
  const allTags: string[] = []
  
  // Filter and sort companies
  const filteredCompanies = useMemo(() => {
    let filtered = companiesData.filter(company => {
      const matchesSector = selectedSector === null || company.sector === selectedSector
      const matchesSearch = searchQuery === '' || 
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.subsector.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTags = selectedTags.length === 0
      
      return matchesSector && matchesSearch && matchesTags
    })
    
    // Sort companies
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      } else if (sortBy === 'sector') {
        return a.sector.localeCompare(b.sector) || a.subsector.localeCompare(b.subsector)
      }
      return 0
    })
    
    return filtered
  }, [selectedSector, searchQuery, selectedTags, sortBy])
  
  // Group companies by sector for grouped view
  const groupedCompanies = useMemo(() => {
    const groups: { [key: string]: Company[] } = {}
    filteredCompanies.forEach(company => {
      if (!groups[company.sector]) {
        groups[company.sector] = []
      }
      groups[company.sector].push(company)
    })
    return groups
  }, [filteredCompanies])
  
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }
  
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
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Get Full Access
              </a>
              <button
                onClick={() => setShowSubmitForm(true)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Submit a Company
              </button>
            </div>
          </div>
          
          {/* Subtitle */}
          <div className="text-center lg:text-left">
            <p className="text-lg text-gray-600 max-w-3xl lg:max-w-none lg:mx-0 mx-auto">
              A curated, research-driven map of Ethereum's infrastructure, protocols, and applications.
            </p>
          </div>
        </div>
        
        {/* Search and Controls */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search companies, descriptions, or subsectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-5 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
            <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* View Mode and Sort Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('grouped')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    viewMode === 'grouped' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Grouped
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="name">Name</option>
                <option value="sector">Sector</option>
              </select>
            </div>
            
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{filteredCompanies.length}</span> companies
            </div>
          </div>
        </div>

        {/* Sector Filter Tabs */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter by Sector:</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSector(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedSector === null
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Sectors
            </button>
            {sectors.map((sector) => {
              const colorScheme = getSectorColor(sector)
              const count = companiesData.filter(c => c.sector === sector).length
              return (
                <button
                  key={sector}
                  onClick={() => setSelectedSector(selectedSector === sector ? null : sector)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedSector === sector
                      ? `${colorScheme.bg} ${colorScheme.text} shadow-md`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sector} <span className="ml-1 text-xs opacity-75">({count})</span>
                </button>
              )
            })}
          </div>
        </div>
        
        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter by Tags:</h3>
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 15).map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-200"
                >
                  Clear Tags
                </button>
              )}
            </div>
          </div>
        )}

        {/* Companies Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
            {filteredCompanies.map((company, index) => {
              const colorScheme = getSectorColor(company.sector)
              return (
                <Fragment key={`${company.name}-${index}`}>
                  {/* CTA Banner injected after first 12 companies (≈2 rows) */}
                  {index === 12 && (
                    <div
                      className="col-span-full my-2"
                    >
                      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 md:px-10 md:py-10 shadow-xl">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
                        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                          <div className="max-w-2xl">
                            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-2">Full Intelligence Platform</p>
                            <h3 className="text-xl md:text-2xl font-bold text-white mb-2 leading-snug">
                              Detailed profiles, funding data, sector analysis &amp; system design context
                            </h3>
                            <p className="text-blue-100 text-sm md:text-base">
                              Built for practitioners and researchers navigating Ethereum infrastructure.
                            </p>
                          </div>
                          <a
                            href="https://research.canhav.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 inline-flex items-center gap-2 px-7 py-3.5 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-md hover:shadow-lg text-sm md:text-base"
                          >
                            Get Full Access
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  <div
                    className="group cursor-pointer"
                    onClick={() => setShowAccessPrompt(true)}
                  >
                    <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 hover:shadow-md transition-all duration-200 hover:border-blue-300 flex items-center gap-2.5 h-full">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colorScheme.dot}`} />
                      <span className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors truncate leading-tight">
                        {company.name}
                      </span>
                    </div>
                  </div>
                </Fragment>
              )
            })}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedCompanies).map(([sector, companies]) => {
              const colorScheme = getSectorColor(sector)
              return (
                <div key={sector} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center mb-4">
                    <div className={`w-1 h-8 ${colorScheme.bg} rounded-full mr-3`}></div>
                    <h2 className="text-xl font-bold text-gray-900">{sector}</h2>
                    <span className="ml-3 text-sm text-gray-500">({companies.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {companies.map((company, index) => (
                      <div
                        key={`${company.name}-${index}`}
                        onClick={() => setShowAccessPrompt(true)}
                        className="cursor-pointer bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg p-3 transition-all duration-200 hover:shadow-md"
                      >
                        <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                          {company.name}
                        </h3>
                        <p className="text-xs text-gray-600 line-clamp-1">
                          {company.subsector}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {/* Empty State */}
        {filteredCompanies.length === 0 && (
          <div className="text-center py-16">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No companies found</h3>
            <p className="mt-2 text-sm text-gray-500">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedSector(null)
                setSelectedTags([])
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}

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
        <JotFormModal
          isOpen={showSubmitForm}
          onClose={() => setShowSubmitForm(false)}
          formId="253433298491060"
          title="Submit a Company"
        />
      )}
      
      {/* Full Access Prompt Modal */}
      {showAccessPrompt && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowAccessPrompt(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
              <button
                onClick={() => setShowAccessPrompt(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Get Full Company Data</h3>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                Detailed profiles, funding data, sector analysis, and system design context — built for practitioners and researchers.
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="https://research.canhav.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg inline-flex items-center justify-center gap-2"
                >
                  Access CanHav Research
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
                <button
                  onClick={() => setShowAccessPrompt(false)}
                  className="w-full px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
