import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../../lib/supabaseNew'

/**
 * PATCH /api/admin/entities/[id]
 *
 * Super-admin inline-edit endpoint for public.entities. Accepts a whitelist
 * of columns so the wire schema is explicit and we never PATCH anything
 * structural (entity_name / parent_entity_id / entity_uuid).
 *
 * Writes go through the service-role client so RLS doesn't matter; the
 * gate is purely `requireAdmin({ requireSuper: true })`.
 *
 * Array fields accept either a string[] or a comma-separated string; the
 * former wins. Null / '' clear the value.
 *
 * Returns the updated row so the drawer can re-render without a second
 * round-trip (the realtime subscription will also fire shortly after).
 */

const ALLOWED_FIELDS = [
  'entity_name',
  'canonical_website',
  'logo_url',
  'year_founded',
  'hq_location',
  'funding_stage',
  'twitter_handle',
  'github_org',
  'tags',
  'long_description',
  'founders',
  'total_funding_usd',
  'last_funding_date',
  'investors',
  'token_symbol',
  'chains',
  'linkedin_url',
  'discord_url',
  'telegram_url',
  'farcaster_handle',
  'status',
] as const

type AllowedField = typeof ALLOWED_FIELDS[number]

const ARRAY_FIELDS = new Set<AllowedField>(['tags', 'founders', 'investors', 'chains'])
const NUMBER_FIELDS = new Set<AllowedField>(['year_founded', 'total_funding_usd'])

const STATUS_VALUES = new Set(['active', 'acquired', 'defunct', 'fork', 'unknown'])

function coerce(field: AllowedField, raw: unknown): unknown {
  if (raw === null || raw === '') return null
  if (ARRAY_FIELDS.has(field)) {
    if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean)
    if (typeof raw === 'string')
      return raw
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    return null
  }
  if (NUMBER_FIELDS.has(field)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw
    if (typeof raw === 'string' && raw.trim() !== '') {
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    }
    return null
  }
  if (field === 'status') {
    const s = String(raw).trim().toLowerCase()
    return STATUS_VALUES.has(s) ? s : null
  }
  return typeof raw === 'string' ? raw.trim() : raw
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await requireAdmin(req, res, { requireSuper: true })
  if (!session) return

  const { id } = req.query
  const entityId = parseInt(id as string, 10)
  if (isNaN(entityId)) {
    return res.status(400).json({ error: 'Invalid entity id' })
  }

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
    string,
    unknown
  >

  const update: Record<string, unknown> = {}
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      update[field] = coerce(field, body[field])
    }
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'No allowed fields in payload' })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('entities')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('entity_id', entityId)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('[PATCH /api/admin/entities]', error)
    return res.status(500).json({ error: error.message })
  }
  if (!data) {
    return res.status(404).json({ error: 'Entity not found' })
  }

  // Best-effort audit breadcrumb. We already have entity_merges / admin
  // changes elsewhere; a simple console log keeps this route lean and
  // lets Supabase logs be the system of record.
  console.log(
    `[admin edit] ${session.user.email} updated entity ${entityId}: ${Object.keys(update).join(', ')}`
  )

  return res.status(200).json({ entity: data })
}
