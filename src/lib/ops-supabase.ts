import { createClient } from '@supabase/supabase-js'

// Ops Dashboard Supabase — server-side only (no NEXT_PUBLIC_ prefix)
// Use via API route, not directly in client components
export const opsSupabase = createClient(
  process.env.PERSONAL_SUPABASE_URL!,
  process.env.PERSONAL_SUPABASE_ANON_KEY!
)
