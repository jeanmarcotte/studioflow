import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function GET(request: Request) {
  // Auth check — same as production report
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    const url = new URL(request.url)
    if (url.searchParams.get('manual') !== 'true') {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  // Fetch all seasons
  const { data: seasons, error: seasonsError } = await supabase
    .from('bridal_show_seasons')
    .select('*')
    .order('year', { ascending: false })
    .order('season', { ascending: true })

  if (seasonsError) {
    return Response.json({ error: seasonsError.message }, { status: 500 })
  }

  // Sort: within same year, fall before winter
  const sortedSeasons = (seasons ?? []).sort((a: any, b: any) => {
    if (b.year !== a.year) return b.year - a.year
    return a.season === 'fall' ? -1 : 1
  })

  // Fetch show-level results for current season (first in sorted = newest)
  const currentSeason = sortedSeasons[0]
  const { data: showResults } = await supabase
    .from('bridal_show_results')
    .select('*')
    .eq('season_id', currentSeason?.id ?? '')
    .order('appts', { ascending: false })

  // Build email HTML
  const html = buildSalesReportHTML(sortedSeasons, showResults ?? [], currentSeason)

  // Send via Resend
  const resend = getResend()
  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Toronto',
  })

  await resend.emails.send({
    from: 'noreply@sigsphoto.ca',
    to: ['jeanmarcotte@gmail.com', 'info@sigsphoto.ca'],
    subject: `SIGS Sales Report — ${today}`,
    html,
  })

  return Response.json({ success: true, season: currentSeason?.season_name })
}

function buildSalesReportHTML(seasons: any[], showResults: any[], current: any) {
  const totalAllTime = seasons.reduce((acc: any, s: any) => ({
    appts: acc.appts + Number(s.appts ?? 0),
    booked: acc.booked + Number(s.booked ?? 0),
    revenue: acc.revenue + Number(s.new_cust_revenue ?? 0),
  }), { appts: 0, booked: 0, revenue: 0 })

  const overallConv = totalAllTime.appts > 0
    ? Math.round((totalAllTime.booked / totalAllTime.appts) * 1000) / 10
    : 0

  const seasonRows = seasons.map((s: any) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px; font-weight: ${s.id === current?.id ? '600' : '400'}">
        ${s.season_name}${s.id === current?.id ? ' ★' : ''}
      </td>
      <td style="padding: 8px 12px; text-align: center;">${s.appts ?? 0}</td>
      <td style="padding: 8px 12px; text-align: center; color: #0d9488; font-weight: 600">${s.booked ?? 0}</td>
      <td style="padding: 8px 12px; text-align: center; color: #ef4444;">${s.failed ?? 0}</td>
      <td style="padding: 8px 12px; text-align: center;">${s.pending ?? 0}</td>
      <td style="padding: 8px 12px; text-align: center; ${Number(s.conversion_rate) < 50 ? 'color:#ef4444' : 'color:#0d9488'}">${s.conversion_rate ? Number(s.conversion_rate).toFixed(1) + '%' : '—'}</td>
      <td style="padding: 8px 12px; text-align: right;">$${Math.round(Number(s.new_cust_revenue ?? 0)).toLocaleString()}</td>
    </tr>
  `).join('')

  const showRows = showResults.map((r: any) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px;">${r.show_name}</td>
      <td style="padding: 8px 12px; text-align: center;">${r.appts}</td>
      <td style="padding: 8px 12px; text-align: center; color: #0d9488; font-weight: 600">${r.booked}</td>
      <td style="padding: 8px 12px; text-align: center; color: #ef4444;">${r.failed}</td>
      <td style="padding: 8px 12px; text-align: right;">${r.show_cost ? '$' + Math.round(Number(r.show_cost)).toLocaleString() : '—'}</td>
      <td style="padding: 8px 12px; text-align: right; ${Number(r.cost_per_sale) > 500 ? 'color:#ef4444;font-weight:600' : ''}">${r.cost_per_sale ? '$' + Math.round(Number(r.cost_per_sale)).toLocaleString() : '—'}</td>
    </tr>
  `).join('')

  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Toronto',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', sans-serif; background: #faf8f5; margin: 0; padding: 0; }
    .container { max-width: 680px; margin: 0 auto; background: white; }
    .header { background: #0d4f4f; padding: 32px 40px; }
    .header h1 { font-family: Georgia, serif; color: #faf8f5; font-size: 28px; margin: 0 0 4px; }
    .header p { color: #9fe1cb; font-size: 14px; margin: 0; }
    .section { padding: 28px 40px; border-bottom: 1px solid #e5e7eb; }
    .section h2 { font-family: Georgia, serif; font-size: 18px; color: #0d4f4f; margin: 0 0 16px; }
    .stat-row { display: flex; gap: 16px; margin-bottom: 20px; }
    .stat { background: #f0fdf9; border: 1px solid #99f6e4; border-radius: 8px; padding: 12px 16px; flex: 1; }
    .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 24px; font-weight: 700; color: #0d4f4f; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f9fafb; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .footer { padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
<div class="container">

  <div class="header">
    <h1>SIGS Sales Report</h1>
    <p>${today}</p>
  </div>

  <!-- Current Season -->
  <div class="section">
    <h2>Current Season — ${current?.season_name ?? 'N/A'}</h2>
    <div class="stat-row">
      <div class="stat">
        <div class="stat-label">Appointments</div>
        <div class="stat-value">${current?.appts ?? 0}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Booked</div>
        <div class="stat-value" style="color:#0d9488">${current?.booked ?? 0}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Failed</div>
        <div class="stat-value" style="color:#ef4444">${current?.failed ?? 0}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Pending</div>
        <div class="stat-value" style="color:#f59e0b">${current?.pending ?? 0}</div>
      </div>
    </div>
    <div class="stat-row">
      <div class="stat">
        <div class="stat-label">Conversion</div>
        <div class="stat-value" style="color:${Number(current?.conversion_rate) < 50 ? '#ef4444' : '#0d9488'}">${current?.conversion_rate ? Number(current.conversion_rate).toFixed(1) + '%' : '—'}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Revenue</div>
        <div class="stat-value">$${Math.round(Number(current?.new_cust_revenue ?? 0)).toLocaleString()}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Goal</div>
        <div class="stat-value">${current?.booked ?? 0} / ${current?.goal_bookings ?? 15}</div>
      </div>
    </div>
  </div>

  <!-- Show Breakdown -->
  ${showResults.length > 0 ? `
  <div class="section">
    <h2>Show Breakdown — ${current?.season_name ?? ''}</h2>
    <table>
      <thead>
        <tr>
          <th>Show</th>
          <th style="text-align:center">Appts</th>
          <th style="text-align:center">Booked</th>
          <th style="text-align:center">Failed</th>
          <th style="text-align:right">Cost</th>
          <th style="text-align:right">$/Sale</th>
        </tr>
      </thead>
      <tbody>${showRows}</tbody>
    </table>
  </div>` : ''}

  <!-- All Seasons History -->
  <div class="section">
    <h2>Season History</h2>
    <table>
      <thead>
        <tr>
          <th>Season</th>
          <th style="text-align:center">Appts</th>
          <th style="text-align:center">Booked</th>
          <th style="text-align:center">Failed</th>
          <th style="text-align:center">Pending</th>
          <th style="text-align:center">Conv%</th>
          <th style="text-align:right">Revenue</th>
        </tr>
      </thead>
      <tbody>${seasonRows}</tbody>
      <tfoot>
        <tr style="background:#f9fafb;font-weight:600">
          <td style="padding:8px 12px">All Time</td>
          <td style="padding:8px 12px;text-align:center">${totalAllTime.appts}</td>
          <td style="padding:8px 12px;text-align:center;color:#0d9488">${totalAllTime.booked}</td>
          <td style="padding:8px 12px;text-align:center"></td>
          <td style="padding:8px 12px;text-align:center"></td>
          <td style="padding:8px 12px;text-align:center">${overallConv}%</td>
          <td style="padding:8px 12px;text-align:right">$${Math.round(totalAllTime.revenue).toLocaleString()}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="footer">
    SIGS Photography · StudioFlow · Generated automatically
  </div>

</div>
</body>
</html>`
}
