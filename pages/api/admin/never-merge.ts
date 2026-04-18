import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../lib/supabaseNew'

/**
 * POST /api/admin/never-merge
 * Body: { entity_a: number, entity_b: number, reason?: string }
 *
 * Adds a pair to public.entity_never_merge so it stops being suggested in
 * v_merge_candidate_groups and is rejected by /api/admin/merge-entities.
 * Normalises each pair as (least, greatest) to satisfy the DB's ordered +
 * UNIQUE constraints regardless of input order.
 *
 * DELETE /api/admin/never-merge
 * Body: { entity_a: number, entity_b: number }
 * Removes a denylist entry.
 */

type Body = { entity_a?: number; entity_b?: number; reason?: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res)
  if (!session) return
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { entity_a, entity_b, reason } = (req.body ?? {}) as Body
  const a = Number(entity_a)
  const b = Number(entity_b)
  if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0 || a === b) {
    return res.status(400).json({ error: 'entity_a and entity_b must be distinct positive integers' })
  }
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)

  const supabase = getSupabaseAdmin()
  try {
    if (req.method === 'POST') {
      const { data, error } = await supabase
        .from('entity_never_merge')
        .upsert(
          {
            entity_a: lo,
            entity_b: hi,
            reason: (reason ?? '').toString().slice(0, 500) || null,
            added_by: session.user.email,
          },
          { onConflict: 'entity_a,entity_b', ignoreDuplicates: false }
        )
        .select('never_id, entity_a, entity_b, reason, added_by, added_at')
        .single()
      if (error) throw error
      return res.status(200).json({ ok: true, pair: data })
    }

    const { error } = await supabase
      .from('entity_never_merge')
      .delete()
      .eq('entity_a', lo)
      .eq('entity_b', hi)
    if (error) throw error
    return res.status(200).json({ ok: true, removed: { entity_a: lo, entity_b: hi } })
  } catch (err: any) {
    console.error('[never-merge] error:', err)
    return res.status(500).json({ error: err?.message ?? 'Internal server error' })
  }
}
