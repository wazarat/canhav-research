import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../../lib/supabaseNew'
import {
  fetchSheetCsv,
  inferColumns,
  loadEntityLookup,
  matchRow,
  parseCsv,
  parseSheetUrl,
} from '../../../../lib/subsectorIngest'

interface PreviewBody {
  subsector_id: number
  sheet_url: string
  name_column?: string
}

/**
 * POST /api/admin/subsector-ingest/preview
 *
 * Given a Google Sheets tab URL and a target subsector, fetch the CSV, infer
 * columns, and attempt to match every row to an existing entity (using
 * normalised name, aliases from pre-merge history, website domain, and fuzzy
 * similarity). Returns a fully-decorated preview for the admin UI to render
 * before the user clicks commit.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await requireAdmin(req, res, { requireSuper: true })
  if (!session) return

  const { subsector_id, sheet_url, name_column = 'Entity' } = (req.body ?? {}) as PreviewBody
  if (!subsector_id || typeof subsector_id !== 'number') {
    return res.status(400).json({ error: 'subsector_id (number) is required' })
  }
  if (!sheet_url || typeof sheet_url !== 'string') {
    return res.status(400).json({ error: 'sheet_url (string) is required' })
  }

  try {
    const parsed = parseSheetUrl(sheet_url)
    const csv = await fetchSheetCsv(parsed.csvUrl)
    const rows = parseCsv(csv)
    if (rows.length < 2) {
      return res.status(400).json({ error: 'Sheet has no data rows.' })
    }
    const headers = rows[0].map((h) => h.trim())
    const body = rows.slice(1)

    if (!headers.some((h) => h.toLowerCase() === name_column.toLowerCase())) {
      return res.status(400).json({
        error: `Name column "${name_column}" not found in headers: ${headers.join(', ')}`,
      })
    }

    const columns = inferColumns(headers, body, name_column)
    const nameColIdx = columns.findIndex((c) => c.is_name)
    const websiteColIdx = columns.findIndex((c) => c.is_website)

    const admin = getSupabaseAdmin()
    const { data: subsector, error: subErr } = await admin
      .from('subsectors')
      .select('subsector_id, subsector_name, sector_id, sectors:sector_id (sector_name)')
      .eq('subsector_id', subsector_id)
      .maybeSingle()
    if (subErr || !subsector) {
      return res.status(404).json({ error: `Subsector ${subsector_id} not found` })
    }

    const lookup = await loadEntityLookup()
    const matches = body.map((row, idx) => {
      const rawName = row[nameColIdx] ?? ''
      const website = websiteColIdx >= 0 ? row[websiteColIdx] ?? '' : ''
      const matched = matchRow({ name: rawName, website }, lookup)
      return {
        row_index: idx,
        raw_name: rawName,
        website,
        matched,
        raw: Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])),
      }
    })

    const counts = {
      total: matches.length,
      auto: matches.filter((m) => (m.matched.best?.score ?? 0) >= 0.9).length,
      ambiguous: matches.filter(
        (m) =>
          (m.matched.best?.score ?? 0) >= 0.8 && (m.matched.best?.score ?? 0) < 0.9
      ).length,
      unmatched: matches.filter((m) => (m.matched.best?.score ?? 0) < 0.8).length,
    }

    return res.status(200).json({
      subsector: {
        subsector_id: subsector.subsector_id,
        subsector_name: subsector.subsector_name,
        sector_name:
          (subsector.sectors as unknown as { sector_name: string } | null)?.sector_name ??
          null,
      },
      sheet_url,
      csv_url: parsed.csvUrl,
      name_column,
      columns,
      counts,
      matches,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[subsector-ingest preview]', msg)
    return res.status(400).json({ error: msg })
  }
}
