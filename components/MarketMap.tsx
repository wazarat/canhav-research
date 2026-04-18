'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { companiesData as staticCompanies } from '../lib/companiesData'
import { useRealtimeTables } from '../lib/useRealtimeTables'
import JotFormModal from './JotFormModal'

interface Company {
  entity_id?: number
  name: string
  // Primary (headline) sector/subsector for card color + sort
  sector: string
  subsector: string
  // Full tag arrays from v_market_map_grid. Multi-sector entities have > 1.
  // Optional to keep backwards compatibility with the static fallback dataset.
  sectors?: string[]
  subsectors?: string[]
  description?: string
  website?: string
}

interface MarketMapProps {}

type ViewMode = 'grid' | 'grouped'
type SortOption = 'name' | 'sector'

export default function MarketMap({}: MarketMapProps) {
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [companiesData, setCompaniesData] = useState<Company[]>(staticCompanies)
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'supabase' | 'static'>('static')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  // Hoisted so the initial mount AND the Realtime subscription can share it.
  // `cache: 'no-store'` bypasses the browser's HTTP cache so we always see
  // fresh data from /api/companies after a Realtime event.
  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch('/api/companies', { cache: 'no-store' })
      if (!res.ok) throw new Error('API error')
      const { companies } = await res.json()
      if (companies && companies.length > 0) {
        setCompaniesData(companies)
        setDataSource('supabase')
        setLastSyncedAt(new Date())
      }
    } catch (err) {
      console.warn('Falling back to static data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  // Push-based sync: any change to these tables in Supabase triggers a
  // debounced refetch so open tabs stay live without a page reload.
  useRealtimeTables(
    ['entities', 'entity_classifications', 'sectors', 'subsectors'],
    fetchCompanies,
    { channelName: 'market-map-grid' }
  )

  // All sectors a company belongs to — falls back to the primary when the
  // row came from the static (legacy) dataset that doesn't carry the array.
  const getSectors = (c: Company): string[] =>
    c.sectors && c.sectors.length > 0 ? c.sectors : [c.sector]
  const getSubsectors = (c: Company): string[] =>
    c.subsectors && c.subsectors.length > 0 ? c.subsectors : [c.subsector]

  // Unique sector list drawn from every tag on every company.
  const sectors = useMemo(() => {
    const sectorSet = new Set<string>()
    companiesData.forEach(c => getSectors(c).forEach(s => s && sectorSet.add(s)))
    return Array.from(sectorSet).sort()
  }, [companiesData])

  // Filter and sort companies. A multi-sector company matches when the
  // selected sector is in its `sectors` array — card stays deduped.
  const filteredCompanies = useMemo(() => {
    let filtered = companiesData.filter(company => {
      const matchesSector =
        selectedSector === null || getSectors(company).includes(selectedSector)
      const q = searchQuery.toLowerCase()
      const matchesSearch = q === '' ||
        company.name.toLowerCase().includes(q) ||
        getSubsectors(company).some(s => s.toLowerCase().includes(q)) ||
        (company.description?.toLowerCase().includes(q) ?? false)

      return matchesSector && matchesSearch
    })

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      } else if (sortBy === 'sector') {
        return a.sector.localeCompare(b.sector) || a.subsector.localeCompare(b.subsector)
      }
      return 0
    })

    return filtered
  }, [companiesData, selectedSector, searchQuery, sortBy])

  // Grouped view: a multi-sector company appears under each of its sectors
  // in the grouped layout, but only once in the flat grid view above.
  const groupedCompanies = useMemo(() => {
    const groups: { [key: string]: Company[] } = {}
    filteredCompanies.forEach(company => {
      getSectors(company).forEach(sector => {
        if (!sector) return
        if (!groups[sector]) groups[sector] = []
        groups[sector].push(company)
      })
    })
    return groups
  }, [filteredCompanies])
  
  const SECTOR_COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    'Core Protocol Architecture':       { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200',   dot: 'bg-blue-500' },
    'Rollup & Scaling Frameworks':      { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200', dot: 'bg-violet-500' },
    'Monetary & Access Rails':          { bg: 'bg-emerald-100',text: 'text-emerald-800',border: 'border-emerald-200',dot: 'bg-emerald-500' },
    'DeFi Systems Architecture':        { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500' },
    'Data & Consensus Infrastructure':  { bg: 'bg-cyan-100',   text: 'text-cyan-800',   border: 'border-cyan-200',   dot: 'bg-cyan-500' },
    'Advanced Compute & Integration':   { bg: 'bg-pink-100',   text: 'text-pink-800',   border: 'border-pink-200',   dot: 'bg-pink-500' },
    'Governance & Enterprise Framework':{ bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-200',  dot: 'bg-amber-500' },
  }
  const FALLBACK_COLOR = { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', dot: 'bg-gray-400' }

  const getSectorColor = (sector: string) => SECTOR_COLOR_MAP[sector] ?? FALLBACK_COLOR

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
            
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>
                <span className="font-semibold text-gray-900">{filteredCompanies.length}</span> companies
              </span>
              {dataSource === 'supabase' && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500"
                  title={lastSyncedAt ? `Last synced ${lastSyncedAt.toLocaleTimeString()}` : 'Live'}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Live
                </span>
              )}
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
              const count = companiesData.filter(c => getSectors(c).includes(sector)).length
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
        

        {/* Companies Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
            {filteredCompanies.map((company, index) => {
              const colorScheme = getSectorColor(company.sector)
              const href = company.entity_id ? `/company/${company.entity_id}` : '#'
              return (
                <Link
                  key={`${company.name}-${index}`}
                  href={href}
                  className="group"
                >
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 hover:shadow-md transition-all duration-200 hover:border-blue-300 flex items-center gap-2.5 h-full">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colorScheme.dot}`} />
                    <span className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors truncate leading-tight">
                      {company.name}
                    </span>
                  </div>
                </Link>
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
                    {companies.map((company, index) => {
                      const href = company.entity_id ? `/company/${company.entity_id}` : '#'
                      return (
                        <Link
                          key={`${company.name}-${index}`}
                          href={href}
                          className="bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg p-3 transition-all duration-200 hover:shadow-md block"
                        >
                          <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                            {company.name}
                          </h3>
                          <p className="text-xs text-gray-600 line-clamp-1">
                            {company.subsector}
                          </p>
                        </Link>
                      )
                    })}
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
                {(() => {
                  const set = new Set<string>()
                  companiesData.forEach(c => getSubsectors(c).forEach(s => s && set.add(s)))
                  return set.size
                })()}
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
      
    </div>
  )
}
