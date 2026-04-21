import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../lib/supabaseNew'

/**
 * POST /api/admin/merge-preview
 * Body: { parent_entity_id: number, child_entity_id: number }
 *
 * Returns a diff-style preview of every reconcilable value between the
 * would-be parent and child. Used by MergeWithPicker's second step so the
 * admin can consciously decide, field-by-field, which value should
 * "win" on the parent after the merge.
 *
 * Two buckets of reconcilable data are surfaced:
 *
 *   1. Root entity fields  — columns on public.entities (name, website,
 *      logo, socials, funding, tags, etc.). Rendered flat at the top of
 *      the UI.
 *
 *   2. Classification groups — for every subsector where BOTH the parent
 *      and the child currently have a row in public.entity_classifications
 *      we surface the descriptive fields (description, reason_for_inclusion,
 *      practitioners_note, practitioner_validation_check, website,
 *      maintaining_organization, is_primary). On merge-apply the winning
 *      values are written onto the parent's classification and the child's
 *      duplicate classification is deleted (snapshotted so unmerge can
 *      restore it).
 *
 * Subsector coverage that only exists on one side is returned for display
 * purposes but needs no reconciliation — child-only classifications simply
 * tag along under the child row (which becomes a sub-entity of the parent)
 * and are rolled up into the parent's detail page automatically.
 *
 * Fields are split by kind so the client can render the right picker:
 *   - scalar: picker is {keep_parent | use_child}
 *   - text:   same, with 'keep_parent' default when both sides are present
 *   - array:  picker is {keep_parent | use_child | union}
 *   - bool:   same as scalar
 */

type Body = { parent_entity_id?: number; child_entity_id?: number }

type Kind = 'scalar' | 'text' | 'array' | 'bool'

interface FieldSpec {
  key: string
  label: string
  kind: Kind
}

const ENTITY_FIELDS: FieldSpec[] = [
  { key: 'entity_name',         label: 'Name',                 kind: 'scalar' },
  { key: 'canonical_website',   label: 'Website',              kind: 'scalar' },
  { key: 'logo_url',            label: 'Logo URL',             kind: 'scalar' },
  { key: 'long_description',    label: 'Long description',     kind: 'text'   },
  { key: 'year_founded',        label: 'Year founded',         kind: 'scalar' },
  { key: 'hq_location',         label: 'HQ location',          kind: 'scalar' },
  { key: 'funding_stage',       label: 'Funding stage',        kind: 'scalar' },
  { key: 'total_funding_usd',   label: 'Total funding (USD)',  kind: 'scalar' },
  { key: 'last_funding_date',   label: 'Last funding date',    kind: 'scalar' },
  { key: 'token_symbol',        label: 'Token symbol',         kind: 'scalar' },
  { key: 'status',              label: 'Status',               kind: 'scalar' },
  { key: 'twitter_handle',      label: 'Twitter',              kind: 'scalar' },
  { key: 'github_org',          label: 'GitHub org',           kind: 'scalar' },
  { key: 'linkedin_url',        label: 'LinkedIn',             kind: 'scalar' },
  { key: 'discord_url',         label: 'Discord',              kind: 'scalar' },
  { key: 'telegram_url',        label: 'Telegram',             kind: 'scalar' },
  { key: 'farcaster_handle',    label: 'Farcaster',            kind: 'scalar' },
  { key: 'tags',                label: 'Tags',                 kind: 'array'  },
  { key: 'founders',            label: 'Founders',             kind: 'array'  },
  { key: 'investors',           label: 'Investors',            kind: 'array'  },
  { key: 'chains',              label: 'Chains',               kind: 'array'  },
]

// Mirrors the admin classification PATCH whitelist plus `is_primary`, which
// the merge flow is allowed to flip (an explicit primary flag is often what
// the admin wants to reconcile when two companies overlap on a subsector).
const CLASSIFICATION_FIELDS: FieldSpec[] = [
  { key: 'description',                   label: 'Description',               kind: 'text'   },
  { key: 'reason_for_inclusion',          label: 'Reason for inclusion',      kind: 'text'   },
  { key: 'practitioners_note',            label: "Practitioner's note",       kind: 'text'   },
  { key: 'practitioner_validation_check', label: 'Validation check',          kind: 'text'   },
  { key: 'website',                       label: 'Website (classification)',  kind: 'scalar' },
  { key: 'maintaining_organization',      label: 'Maintained by',             kind: 'scalar' },
  { key: 'is_primary',                    label: 'Mark as primary',           kind: 'bool'   },
]

const ENTITY_SELECT_COLS =
  'entity_id,entity_name,parent_entity_id,' + ENTITY_FIELDS.map((f) => f.key).join(',')

const CLASSIFICATION_SELECT_COLS =
  [
    'entity_classification_id',
    'entity_id',
    'subsector_id',
    'is_primary',
    'description',
    'reason_for_inclusion',
    'practitioners_note',
    'practitioner_validation_check',
    'website',
    'maintaining_organization',
  ].join(',')

function normArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return Array.from(new Set(v.map((x) => String(x).trim()).filter(Boolean)))
}

function valuesEqual(kind: Kind, a: unknown, b: unknown): boolean {
  if (kind === 'array') {
    const aa = normArray(a)
    const bb = normArray(b)
    if (aa.length !== bb.length) return false
    return aa.every((v, i) => v === bb[i])
  }
  if (kind === 'bool') {
    return Boolean(a) === Boolean(b)
  }
  const na = a === null || a === undefined || a === '' ? null : a
  const nb = b === null || b === undefined || b === '' ? null : b
  return na === nb
}

function isEmpty(kind: Kind, v: unknown): boolean {
  if (kind === 'array') return normArray(v).length === 0
  // Booleans are never "empty" — false is a meaningful value.
  if (kind === 'bool') return v === null || v === undefined
  return v === null || v === undefined || v === ''
}

type Resolution = 'parent' | 'child' | 'union'

interface ReconciledField {
  key: string
  label: string
  kind: Kind
  parent_value: unknown
  child_value: unknown
  parent_empty: boolean
  child_empty: boolean
  equal: boolean
  conflict: boolean
  union_value: string[] | null
  default_resolution: Resolution
}

function reconcile(spec: FieldSpec, parentVal: unknown, childVal: unknown): ReconciledField {
  const parentEmpty = isEmpty(spec.kind, parentVal)
  const childEmpty = isEmpty(spec.kind, childVal)
  const equal = valuesEqual(spec.kind, parentVal, childVal)

  let defaultResolution: Resolution = 'parent'
  if (!parentEmpty && childEmpty) defaultResolution = 'parent'
  else if (parentEmpty && !childEmpty) defaultResolution = 'child'
  else if (!parentEmpty && !childEmpty && !equal) {
    defaultResolution = spec.kind === 'array' ? 'union' : 'parent'
  }

  return {
    key: spec.key,
    label: spec.label,
    kind: spec.kind,
    parent_value: spec.kind === 'array' ? normArray(parentVal) : parentVal ?? null,
    child_value: spec.kind === 'array' ? normArray(childVal) : childVal ?? null,
    parent_empty: parentEmpty,
    child_empty: childEmpty,
    equal,
    conflict: !equal && !parentEmpty && !childEmpty,
    union_value:
      spec.kind === 'array'
        ? Array.from(new Set([...normArray(parentVal), ...normArray(childVal)]))
        : null,
    default_resolution: defaultResolution,
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res)
  if (!session) return
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = (req.body ?? {}) as Body
  const parentId = Number(body.parent_entity_id)
  const childId = Number(body.child_entity_id)
  if (!Number.isInteger(parentId) || parentId <= 0) {
    return res.status(400).json({ error: 'parent_entity_id must be a positive integer' })
  }
  if (!Number.isInteger(childId) || childId <= 0) {
    return res.status(400).json({ error: 'child_entity_id must be a positive integer' })
  }
  if (parentId === childId) {
    return res.status(400).json({ error: 'parent and child cannot be the same entity' })
  }

  const supabase = getSupabaseAdmin()

  // ---------------------------------------------------------------
  // 1. Root entity rows
  // ---------------------------------------------------------------
  const { data: rowsRaw, error } = await supabase
    .from('entities')
    .select(ENTITY_SELECT_COLS)
    .in('entity_id', [parentId, childId])
  if (error) {
    console.error('[merge-preview] entity fetch failed:', error)
    return res.status(500).json({ error: error.message })
  }
  const rows = (rowsRaw ?? []) as unknown as Array<Record<string, any>>
  const parent = rows.find((r) => r.entity_id === parentId)
  const child = rows.find((r) => r.entity_id === childId)
  if (!parent) return res.status(404).json({ error: 'parent entity not found' })
  if (!child) return res.status(404).json({ error: 'child entity not found' })
  if (parent.parent_entity_id !== null) {
    return res.status(400).json({
      error: `parent entity ${parentId} is itself a child of ${parent.parent_entity_id}; pick its root instead`,
    })
  }

  const fields = ENTITY_FIELDS.map((f) =>
    reconcile(f, parent[f.key] ?? null, child[f.key] ?? null)
  )

  // ---------------------------------------------------------------
  // 2. Classification rows (one per subsector on each side)
  // ---------------------------------------------------------------
  const { data: clRaw, error: clErr } = await supabase
    .from('entity_classifications')
    .select(CLASSIFICATION_SELECT_COLS)
    .in('entity_id', [parentId, childId])
  if (clErr) {
    console.error('[merge-preview] classification fetch failed:', clErr)
    return res.status(500).json({ error: clErr.message })
  }
  const classifications = (clRaw ?? []) as unknown as Array<Record<string, any>>
  const parentCls = classifications.filter((r) => r.entity_id === parentId)
  const childCls = classifications.filter((r) => r.entity_id === childId)

  const parentBySubsector = new Map<number, Record<string, any>>()
  parentCls.forEach((r) => parentBySubsector.set(Number(r.subsector_id), r))
  const childBySubsector = new Map<number, Record<string, any>>()
  childCls.forEach((r) => childBySubsector.set(Number(r.subsector_id), r))

  const subsectorIdsToHydrate = Array.from(
    new Set([
      ...Array.from(parentBySubsector.keys()),
      ...Array.from(childBySubsector.keys()),
    ])
  )
  const subsectorNames = new Map<number, { subsector_name: string; sector_name: string }>()
  if (subsectorIdsToHydrate.length > 0) {
    const { data: subRaw, error: subErr } = await supabase
      .from('subsectors')
      .select('subsector_id, subsector_name, sectors(sector_name)')
      .in('subsector_id', subsectorIdsToHydrate)
    if (subErr) {
      console.error('[merge-preview] subsector lookup failed:', subErr)
    } else {
      ;(subRaw ?? []).forEach((row: any) => {
        subsectorNames.set(Number(row.subsector_id), {
          subsector_name: row.subsector_name || '',
          sector_name: row.sectors?.sector_name || '',
        })
      })
    }
  }

  interface ClassificationGroup {
    subsector_id: number
    subsector_name: string
    sector_name: string
    parent_classification_id: number
    child_classification_id: number
    parent_is_primary: boolean
    child_is_primary: boolean
    fields: ReconciledField[]
    conflict_count: number
  }

  const classificationGroups: ClassificationGroup[] = []
  Array.from(parentBySubsector.keys()).forEach((subsectorId) => {
    const pRow = parentBySubsector.get(subsectorId)!
    const cRow = childBySubsector.get(subsectorId)
    if (!cRow) return
    const meta = subsectorNames.get(subsectorId) ?? {
      subsector_name: `Subsector #${subsectorId}`,
      sector_name: '',
    }
    const groupFields = CLASSIFICATION_FIELDS.map((f) =>
      reconcile(f, pRow[f.key] ?? null, cRow[f.key] ?? null)
    )
    classificationGroups.push({
      subsector_id: subsectorId,
      subsector_name: meta.subsector_name,
      sector_name: meta.sector_name,
      parent_classification_id: Number(pRow.entity_classification_id),
      child_classification_id: Number(cRow.entity_classification_id),
      parent_is_primary: !!pRow.is_primary,
      child_is_primary: !!cRow.is_primary,
      fields: groupFields,
      conflict_count: groupFields.filter((f) => f.conflict).length,
    })
  })
  classificationGroups.sort((a, b) =>
    a.subsector_name.localeCompare(b.subsector_name)
  )

  // For classifications that only exist on one side we surface the full
  // field payload so the admin can review — there's nothing to resolve
  // (no overlap) but the data still needs to be visible before committing
  // the merge. Only classification-level text fields are included; the
  // subsector/sector metadata above provides context.
  function classificationValues(row: Record<string, any>): Record<string, unknown> {
    return {
      description: row.description ?? null,
      reason_for_inclusion: row.reason_for_inclusion ?? null,
      practitioners_note: row.practitioners_note ?? null,
      practitioner_validation_check: row.practitioner_validation_check ?? null,
      website: row.website ?? null,
      maintaining_organization: row.maintaining_organization ?? null,
    }
  }

  const parentOnlyClassifications = Array.from(parentBySubsector.entries())
    .filter(([sid]) => !childBySubsector.has(sid))
    .map(([sid, row]) => {
      const meta = subsectorNames.get(sid)
      return {
        subsector_id: sid,
        subsector_name: meta?.subsector_name ?? `#${sid}`,
        sector_name: meta?.sector_name ?? '',
        classification_id: Number(row.entity_classification_id),
        is_primary: !!row.is_primary,
        values: classificationValues(row),
      }
    })
    .sort((a, b) => a.subsector_name.localeCompare(b.subsector_name))

  const childOnlyClassifications = Array.from(childBySubsector.entries())
    .filter(([sid]) => !parentBySubsector.has(sid))
    .map(([sid, row]) => {
      const meta = subsectorNames.get(sid)
      return {
        subsector_id: sid,
        subsector_name: meta?.subsector_name ?? `#${sid}`,
        sector_name: meta?.sector_name ?? '',
        classification_id: Number(row.entity_classification_id),
        is_primary: !!row.is_primary,
        values: classificationValues(row),
      }
    })
    .sort((a, b) => a.subsector_name.localeCompare(b.subsector_name))

  return res.status(200).json({
    parent: {
      entity_id: parent.entity_id,
      entity_name: parent.entity_name,
    },
    child: {
      entity_id: child.entity_id,
      entity_name: child.entity_name,
      already_child_of_parent: child.parent_entity_id === parentId,
      currently_under_different_parent:
        child.parent_entity_id !== null && child.parent_entity_id !== parentId
          ? child.parent_entity_id
          : null,
    },
    fields,
    classification_groups: classificationGroups,
    parent_only_classifications: parentOnlyClassifications,
    child_only_classifications: childOnlyClassifications,
  })
}
