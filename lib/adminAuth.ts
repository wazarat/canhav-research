import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Minimal shared-secret admin auth for the /admin/entities editorial tool.
 *
 * The cookie is a straight HttpOnly copy of ADMIN_AUTH_TOKEN (not a JWT): the
 * secret is an internal-only value and the cookie is SameSite=Strict + Secure
 * in production so it's safe from XSS exfil and CSRF. A constant-time
 * comparison is used to avoid leaking token characters via timing.
 *
 * Env vars (server only — NEVER prefix with NEXT_PUBLIC_):
 *   ADMIN_AUTH_TOKEN   - the shared secret an editor enters on /admin/login
 */

export const ADMIN_COOKIE = 'cah_admin_token'
export const EDITOR_COOKIE = 'cah_admin_editor'

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/** Read a cookie value from a Next.js API request (uses req.cookies). */
function readCookie(req: NextApiRequest, name: string): string | null {
  const v = req.cookies?.[name]
  return typeof v === 'string' && v.length > 0 ? v : null
}

/** Return true iff the caller presented the admin token cookie. */
export function isAuthed(req: NextApiRequest): boolean {
  const expected = process.env.ADMIN_AUTH_TOKEN
  if (!expected) return false
  const got = readCookie(req, ADMIN_COOKIE)
  if (!got) return false
  return timingSafeEqual(got, expected)
}

/** Read the editor display name (non-secret, set alongside the token cookie). */
export function getEditorName(req: NextApiRequest): string | null {
  return readCookie(req, EDITOR_COOKIE)
}

/**
 * Gate an admin API route. Returns true if authorised; otherwise writes a
 * 401 to `res` and returns false. Callers should `return` immediately on
 * false.
 */
export function requireAdmin(req: NextApiRequest, res: NextApiResponse): boolean {
  if (isAuthed(req)) return true
  res.status(401).json({ error: 'Unauthorized' })
  return false
}

/** Serialize a Set-Cookie header value. */
export function buildCookie(
  name: string,
  value: string,
  opts: {
    httpOnly?: boolean
    maxAgeSeconds?: number
    expires?: Date | null
    path?: string
  } = {}
): string {
  const parts: string[] = [`${name}=${encodeURIComponent(value)}`]
  parts.push(`Path=${opts.path ?? '/'}`)
  parts.push(`SameSite=Strict`)
  if (opts.httpOnly !== false) parts.push('HttpOnly')
  if (process.env.NODE_ENV === 'production') parts.push('Secure')
  if (opts.maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${opts.maxAgeSeconds}`)
  }
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`)
  return parts.join('; ')
}

export function buildLoginCookies(token: string, editorName: string): string[] {
  return [
    buildCookie(ADMIN_COOKIE, token, {
      httpOnly: true,
      maxAgeSeconds: SEVEN_DAYS_SECONDS,
    }),
    // Editor name is NOT a secret — the UI reads it client-side to show
    // "Signed in as <name>", so HttpOnly is off here.
    buildCookie(EDITOR_COOKIE, editorName, {
      httpOnly: false,
      maxAgeSeconds: SEVEN_DAYS_SECONDS,
    }),
  ]
}

export function buildLogoutCookies(): string[] {
  const past = new Date(0)
  return [
    buildCookie(ADMIN_COOKIE, '', { httpOnly: true, maxAgeSeconds: 0, expires: past }),
    buildCookie(EDITOR_COOKIE, '', { httpOnly: false, maxAgeSeconds: 0, expires: past }),
  ]
}
