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
      subject: `Let's chat about your wedding — SIGS Photography`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; line-height: 1.6;">
          <p>Hi ${name}!</p>
          <p>Thank you for your interest in SIGS Photography! We'd love to chat more about capturing your special day.</p>
          <p>Here's our Zoom link to set up a quick call at a time that works for you:</p>
          <p style="margin: 20px 0;">
            <a href="https://zoom.us/j/sigs-photography" style="display: inline-block; padding: 12px 24px; background: #0d4f4f; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Join Zoom Meeting
            </a>
            <br>
            <a href="https://zoom.us/j/sigs-photography" style="font-size: 13px; color: #666; margin-top: 4px; display: inline-block;">https://zoom.us/j/sigs-photography</a>
          </p>
          <p>Just reply to this email with a few dates/times that work for you, and we'll get something on the calendar!</p>
          <p>Looking forward to it,<br><br><strong>Marianna & Jean</strong><br>SIGS Photography<br>416-831-8942<br><a href="https://www.sigsphoto.ca" style="color: #0d4f4f;">www.sigsphoto.ca</a></p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Zoom invite error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
