import type { NextApiRequest, NextApiResponse } from 'next'
import { requireViewer } from '../../../../lib/viewerAuth'
import { getSupabaseAdmin } from '../../../../lib/supabaseNew'

/**
 * DELETE /api/me/stars/[entityId]
 *
 * Unstar an entity. Idempotent — deleting a row that isn't there still
 * returns 200. We match on (user_id, entity_id) so users can only drop
 * their own stars even through the service-role client.
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const viewer = await requireViewer(req, res)
  if (!viewer) return

  const raw = req.query.entityId
  const entityId = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(entityId)) {
    return res.status(400).json({ error: 'Invalid entity id' })
  }

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('user_stars')
    .delete()
    .eq('user_id', viewer.user.id)
    .eq('entity_id', entityId)

  if (error) {
    console.error('[DELETE /api/me/stars]', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ ok: true })
}
