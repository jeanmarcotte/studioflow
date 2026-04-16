import { NextResponse } from 'next/server'
import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

interface CoupleReminder {
  couple_id: string
  couple_name: string
  email: string | null
  wedding_date: string | null
}

export async function POST(req: Request) {
  try {
    const { couples } = (await req.json()) as { couples: CoupleReminder[] }

    if (!couples || couples.length === 0) {
      return NextResponse.json({ error: 'No couples provided' }, { status: 400 })
    }

    const results = []

    for (const c of couples) {
      if (!c.email) continue

      const formUrl = `https://studioflow-zeta.vercel.app/client/wedding-day-form?couple=${c.couple_id}`
      const weddingDateFormatted = c.wedding_date
        ? new Date(c.wedding_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        : 'your upcoming wedding'

      await getResend().emails.send({
        from: 'SIGS Photography <noreply@sigsphoto.ca>',
        to: c.email,
        subject: `Wedding Day Form — ${c.couple_name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hi ${c.couple_name}!</h2>
            <p>We're getting excited for ${weddingDateFormatted}! 🎉</p>
            <p>We need a few details to make sure everything runs smoothly on your big day. Please fill out your Wedding Day Form at the link below:</p>
            <p style="margin: 24px 0;">
              <a href="${formUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Fill Out Your Form →
              </a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">This helps us plan your photography coverage, know the timeline, and coordinate with your vendors.</p>
            <p>Thank you!<br/>— Jean & the SIGS Photography Team</p>
          </div>
        `,
      })

      results.push({ couple_id: c.couple_id, sent: true })
    }

    return NextResponse.json({ sent: results.length, results })
  } catch (err: any) {
    console.error('Send reminders error:', err)
    return NextResponse.json({ error: err.message || 'Failed to send' }, { status: 500 })
  }
}
