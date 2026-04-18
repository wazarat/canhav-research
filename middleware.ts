import { NextRequest, NextResponse } from 'next/server'

/**
 * Edge middleware that gates /admin/* pages and /api/admin/* routes behind
 * the ADMIN_AUTH_TOKEN cookie.
 *
 *   * Unauthenticated page requests are 302'd to /admin/login (with ?next).
 *   * Unauthenticated API requests get a 401 JSON response.
 *   * The login/logout/session endpoints themselves are always open so the
 *     browser can actually sign in.
 *
 * Constant-time equality is used to avoid leaking token chars via timing.
 * The cookie is HttpOnly + SameSite=Strict (see lib/adminAuth.ts).
 */

const ADMIN_COOKIE = 'cah_admin_token'

const PUBLIC_ADMIN_PATHS = new Set<string>([
  '/admin/login',
  '/api/admin/login',
  '/api/admin/logout',
  '/api/admin/session',
])

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_ADMIN_PATHS.has(pathname)) return NextResponse.next()

  const expected = process.env.ADMIN_AUTH_TOKEN
  const got = req.cookies.get(ADMIN_COOKIE)?.value ?? ''
  const ok = !!expected && timingSafeEqual(got, expected)
  if (ok) return NextResponse.next()

  // API: JSON 401. Pages: redirect to login with ?next=<original>.
  if (pathname.startsWith('/api/admin/')) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    )
  }

  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = '/admin/login'
  loginUrl.searchParams.set('next', pathname + (req.nextUrl.search ?? ''))
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
