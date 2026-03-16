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
        selections_status: body.selections_status,
        needs_dropbox_link: body.needs_dropbox_link || false,
        album_cover_text: body.album_cover_text || null,
        cover_style: body.cover_style || null,
        print_instructions: body.print_instructions || null,
        additional_notes: body.additional_notes || null,
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
