import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin, getSupabaseMasterdata } from '../../../lib/supabaseNew'

export interface EntityClassification {
  entity_classification_id: number
  entity_id: number           // source entity (parent or child)
  entity_name: string
  is_primary: boolean
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
  entity_id: number                     // root entity id (what the URL resolves to)
  entity_name: string                   // root entity name
  canonical_website: string | null
  logo_url: string | null
  year_founded: number | null
  hq_location: string | null
  funding_stage: string | null
  twitter_handle: string | null
  github_org: string | null
  tags: string[] | null
  classifications: EntityClassification[]
  sector_details: SectorDetail[]
  sub_entities: Array<{ entity_id: number; entity_name: string }>
}

// Map sector names to masterdata v_*_clean views for richer sector-specific data.
const SECTOR_VIEW_MAP: Record<string, string> = {
  'Core Protocol Architecture': 'v_core_protocol_architecture_clean',
  'Rollup & Scaling Frameworks': 'v_rollup_scaling_clean',
  'Monetary & Access Rails': 'v_monetary_access_rails_clean',
  'DeFi Systems Architecture': 'v_defi_systems_architecture_clean',
  'Data & Consensus Infrastructure': 'v_data_consensus_infra_clean',
  'Advanced Compute & Integration': 'v_advanced_compute_integration_clean',
  'Governance & Enterprise Framework': 'v_governance_enterprise_framework_clean',
}

// Columns to exclude from sector detail display (base fields shown in classifications).
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

    // v_entity_detail carries both the requested entity (if root) and any
    // classifications of its collapsed children. If the requested id is a
    // child, we resolve its root via the same view and redirect the query.
    const { data: rootLookup, error: rootErr } = await supabase
      .from('v_entity_detail')
      .select('root_entity_id')
      .eq('entity_id', entityId)
      .limit(1)
      .maybeSingle()

    if (rootErr) {
      console.error('Root lookup error:', rootErr)
      return res.status(500).json({ error: 'Failed to resolve entity' })
    }

    const rootId = rootLookup?.root_entity_id ?? entityId

    // Pull every classification owned by the root or any of its children.
    const { data: detailRows, error: detailErr } = await supabase
      .from('v_entity_detail')
      .select('*')
      .eq('root_entity_id', rootId)
      .order('is_primary', { ascending: false })
      .order('sector_name', { ascending: true })
      .order('subsector_name', { ascending: true })

    if (detailErr) {
      console.error('Detail query error:', detailErr)
      return res.status(500).json({ error: 'Failed to fetch classifications' })
    }

    if (!detailRows || detailRows.length === 0) {
      return res.status(404).json({ error: 'Entity not found' })
    }

    const first = detailRows[0] as any

    const mappedClassifications: EntityClassification[] = detailRows.map((r: any) => ({
      entity_classification_id: r.entity_classification_id,
      entity_id: r.entity_id,
      entity_name: (r.entity_name || '').trim(),
      is_primary: !!r.is_primary,
      sector_name: r.sector_name || '',
      subsector_name: r.subsector_name || '',
      description: r.description || '',
      website: r.website || '',
      maintaining_organization: r.maintaining_organization || '',
      reason_for_inclusion: r.reason_for_inclusion || '',
      practitioners_note: r.practitioners_note || '',
      practitioner_validation_check: r.practitioner_validation_check || '',
    }))

    // Enrich with sector-specific columns from masterdata.v_*_clean (best-effort).
    const uniqueSectors = Array.from(new Set(mappedClassifications.map((c) => c.sector_name)))
    const rootName = (first.root_entity_name || '').trim()
    const memberNames = Array.from(
      new Set(mappedClassifications.map((c) => c.entity_name).filter(Boolean))
    )
    const sectorDetails: SectorDetail[] = []

    for (const sectorName of uniqueSectors) {
      const viewName = SECTOR_VIEW_MAP[sectorName]
      if (!viewName) continue

      try {
        const { data: viewRows, error: viewErr } = await masterdata
          .from(viewName)
          .select('*')
          .in('entity_name', memberNames.length ? memberNames : [rootName])

        if (viewErr) {
          console.error(`Error fetching ${viewName}:`, viewErr.message)
          continue
        }
        if (!viewRows || viewRows.length === 0) continue

        const allFields: Record<string, string> = {}
        for (const row of viewRows as Record<string, unknown>[]) {
          for (const [key, value] of Object.entries(row)) {
            if (EXCLUDED_COLS.has(key)) continue
            if (value === null || value === '') continue
            allFields[key] = String(value)
          }
        }
        if (Object.keys(allFields).length > 0) {
          sectorDetails.push({ sector_name: sectorName, table_name: viewName, fields: allFields })
        }
      } catch (e) {
        console.error(`Error fetching ${viewName}:`, e)
      }
    }

    // Collect the collapsed children list (distinct from classifications).
    const { data: children } = await supabase
      .from('entities')
      .select('entity_id, entity_name')
      .eq('parent_entity_id', rootId)
      .order('entity_name', { ascending: true })

    const result: CompanyDetail = {
      entity_id: rootId,
      entity_name: rootName,
      canonical_website: first.root_canonical_website ?? null,
      logo_url: first.root_logo_url ?? null,
      year_founded: first.root_year_founded ?? null,
      hq_location: first.root_hq_location ?? null,
      funding_stage: first.root_funding_stage ?? null,
      twitter_handle: first.root_twitter_handle ?? null,
      github_org: first.root_github_org ?? null,
      tags: first.root_tags ?? null,
      classifications: mappedClassifications,
      sector_details: sectorDetails,
      sub_entities: (children || []).map((c: any) => ({
        entity_id: c.entity_id,
        entity_name: (c.entity_name || '').trim(),
      })),
    }

    // No edge caching — the detail page subscribes to Supabase Realtime
    // and refetches when its entity's rows change. Edge caching would mask
    // that. See lib/useRealtimeTables.ts.
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
    return res.status(200).json(result)
  } catch (err) {
    console.error('API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
