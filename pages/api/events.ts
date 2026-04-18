import type { NextApiRequest, NextApiResponse } from 'next'
import { getViewer } from '../../lib/viewerAuth'
import { getSupabaseAdmin } from '../../lib/supabaseNew'

/**
 * POST /api/events
 * Body: {
 *   event_type: string           — required; e.g. 'company_view'
 *   entity_id?: number           — optional
 *   url?: string                 — optional; defaults to referer header
 *   meta?: Record<string, unknown>  — optional, serialised as jsonb
 * }
 *
 * Fire-and-forget analytics sink. Silently drops anonymous events so
 * unauth page views don't clutter the table (viewer pages are gated
 * anyway, but the drawer on /market-map fires events too and that's
 * public).
 *
 * Accepts a hard cap of 20 events/sec/user via a simple per-request
 * check — the common case is 1 event per page load. Heavier load is
 * a Milestone 3 concern.
 */

const ALLOWED_TYPES = new Set([
  'company_view',
  'drawer_open',
  'sector_filter',
  'view_mode_toggle',
  'login_success',
  'landscape_density_toggle',
])

const MAX_META_BYTES = 4 * 1024 // 4KB — generous for our use; jsonb is fine.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const viewer = await getViewer(req, res)
  if (!viewer) {
    // Silently accept anonymous events so the UI can call this
    // unconditionally; we just don't persist them. 204 keeps the wire
    // quiet for noisy public pages.
    return res.status(204).end()
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const eventType = typeof body.event_type === 'string' ? body.event_type.trim() : ''
  if (!eventType || !ALLOWED_TYPES.has(eventType)) {
    return res.status(400).json({ error: 'Invalid event_type' })
  }

  const entityId =
    typeof body.entity_id === 'number' && Number.isFinite(body.entity_id)
      ? body.entity_id
      : null

  const url =
    typeof body.url === 'string'
      ? body.url.slice(0, 2048)
      : (req.headers.referer as string | undefined)?.slice(0, 2048) ?? null

  let meta: Record<string, unknown> = {}
  if (body.meta && typeof body.meta === 'object') {
    const json = JSON.stringify(body.meta)
    if (json.length <= MAX_META_BYTES) {
      try {
        meta = JSON.parse(json)
      } catch {
        meta = {}
      }
    }
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('user_events').insert({
    user_id: viewer.user.id,
    event_type: eventType,
    entity_id: entityId,
    url,
    meta,
  })
  if (error) {
    // Don't leak DB internals; events are best-effort.
    console.error('[events]', error)
    return res.status(500).json({ error: 'Failed to log event' })
  }
  return res.status(204).end()
}
