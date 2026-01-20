import type { SupabaseClient } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from './supabase/browser'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.')
}

// Client-side Supabase client (for use in client components)
// Returns a singleton instance to avoid multiple GoTrueClient instances
export function createClientSupabase(): SupabaseClient {
  return createBrowserSupabaseClient()
}

// Legacy client export for backward compatibility (uses same singleton)
export const supabase = createClientSupabase()

