import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/crew/login?error=no_code`)
  }

  // Build the redirect response first — cookies get written onto this
  const response = NextResponse.redirect(`${origin}/crew/dashboard`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'crew-auth',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/crew/login?error=auth_failed`)
  }

  // Check if user email exists in team_members as active
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: member } = await adminSupabase
    .from('team_members')
    .select('id, is_active')
    .eq('email', data.user.email!)
    .eq('is_active', true)
    .limit(1)

  if (!member || member.length === 0) {
    await supabase.auth.signOut()
    const errorResponse = NextResponse.redirect(`${origin}/crew/login?error=unauthorized`)
    response.cookies.getAll().forEach((cookie) => {
      errorResponse.cookies.set(cookie.name, cookie.value)
    })
    return errorResponse
  }

  // Update auth_user_id and last_login_at
  await adminSupabase
    .from('team_members')
    .update({
      auth_user_id: data.user.id,
      last_login_at: new Date().toISOString(),
    })
    .eq('id', member[0].id)

  // Carry session cookies onto the success redirect
  return response
}
