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
      // Try bride match
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

      // Try groom match if no bride match
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
      .from('video_orders')
      .insert({
        couple_id: coupleId,
        bride_name: body.bride_name || null,
        groom_name: body.groom_name || null,
        wedding_date_input: body.wedding_date || null,
        email_input: body.email || null,
        let_jean_choose_music: body.let_jean_choose_music || false,
        songs: body.songs || null,
        song_placements: body.song_placements || null,
        must_have_moments: body.must_have_moments || null,
        recap_style: body.recap_style || null,
        include_vows: body.include_vows ?? null,
        submitted_by_email: body.email || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[POST /api/client/video-order-public] Insert failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id, matched: !!coupleId })
  } catch (err) {
    console.error('[POST /api/client/video-order-public] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
