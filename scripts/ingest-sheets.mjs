#!/usr/bin/env node
/**
 * scripts/ingest-sheets.mjs
 *
 * One-shot ingest: fetches every Google Sheets tab mapped in SHEETS[], runs
 * the same matching + table-creation + upsert pipeline that the
 * /admin/subsector-ingest UI does, and prints a summary.
 *
 * Requires env:
 *   NEW_SUPABASE_SERVICE_ROLE_KEY   — service-role key
 *   NEXT_PUBLIC_ETHDATA_SUPABASE_URL — project URL
 *   SUPABASE_MANAGEMENT_PAT         — Supabase PAT (for DDL)
 *   SUPABASE_PROJECT_REF            — project ref slug
 *
 * Usage:
 *   node scripts/ingest-sheets.mjs              # run all
 *   node scripts/ingest-sheets.mjs <subsectorId> # run one
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- env ---------------------------------------------------------------
function loadDotEnv() {
  const p = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(p)) return
  const lines = fs.readFileSync(p, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    const [, k, v] = m
    if (!process.env[k]) process.env[k] = v.trim()
  }
}
loadDotEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_ETHDATA_SUPABASE_URL
const SERVICE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY
const MGMT_PAT = process.env.SUPABASE_MANAGEMENT_PAT
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF
if (!SUPABASE_URL || !SERVICE_KEY || !MGMT_PAT || !PROJECT_REF) {
  console.error('Missing required env vars.')
  process.exit(1)
}

// --- sheet catalogue ---------------------------------------------------
// Indexed by the DB subsector_id (authoritative).
const SHEETS = [
  // Core Protocol Architecture
  { id: 23, sub: 'Consensus Layer',                   url: 'https://docs.google.com/spreadsheets/d/1eSqVRbzdd53dbVNJEM5-uH1NKBB8Cmyh4TWrXPCMEBU/edit?gid=0#gid=0' },
  { id: 11, sub: 'Execution Layer',                   url: 'https://docs.google.com/spreadsheets/d/1eSqVRbzdd53dbVNJEM5-uH1NKBB8Cmyh4TWrXPCMEBU/edit?gid=1973587895#gid=1973587895' },
  { id:  9, sub: 'Validators & Staking Providers',    url: 'https://docs.google.com/spreadsheets/d/1eSqVRbzdd53dbVNJEM5-uH1NKBB8Cmyh4TWrXPCMEBU/edit?gid=1461607073#gid=1461607073' },
  { id:  3, sub: 'MEV & Block Builders',              url: 'https://docs.google.com/spreadsheets/d/1eSqVRbzdd53dbVNJEM5-uH1NKBB8Cmyh4TWrXPCMEBU/edit?gid=1892242156#gid=1892242156' },
  { id:  1, sub: 'Network Upgrades',                  url: 'https://docs.google.com/spreadsheets/d/1eSqVRbzdd53dbVNJEM5-uH1NKBB8Cmyh4TWrXPCMEBU/edit?gid=853500365#gid=853500365' },

  // Rollup & Scaling Frameworks
  { id: 30, sub: 'Optimistic Rollups',                url: 'https://docs.google.com/spreadsheets/d/1J08OAuQ5UW4HQfoOrInTxYnoKXWqppOCRBr-1PxaKLk/edit?gid=1623116093#gid=1623116093' },
  { id: 29, sub: 'ZK Rollup',                         url: 'https://docs.google.com/spreadsheets/d/1J08OAuQ5UW4HQfoOrInTxYnoKXWqppOCRBr-1PxaKLk/edit?gid=841503241#gid=841503241' },
  { id:  8, sub: 'L3 & Appchain Frameworks',          url: 'https://docs.google.com/spreadsheets/d/1J08OAuQ5UW4HQfoOrInTxYnoKXWqppOCRBr-1PxaKLk/edit?gid=698572346#gid=698572346' },
  { id: 33, sub: 'Validiums, Volitions, and Hybrid Rollups', url: 'https://docs.google.com/spreadsheets/d/1J08OAuQ5UW4HQfoOrInTxYnoKXWqppOCRBr-1PxaKLk/edit?gid=2102310935#gid=2102310935' },

  // Monetary & Access Rails
  { id: 22, sub: 'Centralized Stablecoins',           url: 'https://docs.google.com/spreadsheets/d/1MyXItem529dr0NGkXmVQXS0zvzdwm-yNTQoh56LYEtI/edit?gid=740017838#gid=740017838' },
  { id: 35, sub: 'Decentralized Stablecoins',         url: 'https://docs.google.com/spreadsheets/d/1MyXItem529dr0NGkXmVQXS0zvzdwm-yNTQoh56LYEtI/edit?gid=793795651#gid=793795651' },
  { id:  5, sub: 'Synthetic & Yield-Bearing Dollars', url: 'https://docs.google.com/spreadsheets/d/1MyXItem529dr0NGkXmVQXS0zvzdwm-yNTQoh56LYEtI/edit?gid=2027955655#gid=2027955655' },
  { id: 13, sub: 'Global On-Ramps',                   url: 'https://docs.google.com/spreadsheets/d/1MyXItem529dr0NGkXmVQXS0zvzdwm-yNTQoh56LYEtI/edit?gid=536722612#gid=536722612' },
  { id: 15, sub: 'Institutional Payment Rails',       url: 'https://docs.google.com/spreadsheets/d/1MyXItem529dr0NGkXmVQXS0zvzdwm-yNTQoh56LYEtI/edit?gid=1092087303#gid=1092087303' },
  { id: 19, sub: 'Regional Payment Networks',         url: 'https://docs.google.com/spreadsheets/d/1MyXItem529dr0NGkXmVQXS0zvzdwm-yNTQoh56LYEtI/edit?gid=353346319#gid=353346319' },

  // DeFi Systems Architecture
  { id: 14, sub: 'Lending Markets',                   url: 'https://docs.google.com/spreadsheets/d/1bdcu0UIBvZ6ZLmuG9rTLvXrVEdTh3wg1W9yMZ90K6pU/edit?gid=1468161002#gid=1468161002' },
  { id: 34, sub: 'DEX & Liquidity Pools',             url: 'https://docs.google.com/spreadsheets/d/1bdcu0UIBvZ6ZLmuG9rTLvXrVEdTh3wg1W9yMZ90K6pU/edit?gid=1271133982#gid=1271133982' },
  { id: 12, sub: 'Yield & Structured Markets',        url: 'https://docs.google.com/spreadsheets/d/1bdcu0UIBvZ6ZLmuG9rTLvXrVEdTh3wg1W9yMZ90K6pU/edit?gid=472989866#gid=472989866' },
  { id: 25, sub: 'Liquid Staking Tokens',             url: 'https://docs.google.com/spreadsheets/d/1bdcu0UIBvZ6ZLmuG9rTLvXrVEdTh3wg1W9yMZ90K6pU/edit?gid=104070153#gid=104070153' },
  { id: 21, sub: 'Restaking Systems',                 url: 'https://docs.google.com/spreadsheets/d/1bdcu0UIBvZ6ZLmuG9rTLvXrVEdTh3wg1W9yMZ90K6pU/edit?gid=858691553#gid=858691553' },
  { id:  4, sub: 'Synthetic & Derivatives',           url: 'https://docs.google.com/spreadsheets/d/1bdcu0UIBvZ6ZLmuG9rTLvXrVEdTh3wg1W9yMZ90K6pU/edit?gid=970731173#gid=970731173' },

  // Data & Consensus Infrastructure
  { id: 16, sub: 'RPC & Node Providers',              url: 'https://docs.google.com/spreadsheets/d/1oxpdT9qsScSl8b3nL543bEO-q8GRTj2CtfACsfu1W8A/edit?gid=1270499317#gid=1270499317' },
  { id: 36, sub: 'Oracles & Data Networks',           url: 'https://docs.google.com/spreadsheets/d/1oxpdT9qsScSl8b3nL543bEO-q8GRTj2CtfACsfu1W8A/edit?gid=1127240504#gid=1127240504' },
  { id: 10, sub: 'Data Availability Systems',         url: 'https://docs.google.com/spreadsheets/d/1oxpdT9qsScSl8b3nL543bEO-q8GRTj2CtfACsfu1W8A/edit?gid=154577554#gid=154577554' },
  { id:  7, sub: 'Indexing & Query Engines',          url: 'https://docs.google.com/spreadsheets/d/1oxpdT9qsScSl8b3nL543bEO-q8GRTj2CtfACsfu1W8A/edit?gid=1023110846#gid=1023110846' },
  { id: 31, sub: 'Analytics & Intelligence',          url: 'https://docs.google.com/spreadsheets/d/1oxpdT9qsScSl8b3nL543bEO-q8GRTj2CtfACsfu1W8A/edit?gid=457625346#gid=457625346' },

  // Advanced Compute & Integration
  { id: 17, sub: 'AI Agents & Autonomous Systems',    url: 'https://docs.google.com/spreadsheets/d/1mpaWTCz9tTaKiJ1sBENEsetbRo85NX2NrCvOTbVtvZU/edit?gid=1608239665#gid=1608239665' },
  { id: 26, sub: 'Real World Assets (RWAs)',          url: 'https://docs.google.com/spreadsheets/d/1mpaWTCz9tTaKiJ1sBENEsetbRo85NX2NrCvOTbVtvZU/edit?gid=1894391559#gid=1894391559' },
  { id:  6, sub: 'Identity & Social Graphs',          url: 'https://docs.google.com/spreadsheets/d/1mpaWTCz9tTaKiJ1sBENEsetbRo85NX2NrCvOTbVtvZU/edit?gid=341534256#gid=341534256' },
  { id: 28, sub: 'DePIN (Physical Infrastruture)',    url: 'https://docs.google.com/spreadsheets/d/1mpaWTCz9tTaKiJ1sBENEsetbRo85NX2NrCvOTbVtvZU/edit?gid=1254628628#gid=1254628628' },
  { id: 32, sub: 'Cross-Chain Compute',               url: 'https://docs.google.com/spreadsheets/d/1mpaWTCz9tTaKiJ1sBENEsetbRo85NX2NrCvOTbVtvZU/edit?gid=403856203#gid=403856203' },

  // Governance & Enterprise Framework
  { id: 18, sub: 'DAO Governance Systems',            url: 'https://docs.google.com/spreadsheets/d/1dQr7W47rQ1L83lTIuNrTl324hH6fDB1Lek7kSqgxZec/edit?gid=1800934348#gid=1800934348' },
  { id:  2, sub: 'Enterprise Blockchain Adoption',    url: 'https://docs.google.com/spreadsheets/d/1dQr7W47rQ1L83lTIuNrTl324hH6fDB1Lek7kSqgxZec/edit?gid=2131719987#gid=2131719987' },
  { id: 27, sub: 'CBDCs & Public Sector Pilots',      url: 'https://docs.google.com/spreadsheets/d/1dQr7W47rQ1L83lTIuNrTl324hH6fDB1Lek7kSqgxZec/edit?gid=652382610#gid=652382610' },
  { id: 20, sub: 'Compliance & Regulatory Intelligence', url: 'https://docs.google.com/spreadsheets/d/1dQr7W47rQ1L83lTIuNrTl324hH6fDB1Lek7kSqgxZec/edit?gid=341111534#gid=341111534' },
  { id: 24, sub: 'Institutional Custody & Security',  url: 'https://docs.google.com/spreadsheets/d/1dQr7W47rQ1L83lTIuNrTl324hH6fDB1Lek7kSqgxZec/edit?gid=1845020211#gid=1845020211' },
]

// --- helpers -----------------------------------------------------------
function parseSheetUrl(input) {
  const idMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!idMatch) throw new Error('Not a Google Sheets URL')
  const id = idMatch[1]
  let gid = null
  const h = input.match(/#gid=(\d+)/)
  const q = input.match(/[?&]gid=(\d+)/)
  if (h) gid = h[1]
  else if (q) gid = q[1]
  return gid
    ? `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`
}

async function fetchCsv(url) {
  const res = await fetch(url, { redirect: 'follow', headers: { Accept: 'text/csv,*/*' } })
  if (!res.ok) throw new Error(`fetch ${res.status}`)
  const text = await res.text()
  if (text.startsWith('<!DOCTYPE') || text.includes('<title>Sign in')) {
    throw new Error('Sheet appears private')
  }
  return text
}

function parseCsv(text) {
  const rows = []
  let row = [], cell = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ }
        else inQuotes = false
      } else cell += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { row.push(cell); cell = '' }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
      else if (ch === '\r') { /* skip */ }
      else cell += ch
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row) }
  while (rows.length && rows[rows.length - 1].every((c) => c.trim() === '')) rows.pop()
  return rows
}

function slugifyHeader(h) {
  let base = h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  if (!base) base = 'col'
  const reserved = new Set(['entity_id','subsector_id','ingest_id','updated_at','created_at','user','order','select','from','where'])
  if (reserved.has(base)) base = `${base}_val`
  return base.slice(0, 56)
}

function dedupe(cols) {
  const seen = {}
  return cols.map((c) => {
    if (seen[c.key] === undefined) { seen[c.key] = 1; return c }
    const n = ++seen[c.key]
    return { ...c, key: `${c.key}_${n}` }
  })
}

const URL_RE = /^(https?:\/\/|www\.)/i
const INT_RE = /^-?\d+$/
const NUM_RE = /^-?\d+(\.\d+)?$/
const DATE_RE = /^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|[A-Z][a-z]{2,9} \d{1,2},? \d{4})$/
const BOOL_RE = /^(yes|no|true|false|y|n)$/i

function inferCell(v) {
  const s = (v ?? '').trim()
  if (!s) return null
  if (URL_RE.test(s)) return 'url'
  if (INT_RE.test(s)) return 'integer'
  if (NUM_RE.test(s)) return 'numeric'
  if (DATE_RE.test(s)) return 'date'
  if (BOOL_RE.test(s)) return 'boolean'
  if (s.length > 120) return 'long_text'
  return 'text'
}

function inferColumns(headers, body, nameCol) {
  const cols = headers.map((h) => ({
    header: h,
    key: slugifyHeader(h),
    type: 'text',
    is_name: h.trim().toLowerCase() === nameCol.trim().toLowerCase(),
    is_website: /^website$/i.test(h.trim()) || /url/i.test(h.trim()),
  }))
  const deduped = dedupe(cols)
  for (let c = 0; c < deduped.length; c++) {
    const seen = { text: 0, long_text: 0, integer: 0, numeric: 0, date: 0, url: 0, boolean: 0 }
    let nonEmpty = 0
    for (let r = 0; r < body.length; r++) {
      const t = inferCell(body[r][c] ?? '')
      if (t) { seen[t]++; nonEmpty++ }
    }
    if (nonEmpty === 0) { deduped[c].type = 'text'; continue }
    const score = (t) => seen[t] / nonEmpty
    if (score('url') >= 0.8) deduped[c].type = 'url'
    else if (score('date') >= 0.8) deduped[c].type = 'date'
    else if (seen.long_text / nonEmpty >= 0.3) deduped[c].type = 'long_text'
    else if (score('integer') >= 0.8) deduped[c].type = 'integer'
    else if ((seen.integer + seen.numeric) / nonEmpty >= 0.8) deduped[c].type = 'numeric'
    else if (score('boolean') >= 0.8) deduped[c].type = 'boolean'
    else deduped[c].type = 'text'
  }
  return deduped
}

function pgType(t) {
  if (t === 'integer') return 'integer'
  if (t === 'numeric') return 'numeric'
  if (t === 'date') return 'date'
  if (t === 'boolean') return 'boolean'
  return 'text'
}

function safeIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`unsafe identifier ${name}`)
  return name
}

function normaliseName(name) {
  return (name ?? '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, '')
}

function extractDomain(v) {
  if (!v) return null
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
    return u.hostname.replace(/^www\./i, '').toLowerCase()
  } catch { return null }
}

function similarity(a, b) {
  if (a === b) return 1
  if (!a || !b) return 0
  const la = a.length, lb = b.length
  const dp = new Array(lb + 1)
  for (let j = 0; j <= lb; j++) dp[j] = j
  for (let i = 1; i <= la; i++) {
    let prev = dp[0]; dp[0] = i
    for (let j = 1; j <= lb; j++) {
      const tmp = dp[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost)
      prev = tmp
    }
  }
  return 1 - dp[lb] / Math.max(la, lb)
}

// --- Supabase helpers --------------------------------------------------
async function execSql(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MGMT_PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) throw new Error(`SQL ${res.status}: ${await res.text()}`)
  return res.json()
}

async function upsertChunk(table, chunk, attempt = 0) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=entity_id`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(chunk),
  })
  if (res.ok) return
  const txt = await res.text()
  // PostgREST hasn't refreshed its cache yet — wait and retry up to 4x.
  if ((res.status === 404 || res.status === 400) && attempt < 4) {
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
    return upsertChunk(table, chunk, attempt + 1)
  }
  throw new Error(`upsert ${table}: ${res.status} ${txt}`)
}

async function pg(method, path, body) {
  const url = `${SUPABASE_URL}/rest/v1${path}`
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`PostgREST ${method} ${path}: ${res.status} ${txt}`)
  }
  if (res.status === 204) return null
  return res.json()
}

async function loadLookup() {
  const ents = await pg('GET', '/entities?select=entity_id,entity_name,canonical_website&limit=10000')
  const aliases = await pg('GET', '/entity_aliases?select=entity_id,alias_name&limit=10000')
  const entityById = new Map(ents.map((e) => [e.entity_id, e]))
  const rows = []
  for (const e of ents) {
    rows.push({
      entity_id: e.entity_id, entity_name: e.entity_name,
      entity_norm: normaliseName(e.entity_name ?? ''),
      domain: extractDomain(e.canonical_website), source: 'entity',
    })
  }
  for (const a of aliases) {
    const e = entityById.get(a.entity_id)
    rows.push({
      entity_id: a.entity_id, entity_name: a.alias_name,
      entity_norm: normaliseName(a.alias_name ?? ''),
      domain: extractDomain(e?.canonical_website), source: 'alias',
    })
  }
  return rows
}

function matchRow({ name, website }, lookup) {
  const n = normaliseName(name ?? '')
  const d = extractDomain(website)
  const scores = new Map()
  const bump = (c) => {
    const p = scores.get(c.entity_id)
    if (!p || p.score < c.score) scores.set(c.entity_id, c)
  }
  for (const row of lookup) {
    if (!row.entity_norm) continue
    if (row.source === 'entity' && n && row.entity_norm === n) {
      bump({ entity_id: row.entity_id, entity_name: row.entity_name, score: 1.0, via: 'exact_name' }); continue
    }
    if (row.source === 'alias' && n && row.entity_norm === n) {
      bump({ entity_id: row.entity_id, entity_name: row.entity_name, score: 0.98, via: 'alias' }); continue
    }
    if (d && row.domain && row.domain === d) {
      bump({ entity_id: row.entity_id, entity_name: row.entity_name, score: 0.96, via: 'domain' }); continue
    }
    if (n && row.entity_norm) {
      const s = similarity(n, row.entity_norm)
      if (s >= 0.85) bump({ entity_id: row.entity_id, entity_name: row.entity_name, score: s * (row.source === 'alias' ? 0.95 : 1), via: 'fuzzy' })
    }
  }
  const cands = Array.from(scores.values()).sort((a, b) => b.score - a.score)
  return { best: cands[0] ?? null, candidates: cands.slice(0, 5) }
}

function coerce(raw, type) {
  const s = (raw ?? '').trim()
  if (!s) return null
  if (type === 'integer') { const n = parseInt(s.replace(/,/g, ''), 10); return Number.isFinite(n) ? n : null }
  if (type === 'numeric') { const n = parseFloat(s.replace(/,/g, '')); return Number.isFinite(n) ? n : null }
  if (type === 'boolean') return /^(yes|true|y|1)$/i.test(s)
  if (type === 'date') { const d = new Date(s); return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10) }
  return s
}

function safeSlug(n) {
  return n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48)
}

function buildCreateSql(table, cols) {
  const c = cols.filter((x) => !x.is_name && !x.is_website)
    .map((x) => `  ${safeIdent(x.key)} ${pgType(x.type)}`).join(',\n')
  return `
CREATE TABLE IF NOT EXISTS public.${safeIdent(table)} (
  entity_id    bigint       PRIMARY KEY REFERENCES public.entities(entity_id) ON DELETE CASCADE,
  subsector_id bigint       NOT NULL REFERENCES public.subsectors(subsector_id) ON DELETE CASCADE,
  ingest_id    uuid,
  updated_at   timestamptz  NOT NULL DEFAULT now()${c ? ',\n' + c : ''}
);
ALTER TABLE public.${safeIdent(table)} ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ${safeIdent(table)}_read ON public.${safeIdent(table)};
CREATE POLICY ${safeIdent(table)}_read ON public.${safeIdent(table)}
  FOR SELECT TO authenticated USING (true);
NOTIFY pgrst, 'reload schema';
`
}

async function alterMissing(table, cols) {
  const rows = await execSql(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}'`)
  const known = new Set(rows.map((r) => r.column_name))
  const alters = []
  for (const c of cols) {
    if (c.is_name || c.is_website) continue
    if (!known.has(c.key)) alters.push(`ALTER TABLE public.${safeIdent(table)} ADD COLUMN IF NOT EXISTS ${safeIdent(c.key)} ${pgType(c.type)};`)
  }
  if (alters.length) {
    await execSql(alters.join('\n') + `\nNOTIFY pgrst, 'reload schema';`)
  }
  return alters.length
}

// --- main --------------------------------------------------------------
async function ingestOne(entry, lookup) {
  const csvUrl = parseSheetUrl(entry.url)
  const csv = await fetchCsv(csvUrl)
  const rows = parseCsv(csv)
  if (rows.length < 2) throw new Error('no data')
  const headers = rows[0].map((h) => h.trim())
  const body = rows.slice(1)

  // Detect the name column — 'Entity' preferred; else first column.
  const nameCol = headers.find((h) => h.toLowerCase() === 'entity') ?? headers[0]
  const cols = inferColumns(headers, body, nameCol)
  const nameIdx = cols.findIndex((c) => c.is_name)
  const siteIdx = cols.findIndex((c) => c.is_website)
  const table = `subsector_data_${safeSlug(entry.sub)}`
  safeIdent(table)

  // Check registry — if this subsector already has a table, just alter.
  const reg = await pg('GET', `/subsector_tables?subsector_id=eq.${entry.id}`)
  if (reg.length === 0) {
    await execSql(buildCreateSql(table, cols))
    // Wait for PostgREST schema-cache reload.
    await new Promise((r) => setTimeout(r, 2500))
  } else {
    const added = await alterMissing(table, cols)
    if (added) await new Promise((r) => setTimeout(r, 2500))
  }

  const resolved = []
  const queued = []
  for (let idx = 0; idx < body.length; idx++) {
    const row = body[idx]
    const name = row[nameIdx] ?? ''
    if (!name.trim()) continue
    const site = siteIdx >= 0 ? row[siteIdx] : ''
    const { best, candidates } = matchRow({ name, website: site }, lookup)
    if (best && best.score >= 0.9) resolved.push({ idx, entity_id: best.entity_id, row })
    else queued.push({ idx, raw: Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])), candidates })
  }

  // audit row first
  const [run] = await pg('POST', '/subsector_ingest_runs', {
    subsector_id: entry.id,
    source_url: entry.url,
    sheet_tab: null,
    name_column: nameCol,
    columns: cols,
    row_count_total: body.length,
    row_count_matched: resolved.length,
    row_count_ambiguous: 0,
    row_count_unmatched: queued.length,
    status: 'committed',
    finished_at: new Date().toISOString(),
  })
  const ingestId = run.ingest_id

  const writable = cols.filter((x) => !x.is_name && !x.is_website)

  // Dedupe: if multiple sheet rows resolved to the same entity_id (fuzzy
  // match or literal dup), keep the first as the primary and push the rest
  // into the review queue so a human can decide which is canonical.
  const byEntity = new Map()
  const dupesForReview = []
  for (const r of resolved) {
    if (byEntity.has(r.entity_id)) {
      dupesForReview.push({
        idx: r.idx,
        raw: Object.fromEntries(headers.map((h, i) => [h, r.row[i] ?? ''])),
        candidates: [{ entity_id: r.entity_id, score: 0.9, via: 'duplicate_in_sheet' }],
      })
    } else {
      byEntity.set(r.entity_id, r)
    }
  }

  const payload = Array.from(byEntity.values()).map(({ entity_id, row }) => {
    const rec = {
      entity_id, subsector_id: entry.id, ingest_id: ingestId,
      updated_at: new Date().toISOString(),
    }
    for (const c of writable) {
      const i = cols.findIndex((x) => x.key === c.key)
      rec[c.key] = coerce(row[i] ?? '', c.type)
    }
    return rec
  })

  for (let i = 0; i < payload.length; i += 100) {
    const chunk = payload.slice(i, i + 100)
    await upsertChunk(table, chunk)
  }

  const toReview = [...queued, ...dupesForReview]
  if (toReview.length) {
    await pg('POST', '/subsector_ingest_unmatched',
      toReview.map((q) => ({
        ingest_id: ingestId,
        subsector_id: entry.id,
        row_number: q.idx,
        raw: q.raw,
        candidate_entity_ids: q.candidates.map((c) => c.entity_id),
        candidate_scores: q.candidates,
      })))
  }

  const displaySchema = writable.map((c) => ({ key: c.key, label: c.header, type: c.type }))
  // upsert registry
  await pg('POST', '/subsector_tables?on_conflict=subsector_id', [{
    subsector_id: entry.id,
    table_name: table,
    display_schema: displaySchema,
    updated_at: new Date().toISOString(),
  }]).catch(async () => {
    await fetch(`${SUPABASE_URL}/rest/v1/subsector_tables?on_conflict=subsector_id`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([{
        subsector_id: entry.id,
        table_name: table,
        display_schema: displaySchema,
        updated_at: new Date().toISOString(),
      }]),
    })
  })

  return {
    table,
    total: body.length,
    matched: payload.length,
    queued: queued.length,
    dupes: dupesForReview.length,
    cols: writable.length,
  }
}

async function main() {
  const filterIds = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n))
  const entries = filterIds.length ? SHEETS.filter((s) => filterIds.includes(s.id)) : SHEETS
  console.log(`Loading entity lookup…`)
  const lookup = await loadLookup()
  console.log(`  ${lookup.length} lookup rows (entities + aliases)`)

  const results = []
  for (const e of entries) {
    process.stdout.write(`\n[${e.id}] ${e.sub} … `)
    try {
      const r = await ingestOne(e, lookup)
      results.push({ ok: true, e, r })
      console.log(`OK   table=${r.table}  cols=${r.cols}  rows=${r.total}  matched=${r.matched}  queued=${r.queued}  dupes=${r.dupes}`)
    } catch (err) {
      results.push({ ok: false, e, err: err?.message ?? String(err) })
      console.log(`FAIL ${err?.message ?? err}`)
    }
  }

  console.log('\n=== Summary ===')
  let total = 0, matched = 0, queued = 0
  for (const r of results) {
    if (r.ok) { total += r.r.total; matched += r.r.matched; queued += r.r.queued }
  }
  console.log(`Processed ${results.filter((x) => x.ok).length}/${results.length} sheets`)
  console.log(`Total rows: ${total}   Auto-matched: ${matched}   Queued for review: ${queued}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
