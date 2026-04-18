import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../lib/supabaseNew'

/**
 * POST /api/admin/merge-entities
 * Body: {
 *   parent_entity_id: number,
 *   child_entity_ids: number[],
 *   reason?: string,
 * }
 *
 * Flags each child as a product variant of `parent_entity_id` by setting
 * `child.parent_entity_id = parent`. Children keep their own entity_id and
 * classifications; the existing v_market_map_grid view filters
 * `parent_entity_id IS NULL`, so the children disappear from the grid
 * automatically and their sectors/subsectors aggregate onto the parent.
 *
 * Every merge writes an audit row in public.entity_merges with a JSONB
 * snapshot of the child's previous state so unmerge-entities can fully
 * restore it.
 *
 * Server-side safeguards (beyond cookie auth):
 *   * Parent cannot merge into itself.
 *   * Parent must exist and be a root (parent_entity_id IS NULL).
 *   * Each child must exist and not already be collapsed under a DIFFERENT
 *     parent (idempotent when already under the requested parent).
 *   * Refuse any merge that's flagged in public.entity_never_merge.
 */

type Body = {
  parent_entity_id?: number
  child_entity_ids?: number[]
  reason?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res)
  if (!session) return
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = (req.body ?? {}) as Body
  const parentId = Number(body.parent_entity_id)
  const childIds = Array.isArray(body.child_entity_ids)
    ? Array.from(new Set(body.child_entity_ids.map((n) => Number(n)))).filter(
        (n) => Number.isInteger(n) && n > 0
      )
    : []
  const reason = (body.reason ?? '').toString().slice(0, 500) || null
  const mergedBy = session.user.email

  if (!Number.isInteger(parentId) || parentId <= 0) {
    return res.status(400).json({ error: 'parent_entity_id must be a positive integer' })
  }
  if (childIds.length === 0) {
    return res.status(400).json({ error: 'child_entity_ids must be a non-empty array' })
  }
  if (childIds.includes(parentId)) {
    return res.status(400).json({ error: 'parent cannot be merged into itself' })
  }

  const supabase = getSupabaseAdmin()

  try {
    const { data: parentRow, error: parentErr } = await supabase
      .from('entities')
      .select('entity_id, entity_name, parent_entity_id, canonical_website')
      .eq('entity_id', parentId)
      .maybeSingle()
    if (parentErr) throw parentErr
    if (!parentRow) return res.status(404).json({ error: 'parent entity not found' })
    if (parentRow.parent_entity_id !== null) {
      return res.status(400).json({
        error: `parent entity ${parentId} is itself a child of ${parentRow.parent_entity_id}; pick its root instead`,
      })
    }

    const { data: childRows, error: childErr } = await supabase
      .from('entities')
      .select('entity_id, entity_name, parent_entity_id, canonical_website, logo_url')
      .in('entity_id', childIds)
    if (childErr) throw childErr
    if (!childRows || childRows.length !== childIds.length) {
      const found = new Set((childRows ?? []).map((r) => r.entity_id))
      const missing = childIds.filter((id) => !found.has(id))
      return res.status(404).json({ error: 'child entities not found', missing })
    }

    const blocked = childRows.filter(
      (c) => c.parent_entity_id !== null && c.parent_entity_id !== parentId
    )
    if (blocked.length > 0) {
      return res.status(409).json({
        error: 'one or more children are already merged under a different parent',
        blocked: blocked.map((c) => ({
          child_entity_id: c.entity_id,
          current_parent_id: c.parent_entity_id,
        })),
      })
    }

    // Server-side never-merge check. Normalised pair is (least, greatest).
    const pairs = childIds.map((cid) => [
      Math.min(parentId, cid),
      Math.max(parentId, cid),
    ])
    const { data: nevers, error: neverErr } = await supabase
      .from('entity_never_merge')
      .select('entity_a, entity_b, reason')
      .in('entity_a', pairs.map((p) => p[0]))
      .in('entity_b', pairs.map((p) => p[1]))
    if (neverErr) throw neverErr
    const neverSet = new Set(
      (nevers ?? []).map((n: any) => `${n.entity_a}:${n.entity_b}`)
    )
    const blockedByNever = pairs.filter(([a, b]) => neverSet.has(`${a}:${b}`))
    if (blockedByNever.length > 0) {
      return res.status(409).json({
        error: 'one or more pairs are in entity_never_merge',
        blocked_pairs: blockedByNever,
      })
    }

    // Perform the merges one child at a time so each gets its own audit row
    // with an accurate snapshot. Still cheap: typical batch is 2-5.
    const applied: Array<{ merge_id: number; child_entity_id: number }> = []
    for (const child of childRows) {
      if (child.parent_entity_id === parentId) continue // idempotent skip

      const snapshot = {
        child_entity_id: child.entity_id,
        child_entity_name: child.entity_name,
        prev_parent_entity_id: child.parent_entity_id,
        child_canonical_website: child.canonical_website,
        child_logo_url: child.logo_url,
        applied_at: new Date().toISOString(),
      }

      const { error: updErr } = await supabase
        .from('entities')
        .update({ parent_entity_id: parentId })
        .eq('entity_id', child.entity_id)
      if (updErr) throw updErr

      const { data: auditRow, error: audErr } = await supabase
        .from('entity_merges')
        .insert({
          parent_entity_id: parentId,
          child_entity_id: child.entity_id,
          merged_by: mergedBy,
          reason,
          snapshot,
        })
        .select('merge_id')
        .single()
      if (audErr) throw audErr

      applied.push({ merge_id: auditRow.merge_id, child_entity_id: child.entity_id })
    }

    return res.status(200).json({
      ok: true,
      parent_entity_id: parentId,
      applied,
      skipped: childRows
        .filter((c) => c.parent_entity_id === parentId)
        .map((c) => c.entity_id),
    })
  } catch (err: any) {
    console.error('[merge-entities] error:', err)
    return res.status(500).json({ error: err?.message ?? 'Internal server error' })
  }
}
