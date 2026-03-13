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

// Map sector names to their masterdata v_*_clean views (richer data than *_details tables)
const SECTOR_VIEW_MAP: Record<string, string> = {
  'Core Protocol Architecture': 'v_core_protocol_architecture_clean',
  'Rollup & Scaling Frameworks': 'v_rollup_scaling_clean',
  'Monetary & Access Rails': 'v_monetary_access_rails_clean',
  'DeFi Systems Architecture': 'v_defi_systems_architecture_clean',
  'Data & Consensus Infrastructure': 'v_data_consensus_infra_clean',
  'Advanced Compute & Integration': 'v_advanced_compute_integration_clean',
  'Governance & Enterprise Framework': 'v_governance_enterprise_framework_clean',
}

// Columns to exclude from sector detail display (base fields already shown in classifications)
const EXCLUDED_COLS = new Set([
  'entity_id', 'created_at', 'updated_at',
  'entity_name', 'subsector_name', 'raw_org', 'raw_orgs',
  'website', 'description', 'reason_for_inclusion',
  'practitioners_note', 'practitioner_validation_check',
  'entity_group_key', 'entity_key', 'organization_key',
])

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

    // Determine unique sectors and fetch detail data from masterdata v_*_clean views
    const uniqueSectors = Array.from(new Set(mappedClassifications.map((c: EntityClassification) => c.sector_name)))
    const sectorDetails: SectorDetail[] = []
    const entityName = (entity.entity_name || '').trim()

    for (const sectorName of uniqueSectors) {
      const viewName = SECTOR_VIEW_MAP[sectorName]
      if (!viewName) continue

      try {
        const { data: viewRows, error: viewError } = await masterdata
          .from(viewName)
          .select('*')
          .eq('entity_name', entityName)

        if (viewError) {
          console.error(`Error fetching ${viewName}:`, viewError.message)
          continue
        }

        if (viewRows && viewRows.length > 0) {
          // Merge fields from all matching rows (entity may appear multiple times for different subsectors)
          const allFields: Record<string, string> = {}
          for (const row of viewRows) {
            for (const [key, value] of Object.entries(row)) {
              if (!EXCLUDED_COLS.has(key) && value !== null && value !== '') {
                allFields[key] = String(value)
              }
            }
          }
          if (Object.keys(allFields).length > 0) {
            sectorDetails.push({ sector_name: sectorName, table_name: viewName, fields: allFields })
          }
        }
      } catch (e) {
        console.error(`Error fetching ${viewName}:`, e)
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
