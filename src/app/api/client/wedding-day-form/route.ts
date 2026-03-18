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
    const coupleId = searchParams.get('couple_id')

    if (!coupleId) {
      return NextResponse.json({ error: 'couple_id is required' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('wedding_day_forms')
      .select('*')
      .eq('couple_id', coupleId)
      .single()

    if (error && error.code === 'PGRST116') {
      // No rows returned
      return NextResponse.json({ exists: false })
    }

    if (error) {
      console.error('[GET /api/client/wedding-day-form] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ exists: true, data })
  } catch (err) {
    console.error('[GET /api/client/wedding-day-form] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
