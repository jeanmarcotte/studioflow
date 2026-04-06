import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body } = await req.json()

    await resend.emails.send({
      from: 'SIGS Photography <noreply@sigsphoto.ca>',
      to: [to],
      bcc: ['jeanmarcotte@gmail.com'],
      subject,
      text: body,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Email send error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
