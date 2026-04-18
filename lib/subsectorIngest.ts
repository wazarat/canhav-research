/**
 * Subsector-data ingestion helpers.
 *
 * Per design: each subsector gets its own real, typed table in public.*.
 * This module is responsible for:
 *   1. Translating a Google Sheets URL into a public CSV export URL.
 *   2. Parsing that CSV into headers + rows.
 *   3. Inferring column types.
 *   4. Matching each row to an existing entity (via normalised name +
 *      entity_aliases + website domain + fuzzy similarity).
 *   5. Building the DDL for the target table (or extending it on later runs).
 *
 * The admin API routes in /api/admin/subsector-ingest/* are thin orchestration
 * wrappers around these helpers.
 */

import { getSupabaseAdmin } from './supabaseNew'

// ---------------------------------------------------------------------------
// Google Sheets helpers
// ---------------------------------------------------------------------------

export interface ParsedSheetUrl {
  spreadsheetId: string
  gid: string | null
  csvUrl: string
}

/**
 * Accepts a Google Sheets URL in any of these shapes and returns a public
 * CSV export URL. The sheet must already be shared as "Anyone with link can
 * view" — we make no auth attempts.
 *
 *   https://docs.google.com/spreadsheets/d/<ID>/edit#gid=<GID>
 *   https://docs.google.com/spreadsheets/d/<ID>/edit?gid=<GID>
 *   https://docs.google.com/spreadsheets/d/<ID>/
 *   https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=<GID>
 */
export function parseSheetUrl(input: string): ParsedSheetUrl {
  const trimmed = input.trim()
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!idMatch) {
    throw new Error('Not a Google Sheets URL (missing /spreadsheets/d/<id>).')
  }
  const spreadsheetId = idMatch[1]
  let gid: string | null = null
  const hashGid = trimmed.match(/#gid=(\d+)/)
  const queryGid = trimmed.match(/[?&]gid=(\d+)/)
  if (hashGid) gid = hashGid[1]
  else if (queryGid) gid = queryGid[1]

  const csvUrl = gid
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`
  return { spreadsheetId, gid, csvUrl }
}

export async function fetchSheetCsv(csvUrl: string): Promise<string> {
  const res = await fetch(csvUrl, {
    redirect: 'follow',
    headers: { Accept: 'text/csv,*/*' },
  })
  if (!res.ok) {
    throw new Error(
      `Fetch failed: ${res.status} ${res.statusText}. Make sure the sheet is shared as "Anyone with link can view".`
    )
  }
  const text = await res.text()
  if (text.startsWith('<!DOCTYPE') || text.includes('<title>Sign in')) {
    throw new Error('The sheet appears to still be private. Share as "Anyone with link" first.')
  }
  return text
}

// ---------------------------------------------------------------------------
// CSV parser (RFC 4180 compliant enough for Google Sheets output)
// ---------------------------------------------------------------------------

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(cell)
        cell = ''
      } else if (ch === '\n') {
        row.push(cell)
        rows.push(row)
        row = []
        cell = ''
      } else if (ch === '\r') {
        // skip; handled by \n
      } else {
        cell += ch
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  // Strip trailing fully-empty rows
  while (rows.length && rows[rows.length - 1].every((c) => c.trim() === '')) {
    rows.pop()
  }
  return rows
}

// ---------------------------------------------------------------------------
// Column slug + type inference
// ---------------------------------------------------------------------------

export type ColumnType = 'text' | 'long_text' | 'integer' | 'numeric' | 'date' | 'url' | 'boolean'

export interface InferredColumn {
  header: string
  key: string
  type: ColumnType
  is_name?: boolean
  is_website?: boolean
}

export function slugifyHeader(header: string): string {
  const base = header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const reserved = new Set([
    'entity_id',
    'subsector_id',
    'ingest_id',
    'updated_at',
    'created_at',
    'user',
    'order',
    'select',
    'from',
    'where',
  ])
  let key = base.length ? base : 'col'
  if (reserved.has(key)) key = `${key}_val`
  // Postgres identifier length
  return key.slice(0, 56)
}

function dedupeKeys(columns: InferredColumn[]): InferredColumn[] {
  const seen: Record<string, number> = {}
  return columns.map((c) => {
    const base = c.key
    if (seen[base] === undefined) {
      seen[base] = 1
      return c
    }
    const suffix = ++seen[base]
    return { ...c, key: `${base}_${suffix}` }
  })
}

const URL_RE = /^(https?:\/\/|www\.)/i
const INT_RE = /^-?\d+$/
const NUM_RE = /^-?\d+(\.\d+)?$/
const DATE_RE = /^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|[A-Z][a-z]{2,9} \d{1,2},? \d{4})$/
const BOOL_RE = /^(yes|no|true|false|y|n)$/i

function inferCellType(v: string): ColumnType | null {
  const s = v.trim()
  if (!s) return null
  if (URL_RE.test(s)) return 'url'
  if (INT_RE.test(s)) return 'integer'
  if (NUM_RE.test(s)) return 'numeric'
  if (DATE_RE.test(s)) return 'date'
  if (BOOL_RE.test(s)) return 'boolean'
  if (s.length > 120) return 'long_text'
  return 'text'
}

export function inferColumns(
  headers: string[],
  rows: string[][],
  nameColumn: string
): InferredColumn[] {
  const cols: InferredColumn[] = headers.map((h) => ({
    header: h,
    key: slugifyHeader(h),
    type: 'text' as ColumnType,
    is_name: h.trim().toLowerCase() === nameColumn.trim().toLowerCase(),
    is_website:
      /^website$/i.test(h.trim()) || /url/i.test(h.trim()),
  }))
  const deduped = dedupeKeys(cols)
  for (let c = 0; c < deduped.length; c++) {
    const seenTypes: Record<ColumnType, number> = {
      text: 0,
      long_text: 0,
      integer: 0,
      numeric: 0,
      date: 0,
      url: 0,
      boolean: 0,
    }
    let nonEmpty = 0
    for (let r = 0; r < rows.length; r++) {
      const v = rows[r][c] ?? ''
      const t = inferCellType(v)
      if (t) {
        seenTypes[t]++
        nonEmpty++
      }
    }
    if (nonEmpty === 0) {
      deduped[c].type = 'text'
      continue
    }
    // Priority: url > date > long_text > numeric > integer > boolean > text
    // but only if ≥ 80% of non-empty cells agree.
    const score = (t: ColumnType) => seenTypes[t] / nonEmpty
    if (score('url') >= 0.8) deduped[c].type = 'url'
    else if (score('date') >= 0.8) deduped[c].type = 'date'
    else if (seenTypes.long_text / nonEmpty >= 0.3) deduped[c].type = 'long_text'
    else if (score('integer') >= 0.8) deduped[c].type = 'integer'
    else if ((seenTypes.integer + seenTypes.numeric) / nonEmpty >= 0.8)
      deduped[c].type = 'numeric'
    else if (score('boolean') >= 0.8) deduped[c].type = 'boolean'
    else deduped[c].type = 'text'
  }
  return deduped
}

export function pgTypeFor(t: ColumnType): string {
  switch (t) {
    case 'integer':
      return 'integer'
    case 'numeric':
      return 'numeric'
    case 'date':
      return 'date'
    case 'boolean':
      return 'boolean'
    case 'url':
    case 'text':
    case 'long_text':
    default:
      return 'text'
  }
}

// ---------------------------------------------------------------------------
// Name / domain normalisation + fuzzy matching
// ---------------------------------------------------------------------------

export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ') // strip "(Data APIs)"-style parentheticals
    .replace(/[^a-z0-9]+/g, '')
}

export function extractDomain(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const u = new URL(withProto)
    return u.hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return null
  }
}

/** Levenshtein / normalised ratio — small enough to inline. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1
  if (!a || !b) return 0
  const la = a.length
  const lb = b.length
  const dp: number[] = new Array(lb + 1)
  for (let j = 0; j <= lb; j++) dp[j] = j
  for (let i = 1; i <= la; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= lb; j++) {
      const tmp = dp[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost)
      prev = tmp
    }
  }
  const dist = dp[lb]
  return 1 - dist / Math.max(la, lb)
}

export interface EntityLookupRow {
  entity_id: number
  entity_name: string
  entity_norm: string
  canonical_website: string | null
  domain: string | null
  source: 'entity' | 'alias'
}

/**
 * Load every candidate name into memory. The dataset is ~500 entities, so
 * this is cheap and avoids per-row round-trips.
 */
export async function loadEntityLookup(): Promise<EntityLookupRow[]> {
  const admin = getSupabaseAdmin()
  const [{ data: entities, error: e1 }, { data: aliases, error: e2 }] = await Promise.all([
    admin
      .from('entities')
      .select('entity_id, entity_name, canonical_website'),
    admin
      .from('entity_aliases')
      .select('entity_id, alias_name, entities:entity_id (canonical_website)'),
  ])
  if (e1) throw new Error(`entities: ${e1.message}`)
  if (e2) throw new Error(`entity_aliases: ${e2.message}`)

  const rows: EntityLookupRow[] = []
  for (const e of entities ?? []) {
    const domain = extractDomain(e.canonical_website)
    rows.push({
      entity_id: e.entity_id,
      entity_name: e.entity_name,
      entity_norm: normaliseName(e.entity_name ?? ''),
      canonical_website: e.canonical_website ?? null,
      domain,
      source: 'entity',
    })
  }
  for (const a of aliases ?? []) {
    const website = (a.entities as unknown as { canonical_website: string | null } | null)
      ?.canonical_website ?? null
    rows.push({
      entity_id: a.entity_id,
      entity_name: a.alias_name,
      entity_norm: normaliseName(a.alias_name ?? ''),
      canonical_website: website,
      domain: extractDomain(website),
      source: 'alias',
    })
  }
  return rows
}

export interface MatchCandidate {
  entity_id: number
  entity_name: string
  score: number
  via: 'exact_name' | 'alias' | 'domain' | 'fuzzy'
}

export interface MatchResult {
  best: MatchCandidate | null
  candidates: MatchCandidate[]
}

export function matchRow(
  params: { name: string; website?: string | null },
  lookup: EntityLookupRow[]
): MatchResult {
  const normName = normaliseName(params.name ?? '')
  const domain = extractDomain(params.website ?? undefined)
  const scores = new Map<number, MatchCandidate>()
  const bump = (c: MatchCandidate) => {
    const prev = scores.get(c.entity_id)
    if (!prev || prev.score < c.score) scores.set(c.entity_id, c)
  }

  for (const row of lookup) {
    if (!row.entity_norm) continue
    // Exact normalised match on current name
    if (row.source === 'entity' && normName && row.entity_norm === normName) {
      bump({ entity_id: row.entity_id, entity_name: row.entity_name, score: 1.0, via: 'exact_name' })
      continue
    }
    // Exact normalised match on an alias (pre-merge name)
    if (row.source === 'alias' && normName && row.entity_norm === normName) {
      bump({ entity_id: row.entity_id, entity_name: row.entity_name, score: 0.98, via: 'alias' })
      continue
    }
    // Domain match
    if (domain && row.domain && row.domain === domain) {
      bump({ entity_id: row.entity_id, entity_name: row.entity_name, score: 0.96, via: 'domain' })
      continue
    }
    // Fuzzy
    if (normName && row.entity_norm) {
      const s = similarity(normName, row.entity_norm)
      if (s >= 0.85) {
        bump({
          entity_id: row.entity_id,
          entity_name: row.entity_name,
          score: s * (row.source === 'alias' ? 0.95 : 1),
          via: 'fuzzy',
        })
      }
    }
  }

  const candidates = Array.from(scores.values()).sort((a, b) => b.score - a.score)
  const best = candidates[0] ?? null
  return { best, candidates: candidates.slice(0, 5) }
}

// ---------------------------------------------------------------------------
// DDL execution via the Supabase Management API (psql proxy)
// ---------------------------------------------------------------------------

export async function executeSql(sql: string): Promise<unknown> {
  const url = process.env.NEXT_PUBLIC_ETHDATA_SUPABASE_URL ?? ''
  // We deliberately use the Supabase Management API here because service-role
  // can't run DDL through PostgREST. The PAT is scoped in env.
  const pat = process.env.SUPABASE_MANAGEMENT_PAT
  const projectRef = process.env.SUPABASE_PROJECT_REF ?? inferProjectRef(url)
  if (!pat || !projectRef) {
    throw new Error(
      'Missing SUPABASE_MANAGEMENT_PAT / SUPABASE_PROJECT_REF env vars — required to run DDL.'
    )
  }
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`SQL failed (${res.status}): ${t}`)
  }
  return res.json()
}

function inferProjectRef(url: string): string | null {
  const m = url.match(/https?:\/\/([^.]+)\.supabase\.co/)
  return m ? m[1] : null
}

export function buildCreateTableSql(tableName: string, columns: InferredColumn[]): string {
  const colsDdl = columns
    .filter((c) => !c.is_name && !c.is_website)
    .map((c) => `  ${safeIdent(c.key)} ${pgTypeFor(c.type)}`)
    .join(',\n')
  return `
CREATE TABLE IF NOT EXISTS public.${safeIdent(tableName)} (
  entity_id    bigint       PRIMARY KEY REFERENCES public.entities(entity_id) ON DELETE CASCADE,
  subsector_id bigint       NOT NULL REFERENCES public.subsectors(subsector_id) ON DELETE CASCADE,
  ingest_id    uuid,
  updated_at   timestamptz  NOT NULL DEFAULT now()${colsDdl ? ',\n' + colsDdl : ''}
);
ALTER TABLE public.${safeIdent(tableName)} ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ${safeIdent(tableName)}_read ON public.${safeIdent(tableName)};
CREATE POLICY ${safeIdent(tableName)}_read ON public.${safeIdent(tableName)}
  FOR SELECT TO authenticated USING (true);
`
}

export function buildAlterAddMissingColsSql(
  tableName: string,
  existingColumns: Set<string>,
  columns: InferredColumn[]
): string {
  const alters: string[] = []
  for (const c of columns) {
    if (c.is_name || c.is_website) continue
    if (existingColumns.has(c.key)) continue
    alters.push(
      `ALTER TABLE public.${safeIdent(tableName)} ADD COLUMN IF NOT EXISTS ${safeIdent(c.key)} ${pgTypeFor(c.type)};`
    )
  }
  return alters.join('\n')
}

/** Quote an identifier only when it looks unsafe — our slugs are already safe. */
export function safeIdent(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
    throw new Error(`Refusing unsafe identifier: ${name}`)
  }
  return name
}
