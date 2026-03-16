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

    // Fetch contract
    const { data: contract } = await supabase
      .from('contracts')
      .select(`
        bride_groom_album_qty, bride_groom_album_size, bride_groom_album_images, bride_groom_album_cover,
        parent_albums_qty, parent_albums_size, parent_albums_images, parent_albums_cover,
        prints_30x40, prints_24x30, prints_20x24, prints_16x20, prints_16x16,
        prints_11x14, prints_8x10, prints_5x7, prints_postcard_thankyou,
        usb_dropbox_delivery, num_videographers
      `)
      .eq('couple_id', coupleId)
      .limit(1)
      .single()

    // Fetch extras orders
    const { data: extras } = await supabase
      .from('extras_orders')
      .select('album_qty, album_cover, collage_size, collage_type, wedding_frame_size, eng_portrait_size')
      .eq('couple_id', coupleId)
      .limit(1)
      .single()

    if (!contract && !extras) {
      return NextResponse.json(
        { error: 'No contract or extras found for this couple.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ contract: contract || null, extras: extras || null })
  } catch (err) {
    console.error('[GET /api/client/contract] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
