import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '../../../../lib/supabaseNew'

/**
 * GET /api/company/[id]/related
 *
 * Returns up to 8 other root entities in the same primary subsector as
 * the queried entity, sorted alphabetically. Used by the company detail
 * sidebar ("Related companies") so visitors can lateral-browse without
 * leaving the page tree.
 *
 * Keep this small and fast — it's fetched after the main detail payload
 * and the page renders with or without it. No edge cache because the
 * page itself is realtime-subscribed; a stale CDN copy would mask fresh
 * additions.
 */

interface RelatedRow {
  entity_id: number
  entity_name: string
  canonical_website: string | null
  logo_url: string | null
  primary_subsector: string | null
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { id } = req.query
  const entityId = parseInt(id as string, 10)
  if (isNaN(entityId)) {
    return res.status(400).json({ error: 'Invalid entity ID' })
  }

  const supabase = getSupabaseAdmin()

  const { data: self, error: selfErr } = await supabase
    .from('v_market_map_grid')
    .select('primary_subsector_id, primary_subsector')
    .eq('entity_id', entityId)
    .maybeSingle()

  if (selfErr || !self?.primary_subsector_id) {
    return res.status(200).json({ related: [], subsector: null })
  }

  const { data: siblings, error: sibErr } = await supabase
    .from('v_market_map_grid')
    .select('entity_id, entity_name, canonical_website, logo_url, primary_subsector')
    .eq('primary_subsector_id', self.primary_subsector_id)
    .neq('entity_id', entityId)
    .order('entity_name', { ascending: true })
    .limit(8)

  if (sibErr) {
    return res.status(500).json({ error: 'Failed to load related' })
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
  return res.status(200).json({
    subsector: self.primary_subsector,
    related: (siblings as RelatedRow[]) || [],
  })
}
