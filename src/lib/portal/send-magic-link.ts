import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://studioflow-zeta.vercel.app'
const LOGO_URL = `${SITE_URL}/images/sigslogo.png`

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

function buildMagicLinkEmail(firstNames: string, magicLinkUrl: string): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="text-align: center; padding: 32px 28px 16px;">
        <img src="${LOGO_URL}" alt="SIGS Photography" style="max-height: 60px; width: auto;" />
      </div>

      <div style="padding: 0 28px 32px;">
        <h1 style="font-size: 22px; color: #111827; text-align: center; margin: 0 0 16px;">
          Your Couples Portal Login
        </h1>

        <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 8px;">
          Hi ${firstNames},
        </p>
        <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 24px;">
          Your secure login link for your SIGS Couples Portal is below. This link will log you in without a password and expires in 1 hour.
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${magicLinkUrl}" style="display: inline-block; background: #0d9488; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
            Log in to my portal
          </a>
        </div>

        <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 24px 0 0;">
          Or copy this link into your browser:<br />
          <a href="${magicLinkUrl}" style="color: #2563eb; word-break: break-all;">${magicLinkUrl}</a>
        </p>

        <hr style="margin: 28px 0; border: none; border-top: 1px solid #e5e7eb;" />

        <p style="font-size: 14px; color: #374151; margin: 0;">
          — Jean & Marianna, SIGS Photography
        </p>

        <p style="font-size: 11px; color: #9ca3af; margin: 16px 0 0;">
          SIGS Photography &bull; Toronto &amp; Vaughan, Ontario &bull; sigsphoto.ca
        </p>
      </div>
    </div>
  `
}

export async function generateAndSendMagicLink(email: string, firstNames: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminSupabase()

    // Generate the magic link via admin API (does NOT send email)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${SITE_URL}/portal/auth/callback`,
      },
    })

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[Portal] generateLink error:', linkError)
      return { success: false, error: 'Failed to generate login link' }
    }

    // Build the verification URL that goes through our callback
    const magicLinkUrl = `${SITE_URL}/portal/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink`

    // Send via Resend
    const resend = getResend()
    const { error: emailError } = await resend.emails.send({
      from: 'SIGS Photography <noreply@sigsphoto.ca>',
      to: [email],
      subject: 'Your SIGS Couples Portal login link',
      html: buildMagicLinkEmail(firstNames, magicLinkUrl),
    })

    if (emailError) {
      console.error('[Portal] Resend error:', emailError)
      return { success: false, error: 'Failed to send email' }
    }

    return { success: true }
  } catch (err) {
    console.error('[Portal] send-magic-link error:', err)
    return { success: false, error: 'Unexpected error' }
  }
}
