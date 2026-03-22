import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Flatten contracts join → top-level reception_venue
function flattenCouple(row: any) {
  const { contracts, ...rest } = row
  const contract = Array.isArray(contracts) ? contracts[0] : contracts
  return { ...rest, reception_venue: contract?.reception_venue || null }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const coupleId = searchParams.get('id')

    if (!coupleId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('couples')
      .select('id, couple_name, bride_first_name, groom_first_name, wedding_date, email, contracts(reception_venue)')
      .eq('id', coupleId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    return NextResponse.json({ couple: flattenCouple(data) })
  } catch (err) {
    console.error('[GET /api/client/lookup-couple] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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
      .select('id, couple_name, bride_first_name, groom_first_name, wedding_date, email, contracts(reception_venue)')
      .eq('wedding_date', wedding_date)
      .ilike('bride_first_name', name)
      .ilike('email', emailLower)
      .limit(1)
      .single()

    if (brideMatch) {
      return NextResponse.json({ couple: flattenCouple(brideMatch) })
    }

    // Try groom first name
    const { data: groomMatch } = await supabase
      .from('couples')
      .select('id, couple_name, bride_first_name, groom_first_name, wedding_date, email, contracts(reception_venue)')
      .eq('wedding_date', wedding_date)
      .ilike('groom_first_name', name)
      .ilike('email', emailLower)
      .limit(1)
      .single()

    if (groomMatch) {
      return NextResponse.json({ couple: flattenCouple(groomMatch) })
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
