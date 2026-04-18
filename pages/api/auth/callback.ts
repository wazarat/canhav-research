import type { NextApiRequest, NextApiResponse } from 'next'
import { createSupabaseApiClient } from '../../../lib/supabaseServer'

/**
 * OAuth / magic-link callback for Supabase Auth.
 *
 * Supabase redirects the user here after Google sign-in or after they
 * click an emailed magic-link. The URL contains a `?code=...` param
 * which we exchange for a session; the SSR helper writes the resulting
 * session cookies onto the response, and we redirect to the `next` path
 * (defaults to /admin/entities).
 *
 * Lives at /api/auth/callback — it MUST be an API route, not a page.
 * (Putting it under /pages/auth/ makes Next try to statically prerender
 * an async function as a React component which blows up at build time.)
 *
 * Whitelist in the Supabase dashboard under Authentication -> URL
 * Configuration -> Redirect URLs:
 *   http://localhost:3000/api/auth/callback
 *   https://www.canhav.com/api/auth/callback
 *   (+ a preview-deploy wildcard if you want preview branches to work)
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
