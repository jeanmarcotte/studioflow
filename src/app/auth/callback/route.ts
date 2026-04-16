import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/leads'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  // Build a response object to collect cookies from exchangeCodeForSession
  const response = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Read cookies from the incoming request
          const cookieHeader = request.headers.get('cookie') ?? ''
          return cookieHeader.split(';').filter(Boolean).map((c) => {
            const [name, ...rest] = c.trim().split('=')
            return { name, value: rest.join('=') }
          })
        },
        setAll(cookiesToSet) {
          // Write session cookies onto the response we will return
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const allowedEmails = [
    'jeanmarcotte@gmail.com',
    'marianna@sigsphoto.ca',
    'mariannakogan@gmail.com',
  ]

  if (!data.user.email || !allowedEmails.includes(data.user.email)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=unauthorized`)
  }

  // response already points to /leads and carries the session cookies
  return response
}
