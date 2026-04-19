'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { companiesData as staticCompanies } from '../lib/companiesData'
import { useRealtimeTables } from '../lib/useRealtimeTables'
import JotFormModal from './JotFormModal'
import CompanyDetailDrawer from './CompanyDetailDrawer'
import MarketMapLandscape from './MarketMapLandscape'

interface Company {
  entity_id?: number
  name: string
  // Primary (headline) sector/subsector — used for card accent + sort.
  sector: string
  subsector: string
  // Full tag arrays from v_market_map_grid. Multi-sector entities have > 1.
  sectors?: string[]
  subsectors?: string[]
  description?: string
  website?: string
  logo_url?: string | null
  hq_location?: string | null
  year_founded?: number | null
  funding_stage?: string | null
  canonical_website?: string | null
  status?: string | null
  total_funding_usd?: number | null
  maintaining_organization?: string | null
  practitioners_note?: string | null
}

interface MarketMapProps {}

type ViewMode = 'list' | 'grid' | 'grouped' | 'landscape'
type SortOption = 'name' | 'sector'

// ------------------------------------------------------------------
// Sector color palette. Each sector has:
//   accent = solid hex used for the card's left border / dot
//   bg/text = tailwind classes for filter pills and inline badges
// ------------------------------------------------------------------
type SectorTokens = {
  accent: string
  bg: string
  text: string
  ring: string
  soft: string
}

const SECTOR_TOKENS: Record<string, SectorTokens> = {
  'Core Protocol Architecture': {
    accent: '#3b82f6',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    ring: 'ring-blue-200',
    soft: 'bg-blue-50',
  },
  'Rollup & Scaling Frameworks': {
    accent: '#8b5cf6',
    bg: 'bg-violet-100',
    text: 'text-violet-800',
    ring: 'ring-violet-200',
    soft: 'bg-violet-50',
  },
  'Monetary & Access Rails': {
    accent: '#10b981',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    ring: 'ring-emerald-200',
    soft: 'bg-emerald-50',
  },
  'DeFi Systems Architecture': {
    accent: '#f97316',
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    ring: 'ring-orange-200',
    soft: 'bg-orange-50',
  },
  'Data & Consensus Infrastructure': {
    accent: '#06b6d4',
    bg: 'bg-cyan-100',
    text: 'text-cyan-800',
    ring: 'ring-cyan-200',
    soft: 'bg-cyan-50',
  },
  'Advanced Compute & Integration': {
    accent: '#ec4899',
    bg: 'bg-pink-100',
    text: 'text-pink-800',
    ring: 'ring-pink-200',
    soft: 'bg-pink-50',
  },
  'Governance & Enterprise Framework': {
    accent: '#f59e0b',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    ring: 'ring-amber-200',
    soft: 'bg-amber-50',
  },
}

const FALLBACK_TOKENS: SectorTokens = {
  accent: '#9ca3af',
  bg: 'bg-gray-100',
  text: 'text-gray-700',
  ring: 'ring-gray-200',
  soft: 'bg-gray-50',
}

const getSectorTokens = (sector: string): SectorTokens =>
  SECTOR_TOKENS[sector] ?? FALLBACK_TOKENS

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------

export default function MarketMap({}: MarketMapProps) {
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  // Multi-sector selection. An empty set means "All sectors". Toggle-to-add
  // instead of the old single-value setter.
  const [selectedSectors, setSelectedSectors] = useState<Set<string>>(new Set())
  // Subsector filter is a secondary layer — only shown once at least one
  // sector is chosen. Also a set, cleared automatically when sectors change
  // so stale subsector filters from another sector don't persist.
  const [selectedSubsectors, setSelectedSubsectors] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  // List is the new default — denser than the existing grid but with more
  // standardised metadata per row so users can scan without clicking in.
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [companiesData, setCompaniesData] = useState<Company[]>(staticCompanies)
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'supabase' | 'static'>('static')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  // Drawer state — used by Grid + Landscape views. Null means closed.
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null)

  // Starring — populated from /api/me/stars after the viewer signs in.
  // Anonymous visitors silently get an empty set and the star button
  // prompts them to /login on click (handled in the card).
  const [starredIds, setStarredIds] = useState<Set<number>>(new Set())
  const [viewerSignedIn, setViewerSignedIn] = useState(false)

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

  // Fetch the viewer's starred list once on mount. A 401 just means they're
  // anonymous — we leave starredIds empty and rely on the card to prompt
  // for sign-in when they click the star.
  const fetchStars = useCallback(async () => {
    try {
      const res = await fetch('/api/me/stars', { cache: 'no-store' })
      if (!res.ok) {
        setViewerSignedIn(false)
        return
      }
      const body = await res.json()
      const ids: number[] = (body.stars ?? []).map((s: { entity_id: number }) => s.entity_id)
      setStarredIds(new Set(ids))
      setViewerSignedIn(true)
    } catch {
      setViewerSignedIn(false)
    }
  }, [])

  useEffect(() => {
    fetchStars()
  }, [fetchStars])

  const toggleStar = useCallback(
    async (entityId: number) => {
      if (!viewerSignedIn) {
        // Send anonymous visitors through the login flow with a return-to
        // that points back here so they land right where they were.
        const next = encodeURIComponent('/market-map')
        window.location.href = `/login?next=${next}`
        return
      }
      const already = starredIds.has(entityId)
      // Optimistic update — revert if the network call fails.
      setStarredIds((prev) => {
        const next = new Set(prev)
        if (already) next.delete(entityId)
        else next.add(entityId)
        return next
      })
      try {
        if (already) {
          const res = await fetch(`/api/me/stars/${entityId}`, { method: 'DELETE' })
          if (!res.ok) throw new Error(`unstar failed ${res.status}`)
        } else {
          const res = await fetch('/api/me/stars', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ entity_id: entityId }),
          })
          if (!res.ok) throw new Error(`star failed ${res.status}`)
        }
      } catch (err) {
        console.error('[star toggle]', err)
        // Roll back optimistic change on error.
        setStarredIds((prev) => {
          const next = new Set(prev)
          if (already) next.add(entityId)
          else next.delete(entityId)
          return next
        })
      }
    },
    [starredIds, viewerSignedIn]
  )

  useRealtimeTables(
    ['entities', 'entity_classifications', 'sectors', 'subsectors'],
    fetchCompanies,
    { channelName: 'market-map-grid' }
  )

  const getSectors = (c: Company): string[] =>
    c.sectors && c.sectors.length > 0 ? c.sectors : [c.sector]
  const getSubsectors = (c: Company): string[] =>
    c.subsectors && c.subsectors.length > 0 ? c.subsectors : [c.subsector]

  const sectors = useMemo(() => {
    const set = new Set<string>()
    companiesData.forEach((c) => getSectors(c).forEach((s) => s && set.add(s)))
    return Array.from(set).sort()
  }, [companiesData])

  // Subsector chip set is derived from the currently selected sectors so the
  // list doesn't balloon to every subsector across every sector. When no
  // sectors are selected there's no subsector filter to show either.
  const availableSubsectors = useMemo(() => {
    if (selectedSectors.size === 0) return [] as string[]
    const set = new Set<string>()
    companiesData.forEach((c) => {
      const sectors = getSectors(c)
      const subsectors = getSubsectors(c)
      sectors.forEach((sec, idx) => {
        // Company's sectors and subsectors arrays are aligned per row in the
        // grid view, so the Nth subsector belongs to the Nth sector.
        if (selectedSectors.has(sec)) {
          const sub = subsectors[idx] ?? subsectors[0]
          if (sub) set.add(sub)
        }
      })
    })
    return Array.from(set).sort()
  }, [companiesData, selectedSectors])

  const filteredCompanies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const matches = companiesData.filter((company) => {
      const sectors = getSectors(company)
      const subsectors = getSubsectors(company)
      const matchesSector =
        selectedSectors.size === 0 ||
        sectors.some((s) => selectedSectors.has(s))
      const matchesSubsector =
        selectedSubsectors.size === 0 ||
        subsectors.some((s) => selectedSubsectors.has(s))
      const matchesSearch =
        q === '' ||
        company.name.toLowerCase().includes(q) ||
        subsectors.some((s) => s.toLowerCase().includes(q)) ||
        (company.description?.toLowerCase().includes(q) ?? false)
      return matchesSector && matchesSubsector && matchesSearch
    })
    matches.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return (
        a.sector.localeCompare(b.sector) ||
        a.subsector.localeCompare(b.subsector)
      )
    })
    return matches
  }, [companiesData, selectedSectors, selectedSubsectors, searchQuery, sortBy])

  // Keep the subsector filter honest: if the user removes a sector that was
  // providing a currently-selected subsector, drop it.
  useEffect(() => {
    if (selectedSubsectors.size === 0) return
    const valid = new Set(availableSubsectors)
    let changed = false
    const next = new Set<string>()
    selectedSubsectors.forEach((s) => {
      if (valid.has(s)) next.add(s)
      else changed = true
    })
    if (changed) setSelectedSubsectors(next)
  }, [availableSubsectors, selectedSubsectors])

  const toggleSector = useCallback((sector: string) => {
    setSelectedSectors((prev) => {
      const next = new Set(prev)
      if (next.has(sector)) next.delete(sector)
      else next.add(sector)
      return next
    })
  }, [])
  const toggleSubsector = useCallback((subsector: string) => {
    setSelectedSubsectors((prev) => {
      const next = new Set(prev)
      if (next.has(subsector)) next.delete(subsector)
      else next.add(subsector)
      return next
    })
  }, [])
  const clearAllFilters = useCallback(() => {
    setSelectedSectors(new Set())
    setSelectedSubsectors(new Set())
    setSearchQuery('')
  }, [])

  const groupedCompanies = useMemo(() => {
    const groups: Record<string, Company[]> = {}
    filteredCompanies.forEach((company) => {
      getSectors(company).forEach((sector) => {
        if (!sector) return
        if (!groups[sector]) groups[sector] = []
        groups[sector].push(company)
      })
    })
    return groups
  }, [filteredCompanies])

  const subsectorCount = useMemo(() => {
    const set = new Set<string>()
    companiesData.forEach((c) => getSubsectors(c).forEach((s) => s && set.add(s)))
    return set.size
  }, [companiesData])

  // Show skeleton only on first load, and only while the static data is
  // still showing (dataSource === 'static' and loading). After the first
  // fetch we keep rendering the grid while Realtime refetches silently.
  const showSkeleton = loading && dataSource === 'static'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ------------------------------------------------------------------
           Hero: compact intro + submit button. Minimal vertical weight so
           the filter bar + cards dominate the fold.
           ------------------------------------------------------------------ */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
              The Ethereum Infrastructure Atlas
            </h1>
            <p className="mt-2 text-sm md:text-[15px] text-gray-500 max-w-2xl">
              A curated, research-driven map of Ethereum&apos;s infrastructure,
              protocols, and applications.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSubmitForm(true)}
              className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-md text-xs font-medium transition shadow-sm"
            >
              Submit a company
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------
           Sticky filter bar. Offsets under the site header (`top-16` on the
           existing nav). Contains: search + sector chips + view toggle +
           sort + live indicator.
           ------------------------------------------------------------------ */}
      <div
        className="sticky z-20 bg-white/80 backdrop-blur border-b border-gray-200"
        style={{ top: 68 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3 space-y-3">
          {/* Row 1: search + toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1 min-w-[200px]">
              <svg
                className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search companies, descriptions, subsectors…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {(['list', 'grid', 'grouped', 'landscape'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition ${
                      viewMode === mode
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <Link
                href="/saved"
                title="View your starred companies"
                className="px-2.5 py-1.5 inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900 transition"
              >
                <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 15.27L16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" />
                </svg>
                Saved
                {starredIds.size > 0 && (
                  <span className="text-[10px] text-gray-500">{starredIds.size}</span>
                )}
              </Link>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Sort: Name</option>
                <option value="sector">Sort: Sector</option>
              </select>

              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 pl-3 ml-1 border-l border-gray-200">
                <span>
                  <span className="font-semibold text-gray-900">
                    {filteredCompanies.length}
                  </span>{' '}
                  companies
                </span>
                {dataSource === 'supabase' && (
                  <span
                    className="inline-flex items-center gap-1.5 text-gray-500"
                    title={
                      lastSyncedAt
                        ? `Last synced ${lastSyncedAt.toLocaleTimeString()}`
                        : 'Live'
                    }
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    Live
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: multi-select sector filter chips. Click to toggle;
              picking more than one unions the filter (OR semantics). */}
          <div className="flex flex-wrap items-center gap-1.5">
            <SectorChip
              label="All sectors"
              active={selectedSectors.size === 0}
              onClick={() => {
                setSelectedSectors(new Set())
                setSelectedSubsectors(new Set())
              }}
            />
            {sectors.map((sector) => {
              const tokens = getSectorTokens(sector)
              return (
                <SectorChip
                  key={sector}
                  label={sector}
                  active={selectedSectors.has(sector)}
                  accent={tokens.accent}
                  bg={tokens.bg}
                  text={tokens.text}
                  onClick={() => toggleSector(sector)}
                />
              )
            })}
            {selectedSectors.size > 0 && (
              <button
                onClick={clearAllFilters}
                className="ml-auto px-2 py-0.5 text-[11px] text-gray-500 hover:text-gray-800"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Row 3: subsector chips — only shown once the user has picked a
              sector. Scoped to the subsectors that live inside the chosen
              sectors so the list stays digestible. */}
          {availableSubsectors.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 pr-1">
                Subsector
              </span>
              <SectorChip
                label="All"
                active={selectedSubsectors.size === 0}
                onClick={() => setSelectedSubsectors(new Set())}
              />
              {availableSubsectors.map((subsector) => (
                <SectorChip
                  key={subsector}
                  label={subsector}
                  active={selectedSubsectors.has(subsector)}
                  onClick={() => toggleSubsector(subsector)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------
           Companies display. Skeleton during initial load; otherwise either
           the flat grid or the grouped layout.
           ------------------------------------------------------------------ */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {showSkeleton ? (
          <SkeletonGrid />
        ) : viewMode === 'landscape' ? (
          <MarketMapLandscape
            companies={filteredCompanies}
            sectorOrder={sectors}
            sectorTokens={getSectorTokens}
            onSelect={(id) => setSelectedEntityId(id)}
            selectedSectors={selectedSectors}
          />
        ) : viewMode === 'list' ? (
          <CompanyList
            companies={filteredCompanies}
            getSectors={getSectors}
            onSelect={(id) => setSelectedEntityId(id)}
            starredIds={starredIds}
            onToggleStar={toggleStar}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredCompanies.map((company, index) => (
              <CompanyCard
                key={`${company.entity_id ?? company.name}-${index}`}
                company={company}
                getSectors={getSectors}
                onSelect={(id) => setSelectedEntityId(id)}
                starred={company.entity_id != null && starredIds.has(company.entity_id)}
                onToggleStar={toggleStar}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {sectors.map((sector) => {
              const list = groupedCompanies[sector]
              if (!list || list.length === 0) return null
              const tokens = getSectorTokens(sector)
              return (
                <div
                  key={sector}
                  className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden"
                >
                  <div
                    className="px-5 py-3 flex items-center gap-3 border-b border-gray-100"
                    style={{
                      borderLeft: `3px solid ${tokens.accent}`,
                    }}
                  >
                    <h2 className="text-sm font-semibold text-gray-900">
                      {sector}
                    </h2>
                    <span className="text-xs text-gray-400">
                      {list.length} {list.length === 1 ? 'company' : 'companies'}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {list.map((company, index) => (
                      <CompanyCard
                        key={`${sector}-${company.entity_id ?? company.name}-${index}`}
                        company={company}
                        getSectors={getSectors}
                        onSelect={(id) => setSelectedEntityId(id)}
                        starred={company.entity_id != null && starredIds.has(company.entity_id)}
                        onToggleStar={toggleStar}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {!showSkeleton && filteredCompanies.length === 0 && (
          <div className="text-center py-20 rounded-2xl border border-dashed border-gray-300 bg-white">
            <svg
              className="mx-auto h-10 w-10 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-base font-medium text-gray-900">
              No companies match those filters
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try a broader search or clear the sector filter.
            </p>
            <button
              onClick={clearAllFilters}
              className="mt-4 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Stats strip — compact, single-row, not three big cards */}
        <div className="mt-12 pt-6 border-t border-gray-200">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm text-gray-500">
            <StatCell label="Major sectors" value={sectors.length} />
            <div className="h-4 w-px bg-gray-200 hidden sm:block" />
            <StatCell label="Subsectors" value={subsectorCount} />
            <div className="h-4 w-px bg-gray-200 hidden sm:block" />
            <StatCell label="Companies" value={companiesData.length} />
            <div className="ml-auto text-xs text-gray-400">
              {dataSource === 'supabase'
                ? lastSyncedAt
                  ? `Synced ${lastSyncedAt.toLocaleTimeString()}`
                  : 'Live'
                : 'Static fallback'}
            </div>
          </div>
        </div>
      </div>

      {/* Company Detail Drawer — shared by Grid, Grouped, and Landscape views */}
      <CompanyDetailDrawer
        entityId={selectedEntityId}
        onClose={() => setSelectedEntityId(null)}
        starred={selectedEntityId != null && starredIds.has(selectedEntityId)}
        onToggleStar={toggleStar}
      />

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

// ------------------------------------------------------------------
// Building blocks
// ------------------------------------------------------------------

function SectorChip({
  label,
  active,
  accent,
  bg,
  text,
  onClick,
}: {
  label: string
  active: boolean
  accent?: string
  bg?: string
  text?: string
  onClick: () => void
}) {
  const activeStyles = active
    ? bg && text
      ? `${bg} ${text} border-transparent`
      : 'bg-gray-900 text-white border-transparent'
    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:text-gray-900'

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${activeStyles}`}
    >
      {accent && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: accent }}
        />
      )}
      <span>{label}</span>
    </button>
  )
}

function CompanyCard({
  company,
  getSectors,
  onSelect,
  starred,
  onToggleStar,
}: {
  company: Company
  getSectors: (c: Company) => string[]
  /**
   * Optional click handler. When provided (and the company has an
   * entity_id) the card renders as a <button> that opens the detail
   * drawer. Without it the card falls back to a Link that navigates to
   * /company/[id] for deep-linking.
   */
  onSelect?: (entityId: number) => void
  starred?: boolean
  onToggleStar?: (entityId: number) => void
}) {
  const sectors = getSectors(company)
  const extraSectorCount = Math.max(0, sectors.length - 1)
  const tokens = getSectorTokens(company.sector)
  const href = company.entity_id ? `/company/${company.entity_id}` : '#'
  const initials = getInitials(company.name)

  // Full description used as native title (accessible hover tooltip).
  const title = [
    company.name,
    company.subsector ? `— ${company.subsector}` : '',
    company.description ? `\n\n${company.description}` : '',
  ]
    .join(' ')
    .trim()

  const cardClass =
    'group relative text-left w-full bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-[0_4px_12px_-4px_rgba(15,23,42,0.12)] transition-all duration-150 overflow-hidden'

  const body = (
    <>
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: tokens.accent }}
      />
      <div className="px-3 py-2.5 pl-3.5 flex items-center gap-2.5 h-full">
        <Logo logo_url={company.logo_url} initials={initials} accent={tokens.accent} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="block text-[13px] font-medium text-gray-900 group-hover:text-gray-700 truncate leading-tight">
              {company.name}
            </span>
          </div>
          {company.subsector && (
            <div className="text-[11px] text-gray-400 truncate leading-tight mt-0.5">
              {company.subsector}
            </div>
          )}
        </div>

        {extraSectorCount > 0 && (
          <span
            className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tokens.bg} ${tokens.text}`}
            title={`Also in: ${sectors.slice(1).join(', ')}`}
          >
            +{extraSectorCount}
          </span>
        )}
        {company.entity_id != null && onToggleStar && (
          <StarButton
            active={!!starred}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleStar(company.entity_id!)
            }}
          />
        )}
      </div>
    </>
  )

  const canUseDrawer = onSelect && typeof company.entity_id === 'number'
  if (canUseDrawer) {
    return (
      <button
        type="button"
        onClick={() => onSelect!(company.entity_id!)}
        title={title}
        className={cardClass}
      >
        {body}
      </button>
    )
  }

  return (
    <Link href={href} title={title} className={cardClass}>
      {body}
    </Link>
  )
}

function Logo({
  logo_url,
  initials,
  accent,
}: {
  logo_url?: string | null
  initials: string
  accent: string
}) {
  const [broken, setBroken] = useState(false)
  const showImage = !!logo_url && !broken

  if (showImage) {
    return (
      <span className="shrink-0 w-6 h-6 rounded-md overflow-hidden bg-white border border-gray-100 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo_url!}
          alt=""
          className="w-full h-full object-contain"
          onError={() => setBroken(true)}
          loading="lazy"
        />
      </span>
    )
  }

  return (
    <span
      aria-hidden
      className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-semibold text-white"
      style={{ backgroundColor: accent }}
    >
      {initials}
    </span>
  )
}

// Star button — rendered as a span with role=button so it can live inside
// the outer <button>/Link card without producing nested interactive
// elements (which browsers and React warn about).
function StarButton({
  active,
  onClick,
}: {
  active: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={active ? 'Remove from saved' : 'Save to compare later'}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onClick(e as unknown as React.MouseEvent)
        }
      }}
      className={`shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 ${
        active ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'
      } transition-colors`}
      title={active ? 'Remove from saved' : 'Save company'}
    >
      <svg className="w-3.5 h-3.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75} viewBox="0 0 20 20">
        <path
          strokeLinejoin="round"
          d="M10 15.27L16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z"
        />
      </svg>
    </span>
  )
}

// Dense, information-rich default view. Unlike the grid (which is all about
// "can I see hundreds of logos at a glance"), the list is for shoppers —
// one row per company with logo, name, primary subsector, HQ, year,
// funding stage. Clicking opens the drawer just like the other views.
function CompanyList({
  companies,
  getSectors,
  onSelect,
  starredIds,
  onToggleStar,
}: {
  companies: Company[]
  getSectors: (c: Company) => string[]
  onSelect: (entityId: number) => void
  starredIds: Set<number>
  onToggleStar: (entityId: number) => void
}) {
  // 6-column layout: Company | Subsector | Website | Maintained by | Note | Save.
  // We pack the heaviest text into the Note column (2fr) and keep the rest
  // tight so alignment stays clean at typical desktop widths.
  const gridCols =
    'md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_36px]'

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header row — lines up with the data columns below. Hidden on mobile. */}
      <div className={`hidden md:grid ${gridCols} gap-3 px-4 py-2 border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-400 bg-gray-50`}>
        <div>Company</div>
        <div>Subsector</div>
        <div>Website</div>
        <div>Maintained by</div>
        <div>Practitioner&apos;s note</div>
        <div className="text-right">Save</div>
      </div>
      <ul className="divide-y divide-gray-100">
        {companies.map((c, i) => {
          const tokens = getSectorTokens(c.sector)
          const sectors = getSectors(c)
          const extraSectorCount = Math.max(0, sectors.length - 1)
          const isStarred = c.entity_id != null && starredIds.has(c.entity_id)
          const websiteRaw = c.website || c.canonical_website || null
          const websiteLabel = formatHostname(websiteRaw)
          return (
            <li key={`list-${c.entity_id ?? c.name}-${i}`} className="hover:bg-gray-50/60 transition-colors">
              <button
                type="button"
                onClick={() => c.entity_id != null && onSelect(c.entity_id)}
                className={`w-full text-left px-4 py-3 grid grid-cols-1 ${gridCols} gap-3 items-start`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    aria-hidden
                    className="w-1 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: tokens.accent }}
                  />
                  <Logo logo_url={c.logo_url} initials={getInitials(c.name)} accent={tokens.accent} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
                      {extraSectorCount > 0 && (
                        <span
                          className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tokens.bg} ${tokens.text}`}
                          title={`Also in: ${sectors.slice(1).join(', ')}`}
                        >
                          +{extraSectorCount}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-1.5">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: tokens.accent }}
                      />
                      {c.sector}
                    </div>
                  </div>
                </div>
                <div className="text-[12px] text-gray-700 truncate pt-0.5">
                  {c.subsector || <span className="text-gray-300">—</span>}
                </div>
                <div className="text-[12px] text-gray-600 truncate pt-0.5" title={websiteRaw ?? undefined}>
                  {websiteLabel ?? <span className="text-gray-300">—</span>}
                </div>
                <div className="text-[12px] text-gray-700 truncate pt-0.5" title={c.maintaining_organization ?? undefined}>
                  {c.maintaining_organization || <span className="text-gray-300">—</span>}
                </div>
                <div
                  className="text-[12px] leading-snug text-gray-600 line-clamp-2 pt-0.5"
                  title={c.practitioners_note ?? undefined}
                >
                  {c.practitioners_note || <span className="text-gray-300">—</span>}
                </div>
                <div className="flex justify-end pt-0.5">
                  {c.entity_id != null && (
                    <StarButton
                      active={isStarred}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onToggleStar(c.entity_id!)
                      }}
                    />
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Pretty-print a hostname for the list's Website column. Strips `www.` and
// any trailing path so the column stays visually tidy even when a source
// pasted in a long URL.
function formatHostname(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    const u = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    return u.hostname.replace(/^www\./i, '')
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0] || trimmed
  }
}

function StatCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-base font-semibold text-gray-900">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="relative h-[54px] rounded-lg bg-white border border-gray-200 overflow-hidden animate-pulse flex items-center gap-2.5 px-3.5 py-2.5"
        >
          <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-gray-200" />
          <div className="w-6 h-6 rounded-md bg-gray-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 bg-gray-100 rounded w-4/5" />
            <div className="h-2 bg-gray-100 rounded w-2/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

function getInitials(name: string): string {
  if (!name) return '?'
  // "Chainalysis KYT" -> "CK". "Alchemy (Data APIs)" -> "AD".
  const cleaned = name.replace(/[()\[\]]/g, ' ')
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
