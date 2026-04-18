import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Browser-side Supabase client (anon key) used for Realtime subscriptions.
 *
 * The API routes do all DB reads with the service-role key; this client only
 * exists so the browser can open a websocket to `supabase_realtime` and get
 * push notifications when the DB changes. The anon key is safe to ship to
 * the browser — it's gated by RLS (the eth-data project is read-only for
 * anon by design).
 *
 * Must use NEXT_PUBLIC_* so Next.js inlines the values at build time; the
 * older NEW_NEXT_PUBLIC_* vars are server-only because of the leading
 * `NEW_` prefix.
 */

const url = process.env.NEXT_PUBLIC_ETHDATA_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_ETHDATA_SUPABASE_ANON_KEY

// Module-level singleton so we don't open multiple websockets per tab.
let client: SupabaseClient | null = null

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
  if (client) return client
  client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 5 } },
  })
  return client
}
