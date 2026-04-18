import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAndSendMagicLink } from '@/lib/portal/send-magic-link'

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Validate email exists in couples table
    const supabase = getAdminSupabase()
    const { data: couple } = await supabase
      .from('couples')
      .select('id, bride_first_name, groom_first_name')
      .ilike('email', normalizedEmail)
      .limit(1)

    if (!couple || couple.length === 0) {
      // Return same success message for security (but log it)
      console.log(`[Portal] Login attempt for unknown email: ${normalizedEmail}`)
      return NextResponse.json({ success: true })
    }

    const c = couple[0]
    const firstNames = [c.bride_first_name, c.groom_first_name].filter(Boolean).join(' & ') || 'there'

    const result = await generateAndSendMagicLink(normalizedEmail, firstNames)

    if (!result.success) {
      console.error('[Portal] Failed to send magic link:', result.error)
      // Still return success to user (don't leak errors)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Portal] send-magic-link route error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
