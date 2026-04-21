import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

interface LineItem {
  item_name: string
  product_code: string
  quantity: number
  unit_price: number
  line_total: number
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { bride, groom, weddingDate, items, subtotal, hst, total, paymentNote, invoiceDate } = body as {
      bride: string
      groom: string
      weddingDate: string
      items: LineItem[]
      subtotal: number
      hst: number
      total: number
      paymentNote: string
      invoiceDate: string
    }

    const itemRows = items.map((item) =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;">${item.item_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#C9A84C;">${item.product_code}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;text-align:right;">$${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;text-align:right;font-weight:600;">$${Number(item.line_total).toFixed(2)}</td>
      </tr>`
    ).join('')

    const html = `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
        <div style="border-bottom:2px solid #C9A84C;padding-bottom:16px;margin-bottom:24px;">
          <h1 style="font-size:22px;font-weight:700;margin:0;color:#1A1A1A;">C3 Extras Invoice</h1>
          <p style="font-size:13px;color:#999;margin:4px 0 0;">SIGS Photography Ltd.</p>
        </div>

        <table style="width:100%;margin-bottom:24px;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:14px;color:#666;">Couple</td>
            <td style="font-size:14px;font-weight:600;">${bride} & ${groom}</td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#666;padding-top:4px;">Wedding Date</td>
            <td style="font-size:14px;padding-top:4px;">${weddingDate}</td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#666;padding-top:4px;">Invoice Date</td>
            <td style="font-size:14px;padding-top:4px;">${invoiceDate}</td>
          </tr>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr style="background:#FAFAF5;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#999;letter-spacing:0.05em;">Item</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#999;letter-spacing:0.05em;">Code</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;text-transform:uppercase;color:#999;letter-spacing:0.05em;">Qty</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#999;letter-spacing:0.05em;">Price</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#999;letter-spacing:0.05em;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <table style="width:100%;margin-bottom:24px;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:14px;color:#666;padding:4px 0;">Subtotal</td>
            <td style="font-size:14px;text-align:right;padding:4px 0;">$${Number(subtotal).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#666;padding:4px 0;">HST (13%)</td>
            <td style="font-size:14px;text-align:right;padding:4px 0;">$${Number(hst).toFixed(2)}</td>
          </tr>
          <tr style="border-top:2px solid #C9A84C;">
            <td style="font-size:16px;font-weight:700;padding:8px 0;">TOTAL</td>
            <td style="font-size:16px;font-weight:700;text-align:right;padding:8px 0;">$${Number(total).toFixed(2)}</td>
          </tr>
        </table>

        ${paymentNote ? `<p style="font-size:13px;color:#666;border-top:1px solid #eee;padding-top:16px;"><strong>Payment Note:</strong> ${paymentNote}</p>` : ''}
      </div>
    `

    const resend = getResend()

    await resend.emails.send({
      from: 'StudioFlow <noreply@sigsphoto.ca>',
      to: 'info@sigsphoto.ca',
      subject: `C3 Extras Invoice \u2014 ${bride} & ${groom} \u2014 ${invoiceDate}`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('C3 invoice email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
