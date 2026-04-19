import { useCallback, useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

/**
 * /saved — viewer's starred-company workbench.
 *
 * Lists every company the signed-in user has starred (oldest last). Users
 * can:
 *   * Unstar a company (removes the row instantly)
 *   * Select up to 2 companies and click "Compare" to open /compare?ids=a,b
 *
 * Anonymous viewers see a gentle sign-in prompt instead of an empty list.
 * No middleware gate on this path so we can render the empty-CTA for
 * unauthenticated visitors without a jarring redirect.
 */

interface SavedCompany {
  star_id: number
  entity_id: number
  name: string | null
  logo_url: string | null
  sector: string | null
  subsector: string | null
  sectors: string[] | null
  subsectors: string[] | null
  hq_location: string | null
  year_founded: number | null
  funding_stage: string | null
  canonical_website: string | null
  total_funding_usd: number | null
  status: string | null
  created_at: string
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

export default function SavedPage() {
  const router = useRouter()
  const [stars, setStars] = useState<SavedCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [menuOpen, setMenuOpen] = useState(false)

  const fetchStars = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/me/stars', { cache: 'no-store' })
      if (res.status === 401) {
        setSignedIn(false)
        setStars([])
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      setSignedIn(true)
      setStars(body.stars ?? [])
    } catch (err) {
      console.error('[saved] fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStars()
  }, [fetchStars])

  // Build a quick lookup so the compatibility logic below is O(1) per row.
  const byId = useMemo(() => {
    const m = new Map<number, SavedCompany>()
    for (const s of stars) m.set(s.entity_id, s)
    return m
  }, [stars])

  // Returns the set of subsectors shared with every already-selected entity.
  // Empty set => no shared subsector => the candidate can't be compared.
  const sharedSubsectorsWith = useCallback(
    (candidate: SavedCompany): Set<string> => {
      const candSubs = new Set((candidate.subsectors ?? []).filter(Boolean))
      if (candSubs.size === 0) return new Set()
      let acc: Set<string> | null = null
      for (const id of selected) {
        if (id === candidate.entity_id) continue
        const other = byId.get(id)
        if (!other) continue
        const otherSubs = new Set((other.subsectors ?? []).filter(Boolean))
        const intersection = new Set(
          [...candSubs].filter((x) => otherSubs.has(x))
        )
        acc = acc === null ? intersection : new Set([...acc].filter((x) => intersection.has(x)))
      }
      return acc ?? candSubs
    },
    [selected, byId]
  )

  const isRowLocked = useCallback(
    (s: SavedCompany): boolean => {
      if (selected.has(s.entity_id)) return false
      if (selected.size === 0) return false
      return sharedSubsectorsWith(s).size === 0
    },
    [selected, sharedSubsectorsWith]
  )

  const toggleSelect = useCallback(
    (entityId: number) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(entityId)) {
          next.delete(entityId)
          return next
        }
        // Block picks that would break the same-subsector invariant.
        const candidate = byId.get(entityId)
        if (candidate && prev.size > 0) {
          const locked =
            sharedSubsectorsWith(candidate).size === 0
          if (locked) return prev
        }
        // Cap at 2 selections — when you add a 3rd, drop the oldest.
        if (next.size >= 2) {
          const first = next.values().next().value
          if (typeof first === 'number') next.delete(first)
        }
        next.add(entityId)
        return next
      })
    },
    [byId, sharedSubsectorsWith]
  )

  const unstar = useCallback(async (entityId: number) => {
    setStars((prev) => prev.filter((s) => s.entity_id !== entityId))
    setSelected((prev) => {
      if (!prev.has(entityId)) return prev
      const next = new Set(prev)
      next.delete(entityId)
      return next
    })
    try {
      await fetch(`/api/me/stars/${entityId}`, { method: 'DELETE' })
    } catch (err) {
      console.error('[unstar]', err)
      fetchStars()
    }
  }, [fetchStars])

  const canCompare = selected.size === 2

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Market Map', href: '/market-map' },
    { name: 'Saved', href: '/saved' },
    { name: 'Research', href: 'https://research.canhav.com', external: true },
  ]

  const orderedSelected = useMemo(() => Array.from(selected), [selected])

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Saved companies · CanHav Research</title>
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
        {menuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="container mx-auto px-6 py-3 space-y-2">
              {navItems.map((item) => (
                <Link key={item.name} href={item.href} className="block py-1.5 text-gray-600 hover:text-blue-600" onClick={() => setMenuOpen(false)}>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
              Saved companies
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 max-w-xl">
              Pick any two companies that share a subsector to run a
              side-by-side comparison — that way every row in the comparison
              has data on both sides.
            </p>
          </div>
          <div className="text-xs text-gray-500">
            {loading
              ? 'Loading…'
              : `${stars.length} saved · ${selected.size} selected`}
          </div>
        </div>

        {!loading && !signedIn && (
          <SignedOutEmpty />
        )}

        {!loading && signedIn && stars.length === 0 && (
          <div className="text-center py-20 rounded-2xl border border-dashed border-gray-300 bg-white">
            <svg className="mx-auto h-10 w-10 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 15.27L16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" />
            </svg>
            <h3 className="mt-4 text-base font-medium text-gray-900">No saved companies yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Hit the star on any card or profile to add it here.
            </p>
            <Link
              href="/market-map"
              className="inline-block mt-4 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800"
            >
              Browse the Market Map
            </Link>
          </div>
        )}

        {!loading && signedIn && stars.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-[36px_minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_72px_minmax(0,1fr)_80px] gap-3 px-4 py-2 border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-400 bg-gray-50">
              <div>Pick</div>
              <div>Company</div>
              <div>Subsector</div>
              <div>HQ</div>
              <div>Founded</div>
              <div>Funding stage</div>
              <div className="text-right">Remove</div>
            </div>
            <ul className="divide-y divide-gray-100">
              {stars.map((s) => {
                const accent = s.sector ? SECTOR_ACCENT[s.sector] ?? '#9ca3af' : '#9ca3af'
                const isSelected = selected.has(s.entity_id)
                const locked = isRowLocked(s)
                const lockReason = locked
                  ? 'Compare only works within the same subsector as your current pick.'
                  : undefined
                return (
                  <li
                    key={s.star_id}
                    className={`${
                      isSelected
                        ? 'bg-blue-50/60'
                        : locked
                        ? 'opacity-60'
                        : 'hover:bg-gray-50/60'
                    } transition-colors`}
                    title={lockReason}
                  >
                    <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-[36px_minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_72px_minmax(0,1fr)_80px] gap-3 items-center">
                      <label className={`inline-flex items-center ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={locked}
                          onChange={() => toggleSelect(s.entity_id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                          aria-label={`Select ${s.name ?? 'company'} for comparison`}
                        />
                      </label>
                      <div className="flex items-center gap-3 min-w-0">
                        <span aria-hidden className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                        <Logo logo_url={s.logo_url} initials={initials(s.name ?? '?')} accent={accent} />
                        <div className="min-w-0">
                          <Link href={`/company/${s.entity_id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block">
                            {s.name ?? 'Untitled'}
                          </Link>
                          <div className="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                            {s.sector ?? '—'}
                          </div>
                        </div>
                      </div>
                      <div className="text-[12px] text-gray-700 truncate">{s.subsector || '—'}</div>
                      <div className="text-[12px] text-gray-600 truncate">{s.hq_location || '—'}</div>
                      <div className="text-[12px] text-gray-600">{s.year_founded ?? '—'}</div>
                      <div className="text-[12px] text-gray-600 truncate">{s.funding_stage || '—'}</div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => unstar(s.entity_id)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium text-gray-500 hover:text-red-600 hover:bg-red-50"
                          title="Remove from saved"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </main>

      {/* Sticky compare bar — appears once the user has at least one pick. */}
      {selected.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-white rounded-full shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {selected.size} of 2 selected
            {selected.size === 1 && (
              <span className="ml-1 text-gray-400">
                · pick a second in the same subsector
              </span>
            )}
          </span>
          <div className="h-4 w-px bg-gray-200" />
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-gray-600 hover:text-gray-900"
          >
            Clear
          </button>
          <button
            disabled={!canCompare}
            onClick={() => {
              if (!canCompare) return
              const ids = orderedSelected.join(',')
              router.push(`/compare?ids=${ids}`)
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              canCompare
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Compare →
          </button>
        </div>
      )}

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="container mx-auto px-6 py-6 text-center text-xs text-gray-500">
          © 2024–2026 CanHav Research. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

function SignedOutEmpty() {
  return (
    <div className="text-center py-16 rounded-2xl border border-dashed border-gray-300 bg-white">
      <svg className="mx-auto h-10 w-10 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 15.27L16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" />
      </svg>
      <h3 className="mt-4 text-base font-medium text-gray-900">Sign in to see your saved list</h3>
      <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
        The star button keeps track of companies you want to research further and
        powers the side-by-side comparison tool.
      </p>
      <Link
        href="/login?next=/saved"
        className="inline-block mt-4 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800"
      >
        Sign in
      </Link>
    </div>
  )
}

function Logo({ logo_url, initials, accent }: { logo_url: string | null; initials: string; accent: string }) {
  const [broken, setBroken] = useState(false)
  if (logo_url && !broken) {
    return (
      <span className="shrink-0 w-7 h-7 rounded-md overflow-hidden bg-white border border-gray-100 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo_url} alt="" className="w-full h-full object-contain" onError={() => setBroken(true)} loading="lazy" />
      </span>
    )
  }
  return (
    <span
      aria-hidden
      className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-semibold text-white"
      style={{ backgroundColor: accent }}
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
