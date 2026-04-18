'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRealtimeTables } from '../lib/useRealtimeTables'

/**
 * Right-side slide-in drawer that fetches /api/company/[id] for the given
 * entity id and renders a compact detail view. Used by the Landscape + Grid
 * views as a softer alternative to full-page navigation; the standalone
 * /company/[id] page stays for deep-linking.
 */

interface EntityClassification {
  entity_classification_id: number
  entity_id: number
  entity_name: string
  is_primary: boolean
  sector_name: string
  subsector_name: string
  description: string
  website: string
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
  classifications: EntityClassification[]
  sub_entities: Array<{ entity_id: number; entity_name: string }>
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

export default function CompanyDetailDrawer({
  entityId,
  onClose,
}: {
  entityId: number | null
  onClose: () => void
}) {
  const [data, setData] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/company/${entityId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const body = (await res.json()) as CompanyDetail
      setData(body)
    } catch (err) {
      console.error(err)
      setError('Unable to load this company.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [entityId])

  useEffect(() => {
    if (entityId) fetchDetail()
    else setData(null)
  }, [entityId, fetchDetail])

  // Close on Esc.
  useEffect(() => {
    if (!entityId) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [entityId, onClose])

  // Live refresh the open drawer if its entity is edited in the DB.
  useRealtimeTables(
    ['entities', 'entity_classifications'],
    fetchDetail,
    { channelName: entityId ? `company-drawer-${entityId}` : undefined }
  )

  const open = entityId !== null
  const primary = data?.classifications.find((c) => c.is_primary) ??
    data?.classifications[0]
  const accent = primary ? SECTOR_ACCENT[primary.sector_name] ?? '#9ca3af' : '#9ca3af'

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl border-l border-gray-200 transform transition-transform duration-200 flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Company detail"
      >
        <header
          className="px-5 py-4 border-b border-gray-100 flex items-start gap-3"
          style={{ borderTop: `3px solid ${accent}` }}
        >
          <div className="min-w-0 flex-1">
            {loading && !data && (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            )}
            {data && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  {data.entity_name}
                </h2>
                <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                  {data.canonical_website && (
                    <a
                      href={data.canonical_website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-blue-600 hover:text-blue-700 truncate max-w-[200px]"
                    >
                      {data.canonical_website
                        .replace(/^https?:\/\/(www\.)?/, '')
                        .replace(/\/$/, '')}
                    </a>
                  )}
                  {data.hq_location && <span>{data.hq_location}</span>}
                  {data.year_founded && <span>Founded {data.year_founded}</span>}
                  {data.funding_stage && <span>{data.funding_stage}</span>}
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-5 p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {data && (
            <div className="p-5 space-y-5">
              {data.sub_entities.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Product variants
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {data.sub_entities.map((s) => (
                      <span
                        key={s.entity_id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[11px] text-gray-700"
                      >
                        {s.entity_name}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Classifications ({data.classifications.length})
                </h3>
                <ul className="space-y-3">
                  {data.classifications.map((c) => (
                    <li
                      key={c.entity_classification_id}
                      className="rounded-lg border border-gray-200 p-3"
                      style={{
                        borderLeft: `3px solid ${SECTOR_ACCENT[c.sector_name] ?? '#9ca3af'}`,
                      }}
                    >
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-medium text-gray-800">
                          {c.sector_name}
                        </span>
                        <span>›</span>
                        <span>{c.subsector_name}</span>
                        {c.is_primary && (
                          <span className="ml-auto text-[10px] uppercase font-semibold text-blue-600">
                            primary
                          </span>
                        )}
                      </div>
                      {c.entity_name && c.entity_name !== data.entity_name && (
                        <div className="mt-1 text-[11px] text-gray-400">
                          via{' '}
                          <span className="font-medium text-gray-600">
                            {c.entity_name}
                          </span>
                        </div>
                      )}
                      {c.description && (
                        <p className="mt-2 text-sm text-gray-700 leading-snug">
                          {c.description}
                        </p>
                      )}
                      {c.website && c.website !== data.canonical_website && (
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="mt-2 inline-block text-xs text-blue-600 hover:text-blue-700"
                        >
                          {c.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>

        {data && (
          <footer className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
            <span className="text-gray-400">#{data.entity_id}</span>
            <Link
              href={`/company/${data.entity_id}`}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Open full page →
            </Link>
          </footer>
        )}
      </aside>
    </>
  )
}
