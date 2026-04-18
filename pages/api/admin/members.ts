import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../lib/supabaseNew'

/**
 * /api/admin/members — manage the public.admin_users allow-list.
 *
 *   GET    — any admin can see the full editor list.
 *   POST   — super_admin only. Body: { email, role?: 'admin'|'super_admin' }.
 *              If the email already has an auth.users row, we promote them
 *              directly. Otherwise we invite them via Supabase Auth's
 *              admin API so they get a sign-in email the first time.
 *   DELETE — super_admin only. Body: { user_id }.
 *              Removes from public.admin_users but does NOT delete the
 *              Supabase user; they just lose access. Can't delete the
 *              last super_admin (prevents lockout).
 */

type MemberRow = {
  user_id: string
  email: string
  role: 'admin' | 'super_admin'
  added_by: string | null
  added_at: string
  notes: string | null
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') return handleList(req, res)
  if (req.method === 'POST') return handleAdd(req, res)
  if (req.method === 'DELETE') return handleRemove(req, res)
  res.setHeader('Allow', 'GET, POST, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}

async function handleList(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res)
  if (!session) return

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, email, role, added_by, added_at, notes')
    .order('role', { ascending: true })
    .order('added_at', { ascending: true })
  if (error) {
    console.error('[members GET] error:', error)
    return res.status(500).json({ error: 'Failed to load members' })
  }

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    members: (data ?? []) as MemberRow[],
    self: session,
  })
}

async function handleAdd(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res, { requireSuper: true })
  if (!session) return

  const body = (req.body ?? {}) as {
    email?: string
    role?: 'admin' | 'super_admin'
    notes?: string
  }
  const email = (body.email ?? '').toString().trim().toLowerCase()
  const role = body.role === 'super_admin' ? 'super_admin' : 'admin'
  const notes = (body.notes ?? '').toString().slice(0, 500) || null

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' })
  }

  const supabase = getSupabaseAdmin()

  // Look up the existing auth.users row by email. Supabase's JS client
  // exposes auth.admin.listUsers which scans in batches; we use a direct
  // paginated list with per-page filter for speed at low volumes.
  let userId: string | null = null
  {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    })
    if (error) {
      console.error('[members POST] listUsers:', error)
      return res.status(500).json({ error: 'Auth lookup failed' })
    }
    const match = data.users.find(
      (u) => (u.email ?? '').toLowerCase() === email
    )
    if (match) userId = match.id
  }

  // If they haven't signed in yet, invite them so they get an email.
  if (!userId) {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: buildCallbackUrl(req),
    })
    if (error) {
      console.error('[members POST] invite:', error)
      return res
        .status(500)
        .json({ error: `Failed to invite user: ${error.message}` })
    }
    userId = data.user?.id ?? null
  }

  if (!userId) {
    return res.status(500).json({ error: 'Could not resolve user id' })
  }

  const { data: inserted, error: insErr } = await supabase
    .from('admin_users')
    .upsert(
      {
        user_id: userId,
        email,
        role,
        added_by: session.user.id,
        notes,
      },
      { onConflict: 'user_id' }
    )
    .select('user_id, email, role, added_by, added_at, notes')
    .single()
  if (insErr) {
    console.error('[members POST] upsert:', insErr)
    return res.status(500).json({ error: insErr.message })
  }

  return res.status(200).json({ ok: true, member: inserted })
}

async function handleRemove(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res, { requireSuper: true })
  if (!session) return

  const { user_id } = (req.body ?? {}) as { user_id?: string }
  if (typeof user_id !== 'string' || user_id.length === 0) {
    return res.status(400).json({ error: 'user_id required' })
  }

  const supabase = getSupabaseAdmin()

  // Lockout guard: if the target is the last super_admin, refuse.
  const { data: superAdmins, error: countErr } = await supabase
    .from('admin_users')
    .select('user_id, role')
    .eq('role', 'super_admin')
  if (countErr) {
    console.error('[members DELETE] count:', countErr)
    return res.status(500).json({ error: 'Lookup failed' })
  }
  const superIds = (superAdmins ?? []).map((r) => r.user_id)
  if (superIds.includes(user_id) && superIds.length <= 1) {
    return res.status(400).json({
      error: "Can't remove the last super-admin. Promote someone else first.",
    })
  }

  // Also refuse self-removal of the only super-admin.
  if (user_id === session.user.id && session.role === 'super_admin' && superIds.length <= 1) {
    return res
      .status(400)
      .json({ error: "Can't remove yourself as the only super-admin." })
  }

  const { error: delErr } = await supabase
    .from('admin_users')
    .delete()
    .eq('user_id', user_id)
  if (delErr) {
    console.error('[members DELETE] delete:', delErr)
    return res.status(500).json({ error: delErr.message })
  }
  return res.status(200).json({ ok: true, removed_user_id: user_id })
}

function buildCallbackUrl(req: NextApiRequest): string {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (req.headers['x-forwarded-proto'] && req.headers.host
      ? `${req.headers['x-forwarded-proto']}://${req.headers.host}`
      : 'http://localhost:3000')
  return `${site}/api/auth/callback?next=/admin/entities`
}
