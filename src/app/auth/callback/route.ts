import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/leads'

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignored — setAll is called from Server Component where
              // cookies can't be set. The middleware will refresh them.
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const allowedEmails = [
        'jeanmarcotte@gmail.com',
        'marianna@sigsphoto.ca',
        'mariannakogan@gmail.com',
      ]

      if (data.user.email && allowedEmails.includes(data.user.email)) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Unauthorized email — sign out and redirect
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=unauthorized`)
    }
  }

  // No code or exchange failed — back to login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
