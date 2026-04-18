import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../../lib/supabaseNew'
import {
  buildAlterAddMissingColsSql,
  buildCreateTableSql,
  executeSql,
  fetchSheetCsv,
  inferColumns,
  loadEntityLookup,
  matchRow,
  parseCsv,
  parseSheetUrl,
  safeIdent,
  type InferredColumn,
} from '../../../../lib/subsectorIngest'

interface CommitBody {
  subsector_id: number
  sheet_url: string
  name_column?: string
  /**
   * Optional manual resolutions keyed by row_index, each mapping to the
   * entity_id the admin picked. Overrides automatic matching.
   */
  overrides?: Record<number, number | null>
  /** Minimum auto-match confidence (0..1). Default 0.9. */
  auto_threshold?: number
}

/**
 * POST /api/admin/subsector-ingest/commit
 *
 * - Creates (or extends) a per-subsector table `public.subsector_data_<slug>`.
 * - Upserts matched rows into it, one row per entity_id.
 * - Queues unmatched / below-threshold rows to subsector_ingest_unmatched.
 * - Records an audit row in subsector_ingest_runs.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const session = await requireAdmin(req, res, { requireSuper: true })
  if (!session) return

  const {
    subsector_id,
    sheet_url,
    name_column = 'Entity',
    overrides = {},
    auto_threshold = 0.9,
  } = (req.body ?? {}) as CommitBody
  if (!subsector_id) return res.status(400).json({ error: 'subsector_id required' })
  if (!sheet_url) return res.status(400).json({ error: 'sheet_url required' })

  const admin = getSupabaseAdmin()

  try {
    // 1) Fetch + parse the sheet.
    const parsed = parseSheetUrl(sheet_url)
    const csv = await fetchSheetCsv(parsed.csvUrl)
    const rows = parseCsv(csv)
    if (rows.length < 2) return res.status(400).json({ error: 'No data rows in sheet' })
    const headers = rows[0].map((h) => h.trim())
    const body = rows.slice(1)

    // 2) Look up target subsector + derive a stable table slug.
    const { data: subsector, error: subErr } = await admin
      .from('subsectors')
      .select('subsector_id, subsector_name')
      .eq('subsector_id', subsector_id)
      .maybeSingle()
    if (subErr || !subsector) {
      return res.status(404).json({ error: `Subsector ${subsector_id} not found` })
    }
    const tableName = `subsector_data_${safeSlug(subsector.subsector_name)}`
    safeIdent(tableName) // throws if weird

    // 3) Column inference + target-table DDL.
    const columns: InferredColumn[] = inferColumns(headers, body, name_column)
    const nameColIdx = columns.findIndex((c) => c.is_name)
    const websiteColIdx = columns.findIndex((c) => c.is_website)
    if (nameColIdx < 0) {
      return res.status(400).json({ error: `Name column "${name_column}" not in sheet` })
    }

    // If the table already exists, just ALTER-ADD missing columns. Otherwise
    // CREATE it fresh.
    const { data: existingCols } = await admin
      .from('subsector_tables')
      .select('table_name, display_schema')
      .eq('subsector_id', subsector_id)
      .maybeSingle()

    if (existingCols?.table_name) {
      // Pull actual current columns to decide what to add
      const colListSql = `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='${tableName}'`
      const current = (await executeSql(colListSql)) as Array<{ column_name: string }>
      const known = new Set(current.map((c) => c.column_name))
      const alter = buildAlterAddMissingColsSql(tableName, known, columns)
      if (alter) await executeSql(alter)
    } else {
      const createSql = buildCreateTableSql(tableName, columns)
      await executeSql(createSql)
    }

    // 4) Match rows + split into write / queue.
    const lookup = await loadEntityLookup()
    const resolved: Array<{ rowIdx: number; entity_id: number; row: string[] }> = []
    const queued: Array<{
      row_index: number
      raw: Record<string, string>
      candidates: Array<{ entity_id: number; entity_name: string; score: number; via: string }>
    }> = []

    for (let idx = 0; idx < body.length; idx++) {
      const row = body[idx]
      const name = row[nameColIdx] ?? ''
      if (!name.trim()) continue // skip empty name rows silently

      // Manual override wins over automatic matching.
      const overrideVal = overrides[idx]
      if (overrideVal) {
        resolved.push({ rowIdx: idx, entity_id: overrideVal, row })
        continue
      }

      const { best, candidates } = matchRow(
        { name, website: websiteColIdx >= 0 ? row[websiteColIdx] : '' },
        lookup
      )
      if (best && best.score >= auto_threshold) {
        resolved.push({ rowIdx: idx, entity_id: best.entity_id, row })
      } else {
        queued.push({
          row_index: idx,
          raw: Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])),
          candidates,
        })
      }
    }

    // 5) Record an audit run first so we have an ingest_id for the rows.
    const { data: runRow, error: runErr } = await admin
      .from('subsector_ingest_runs')
      .insert({
        subsector_id,
        source_url: sheet_url,
        sheet_tab: parsed.gid,
        name_column,
        columns,
        row_count_total: body.length,
        row_count_matched: resolved.length,
        row_count_ambiguous: 0,
        row_count_unmatched: queued.length,
        status: 'committed',
        actor_user_id: session.user.id,
        finished_at: new Date().toISOString(),
      })
      .select('ingest_id')
      .single()
    if (runErr || !runRow) throw new Error(`ingest_runs insert: ${runErr?.message}`)
    const ingestId = runRow.ingest_id as string

    // 6) Upsert matched rows into the per-subsector table. We use the REST
    //    client + the service-role key; RLS is fine because service-role
    //    bypasses it.
    if (resolved.length) {
      const writableCols = columns.filter((c) => !c.is_name && !c.is_website)
      const payload = resolved.map(({ entity_id, row }) => {
        const record: Record<string, unknown> = {
          entity_id,
          subsector_id,
          ingest_id: ingestId,
          updated_at: new Date().toISOString(),
        }
        for (const c of writableCols) {
          const colIdx = columns.findIndex((x) => x.key === c.key)
          const raw = row[colIdx] ?? ''
          record[c.key] = coerce(raw, c.type)
        }
        return record
      })
      // Upsert in chunks of 100 to stay well under payload limits.
      for (let i = 0; i < payload.length; i += 100) {
        const chunk = payload.slice(i, i + 100)
        const { error: upErr } = await admin.from(tableName).upsert(chunk, {
          onConflict: 'entity_id',
        })
        if (upErr) throw new Error(`upsert ${tableName}: ${upErr.message}`)
      }
    }

    // 7) Queue unmatched / low-confidence rows for review.
    if (queued.length) {
      const unmatchedRows = queued.map((q) => ({
        ingest_id: ingestId,
        subsector_id,
        row_number: q.row_index,
        raw: q.raw,
        candidate_entity_ids: q.candidates.map((c) => c.entity_id),
        candidate_scores: q.candidates,
      }))
      const { error: uErr } = await admin
        .from('subsector_ingest_unmatched')
        .insert(unmatchedRows)
      if (uErr) throw new Error(`unmatched insert: ${uErr.message}`)
    }

    // 8) Register / update the subsector_tables mapping.
    const displaySchema = columns
      .filter((c) => !c.is_name && !c.is_website)
      .map((c) => ({ key: c.key, label: c.header, type: c.type }))
    const { error: regErr } = await admin.from('subsector_tables').upsert(
      {
        subsector_id,
        table_name: tableName,
        display_schema: displaySchema,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'subsector_id' }
    )
    if (regErr) throw new Error(`subsector_tables upsert: ${regErr.message}`)

    return res.status(200).json({
      ingest_id: ingestId,
      table_name: tableName,
      row_count_total: body.length,
      row_count_matched: resolved.length,
      row_count_unmatched: queued.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[subsector-ingest commit]', msg)
    return res.status(400).json({ error: msg })
  }
}

function safeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
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
