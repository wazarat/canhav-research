import type { NextApiRequest, NextApiResponse } from 'next'
import { createSupabaseApiClient } from '../../../lib/supabaseServer'

/**
 * POST /api/admin/logout
 * Signs the user out of Supabase Auth. The SSR client writes the
 * cookie-removal headers onto the response automatically.
 *
 * Kept as a server-side endpoint (rather than calling supabase.auth
 * .signOut() from the browser) so we can be sure every admin session
 * cookie is cleared on the exact response the client observes.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const supabase = createSupabaseApiClient(req, res)
  await supabase.auth.signOut()
  return res.status(200).json({ ok: true })
}
