import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('sales_meetings')
    .select('id, meeting_num, bride_name, groom_name, wedding_date, service_needs, lead_source, appt_date, quoted_amount, status, client_quote_id')
    .order('meeting_num', { ascending: false })

  if (error) {
    console.error('[GET /api/admin/sales-meetings] Query failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json()
    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { error } = await supabase
      .from('sales_meetings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('[PATCH /api/admin/sales-meetings] Update failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/admin/sales-meetings] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
