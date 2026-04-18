import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseMiddlewareClient } from './lib/supabaseServer'

/**
 * Edge middleware — two gate tiers:
 *
 *   (a) Admin tier  — /admin/*, /api/admin/*
 *       Requires Supabase session  AND  public.admin_users membership.
 *       Failure modes:
 *         * unauth page  -> 302 /admin/login?next=...
 *         * unauth API   -> 401 JSON
 *         * auth non-admin page -> 302 /admin/forbidden
 *         * auth non-admin API  -> 403 JSON
 *
 *   (b) Viewer tier — /company/*
 *       Requires any Supabase session. Admin lookup is skipped. Unauth
 *       page visits redirect to /login?next=... . The market-map /drawer
 *       stays public (the drawer is rendered inside /market-map, not
 *       /company/*).
 *
 * /admin/login, /admin/forbidden, and /login are always public.
 *
 * Auth / role checks are ALSO re-done in every handler via
 * lib/adminAuth.ts#requireAdmin and lib/viewerAuth.ts#requireViewer so a
 * misconfigured matcher can never be the only line of defence.
 */

const PUBLIC_PATHS = new Set<string>([
  '/admin/login',
  '/admin/forbidden',
  '/login',
])

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/')
}

function isViewerPath(pathname: string): boolean {
  return pathname.startsWith('/company/')
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next()

  const needsAdmin = isAdminPath(pathname)
  const needsViewer = isViewerPath(pathname)
  if (!needsAdmin && !needsViewer) return NextResponse.next()

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

      if (needsAdmin) {
        const { data } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()
        isAdmin = !!data
      }
    }
  } catch (err) {
    // Env missing or Supabase unreachable — treat as unauthenticated and
    // let the request fall through to the normal redirect flow.
    console.error('[middleware] auth check failed:', err)
  }

  // ---- Viewer tier: any session is enough ---------------------------
  if (needsViewer) {
    if (isAuthed) return res
    const redirect = req.nextUrl.clone()
    redirect.pathname = '/login'
    redirect.searchParams.set('next', pathname + (req.nextUrl.search ?? ''))
    const out = NextResponse.redirect(redirect)
    res.cookies.getAll().forEach((c) => out.cookies.set(c))
    return out
  }

  // ---- Admin tier: session + allow-list ------------------------------
  if (isAuthed && isAdmin) return res

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

  const redirect = req.nextUrl.clone()
  if (isAuthed) {
    redirect.pathname = '/admin/forbidden'
  } else {
    redirect.pathname = '/admin/login'
    redirect.searchParams.set('next', pathname + (req.nextUrl.search ?? ''))
  }
  const out = NextResponse.redirect(redirect)
  res.cookies.getAll().forEach((c) => out.cookies.set(c))
  return out
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/company/:path*'],
}
