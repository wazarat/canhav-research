import { createClient } from '@supabase/supabase-js'

// New Supabase client (eth-data project) — client-side (anon key)
const supabaseUrl = process.env.NEW_NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEW_NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabaseNew = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role key (use only in API routes)
export function getSupabaseAdmin() {
  const url = process.env.NEW_NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}
