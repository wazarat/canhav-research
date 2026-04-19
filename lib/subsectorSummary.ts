import path from 'path'
import fs from 'fs'
import { toSlug } from './slug'

/**
 * Server-side subsector-summary registry reader.
 *
 * Summaries live in /content/subsectors/index.json, keyed by
 * `toSlug(subsector_name)`. Same caching pattern as `lib/articles.ts`.
 *
 * Consumed by:
 *   - components/SubsectorHero.tsx (via /api/subsector-summary)
 *   - pages/sectors/[slug].tsx     (getStaticProps)
 *   - pages/api/subsector-summary/[slug].ts
 *
 * Shape:
 *   {
 *     "subsectors": {
 *       "regional-payment-networks": {
 *         "name": "Regional Payment Networks",
 *         "what": "...",
 *         "why":  "...",
 *         "trust_model": "..."
 *       }
 *     }
 *   }
 */

export interface SubsectorSummary {
  slug: string
  name: string
  what: string
  why: string
  trust_model: string | null
}

interface RawSubsectorSummary {
  name?: string
  what?: string
  why?: string
  trust_model?: string | null
}

let CACHED: Record<string, SubsectorSummary> | null = null

function loadFromDisk(): Record<string, SubsectorSummary> {
  try {
    const filePath = path.join(process.cwd(), 'content', 'subsectors', 'index.json')
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as {
      subsectors?: Record<string, RawSubsectorSummary>
    }
    const out: Record<string, SubsectorSummary> = {}
    const rawMap = parsed.subsectors ?? {}
    for (const [slug, value] of Object.entries(rawMap)) {
      if (!value || typeof value !== 'object') continue
      if (!value.name || !value.what) continue
      out[slug] = {
        slug,
        name: value.name,
        what: value.what,
        why: value.why ?? '',
        trust_model: value.trust_model ?? null,
      }
    }
    return out
  } catch (err) {
    console.warn('[subsector-summary] could not load registry', err)
    return {}
  }
}

export function getAllSubsectorSummaries(): Record<string, SubsectorSummary> {
  if (CACHED === null) CACHED = loadFromDisk()
  return CACHED
}

export function getSubsectorSummary(
  nameOrSlug: string | null | undefined
): SubsectorSummary | null {
  if (!nameOrSlug) return null
  const all = getAllSubsectorSummaries()
  const direct = all[nameOrSlug]
  if (direct) return direct
  const slug = toSlug(nameOrSlug)
  return all[slug] ?? null
}
