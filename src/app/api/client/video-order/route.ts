import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendFormNotification } from '@/lib/email'

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
        let_jean_choose_music: body.let_jean_choose_music || false,
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

    // Send email notification (non-blocking)
    if (body.couple_id) {
      Promise.resolve(
        supabase
          .from('couples')
          .select('couple_name, wedding_date')
          .eq('id', body.couple_id)
          .single()
      ).then(({ data: couple }) => {
        if (couple) {
          sendFormNotification({
            formType: 'video-order',
            coupleName: couple.couple_name || 'Unknown',
            weddingDate: couple.wedding_date || 'TBD',
          }).catch(console.error)
        }
      }).catch(console.error)
    }

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('[POST /api/client/video-order] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
