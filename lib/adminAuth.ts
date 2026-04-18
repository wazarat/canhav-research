import type { NextApiRequest, NextApiResponse } from 'next'
import { createSupabaseApiClient } from './supabaseServer'
import { getSupabaseAdmin } from './supabaseNew'

/**
 * Admin authentication, backed by Supabase Auth + public.admin_users.
 *
 * Replaces the old ADMIN_AUTH_TOKEN shared-secret. A caller is
 * "authorised" iff:
 *   1. They have a valid Supabase session cookie (signed in via OAuth or
 *      magic link), AND
 *   2. Their auth.users.id appears in public.admin_users.
 *
 * The role field (admin | super_admin) controls whether they can promote
 * / demote other editors (see /api/admin/members).
 *
 * Usage from an API route:
 *   const session = await requireAdmin(req, res)
 *   if (!session) return            // 401/403 already written
 *   // ... session.user.email, session.role available
 */

export type AdminRole = 'admin' | 'super_admin'

export interface AdminSession {
  user: {
    id: string
    email: string
  }
  role: AdminRole
}

/**
 * Fetch the current admin session or null. Does NOT write to the response.
 * Use this when you need to branch on auth state without short-circuiting
 * (e.g. a page that shows extra controls for super_admin).
 */
export async function getAdminSession(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AdminSession | null> {
  const supabase = createSupabaseApiClient(req, res)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user || !user.email) return null

  // Service-role lookup so RLS doesn't hide the row from the user themself.
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !data) return null

  return {
    user: { id: user.id, email: user.email },
    role: data.role as AdminRole,
  }
}

/**
 * Gate an admin API route. If the caller isn't signed in the response is
 * 401; if they're signed in but not an admin it's 403. Returns the session
 * on success, null otherwise — callers should `return` immediately on null.
 */
export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
  options: { requireSuper?: boolean } = {}
): Promise<AdminSession | null> {
  const supabase = createSupabaseApiClient(req, res)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user || !user.email) {
    res.status(401).json({ error: 'Not signed in' })
    return null
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) {
    console.error('[requireAdmin] lookup failed:', error)
    res.status(500).json({ error: 'Failed to check admin status' })
    return null
  }
  if (!data) {
    res.status(403).json({ error: 'Not authorised for admin tools' })
    return null
  }

  const role = data.role as AdminRole
  if (options.requireSuper && role !== 'super_admin') {
    res.status(403).json({ error: 'Super-admin required' })
    return null
  }

  return { user: { id: user.id, email: user.email }, role }
}
