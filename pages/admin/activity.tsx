import { useCallback, useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

/**
 * /admin/activity — super-admin-only audit log.
 *
 * Unified stream of inline edits (admin_edits) + merges (entity_merges)
 * across all admins, newest first. Supports filtering by actor email and
 * by event kind. Designed so the super-admin can scan what each editor
 * has touched without having to SQL their way through three tables.
 */

type ActivityKind = 'edit' | 'merge' | 'unmerge'

type ActivityItem = {
  id: string
  kind: ActivityKind
  actor_email: string | null
  actor_role: 'admin' | 'super_admin' | null
  created_at: string
  entity_id: number | null
  summary: string
  details: {
    target_type?: 'entity' | 'classification' | 'subsector_data'
    target_id?: number
    changes?: Record<string, { before: unknown; after: unknown }>
    note?: string | null
    source?: string | null
    merge_id?: number
    parent_entity_id?: number
    child_entity_id?: number
    reason?: string | null
    snapshot?: unknown
    reverted_at?: string | null
  }
}

type ApiResponse = {
  items: ActivityItem[]
  count: number
  self: { role: 'admin' | 'super_admin'; user: { id: string; email: string } }
}

type KindFilter = 'all' | 'edits' | 'merges'

export default function AdminActivity() {
  const router = useRouter()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [actor, setActor] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const qs = new URLSearchParams()
      if (actor.trim()) qs.set('actor', actor.trim())
      if (kind !== 'all') qs.set('kind', kind)
      qs.set('limit', '250')
      const res = await fetch(`/api/admin/activity?${qs.toString()}`, {
        cache: 'no-store',
      })
      if (res.status === 401) {
        router.replace('/admin/login?next=/admin/activity')
        return
      }
      if (res.status === 403) {
        router.replace('/admin/forbidden')
        return
      }
      if (!res.ok) {
        throw new Error(`API ${res.status}`)
      }
      const body = (await res.json()) as ApiResponse
      setItems(body.items ?? [])
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [actor, kind, router])

  useEffect(() => {
    refresh()
  }, [refresh])

  const byActor = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of items) {
      const key = it.actor_email ?? 'unknown'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [items])

  async function onSignOut() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Admin — Activity log</title>
      </Head>

      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold text-gray-900">
            CanHav Admin
          </Link>
          <nav className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            <Link
              href="/admin/entities"
              className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 rounded-md"
            >
              Merge candidates
            </Link>
            <Link
              href="/admin/members"
              className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 rounded-md"
            >
              Editors
            </Link>
            <span className="px-3 py-1 text-xs font-medium bg-white text-blue-600 shadow-sm rounded-md">
              Activity
            </span>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
            <Link
              href="/market-map"
              className="text-gray-500 hover:text-blue-600"
            >
              View site
            </Link>
            <button
              onClick={onSignOut}
              className="text-gray-500 hover:text-red-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Activity log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every inline edit, merge, and revert — newest first. Visible to
            super-admins only.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Kind</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as KindFilter)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
            >
              <option value="all">All</option>
              <option value="edits">Edits only</option>
              <option value="merges">Merges only</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <label className="text-xs font-medium text-gray-600">Actor</label>
            <input
              type="text"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="email substring or user_id"
              className="flex-1 text-sm border border-gray-200 rounded-md px-2 py-1"
            />
          </div>
          <button
            onClick={refresh}
            className="text-xs font-medium px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800"
          >
            Refresh
          </button>
        </div>

        {byActor.length > 0 && (
          <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
            {byActor.map(([email, n]) => (
              <button
                key={email}
                onClick={() => setActor(email)}
                className="hover:text-blue-600"
              >
                <span className="font-medium text-gray-700">{email}</span>{' '}
                <span className="tabular-nums">({n})</span>
              </button>
            ))}
          </div>
        )}

        {err && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            {err}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {loading && (
            <div className="px-6 py-12 text-sm text-gray-500 text-center">
              Loading…
            </div>
          )}
          {!loading && items.length === 0 && (
            <div className="px-6 py-12 text-sm text-gray-500 text-center">
              No activity to show.
            </div>
          )}
          {!loading &&
            items.map((it) => {
              const open = expanded.has(it.id)
              return (
                <div key={it.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <KindBadge kind={it.kind} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900">{it.summary}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                        <span>
                          <span className="text-gray-700">
                            {it.actor_email ?? 'unknown'}
                          </span>
                          {it.actor_role && (
                            <span className="ml-1 uppercase tracking-wider text-[10px] text-gray-400">
                              {it.actor_role}
                            </span>
                          )}
                        </span>
                        <span>{new Date(it.created_at).toLocaleString()}</span>
                        {it.entity_id != null && (
                          <Link
                            href={`/company/${it.entity_id}`}
                            className="text-blue-600 hover:underline"
                          >
                            entity #{it.entity_id} →
                          </Link>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev)
                          if (next.has(it.id)) next.delete(it.id)
                          else next.add(it.id)
                          return next
                        })
                      }
                      className="text-xs font-medium text-gray-500 hover:text-gray-800"
                    >
                      {open ? 'hide' : 'details'}
                    </button>
                  </div>
                  {open && <DetailBlock item={it} />}
                </div>
              )
            })}
        </div>
      </main>
    </div>
  )
}

function KindBadge({ kind }: { kind: ActivityKind }) {
  const style =
    kind === 'edit'
      ? 'bg-blue-50 text-blue-700 border-blue-100'
      : kind === 'merge'
      ? 'bg-purple-50 text-purple-700 border-purple-100'
      : 'bg-amber-50 text-amber-700 border-amber-100'
  const label = kind === 'unmerge' ? 'revert' : kind
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style}`}
    >
      {label}
    </span>
  )
}

function DetailBlock({ item }: { item: ActivityItem }) {
  if (item.kind === 'edit') {
    const changes = item.details.changes ?? {}
    return (
      <div className="mt-3 ml-10 rounded-md bg-gray-50 border border-gray-100 p-3 text-xs">
        <div className="text-gray-500 mb-2">
          {item.details.target_type} #{item.details.target_id}
          {item.details.source && (
            <span className="ml-2 text-gray-400">
              via {item.details.source}
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {Object.entries(changes).map(([field, diff]) => (
            <div key={field} className="grid grid-cols-[140px_1fr] gap-2">
              <div className="font-mono text-gray-600">{field}</div>
              <div className="space-y-0.5">
                <Diff label="before" value={diff.before} tone="red" />
                <Diff label="after" value={diff.after} tone="green" />
              </div>
            </div>
          ))}
        </div>
        {item.details.note && (
          <div className="mt-3 text-gray-500">note: {item.details.note}</div>
        )}
      </div>
    )
  }
  return (
    <div className="mt-3 ml-10 rounded-md bg-gray-50 border border-gray-100 p-3 text-xs text-gray-700 space-y-1">
      {item.details.reason && (
        <div>
          <span className="text-gray-500">reason:</span> {item.details.reason}
        </div>
      )}
      <div>
        <span className="text-gray-500">parent:</span> #
        {item.details.parent_entity_id} · <span className="text-gray-500">child:</span> #
        {item.details.child_entity_id}
      </div>
      {item.details.reverted_at && item.kind === 'merge' && (
        <div className="text-amber-700">
          Later reverted at {new Date(item.details.reverted_at).toLocaleString()}.
        </div>
      )}
      {item.details.snapshot != null && (
        <details className="mt-1">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            raw snapshot
          </summary>
          <pre className="mt-1 max-h-48 overflow-auto text-[11px] bg-white border border-gray-100 rounded p-2">
            {JSON.stringify(item.details.snapshot, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

function Diff({
  label,
  value,
  tone,
}: {
  label: string
  value: unknown
  tone: 'red' | 'green'
}) {
  const cls = tone === 'red' ? 'text-red-700 bg-red-50' : 'text-emerald-700 bg-emerald-50'
  const text = formatValue(value)
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 uppercase tracking-wider text-[9px] w-10 shrink-0 mt-0.5">
        {label}
      </span>
      <span
        className={`flex-1 whitespace-pre-wrap break-words rounded px-1.5 py-0.5 font-mono ${cls}`}
      >
        {text}
      </span>
    </div>
  )
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '∅'
  if (Array.isArray(v)) return v.length === 0 ? '[]' : JSON.stringify(v)
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
