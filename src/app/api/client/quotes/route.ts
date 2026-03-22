import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('client_quotes')
      .insert({
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
        subtotal: body.subtotal || null,
        hst_amount: body.hst_amount || null,
        total: body.total || null,
        installments: body.installments || null,
        timeline: body.timeline || null,
        notes: body.notes || null,
        lead_source: body.lead_source || null,
        ballot_id: body.ballot_id || null,
        sales_meeting_id: body.sales_meeting_id || null,
        pdf_downloaded_at: new Date().toISOString(),
        pdf_download_count: 1,
        status: 'sent',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[POST /api/client/quotes] Insert failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('[POST /api/client/quotes] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
