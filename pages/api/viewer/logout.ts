import type { NextApiRequest, NextApiResponse } from 'next'
import { createSupabaseApiClient } from '../../../lib/supabaseServer'

/**
 * POST /api/viewer/logout
 *
 * Signs the current viewer out. Clears Supabase session cookies so the
 * next request looks anonymous. Admins who signed in via the same auth
 * session are also signed out.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const supabase = createSupabaseApiClient(req, res)
  const { error } = await supabase.auth.signOut()
  if (error) {
    return res.status(500).json({ error: error.message })
  }
  return res.status(200).json({ ok: true })
}
