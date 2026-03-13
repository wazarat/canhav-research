import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '../../lib/supabaseNew'

export interface MarketMapEntity {
  entity_id: number
  name: string
  sector: string
  subsector: string
  description?: string
  website?: string
  maintaining_organization?: string
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
      .from('entity_classifications')
      .select(`
        entity_id,
        entities ( entity_id, entity_name ),
        subsectors ( subsector_name, sectors ( sector_name ) ),
        description,
        website,
        maintaining_organization
      `)
      .order('entity_classification_id', { ascending: true })

    if (error) {
      console.error('Supabase query error:', error)
      return res.status(500).json({ error: 'Failed to fetch companies' })
    }

    const companies: MarketMapEntity[] = (data || [])
      .map((row: any) => ({
        entity_id: row.entities?.entity_id || 0,
        name: row.entities?.entity_name?.trim() || '',
        sector: row.subsectors?.sectors?.sector_name || '',
        subsector: row.subsectors?.subsector_name || '',
        description: row.description || undefined,
        website: row.website || undefined,
        maintaining_organization: row.maintaining_organization || undefined,
      }))
      .filter((c) => c.name && c.sector && c.subsector)

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json({ companies })
  } catch (err) {
    console.error('API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
