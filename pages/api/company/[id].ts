import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin, getSupabaseMasterdata } from '../../../lib/supabaseNew'

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

export interface SectorDetail {
  sector_name: string
  table_name: string
  fields: Record<string, string>
}

export interface CompanyDetail {
  entity_id: number
  entity_name: string
  classifications: EntityClassification[]
  sector_details: SectorDetail[]
}

// Map sector names to their masterdata detail table names
const SECTOR_TABLE_MAP: Record<string, string> = {
  'Core Protocol Architecture': 'core_protocol_architecture_details',
  'Rollup & Scaling Frameworks': 'rollup_scaling_details',
  'Monetary & Access Rails': 'monetary_access_rails_details',
  'DeFi Systems Architecture': 'defi_systems_architecture_details',
  'Data & Consensus Infrastructure': 'data_consensus_infrastructure_details',
  'Advanced Compute & Integration': 'advanced_compute_integration_details',
  'Governance & Enterprise Framework': 'governance_enterprise_framework_details',
}

// Columns to exclude from display (internal/meta columns)
const EXCLUDED_COLS = new Set(['entity_id', 'created_at', 'updated_at'])

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
    const masterdata = getSupabaseMasterdata()

    // Get entity name
    const { data: entity, error: entityError } = await supabase
      .from('entities')
      .select('entity_id, entity_name')
      .eq('entity_id', entityId)
      .single()

    if (entityError || !entity) {
      return res.status(404).json({ error: 'Entity not found' })
    }

    // Get all classifications for this entity
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

    const mappedClassifications = (classifications || []).map((row: any) => ({
      entity_classification_id: row.entity_classification_id,
      sector_name: row.subsectors?.sectors?.sector_name || '',
      subsector_name: row.subsectors?.subsector_name || '',
      description: row.description || '',
      website: row.website || '',
      maintaining_organization: row.maintaining_organization || '',
      reason_for_inclusion: row.reason_for_inclusion || '',
      practitioners_note: row.practitioners_note || '',
      practitioner_validation_check: row.practitioner_validation_check || '',
    }))

    // Determine unique sectors and fetch detail data from masterdata schema
    const uniqueSectors = Array.from(new Set(mappedClassifications.map((c: EntityClassification) => c.sector_name)))
    const sectorDetails: SectorDetail[] = []

    // The masterdata schema has its own entities table with different IDs.
    // We look up by entity_name to bridge between public and masterdata schemas.
    const entityName = (entity.entity_name || '').trim()
    const { data: mdEntities } = await masterdata
      .from('entities')
      .select('entity_id')
      .eq('entity_name', entityName)

    const mdEntityIds = (mdEntities || []).map((e: any) => e.entity_id)

    if (mdEntityIds.length > 0) {
      for (const sectorName of uniqueSectors) {
        const tableName = SECTOR_TABLE_MAP[sectorName]
        if (!tableName) continue

        try {
          const { data: detailRows, error: detailError } = await masterdata
            .from(tableName)
            .select('*')
            .in('entity_id', mdEntityIds)

          if (detailError) {
            console.error(`Error fetching ${tableName}:`, detailError.message)
            continue
          }

          if (detailRows && detailRows.length > 0) {
            const row = detailRows[0]
            const fields: Record<string, string> = {}
            for (const [key, value] of Object.entries(row)) {
              if (!EXCLUDED_COLS.has(key) && value !== null && value !== '') {
                fields[key] = String(value)
              }
            }
            if (Object.keys(fields).length > 0) {
              sectorDetails.push({ sector_name: sectorName, table_name: tableName, fields })
            }
          }
        } catch (e) {
          console.error(`Error fetching ${tableName}:`, e)
        }
      }
    }

    const result: CompanyDetail = {
      entity_id: entity.entity_id,
      entity_name: (entity.entity_name || '').trim(),
      classifications: mappedClassifications,
      sector_details: sectorDetails,
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json(result)
  } catch (err) {
    console.error('API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
