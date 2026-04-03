import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ballotId = searchParams.get('ballot_id')

    if (!ballotId) {
      return NextResponse.json({ error: 'ballot_id is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('ballots')
      .select(
        'id, bride_first_name, bride_last_name, groom_first_name, groom_last_name, email, cell_phone, wedding_date, venue_name, guest_count, service_needs, show_id'
      )
      .eq('id', ballotId)
      .limit(1)

    if (error) {
      console.error('[GET /api/client/quotes/prefill] Query failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const ballot = data?.[0] ?? null

    if (!ballot) {
      return NextResponse.json({ error: 'Ballot not found' }, { status: 404 })
    }

    return NextResponse.json(ballot)
  } catch (err) {
    console.error('[GET /api/client/quotes/prefill] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
