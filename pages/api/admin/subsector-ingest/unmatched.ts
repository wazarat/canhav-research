import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../../lib/supabaseNew'

/**
 * GET  /api/admin/subsector-ingest/unmatched  →  list pending rows
 * POST /api/admin/subsector-ingest/unmatched  →  { id, action: 'resolve'|'skip', entity_id? }
 *
 * Super-admin only. 'resolve' re-runs the row into the target table; 'skip'
 * marks it as reviewed with no data write.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res, { requireSuper: true })
  if (!session) return

  const admin = getSupabaseAdmin()

  if (req.method === 'GET') {
    const { data, error } = await admin
      .from('subsector_ingest_unmatched')
      .select(
        'id, ingest_id, subsector_id, row_number, raw, candidate_entity_ids, candidate_scores, resolution_status, created_at, subsectors:subsector_id (subsector_name)'
      )
      .eq('resolution_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(200)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ rows: data ?? [] })
  }

  if (req.method === 'POST') {
    const { id, action, entity_id } = (req.body ?? {}) as {
      id: number
      action: 'resolve' | 'skip'
      entity_id?: number
    }
    if (!id) return res.status(400).json({ error: 'id required' })

    if (action === 'skip') {
      const { error } = await admin
        .from('subsector_ingest_unmatched')
        .update({
          resolution_status: 'skipped',
          resolved_by: session.user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    if (action === 'resolve') {
      if (!entity_id) return res.status(400).json({ error: 'entity_id required for resolve' })
      const { data: row, error: rErr } = await admin
        .from('subsector_ingest_unmatched')
        .select('raw, subsector_id')
        .eq('id', id)
        .maybeSingle()
      if (rErr || !row) return res.status(404).json({ error: 'queue row not found' })

      const { data: reg, error: regErr } = await admin
        .from('subsector_tables')
        .select('table_name, display_schema')
        .eq('subsector_id', row.subsector_id)
        .maybeSingle()
      if (regErr || !reg) return res.status(400).json({ error: 'subsector has no table yet' })

      const raw = (row.raw ?? {}) as Record<string, string>
      const schema = (reg.display_schema as Array<{ key: string; label: string; type: string }>)
      const record: Record<string, unknown> = {
        entity_id,
        subsector_id: row.subsector_id,
        updated_at: new Date().toISOString(),
      }
      for (const col of schema) {
        record[col.key] = coerce(raw[col.label] ?? '', col.type)
      }
      const { error: upErr } = await admin.from(reg.table_name).upsert(record, {
        onConflict: 'entity_id',
      })
      if (upErr) return res.status(500).json({ error: upErr.message })

      const { error: markErr } = await admin
        .from('subsector_ingest_unmatched')
        .update({
          resolution_status: 'resolved',
          resolved_entity_id: entity_id,
          resolved_by: session.user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (markErr) return res.status(500).json({ error: markErr.message })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}

function coerce(raw: string, type: string): unknown {
  const s = (raw ?? '').trim()
  if (!s) return null
  switch (type) {
    case 'integer': {
      const n = parseInt(s.replace(/,/g, ''), 10)
      return Number.isFinite(n) ? n : null
    }
    case 'numeric': {
      const n = parseFloat(s.replace(/,/g, ''))
      return Number.isFinite(n) ? n : null
    }
    case 'boolean':
      return /^(yes|true|y|1)$/i.test(s)
    case 'date': {
      const d = new Date(s)
      return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
    }
    default:
      return s
  }
}
