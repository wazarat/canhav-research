import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { useRealtimeTables } from '../../lib/useRealtimeTables'

/**
 * /company/[id] — Rich profile page for a single root entity.
 *
 * Layout (desktop, lg+):
 *   ┌──────────────────────────────────────────────┐
 *   │   Header (logo + name + sector + HQ inline)  │
 *   ├──────────────────────────────┬───────────────┤
 *   │  Primary column              │   Sidebar     │
 *   │   - long description         │  - links      │
 *   │   - classifications list     │  - founders   │
 *   │   - sub-entities             │  - related    │
 *   │   - funding / token / chains │               │
 *   │   - sector detail tables     │               │
 *   │   - footer (report issue)    │               │
 *   └──────────────────────────────┴───────────────┘
 *
 * Gated by middleware.ts matcher '/company/:path*' so only authenticated
 * viewers can open this page. Anonymous users still get the public
 * drawer on /market-map.
 *
 * Realtime: subscribes to entities + entity_classifications so a
 * super-admin edit from the drawer refreshes this page instantly.
 * An event log call (POST /api/events) records the open for analytics.
 */

interface Classification {
  entity_classification_id: number
  sector_name: string
  subsector_name: string
  description: string
  website: string
  maintaining_organization: string
  reason_for_inclusion: string
  practitioners_note: string
  practitioner_validation_check: string
  is_primary: boolean
}

interface SectorDetail {
  sector_name: string
  table_name: string
  fields: Record<string, string>
}

interface CompanyDetail {
  entity_id: number
  entity_name: string
  canonical_website: string | null
  logo_url: string | null
  year_founded: number | null
  hq_location: string | null
  funding_stage: string | null
  twitter_handle: string | null
  github_org: string | null
  tags: string[] | null
  long_description: string | null
  founders: string[] | null
  total_funding_usd: number | null
  last_funding_date: string | null
  investors: string[] | null
  token_symbol: string | null
  chains: string[] | null
  linkedin_url: string | null
  discord_url: string | null
  telegram_url: string | null
  farcaster_handle: string | null
  status: string | null
  classifications: Classification[]
  sector_details: SectorDetail[]
  sub_entities: Array<{ entity_id: number; entity_name: string }>
}

interface RelatedCompany {
  entity_id: number
  entity_name: string
  canonical_website: string | null
  logo_url: string | null
  primary_subsector: string | null
}

interface SubsectorBlockColumn {
  key: string
  label: string
  type: string
}

interface SubsectorBlock {
  subsector_id: number
  subsector_name: string
  sector_name: string
  is_primary: boolean
  table_name: string | null
  display_schema: SubsectorBlockColumn[]
  data: Record<string, unknown> | null
}

const SECTOR_COLOR_MAP: Record<
  string,
  { bg: string; text: string; dot: string; border: string; solid: string }
> = {
  'Core Protocol Architecture':        { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-200',    solid: 'bg-blue-600' },
  'Rollup & Scaling Frameworks':       { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500',  border: 'border-violet-200',  solid: 'bg-violet-600' },
  'Monetary & Access Rails':           { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200', solid: 'bg-emerald-600' },
  'DeFi Systems Architecture':         { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500',  border: 'border-orange-200',  solid: 'bg-orange-600' },
  'Data & Consensus Infrastructure':   { bg: 'bg-cyan-50',    text: 'text-cyan-700',    dot: 'bg-cyan-500',    border: 'border-cyan-200',    solid: 'bg-cyan-600' },
  'Advanced Compute & Integration':    { bg: 'bg-pink-50',    text: 'text-pink-700',    dot: 'bg-pink-500',    border: 'border-pink-200',    solid: 'bg-pink-600' },
  'Governance & Enterprise Framework': { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-200',   solid: 'bg-amber-600' },
}
const FALLBACK = { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400', border: 'border-gray-200', solid: 'bg-gray-500' }

function formatCurrency(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(n >= 10_000_000_000 ? 0 : 1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function stripUrl(u: string | null | undefined): string {
  if (!u) return ''
  return u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export default function CompanyDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [related, setRelated] = useState<RelatedCompany[]>([])
  const [subsectorBlocks, setSubsectorBlocks] = useState<SubsectorBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Market Map', href: '/market-map' },
    { name: 'Research', href: 'https://research.canhav.com', external: true },
    { name: 'Enterprise Users', href: '/enterprise-users' },
    { name: 'About Us', href: '/about-us' },
  ]

  const fetchCompany = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/company/${id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      setCompany(data)
      setError(null)
    } catch {
      setError('Company not found')
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchRelated = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/company/${id}/related`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setRelated(data.related || [])
    } catch {
      /* silent — sidebar is optional */
    }
  }, [id])

  const fetchSubsectorData = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/company/${id}/subsector-data`, { cache: 'no-store' })
      if (!res.ok) {
        setSubsectorBlocks([])
        return
      }
      const data = await res.json()
      setSubsectorBlocks(data.blocks || [])
    } catch {
      setSubsectorBlocks([])
    }
  }, [id])

  useEffect(() => {
    fetchCompany()
    fetchRelated()
    fetchSubsectorData()
  }, [fetchCompany, fetchRelated, fetchSubsectorData])

  // Fire-and-forget view event. Gated by middleware already, so the
  // viewer must be signed in to reach this. /api/events upserts a row in
  // public.user_events if the table/route exists (added by migration 011).
  useEffect(() => {
    if (!id) return
    fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event_type: 'company_view', entity_id: Number(id) }),
      keepalive: true,
    }).catch(() => {})
  }, [id])

  useRealtimeTables(['entities', 'entity_classifications'], fetchCompany, {
    channelName: id ? `company-detail-${id}` : undefined,
  })

  const getColor = (sector: string) => SECTOR_COLOR_MAP[sector] ?? FALLBACK

  const formatFieldName = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const uniqueSectors = company
    ? Array.from(new Set(company.classifications.map((c) => c.sector_name)))
    : []

  const primaryClassification =
    company?.classifications.find((c) => c.is_primary) ?? company?.classifications[0]
  const primarySector = primaryClassification?.sector_name
  const primaryColor = primarySector ? getColor(primarySector) : FALLBACK
  const websiteToShow =
    company?.canonical_website || primaryClassification?.website || null

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>
          {company ? `${company.entity_name} — CanHav Research` : 'Company Detail'}
        </title>
        <meta
          name="description"
          content={
            company
              ? `${company.entity_name}: ${primaryClassification?.subsector_name ?? 'Ethereum infrastructure company'} profile.`
              : ''
          }
        />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </Head>

      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
              CanHav Research
            </Link>
            <nav className="hidden lg:flex items-center space-x-8">
              {navItems.map((item) =>
                item.external ? (
                  <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    {item.name}
                  </a>
                ) : (
                  <Link key={item.name} href={item.href} className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    {item.name}
                  </Link>
                )
              )}
            </nav>
            <button className="lg:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span className={`block w-6 h-0.5 bg-gray-600 transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                <span className={`block w-6 h-0.5 bg-gray-600 mt-1 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block w-6 h-0.5 bg-gray-600 mt-1 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
              </div>
            </button>
          </div>
          {isMenuOpen && (
            <nav className="lg:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
              {navItems.map((item) =>
                item.external ? (
                  <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer" className="block py-2 text-gray-600 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>
                    {item.name}
                  </a>
                ) : (
                  <Link key={item.name} href={item.href} className="block py-2 text-gray-600 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>
                    {item.name}
                  </Link>
                )
              )}
            </nav>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 max-w-6xl">
        <Link href="/market-map" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-5 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Market Map
        </Link>

        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="text-center py-32">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Company Not Found</h2>
            <p className="text-gray-500 mb-6">The entity you&apos;re looking for doesn&apos;t exist.</p>
            <Link href="/market-map" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Back to Market Map
            </Link>
          </div>
        )}

        {company && !loading && (
          <div className="space-y-6">
            {/* =========================================================
                Header card — logo, name, primary sector, inline facts
                ========================================================= */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className={`h-1.5 w-full ${primaryColor.solid}`} />
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-start md:gap-6">
                  <div className="flex-shrink-0 mb-4 md:mb-0">
                    {company.logo_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={company.logo_url}
                        alt={`${company.entity_name} logo`}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-contain bg-white border border-gray-200"
                      />
                    ) : (
                      <div className={`w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center text-white text-xl font-bold ${primaryColor.solid}`}>
                        {initials(company.entity_name)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 break-words">
                        {company.entity_name}
                      </h1>
                      {company.status && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          company.status === 'active'   ? 'bg-emerald-50 text-emerald-700' :
                          company.status === 'acquired' ? 'bg-indigo-50 text-indigo-700' :
                          company.status === 'defunct'  ? 'bg-gray-100 text-gray-600' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {company.status}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {uniqueSectors.map((sector) => {
                        const color = getColor(sector)
                        return (
                          <span
                            key={sector}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${color.bg} ${color.text}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                            {sector}
                          </span>
                        )
                      })}
                    </div>

                    {/* Inline facts row */}
                    <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                      {company.hq_location && (
                        <Fact icon="pin" label="HQ" value={company.hq_location} />
                      )}
                      {company.year_founded && (
                        <Fact icon="calendar" label="Founded" value={String(company.year_founded)} />
                      )}
                      {company.funding_stage && (
                        <Fact icon="dollar" label="Stage" value={company.funding_stage} />
                      )}
                      {formatCurrency(company.total_funding_usd) && (
                        <Fact icon="dollar" label="Raised" value={formatCurrency(company.total_funding_usd)!} />
                      )}
                      {company.token_symbol && (
                        <Fact icon="tag" label="Token" value={`$${company.token_symbol.toUpperCase()}`} />
                      )}
                      {websiteToShow && (
                        <a href={websiteToShow} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          {stripUrl(websiteToShow)}
                        </a>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            </section>

            {/* =========================================================
                Two-column body
                ========================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-6">
              {/* -------- PRIMARY COLUMN -------- */}
              <div className="space-y-6 min-w-0">
                {/* Long description */}
                {company.long_description && (
                  <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">About</h2>
                    <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">
                      {company.long_description}
                    </p>
                  </section>
                )}

                {/* Funding / investors / chains mini-panel */}
                {(company.total_funding_usd != null ||
                  (company.investors && company.investors.length > 0) ||
                  (company.chains && company.chains.length > 0) ||
                  company.token_symbol) && (
                  <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(company.total_funding_usd != null || company.last_funding_date) && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Funding</h3>
                        <div className="space-y-1.5 text-sm text-gray-700">
                          {formatCurrency(company.total_funding_usd) && (
                            <div><span className="text-gray-400">Total raised: </span>
                              <span className="font-semibold">{formatCurrency(company.total_funding_usd)}</span></div>
                          )}
                          {company.last_funding_date && (
                            <div><span className="text-gray-400">Last round: </span>{company.last_funding_date}</div>
                          )}
                          {company.funding_stage && (
                            <div><span className="text-gray-400">Stage: </span>{company.funding_stage}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {company.investors && company.investors.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Investors</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {company.investors.map((inv) => (
                            <span key={inv} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs">
                              {inv}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {company.token_symbol && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Token</h3>
                        <div className="text-sm text-gray-700">
                          <span className="font-semibold">${company.token_symbol.toUpperCase()}</span>
                        </div>
                      </div>
                    )}

                    {company.chains && company.chains.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Chains</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {company.chains.map((c) => (
                            <span key={c} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs capitalize">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* Sub-entities (collapsed product children) */}
                {company.sub_entities && company.sub_entities.length > 0 && (
                  <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                      Products / sub-entities ({company.sub_entities.length})
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {company.sub_entities.map((sub) => (
                        <span key={sub.entity_id} className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                          {sub.entity_name}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Classifications — one card per subsector */}
                <section>
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">
                    Classifications
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      ({company.classifications.length})
                    </span>
                  </h2>
                  <div className="space-y-4">
                    {company.classifications.map((cls) => {
                      const color = getColor(cls.sector_name)
                      return (
                        <div key={cls.entity_classification_id} className={`bg-white rounded-xl border ${color.border} shadow-sm overflow-hidden`}>
                          <div className={`${color.bg} px-5 py-2.5 flex items-center gap-2.5 flex-wrap`}>
                            <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                            <span className={`text-xs font-semibold ${color.text}`}>{cls.sector_name}</span>
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className={`text-xs font-medium ${color.text}`}>{cls.subsector_name}</span>
                            {cls.is_primary && (
                              <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="p-5 space-y-4">
                            {cls.description && (
                              <div>
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Description</h4>
                                <p className="text-gray-700 leading-relaxed text-sm">{cls.description}</p>
                              </div>
                            )}
                            {cls.reason_for_inclusion && (
                              <div>
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Reason for inclusion</h4>
                                <div className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">
                                  {cls.reason_for_inclusion}
                                </div>
                              </div>
                            )}
                            {cls.practitioners_note && (
                              <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-100">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Practitioner&apos;s note</h4>
                                <p className="text-gray-700 leading-relaxed text-sm italic">{cls.practitioners_note}</p>
                              </div>
                            )}
                            {cls.practitioner_validation_check && (
                              <div>
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Validation check</h4>
                                <p className="text-gray-600 leading-relaxed text-sm">{cls.practitioner_validation_check}</p>
                              </div>
                            )}

                            {(() => {
                              const block = subsectorBlocks.find(
                                (b) => b.subsector_id === cls.subsector_id && b.data
                              )
                              if (!block || !block.data) return null
                              const entries = block.display_schema
                                .map((col) => ({
                                  col,
                                  value: block.data?.[col.key],
                                }))
                                .filter(
                                  (e) =>
                                    e.value !== null &&
                                    e.value !== undefined &&
                                    String(e.value).trim() !== ''
                                )
                              if (entries.length === 0) return null
                              return (
                                <div className="pt-3 border-t border-gray-100">
                                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                                    Subsector datapoints
                                  </h4>
                                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                    {entries.map(({ col, value }) => {
                                      const str = String(value)
                                      const isLong = col.type === 'long_text' || str.length > 120
                                      const isUrl =
                                        col.type === 'url' && /^https?:\/\//i.test(str)
                                      return (
                                        <div key={col.key} className={isLong ? 'md:col-span-2' : ''}>
                                          <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                                            {col.label}
                                          </dt>
                                          <dd className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                            {isUrl ? (
                                              <a
                                                href={str}
                                                target="_blank"
                                                rel="noreferrer noopener"
                                                className="text-blue-600 hover:text-blue-700 break-all"
                                              >
                                                {str.replace(/^https?:\/\/(www\.)?/, '')}
                                              </a>
                                            ) : (
                                              str
                                            )}
                                          </dd>
                                        </div>
                                      )
                                    })}
                                  </dl>
                                </div>
                              )
                            })()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                {/* Sector-specific tables (masterdata) */}
                {company.sector_details && company.sector_details.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">Sector-specific data</h2>
                    <div className="space-y-4">
                      {company.sector_details.map((detail) => {
                        const color = getColor(detail.sector_name)
                        const entries = Object.entries(detail.fields)
                        return (
                          <div key={detail.table_name} className={`bg-white rounded-xl border ${color.border} shadow-sm overflow-hidden`}>
                            <div className={`${color.bg} px-5 py-2.5 flex items-center gap-2.5`}>
                              <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                              <span className={`text-xs font-semibold ${color.text}`}>{detail.sector_name}</span>
                              <span className="text-[11px] text-gray-400 ml-auto">{entries.length} fields</span>
                            </div>
                            <div className="p-5">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                {entries.map(([key, value]) => {
                                  const isLong = value.length > 120
                                  return (
                                    <div key={key} className={isLong ? 'md:col-span-2' : ''}>
                                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                                        {formatFieldName(key)}
                                      </dt>
                                      <dd className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                        {value}
                                      </dd>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}

                {/* Footer utilities */}
                <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                  <span>
                    Something off on this profile?{' '}
                    <a href={`mailto:research@canhav.com?subject=Edit%20request%20for%20${encodeURIComponent(company.entity_name)}`}
                      className="text-blue-600 hover:text-blue-700 font-medium">
                      Report an issue
                    </a>
                  </span>
                  <span className="text-gray-400">Entity ID · {company.entity_id}</span>
                </section>
              </div>

              {/* -------- SIDEBAR -------- */}
              <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                {/* Links */}
                <SidebarBlock title="Links">
                  <ul className="space-y-1.5 text-sm">
                    {websiteToShow && <LinkRow icon="globe" href={websiteToShow} label={stripUrl(websiteToShow)} />}
                    {company.twitter_handle && (
                      <LinkRow icon="twitter" href={`https://twitter.com/${company.twitter_handle.replace(/^@/, '')}`} label={`@${company.twitter_handle.replace(/^@/, '')}`} />
                    )}
                    {company.github_org && (
                      <LinkRow icon="github" href={`https://github.com/${company.github_org}`} label={company.github_org} />
                    )}
                    {company.linkedin_url && <LinkRow icon="linkedin" href={company.linkedin_url} label="LinkedIn" />}
                    {company.discord_url && <LinkRow icon="discord" href={company.discord_url} label="Discord" />}
                    {company.telegram_url && <LinkRow icon="telegram" href={company.telegram_url} label="Telegram" />}
                    {company.farcaster_handle && (
                      <LinkRow icon="farcaster" href={`https://warpcast.com/${company.farcaster_handle.replace(/^@/, '')}`} label={`@${company.farcaster_handle.replace(/^@/, '')}`} />
                    )}
                  </ul>
                  {!websiteToShow && !company.twitter_handle && !company.github_org &&
                    !company.linkedin_url && !company.discord_url && !company.telegram_url &&
                    !company.farcaster_handle && (
                    <p className="text-xs text-gray-400">No links on file yet.</p>
                  )}
                </SidebarBlock>

                {/* Founders */}
                {company.founders && company.founders.length > 0 && (
                  <SidebarBlock title="Founders">
                    <ul className="space-y-1.5 text-sm text-gray-700">
                      {company.founders.map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold flex items-center justify-center">
                            {initials(f)}
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </SidebarBlock>
                )}

                {/* Tags */}
                {company.tags && company.tags.length > 0 && (
                  <SidebarBlock title="Tags">
                    <div className="flex flex-wrap gap-1">
                      {company.tags.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </SidebarBlock>
                )}

                {/* Related */}
                {related.length > 0 && (
                  <SidebarBlock title="Related companies">
                    <ul className="space-y-1.5">
                      {related.map((r) => (
                        <li key={r.entity_id}>
                          <Link href={`/company/${r.entity_id}`}
                            className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 transition-colors group">
                            {r.logo_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={r.logo_url} alt="" className="w-5 h-5 rounded object-contain bg-white border border-gray-200" />
                            ) : (
                              <span className="w-5 h-5 rounded bg-gray-200 text-[9px] font-bold text-gray-500 flex items-center justify-center">
                                {initials(r.entity_name)}
                              </span>
                            )}
                            <span className="truncate group-hover:underline">{r.entity_name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </SidebarBlock>
                )}
              </aside>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024–2026 CanHav Research. All rights reserved.</p>
            <p className="mt-2 text-sm">Making understanding and building with Ethereum easier</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Small presentational helpers (inline to avoid a proliferation of tiny files)
// -----------------------------------------------------------------------------

function Fact({ icon, label, value }: { icon: 'pin' | 'calendar' | 'dollar' | 'tag'; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-gray-600">
      <FactIcon name={icon} />
      <span className="text-gray-400">{label}:</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}

function FactIcon({ name }: { name: 'pin' | 'calendar' | 'dollar' | 'tag' }) {
  const common = 'w-3.5 h-3.5 text-gray-400'
  if (name === 'pin')
    return (
      <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  if (name === 'calendar')
    return (
      <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  if (name === 'dollar')
    return (
      <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    )
  return (
    <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a2 2 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )
}

function SidebarBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{title}</h3>
      {children}
    </section>
  )
}

function LinkRow({ icon, href, label }: { icon: string; href: string; label: string }) {
  return (
    <li>
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors">
        <LinkIcon name={icon} />
        <span className="truncate">{label}</span>
      </a>
    </li>
  )
}

function LinkIcon({ name }: { name: string }) {
  const common = 'w-3.5 h-3.5 text-gray-400 flex-shrink-0'
  switch (name) {
    case 'globe':
      return (
        <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
        </svg>
      )
    case 'twitter':
      return (
        <svg className={common} fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )
    case 'github':
      return (
        <svg className={common} fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 007.86 10.91c.58.1.79-.25.79-.56v-2.2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.03 1.78 2.7 1.27 3.36.97.1-.75.4-1.27.73-1.56-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.2-3.1-.12-.3-.52-1.48.12-3.08 0 0 .98-.31 3.2 1.18a11.1 11.1 0 015.83 0c2.22-1.49 3.2-1.18 3.2-1.18.64 1.6.24 2.78.12 3.08.74.81 1.2 1.84 1.2 3.1 0 4.43-2.7 5.4-5.27 5.69.42.36.78 1.07.78 2.17v3.22c0 .31.21.66.8.55A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg className={common} fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554V14.83c0-1.34-.027-3.066-1.868-3.066-1.87 0-2.156 1.46-2.156 2.97v5.719H9.317V9h3.415v1.561h.048c.476-.9 1.637-1.848 3.37-1.848 3.604 0 4.27 2.37 4.27 5.455v6.284zM5.337 7.433a2.062 2.062 0 11-.002-4.124 2.062 2.062 0 01.002 4.124zM6.814 20.452H3.857V9h2.957v11.452z" />
        </svg>
      )
    case 'discord':
      return (
        <svg className={common} fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.735 19.735 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.3 14.3 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.927 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.077.077 0 00-.04.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.84 19.84 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.548-13.66a.06.06 0 00-.031-.027zM8.02 15.33c-1.182 0-2.157-1.086-2.157-2.42 0-1.332.956-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.956 2.42-2.157 2.42zm7.974 0c-1.183 0-2.157-1.086-2.157-2.42 0-1.332.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.946 2.42-2.157 2.42z" />
        </svg>
      )
    case 'telegram':
      return (
        <svg className={common} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.9 8.24l-1.97 9.3c-.15.66-.54.82-1.09.51l-3-2.21-1.45 1.4c-.16.16-.3.3-.6.3l.21-3.03 5.52-4.98c.24-.22-.05-.34-.37-.13l-6.82 4.3-2.94-.92c-.64-.2-.65-.64.13-.94l11.5-4.43c.53-.2 1 .13.87.93z" />
        </svg>
      )
    case 'farcaster':
      return (
        <svg className={common} fill="currentColor" viewBox="0 0 225 225">
          <path d="M49 24h127v177h-22v-82h-.22a42.5 42.5 0 0 0-82.56 0H71v82H49V24Zm-11 11H11v21h11v145h27v-22H38V35Zm176 0h-27v145h-11v22h27v-22h11V35Z" />
        </svg>
      )
    default:
      return null
  }
}
