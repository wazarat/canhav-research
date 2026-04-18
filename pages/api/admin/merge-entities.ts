import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../lib/supabaseNew'

/**
 * POST /api/admin/merge-entities
 * Body: {
 *   parent_entity_id: number,
 *   child_entity_ids: number[],
 *   reason?: string,
 * }
 *
 * Flags each child as a product variant of `parent_entity_id` by setting
 * `child.parent_entity_id = parent`. Children keep their own entity_id and
 * classifications; the existing v_market_map_grid view filters
 * `parent_entity_id IS NULL`, so the children disappear from the grid
 * automatically and their sectors/subsectors aggregate onto the parent.
 *
 * Every merge writes an audit row in public.entity_merges with a JSONB
 * snapshot of the child's previous state so unmerge-entities can fully
 * restore it.
 *
 * Server-side safeguards (beyond cookie auth):
 *   * Parent cannot merge into itself.
 *   * Parent must exist and be a root (parent_entity_id IS NULL).
 *   * Each child must exist and not already be collapsed under a DIFFERENT
 *     parent (idempotent when already under the requested parent).
 *   * Refuse any merge that's flagged in public.entity_never_merge.
 */

type Body = {
  parent_entity_id?: number
  child_entity_ids?: number[]
  reason?: string
  /**
   * Optional per-child field reconciliation. Keyed by `child_entity_id`.
   * For each field the admin has picked how to resolve the conflict:
   *   - 'parent' → keep the parent's current value (no-op)
   *   - 'child'  → overwrite the parent with the child's value
   *   - 'union'  → (array fields only) merge parent ∪ child, de-duplicated
   *
   * When absent, we default to 'parent' (= no writes), which matches the
   * pre-resolution behaviour where merges never touched the parent row.
   * The parent's pre-merge values are captured in the merge snapshot so
   * unmerge can restore the exact previous state.
   */
  field_resolutions?: Record<string, Record<string, 'parent' | 'child' | 'union'>>
}

const RECONCILABLE_FIELDS = [
  'entity_name',
  'canonical_website',
  'logo_url',
  'long_description',
  'year_founded',
  'hq_location',
  'funding_stage',
  'total_funding_usd',
  'last_funding_date',
  'token_symbol',
  'status',
  'twitter_handle',
  'github_org',
  'linkedin_url',
  'discord_url',
  'telegram_url',
  'farcaster_handle',
  'tags',
  'founders',
  'investors',
  'chains',
] as const

type ReconcilableField = (typeof RECONCILABLE_FIELDS)[number]
const ARRAY_FIELDS = new Set<ReconcilableField>(['tags', 'founders', 'investors', 'chains'])
const RECONCILABLE_SET = new Set<string>(RECONCILABLE_FIELDS)

function normArr(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return Array.from(new Set(v.map((x) => String(x).trim()).filter(Boolean)))
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
  const childIds = Array.isArray(body.child_entity_ids)
    ? Array.from(new Set(body.child_entity_ids.map((n) => Number(n)))).filter(
        (n) => Number.isInteger(n) && n > 0
      )
    : []
  const reason = (body.reason ?? '').toString().slice(0, 500) || null
  const mergedBy = session.user.email

  if (!Number.isInteger(parentId) || parentId <= 0) {
    return res.status(400).json({ error: 'parent_entity_id must be a positive integer' })
  }
  if (childIds.length === 0) {
    return res.status(400).json({ error: 'child_entity_ids must be a non-empty array' })
  }
  if (childIds.includes(parentId)) {
    return res.status(400).json({ error: 'parent cannot be merged into itself' })
  }

  const supabase = getSupabaseAdmin()

  try {
    // Pull every reconcilable column so we can diff / apply resolutions and
    // capture an accurate pre-merge snapshot of the parent.
    const fullSelect = [
      'entity_id',
      'entity_name',
      'parent_entity_id',
      ...RECONCILABLE_FIELDS,
    ].join(',')

    const { data: parentData, error: parentErr } = await supabase
      .from('entities')
      .select(fullSelect)
      .eq('entity_id', parentId)
      .maybeSingle()
    if (parentErr) throw parentErr
    const parentRow = parentData as Record<string, any> | null
    if (!parentRow) return res.status(404).json({ error: 'parent entity not found' })
    if (parentRow.parent_entity_id !== null) {
      return res.status(400).json({
        error: `parent entity ${parentId} is itself a child of ${parentRow.parent_entity_id}; pick its root instead`,
      })
    }

    const { data: childData, error: childErr } = await supabase
      .from('entities')
      .select(fullSelect)
      .in('entity_id', childIds)
    if (childErr) throw childErr
    // The dynamic select string prevents Supabase from inferring row shape,
    // so we cast once up front and treat rows as loose records below.
    const childRows = (childData ?? []) as unknown as Array<Record<string, any>>
    if (childRows.length !== childIds.length) {
      const found = new Set(childRows.map((r) => r.entity_id))
      const missing = childIds.filter((id) => !found.has(id))
      return res.status(404).json({ error: 'child entities not found', missing })
    }

    const blocked = childRows.filter(
      (c) => c.parent_entity_id !== null && c.parent_entity_id !== parentId
    )
    if (blocked.length > 0) {
      return res.status(409).json({
        error: 'one or more children are already merged under a different parent',
        blocked: blocked.map((c) => ({
          child_entity_id: c.entity_id,
          current_parent_id: c.parent_entity_id,
        })),
      })
    }

    // Server-side never-merge check. Normalised pair is (least, greatest).
    const pairs = childIds.map((cid) => [
      Math.min(parentId, cid),
      Math.max(parentId, cid),
    ])
    const { data: nevers, error: neverErr } = await supabase
      .from('entity_never_merge')
      .select('entity_a, entity_b, reason')
      .in('entity_a', pairs.map((p) => p[0]))
      .in('entity_b', pairs.map((p) => p[1]))
    if (neverErr) throw neverErr
    const neverSet = new Set(
      (nevers ?? []).map((n: any) => `${n.entity_a}:${n.entity_b}`)
    )
    const blockedByNever = pairs.filter(([a, b]) => neverSet.has(`${a}:${b}`))
    if (blockedByNever.length > 0) {
      return res.status(409).json({
        error: 'one or more pairs are in entity_never_merge',
        blocked_pairs: blockedByNever,
      })
    }

    // Mutable view of the parent we keep up-to-date in-memory as each child
    // contributes its resolved values. This way a multi-child batch still
    // sees each previous winner when computing its own conflicts.
    const parentState: Record<string, unknown> = { ...parentRow }
    const fieldResolutions = (body.field_resolutions ?? {}) as Record<
      string,
      Record<string, 'parent' | 'child' | 'union'>
    >

    // Perform the merges one child at a time so each gets its own audit row
    // with an accurate snapshot. Still cheap: typical batch is 2-5.
    const applied: Array<{
      merge_id: number
      child_entity_id: number
      applied_fields: string[]
    }> = []

    for (const child of childRows) {
      if (child.parent_entity_id === parentId) continue // idempotent skip

      const childResolutions = fieldResolutions[String(child.entity_id)] ?? {}
      const parentBefore: Record<string, unknown> = {}
      const parentUpdate: Record<string, unknown> = {}

      for (const field of RECONCILABLE_FIELDS) {
        const choice = childResolutions[field]
        if (!choice || !RECONCILABLE_SET.has(field)) continue

        const isArray = ARRAY_FIELDS.has(field)
        let nextValue: unknown
        if (choice === 'parent') {
          continue // no-op
        } else if (choice === 'child') {
          nextValue = isArray ? normArr(child[field]) : child[field] ?? null
        } else if (choice === 'union') {
          if (!isArray) continue // ignore 'union' on scalar fields
          nextValue = Array.from(
            new Set([...normArr(parentState[field]), ...normArr(child[field])])
          )
        } else {
          continue
        }

        // Skip no-op writes (value already matches).
        const current = parentState[field]
        const same = isArray
          ? JSON.stringify(normArr(current)) ===
            JSON.stringify(nextValue as string[])
          : (current ?? null) === (nextValue ?? null)
        if (same) continue

        parentBefore[field] = current ?? null
        parentUpdate[field] = nextValue
        parentState[field] = nextValue
      }

      const snapshot: Record<string, unknown> = {
        child_entity_id: child.entity_id,
        child_entity_name: child.entity_name,
        prev_parent_entity_id: child.parent_entity_id,
        child_canonical_website: child.canonical_website,
        child_logo_url: child.logo_url,
        applied_at: new Date().toISOString(),
      }
      if (Object.keys(parentUpdate).length > 0) {
        snapshot.parent_before = parentBefore
        snapshot.parent_after = Object.fromEntries(
          Object.keys(parentUpdate).map((k) => [k, parentState[k]])
        )
        snapshot.field_resolutions = Object.fromEntries(
          Object.keys(parentUpdate).map((k) => [k, childResolutions[k] ?? 'parent'])
        )
      }

      // Apply any resolved-to-parent field writes first. If this fails, we
      // bail before flipping parent_entity_id so the child stays a root and
      // the admin can retry.
      if (Object.keys(parentUpdate).length > 0) {
        const { error: reconcileErr } = await supabase
          .from('entities')
          .update({ ...parentUpdate, updated_at: new Date().toISOString() })
          .eq('entity_id', parentId)
        if (reconcileErr) throw reconcileErr
      }

      const { error: updErr } = await supabase
        .from('entities')
        .update({ parent_entity_id: parentId })
        .eq('entity_id', child.entity_id)
      if (updErr) throw updErr

      const { data: auditRow, error: audErr } = await supabase
        .from('entity_merges')
        .insert({
          parent_entity_id: parentId,
          child_entity_id: child.entity_id,
          merged_by: mergedBy,
          reason,
          snapshot,
        })
        .select('merge_id')
        .single()
      if (audErr) throw audErr

      applied.push({
        merge_id: auditRow.merge_id,
        child_entity_id: child.entity_id,
        applied_fields: Object.keys(parentUpdate),
      })
    }

    return res.status(200).json({
      ok: true,
      parent_entity_id: parentId,
      applied,
      skipped: childRows
        .filter((c) => c.parent_entity_id === parentId)
        .map((c) => c.entity_id),
    })
  } catch (err: any) {
    console.error('[merge-entities] error:', err)
    return res.status(500).json({ error: err?.message ?? 'Internal server error' })
  }
}
