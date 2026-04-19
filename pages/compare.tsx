import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

/**
 * /compare?ids=a,b — side-by-side comparison of two companies.
 *
 * The page renders two columns of the same field rows (name, sector,
 * HQ, founding year, funding, website, etc.), highlighting rows where
 * the two companies diverge so users can spot differences at a glance.
 *
 * No sign-in required — the underlying /api/company/[id] endpoint is
 * public and the comparison is valuable as a shareable research view.
 * If you arrived here via the saved-page workflow, the star button up
 * top lets you drop companies back out of the comparison.
 */

interface EntityClassification {
  entity_classification_id: number
  entity_id: number
  entity_name: string
  is_primary: boolean
  sector_id: number
  sector_name: string
  subsector_id: number
  subsector_name: string
  description: string
  website: string
  maintaining_organization: string
  reason_for_inclusion: string
  practitioners_note: string
  practitioner_validation_check: string
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
  classifications: EntityClassification[]
}

const SECTOR_ACCENT: Record<string, string> = {
  'Core Protocol Architecture': '#3b82f6',
  'Rollup & Scaling Frameworks': '#8b5cf6',
  'Monetary & Access Rails': '#10b981',
  'DeFi Systems Architecture': '#f97316',
  'Data & Consensus Infrastructure': '#06b6d4',
  'Advanced Compute & Integration': '#ec4899',
  'Governance & Enterprise Framework': '#f59e0b',
}

// Row definitions for the field-by-field comparison table. Keeps the
// data-fetching and the render wiring decoupled.
type Row = {
  label: string
  pick: (c: CompanyDetail) => React.ReactNode
  // Raw comparable value for the "different?" highlight.
  raw?: (c: CompanyDetail) => string | null
  section: 'overview' | 'company' | 'funding' | 'ecosystem' | 'links'
}

const ROWS: Row[] = [
  {
    section: 'overview',
    label: 'Primary sector',
    pick: (c) => c.classifications.find((x) => x.is_primary)?.sector_name ?? '—',
    raw: (c) => c.classifications.find((x) => x.is_primary)?.sector_name ?? null,
  },
  {
    section: 'overview',
    label: 'Primary subsector',
    pick: (c) => c.classifications.find((x) => x.is_primary)?.subsector_name ?? '—',
    raw: (c) => c.classifications.find((x) => x.is_primary)?.subsector_name ?? null,
  },
  {
    section: 'overview',
    label: 'All sectors',
    pick: (c) => {
      const s = Array.from(new Set(c.classifications.map((x) => x.sector_name))).sort()
      return s.length ? s.join(' · ') : '—'
    },
    raw: (c) => Array.from(new Set(c.classifications.map((x) => x.sector_name))).sort().join('|'),
  },
  {
    section: 'overview',
    label: 'All subsectors',
    pick: (c) => {
      const s = Array.from(new Set(c.classifications.map((x) => x.subsector_name))).sort()
      return s.length ? s.join(' · ') : '—'
    },
    raw: (c) => Array.from(new Set(c.classifications.map((x) => x.subsector_name))).sort().join('|'),
  },
  {
    section: 'overview',
    label: 'Description',
    pick: (c) => c.long_description ?? c.classifications.find((x) => x.is_primary)?.description ?? '—',
    raw: (c) => c.long_description ?? c.classifications.find((x) => x.is_primary)?.description ?? null,
  },
  { section: 'company', label: 'HQ', pick: (c) => c.hq_location ?? '—', raw: (c) => c.hq_location ?? null },
  { section: 'company', label: 'Founded', pick: (c) => c.year_founded ?? '—', raw: (c) => (c.year_founded ? String(c.year_founded) : null) },
  { section: 'company', label: 'Status', pick: (c) => c.status ?? '—', raw: (c) => c.status ?? null },
  { section: 'company', label: 'Founders', pick: (c) => formatList(c.founders), raw: (c) => listKey(c.founders) },
  { section: 'company', label: 'Maintaining org', pick: (c) => c.classifications.find((x) => x.is_primary)?.maintaining_organization || '—', raw: (c) => c.classifications.find((x) => x.is_primary)?.maintaining_organization || null },

  { section: 'funding', label: 'Stage', pick: (c) => c.funding_stage ?? '—', raw: (c) => c.funding_stage ?? null },
  {
    section: 'funding',
    label: 'Total funding',
    pick: (c) => formatUsd(c.total_funding_usd),
    raw: (c) => (c.total_funding_usd != null ? String(c.total_funding_usd) : null),
  },
  {
    section: 'funding',
    label: 'Last round',
    pick: (c) => c.last_funding_date ?? '—',
    raw: (c) => c.last_funding_date ?? null,
  },
  { section: 'funding', label: 'Investors', pick: (c) => formatList(c.investors), raw: (c) => listKey(c.investors) },

  { section: 'ecosystem', label: 'Token', pick: (c) => c.token_symbol ?? '—', raw: (c) => c.token_symbol ?? null },
  { section: 'ecosystem', label: 'Chains', pick: (c) => formatList(c.chains), raw: (c) => listKey(c.chains) },
  { section: 'ecosystem', label: 'Tags', pick: (c) => formatList(c.tags), raw: (c) => listKey(c.tags) },

  {
    section: 'links',
    label: 'Website',
    pick: (c) =>
      c.canonical_website ? (
        <a href={c.canonical_website} target="_blank" rel="noreferrer noopener" className="text-blue-600 hover:underline break-all">
          {c.canonical_website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
        </a>
      ) : (
        '—'
      ),
    raw: (c) => c.canonical_website ?? null,
  },
  {
    section: 'links',
    label: 'Twitter',
    pick: (c) =>
      c.twitter_handle ? (
        <a href={`https://twitter.com/${c.twitter_handle.replace('@', '')}`} target="_blank" rel="noreferrer noopener" className="text-blue-600 hover:underline">
          @{c.twitter_handle.replace('@', '')}
        </a>
      ) : (
        '—'
      ),
    raw: (c) => c.twitter_handle ?? null,
  },
  {
    section: 'links',
    label: 'GitHub',
    pick: (c) =>
      c.github_org ? (
        <a href={`https://github.com/${c.github_org}`} target="_blank" rel="noreferrer noopener" className="text-blue-600 hover:underline">
          {c.github_org}
        </a>
      ) : (
        '—'
      ),
    raw: (c) => c.github_org ?? null,
  },
  {
    section: 'links',
    label: 'LinkedIn',
    pick: (c) =>
      c.linkedin_url ? (
        <a href={c.linkedin_url} target="_blank" rel="noreferrer noopener" className="text-blue-600 hover:underline break-all">
          {c.linkedin_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
        </a>
      ) : (
        '—'
      ),
    raw: (c) => c.linkedin_url ?? null,
  },
]

const SECTION_TITLES: Record<Row['section'], string> = {
  overview: 'Overview',
  company: 'Company',
  funding: 'Funding',
  ecosystem: 'Ecosystem',
  links: 'Links',
}

export default function ComparePage() {
  const router = useRouter()
  const { ids } = router.query
  const idList = useMemo(() => {
    const raw = typeof ids === 'string' ? ids : Array.isArray(ids) ? ids.join(',') : ''
    return raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n))
      .slice(0, 2)
  }, [ids])

  const [left, setLeft] = useState<CompanyDetail | null>(null)
  const [right, setRight] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!router.isReady) return
    if (idList.length < 2) {
      setLoading(false)
      setError('Select two companies to compare.')
      return
    }
    setLoading(true)
    setError(null)
    Promise.all(idList.map((id) => fetch(`/api/company/${id}`).then((r) => (r.ok ? r.json() : null))))
      .then(([a, b]) => {
        setLeft(a)
        setRight(b)
        if (!a || !b) setError('One or both companies could not be loaded.')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Comparison failed.'))
      .finally(() => setLoading(false))
  }, [router.isReady, idList])

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Market Map', href: '/market-map' },
    { name: 'Saved', href: '/saved' },
    { name: 'Research', href: 'https://research.canhav.com', external: true },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>
          {left && right ? `${left.entity_name} vs ${right.entity_name}` : 'Compare companies'} · CanHav Research
        </title>
      </Head>

      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
            CanHav Research
          </Link>
          <nav className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) =>
              item.external ? (
                <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition-colors">
                  {item.name}
                </a>
              ) : (
                <Link key={item.name} href={item.href} className="text-gray-600 hover:text-blue-600 transition-colors">
                  {item.name}
                </Link>
              )
            )}
          </nav>
          <button className="lg:hidden p-2" onClick={() => setMenuOpen((o) => !o)}>
            <div className="w-6 h-6 flex flex-col justify-center items-center">
              <span className={`block w-6 h-0.5 bg-gray-600 transition-all ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block w-6 h-0.5 bg-gray-600 mt-1 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-6 h-0.5 bg-gray-600 mt-1 transition-all ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-5">
          <Link href="/saved" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Saved
          </Link>
        </div>

        {loading && (
          <div className="text-center py-20 text-sm text-gray-500">Loading comparison…</div>
        )}

        {!loading && error && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            {error}{' '}
            <Link href="/saved" className="underline font-medium">
              Go back to picks
            </Link>
            .
          </div>
        )}

        {!loading && left && right && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <CompanyHeader company={left} />
              <CompanyHeader company={right} />
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              {(Object.keys(SECTION_TITLES) as Row['section'][]).map((section) => {
                const rows = ROWS.filter((r) => r.section === section)
                return (
                  <div key={section}>
                    <div className="px-5 py-2.5 bg-gray-50/70 border-b border-t border-gray-100 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      {SECTION_TITLES[section]}
                    </div>
                    <div>
                      {rows.map((row) => {
                        const rawL = row.raw ? row.raw(left) : null
                        const rawR = row.raw ? row.raw(right) : null
                        const isDiff = rawL !== rawR && (rawL || rawR)
                        return (
                          <div
                            key={row.label}
                            className="grid grid-cols-[140px_1fr_1fr] border-b border-gray-100 last:border-b-0"
                          >
                            <div className="px-5 py-3 text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50/40 border-r border-gray-100">
                              {row.label}
                            </div>
                            <CompareCell highlight={!!isDiff}>{row.pick(left)}</CompareCell>
                            <CompareCell highlight={!!isDiff} borderLeft>
                              {row.pick(right)}
                            </CompareCell>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 text-xs text-gray-500">
              Rows with coloured pills highlight where the two companies
              diverge. <Link href="/saved" className="text-blue-600 hover:underline">Pick a different pair</Link>.
            </div>
          </>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="container mx-auto px-6 py-6 text-center text-xs text-gray-500">
          © 2024–2026 CanHav Research. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

function CompareCell({ children, highlight, borderLeft }: { children: React.ReactNode; highlight: boolean; borderLeft?: boolean }) {
  return (
    <div
      className={`px-5 py-3 text-sm text-gray-800 ${borderLeft ? 'border-l border-gray-100' : ''} ${
        highlight ? 'bg-amber-50/40' : ''
      }`}
    >
      {children}
    </div>
  )
}

function CompanyHeader({ company }: { company: CompanyDetail }) {
  const primary = company.classifications.find((c) => c.is_primary)
  const accent = primary ? SECTOR_ACCENT[primary.sector_name] ?? '#9ca3af' : '#9ca3af'
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span aria-hidden className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: accent }} />
        <Logo logo_url={company.logo_url} initials={initials(company.entity_name)} accent={accent} size={40} />
        <div className="min-w-0">
          <Link href={`/company/${company.entity_id}`} className="text-base font-semibold text-gray-900 hover:text-blue-600 truncate block">
            {company.entity_name}
          </Link>
          <div className="text-[12px] text-gray-500 truncate mt-0.5">
            {primary ? `${primary.sector_name} · ${primary.subsector_name}` : 'Unclassified'}
          </div>
        </div>
      </div>
    </div>
  )
}

function Logo({ logo_url, initials, accent, size = 28 }: { logo_url: string | null; initials: string; accent: string; size?: number }) {
  const [broken, setBroken] = useState(false)
  const s = { width: size, height: size }
  if (logo_url && !broken) {
    return (
      <span className="shrink-0 rounded-md overflow-hidden bg-white border border-gray-100 flex items-center justify-center" style={s}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo_url} alt="" className="w-full h-full object-contain" onError={() => setBroken(true)} loading="lazy" />
      </span>
    )
  }
  return (
    <span
      aria-hidden
      className="shrink-0 rounded-md flex items-center justify-center text-[11px] font-semibold text-white"
      style={{ ...s, backgroundColor: accent }}
    >
      {initials}
    </span>
  )
}

function initials(name: string): string {
  if (!name) return '?'
  const cleaned = name.replace(/[()\[\]]/g, ' ')
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function formatList(arr: string[] | null | undefined): string {
  if (!arr || arr.length === 0) return '—'
  return arr.join(', ')
}

function listKey(arr: string[] | null | undefined): string | null {
  if (!arr || arr.length === 0) return null
  return [...arr].sort().join('|')
}

function formatUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}
