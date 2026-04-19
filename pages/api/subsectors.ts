import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '../../lib/supabaseNew'

/**
 * /api/subsectors (GET) — public directory of every subsector with its
 * parent sector, used by the /submit-company dropdown and any other
 * client surface that needs a full taxonomy list without gating.
 *
 * Cached at the edge for a minute so we don't hammer Supabase on every
 * form mount; the taxonomy changes rarely.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('subsectors')
    .select('subsector_id, subsector_name, sector_id, sectors:sector_id(sector_name)')
    .order('subsector_name', { ascending: true })

  if (error) {
    console.error('[subsectors.list]', error)
    return res.status(500).json({ error: 'Failed to load subsectors' })
  }

  const rows = (data ?? []).map((row: any) => ({
    subsector_id: row.subsector_id as number,
    subsector_name: row.subsector_name as string,
    sector_id: row.sector_id as number,
    sector_name: (row.sectors?.sector_name as string | undefined) ?? '',
  }))

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')
  return res.status(200).json({ subsectors: rows })
}
