import type { NextApiRequest, NextApiResponse } from 'next'
import { getSubsectorSummary } from '../../../lib/subsectorSummary'

/**
 * /api/subsector-summary/[slug] — CAN-NEW-04.
 *
 * Returns the { name, what, why, trust_model } payload for a subsector
 * if a summary exists, otherwise 404. `slug` may be either the slugified
 * form (monetary-and-access-rails) or the raw subsector name.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const raw = req.query.slug
  const slug = Array.isArray(raw) ? raw[0] : raw
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'slug is required' })
  }

  const summary = getSubsectorSummary(slug)
  if (!summary) {
    return res.status(404).json({ error: 'No summary configured for this subsector' })
  }

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  return res.status(200).json({ summary })
}
