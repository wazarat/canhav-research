import type { NextApiRequest, NextApiResponse } from 'next'
import { createSupabaseApiClient } from '../../lib/supabaseServer'

/**
 * OAuth callback for Supabase Auth.
 *
 * Supabase redirects the user here after Google / Microsoft sign-in. The
 * URL contains a `?code=...` param which we exchange for a session. The
 * SSR helper writes the resulting session cookies onto the response, and
 * we redirect to the original `next` path (or /admin/entities by
 * default).
 *
 * Lives at /auth/callback — must be whitelisted in the Supabase dashboard
 * under Authentication → URL Configuration → Redirect URLs, for both
 *   http://localhost:3000/auth/callback
 *   https://www.canhav.com/auth/callback
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const code = typeof req.query.code === 'string' ? req.query.code : null
  const nextParam =
    typeof req.query.next === 'string' && req.query.next.startsWith('/')
      ? req.query.next
      : '/admin/entities'

  if (!code) {
    res.redirect(
      302,
      `/admin/login?error=${encodeURIComponent('Missing OAuth code')}`
    )
    return
  }

  try {
    const supabase = createSupabaseApiClient(req, res)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[auth/callback] exchange failed:', error)
      res.redirect(
        302,
        `/admin/login?error=${encodeURIComponent(error.message)}`
      )
      return
    }
  } catch (err) {
    console.error('[auth/callback] unexpected:', err)
    res.redirect(
      302,
      `/admin/login?error=${encodeURIComponent('Sign-in failed')}`
    )
    return
  }

  res.redirect(302, nextParam)
}
