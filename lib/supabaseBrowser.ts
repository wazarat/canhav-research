import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

/**
 * Two browser-side Supabase clients. They look similar but serve different
 * jobs — we keep them separate so Realtime doesn't care about auth and auth
 * doesn't care about Realtime.
 *
 *   getSupabaseBrowser()       — anon, no auth, used ONLY for postgres_changes
 *                                subscriptions (see useRealtimeTables).
 *   getSupabaseAuthBrowser()   — session-aware client backed by cookies
 *                                (via @supabase/ssr) used for sign-in, sign-
 *                                out, OAuth redirects, and reading
 *                                supabase.auth.getUser() in client
 *                                components. Cookies are shared with the
 *                                server-side helpers in lib/supabaseServer.ts
 *                                so middleware can see the session.
 *
 * Both read the same NEXT_PUBLIC_ETHDATA_SUPABASE_* env vars, so a single
 * set of creds configures everything.
 */

const url = process.env.NEXT_PUBLIC_ETHDATA_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_ETHDATA_SUPABASE_ANON_KEY

// ------------------------------------------------------------------
// Realtime client (no auth). Singleton — avoids multiple websockets.
// ------------------------------------------------------------------
let realtimeClient: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  if (!url || !anonKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[supabaseBrowser] NEXT_PUBLIC_ETHDATA_SUPABASE_URL / _ANON_KEY not set — Realtime disabled.'
      )
    }
    return null
  }
  if (realtimeClient) return realtimeClient
  realtimeClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 5 } },
  })
  return realtimeClient
}

// ------------------------------------------------------------------
// Auth client (session cookies). Singleton so Supabase's internal auth
// state listener is set up once per tab.
// ------------------------------------------------------------------
let authClient: SupabaseClient | null = null

export function getSupabaseAuthBrowser(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  if (!url || !anonKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[supabaseAuthBrowser] NEXT_PUBLIC_ETHDATA_SUPABASE_* not set — auth disabled.'
      )
    }
    return null
  }
  if (authClient) return authClient
  authClient = createBrowserClient(url, anonKey)
  return authClient
}
