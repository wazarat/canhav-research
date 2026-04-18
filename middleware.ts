import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseMiddlewareClient } from './lib/supabaseServer'

/**
 * Edge middleware that gates /admin/* pages and /api/admin/* routes.
 *
 * Auth model (replaces the old ADMIN_AUTH_TOKEN shared-secret):
 *   1. Read the Supabase session cookie via @supabase/ssr. If missing or
 *      invalid, treat as unauthenticated.
 *   2. If authenticated, look the user up in public.admin_users using the
 *      anon client — RLS on admin_users allows authenticated users to
 *      read (see migration 008), so this works without service-role.
 *   3. Gatekeeping:
 *        * /admin/login, /admin/forbidden, and the /api/admin/members
 *          session probes are always public.
 *        * /admin/* unauthenticated -> 302 /admin/login?next=...
 *        * /admin/* authenticated but not admin -> 302 /admin/forbidden
 *        * /api/admin/* unauthenticated -> 401 JSON
 *        * /api/admin/* authenticated but not admin -> 403 JSON
 *
 * The final auth / role check is ALWAYS re-done in the API handlers via
 * lib/adminAuth.ts#requireAdmin so a misconfigured matcher can never be
 * the only line of defence.
 */

const PUBLIC_PATHS = new Set<string>([
  '/admin/login',
  '/admin/forbidden',
])

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next()

  // Pre-build the response so the Supabase SSR helper can attach refreshed
  // cookies to it. If we end up redirecting we copy the cookies onto the
  // redirect response so the browser persists them.
  const res = NextResponse.next()

  let isAuthed = false
  let isAdmin = false
  let userId: string | null = null

  try {
    const supabase = createSupabaseMiddlewareClient(req, res)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.id) {
      isAuthed = true
      userId = user.id
      const { data } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      isAdmin = !!data
    }
  } catch (err) {
    // Env missing or Supabase unreachable — treat as unauthenticated and
    // let the request fall through to the normal redirect flow.
    console.error('[middleware] auth check failed:', err)
  }

  if (isAuthed && isAdmin) return res

  // --- Deny paths ---
  if (pathname.startsWith('/api/admin/')) {
    return new NextResponse(
      JSON.stringify({
        error: isAuthed ? 'Not authorised for admin tools' : 'Not signed in',
        userId,
      }),
      {
        status: isAuthed ? 403 : 401,
        headers: { 'content-type': 'application/json' },
      }
    )
  }

  // Pages
  const redirect = req.nextUrl.clone()
  if (isAuthed) {
    redirect.pathname = '/admin/forbidden'
  } else {
    redirect.pathname = '/admin/login'
    redirect.searchParams.set('next', pathname + (req.nextUrl.search ?? ''))
  }
  const out = NextResponse.redirect(redirect)
  // Preserve any refreshed-session cookies on the redirect response.
  res.cookies.getAll().forEach((c) => out.cookies.set(c))
  return out
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
