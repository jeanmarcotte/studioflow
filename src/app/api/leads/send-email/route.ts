import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body } = await req.json()

    if (!to) {
      return NextResponse.json({ error: 'No recipient' }, { status: 400 })
    }

    const resend = getResend()
    await resend.emails.send({
      from: 'SIGS Photography <noreply@sigsphoto.ca>',
      to: [to],
      bcc: ['jeanmarcotte@gmail.com'],
      subject: subject || 'SIGS Photography',
      html: `<div style="font-family: sans-serif; white-space: pre-line; line-height: 1.6; font-size: 14px;">${body.replace(/\n/g, '<br>')}</div>`,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Send email error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
