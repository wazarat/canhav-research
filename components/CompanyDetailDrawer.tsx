'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRealtimeTables } from '../lib/useRealtimeTables'
import { timeAgo, formatTimestamp } from '../lib/timeAgo'
import { toSlug } from '../lib/slug'
import EntityEditForm, { EntityEditable } from './EntityEditForm'
import MergeWithPicker from './MergeWithPicker'

/**
 * Right-side slide-in drawer that fetches /api/company/[id] for the given
 * entity id and renders a compact detail view.
 *
 * Super-admin affordances (visible only when /api/admin/session returns
 * role === 'super_admin'):
 *   * Pencil icon in the header → swaps the read view for EntityEditForm.
 *   * Merge icon in the header  → opens MergeWithPicker modal.
 * Both are additive to /admin/entities, which stays the home for batch
 * merge work.
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

interface CompanyDetail extends EntityEditable {
  classifications: EntityClassification[]
  sub_entities: Array<{ entity_id: number; entity_name: string }>
  // Populated by /api/company/[id] from v_entity_detail.root_updated_at.
  // Optional so stale type callers keep compiling.
  updated_at?: string | null
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
  starred = false,
  onToggleStar,
}: {
  entityId: number | null
  onClose: () => void
  /** Optional. When provided, a star button appears in the drawer header. */
  starred?: boolean
  onToggleStar?: (entityId: number) => void
}) {
  const [data, setData] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [merging, setMerging] = useState(false)
  // CAN-NEW-07: article cross-reference for this entity.
  const [featuredArticles, setFeaturedArticles] = useState<
    Array<{ slug: string; title: string; published_at: string; external_url: string | null }>
  >([])

  // Admin role probe (silent; 403/401 means "not super-admin" which is fine).
  useEffect(() => {
    if (!entityId) return
    fetch('/api/admin/session', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => setRole(body?.role ?? null))
      .catch(() => setRole(null))
  }, [entityId])

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
    if (entityId) {
      fetchDetail()
      setEditing(false)
      setMerging(false)
    } else {
      setData(null)
      setEditing(false)
      setMerging(false)
    }
  }, [entityId, fetchDetail])

  useEffect(() => {
    if (!entityId) {
      setFeaturedArticles([])
      return
    }
    fetch(`/api/articles/for-entity?entity_id=${entityId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (Array.isArray(body?.articles)) setFeaturedArticles(body.articles)
        else setFeaturedArticles([])
      })
      .catch(() => setFeaturedArticles([]))
  }, [entityId])

  useEffect(() => {
    if (!entityId) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (merging) setMerging(false)
        else if (editing) setEditing(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [entityId, onClose, editing, merging])

  useRealtimeTables(
    ['entities', 'entity_classifications'],
    fetchDetail,
    { channelName: entityId ? `company-drawer-${entityId}` : undefined }
  )

  const open = entityId !== null
  const primary = data?.classifications.find((c) => c.is_primary) ??
    data?.classifications[0]
  const accent = primary ? SECTOR_ACCENT[primary.sector_name] ?? '#9ca3af' : '#9ca3af'
  const isSuper = role === 'super_admin'

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
                  {data.updated_at && timeAgo(data.updated_at) && (
                    <span
                      className="text-gray-400"
                      title={formatTimestamp(data.updated_at) ?? undefined}
                    >
                      Updated {timeAgo(data.updated_at)}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <Link
                    href={`/company/${data.entity_id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    View full profile →
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Viewer control: star / unstar this company. Visible to anyone
              with a viewer session; anonymous visitors get sent to /login. */}
          {data && onToggleStar && (
            <button
              type="button"
              onClick={() => onToggleStar(data.entity_id)}
              title={starred ? 'Remove from saved' : 'Save company'}
              aria-pressed={starred}
              className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors ${
                starred ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'
              }`}
            >
              <svg className="w-4 h-4" fill={starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75} viewBox="0 0 20 20">
                <path strokeLinejoin="round" d="M10 15.27L16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" />
              </svg>
            </button>
          )}

          {/* Super-admin controls */}
          {data && isSuper && !editing && (
            <div className="flex items-center gap-1">
              <IconButton
                label="Merge with…"
                onClick={() => setMerging(true)}
                title="Merge this with another entity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v10l4 4 4-4V7m-8 0l4-4 4 4M8 7h8" />
                </svg>
              </IconButton>
              <IconButton
                label="Edit"
                onClick={() => setEditing(true)}
                title="Edit this entity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </IconButton>
            </div>
          )}

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

          {/* Edit mode */}
          {data && editing && isSuper && (
            <EntityEditForm
              initial={data}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false)
                fetchDetail()
              }}
            />
          )}

          {/* Read mode */}
          {data && !editing && (
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

              {data.long_description && (
                <section>
                  <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    About
                  </h3>
                  <p className="text-sm text-gray-700 leading-snug whitespace-pre-line">
                    {data.long_description}
                  </p>
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
                      <div className="mt-2">
                        <Link
                          href={`/market-map?sector=${encodeURIComponent(
                            toSlug(c.sector_name)
                          )}&subsector=${encodeURIComponent(toSlug(c.subsector_name))}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 hover:text-blue-600"
                        >
                          Explore all {c.subsector_name} →
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {featuredArticles.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Featured in
                  </h3>
                  <ul className="space-y-2">
                    {featuredArticles.map((a) => {
                      const isExternal = !!a.external_url
                      const href = isExternal ? a.external_url! : `/research/${a.slug}`
                      return (
                        <li key={a.slug}>
                          <a
                            href={href}
                            {...(isExternal
                              ? { target: '_blank', rel: 'noopener noreferrer' }
                              : {})}
                            className="block rounded-md border border-gray-200 px-3 py-2 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                          >
                            <div className="text-sm font-medium text-gray-800 leading-snug">
                              {a.title}
                              {isExternal && <span className="ml-1 text-gray-400">↗</span>}
                            </div>
                            {a.published_at && (
                              <div className="mt-0.5 text-[11px] text-gray-400">
                                {new Date(a.published_at).toLocaleDateString(
                                  undefined,
                                  { year: 'numeric', month: 'short', day: 'numeric' }
                                )}
                              </div>
                            )}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>

        {data && !editing && (
          <footer className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400">#{data.entity_id}</span>
            <Link
              href={`/company/${data.entity_id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              View full profile
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </footer>
        )}
      </aside>

      {merging && data && (
        <MergeWithPicker
          source={{
            entity_id: data.entity_id,
            entity_name: data.entity_name,
            canonical_website: data.canonical_website,
          }}
          onClose={() => setMerging(false)}
          onMerged={() => {
            setMerging(false)
            // After a merge the merged-away id may no longer exist. Close the
            // drawer rather than risk a 404 refetch; /market-map's realtime
            // subscription will refresh the grid.
            onClose()
          }}
        />
      )}
    </>
  )
}

function IconButton({
  children,
  onClick,
  label,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title ?? label}
      className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
    >
      {children}
    </button>
  )
}
