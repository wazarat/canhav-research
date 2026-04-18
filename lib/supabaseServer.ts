import type { NextApiRequest, NextApiResponse } from 'next'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase clients for three different Next.js runtimes:
 *
 *   * createSupabaseMiddlewareClient(req, res) — for middleware.ts. Reads
 *     cookies from the NextRequest and writes any refreshed-session
 *     cookies back onto the NextResponse so the next handler sees them.
 *   * createSupabaseApiClient(req, res) — for /pages/api/* routes. Uses
 *     req.cookies (parsed by Next) for reads and writes Set-Cookie headers
 *     on res for writes. Also used by pages that export
 *     getServerSideProps.
 *   * createSupabaseServerClientFromCookies — no-op helper for read-only
 *     server calls where we don't need to mutate cookies (e.g. getUser()
 *     in an API handler where we don't care about session refresh).
 *
 * All three read the same NEXT_PUBLIC_ETHDATA_SUPABASE_* env vars so the
 * client/server pair uses matching URLs and anon keys; cookies written by
 * getSupabaseAuthBrowser() on the client are picked up by these helpers.
 *
 * For data writes that need to bypass RLS we keep using
 * lib/supabaseNew.ts#getSupabaseAdmin which is built from the service-role
 * key. Auth helpers here are only for reading the caller's session.
 */

function envOrThrow(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_ETHDATA_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_ETHDATA_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'Supabase auth env missing: set NEXT_PUBLIC_ETHDATA_SUPABASE_URL and NEXT_PUBLIC_ETHDATA_SUPABASE_ANON_KEY'
    )
  }
  return { url, anonKey }
}

// ------------------------------------------------------------------
// Middleware (edge runtime)
// ------------------------------------------------------------------
export function createSupabaseMiddlewareClient(
  req: NextRequest,
  res: NextResponse
): SupabaseClient {
  const { url, anonKey } = envOrThrow()
  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        // Mutate both the request (so the same middleware chain reads the
        // refreshed value) and the response (so the browser stores it).
        req.cookies.set({ name, value, ...options })
        res.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        req.cookies.set({ name, value: '', ...options })
        res.cookies.set({ name, value: '', ...options, maxAge: 0 })
      },
    },
  })
}

// ------------------------------------------------------------------
// Pages-router API routes (Node runtime)
// ------------------------------------------------------------------
export function createSupabaseApiClient(
  req: NextApiRequest,
  res: NextApiResponse
): SupabaseClient {
  const { url, anonKey } = envOrThrow()
  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        const v = req.cookies?.[name]
        return typeof v === 'string' ? v : undefined
      },
      set(name: string, value: string, options: CookieOptions) {
        appendSetCookie(res, serializeCookie(name, value, options))
      },
      remove(name: string, options: CookieOptions) {
        appendSetCookie(
          res,
          serializeCookie(name, '', { ...options, maxAge: 0 })
        )
      },
    },
  })
}

// ------------------------------------------------------------------
// Cookie helpers (tiny, avoid adding `cookie` package as a dep)
// ------------------------------------------------------------------
function serializeCookie(
  name: string,
  value: string,
  opts: CookieOptions
): string {
  const parts: string[] = [`${name}=${encodeURIComponent(value)}`]
  if (opts.path) parts.push(`Path=${opts.path}`)
  else parts.push('Path=/')
  if (opts.domain) parts.push(`Domain=${opts.domain}`)
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`)
  if (opts.expires)
    parts.push(
      `Expires=${
        opts.expires instanceof Date
          ? opts.expires.toUTCString()
          : String(opts.expires)
      }`
    )
  if (opts.httpOnly) parts.push('HttpOnly')
  if (opts.secure || process.env.NODE_ENV === 'production') parts.push('Secure')
  const sameSite = opts.sameSite ?? 'lax'
  parts.push(
    `SameSite=${
      typeof sameSite === 'string'
        ? sameSite.charAt(0).toUpperCase() + sameSite.slice(1)
        : 'Lax'
    }`
  )
  return parts.join('; ')
}

function appendSetCookie(res: NextApiResponse, cookie: string) {
  const prev = res.getHeader('Set-Cookie')
  if (!prev) {
    res.setHeader('Set-Cookie', cookie)
  } else if (Array.isArray(prev)) {
    res.setHeader('Set-Cookie', [...prev, cookie])
  } else {
    res.setHeader('Set-Cookie', [String(prev), cookie])
  }
}
