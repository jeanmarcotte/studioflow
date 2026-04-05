import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  // Validate API key
  const apiKey = request.headers.get('x-api-key')
  if (apiKey !== process.env.INBOUND_WEBHOOK_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { bride_name, email, phone, wedding_date, venue, message } = body

  if (!bride_name || (!email && !phone)) {
    return NextResponse.json({ error: 'bride_name and email or phone required' }, { status: 400 })
  }

  // Parse names
  const parts = (bride_name || '').trim().split(' ')
  const bride_first = parts[0] || ''
  const bride_last = parts.slice(1).join(' ') || ''

  // Find website lead source
  const { data: sourceData } = await supabase
    .from('lead_sources')
    .select('id')
    .eq('slug', 'website')
    .limit(1)

  const websiteSourceId = sourceData?.[0]?.id || null

  // Insert ballot
  const { data: ballot, error } = await supabase
    .from('ballots')
    .insert({
      bride_first_name: bride_first,
      bride_last_name: bride_last,
      email: email || null,
      cell_phone: phone || null,
      wedding_date: wedding_date || null,
      venue_name: venue || null,
      notes: message || null,
      status: 'new',
      inbound_channel: 'website',
      lead_source_id: websiteSourceId,
      lead_source_date: new Date().toISOString().split('T')[0],
    })
    .select('id, entity_id')
    .limit(1)

  if (error) {
    console.error('Inbound webhook error:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  const newBallot = ballot?.[0]

  // Log event
  if (newBallot?.entity_id) {
    await supabase.from('entity_events').insert({
      entity_id: newBallot.entity_id,
      event_type: 'created',
      event_data: { source: 'website', inbound: true, bride_name, email },
      created_by: 'webhook',
    })
  }

  return NextResponse.json({ success: true, ballot_id: newBallot?.id })
}
