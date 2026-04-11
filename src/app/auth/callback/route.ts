import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    // No code — redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const response = NextResponse.redirect(new URL('/leads', request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Auth code exchange failed:', error.message)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify the user is allowed
  const { data: { user } } = await supabase.auth.getUser()
  const allowedEmails = ['jeanmarcotte@gmail.com', 'marianna@sigsphoto.ca', 'mariannakogan@gmail.com']

  if (!user?.email || !allowedEmails.includes(user.email)) {
    console.log('Unauthorized email:', user?.email)
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
  }

  console.log('User authorized:', user.email)
  return response
}
