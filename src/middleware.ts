import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Create ONE response object — all cookie ops go through it, return this exact object
  const supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'studioflow-auth',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Mirror onto the request so downstream reads see them
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Write onto the SAME response object — never create a new one
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — MUST call getUser() to keep cookies alive
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Portal routes: all portal pages are publicly accessible
  if (pathname.startsWith('/portal')) {
    return supabaseResponse
  }

  // Crew routes: login and callback are public, everything else requires auth
  if (pathname.startsWith('/crew')) {
    if (pathname.startsWith('/crew/login') || pathname.startsWith('/crew/auth/callback')) {
      return supabaseResponse
    }

    // Crew uses a separate storage key — create a dedicated client to check crew session
    const crewResponse = NextResponse.next({ request: { headers: request.headers } })
    const crewSupabase = createServerClient(
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
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            cookiesToSet.forEach(({ name, value, options }) =>
              crewResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user: crewUser } } = await crewSupabase.auth.getUser()

    if (!crewUser) {
      const url = request.nextUrl.clone()
      url.pathname = '/crew/login'
      const redirectResponse = NextResponse.redirect(url)
      crewResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }
    return crewResponse
  }

  // Admin routes: no session and not on a public route → redirect to /login
  if (
    !user &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/client') &&
    !pathname.startsWith('/ballot') &&
    !pathname.startsWith('/scanner')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    // Carry session cookies onto the redirect so they aren't lost
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
