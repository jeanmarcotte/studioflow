import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(request: Request) {
  const { pin } = await request.json()
  if (!pin || typeof pin !== 'string' || pin.length !== 4) {
    return NextResponse.json({ ok: false, error: 'Invalid PIN' }, { status: 400 })
  }

  const pinHash = await hashPin(pin)

  const { data, error } = await supabase
    .from('team_members')
    .select('id, first_name, last_name, role')
    .eq('pin_hash', pinHash)
    .limit(1)

  if (error || !data || data.length === 0) {
    return NextResponse.json({ ok: false, error: 'Wrong PIN' }, { status: 401 })
  }

  const member = data[0]

  const response = NextResponse.json({
    ok: true,
    member: { id: member.id, name: `${member.first_name} ${member.last_name}`, role: member.role },
  })

  // Set session cookie — 30 days, httpOnly
  response.cookies.set('bridalflow_pin_session', JSON.stringify({
    team_member_id: member.id,
    name: `${member.first_name} ${member.last_name}`,
    role: member.role,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  })

  return response
}
