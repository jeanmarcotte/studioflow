import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

function daysBetween(from: string, to: Date): number {
  const fromDate = new Date(from + 'T12:00:00')
  return Math.floor((to.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
}

function formatWeekOf(): string {
  const d = new Date()
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

interface LabItem {
  job_type: string
  vendor: string | null
  at_lab_date: string | null
  product_code: string | null
  couples: { bride_first_name: string; groom_first_name: string; wedding_date: string | null } | null
}

interface StudioItem {
  job_type: string
  vendor: string | null
  pickup_date: string | null
  product_code: string | null
  completed_date: string | null
  at_lab_date: string | null
  couples: { bride_first_name: string; groom_first_name: string; wedding_date: string | null } | null
}

interface PickedUpItem {
  job_type: string
  pickup_date: string | null
  product_code: string | null
  couples: { bride_first_name: string; groom_first_name: string } | null
}

function buildEmailHtml(atLab: LabItem[], atStudio: StudioItem[], pickedUp: PickedUpItem[]): string {
  const today = new Date()

  const labRows = atLab.map(j => {
    const couple = j.couples ? `${j.couples.bride_first_name} & ${j.couples.groom_first_name}` : 'Unknown'
    const days = j.at_lab_date ? daysBetween(j.at_lab_date, today) : 0
    const isOverdue = days > 14
    const rowStyle = isOverdue ? 'background-color: #fef2f2;' : ''
    const daysStyle = isOverdue ? 'color: #dc2626; font-weight: 600;' : 'color: #6b7280;'
    return `<tr style="${rowStyle}">
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;"><strong>${couple}</strong></td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${j.job_type.replace(/_/g, ' ')}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${j.vendor || '—'}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; ${daysStyle}">${days}d</td>
    </tr>`
  }).join('')

  const studioRows = atStudio.map(j => {
    const couple = j.couples ? `${j.couples.bride_first_name} & ${j.couples.groom_first_name}` : 'Unknown'
    const refDate = j.completed_date || j.at_lab_date
    const days = refDate ? daysBetween(refDate, today) : 0
    return `<tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;"><strong>${couple}</strong></td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${j.job_type.replace(/_/g, ' ')}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${j.vendor || '—'}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${days}d waiting</td>
    </tr>`
  }).join('')

  const pickedUpRows = pickedUp.map(j => {
    const couple = j.couples ? `${j.couples.bride_first_name} & ${j.couples.groom_first_name}` : 'Unknown'
    return `<tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;"><strong>${couple}</strong></td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${j.job_type.replace(/_/g, ' ')}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${j.pickup_date || '—'}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-size: 20px; font-weight: 700; color: #0d9488; margin: 0;">SIGS Photography</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Weekly Production Report — ${formatWeekOf()}</p>
    </div>

    <!-- At Lab -->
    <div style="background: white; border-radius: 12px; overflow: hidden; margin-bottom: 16px; border: 1px solid #e5e7eb;">
      <div style="background: #eef2ff; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="margin: 0; font-size: 15px; color: #4338ca;">At Lab (${atLab.length})</h2>
      </div>
      ${atLab.length === 0
        ? '<div style="padding: 16px; color: #9ca3af; font-size: 14px;">Nothing at the lab right now.</div>'
        : `<table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead><tr style="background: #f9fafb;">
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Couple</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Type</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Vendor</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Days</th>
            </tr></thead>
            <tbody>${labRows}</tbody>
          </table>`
      }
    </div>

    <!-- At Studio -->
    <div style="background: white; border-radius: 12px; overflow: hidden; margin-bottom: 16px; border: 1px solid #e5e7eb;">
      <div style="background: #f0fdfa; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="margin: 0; font-size: 15px; color: #0d9488;">At Studio — Ready for Pickup (${atStudio.length})</h2>
      </div>
      ${atStudio.length === 0
        ? '<div style="padding: 16px; color: #9ca3af; font-size: 14px;">Nothing waiting at the studio.</div>'
        : `<table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead><tr style="background: #f9fafb;">
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Couple</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Type</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Vendor</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Waiting</th>
            </tr></thead>
            <tbody>${studioRows}</tbody>
          </table>`
      }
    </div>

    <!-- Picked Up -->
    <div style="background: white; border-radius: 12px; overflow: hidden; margin-bottom: 16px; border: 1px solid #e5e7eb;">
      <div style="background: #f0fdf4; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="margin: 0; font-size: 15px; color: #16a34a;">Picked Up This Week (${pickedUp.length})</h2>
      </div>
      ${pickedUp.length === 0
        ? '<div style="padding: 16px; color: #9ca3af; font-size: 14px;">No pickups this week.</div>'
        : `<table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead><tr style="background: #f9fafb;">
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Couple</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Type</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Pickup Date</th>
            </tr></thead>
            <tbody>${pickedUpRows}</tbody>
          </table>`
      }
    </div>

    <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
      Production report generated ${formatWeekOf()} — SIGS Photography
    </div>
  </div>
</body>
</html>`
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    const url = new URL(request.url)
    if (url.searchParams.get('manual') !== 'true') {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [labRes, studioRes, pickedRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('job_type, vendor, at_lab_date, product_code, couples(bride_first_name, groom_first_name, wedding_date)')
      .eq('status', 'at_lab')
      .order('at_lab_date', { ascending: true }),
    supabase
      .from('jobs')
      .select('job_type, vendor, pickup_date, product_code, completed_date, at_lab_date, couples(bride_first_name, groom_first_name, wedding_date)')
      .eq('status', 'at_studio')
      .order('completed_date', { ascending: true }),
    supabase
      .from('jobs')
      .select('job_type, pickup_date, product_code, couples(bride_first_name, groom_first_name)')
      .eq('status', 'picked_up')
      .gte('pickup_date', sevenDaysAgo)
      .order('pickup_date', { ascending: false }),
  ])

  const atLab = (labRes.data || []) as unknown as LabItem[]
  const atStudio = (studioRes.data || []) as unknown as StudioItem[]
  const pickedUp = (pickedRes.data || []) as unknown as PickedUpItem[]

  const html = buildEmailHtml(atLab, atStudio, pickedUp)

  const resend = getResend()
  const { error } = await resend.emails.send({
    from: 'SIGS Photography <noreply@sigsphoto.ca>',
    to: ['jeanmarcotte@gmail.com'],
    subject: `SIGS Production Report — Week of ${formatWeekOf()}`,
    html,
  })

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  return Response.json({
    ok: true,
    sent: formatWeekOf(),
    counts: { atLab: atLab.length, atStudio: atStudio.length, pickedUp: pickedUp.length },
  })
}
