import type { NextApiRequest, NextApiResponse } from 'next'
import { createSupabaseApiClient } from './supabaseServer'
import { getSupabaseAdmin } from './supabaseNew'

/**
 * Viewer-side authentication. Parallel to lib/adminAuth.ts, but for public
 * site visitors — anyone with a valid Supabase session counts, no allow-list
 * lookup.
 *
 * A "viewer" is anyone who signed in via Google OAuth or email magic link
 * through pages/login.tsx. Admins are a subset of viewers (they're also in
 * auth.users), so requireAdmin in /api/admin/* routes still works on top.
 *
 * Usage (API route that gates the rich profile):
 *   const viewer = await getViewer(req, res)
 *   if (!viewer) { res.status(401).json({error:'Sign in'}); return }
 *
 * Usage (getServerSideProps, optional):
 *   const viewer = await getViewer(req as any, res as any)
 *   if (!viewer) return { redirect: { destination: '/login?next=' + ctx.resolvedUrl, permanent: false } }
 */

export interface ViewerSession {
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
  isPaid: boolean
}

export async function getViewer(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<ViewerSession | null> {
  const supabase = createSupabaseApiClient(req, res)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user || !user.email) return null

  // Upsert the viewer's profile row on every call. Uses service-role so the
  // insert succeeds on first sign-in even though the user might not have an
  // RLS policy row yet.
  const admin = getSupabaseAdmin()
  const metaName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null
  const metaAvatar =
    (user.user_metadata?.avatar_url as string | undefined) ||
    (user.user_metadata?.picture as string | undefined) ||
    null

  const { data: profile } = await admin
    .from('user_profiles')
    .upsert(
      {
        user_id: user.id,
        email: user.email,
        full_name: metaName,
        avatar_url: metaAvatar,
      },
      { onConflict: 'user_id' }
    )
    .select('is_paid, full_name, avatar_url')
    .maybeSingle()

  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name ?? metaName,
      avatar_url: profile?.avatar_url ?? metaAvatar,
    },
    isPaid: !!profile?.is_paid,
  }
}

/**
 * Shorthand that 401s when no viewer is signed in. Returns the session
 * on success, null (and an already-written 401) otherwise.
 */
export async function requireViewer(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<ViewerSession | null> {
  const viewer = await getViewer(req, res)
  if (!viewer) {
    res.status(401).json({ error: 'Sign in required' })
    return null
  }
  return viewer
}
