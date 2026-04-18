#!/usr/bin/env node
/**
 * scripts/vercel-logs.mjs
 *
 * Talk to Vercel's REST API so we can triage deploys without leaving the
 * terminal. Surfaces deployment state (READY / ERROR / BUILDING …) and
 * full build-step logs for any deployment.
 *
 * One-time setup:
 *   1. Create a token at https://vercel.com/account/tokens
 *      (scope: Full Account is fine; or limit to the canhav-research project)
 *   2. Put these in .env.local:
 *        VERCEL_TOKEN=...
 *        VERCEL_PROJECT_ID=prj_...    # or the project slug (e.g. canhav-research)
 *        VERCEL_TEAM_ID=team_...      # omit for personal account
 *
 * Usage:
 *   node scripts/vercel-logs.mjs                  # list last 10 deployments
 *   node scripts/vercel-logs.mjs list 25          # list last N
 *   node scripts/vercel-logs.mjs latest           # full log of latest deploy
 *   node scripts/vercel-logs.mjs latest-failed    # full log of latest failed
 *   node scripts/vercel-logs.mjs <deploymentId>   # log for one deployment
 *   node scripts/vercel-logs.mjs url <shortUrl>   # log by *.vercel.app URL
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

const TOKEN = process.env.VERCEL_TOKEN
const PROJECT = process.env.VERCEL_PROJECT_ID
const TEAM = process.env.VERCEL_TEAM_ID || ''

if (!TOKEN) {
  console.error('Missing VERCEL_TOKEN in .env.local.')
  console.error('Create one at https://vercel.com/account/tokens and add:')
  console.error('  VERCEL_TOKEN=<token>')
  console.error('  VERCEL_PROJECT_ID=<project id or slug>  # e.g. canhav-research')
  console.error('  VERCEL_TEAM_ID=<team id>                # omit for personal')
  process.exit(1)
}

function qs(extra = {}) {
  const p = new URLSearchParams({ ...(TEAM ? { teamId: TEAM } : {}), ...extra })
  return p.toString()
}

async function api(pathSeg, extra = {}) {
  const url = `https://api.vercel.com${pathSeg}${pathSeg.includes('?') ? '&' : '?'}${qs(extra)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Vercel API ${res.status} ${url}\n${txt}`)
  }
  return res.json()
}

const STATE_ICON = {
  READY: '✅ READY',
  ERROR: '❌ ERROR',
  BUILDING: '⏳ BUILDING',
  CANCELED: '⊘  CANCELED',
  QUEUED: '⋯  QUEUED',
  INITIALIZING: '⋯  INIT',
}

async function listDeployments(limit = 10) {
  if (!PROJECT) throw new Error('VERCEL_PROJECT_ID not set')
  const data = await api(`/v6/deployments`, { projectId: PROJECT, limit: String(limit) })
  const rows = (data.deployments ?? []).map((d) => ({
    uid: d.uid,
    state: d.readyState || d.state,
    target: d.target || 'preview',
    url: d.url,
    commit: (d.meta?.githubCommitSha || '').slice(0, 7),
    msg: (d.meta?.githubCommitMessage || '').split('\n')[0].slice(0, 60),
    created: new Date(d.created).toISOString().replace('T', ' ').replace(/\..+/, ''),
  }))
  return rows
}

async function fetchLogs(deploymentId) {
  // v3 events endpoint streams build + runtime events; include build steps.
  const data = await api(`/v3/deployments/${deploymentId}/events`, { builds: '1', direction: 'forward', limit: '1000' })
  return Array.isArray(data) ? data : (data.events ?? [])
}

function formatEvent(e) {
  const ts = e.created ? new Date(e.created).toISOString().slice(11, 19) : '--:--:--'
  const txt = e.text ?? e.payload?.text ?? e.payload?.info?.message ?? e.payload?.message ?? ''
  const level = e.type || ''
  return `${ts}  ${level.padEnd(8)} ${txt}`
}

async function resolveByUrl(shortUrl) {
  const u = shortUrl.replace(/^https?:\/\//, '').split('/')[0]
  const data = await api(`/v13/deployments/${encodeURIComponent(u)}`)
  return data.uid
}

async function main() {
  const args = process.argv.slice(2)
  const cmd = args[0] ?? 'list'

  if (cmd === 'list') {
    const n = Number(args[1]) || 10
    const rows = await listDeployments(n)
    console.log(`\n${rows.length} latest deployments for project "${PROJECT}"\n`)
    for (const r of rows) {
      console.log(`${r.created}  ${STATE_ICON[r.state] || r.state}  ${r.target.padEnd(8)} ${r.commit} ${r.uid}`)
      if (r.msg) console.log(`                       └─ "${r.msg}"`)
    }
    console.log(`\nTip: node scripts/vercel-logs.mjs <uid>  (or "latest-failed")`)
    return
  }

  if (cmd === 'latest' || cmd === 'latest-failed') {
    const rows = await listDeployments(25)
    const row = cmd === 'latest-failed' ? rows.find((r) => r.state === 'ERROR') : rows[0]
    if (!row) { console.log('No matching deployment found.'); return }
    console.log(`\nLogs for ${row.uid} (${STATE_ICON[row.state]}, commit ${row.commit})\n`)
    const events = await fetchLogs(row.uid)
    for (const e of events) console.log(formatEvent(e))
    return
  }

  if (cmd === 'url') {
    const uid = await resolveByUrl(args[1])
    const events = await fetchLogs(uid)
    for (const e of events) console.log(formatEvent(e))
    return
  }

  // Otherwise treat arg as a deployment id
  const events = await fetchLogs(cmd)
  for (const e of events) console.log(formatEvent(e))
}

main().catch((e) => { console.error(e); process.exit(1) })
