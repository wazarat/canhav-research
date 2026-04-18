import { useCallback, useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useRealtimeTables } from '../../lib/useRealtimeTables'
import type {
  CandidateGroup,
  CandidateMember,
} from '../api/admin/merge-candidates'

/**
 * /admin/entities
 *
 * Editorial tool for collapsing product variants onto a canonical parent
 * entity. Cookie-gated by middleware.ts — unauthenticated visitors are
 * redirected to /admin/login.
 *
 * Layout:
 *   * Sticky header with editor name + logout + tab switcher.
 *   * Tab "Candidates": list of near-duplicate groups from
 *     v_merge_candidate_groups, each rendered as a column of member cards
 *     with their classifications inlined so the editor can compare
 *     descriptions + websites at a glance before merging.
 *   * Tab "History": recent merges, each with a per-row "Undo" button that
 *     calls /api/admin/unmerge-entities.
 *
 * Realtime: subscribes to entities + entity_classifications + entity_merges
 * so refetches fire whenever anyone else applies a change.
 */

type RecentMerge = {
  merge_id: number
  parent_entity_id: number
  child_entity_id: number
  merged_at: string
  merged_by: string | null
  reason: string | null
  reverted_at: string | null
  snapshot: {
    child_entity_name?: string
    prev_parent_entity_id?: number | null
  } | null
}

type Tab = 'candidates' | 'history'

const TAB_LABEL: Record<Tab, string> = {
  candidates: 'Merge candidates',
  history: 'Merge history',
}

function confidenceTone(score: number) {
  if (score >= 75) return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' }
  if (score >= 50) return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' }
  return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' }
}

export default function AdminEntities() {
  const router = useRouter()
  const [editorName, setEditorName] = useState<string | null>(null)
  const [editorRole, setEditorRole] = useState<'admin' | 'super_admin' | null>(null)
  const [tab, setTab] = useState<Tab>('candidates')
  const [groups, setGroups] = useState<CandidateGroup[]>([])
  const [recentMerges, setRecentMerges] = useState<RecentMerge[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [minConfidence, setMinConfidence] = useState(0)
  const [pendingGroup, setPendingGroup] = useState<{
    group: CandidateGroup
    parentId: number
    childIds: number[]
  } | null>(null)
  const [banner, setBanner] = useState<
    { kind: 'ok' | 'err'; message: string } | null
  >(null)

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (minConfidence > 0) params.set('min_confidence', String(minConfidence))
      params.set('include', 'recent_merges')
      const res = await fetch(`/api/admin/merge-candidates?${params}`, {
        cache: 'no-store',
      })
      if (res.status === 401) {
        router.replace('/admin/login?next=/admin/entities')
        return
      }
      if (!res.ok) throw new Error(`API ${res.status}`)
      const body = await res.json()
      setGroups(body.groups ?? [])
      setRecentMerges(body.recent_merges ?? [])
    } catch (err) {
      console.error(err)
      setBanner({ kind: 'err', message: 'Failed to load candidates' })
    } finally {
      setLoading(false)
    }
  }, [search, minConfidence, router])

  useEffect(() => {
    // Read the current Supabase-backed session to show "Signed in as …"
    // and decide whether to surface super-admin-only nav items.
    fetch('/api/admin/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((s) => {
        setEditorName(s?.email ?? null)
        setEditorRole(s?.role ?? null)
      })
      .catch(() => undefined)
    refresh()
  }, [refresh])

  useRealtimeTables(
    ['entities', 'entity_classifications'],
    refresh,
    { channelName: 'admin-entities' }
  )

  async function submitMerge(
    parentId: number,
    childIds: number[],
    reason: string | null
  ) {
    const res = await fetch('/api/admin/merge-entities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        parent_entity_id: parentId,
        child_entity_ids: childIds,
        reason,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setBanner({
        kind: 'err',
        message: body?.error ?? `Merge failed (${res.status})`,
      })
      return
    }
    setBanner({
      kind: 'ok',
      message: `Merged ${body.applied?.length ?? childIds.length} entities under ${parentId}`,
    })
    setPendingGroup(null)
    refresh()
  }

  async function submitUnmerge(mergeId: number) {
    const res = await fetch('/api/admin/unmerge-entities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ merge_id: mergeId }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setBanner({
        kind: 'err',
        message: body?.error ?? `Unmerge failed (${res.status})`,
      })
      return
    }
    setBanner({ kind: 'ok', message: `Reverted merge #${mergeId}` })
    refresh()
  }

  async function submitNeverMerge(a: number, b: number) {
    const res = await fetch('/api/admin/never-merge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entity_a: a, entity_b: b }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setBanner({
        kind: 'err',
        message: body?.error ?? `Failed to flag pair`,
      })
      return
    }
    setBanner({
      kind: 'ok',
      message: `Flagged #${a} and #${b} as never-merge`,
    })
    refresh()
  }

  async function onLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Admin — Entity Editor</title>
      </Head>

      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold text-gray-900">
            CanHav Admin
          </Link>
          <nav className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                  tab === t
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {TAB_LABEL[t]}
              </button>
            ))}
            <Link
              href="/admin/subsector-ingest"
              className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 rounded-md"
            >
              Ingest
            </Link>
            <Link
              href="/admin/subsector-review"
              className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 rounded-md"
            >
              Review
            </Link>
            <Link
              href="/admin/members"
              className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 rounded-md"
            >
              Editors
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
            {editorName && (
              <span>
                Signed in as{' '}
                <span className="font-medium text-gray-800">{editorName}</span>
                {editorRole === 'super_admin' && (
                  <span className="ml-1 text-[10px] uppercase tracking-wider text-blue-600">
                    super
                  </span>
                )}
              </span>
            )}
            <Link
              href="/market-map"
              className="text-gray-500 hover:text-blue-600"
            >
              View site
            </Link>
            <button
              onClick={onLogout}
              className="text-gray-500 hover:text-red-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {banner && (
          <div
            className={`rounded-lg border px-4 py-2 text-sm flex items-start gap-3 ${
              banner.kind === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <span className="flex-1">{banner.message}</span>
            <button
              onClick={() => setBanner(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              dismiss
            </button>
          </div>
        )}

        {tab === 'candidates' && (
          <CandidatesTab
            loading={loading}
            groups={groups}
            search={search}
            setSearch={setSearch}
            minConfidence={minConfidence}
            setMinConfidence={setMinConfidence}
            onRefresh={refresh}
            onOpenMerge={(g, parentId, childIds) =>
              setPendingGroup({ group: g, parentId, childIds })
            }
            onNeverMergePair={submitNeverMerge}
          />
        )}

        {tab === 'history' && (
          <HistoryTab
            merges={recentMerges}
            onUndo={submitUnmerge}
          />
        )}
      </main>

      {pendingGroup && (
        <MergeConfirmationModal
          parentId={pendingGroup.parentId}
          childIds={pendingGroup.childIds}
          group={pendingGroup.group}
          onCancel={() => setPendingGroup(null)}
          onConfirm={(reason) =>
            submitMerge(pendingGroup.parentId, pendingGroup.childIds, reason)
          }
        />
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Candidates tab
// ------------------------------------------------------------------

function CandidatesTab({
  loading,
  groups,
  search,
  setSearch,
  minConfidence,
  setMinConfidence,
  onRefresh,
  onOpenMerge,
  onNeverMergePair,
}: {
  loading: boolean
  groups: CandidateGroup[]
  search: string
  setSearch: (v: string) => void
  minConfidence: number
  setMinConfidence: (v: number) => void
  onRefresh: () => void
  onOpenMerge: (g: CandidateGroup, parentId: number, childIds: number[]) => void
  onNeverMergePair: (a: number, b: number) => void
}) {
  const blocked = useMemo(() => {
    const set = new Set<string>()
    for (const g of groups) {
      for (const e of g.never_merge_edges) set.add(`${e.a}:${e.b}`)
    }
    return set
  }, [groups])

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
            Search
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chainalysis, Alchemy, Fireblocks…"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
            Min confidence ({minConfidence})
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            className="w-40"
          />
        </div>
        <button
          onClick={onRefresh}
          className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100"
        >
          Refresh
        </button>
        <div className="text-xs text-gray-500 sm:ml-auto">
          {loading ? 'Loading…' : `${groups.length} groups`}
        </div>
      </div>

      {!loading && groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          No merge candidates match your filters.
        </div>
      )}

      <div className="space-y-4">
        {groups.map((g) => (
          <CandidateGroupCard
            key={g.base_name}
            group={g}
            blockedSet={blocked}
            onOpenMerge={onOpenMerge}
            onNeverMergePair={onNeverMergePair}
          />
        ))}
      </div>
    </div>
  )
}

function CandidateGroupCard({
  group,
  blockedSet,
  onOpenMerge,
  onNeverMergePair,
}: {
  group: CandidateGroup
  blockedSet: Set<string>
  onOpenMerge: (g: CandidateGroup, parentId: number, childIds: number[]) => void
  onNeverMergePair: (a: number, b: number) => void
}) {
  const [parentId, setParentId] = useState<number>(
    group.members[0]?.entity_id ?? 0
  )
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(group.members.slice(1).map((m) => m.entity_id))
  )
  const tone = confidenceTone(group.confidence)

  const toggle = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const childIds = Array.from(selected).filter((id) => id !== parentId)
  const blockedPair = childIds.some((cid) => {
    const [a, b] = parentId < cid ? [parentId, cid] : [cid, parentId]
    return blockedSet.has(`${a}:${b}`)
  })

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            {group.base_name}
          </div>
          <div className="text-[11px] text-gray-400">
            {group.member_count} candidates &middot;
            {' '}avg similarity {group.avg_similarity.toFixed(2)}
            {group.shared_domain ? ' · shared domain' : ''}
            {group.same_primary_sector ? ' · same primary sector' : ''}
          </div>
        </div>
        <div
          className={`ml-auto inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full border ${tone.bg} ${tone.text} ${tone.border}`}
        >
          {group.confidence.toFixed(0)}% confidence
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {group.members.map((m) => (
          <MemberColumn
            key={m.entity_id}
            member={m}
            isParent={m.entity_id === parentId}
            selected={selected.has(m.entity_id)}
            onSetParent={() => {
              setParentId(m.entity_id)
              setSelected((prev) => {
                const next = new Set(prev)
                next.delete(m.entity_id)
                group.members.forEach((x) => {
                  if (x.entity_id !== m.entity_id) next.add(x.entity_id)
                })
                return next
              })
            }}
            onToggle={() => toggle(m.entity_id)}
          />
        ))}
      </div>

      <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-3 items-center text-xs">
        <div className="text-gray-500">
          Parent: <span className="font-medium text-gray-800">#{parentId}</span>
          {' · '}
          Merging {childIds.length} children
        </div>
        {blockedPair && (
          <div className="text-red-600 font-medium">
            One or more selected pairs are in the never-merge list.
          </div>
        )}
        <div className="ml-auto flex gap-2">
          {group.members.length === 2 && (
            <button
              onClick={() =>
                onNeverMergePair(group.members[0].entity_id, group.members[1].entity_id)
              }
              className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded-md hover:bg-red-50"
            >
              Never merge these
            </button>
          )}
          <button
            disabled={childIds.length === 0 || blockedPair}
            onClick={() => onOpenMerge(group, parentId, childIds)}
            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
          >
            Review merge
          </button>
        </div>
      </div>
    </div>
  )
}

function MemberColumn({
  member,
  isParent,
  selected,
  onSetParent,
  onToggle,
}: {
  member: CandidateMember
  isParent: boolean
  selected: boolean
  onSetParent: () => void
  onToggle: () => void
}) {
  return (
    <div className={`p-4 ${isParent ? 'bg-blue-50/40' : ''}`}>
      <div className="flex items-start gap-2 mb-3">
        <input
          type="radio"
          name={`parent-${member.entity_id}`}
          checked={isParent}
          onChange={onSetParent}
          className="mt-1"
          title="Make this the parent"
        />
        <label className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {member.entity_name}
          </div>
          <div className="text-[11px] text-gray-400">
            #{member.entity_id}
            {member.domain ? ` · ${member.domain}` : ''}
            {member.primary_sector ? ` · ${member.primary_sector}` : ''}
          </div>
        </label>
        {!isParent && (
          <label className="flex items-center gap-1 text-[11px] text-gray-500">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggle}
            />
            merge
          </label>
        )}
        {isParent && (
          <span className="text-[10px] font-semibold uppercase text-blue-600">
            parent
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {member.classifications.slice(0, 6).map((c) => (
          <li
            key={c.entity_classification_id}
            className="text-[12px] leading-snug text-gray-600 border-l-2 border-gray-200 pl-2"
          >
            <div className="font-medium text-gray-800">
              {c.sector_name} → {c.subsector_name}
              {c.is_primary && (
                <span className="ml-2 text-[10px] text-blue-600 font-semibold uppercase">
                  primary
                </span>
              )}
            </div>
            {c.description && (
              <div className="text-gray-500 line-clamp-2">{c.description}</div>
            )}
          </li>
        ))}
        {member.classifications.length > 6 && (
          <li className="text-[11px] text-gray-400">
            + {member.classifications.length - 6} more
          </li>
        )}
      </ul>
    </div>
  )
}

// ------------------------------------------------------------------
// Merge confirmation modal
// ------------------------------------------------------------------

function MergeConfirmationModal({
  parentId,
  childIds,
  group,
  onCancel,
  onConfirm,
}: {
  parentId: number
  childIds: number[]
  group: CandidateGroup
  onCancel: () => void
  onConfirm: (reason: string | null) => void
}) {
  const [reason, setReason] = useState('')
  const parent = group.members.find((m) => m.entity_id === parentId)
  const children = childIds
    .map((id) => group.members.find((m) => m.entity_id === id))
    .filter(Boolean) as CandidateMember[]

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            Confirm merge
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {children.length} child{children.length > 1 ? 'ren' : ''} will point
            at <span className="font-medium text-gray-800">{parent?.entity_name}</span> (#{parentId}).
            Children keep their own rows and classifications — the grid just
            stops showing them as separate cards. This is reversible.
          </p>
        </div>

        <div className="px-6 py-4 space-y-3 max-h-[50vh] overflow-auto">
          <div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
              Parent
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {parent?.entity_name}
            </div>
            <div className="text-[11px] text-gray-400">
              #{parentId} · {parent?.classification_count} classifications
              {parent?.domain ? ` · ${parent.domain}` : ''}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
              Children being merged
            </div>
            <ul className="space-y-1">
              {children.map((c) => (
                <li
                  key={c.entity_id}
                  className="text-sm text-gray-700 flex items-center gap-2"
                >
                  <span className="font-medium">{c.entity_name}</span>
                  <span className="text-[11px] text-gray-400">
                    #{c.entity_id} · {c.classification_count} classifications
                    {c.domain ? ` · ${c.domain}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
              Note (optional, stamped into audit row)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Same company, confirmed via shared website and sector overlap."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim() || null)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Merge {children.length} entit{children.length === 1 ? 'y' : 'ies'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// History tab
// ------------------------------------------------------------------

function HistoryTab({
  merges,
  onUndo,
}: {
  merges: RecentMerge[]
  onUndo: (mergeId: number) => void
}) {
  if (merges.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
        No merge history yet.
      </div>
    )
  }
  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-4 py-2 text-left">When</th>
            <th className="px-4 py-2 text-left">By</th>
            <th className="px-4 py-2 text-left">Child</th>
            <th className="px-4 py-2 text-left">Parent</th>
            <th className="px-4 py-2 text-left">Reason</th>
            <th className="px-4 py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {merges.map((m) => (
            <tr key={m.merge_id} className={m.reverted_at ? 'bg-gray-50/50' : ''}>
              <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                {new Date(m.merged_at).toLocaleString()}
              </td>
              <td className="px-4 py-2 text-xs text-gray-700">{m.merged_by ?? '—'}</td>
              <td className="px-4 py-2 text-sm text-gray-800">
                <span className="font-medium">
                  {m.snapshot?.child_entity_name ?? `#${m.child_entity_id}`}
                </span>
                <span className="ml-1 text-[11px] text-gray-400">
                  #{m.child_entity_id}
                </span>
              </td>
              <td className="px-4 py-2 text-sm text-gray-800">#{m.parent_entity_id}</td>
              <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">
                {m.reason ?? ''}
              </td>
              <td className="px-4 py-2 text-right">
                {m.reverted_at ? (
                  <span className="text-[11px] text-gray-400">
                    reverted {new Date(m.reverted_at).toLocaleDateString()}
                  </span>
                ) : (
                  <button
                    onClick={() => onUndo(m.merge_id)}
                    className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                  >
                    Undo
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
