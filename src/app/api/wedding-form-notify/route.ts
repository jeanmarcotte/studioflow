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

  const [{ data: forms, error }, { data: contracts }] = await Promise.all([
    supabase.from('wedding_day_forms').select('*, couples!inner(couple_name, wedding_date, package_type)'),
    supabase.from('contracts').select('couple_id, start_time, end_time'),
  ])

  if (error || !forms) {
    return NextResponse.json({ error: error?.message || 'No forms found' }, { status: 500 })
  }

  const contractMap = new Map<string, { start_time: string | null; end_time: string | null }>()
  if (contracts) {
    for (const c of contracts) {
      contractMap.set(c.couple_id, { start_time: c.start_time, end_time: c.end_time })
    }
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
      contract: contractMap.get(row.couple_id) ?? null,
    })
    results.push({ coupleName: couple.couple_name, success: result.success, error: result.error })
  }

  return NextResponse.json({
    sent: results.length,
    results,
  })
}
