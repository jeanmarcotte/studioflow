import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

function textToHtml(text: string): string {
  // Escape HTML entities
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // Convert URLs to clickable links
  html = html.replace(
    /(https?:\/\/[^\s]+|www\.[^\s]+)/g,
    (url) => {
      const href = url.startsWith('http') ? url : `https://${url}`
      return `<a href="${href}" style="color: #0d4f4f;">${url}</a>`
    }
  )
  // Convert newlines to <br>
  html = html.replace(/\n/g, '<br>')
  return `<div style="font-family: sans-serif; line-height: 1.6;">${html}</div>`
}

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body } = await req.json()

    await getResend().emails.send({
      from: 'SIGS Photography <noreply@sigsphoto.ca>',
      to: [to],
      bcc: ['jeanmarcotte@gmail.com'],
      subject,
      html: textToHtml(body),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Email send error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
