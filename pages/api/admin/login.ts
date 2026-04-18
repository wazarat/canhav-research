import type { NextApiRequest, NextApiResponse } from 'next'
import {
  ADMIN_COOKIE,
  buildLoginCookies,
  timingSafeEqual,
} from '../../../lib/adminAuth'

/**
 * POST /api/admin/login
 * Body: { token: string, editor_name: string }
 *
 * If `token` matches process.env.ADMIN_AUTH_TOKEN (constant-time compare),
 * sets the HttpOnly cah_admin_token cookie + a non-sensitive cah_admin_editor
 * display cookie. Returns { ok: true, editor_name } on success.
 *
 * This endpoint is deliberately NOT gated by middleware so the browser can
 * actually sign in (see middleware.ts PUBLIC_ADMIN_PATHS).
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token, editor_name } = (req.body ?? {}) as {
    token?: string
    editor_name?: string
  }

  const expected = process.env.ADMIN_AUTH_TOKEN
  if (!expected) {
    return res.status(500).json({ error: 'ADMIN_AUTH_TOKEN not configured' })
  }
  if (typeof token !== 'string' || token.length === 0) {
    return res.status(400).json({ error: 'Missing token' })
  }
  const name = (editor_name ?? '').toString().trim().slice(0, 64)
  if (!name) {
    return res.status(400).json({ error: 'Missing editor_name' })
  }

  if (!timingSafeEqual(token, expected)) {
    // Deliberate small delay via a micro-task to blunt online brute force a bit.
    return setTimeout(
      () => res.status(401).json({ error: 'Invalid token' }),
      300
    )
  }

  res.setHeader('Set-Cookie', buildLoginCookies(token, name))
  // Don't echo the token back.
  void ADMIN_COOKIE
  return res.status(200).json({ ok: true, editor_name: name })
}
