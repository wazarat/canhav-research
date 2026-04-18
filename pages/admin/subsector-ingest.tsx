import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

interface SubsectorOption {
  subsector_id: number
  subsector_name: string
  data_table: { table_name: string; updated_at: string } | null
}

interface SectorGroup {
  sector_id: number
  sector_name: string
  subsectors: SubsectorOption[]
}

interface InferredColumn {
  header: string
  key: string
  type: string
  is_name?: boolean
  is_website?: boolean
}

interface PreviewMatch {
  row_index: number
  raw_name: string
  website: string
  matched: {
    best: { entity_id: number; entity_name: string; score: number; via: string } | null
    candidates: Array<{ entity_id: number; entity_name: string; score: number; via: string }>
  }
  raw: Record<string, string>
}

interface PreviewResponse {
  subsector: { subsector_id: number; subsector_name: string; sector_name: string | null }
  sheet_url: string
  csv_url: string
  name_column: string
  columns: InferredColumn[]
  counts: { total: number; auto: number; ambiguous: number; unmatched: number }
  matches: PreviewMatch[]
}

/**
 * /admin/subsector-ingest
 *
 * Super-admin tool to load a Google Sheets tab into the per-subsector table.
 * Flow: pick subsector → paste sheet URL → preview + review matches →
 * (optionally tweak overrides) → commit.
 */
export default function SubsectorIngestPage() {
  const [sectors, setSectors] = useState<SectorGroup[]>([])
  const [subsectorId, setSubsectorId] = useState<number | null>(null)
  const [sheetUrl, setSheetUrl] = useState('')
  const [nameColumn, setNameColumn] = useState('Entity')
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingCommit, setLoadingCommit] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commitResult, setCommitResult] = useState<
    | null
    | {
        ingest_id: string
        table_name: string
        row_count_total: number
        row_count_matched: number
        row_count_unmatched: number
      }
  >(null)
  const [overrides, setOverrides] = useState<Record<number, number | null>>({})

  useEffect(() => {
    fetch('/api/admin/subsectors', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setSectors(j.sectors ?? []))
      .catch(() => setError('Failed to load subsectors'))
  }, [])

  async function runPreview() {
    if (!subsectorId) return setError('Pick a subsector')
    if (!sheetUrl.trim()) return setError('Paste a Google Sheets URL')
    setError(null)
    setPreview(null)
    setCommitResult(null)
    setLoadingPreview(true)
    try {
      const res = await fetch('/api/admin/subsector-ingest/preview', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subsector_id: subsectorId,
          sheet_url: sheetUrl.trim(),
          name_column: nameColumn,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      setPreview(body)
      setOverrides({})
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingPreview(false)
    }
  }

  async function runCommit() {
    if (!preview || !subsectorId) return
    setError(null)
    setLoadingCommit(true)
    try {
      const res = await fetch('/api/admin/subsector-ingest/commit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subsector_id: subsectorId,
          sheet_url: sheetUrl.trim(),
          name_column: nameColumn,
          overrides,
          auto_threshold: 0.9,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      setCommitResult(body)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingCommit(false)
    }
  }

  const subsectorById = useMemo(() => {
    const m = new Map<number, { label: string; sector: string; existing: boolean }>()
    for (const s of sectors) {
      for (const sub of s.subsectors) {
        m.set(sub.subsector_id, {
          label: sub.subsector_name,
          sector: s.sector_name,
          existing: !!sub.data_table,
        })
      }
    }
    return m
  }, [sectors])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Head>
        <title>Subsector data ingest · Admin</title>
      </Head>

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Subsector data ingest</h1>
            <p className="text-sm text-gray-500">
              Import a Google Sheet tab into its subsector&apos;s dedicated table.
            </p>
          </div>
          <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-700">
            ← Admin home
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Step 1: pick */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
            1. Source
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-xs font-medium text-gray-700">Subsector</span>
              <select
                value={subsectorId ?? ''}
                onChange={(e) => setSubsectorId(e.target.value ? Number(e.target.value) : null)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
              >
                <option value="">— pick a subsector —</option>
                {sectors.map((s) => (
                  <optgroup key={s.sector_id} label={s.sector_name}>
                    {s.subsectors.map((sub) => (
                      <option key={sub.subsector_id} value={sub.subsector_id}>
                        {sub.subsector_name}
                        {sub.data_table ? ' · has data' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-gray-700">
                Google Sheets URL (tab must be shared &quot;Anyone with link&quot;)
              </span>
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=…"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-700">Name column header</span>
              <input
                type="text"
                value={nameColumn}
                onChange={(e) => setNameColumn(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={runPreview}
              disabled={loadingPreview}
              className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingPreview ? 'Fetching…' : 'Preview'}
            </button>
            {subsectorId && subsectorById.get(subsectorId)?.existing && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                This subsector already has data — commit will upsert &amp; add any new columns.
              </span>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {error}
            </div>
          )}
        </section>

        {/* Step 2: preview */}
        {preview && (
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  2. Preview &amp; match
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {preview.subsector.sector_name} ›{' '}
                  <span className="font-medium">{preview.subsector.subsector_name}</span>
                </p>
              </div>
              <div className="text-right text-xs space-y-1">
                <div>Total rows: {preview.counts.total}</div>
                <div className="text-emerald-700">Auto-matched: {preview.counts.auto}</div>
                <div className="text-amber-700">Ambiguous: {preview.counts.ambiguous}</div>
                <div className="text-red-700">Unmatched: {preview.counts.unmatched}</div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Inferred columns
              </h3>
              <div className="flex flex-wrap gap-2">
                {preview.columns.map((c) => (
                  <span
                    key={c.key}
                    className={`text-xs px-2 py-1 rounded border ${
                      c.is_name
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : c.is_website
                        ? 'bg-purple-50 border-purple-200 text-purple-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                    title={c.header}
                  >
                    {c.header} <span className="text-gray-400">· {c.type}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-y border-gray-200">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">#</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">
                      Sheet name
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">
                      Matched to
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">
                      Score / via
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">
                      Override
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.matches.map((m) => {
                    const auto = (m.matched.best?.score ?? 0) >= 0.9
                    const amb =
                      (m.matched.best?.score ?? 0) >= 0.8 && (m.matched.best?.score ?? 0) < 0.9
                    const none = (m.matched.best?.score ?? 0) < 0.8
                    return (
                      <tr
                        key={m.row_index}
                        className={
                          none
                            ? 'bg-red-50/40'
                            : amb
                            ? 'bg-amber-50/40'
                            : auto
                            ? 'bg-emerald-50/30'
                            : ''
                        }
                      >
                        <td className="px-2 py-1.5 text-xs text-gray-500">{m.row_index + 1}</td>
                        <td className="px-2 py-1.5 font-medium">{m.raw_name}</td>
                        <td className="px-2 py-1.5">
                          {m.matched.best ? (
                            <span>
                              {m.matched.best.entity_name}{' '}
                              <span className="text-xs text-gray-400">
                                (#{m.matched.best.entity_id})
                              </span>
                            </span>
                          ) : (
                            <span className="text-red-700 text-xs">No match</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-xs text-gray-500">
                          {m.matched.best
                            ? `${(m.matched.best.score * 100).toFixed(0)}% · ${m.matched.best.via}`
                            : '—'}
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={overrides[m.row_index] ?? ''}
                            onChange={(e) =>
                              setOverrides((s) => ({
                                ...s,
                                [m.row_index]: e.target.value ? Number(e.target.value) : null,
                              }))
                            }
                            className="text-xs rounded border-gray-300"
                          >
                            <option value="">(auto)</option>
                            {m.matched.candidates.map((c) => (
                              <option key={c.entity_id} value={c.entity_id}>
                                {c.entity_name} ({(c.score * 100).toFixed(0)}%)
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={runCommit}
                disabled={loadingCommit}
                className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {loadingCommit
                  ? 'Committing…'
                  : `Commit ${preview.counts.auto} matched + queue ${preview.counts.unmatched + preview.counts.ambiguous} for review`}
              </button>
            </div>
          </section>
        )}

        {/* Step 3: result */}
        {commitResult && (
          <section className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-sm text-emerald-900">
            <h2 className="font-semibold mb-2">Committed.</h2>
            <ul className="space-y-1">
              <li>Table: <code>public.{commitResult.table_name}</code></li>
              <li>Rows written: {commitResult.row_count_matched}</li>
              <li>Rows queued for review: {commitResult.row_count_unmatched}</li>
              <li>Ingest id: <code className="text-xs">{commitResult.ingest_id}</code></li>
            </ul>
            {commitResult.row_count_unmatched > 0 && (
              <p className="mt-3">
                <Link
                  href="/admin/subsector-review"
                  className="text-emerald-800 underline hover:text-emerald-900"
                >
                  Review unmatched rows →
                </Link>
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
