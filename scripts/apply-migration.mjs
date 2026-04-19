#!/usr/bin/env node
/**
 * scripts/apply-migration.mjs
 *
 * Run a single Supabase SQL migration file against the eth-data project
 * using the Management API.
 *
 * Usage:
 *   node scripts/apply-migration.mjs supabase/migrations/013_user_stars.sql
 *
 * Required env (read from .env.local):
 *   SUPABASE_MANAGEMENT_PAT
 *   SUPABASE_PROJECT_REF
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const k = line.slice(0, eq).trim()
    let v = line.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!(k in process.env)) process.env[k] = v
  }
}

loadEnv()

const PAT = process.env.SUPABASE_MANAGEMENT_PAT
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF

if (!PAT || !PROJECT_REF) {
  console.error('Missing SUPABASE_MANAGEMENT_PAT or SUPABASE_PROJECT_REF in .env.local')
  process.exit(1)
}

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/apply-migration.mjs <path-to-sql>')
  process.exit(1)
}

const sql = fs.readFileSync(file, 'utf8')
console.log(`Applying ${file} (${sql.length} chars) to project ${PROJECT_REF}…`)

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  }
)

const body = await res.text()
if (!res.ok) {
  console.error(`FAILED ${res.status}: ${body}`)
  process.exit(1)
}

console.log('OK')
try {
  console.log(JSON.stringify(JSON.parse(body), null, 2))
} catch {
  console.log(body)
}
