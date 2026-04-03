import { NextResponse } from 'next/server'
import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { quoteId, brideName, groomName, coupleEmail, pdfBase64 } = body

    if (!coupleEmail) {
      return NextResponse.json({ error: 'coupleEmail is required' }, { status: 400 })
    }

    if (!pdfBase64) {
      return NextResponse.json({ error: 'pdfBase64 is required' }, { status: 400 })
    }

    const emailHtml = `
<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.8;">

  <p style="font-size: 16px;">Dear <strong>${brideName || ''} & ${groomName || ''}</strong>,</p>

  <p style="font-size: 16px;">Thank you so much for spending time with me on Zoom today! It was a pleasure discussing your wedding plans and how SIGS Photography can capture your special day.</p>

  <p style="font-size: 16px;">I\u2019ve attached the PDF with the quote we talked about, including details on how we can create beautiful memories together.</p>

  <p style="font-size: 16px;">If you have any questions or need further information, feel free to contact Marianna Kogan at <strong>416-831-8942</strong>. We\u2019re both here to help make your wedding experience seamless and unforgettable.</p>

  <p style="font-size: 16px;">Looking forward to hearing from you!</p>

  <p style="font-size: 16px;">
    Warm regards,<br/>
    <strong>Jean Marcotte</strong><br/>
    Principal Photographer<br/>
    <strong>SIGS Photography Ltd.</strong><br/>
    <em>Among the Finest Weddings in the World</em><br/>
    265 Rimrock Rd, Unit 2A, Toronto, ON M3J 3A6<br/>
    416-831-8942
  </p>

</div>
`

    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from: 'SIGS Photography <noreply@sigsphoto.ca>',
      to: [coupleEmail],
      cc: ['mariannakogan@gmail.com'],
      bcc: ['jeanmarcotte@gmail.com', 'info@sigsphoto.ca'],
      subject: 'Thank You for Your Time \u2013 Wedding Photography Proposal',
      html: emailHtml,
      attachments: [
        {
          filename: `SIGS-Quote-${(brideName || 'Bride').replace(/\s+/g, '-')}-${(groomName || 'Groom').replace(/\s+/g, '-')}.pdf`,
          content: pdfBase64,
        },
      ],
    })

    if (error) {
      console.error('[POST /api/client/quotes/send-email] Resend error:', error)
      return NextResponse.json({ error: error.message || 'Email send failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, emailId: data?.id })
  } catch (err) {
    console.error('[POST /api/client/quotes/send-email] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
