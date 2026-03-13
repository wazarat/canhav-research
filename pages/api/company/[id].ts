import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '../../../lib/supabaseNew'

export interface EntityClassification {
  entity_classification_id: number
  sector_name: string
  subsector_name: string
  description: string
  website: string
  maintaining_organization: string
  reason_for_inclusion: string
  practitioners_note: string
  practitioner_validation_check: string
}

export interface CompanyDetail {
  entity_id: number
  entity_name: string
  classifications: EntityClassification[]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CompanyDetail | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  const entityId = parseInt(id as string, 10)

  if (isNaN(entityId)) {
    return res.status(400).json({ error: 'Invalid entity ID' })
  }

  try {
    const supabase = getSupabaseAdmin()

    // Get entity name
    const { data: entity, error: entityError } = await supabase
      .from('entities')
      .select('entity_id, entity_name')
      .eq('entity_id', entityId)
      .single()

    if (entityError || !entity) {
      return res.status(404).json({ error: 'Entity not found' })
    }

    // Get all classifications for this entity (shows all subsectors it belongs to)
    const { data: classifications, error: classError } = await supabase
      .from('entity_classifications')
      .select(`
        entity_classification_id,
        subsectors ( subsector_name, sectors ( sector_name ) ),
        description,
        website,
        maintaining_organization,
        reason_for_inclusion,
        practitioners_note,
        practitioner_validation_check
      `)
      .eq('entity_id', entityId)
      .order('entity_classification_id', { ascending: true })

    if (classError) {
      console.error('Classifications query error:', classError)
      return res.status(500).json({ error: 'Failed to fetch classifications' })
    }

    const result: CompanyDetail = {
      entity_id: entity.entity_id,
      entity_name: (entity.entity_name || '').trim(),
      classifications: (classifications || []).map((row: any) => ({
        entity_classification_id: row.entity_classification_id,
        sector_name: row.subsectors?.sectors?.sector_name || '',
        subsector_name: row.subsectors?.subsector_name || '',
        description: row.description || '',
        website: row.website || '',
        maintaining_organization: row.maintaining_organization || '',
        reason_for_inclusion: row.reason_for_inclusion || '',
        practitioners_note: row.practitioners_note || '',
        practitioner_validation_check: row.practitioner_validation_check || '',
      })),
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json(result)
  } catch (err) {
    console.error('API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
