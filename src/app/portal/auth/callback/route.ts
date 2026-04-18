import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { trackLogin } from '@/lib/portal/track-login'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studioflow-zeta.vercel.app'

  if (!tokenHash || type !== 'magiclink') {
    return NextResponse.redirect(`${siteUrl}/portal/login?error=invalid_link`)
  }

  // Create a response to write cookies onto
  const response = NextResponse.redirect(`${siteUrl}/portal/login`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  // Verify the OTP token to create a session
  const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  })

  if (verifyError || !sessionData?.user?.email) {
    console.error('[Portal callback] verifyOtp error:', verifyError)
    return NextResponse.redirect(`${siteUrl}/portal/login?error=invalid_link`)
  }

  // Look up couple by email using admin client (bypasses RLS)
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: couple } = await adminSupabase
    .from('couples')
    .select('id, portal_slug')
    .ilike('email', sessionData.user.email)
    .limit(1)

  if (!couple || couple.length === 0 || !couple[0].portal_slug) {
    console.error('[Portal callback] No couple found for email:', sessionData.user.email)
    return NextResponse.redirect(`${siteUrl}/portal/login?error=no_portal`)
  }

  // Track login timestamps
  await trackLogin(couple[0].id)

  // Redirect to the couple's portal
  const portalUrl = `${siteUrl}/portal/${couple[0].portal_slug}`

  // Create a new redirect response with the portal URL, carrying over the cookies
  const successResponse = NextResponse.redirect(portalUrl)
  response.cookies.getAll().forEach((cookie) => {
    successResponse.cookies.set(cookie.name, cookie.value)
  })

  return successResponse
}
