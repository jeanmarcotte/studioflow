import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(req: NextRequest) {
  try {
    const { bride, groom, weddingDate, venue, source } = await req.json()

    const coupleName = bride && groom ? `${bride} & ${groom}` : bride || groom || 'Unknown'

    const resend = getResend()
    await resend.emails.send({
      from: 'SIGS BridalFlow <noreply@sigsphoto.ca>',
      to: ['jeanmarcotte@gmail.com', 'mariannakogan@gmail.com'],
      subject: `New Appointment: ${coupleName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px;">
          <h2 style="color: #0d4f4f;">New Appointment Booked</h2>
          <p><strong>${coupleName}</strong></p>
          <table style="font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 4px 12px 4px 0; color: #666;">Wedding</td><td>${weddingDate || '—'}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #666;">Venue</td><td>${venue || '—'}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #666;">Source</td><td>${source || '—'}</td></tr>
          </table>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Appointment notification error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
