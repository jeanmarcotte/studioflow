import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — Meta webhook verification
export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// POST — Meta lead data (placeholder — requires Meta app review)
export async function POST(request: Request) {
  const body = await request.json()

  // Log incoming data for development
  console.log('[Meta Webhook] Incoming payload:', JSON.stringify(body).slice(0, 500))

  // Find instagram/facebook source
  const channel = body?.entry?.[0]?.changes?.[0]?.value?.page_id ? 'facebook_dm' : 'instagram_dm'

  const { data: sourceData } = await supabase
    .from('lead_sources')
    .select('id')
    .eq('source_type', channel)
    .limit(1)

  const sourceId = sourceData?.[0]?.id || null

  // Process each lead entry
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === 'leadgen') {
        const leadData = change.value

        // Insert minimal ballot with what we have
        await supabase.from('ballots').insert({
          status: 'new',
          inbound_channel: channel,
          lead_source_id: sourceId,
          lead_source_date: new Date().toISOString().split('T')[0],
          notes: `Meta lead ID: ${leadData?.leadgen_id || 'unknown'}. Raw data logged — fetch full details via Meta API.`,
        })
      }
    }
  }

  return NextResponse.json({ success: true })
}
