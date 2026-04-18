import type { NextApiRequest, NextApiResponse } from 'next'
import { getEditorName, isAuthed } from '../../../lib/adminAuth'

/**
 * GET /api/admin/session
 * Lightweight "am I logged in?" probe used by the /admin pages to show an
 * editor banner or redirect. Does NOT leak the token. Not gated by
 * middleware so the login page can poll it.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const authed = isAuthed(req)
  return res.status(200).json({
    authed,
    editor_name: authed ? getEditorName(req) : null,
  })
}
