import path from 'path'
import fs from 'fs'

/**
 * Server-side article registry reader.
 *
 * Articles live in /content/articles/index.json at the repo root so they
 * ship with the codebase (no extra CMS, no DB round-trip). The registry
 * is read once at cold start and cached in module scope — on-disk edits
 * require a redeploy, which is the desired behaviour for a static blog
 * surface.
 *
 * Consumed by:
 *   - pages/research/index.tsx        (getStaticProps)
 *   - pages/research/[slug].tsx       (getStaticPaths + getStaticProps)
 *   - pages/api/articles/[slug].ts    (runtime lookup for drawer)
 *   - CompanyDetailDrawer / company page ("Featured in" section)
 *
 * Shape of /content/articles/index.json:
 *   {
 *     "articles": [{
 *        slug, title, summary, author, published_at (YYYY-MM-DD),
 *        sector, subsector, tags[], entity_ids[],
 *        external_url?, body?: string[]
 *     }]
 *   }
 */

export interface Article {
  slug: string
  title: string
  summary: string
  author: string
  published_at: string
  sector: string | null
  subsector: string | null
  tags: string[]
  entity_ids: number[]
  external_url: string | null
  body: string[]
}

interface RawArticle {
  slug: string
  title: string
  summary?: string
  author?: string
  published_at?: string
  sector?: string | null
  subsector?: string | null
  tags?: string[]
  entity_ids?: number[]
  external_url?: string | null
  body?: string[]
}

let CACHED_ARTICLES: Article[] | null = null

function loadFromDisk(): Article[] {
  try {
    const filePath = path.join(process.cwd(), 'content', 'articles', 'index.json')
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as { articles?: RawArticle[] }
    const list = Array.isArray(parsed.articles) ? parsed.articles : []
    return list
      .filter((a) => typeof a?.slug === 'string' && typeof a?.title === 'string')
      .map<Article>((a) => ({
        slug: a.slug,
        title: a.title,
        summary: a.summary ?? '',
        author: a.author ?? 'CanHav Research',
        published_at: a.published_at ?? '',
        sector: a.sector ?? null,
        subsector: a.subsector ?? null,
        tags: Array.isArray(a.tags) ? a.tags.filter((t) => typeof t === 'string') : [],
        entity_ids: Array.isArray(a.entity_ids)
          ? a.entity_ids.filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
          : [],
        external_url: a.external_url ?? null,
        body: Array.isArray(a.body) ? a.body.filter((p) => typeof p === 'string') : [],
      }))
      .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
  } catch (err) {
    // In dev the file may not exist yet; fall through to empty list so the
    // page still renders with an empty state.
    console.warn('[articles] could not load registry', err)
    return []
  }
}

export function getAllArticles(): Article[] {
  if (CACHED_ARTICLES === null) CACHED_ARTICLES = loadFromDisk()
  return CACHED_ARTICLES
}

export function getArticleBySlug(slug: string): Article | null {
  return getAllArticles().find((a) => a.slug === slug) ?? null
}

// Cross-reference: every article that mentions an entity_id. Used by the
// "Featured in" block on /company/[id] and the detail drawer.
export function getArticlesForEntity(entityId: number): Article[] {
  if (!Number.isFinite(entityId)) return []
  return getAllArticles().filter((a) => a.entity_ids.includes(entityId))
}

// Used by /sectors/[slug] to pull the latest 3 articles tagged with the
// sector name. Falls back to articles whose tags include the sector slug.
export function getArticlesForSector(sectorName: string, limit = 3): Article[] {
  const lower = sectorName.toLowerCase()
  return getAllArticles()
    .filter(
      (a) =>
        (a.sector && a.sector.toLowerCase() === lower) ||
        a.tags.some((t) => t.toLowerCase() === lower)
    )
    .slice(0, limit)
}
