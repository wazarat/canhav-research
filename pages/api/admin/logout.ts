import type { NextApiRequest, NextApiResponse } from 'next'
import { buildLogoutCookies } from '../../../lib/adminAuth'

/** POST /api/admin/logout — clears both admin cookies. Always returns 200. */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  res.setHeader('Set-Cookie', buildLogoutCookies())
  return res.status(200).json({ ok: true })
}
