import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../../../lib/supabaseNew'
import { logAdminEdit } from '../../../../../lib/adminAudit'

/**
 * PATCH /api/admin/subsector-data/[subsectorId]/[entityId]
 *
 * Admin inline-edit for a single row of public.subsector_data_<slug>.
 * We look up the backing table + schema via public.subsector_tables, then
 * allow-list keys against display_schema so a typo in the body can't sneak
 * an arbitrary column update through.
 *
 * Upsert semantics: if the entity already has a row we UPDATE; otherwise
 * we INSERT with the payload + entity_id. Empty strings → NULL.
 *
 * Body shape: { [key]: string | number | boolean | null }
 *   Keys must appear in the subsector's display_schema.
 */

interface SchemaCol {
  key: string
  label?: string
  type?: string
  is_url?: boolean
  is_long?: boolean
}

function coerce(col: SchemaCol, raw: unknown): unknown {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'string' && raw.trim() === '') return null

  const t = (col.type ?? 'text').toLowerCase()
  if (t === 'number' || t === 'int' || t === 'integer' || t === 'bigint' || t === 'float' || t === 'numeric') {
    const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, '').trim())
    return Number.isFinite(n) ? n : null
  }
  if (t === 'bool' || t === 'boolean') {
    if (typeof raw === 'boolean') return raw
    const s = String(raw).trim().toLowerCase()
    if (['true', 'yes', 'y', '1'].includes(s)) return true
    if (['false', 'no', 'n', '0'].includes(s)) return false
    return null
  }
  if (t === 'date' || t === 'timestamp' || t === 'timestamptz') {
    const s = String(raw).trim()
    return s === '' ? null : s
  }
  // Default: trimmed string
  return typeof raw === 'string' ? raw.trim() : String(raw)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await requireAdmin(req, res)
  if (!session) return

  const sRaw = req.query.subsectorId
  const eRaw = req.query.entityId
  const subsectorId = parseInt(Array.isArray(sRaw) ? sRaw[0] : sRaw ?? '', 10)
  const entityId = parseInt(Array.isArray(eRaw) ? eRaw[0] : eRaw ?? '', 10)
  if (!Number.isFinite(subsectorId) || !Number.isFinite(entityId)) {
    return res.status(400).json({ error: 'Invalid subsector or entity id' })
  }

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
    string,
    unknown
  >

  const supabase = getSupabaseAdmin()

  // 1) Resolve the backing table + schema for this subsector.
  const { data: reg, error: regErr } = await supabase
    .from('subsector_tables')
    .select('table_name, display_schema')
    .eq('subsector_id', subsectorId)
    .maybeSingle()

  if (regErr) {
    console.error('[subsector-data PATCH] registry lookup failed:', regErr)
    return res.status(500).json({ error: regErr.message })
  }
  if (!reg) {
    return res.status(404).json({ error: 'No subsector table registered for this subsector' })
  }

  const schema = Array.isArray(reg.display_schema) ? (reg.display_schema as SchemaCol[]) : []
  if (schema.length === 0) {
    return res.status(400).json({ error: 'Subsector has no editable columns' })
  }

  const colByKey = new Map<string, SchemaCol>()
  for (const c of schema) if (c?.key) colByKey.set(c.key, c)

  // 2) Validate & coerce payload against the schema whitelist.
  const update: Record<string, unknown> = {}
  const skipped: string[] = []
  for (const [rawKey, rawVal] of Object.entries(body)) {
    if (rawKey === 'entity_id' || rawKey === 'created_at' || rawKey === 'updated_at') continue
    const col = colByKey.get(rawKey)
    if (!col) {
      skipped.push(rawKey)
      continue
    }
    update[rawKey] = coerce(col, rawVal)
  }
  if (Object.keys(update).length === 0) {
    return res.status(400).json({
      error: 'No valid fields in payload',
      allowed_keys: schema.map((c) => c.key),
      ignored: skipped,
    })
  }

  // 3) Upsert by entity_id. We check for existence first so we can choose
  //    UPDATE vs INSERT without relying on a unique constraint naming
  //    convention in the dynamically-generated tables.
  const tableName = reg.table_name as string
  const allowedKeys = Array.from(colByKey.keys())
  const selectCols = ['entity_id', ...allowedKeys].join(',')

  const { data: existing, error: existErr } = await supabase
    .from(tableName)
    .select(selectCols)
    .eq('entity_id', entityId)
    .maybeSingle()
  if (existErr) {
    console.error(`[subsector-data PATCH] existence check on ${tableName} failed:`, existErr)
    return res.status(500).json({ error: existErr.message })
  }
  // Dynamic .select() string prevents Supabase from inferring row shape
  // (GenericStringError fallback), so cast through unknown first.
  const existingRow = existing as unknown as Record<string, unknown> | null

  let row: Record<string, unknown> | null = null
  if (existingRow) {
    const { data, error } = await supabase
      .from(tableName)
      .update(update)
      .eq('entity_id', entityId)
      .select('*')
      .maybeSingle()
    if (error) {
      console.error(`[subsector-data PATCH] update on ${tableName} failed:`, error)
      return res.status(500).json({ error: error.message })
    }
    row = (data ?? null) as Record<string, unknown> | null
  } else {
    const insertPayload = { ...update, entity_id: entityId }
    const { data, error } = await supabase
      .from(tableName)
      .insert(insertPayload)
      .select('*')
      .maybeSingle()
    if (error) {
      console.error(`[subsector-data PATCH] insert on ${tableName} failed:`, error)
      return res.status(500).json({ error: error.message })
    }
    row = (data ?? null) as Record<string, unknown> | null
  }

  const note = typeof body['_note'] === 'string' ? (body['_note'] as string) : null
  const source = typeof body['_source'] === 'string' ? (body['_source'] as string) : null

  const beforeSnapshot: Record<string, unknown> = existingRow
    ? Object.fromEntries(allowedKeys.map((k) => [k, existingRow[k] ?? null]))
    : Object.fromEntries(allowedKeys.map((k) => [k, null]))

  await logAdminEdit({
    session,
    targetType: 'subsector_data',
    targetId: entityId, // row primary key == entity_id for these dynamic tables
    entityId,
    before: beforeSnapshot,
    after: update,
    note: note ?? `table=${tableName} subsector=${subsectorId}`,
    source,
    req,
  })

  return res.status(200).json({ table_name: tableName, data: row })
}
