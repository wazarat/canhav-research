import type { NextApiRequest, NextApiResponse } from 'next'
import { requireViewer } from '../../../../lib/viewerAuth'
import { getSupabaseAdmin } from '../../../../lib/supabaseNew'

/**
 * GET /api/company/[id]/subsector-data
 *
 * Returns one block per subsector that this entity belongs to, with the
 * sheet-derived key/value payload for that subsector (if any). Gated behind
 * the viewer session — this is the signed-in-only data.
 *
 * Response shape:
 *   {
 *     blocks: Array<{
 *       subsector_id: number
 *       subsector_name: string
 *       sector_name: string
 *       is_primary: boolean
 *       table_name: string
 *       display_schema: Array<{ key, label, type }>
 *       data: Record<string, unknown> | null
 *     }>
 *   }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const viewer = await requireViewer(req, res)
  if (!viewer) return

  const rawId = req.query.id
  const entityId = Number(Array.isArray(rawId) ? rawId[0] : rawId)
  if (!entityId || !Number.isFinite(entityId)) {
    return res.status(400).json({ error: 'Invalid entity id' })
  }

  const admin = getSupabaseAdmin()

  // 1) All subsectors this entity is classified in.
  const { data: classifications, error: cErr } = await admin
    .from('entity_classifications')
    .select(
      'subsector_id, is_primary, subsectors:subsector_id (subsector_name, sector_id, sectors:sector_id (sector_name))'
    )
    .eq('entity_id', entityId)
  if (cErr) return res.status(500).json({ error: cErr.message })

  if (!classifications || classifications.length === 0) {
    return res.status(200).json({ blocks: [] })
  }

  // 2) Registry lookup: for each subsector, what table + schema (if any)?
  const subIds = classifications.map((c) => c.subsector_id)
  const { data: registry } = await admin
    .from('subsector_tables')
    .select('subsector_id, table_name, display_schema')
    .in('subsector_id', subIds)

  const byId = new Map<number, { table_name: string; display_schema: unknown }>()
  for (const r of registry ?? []) byId.set(r.subsector_id, r)

  // 3) For each registered subsector, pull the entity's row.
  const blocks = await Promise.all(
    classifications.map(async (c) => {
      const reg = byId.get(c.subsector_id)
      const subsector = c.subsectors as unknown as {
        subsector_name: string
        sector_id: number
        sectors: { sector_name: string } | null
      } | null
      if (!reg) {
        return {
          subsector_id: c.subsector_id,
          subsector_name: subsector?.subsector_name ?? `Subsector ${c.subsector_id}`,
          sector_name: subsector?.sectors?.sector_name ?? '',
          is_primary: !!c.is_primary,
          table_name: null as string | null,
          display_schema: [],
          data: null as Record<string, unknown> | null,
        }
      }
      const { data: row } = await admin
        .from(reg.table_name)
        .select('*')
        .eq('entity_id', entityId)
        .maybeSingle()

      return {
        subsector_id: c.subsector_id,
        subsector_name: subsector?.subsector_name ?? `Subsector ${c.subsector_id}`,
        sector_name: subsector?.sectors?.sector_name ?? '',
        is_primary: !!c.is_primary,
        table_name: reg.table_name,
        display_schema: (reg.display_schema as unknown) ?? [],
        data: row ?? null,
      }
    })
  )

  return res.status(200).json({ blocks })
}
