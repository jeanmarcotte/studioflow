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
    const { wedding_date, first_name, email } = body

    if (!wedding_date || !first_name || !email) {
      return NextResponse.json(
        { error: 'Wedding date, first name, and email are required' },
        { status: 400 }
      )
    }

    const supabase = getServiceClient()
    const name = first_name.trim()
    const emailLower = email.trim()

    // Try bride first name
    const { data: brideMatch } = await supabase
      .from('couples')
      .select('id, couple_name, bride_first_name, groom_first_name, wedding_date, reception_venue, email')
      .eq('wedding_date', wedding_date)
      .ilike('bride_first_name', name)
      .ilike('email', emailLower)
      .limit(1)
      .single()

    if (brideMatch) {
      return NextResponse.json({ couple: brideMatch })
    }

    // Try groom first name
    const { data: groomMatch } = await supabase
      .from('couples')
      .select('id, couple_name, bride_first_name, groom_first_name, wedding_date, reception_venue, email')
      .eq('wedding_date', wedding_date)
      .ilike('groom_first_name', name)
      .ilike('email', emailLower)
      .limit(1)
      .single()

    if (groomMatch) {
      return NextResponse.json({ couple: groomMatch })
    }

    return NextResponse.json(
      { error: 'No matching wedding found. Please check your details and try again.' },
      { status: 404 }
    )
  } catch (err) {
    console.error('[POST /api/client/lookup-couple] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
