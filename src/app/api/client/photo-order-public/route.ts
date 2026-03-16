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

    // Try to match couple by wedding_date + bride or groom name
    let coupleId: string | null = null
    if (body.wedding_date && (body.bride_name || body.groom_name)) {
      if (body.bride_name) {
        const { data: brideMatch } = await supabase
          .from('couples')
          .select('id')
          .eq('wedding_date', body.wedding_date)
          .ilike('bride_first_name', body.bride_name.trim())
          .limit(1)
          .single()
        if (brideMatch) coupleId = brideMatch.id
      }
      if (!coupleId && body.groom_name) {
        const { data: groomMatch } = await supabase
          .from('couples')
          .select('id')
          .eq('wedding_date', body.wedding_date)
          .ilike('groom_first_name', body.groom_name.trim())
          .limit(1)
          .single()
        if (groomMatch) coupleId = groomMatch.id
      }
    }

    const { data, error } = await supabase
      .from('photo_orders')
      .insert({
        couple_id: coupleId,
        bride_name: body.bride_name || null,
        groom_name: body.groom_name || null,
        wedding_date_input: body.wedding_date || null,
        email_input: body.email || null,
        has_wedding_album: body.has_wedding_album || null,
        album_design_preference: body.album_design_preference || null,
        cover_photo_filename: body.cover_photo_filename || null,
        main_album_photos: body.main_album_photos || null,
        num_parent_albums: body.num_parent_albums ?? null,
        parent_album_1_photos: body.parent_album_1_photos || null,
        parent_album_2_photos: body.parent_album_2_photos || null,
        parent_album_3_photos: body.parent_album_3_photos || null,
        parent_album_4_photos: body.parent_album_4_photos || null,
        portrait_prints: body.portrait_prints || null,
        thank_you_cards: body.thank_you_cards ?? null,
        thank_you_cards_qty: body.thank_you_cards_qty ?? null,
        canvas_upgrade_notes: body.canvas_upgrade_notes || null,
        special_instructions: body.special_instructions || null,
        submitted_by_email: body.email || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[POST /api/client/photo-order-public] Insert failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id, matched: !!coupleId })
  } catch (err) {
    console.error('[POST /api/client/photo-order-public] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
