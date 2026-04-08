import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Show ID → Lead Source mapping
const SHOW_ID_TO_LEAD_SOURCE: Record<string, string> = {
  'modern-feb-2026': 'MBS Winter 2026',
  'weddingring-oakville-mar-2026': 'OBS Mar 2026',
  'weddingring-newmarket-mar-2026': 'NBS Mar 2026',
  'hamilton-ring-mar-2026': 'Hamilton Ring Mar 2026',
  'referral': 'Referral',
}

function buildQuoteFields(body: any) {
  return {
    bride_first_name: body.bride_first_name,
    bride_last_name: body.bride_last_name || null,
    groom_first_name: body.groom_first_name || null,
    groom_last_name: body.groom_last_name || null,
    email: body.email || null,
    phone: body.phone || null,
    wedding_date: body.wedding_date || null,
    ceremony_venue: body.ceremony_venue || null,
    reception_venue: body.reception_venue || null,
    guest_count: body.guest_count || null,
    bridal_party_count: body.bridal_party_count || null,
    flower_girl_count: body.flower_girl_count || null,
    ring_bearer_count: body.ring_bearer_count || null,
    first_look: body.first_look ?? null,
    engagement_location: body.engagement_location || null,
    service_needs: body.service_needs || null,
    package_name: body.package_name || null,
    start_time: body.start_time || null,
    end_time: body.end_time || null,
    coverage_hours: body.coverage_hours || null,
    extra_hours: body.extra_hours || null,
    package_price: body.package_price || null,
    extra_hours_price: body.extra_hours_price || null,
    parent_albums_count: body.parent_albums_count || null,
    parent_albums_price: body.parent_albums_price || null,
    prints_included: body.prints_included || null,
    discount_type: body.discount_type || null,
    discount_value: body.discount_value || null,
    discount_amount: body.discount_amount || null,
    discount_2_amount: body.discount_2_amount || null,
    split_morning_team: body.split_morning_team ?? null,
    split_morning_team_price: body.split_morning_team_price || null,
    thank_you_card_qty: body.thank_you_card_qty || null,
    thank_you_cards_price: body.thank_you_cards_price || null,
    album_included: body.album_included ?? null,
    subtotal: body.subtotal || null,
    hst_amount: body.hst_amount || null,
    total: body.total || null,
    installments: body.installments || null,
    timeline: body.timeline || null,
    notes: body.notes || null,
    lead_source: body.lead_source || null,
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()
    const ballotId = body.ballot_id || null
    const showId = body.show_id || null

    let quoteId: string
    let isUpdate = false

    // Upsert: check if a non-converted quote already exists for this ballot
    if (ballotId) {
      const { data: existing } = await supabase
        .from('client_quotes')
        .select('id, pdf_download_count')
        .eq('ballot_id', ballotId)
        .not('status', 'in', '("converted","expired","lost")')
        .order('created_at', { ascending: false })
        .limit(1)

      const existingQuote = existing?.[0] ?? null

      if (existingQuote) {
        // UPDATE existing quote
        const { data, error } = await supabase
          .from('client_quotes')
          .update({
            ...buildQuoteFields(body),
            ballot_id: ballotId,
            pdf_downloaded_at: new Date().toISOString(),
            pdf_download_count: (existingQuote.pdf_download_count || 0) + 1,
          })
          .eq('id', existingQuote.id)
          .select('id')
          .limit(1)

        if (error) {
          console.error('[POST /api/client/quotes] Update failed:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        quoteId = data?.[0]?.id
        isUpdate = true
      } else {
        // INSERT new quote
        const { data, error } = await supabase
          .from('client_quotes')
          .insert({
            ...buildQuoteFields(body),
            ballot_id: ballotId,
            pdf_downloaded_at: new Date().toISOString(),
            pdf_download_count: 1,
            status: 'sent',
          })
          .select('id')
          .limit(1)

        if (error) {
          console.error('[POST /api/client/quotes] Insert failed:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        quoteId = data?.[0]?.id
      }
    } else {
      // No ballot — simple insert (legacy path)
      const { data, error } = await supabase
        .from('client_quotes')
        .insert({
          ...buildQuoteFields(body),
          pdf_downloaded_at: new Date().toISOString(),
          pdf_download_count: 1,
          status: 'sent',
        })
        .select('id')
        .limit(1)

      if (error) {
        console.error('[POST /api/client/quotes] Insert failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      quoteId = data?.[0]?.id
    }

    if (!quoteId) {
      return NextResponse.json({ error: 'Failed to save quote' }, { status: 500 })
    }

    // Secondary: create/update sales_meetings (best effort)
    let salesMeetingId: number | null = null
    try {
      // Check if a sales_meetings row already exists for this quote
      const { data: existingMeeting } = await supabase
        .from('sales_meetings')
        .select('id')
        .eq('client_quote_id', quoteId)
        .limit(1)

      const meeting = existingMeeting?.[0] ?? null

      if (meeting) {
        // Update quoted_amount only
        await supabase
          .from('sales_meetings')
          .update({ quoted_amount: body.total || null, updated_at: new Date().toISOString() })
          .eq('id', meeting.id)
        salesMeetingId = meeting.id
      } else {
        // Get next meeting number
        const { data: maxRow } = await supabase
          .from('sales_meetings')
          .select('meeting_num')
          .order('meeting_num', { ascending: false })
          .limit(1)

        const nextNum = ((maxRow?.[0]?.meeting_num) || 0) + 1

        // Derive lead source
        let leadSource = body.lead_source || 'Direct'
        if (showId && SHOW_ID_TO_LEAD_SOURCE[showId]) {
          leadSource = SHOW_ID_TO_LEAD_SOURCE[showId]
        } else if (showId) {
          leadSource = showId
        }

        // Get current date in Toronto timezone
        const torontoDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })

        const { data: newMeeting, error: meetingError } = await supabase
          .from('sales_meetings')
          .insert({
            meeting_num: nextNum,
            bride_name: (body.bride_first_name || '').trim(),
            groom_name: (body.groom_first_name || '').trim(),
            wedding_date: body.wedding_date || null,
            service_needs: body.service_needs || null,
            lead_source: leadSource,
            appt_date: torontoDate,
            quoted_amount: body.total || null,
            status: 'Pending',
            ballot_id: ballotId,
            client_quote_id: quoteId,
          })
          .select('id')
          .limit(1)

        if (meetingError) {
          console.error('[POST /api/client/quotes] Failed to create sales_meeting:', meetingError)
        } else {
          salesMeetingId = newMeeting?.[0]?.id ?? null
        }
      }

      // Link sales_meeting_id back to client_quotes
      if (salesMeetingId) {
        await supabase
          .from('client_quotes')
          .update({ sales_meeting_id: salesMeetingId })
          .eq('id', quoteId)
      }
    } catch (err) {
      console.error('[POST /api/client/quotes] sales_meetings error:', err)
    }

    // Secondary: update ballot status (best effort)
    if (ballotId) {
      try {
        await supabase
          .from('ballots')
          .update({ status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', ballotId)
          .not('status', 'in', '("booked","dead","failed")')
      } catch (err) {
        console.error('[POST /api/client/quotes] Failed to update ballot status:', err)
      }
    }

    return NextResponse.json({ id: quoteId, isUpdate, salesMeetingId })
  } catch (err) {
    console.error('[POST /api/client/quotes] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('client_quotes')
      .update({
        ...buildQuoteFields(body),
        pdf_downloaded_at: new Date().toISOString(),
        pdf_download_count: body.pdf_download_count || 1,
      })
      .eq('id', body.id)
      .select('id')
      .limit(1)

    if (error) {
      console.error('[PATCH /api/client/quotes] Update failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data?.[0]?.id })
  } catch (err) {
    console.error('[PATCH /api/client/quotes] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
