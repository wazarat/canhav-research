import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../lib/supabaseNew'

/**
 * POST /api/admin/unmerge-entities
 * Body: { merge_id: number }
 *
 * Reverses a single merge by:
 *
 *   1. Restoring entity_classifications rows that were deleted from the
 *      child during merge (snapshot.deleted_child_classifications).
 *   2. Rolling back any classification updates the merge wrote onto the
 *      parent (snapshot.classification_updates[].before).
 *   3. Rolling back any root-entity field writes the merge pushed to the
 *      parent (snapshot.parent_before).
 *   4. Restoring the child's original parent_entity_id.
 *   5. Stamping reverted_at / reverted_by on the audit row (never deleted
 *      so the history is always inspectable).
 *
 * If any step fails we bail before flipping parent_entity_id so the admin
 * can retry without leaving classifications in an inconsistent state.
 */

type Body = { merge_id?: number }

interface Snapshot {
  prev_parent_entity_id?: number | null
  parent_before?: Record<string, unknown>
  classification_updates?: Array<{
    parent_classification_id: number
    subsector_id: number
    before: Record<string, unknown>
  }>
  deleted_child_classifications?: Array<Record<string, unknown>>
}

const CLASSIFICATION_RESTORE_FIELDS = [
  'entity_classification_id',
  'entity_id',
  'subsector_id',
  'is_primary',
  'description',
  'reason_for_inclusion',
  'practitioners_note',
  'practitioner_validation_check',
  'website',
  'maintaining_organization',
] as const

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res)
  if (!session) return
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { merge_id } = (req.body ?? {}) as Body
  const id = Number(merge_id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'merge_id must be a positive integer' })
  }

  const supabase = getSupabaseAdmin()
  try {
    const { data: audit, error: auditErr } = await supabase
      .from('entity_merges')
      .select('merge_id, parent_entity_id, child_entity_id, snapshot, reverted_at')
      .eq('merge_id', id)
      .maybeSingle()
    if (auditErr) throw auditErr
    if (!audit) return res.status(404).json({ error: 'merge_id not found' })
    if (audit.reverted_at) {
      return res.status(409).json({ error: 'merge already reverted' })
    }

    const snapshot: Snapshot =
      audit.snapshot && typeof audit.snapshot === 'object'
        ? (audit.snapshot as Snapshot)
        : {}

    const prevParent = snapshot.prev_parent_entity_id ?? null

    // 1. Restore deleted child classifications. Re-insert the snapshotted
    //    rows verbatim; entity_classification_id is preserved so any
    //    external references stay valid.
    const deleted = snapshot.deleted_child_classifications ?? []
    if (deleted.length > 0) {
      const payload = deleted.map((row) => {
        const clean: Record<string, unknown> = {}
        for (const key of CLASSIFICATION_RESTORE_FIELDS) {
          if (row[key] !== undefined) clean[key] = row[key]
        }
        return clean
      })
      const { error: insErr } = await supabase
        .from('entity_classifications')
        .insert(payload)
      if (insErr) throw insErr
    }

    // 2. Roll back parent classification updates the merge had applied.
    const classificationUpdates = snapshot.classification_updates ?? []
    for (const upd of classificationUpdates) {
      if (!upd.parent_classification_id || !upd.before) continue
      const rollback: Record<string, unknown> = { ...upd.before }
      if (Object.keys(rollback).length === 0) continue
      const { error: rbErr } = await supabase
        .from('entity_classifications')
        .update(rollback)
        .eq('entity_classification_id', upd.parent_classification_id)
      if (rbErr) throw rbErr
    }

    // 3. Roll back any parent entity field writes captured during the merge.
    const parentBefore = snapshot.parent_before
    if (parentBefore && Object.keys(parentBefore).length > 0) {
      const { error: entRbErr } = await supabase
        .from('entities')
        .update({ ...parentBefore, updated_at: new Date().toISOString() })
        .eq('entity_id', audit.parent_entity_id)
      if (entRbErr) throw entRbErr
    }

    // 4. Restore the child's previous parent pointer.
    const { error: updErr } = await supabase
      .from('entities')
      .update({ parent_entity_id: prevParent })
      .eq('entity_id', audit.child_entity_id)
    if (updErr) throw updErr

    // 5. Stamp audit row as reverted.
    const { error: stampErr } = await supabase
      .from('entity_merges')
      .update({
        reverted_at: new Date().toISOString(),
        reverted_by: session.user.email,
        reverted_by_user_id: session.user.id,
      })
      .eq('merge_id', id)
    if (stampErr) throw stampErr

    return res.status(200).json({
      ok: true,
      merge_id: id,
      child_entity_id: audit.child_entity_id,
      restored_parent_entity_id: prevParent,
      restored_classifications: deleted.length,
      rolled_back_classification_updates: classificationUpdates.length,
      rolled_back_parent_fields: parentBefore ? Object.keys(parentBefore) : [],
    })
  } catch (err: any) {
    console.error('[unmerge-entities] error:', err)
    return res.status(500).json({ error: err?.message ?? 'Internal server error' })
  }
}
