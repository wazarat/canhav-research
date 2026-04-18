import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { useRealtimeTables } from '../../lib/useRealtimeTables'

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
}

interface SectorDetail {
  sector_name: string
  table_name: string
  fields: Record<string, string>
}

interface CompanyDetail {
  entity_id: number
  entity_name: string
  classifications: Classification[]
  sector_details: SectorDetail[]
}

const SECTOR_COLOR_MAP: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  'Core Protocol Architecture':       { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-200' },
  'Rollup & Scaling Frameworks':      { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500',  border: 'border-violet-200' },
  'Monetary & Access Rails':          { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  'DeFi Systems Architecture':        { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500',  border: 'border-orange-200' },
  'Data & Consensus Infrastructure':  { bg: 'bg-cyan-50',    text: 'text-cyan-700',    dot: 'bg-cyan-500',    border: 'border-cyan-200' },
  'Advanced Compute & Integration':   { bg: 'bg-pink-50',    text: 'text-pink-700',    dot: 'bg-pink-500',    border: 'border-pink-200' },
  'Governance & Enterprise Framework':{ bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-200' },
}
const FALLBACK = { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400', border: 'border-gray-200' }

export default function CompanyDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [company, setCompany] = useState<CompanyDetail | null>(null)
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

  // Hoisted so mount and Realtime both refetch via one function.
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

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  // Subscribe to Supabase Realtime — any change to the entities table or
  // its classifications (including child entities for collapsed parents)
  // re-pulls /api/company/[id] so the page stays live without a reload.
  // The refetch itself is server-side and already filters to this entity's
  // root, so a broad channel is fine and keeps the code simple.
  useRealtimeTables(
    ['entities', 'entity_classifications'],
    fetchCompany,
    { channelName: id ? `company-detail-${id}` : undefined }
  )

  const getColor = (sector: string) => SECTOR_COLOR_MAP[sector] ?? FALLBACK

  // Convert snake_case column names to readable labels
  const formatFieldName = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  // Get unique sectors this entity belongs to
  const uniqueSectors = company
    ? Array.from(new Set(company.classifications.map(c => c.sector_name)))
    : []

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{company ? `${company.entity_name} — CanHav Research` : 'Company Detail — CanHav Research'}</title>
        <meta name="description" content={company ? `Detailed profile for ${company.entity_name} in the Ethereum Infrastructure Atlas` : ''} />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
              CanHav Research
            </Link>
            <nav className="hidden lg:flex items-center space-x-8">
              {navItems.map((item) =>
                item.external ? (
                  <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600 transition-colors duration-200 relative group">
                    {item.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
                  </a>
                ) : (
                  <Link key={item.name} href={item.href}
                    className="text-gray-600 hover:text-blue-600 transition-colors duration-200 relative group">
                    {item.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
                  </Link>
                )
              )}
              <Link href="/contact">
                <button className="ml-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-all duration-200 shadow-lg hover:shadow-xl">
                  Contact Us
                </button>
              </Link>
            </nav>
            <button className="lg:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
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
                  <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer"
                    className="block py-2 text-gray-600 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>
                    {item.name}
                  </a>
                ) : (
                  <Link key={item.name} href={item.href}
                    className="block py-2 text-gray-600 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>
                    {item.name}
                  </Link>
                )
              )}
            </nav>
          )}
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Back link */}
        <Link href="/market-map" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors">
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
          <div className="space-y-8">
            {/* Entity Header */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{company.entity_name}</h1>

              {/* Sector badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                {uniqueSectors.map(sector => {
                  const color = getColor(sector)
                  return (
                    <span key={sector} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${color.bg} ${color.text}`}>
                      <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                      {sector}
                    </span>
                  )
                })}
              </div>

              {/* Quick info from first classification */}
              {company.classifications[0]?.website && (
                <a
                  href={company.classifications[0].website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {company.classifications[0].website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
              {company.classifications[0]?.maintaining_organization && (
                <p className="text-sm text-gray-500 mt-2">
                  <span className="font-medium text-gray-700">Maintained by:</span> {company.classifications[0].maintaining_organization}
                </p>
              )}
            </div>

            {/* Classifications — one card per subsector this entity belongs to */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Sector Classifications
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({company.classifications.length} {company.classifications.length === 1 ? 'classification' : 'classifications'})
                </span>
              </h2>

              <div className="space-y-6">
                {company.classifications.map((cls) => {
                  const color = getColor(cls.sector_name)
                  return (
                    <div key={cls.entity_classification_id} className={`bg-white rounded-xl border ${color.border} shadow-sm overflow-hidden`}>
                      {/* Sector / Subsector header bar */}
                      <div className={`${color.bg} px-6 py-3 flex items-center gap-3`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                        <span className={`text-sm font-semibold ${color.text}`}>{cls.sector_name}</span>
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className={`text-sm font-medium ${color.text}`}>{cls.subsector_name}</span>
                      </div>

                      <div className="p-6 space-y-5">
                        {/* Description */}
                        {cls.description && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Description</h4>
                            <p className="text-gray-700 leading-relaxed text-sm">{cls.description}</p>
                          </div>
                        )}

                        {/* Reason for Inclusion */}
                        {cls.reason_for_inclusion && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Reason for Inclusion</h4>
                            <div className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">{cls.reason_for_inclusion}</div>
                          </div>
                        )}

                        {/* Practitioner's Note */}
                        {cls.practitioners_note && (
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Practitioner&apos;s Note</h4>
                            <p className="text-gray-700 leading-relaxed text-sm italic">{cls.practitioners_note}</p>
                          </div>
                        )}

                        {/* Validation Check */}
                        {cls.practitioner_validation_check && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Validation Check</h4>
                            <p className="text-gray-600 leading-relaxed text-sm">{cls.practitioner_validation_check}</p>
                          </div>
                        )}

                        {/* Website + Org row */}
                        <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100 text-xs text-gray-500">
                          {cls.website && (
                            <a href={cls.website} target="_blank" rel="noopener noreferrer"
                              className="hover:text-blue-600 transition-colors flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              {cls.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                            </a>
                          )}
                          {cls.maintaining_organization && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                              </svg>
                              {cls.maintaining_organization}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sector-Specific Detail Data */}
            {company.sector_details && company.sector_details.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Sector-Specific Data
                </h2>
                <div className="space-y-6">
                  {company.sector_details.map((detail) => {
                    const color = getColor(detail.sector_name)
                    const entries = Object.entries(detail.fields)
                    return (
                      <div key={detail.table_name} className={`bg-white rounded-xl border ${color.border} shadow-sm overflow-hidden`}>
                        <div className={`${color.bg} px-6 py-3 flex items-center gap-3`}>
                          <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                          <span className={`text-sm font-semibold ${color.text}`}>{detail.sector_name}</span>
                          <span className="text-xs text-gray-400 ml-auto">{entries.length} fields</span>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {entries.map(([key, value]) => {
                              const isLong = value.length > 120
                              return (
                                <div key={key} className={isLong ? 'md:col-span-2' : ''}>
                                  <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
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
              </div>
            )}

            {/* Cross-sector note if entity appears in multiple sectors */}
            {uniqueSectors.length > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-blue-900 text-sm mb-1">Cross-Sector Entity</h4>
                    <p className="text-blue-800 text-sm leading-relaxed">
                      <strong>{company.entity_name}</strong> is classified across <strong>{uniqueSectors.length}</strong> sectors
                      and <strong>{company.classifications.length}</strong> subsectors, reflecting its multi-faceted role in the Ethereum infrastructure.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024–2026 CanHav Research. All rights reserved.</p>
            <p className="mt-2 text-sm">Making understanding and building with ethereum easier</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
