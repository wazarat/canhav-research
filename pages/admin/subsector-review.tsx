import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface UnmatchedRow {
  id: number
  ingest_id: string
  subsector_id: number
  row_number: number
  raw: Record<string, string>
  candidate_entity_ids: number[]
  candidate_scores: Array<{
    entity_id: number
    entity_name: string
    score: number
    via: string
  }>
  resolution_status: string
  created_at: string
  subsectors: { subsector_name: string } | null
}

interface CompanySearchResult {
  entity_id: number
  entity_name: string
}

/**
 * /admin/subsector-review — super-admin review queue for rows that didn't
 * auto-match during ingest. Click to resolve to an existing entity or skip.
 */
export default function SubsectorReviewPage() {
  const [rows, setRows] = useState<UnmatchedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/subsector-ingest/unmatched', {
        credentials: 'include',
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      setRows(body.rows ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  async function resolve(id: number, entity_id: number) {
    const res = await fetch('/api/admin/subsector-ingest/unmatched', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'resolve', entity_id }),
    })
    if (!res.ok) {
      alert(`Resolve failed: ${(await res.json()).error ?? res.status}`)
      return
    }
    setRows((r) => r.filter((x) => x.id !== id))
  }

  async function skip(id: number) {
    const res = await fetch('/api/admin/subsector-ingest/unmatched', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'skip' }),
    })
    if (!res.ok) {
      alert(`Skip failed: ${(await res.json()).error ?? res.status}`)
      return
    }
    setRows((r) => r.filter((x) => x.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Head>
        <title>Review unmatched · Admin</title>
      </Head>
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Review unmatched rows</h1>
            <p className="text-sm text-gray-500">
              Subsector ingest rows that didn&apos;t match automatically.
            </p>
          </div>
          <Link href="/admin/subsector-ingest" className="text-sm text-blue-600 hover:text-blue-700">
            ← Ingest page
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-gray-500">No pending rows.</p>
        )}

        {rows.map((row) => (
          <ReviewCard key={row.id} row={row} onResolve={resolve} onSkip={skip} />
        ))}
      </main>
    </div>
  )
}

function ReviewCard({
  row,
  onResolve,
  onSkip,
}: {
  row: UnmatchedRow
  onResolve: (id: number, entity_id: number) => void
  onSkip: (id: number) => void
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<CompanySearchResult[]>([])
  const firstCandidate = row.candidate_scores[0]

  useEffect(() => {
    if (!search.trim() || search.trim().length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/companies?search=${encodeURIComponent(search)}&limit=8`,
          { credentials: 'include' }
        )
        const body = await res.json()
        setResults(
          (body.rows ?? []).map((r: { entity_id: number; entity_name: string }) => ({
            entity_id: r.entity_id,
            entity_name: r.entity_name,
          }))
        )
      } catch {
        setResults([])
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-gray-500">{row.subsectors?.subsector_name ?? `#${row.subsector_id}`} · row {row.row_number + 1}</div>
          <h3 className="text-base font-semibold mt-0.5">
            {row.raw.Entity ?? Object.values(row.raw)[0] ?? '(no name)'}
          </h3>
          {row.raw.Website && (
            <a
              href={row.raw.Website}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {row.raw.Website}
            </a>
          )}
        </div>
        <button
          onClick={() => onSkip(row.id)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Skip
        </button>
      </div>

      {row.candidate_scores.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium text-gray-500 mb-1">Suggested candidates</div>
          <div className="flex flex-wrap gap-2">
            {row.candidate_scores.map((c) => (
              <button
                key={c.entity_id}
                onClick={() => onResolve(row.id, c.entity_id)}
                className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300"
              >
                {c.entity_name}{' '}
                <span className="text-gray-400">· {(c.score * 100).toFixed(0)}%</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        <div className="text-xs font-medium text-gray-500 mb-1">Or search</div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entities by name…"
          className="w-full rounded-md border-gray-300 text-sm"
        />
        {results.length > 0 && (
          <div className="mt-2 border border-gray-200 rounded-md divide-y">
            {results.map((r) => (
              <button
                key={r.entity_id}
                onClick={() => onResolve(row.id, r.entity_id)}
                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50"
              >
                {r.entity_name} <span className="text-xs text-gray-400">#{r.entity_id}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
