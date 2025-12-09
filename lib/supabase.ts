import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type CompanySubmission = {
  id?: string
  yourEmail: string
  companyName: string
  website: string
  description: string
  sector: string
  subsector: string
  pointOfContact: string
  created_at?: string
}
