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

export async function GET(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('manual') !== 'true') {
    return new Response('Unauthorized', { status: 401 })
  }

  // Marianna's PIN: 3991
  const pinHash = await hashPin('3991')

  const { error } = await supabase
    .from('team_members')
    .update({ pin_hash: pinHash })
    .eq('id', 'aad6fc56-f8e2-4dbf-8803-093b1e066c6e')

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'Marianna PIN seeded' })
}
