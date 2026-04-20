import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../lib/supabaseNew'

/**
 * POST /api/admin/merge-preview
 * Body: { parent_entity_id: number, child_entity_id: number }
 *
 * Returns a diff-style preview of every reconcilable column between the
 * would-be parent and child. Used by MergeWithPicker's second step so the
 * super-admin can consciously decide, field-by-field, which value should
 * "win" on the parent after the merge.
 *
 * Fields are split into three buckets:
 *   - scalar: picker is {keep_parent | use_child}
 *   - text:   same, with 'keep_parent' default when both sides are present
 *   - array:  picker is {keep_parent | use_child | union}
 *
 * Only columns from the whitelist (matches /api/admin/entities/[id]) are
 * surfaced. The UI renders *all* fields but highlights conflicts; non-
 * conflicting fields come back with `conflict: false` so the UI can fold
 * them into an "unchanged" block.
 */

type Body = { parent_entity_id?: number; child_entity_id?: number }

type Kind = 'scalar' | 'text' | 'array'

interface FieldSpec {
  key: string
  label: string
  kind: Kind
}

const FIELDS: FieldSpec[] = [
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

const SELECT_COLS =
  'entity_id,entity_name,parent_entity_id,' + FIELDS.map((f) => f.key).join(',')

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
  const na = a === null || a === undefined || a === '' ? null : a
  const nb = b === null || b === undefined || b === '' ? null : b
  return na === nb
}

function isEmpty(kind: Kind, v: unknown): boolean {
  if (kind === 'array') return normArray(v).length === 0
  return v === null || v === undefined || v === ''
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

  const { data: rowsRaw, error } = await supabase
    .from('entities')
    .select(SELECT_COLS)
    .in('entity_id', [parentId, childId])
  if (error) {
    console.error('[merge-preview] fetch failed:', error)
    return res.status(500).json({ error: error.message })
  }
  // Dynamic select string → fall back to loose typing.
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

  const fields = FIELDS.map((f) => {
    const parentValue = parent[f.key] ?? null
    const childValue = child[f.key] ?? null
    const parentEmpty = isEmpty(f.kind, parentValue)
    const childEmpty = isEmpty(f.kind, childValue)
    const equal = valuesEqual(f.kind, parentValue, childValue)

    // Default resolution:
    //   - identical values:          'parent' (no-op)
    //   - parent empty, child has:   'child' (fill in)
    //   - parent has, child empty:   'parent' (preserve)
    //   - genuine disagreement:      'parent' (safe default, admin reviews)
    //   - array and both populated:  'union' (sensible default for lists)
    let defaultResolution: 'parent' | 'child' | 'union' = 'parent'
    if (!parentEmpty && childEmpty) defaultResolution = 'parent'
    else if (parentEmpty && !childEmpty) defaultResolution = 'child'
    else if (!parentEmpty && !childEmpty && !equal) {
      defaultResolution = f.kind === 'array' ? 'union' : 'parent'
    }

    return {
      key: f.key,
      label: f.label,
      kind: f.kind,
      parent_value: f.kind === 'array' ? normArray(parentValue) : parentValue,
      child_value: f.kind === 'array' ? normArray(childValue) : childValue,
      parent_empty: parentEmpty,
      child_empty: childEmpty,
      equal,
      conflict: !equal && !parentEmpty && !childEmpty,
      // Array preview of the union for the UI to show inline.
      union_value:
        f.kind === 'array'
          ? Array.from(new Set([...normArray(parentValue), ...normArray(childValue)]))
          : null,
      default_resolution: defaultResolution,
    }
  })

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
  })
}
