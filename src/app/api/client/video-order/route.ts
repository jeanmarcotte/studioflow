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
      .from('video_orders')
      .insert({
        couple_id: body.couple_id,
        songs: body.songs || null,
        song_placements: body.song_placements || null,
        must_have_moments: body.must_have_moments || null,
        recap_style: body.recap_style || null,
        include_vows: body.include_vows ?? null,
        submitted_by_email: body.submitted_by_email || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[POST /api/client/video-order] Insert failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('[POST /api/client/video-order] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
