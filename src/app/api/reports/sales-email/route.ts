import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString('en-CA')}`
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET() {
  try {
    const supabase = getServiceClient()
    const resend = getResend()

    const [meetingsRes, extrasOrdersRes, clientExtrasRes] = await Promise.all([
      supabase.from('sales_meetings').select('*').order('appt_date', { ascending: false }),
      supabase
        .from('extras_orders')
        .select('*, couples(bride_first_name, groom_first_name, wedding_date)')
        .order('order_date', { ascending: false }),
      supabase
        .from('client_extras')
        .select('*')
        .not('invoice_date', 'is', null),
    ])

    const meetings = meetingsRes.data || []
    const extrasOrders = (extrasOrdersRes.data || []).map((o: any) => ({
      ...o,
      bride_first_name: o.couples?.bride_first_name || null,
      groom_first_name: o.couples?.groom_first_name || null,
      wedding_date: o.couples?.wedding_date || null,
    }))
    const clientExtras = clientExtrasRes.data || []

    const now = new Date()
    const year2026 = 2026

    // C1
    const meetings2026 = meetings.filter((m: any) => m.appt_date && new Date(m.appt_date).getFullYear() === year2026)
    const booked = meetings2026.filter((m: any) => m.status === 'Booked')
    const failed = meetings2026.filter((m: any) => m.status === 'Failed')
    const pending_c1 = meetings.filter((m: any) => m.status === 'Pending')
    const conversionRate = booked.length + failed.length > 0 ? Math.round(booked.length / (booked.length + failed.length) * 100) : 0
    const revenueBooked = booked.reduce((s: number, m: any) => s + (Number(m.quoted_amount) || 0), 0)
    const avgDeal = booked.length > 0 ? Math.round(revenueBooked / booked.length) : 0

    // C2
    const orders2026 = extrasOrders.filter((o: any) => o.order_date && new Date(o.order_date).getFullYear() === year2026)
    const signed2026 = orders2026.filter((o: any) => o.status === 'signed')
    const pending_c2 = extrasOrders.filter((o: any) => o.status === 'pending')
    const declined_c2 = extrasOrders.filter((o: any) => o.status === 'declined').sort((a: any, b: any) => {
      if (!a.wedding_date) return 1
      if (!b.wedding_date) return -1
      return new Date(a.wedding_date).getTime() - new Date(b.wedding_date).getTime()
    })
    const revenueC2 = signed2026.reduce((s: number, o: any) => s + (Number(o.extras_sale_amount) || 0), 0)
    const conversionC2 = orders2026.length > 0 ? Math.round(signed2026.length / orders2026.length * 100) : 0

    // C3
    const extras2026 = clientExtras.filter((e: any) => e.invoice_date && new Date(e.invoice_date).getFullYear() === year2026)
    const extras2025 = clientExtras.filter((e: any) => e.invoice_date && new Date(e.invoice_date).getFullYear() === 2025)
    const couples2026 = new Set(extras2026.map((e: any) => e.couple_id)).size
    const revenueExtras2026 = extras2026.reduce((s: number, e: any) => s + (Number(e.total) || 0), 0)
    const revenueExtras2025 = extras2025.reduce((s: number, e: any) => s + (Number(e.total) || 0), 0)
    const growthMultiple = revenueExtras2025 > 0 ? Math.round(revenueExtras2026 / revenueExtras2025) : 0

    // Email subject
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const subject = `SIGS Sales Report — ${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`
    const dateString = `${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`

    // Build pending section
    let pendingHtml = ''
    if (pending_c1.length > 0 || pending_c2.length > 0) {
      let pendingItems = ''
      for (const m of pending_c1) {
        const couple = m.groom_name ? `${m.bride_name} & ${m.groom_name}` : m.bride_name
        const days = daysSince(m.appt_date)
        const callToday = days >= 15 ? ' <span style="color: #dc2626; font-weight: bold;">← CALL TODAY</span>' : ''
        pendingItems += `<div style="margin-bottom: 8px;"><strong>${couple}</strong> — ${fmtMoney(Number(m.quoted_amount) || 0)} — ${days}d waiting${callToday}</div>`
      }
      for (const o of pending_c2) {
        const couple = o.bride_first_name && o.groom_first_name
          ? `${o.bride_first_name} & ${o.groom_first_name}`
          : 'Unknown'
        const days = daysSince(o.order_date)
        pendingItems += `<div style="margin-bottom: 8px;"><strong>${couple}</strong> (Frames) — ${fmtMoney(Number(o.extras_sale_amount) || 0)} — ${days}d waiting</div>`
      }
      pendingHtml = `
        <div style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 12px; font-size: 16px; color: #92400e;">PENDING DEALS</h2>
          ${pendingItems}
        </div>`
    }

    // Build declined section
    let declinedHtml = ''
    if (declined_c2.length > 0) {
      let declinedItems = ''
      for (const o of declined_c2) {
        const couple = o.bride_first_name && o.groom_first_name
          ? `${o.bride_first_name} & ${o.groom_first_name}`
          : 'Unknown'
        const weddingDate = o.wedding_date ? new Date(o.wedding_date) : null
        const weddingStr = weddingDate ? weddingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
        const daysUntil = weddingDate ? Math.floor((weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
        const isSoon = daysUntil !== null && daysUntil > 0 && daysUntil <= 90
        const bgStyle = isSoon ? 'background: #fffbeb;' : ''
        const soonLabel = isSoon ? ' <span style="color: #d97706;">Wedding soon</span>' : ''
        declinedItems += `<div style="padding: 6px 0; border-bottom: 1px solid #f3f4f6; ${bgStyle}">${couple} — ${weddingStr}${soonLabel}</div>`
      }
      declinedHtml = `
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">C2 — Who Said No</h2>
          ${declinedItems}
        </div>`
    }

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">

  <div style="border-bottom: 3px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 20px;">
    <h1 style="margin: 0; font-size: 22px;">SIGS Sales Report</h1>
    <p style="margin: 4px 0 0; color: #666; font-size: 13px;">${dateString} · Generated automatically</p>
  </div>

  ${pendingHtml}

  <div style="margin-bottom: 20px;">
    <h2 style="font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">C1 — Season 2026</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 0; color: #666;">Meetings</td><td style="font-weight: bold;">${meetings2026.length}</td>
        <td style="padding: 6px 0; color: #666;">Booked</td><td style="font-weight: bold; color: #16a34a;">${booked.length}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #666;">Failed</td><td style="font-weight: bold; color: #dc2626;">${failed.length}</td>
        <td style="padding: 6px 0; color: #666;">Conversion</td><td style="font-weight: bold;">${conversionRate}%</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #666;">Revenue</td><td style="font-weight: bold;">${fmtMoney(revenueBooked)}</td>
        <td style="padding: 6px 0; color: #666;">Avg Deal</td><td style="font-weight: bold;">${fmtMoney(avgDeal)}</td>
      </tr>
    </table>
  </div>

  <div style="margin-bottom: 20px;">
    <h2 style="font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">C2 — Frames & Albums 2026</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 0; color: #666;">Orders</td><td style="font-weight: bold;">${orders2026.length}</td>
        <td style="padding: 6px 0; color: #666;">Signed</td><td style="font-weight: bold; color: #16a34a;">${signed2026.length}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #666;">Conversion</td><td style="font-weight: bold;">${conversionC2}%</td>
        <td style="padding: 6px 0; color: #666;">Revenue</td><td style="font-weight: bold;">${fmtMoney(revenueC2)}</td>
      </tr>
    </table>
  </div>

  ${declinedHtml}

  <div style="margin-bottom: 20px;">
    <h2 style="font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">C3 — Marianna's Extras 2026</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 0; color: #666;">Couples</td><td style="font-weight: bold;">${couples2026}</td>
        <td style="padding: 6px 0; color: #666;">Line Items</td><td style="font-weight: bold;">${extras2026.length}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #666;">Revenue</td><td style="font-weight: bold;">${fmtMoney(revenueExtras2026)}</td>
        <td style="padding: 6px 0; color: #666;">vs 2025</td><td style="font-weight: bold; color: #d97706;">${growthMultiple}×</td>
      </tr>
    </table>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; color: #9ca3af; font-size: 11px;">
    SIGS Photography · Sent automatically Mon & Thu at 5:30am ·
    <a href="https://studioflow-zeta.vercel.app/admin/sales/report" style="color: #6366f1;">View full report</a>
  </div>

</body>
</html>`

    await resend.emails.send({
      from: 'SIGS Sales Report <noreply@sigsphoto.ca>',
      to: 'jeanmarcotte@gmail.com',
      subject,
      html: emailHtml,
    })

    return Response.json({ success: true, message: 'Sales report email sent' })
  } catch (error) {
    console.error('Sales email error:', error)
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}
