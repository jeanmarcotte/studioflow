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
      .from('photo_orders')
      .insert({
        couple_id: body.couple_id,
        album_design_preference: body.album_design_preference || null,
        cover_photo_filename: body.cover_photo_filename || null,
        parent_album_1_photos: body.parent_album_1_photos || null,
        parent_album_1_notes: body.parent_album_1_notes || null,
        parent_album_2_photos: body.parent_album_2_photos || null,
        parent_album_2_notes: body.parent_album_2_notes || null,
        main_album_photos: body.main_album_photos || null,
        main_album_notes: body.main_album_notes || null,
        portrait_prints: body.portrait_prints || null,
        collage_photos: body.collage_photos || null,
        wedding_frame_photo: body.wedding_frame_photo || null,
        eng_portrait_photo: body.eng_portrait_photo || null,
        album_cover_text: body.album_cover_text || null,
        special_instructions: body.special_instructions || null,
        no_special_requests: body.no_special_requests || false,
        submitted_by_email: body.submitted_by_email || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[POST /api/client/photo-order] Insert failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('[POST /api/client/photo-order] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
