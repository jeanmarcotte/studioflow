import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(req: NextRequest) {
  try {
    const { leadId, email, bride, groom } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'No email provided' }, { status: 400 })
    }

    const name = bride || groom || 'there'

    const resend = getResend()
    await resend.emails.send({
      from: 'SIGS Photography <noreply@sigsphoto.ca>',
      to: [email],
      cc: ['jeanmarcotte@gmail.com', 'mariannakogan@gmail.com'],
      subject: `SIGS Photography — Let's Chat About Your Wedding!`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; line-height: 1.6;">
          <p>Hi ${name}!</p>
          <p>Thank you so much for stopping by our booth — we loved meeting you! We'd love to chat more about capturing your special day.</p>
          <p>Here's our Zoom link to set up a quick call at a time that works for you:</p>
          <p style="margin: 20px 0;">
            <a href="https://us02web.zoom.us/j/5672389239?pwd=RTlxdG5GSjVXRTRkSmh4d0dOT3NtZz09" style="display: inline-block; padding: 12px 24px; background: #0d4f4f; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Join Zoom Meeting
            </a>
          </p>
          <p>Just reply to this email with a few dates/times that work for you, and we'll get something on the calendar!</p>
          <p>Looking forward to it,<br><strong>Marianna & Jean</strong><br>SIGS Photography</p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Zoom invite error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
