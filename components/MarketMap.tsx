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
}

interface MarketMapProps {}

type ViewMode = 'grid' | 'grouped' | 'landscape'
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
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [companiesData, setCompaniesData] = useState<Company[]>(staticCompanies)
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'supabase' | 'static'>('static')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  // Drawer state — used by Grid + Landscape views. Null means closed.
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null)

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

  const filteredCompanies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const matches = companiesData.filter((company) => {
      const matchesSector =
        selectedSector === null || getSectors(company).includes(selectedSector)
      const matchesSearch =
        q === '' ||
        company.name.toLowerCase().includes(q) ||
        getSubsectors(company).some((s) => s.toLowerCase().includes(q)) ||
        (company.description?.toLowerCase().includes(q) ?? false)
      return matchesSector && matchesSearch
    })
    matches.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return (
        a.sector.localeCompare(b.sector) ||
        a.subsector.localeCompare(b.subsector)
      )
    })
    return matches
  }, [companiesData, selectedSector, searchQuery, sortBy])

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
                {(['grid', 'grouped', 'landscape'] as ViewMode[]).map((mode) => (
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

          {/* Row 2: sector filter chips */}
          <div className="flex flex-wrap gap-1.5">
            <SectorChip
              label="All sectors"
              active={selectedSector === null}
              count={companiesData.length}
              onClick={() => setSelectedSector(null)}
            />
            {sectors.map((sector) => {
              const tokens = getSectorTokens(sector)
              const count = companiesData.filter((c) =>
                getSectors(c).includes(sector)
              ).length
              return (
                <SectorChip
                  key={sector}
                  label={sector}
                  count={count}
                  active={selectedSector === sector}
                  accent={tokens.accent}
                  bg={tokens.bg}
                  text={tokens.text}
                  onClick={() =>
                    setSelectedSector(selectedSector === sector ? null : sector)
                  }
                />
              )
            })}
          </div>
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
            selectedSector={selectedSector}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredCompanies.map((company, index) => (
              <CompanyCard
                key={`${company.entity_id ?? company.name}-${index}`}
                company={company}
                getSectors={getSectors}
                onSelect={(id) => setSelectedEntityId(id)}
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
              onClick={() => {
                setSearchQuery('')
                setSelectedSector(null)
              }}
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
  count,
  active,
  accent,
  bg,
  text,
  onClick,
}: {
  label: string
  count: number
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
      <span className="text-[10px] opacity-70">{count}</span>
    </button>
  )
}

function CompanyCard({
  company,
  getSectors,
  onSelect,
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
