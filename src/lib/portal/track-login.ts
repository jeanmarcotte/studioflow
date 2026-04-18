import { createClient } from '@supabase/supabase-js'

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function trackLogin(coupleId: string) {
  const supabase = getAdminSupabase()
  const now = new Date().toISOString()

  // Set portal_first_login_at only if null
  await supabase
    .from('couples')
    .update({ portal_first_login_at: now })
    .eq('id', coupleId)
    .is('portal_first_login_at', null)

  // Always update portal_last_login_at
  await supabase
    .from('couples')
    .update({ portal_last_login_at: now })
    .eq('id', coupleId)
}
