import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { bride_first_name, wedding_date, cell_phone } = body
    if (!bride_first_name || !wedding_date || !cell_phone) {
      return NextResponse.json(
        { error: 'Missing required fields: bride_first_name, wedding_date, cell_phone' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('ballots')
      .insert([{
        bride_first_name: body.bride_first_name,
        bride_last_name: body.bride_last_name || null,
        groom_first_name: body.groom_first_name || null,
        groom_last_name: body.groom_last_name || null,
        wedding_date: body.wedding_date,
        cell_phone: body.cell_phone,
        email: body.email || null,
        venue_name: body.venue_name || null,
        guest_count: body.guest_count ? parseInt(body.guest_count) : null,
        has_photographer: body.has_photographer ?? false,
        has_videographer: body.has_videographer ?? false,
        has_venue: body.has_venue ?? false,
        entry_method: body.entry_method || 'web',
        show_id: body.show_id || null,
        status: 'new',
        created_at: new Date().toISOString(),
      }])
      .select()

    if (error) {
      console.error('Ballot insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Ballot submit error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
