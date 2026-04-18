import type { NextApiRequest, NextApiResponse } from 'next'
import { getViewer } from '../../../lib/viewerAuth'

/**
 * GET /api/viewer/session
 *
 * Returns { signedIn: false } or
 * { signedIn: true, user: { id, email, full_name, avatar_url }, isPaid }.
 *
 * Unlike /api/admin/session this never 401s — the UI uses this to branch
 * between "Sign in" and "my account" affordances in the navbar.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const viewer = await getViewer(req, res)
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
  if (!viewer) {
    return res.status(200).json({ signedIn: false })
  }
  return res.status(200).json({
    signedIn: true,
    user: viewer.user,
    isPaid: viewer.isPaid,
  })
}
