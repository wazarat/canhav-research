import type { NextApiRequest, NextApiResponse } from 'next'
import { getAdminSession } from '../../../lib/adminAuth'

/**
 * GET /api/admin/session
 * Returns { authed, role, email } for the caller. Does NOT short-circuit
 * on not-signed-in — clients can use this to decide whether to render the
 * admin nav. Not blocked by middleware so the login page can poll it.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const session = await getAdminSession(req, res)
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    authed: !!session,
    email: session?.user.email ?? null,
    role: session?.role ?? null,
  })
}
