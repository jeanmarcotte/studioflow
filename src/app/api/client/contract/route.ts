import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const coupleId = searchParams.get('coupleId')

    if (!coupleId) {
      return NextResponse.json({ error: 'coupleId is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('contracts')
      .select(`
        parent_albums_qty, parent_albums_size, parent_albums_cover,
        parent_albums_spreads, parent_albums_images,
        bride_groom_album_qty, bride_groom_album_size, bride_groom_album_cover,
        bride_groom_album_spreads, bride_groom_album_images,
        prints_16x20, prints_11x14, prints_8x10, prints_5x7, prints_postcard_thankyou,
        engagement_session, engagement_location, usb_dropbox_delivery
      `)
      .eq('couple_id', coupleId)
      .limit(1)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'No contract found for this couple.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ contract: data })
  } catch (err) {
    console.error('[GET /api/client/contract] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
