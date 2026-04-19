import type { NextApiRequest, NextApiResponse } from 'next'
import { getArticlesForEntity } from '../../../lib/articles'

/**
 * /api/articles/for-entity?entity_id=123 — CAN-NEW-07.
 *
 * Returns the list of articles that reference a given entity via their
 * `entity_ids` array. Used by CompanyDetailDrawer to render a "Featured
 * in" section without baking the registry into the client bundle.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const raw = req.query.entity_id
  const asString = Array.isArray(raw) ? raw[0] : raw
  const entityId = parseInt(String(asString ?? ''), 10)
  if (!Number.isFinite(entityId)) {
    return res.status(400).json({ error: 'entity_id is required and must be numeric' })
  }

  const articles = getArticlesForEntity(entityId).map((a) => ({
    slug: a.slug,
    title: a.title,
    summary: a.summary,
    author: a.author,
    published_at: a.published_at,
    external_url: a.external_url,
    tags: a.tags,
  }))

  // Registry is small and read from disk on cold start. Cache aggressively.
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  return res.status(200).json({ articles })
}
