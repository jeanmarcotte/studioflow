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
    .from('ballots')
    .select('id,bride_first_name,bride_last_name,groom_first_name,groom_last_name,wedding_date,venue_name,show_id,created_at,service_needs,has_videographer')
    .eq('status', 'appointment')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
