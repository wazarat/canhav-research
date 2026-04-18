'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Inline merge picker, opened from CompanyDetailDrawer for super-admins.
 *
 * Given a `sourceEntity`, the admin searches for another root entity and
 * picks a direction:
 *
 *   * "Make <source> a child of <target>"  — source becomes the child,
 *     target stays as the root in the grid.
 *   * "Make <target> a child of <source>"  — reverse; useful when the
 *     source IS the canonical entry and the search hit is the dup.
 *
 * Hits POST /api/admin/merge-entities with
 *   { parent_entity_id, child_entity_ids: [child], reason }.
 *
 * Search autocomplete goes through /api/companies (cached in memory for
 * the modal's lifetime) because that endpoint already returns the full
 * grid. Client-side filter keeps the UX snappy without a new route.
 */

export interface MergeSource {
  entity_id: number
  entity_name: string
  canonical_website?: string | null
}

interface Candidate {
  entity_id: number
  name: string
  canonical_website?: string | null
  sector?: string
  subsector?: string
}

export default function MergeWithPicker({
  source,
  onClose,
  onMerged,
}: {
  source: MergeSource
  onClose: () => void
  onMerged: () => void
}) {
  const [query, setQuery] = useState('')
  const [all, setAll] = useState<Candidate[] | null>(null)
  const [picked, setPicked] = useState<Candidate | null>(null)
  const [direction, setDirection] = useState<'source_child' | 'target_child'>(
    'source_child'
  )
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    let cancel = false
    fetch('/api/companies', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => {
        if (cancel) return
        const rows: Candidate[] = (body.companies ?? []).map((c: any) => ({
          entity_id: c.entity_id,
          name: c.name,
          canonical_website: c.canonical_website,
          sector: c.sector,
          subsector: c.subsector,
        }))
        setAll(rows)
      })
      .catch(() => setAll([]))
    return () => {
      cancel = true
    }
  }, [])

  const matches = useMemo(() => {
    if (!all) return []
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return all
      .filter(
        (c) =>
          c.entity_id !== source.entity_id &&
          c.name.toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [all, query, source.entity_id])

  async function performMerge() {
    if (!picked) return
    setError(null)
    setSubmitting(true)

    const parentId =
      direction === 'source_child' ? picked.entity_id : source.entity_id
    const childId =
      direction === 'source_child' ? source.entity_id : picked.entity_id

    try {
      const res = await fetch('/api/admin/merge-entities', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          parent_entity_id: parentId,
          child_entity_ids: [childId],
          reason: reason.trim() || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      setSuccess(true)
      setTimeout(() => {
        onMerged()
      }, 650)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Merge failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Merge &ldquo;{source.entity_name}&rdquo; with…
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Collapses one entity under the other. Reversible from{' '}
              <span className="font-mono text-gray-600">/admin/entities</span>.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 p-1 -mr-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Target company
            </label>
            <input
              ref={inputRef}
              value={picked ? picked.name : query}
              onChange={(e) => {
                setPicked(null)
                setQuery(e.target.value)
              }}
              placeholder="Search by company name…"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {!picked && matches.length > 0 && (
              <ul className="mt-1 border border-gray-200 rounded-md divide-y divide-gray-100 max-h-56 overflow-y-auto">
                {matches.map((m) => (
                  <li key={m.entity_id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked(m)
                        setQuery('')
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50"
                    >
                      <div className="text-sm font-medium text-gray-800">{m.name}</div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {m.sector}
                        {m.subsector ? ` · ${m.subsector}` : ''}
                        {m.canonical_website
                          ? ` · ${m.canonical_website.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
                          : ''}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!picked && query.trim().length >= 2 && matches.length === 0 && all && (
              <p className="mt-2 text-xs text-gray-500">No matches.</p>
            )}
          </div>

          {picked && (
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Direction
                </label>
                <div className="space-y-1.5 text-sm">
                  <label className="flex items-start gap-2 p-2 rounded-md border border-gray-200 hover:border-blue-300 cursor-pointer">
                    <input
                      type="radio"
                      name="dir"
                      checked={direction === 'source_child'}
                      onChange={() => setDirection('source_child')}
                      className="mt-0.5"
                    />
                    <span>
                      Make <strong>{source.entity_name}</strong> a child of{' '}
                      <strong>{picked.name}</strong>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 p-2 rounded-md border border-gray-200 hover:border-blue-300 cursor-pointer">
                    <input
                      type="radio"
                      name="dir"
                      checked={direction === 'target_child'}
                      onChange={() => setDirection('target_child')}
                      className="mt-0.5"
                    />
                    <span>
                      Make <strong>{picked.name}</strong> a child of{' '}
                      <strong>{source.entity_name}</strong>
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Reason (optional)
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Alchemy Pay is a product line of Alchemy"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {error && (
            <div className="p-2.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}
          {success && (
            <div className="p-2.5 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md">
              Merge applied. Refreshing…
            </div>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={performMerge}
            disabled={!picked || submitting || success}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-blue-300"
          >
            {submitting ? 'Merging…' : 'Apply merge'}
          </button>
        </footer>
      </div>
    </div>
  )
}
