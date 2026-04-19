import type { NextApiRequest, NextApiResponse } from 'next'
import { requireViewer } from '../../../lib/viewerAuth'
import { getSupabaseAdmin } from '../../../lib/supabaseNew'

/**
 * /api/me/stars
 *
 * GET  → list the caller's starred companies, hydrated with entity metadata
 *        (name, logo, sector, subsector, HQ, founded, funding_stage, website)
 *        so the /saved page can render cards directly.
 * POST → star an entity by id. Body: { entity_id: number, note?: string }
 *        Idempotent — returns the existing row if already starred.
 *
 * All actions are tied to the viewer session (Supabase auth cookie). We use
 * the service-role client for reads/writes so we can resolve the root entity
 * even if a user starred a collapsed child later merged under a parent.
 */

interface StarRow {
  star_id: number
  entity_id: number
  note: string | null
  created_at: string
}

interface HydratedStar {
  star_id: number
  entity_id: number
  root_entity_id: number | null
  note: string | null
  created_at: string
  name: string | null
  logo_url: string | null
  sector: string | null
  subsector: string | null
  sectors: string[] | null
  subsectors: string[] | null
  hq_location: string | null
  year_founded: number | null
  funding_stage: string | null
  canonical_website: string | null
  total_funding_usd: number | null
  status: string | null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const viewer = await requireViewer(req, res)
  if (!viewer) return

  const admin = getSupabaseAdmin()

  if (req.method === 'GET') {
    const { data: stars, error } = await admin
      .from('user_stars')
      .select('star_id, entity_id, note, created_at')
      .eq('user_id', viewer.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET /api/me/stars]', error)
      return res.status(500).json({ error: error.message })
    }

    const rows = (stars ?? []) as StarRow[]
    if (rows.length === 0) return res.status(200).json({ stars: [] as HydratedStar[] })

    const entityIds = rows.map((r) => r.entity_id)

    // Pull grid view rows for each starred entity. If the user starred a
    // child that has since been collapsed under a parent, v_market_map_grid
    // won't surface the child row — we fall back to public.entities in a
    // second pass so orphaned stars stay resolvable.
    const { data: gridRows } = await admin
      .from('v_market_map_grid')
      .select(
        'entity_id, entity_name, logo_url, hq_location, year_founded, funding_stage, canonical_website, status, primary_sector, primary_subsector, sectors, subsectors'
      )
      .in('entity_id', entityIds)

    // total_funding_usd lives on public.entities, not the grid view. Fetch
    // it in a separate pass so starred cards can surface funding totals.
    const { data: fundingRows } = await admin
      .from('entities')
      .select('entity_id, total_funding_usd')
      .in('entity_id', entityIds)
    const fundingById = new Map<number, number | null>()
    for (const r of fundingRows ?? []) {
      fundingById.set((r as any).entity_id, (r as any).total_funding_usd ?? null)
    }

    const gridById = new Map<number, Record<string, unknown>>()
    for (const g of gridRows ?? []) {
      gridById.set((g as any).entity_id as number, g as Record<string, unknown>)
    }

    // Fetch fallback data (parent resolution) for stars missing from grid.
    const missingIds = entityIds.filter((id) => !gridById.has(id))
    let fallbackById = new Map<number, { entity_name: string | null; parent_entity_id: number | null; logo_url: string | null }>()
    if (missingIds.length > 0) {
      const { data: fallbackRows } = await admin
        .from('entities')
        .select('entity_id, entity_name, parent_entity_id, logo_url')
        .in('entity_id', missingIds)
      for (const r of fallbackRows ?? []) {
        fallbackById.set((r as any).entity_id, {
          entity_name: (r as any).entity_name,
          parent_entity_id: (r as any).parent_entity_id,
          logo_url: (r as any).logo_url,
        })
      }
    }

    const hydrated: HydratedStar[] = rows.map((r) => {
      const g = gridById.get(r.entity_id)
      if (g) {
        return {
          star_id: r.star_id,
          entity_id: r.entity_id,
          root_entity_id: r.entity_id,
          note: r.note,
          created_at: r.created_at,
          name: (g.entity_name as string | null) ?? null,
          logo_url: (g.logo_url as string | null) ?? null,
          sector: (g.primary_sector as string | null) ?? null,
          subsector: (g.primary_subsector as string | null) ?? null,
          sectors: (g.sectors as string[] | null) ?? null,
          subsectors: (g.subsectors as string[] | null) ?? null,
          hq_location: (g.hq_location as string | null) ?? null,
          year_founded: (g.year_founded as number | null) ?? null,
          funding_stage: (g.funding_stage as string | null) ?? null,
          canonical_website: (g.canonical_website as string | null) ?? null,
          total_funding_usd: fundingById.get(r.entity_id) ?? null,
          status: (g.status as string | null) ?? null,
        }
      }
      const f = fallbackById.get(r.entity_id)
      return {
        star_id: r.star_id,
        entity_id: r.entity_id,
        root_entity_id: f?.parent_entity_id ?? null,
        note: r.note,
        created_at: r.created_at,
        name: f?.entity_name ?? null,
        logo_url: f?.logo_url ?? null,
        sector: null,
        subsector: null,
        sectors: null,
        subsectors: null,
        hq_location: null,
        year_founded: null,
        funding_stage: null,
        canonical_website: null,
        total_funding_usd: null,
        status: null,
      }
    })

    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
    return res.status(200).json({ stars: hydrated })
  }

  if (req.method === 'POST') {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
    const rawId = body.entity_id
    const entityId = Number(rawId)
    if (!Number.isFinite(entityId)) {
      return res.status(400).json({ error: 'entity_id (number) is required' })
    }
    const note = typeof body.note === 'string' ? body.note.slice(0, 500) : null

    // If entity doesn't exist, bail early. Also resolves collapsed children
    // up to the parent so stars land on the canonical root.
    const { data: entity, error: entErr } = await admin
      .from('entities')
      .select('entity_id, parent_entity_id')
      .eq('entity_id', entityId)
      .maybeSingle()
    if (entErr) {
      console.error('[POST /api/me/stars] entity lookup', entErr)
      return res.status(500).json({ error: entErr.message })
    }
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' })
    }
    const rootId = (entity as any).parent_entity_id ?? (entity as any).entity_id

    const { data, error } = await admin
      .from('user_stars')
      .upsert(
        { user_id: viewer.user.id, entity_id: rootId, note },
        { onConflict: 'user_id,entity_id' }
      )
      .select('star_id, entity_id, note, created_at')
      .maybeSingle()

    if (error) {
      console.error('[POST /api/me/stars]', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ star: data })
  }

  res.setHeader('Allow', 'GET,POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
