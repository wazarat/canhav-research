import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../lib/supabaseNew'

/**
 * POST /api/admin/unmerge-entities
 * Body: { merge_id: number }
 *
 * Reverses a single merge by restoring the child's `parent_entity_id` from
 * the audit snapshot and stamping `reverted_at` + `reverted_by`. Audit row
 * is NEVER deleted — that way the history is always inspectable.
 */

type Body = { merge_id?: number }

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

    const prevParent =
      audit.snapshot && typeof audit.snapshot === 'object'
        ? (audit.snapshot as any).prev_parent_entity_id ?? null
        : null

    const { error: updErr } = await supabase
      .from('entities')
      .update({ parent_entity_id: prevParent })
      .eq('entity_id', audit.child_entity_id)
    if (updErr) throw updErr

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
    })
  } catch (err: any) {
    console.error('[unmerge-entities] error:', err)
    return res.status(500).json({ error: err?.message ?? 'Internal server error' })
  }
}
