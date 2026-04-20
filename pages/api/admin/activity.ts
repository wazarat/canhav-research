import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../lib/supabaseNew'

/**
 * GET /api/admin/activity
 *
 * Super-admin audit feed. Returns a unified chronological list of:
 *   1. Inline edits recorded in public.admin_edits
 *      (entities, classifications, subsector_data)
 *   2. Merges recorded in public.entity_merges (with revert state)
 *
 * Optional query params:
 *   ?actor=<email | uuid>  filter to one editor
 *   ?limit=<n>             default 100, max 500
 *   ?kind=edits|merges|all default all
 *
 * The endpoint is super-admin only so regular admins cannot use it to
 * reverse-engineer each other's changes. admin_edits itself has an RLS
 * policy that lets any admin see their *own* rows for future "my
 * activity" self-service.
 */

type ActivityItem = {
  id: string
  kind: 'edit' | 'merge' | 'unmerge'
  actor_email: string | null
  actor_role: 'admin' | 'super_admin' | null
  created_at: string
  entity_id: number | null
  summary: string
  details: unknown
}

const KIND_VALUES = new Set(['edits', 'merges', 'all'])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await requireAdmin(req, res, { requireSuper: true })
  if (!session) return

  const rawLimit = parseInt(String(req.query.limit ?? '100'), 10)
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 500)) : 100
  const actor = typeof req.query.actor === 'string' ? req.query.actor.trim() : ''
  const kind = typeof req.query.kind === 'string' && KIND_VALUES.has(req.query.kind)
    ? (req.query.kind as 'edits' | 'merges' | 'all')
    : 'all'

  const supabase = getSupabaseAdmin()
  const items: ActivityItem[] = []

  if (kind === 'edits' || kind === 'all') {
    let q = supabase
      .from('admin_edits')
      .select(
        'edit_id, actor_user_id, actor_email, actor_role, target_type, target_id, entity_id, changes, note, source, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(limit)
    if (actor) {
      // Allow either email or uuid; Supabase lets us OR-filter in one call.
      q = q.or(`actor_email.ilike.%${actor}%,actor_user_id.eq.${actor}`)
    }
    const { data, error } = await q
    if (error) {
      console.error('[activity] edits:', error)
      return res.status(500).json({ error: error.message })
    }
    for (const row of data ?? []) {
      const changed = row.changes && typeof row.changes === 'object'
        ? Object.keys(row.changes as Record<string, unknown>)
        : []
      items.push({
        id: `edit-${row.edit_id}`,
        kind: 'edit',
        actor_email: row.actor_email,
        actor_role: row.actor_role as 'admin' | 'super_admin',
        created_at: row.created_at,
        entity_id: row.entity_id,
        summary: `Edited ${row.target_type} ${row.target_id}${
          changed.length ? ` (${changed.join(', ')})` : ''
        }`,
        details: {
          target_type: row.target_type,
          target_id: row.target_id,
          changes: row.changes,
          note: row.note,
          source: row.source,
        },
      })
    }
  }

  if (kind === 'merges' || kind === 'all') {
    let q = supabase
      .from('entity_merges')
      .select(
        'merge_id, parent_entity_id, child_entity_id, merged_by, merged_by_user_id, reason, snapshot, merged_at, reverted_at, reverted_by, reverted_by_user_id'
      )
      .order('merged_at', { ascending: false })
      .limit(limit)
    if (actor) {
      q = q.or(
        `merged_by.ilike.%${actor}%,merged_by_user_id.eq.${actor},reverted_by.ilike.%${actor}%,reverted_by_user_id.eq.${actor}`
      )
    }
    const { data, error } = await q
    if (error) {
      console.error('[activity] merges:', error)
      return res.status(500).json({ error: error.message })
    }
    for (const row of data ?? []) {
      // Capture the parent merge row first. If reverted, also emit a
      // secondary item so the feed shows the reversal as its own event.
      items.push({
        id: `merge-${row.merge_id}`,
        kind: 'merge',
        actor_email: row.merged_by,
        actor_role: null,
        created_at: row.merged_at,
        entity_id: row.parent_entity_id,
        summary: `Merged child #${row.child_entity_id} into parent #${row.parent_entity_id}`,
        details: {
          merge_id: row.merge_id,
          parent_entity_id: row.parent_entity_id,
          child_entity_id: row.child_entity_id,
          reason: row.reason,
          snapshot: row.snapshot,
          reverted_at: row.reverted_at,
        },
      })
      if (row.reverted_at) {
        items.push({
          id: `unmerge-${row.merge_id}`,
          kind: 'unmerge',
          actor_email: row.reverted_by,
          actor_role: null,
          created_at: row.reverted_at,
          entity_id: row.parent_entity_id,
          summary: `Reverted merge of child #${row.child_entity_id} from parent #${row.parent_entity_id}`,
          details: {
            merge_id: row.merge_id,
            parent_entity_id: row.parent_entity_id,
            child_entity_id: row.child_entity_id,
          },
        })
      }
    }
  }

  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    items: items.slice(0, limit),
    count: items.length,
    self: session,
  })
}
