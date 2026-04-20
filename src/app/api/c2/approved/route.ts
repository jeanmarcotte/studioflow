import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { bride, groom, saleAmount, numInstallments, dateApproved } = body

    const resend = getResend()

    await resend.emails.send({
      from: 'StudioFlow <noreply@sigsphoto.ca>',
      to: 'info@sigsphoto.ca',
      subject: `C2 Sale Approved — ${bride} & ${groom}`,
      text: [
        `C2 Sale Approved`,
        ``,
        `Couple: ${bride} & ${groom}`,
        `Sale Amount: $${Number(saleAmount).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`,
        `Installments: ${numInstallments}`,
        `Date Approved: ${dateApproved}`,
      ].join('\n'),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('C2 approved email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
