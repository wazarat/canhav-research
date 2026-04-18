import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '../../lib/supabaseNew'

/**
 * Market map grid shape.
 *
 * One row per ROOT company (dedup rules set by v_market_map_grid):
 *   - No double counting: a company that spans multiple sectors appears once.
 *   - `sectors` / `subsectors` arrays carry every tag it belongs to, so the UI
 *     can filter by any sector without duplicating cards.
 *   - `primary_*` fields give the card its headline sector, copy and color.
 *   - `sector` / `subsector` are kept as aliases for the primary values for
 *     backwards compatibility with the existing MarketMap component.
 */
export interface MarketMapEntity {
  entity_id: number
  name: string
  // Primary (headline) classification — used for card color + main copy
  sector: string
  subsector: string
  description?: string
  website?: string
  maintaining_organization?: string
  // All tags for filtering — multi-sector entities have length > 1
  sectors: string[]
  subsectors: string[]
  // Company-level attributes (nullable until enriched)
  canonical_website?: string | null
  logo_url?: string | null
  year_founded?: number | null
  hq_location?: string | null
  funding_stage?: string | null
  twitter_handle?: string | null
  github_org?: string | null
  tags?: string[] | null
  token_symbol?: string | null
  chains?: string[] | null
  status?: string | null
  // Bookkeeping
  classification_count: number
  sub_entity_count: number
}

type GridRow = {
  entity_id: number
  entity_name: string
  canonical_website: string | null
  logo_url: string | null
  year_founded: number | null
  hq_location: string | null
  funding_stage: string | null
  twitter_handle: string | null
  github_org: string | null
  tags: string[] | null
  token_symbol: string | null
  chains: string[] | null
  status: string | null
  primary_sector: string | null
  primary_subsector: string | null
  primary_description: string | null
  primary_classification_website: string | null
  primary_maintaining_organization: string | null
  sectors: string[] | null
  subsectors: string[] | null
  classification_count: number
  sub_entities: Array<{ entity_id: number; entity_name: string }> | null
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ companies: MarketMapEntity[] } | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('v_market_map_grid')
      .select('*')
      .order('entity_name', { ascending: true })

    if (error) {
      console.error('Supabase query error:', error)
      return res.status(500).json({ error: 'Failed to fetch companies' })
    }

    const rows = (data || []) as GridRow[]

    const companies: MarketMapEntity[] = rows
      .map((row) => {
        const primarySector = row.primary_sector || (row.sectors?.[0] ?? '')
        const primarySubsector = row.primary_subsector || (row.subsectors?.[0] ?? '')
        return {
          entity_id: row.entity_id,
          name: (row.entity_name || '').trim(),
          sector: primarySector,
          subsector: primarySubsector,
          description: row.primary_description || undefined,
          website: row.primary_classification_website || undefined,
          maintaining_organization: row.primary_maintaining_organization || undefined,
          sectors: row.sectors ?? (primarySector ? [primarySector] : []),
          subsectors: row.subsectors ?? (primarySubsector ? [primarySubsector] : []),
          canonical_website: row.canonical_website,
          logo_url: row.logo_url,
          year_founded: row.year_founded,
          hq_location: row.hq_location,
          funding_stage: row.funding_stage,
          twitter_handle: row.twitter_handle,
          github_org: row.github_org,
          tags: row.tags,
          token_symbol: row.token_symbol,
          chains: row.chains,
          status: row.status,
          classification_count: row.classification_count ?? row.sectors?.length ?? 1,
          sub_entity_count: row.sub_entities?.length ?? 0,
        }
      })
      .filter((c) => c.name && c.sector && c.subsector)

    // No edge/browser caching — the market map subscribes to Supabase
    // Realtime and refetches on every change. A stale CDN copy would defeat
    // that. `no-store` forces a fresh hit on every request (~100-200ms).
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
    return res.status(200).json({ companies })
  } catch (err) {
    console.error('API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
