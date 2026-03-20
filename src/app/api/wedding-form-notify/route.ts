import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTeamWeddingDayNotification } from '@/lib/email'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST() {
  const supabase = getServiceClient()

  const { data: forms, error } = await supabase
    .from('wedding_day_forms')
    .select('*, couples!inner(couple_name, wedding_date, package_type)')

  if (error || !forms) {
    return NextResponse.json({ error: error?.message || 'No forms found' }, { status: 500 })
  }

  const results: { coupleName: string; success: boolean; error?: unknown }[] = []

  for (const row of forms) {
    const couple = (row as Record<string, unknown>).couples as { couple_name: string; wedding_date: string; package_type: string | null }
    const result = await sendTeamWeddingDayNotification({
      coupleId: row.couple_id,
      coupleName: couple.couple_name,
      weddingDate: couple.wedding_date,
      packageType: couple.package_type,
      form: row,
    })
    results.push({ coupleName: couple.couple_name, success: result.success, error: result.error })
  }

  return NextResponse.json({
    sent: results.length,
    results,
  })
}
