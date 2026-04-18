import Layout from '../components/Layout'
import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * Homepage — Market-Map-first.
 *
 * Before M2, the hero was a generic "research / enterprise" pitch. The
 * pivot: the Market Map is what gets users in the door, so:
 *
 *   * Hero headline is explicitly about market research, with Market Map
 *     as the primary product.
 *   * Two equal-weight CTAs — /market-map and research.canhav.com.
 *   * Preview strip underneath: a snapshot of the Landscape view (read-
 *     only chips) so visitors see what the map looks like before
 *     clicking through.
 *   * "Why" block tightened to 3 items tied to the map + research.
 *
 * Data for the preview strip is pulled from /api/companies (same grid
 * feed as /market-map). Fails silently — the block renders skeleton
 * placeholders if the fetch fails.
 */

const SECTOR_ACCENT: Record<string, string> = {
  'Core Protocol Architecture': '#3b82f6',
  'Rollup & Scaling Frameworks': '#8b5cf6',
  'Monetary & Access Rails': '#10b981',
  'DeFi Systems Architecture': '#f97316',
  'Data & Consensus Infrastructure': '#06b6d4',
  'Advanced Compute & Integration': '#ec4899',
  'Governance & Enterprise Framework': '#f59e0b',
}

interface PreviewCompany {
  entity_id: number
  name: string
  sector: string
  subsectors: string[]
}

interface PreviewData {
  totalCompanies: number
  totalSectors: number
  bySector: Record<string, PreviewCompany[]>
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)

  useEffect(() => {
    setMounted(true)
    fetch('/api/companies', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => {
        const rows = (body.companies ?? []) as Array<{
          entity_id: number
          name: string
          sector: string
          subsectors?: string[]
        }>
        const bySector: Record<string, PreviewCompany[]> = {}
        for (const c of rows) {
          if (!c.sector) continue
          if (!bySector[c.sector]) bySector[c.sector] = []
          bySector[c.sector].push({
            entity_id: c.entity_id,
            name: c.name,
            sector: c.sector,
            subsectors: c.subsectors ?? [],
          })
        }
        setPreview({
          totalCompanies: rows.length,
          totalSectors: Object.keys(bySector).length,
          bySector,
        })
      })
      .catch(() => setPreview(null))
  }, [])

  if (!mounted) return null

  return (
    <Layout>
      <div className="relative overflow-hidden">
        {/* ================== HERO ================== */}
        <section className="relative pt-20 pb-14 sm:pt-28 sm:pb-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs font-medium border border-blue-400/20 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Live · updated weekly
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                <span className="gradient-text">Market research</span>
                <br />
                <span className="text-white">for Ethereum builders</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-3 max-w-2xl mx-auto">
                One map of every company building the Ethereum stack,
                backed by deep sector research.
              </p>
              <p className="text-sm md:text-base text-gray-400 mb-10 max-w-2xl mx-auto">
                Browse the market map to find projects by sector, or read
                our research to understand where the stack is heading.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center max-w-xl mx-auto">
                <Link
                  href="/market-map"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-base font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-blue-500/25"
                >
                  Explore the Market Map
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <a
                  href="https://research.canhav.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 border-2 border-gray-700 hover:border-blue-400 text-gray-200 hover:text-blue-300 rounded-lg text-base font-semibold transition-all duration-300 hover:bg-blue-400/5"
                >
                  Read research
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              {preview && (
                <p className="text-xs text-gray-500 mt-5">
                  {preview.totalCompanies} companies across{' '}
                  {preview.totalSectors} sectors
                </p>
              )}
            </div>
          </div>

          {/* Background ornaments (unchanged theme from before) */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/4 -right-40 w-96 h-96 bg-blue-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute top-1/3 -left-40 w-96 h-96 bg-blue-800/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
          </div>
        </section>

        {/* ================== PREVIEW STRIP ================== */}
        <section className="pb-20">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    A glance at the map
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Seven sectors, hundreds of companies. Click into any
                    project for classifications, funding, and sector-specific data.
                  </p>
                </div>
                <Link
                  href="/market-map"
                  className="text-sm font-medium text-blue-300 hover:text-blue-200 inline-flex items-center gap-1"
                >
                  Open full map
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>

              <div className="relative rounded-2xl border border-gray-800/70 bg-gray-900/40 backdrop-blur p-4 md:p-6">
                {preview ? (
                  <div className="columns-1 sm:columns-2 md:columns-3 xl:columns-4 gap-3 [column-fill:_balance]">
                    {Object.entries(preview.bySector)
                      .sort((a, b) => b[1].length - a[1].length)
                      .slice(0, 8)
                      .map(([sector, list]) => (
                        <SectorPreviewPanel
                          key={sector}
                          sector={sector}
                          companies={list.slice(0, 12)}
                          total={list.length}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="animate-pulse rounded-xl bg-gray-800/50 h-36"
                      />
                    ))}
                  </div>
                )}

                {/* Fade + CTA */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gray-900/90 to-transparent rounded-b-2xl" />
              </div>
            </div>
          </div>
        </section>

        {/* ================== WHY ================== */}
        <section className="py-16 bg-gray-900/50">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-3">
                  Market research built for decisions
                </h2>
                <p className="text-gray-400 text-base max-w-2xl mx-auto">
                  The Map + the research together: where to look, and what it means.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <FeatureCard
                  title="Every project in one place"
                  body="Multi-sector entities show up everywhere they belong — no double counting on the headlines, full tagging on the card."
                />
                <FeatureCard
                  title="Practitioner-validated"
                  body="Classifications are reviewed by working builders, not scraped. Each subsector has its own notes and validation check."
                />
                <FeatureCard
                  title="Research that goes deeper"
                  body={
                    <>
                      Pair the map with{' '}
                      <a
                        href="https://research.canhav.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-300 hover:text-blue-200 underline underline-offset-2"
                      >
                        research.canhav.com
                      </a>{' '}
                      for monthly sector deep-dives and primers.
                    </>
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* ================== FINAL CTA ================== */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Start with the map.
              </h2>
              <p className="text-gray-400 mb-8">
                It&apos;s free to browse. Sign in to see full company profiles,
                save favourites, and get research updates.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/market-map"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Open Market Map
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3 border border-gray-700 hover:border-blue-400 text-gray-200 hover:text-blue-300 rounded-lg font-semibold transition-colors"
                >
                  Create free account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  )
}

function SectorPreviewPanel({
  sector,
  companies,
  total,
}: {
  sector: string
  companies: PreviewCompany[]
  total: number
}) {
  const accent = SECTOR_ACCENT[sector] ?? '#6b7280'
  return (
    <div className="break-inside-avoid mb-3 rounded-xl bg-gray-800/50 border border-gray-700/60 overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-700/60">
        <span
          className="w-1 h-3.5 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <h3 className="text-xs font-semibold text-gray-200 flex-1 truncate">
          {sector}
        </h3>
        <span className="text-[10px] text-gray-400">{total}</span>
      </div>
      <div className="p-2 flex flex-wrap gap-1">
        {companies.map((c) => (
          <span
            key={c.entity_id}
            className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-md bg-gray-900/60 border border-gray-700/60 text-[11px] text-gray-300"
          >
            <span
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <span className="truncate max-w-[120px]">{c.name}</span>
          </span>
        ))}
        {total > companies.length && (
          <span className="inline-flex items-center px-1.5 py-[1px] rounded-md bg-gray-900/40 text-[11px] text-gray-500 italic">
            +{total - companies.length}
          </span>
        )}
      </div>
    </div>
  )
}

function FeatureCard({
  title,
  body,
}: {
  title: string
  body: React.ReactNode
}) {
  return (
    <div className="glass rounded-xl p-6 border border-white/5 hover:border-blue-500/30 transition-colors">
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
    </div>
  )
}
