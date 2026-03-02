import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('appointment_statuses')
    .select('appointment_num, status')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const statuses: Record<number, string> = {}
  for (const row of data || []) {
    statuses[row.appointment_num] = row.status
  }

  return NextResponse.json({ statuses })
}

export async function POST(req: NextRequest) {
  const { appointmentNum, status } = await req.json()

  if (!appointmentNum || !status) {
    return NextResponse.json({ error: 'Missing appointmentNum or status' }, { status: 400 })
  }

  if (!['Booked', 'Failed', 'Pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('appointment_statuses')
    .upsert(
      { appointment_num: appointmentNum, status, updated_at: new Date().toISOString() },
      { onConflict: 'appointment_num' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
