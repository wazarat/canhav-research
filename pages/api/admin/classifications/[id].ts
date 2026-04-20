import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../../lib/supabaseNew'
import { logAdminEdit } from '../../../../lib/adminAudit'

/**
 * PATCH /api/admin/classifications/[id]
 *
 * Admin inline-edit endpoint for public.entity_classifications. These are
 * the per-subsector descriptive fields (description, reason for inclusion,
 * practitioner's note, validation check, maintaining org, website) that
 * show on /company/[id] broken out per subsector.
 *
 * Both admin and super_admin can edit. Every mutation is recorded in
 * public.admin_edits so super-admins can audit the changes.
 *
 * Structural columns (entity_id, subsector_id, is_primary) are not touched
 * here — is_primary has its own flipping route and entity/subsector
 * identity is fixed for the lifetime of a classification row.
 */

const ALLOWED_FIELDS = [
  'description',
  'reason_for_inclusion',
  'practitioners_note',
  'practitioner_validation_check',
  'website',
  'maintaining_organization',
] as const

type AllowedField = typeof ALLOWED_FIELDS[number]

function coerce(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  const s = typeof raw === 'string' ? raw : String(raw)
  const trimmed = s.trim()
  return trimmed === '' ? null : trimmed
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await requireAdmin(req, res)
  if (!session) return

  const { id } = req.query
  const classificationId = parseInt(Array.isArray(id) ? id[0] : id ?? '', 10)
  if (!Number.isFinite(classificationId)) {
    return res.status(400).json({ error: 'Invalid classification id' })
  }

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
    string,
    unknown
  >

  const update: Record<string, unknown> = {}
  for (const field of ALLOWED_FIELDS as readonly AllowedField[]) {
    if (field in body) update[field] = coerce(body[field])
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'No allowed fields in payload' })
  }

  const supabase = getSupabaseAdmin()

  const { data: before, error: beforeErr } = await supabase
    .from('entity_classifications')
    .select([...ALLOWED_FIELDS, 'entity_id'].join(','))
    .eq('entity_classification_id', classificationId)
    .maybeSingle()
  if (beforeErr) {
    console.error('[PATCH /api/admin/classifications] pre-read:', beforeErr)
    return res.status(500).json({ error: beforeErr.message })
  }
  if (!before) {
    return res.status(404).json({ error: 'Classification not found' })
  }
  // Dynamic .select() string prevents Supabase from inferring row shape
  // (it falls back to GenericStringError), so cast through unknown.
  const beforeRow = before as unknown as Record<string, unknown>

  const { data, error } = await supabase
    .from('entity_classifications')
    .update(update)
    .eq('entity_classification_id', classificationId)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('[PATCH /api/admin/classifications]', error)
    return res.status(500).json({ error: error.message })
  }
  if (!data) {
    return res.status(404).json({ error: 'Classification not found' })
  }

  const note = typeof body['_note'] === 'string' ? (body['_note'] as string) : null
  const source = typeof body['_source'] === 'string' ? (body['_source'] as string) : null

  await logAdminEdit({
    session,
    targetType: 'classification',
    targetId: classificationId,
    entityId: (beforeRow['entity_id'] as number | null) ?? null,
    before: Object.fromEntries(
      (ALLOWED_FIELDS as readonly string[]).map((f) => [f, beforeRow[f] ?? null])
    ),
    after: update,
    note,
    source,
    req,
  })

  return res.status(200).json({ classification: data })
}
