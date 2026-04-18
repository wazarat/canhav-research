import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../lib/supabaseNew'

/**
 * GET /api/admin/subsectors
 *
 * Returns sectors + subsectors + whether each subsector already has a data
 * table registered. Used to populate the subsector dropdown in
 * /admin/subsector-ingest.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const session = await requireAdmin(req, res)
  if (!session) return

  const admin = getSupabaseAdmin()
  const [{ data: sectors }, { data: subs }, { data: tables }] = await Promise.all([
    admin.from('sectors').select('sector_id, sector_name').order('sector_name'),
    admin.from('subsectors').select('subsector_id, sector_id, subsector_name').order('subsector_name'),
    admin.from('subsector_tables').select('subsector_id, table_name, updated_at'),
  ])

  const tableMap = new Map<number, { table_name: string; updated_at: string }>()
  for (const t of tables ?? []) {
    tableMap.set(t.subsector_id, { table_name: t.table_name, updated_at: t.updated_at })
  }

  const out = (sectors ?? []).map((s) => ({
    sector_id: s.sector_id,
    sector_name: s.sector_name,
    subsectors: (subs ?? [])
      .filter((x) => x.sector_id === s.sector_id)
      .map((x) => ({
        subsector_id: x.subsector_id,
        subsector_name: x.subsector_name,
        data_table: tableMap.get(x.subsector_id) ?? null,
      })),
  }))

  return res.status(200).json({ sectors: out })
}
