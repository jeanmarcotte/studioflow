import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://studioflow-zeta.vercel.app'

export async function POST(request: Request) {
  try {
    const { coupleId } = await request.json()
    if (!coupleId) return NextResponse.json({ error: 'Missing coupleId' }, { status: 400 })

    const { data: couples } = await supabase
      .from('couples')
      .select('bride_first_name, groom_first_name, wedding_date')
      .eq('id', coupleId)
      .limit(1)
    const couple = couples?.[0]
    if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const coupleName = `${couple.bride_first_name || ''} & ${couple.groom_first_name || ''}`
    const weddingDate = couple.wedding_date
      ? new Date(couple.wedding_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : 'TBD'
    const now = new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' })
    const viewUrl = `${SITE_URL}/admin/wedding-day/forms/${coupleId}/print`

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0d9488; color: white; padding: 24px 28px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">Wedding Day Form Submitted</h2>
        </div>
        <div style="padding: 24px 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; font-weight: 600; margin: 0 0 8px;">${coupleName}</p>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 4px;">Wedding: ${weddingDate}</p>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 20px;">Submitted: ${now}</p>
          <p style="margin: 0;">
            <a href="${viewUrl}" style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              View Full Form
            </a>
          </p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">SIGS Photography — Wedding Day Form notification</p>
        </div>
      </div>`

    const resend = getResend()
    await resend.emails.send({
      from: 'SIGS Photography <noreply@sigsphoto.ca>',
      to: ['jeanmarcotte@gmail.com', 'info@sigsphoto.ca'],
      subject: `Wedding Day Form: ${coupleName}`,
      html,
    })

    return NextResponse.json({ success: true, submittedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[Portal] submit-wedding-form error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
