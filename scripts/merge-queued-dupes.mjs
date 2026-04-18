#!/usr/bin/env node
/**
 * scripts/merge-queued-dupes.mjs
 *
 * Resolves every pending row in public.subsector_ingest_unmatched by
 * merging its raw sheet values into the existing subsector_data_* row for
 * the matched entity. Safe-merge semantics: only fills NULL columns (never
 * clobbers data the canonical row already has). Then marks the queued row
 * resolved so it disappears from /admin/subsector-review.
 *
 * Usage:  node scripts/merge-queued-dupes.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadDotEnv() {
  const p = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}
loadDotEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_ETHDATA_SUPABASE_URL
const SERVICE_KEY  = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY
const MGMT_PAT     = process.env.SUPABASE_MANAGEMENT_PAT
const PROJECT_REF  = process.env.SUPABASE_PROJECT_REF
if (!SUPABASE_URL || !SERVICE_KEY || !MGMT_PAT || !PROJECT_REF) {
  console.error('Missing env vars'); process.exit(1)
}

function coerce(raw, type) {
  const s = (raw ?? '').toString().trim()
  if (!s) return null
  if (type === 'integer') { const n = parseInt(s.replace(/,/g, ''), 10); return Number.isFinite(n) ? n : null }
  if (type === 'numeric') { const n = parseFloat(s.replace(/,/g, '')); return Number.isFinite(n) ? n : null }
  if (type === 'boolean') return /^(yes|true|y|1)$/i.test(s)
  if (type === 'date')    { const d = new Date(s); return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10) }
  return s
}

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MGMT_PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`SQL ${res.status}: ${await res.text()}`)
  return res.json()
}

async function pg(method, pth, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${pth}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`PostgREST ${method} ${pth}: ${res.status} ${await res.text()}`)
  if (res.status === 204) return null
  return res.json()
}

function esc(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number')  return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return `'${String(v).replace(/'/g, "''")}'`
}

async function main() {
  const queued = await pg(
    'GET',
    '/subsector_ingest_unmatched?resolution_status=eq.pending&select=id,subsector_id,raw,candidate_entity_ids,row_number',
  )
  if (!queued.length) { console.log('Nothing pending.'); return }

  const regs = await pg('GET', '/subsector_tables?select=subsector_id,table_name,display_schema')
  const bySub = new Map(regs.map((r) => [r.subsector_id, r]))

  let merged = 0, skipped = 0
  for (const q of queued) {
    const reg = bySub.get(q.subsector_id)
    const entityId = q.candidate_entity_ids?.[0]
    if (!reg || !entityId) {
      console.log(`• skip id=${q.id} — no registry or no candidate`)
      skipped++; continue
    }

    // Build {col => coerced value} for the duplicate sheet row.
    const raw = q.raw ?? {}
    const updates = {}
    for (const col of reg.display_schema) {
      const val = coerce(raw[col.label] ?? raw[col.key] ?? '', col.type)
      if (val !== null && val !== '') updates[col.key] = val
    }
    if (!Object.keys(updates).length) {
      console.log(`• skip id=${q.id} — duplicate row had no usable values`)
      skipped++; continue
    }

    // Safe-merge: only fill columns that are currently NULL on the existing row.
    const setClauses = Object.entries(updates)
      .map(([k, v]) => `${k} = COALESCE(${k}, ${esc(v)})`)
      .join(', ')
    const stmt = `UPDATE public.${reg.table_name} SET ${setClauses}, updated_at = now() WHERE entity_id = ${entityId};`
    await sql(stmt)

    await pg('PATCH', `/subsector_ingest_unmatched?id=eq.${q.id}`, {
      resolution_status: 'resolved',
      resolved_entity_id: entityId,
      resolved_at: new Date().toISOString(),
    })

    console.log(`• merged id=${q.id} into ${reg.table_name}.entity_id=${entityId}  (${Object.keys(updates).length} cols)`)
    merged++
  }

  console.log(`\nMerged ${merged}   Skipped ${skipped}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
