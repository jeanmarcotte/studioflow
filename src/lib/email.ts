import { Resend } from 'resend'
import { format } from 'date-fns'
import { buildScheduleRows, calculateHoursValidation } from '@/lib/time-utils'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const TEAM_NOTIFY_EMAILS = ['jeanmarcotte@gmail.com', 'mariannakogan@gmail.com', 'info@sigsphoto.ca']

type FormType = 'wedding-day' | 'photo-order' | 'video-order'

export async function sendFormNotification({
  formType,
  coupleName,
  weddingDate,
}: {
  formType: FormType
  coupleName: string
  weddingDate: string
}) {
  const subjects: Record<FormType, string> = {
    'wedding-day': `\u{1F4CB} Wedding Day Form: ${coupleName}`,
    'photo-order': `\u{1F4F7} Photo Order: ${coupleName}`,
    'video-order': `\u{1F3AC} Video Order: ${coupleName}`,
  }

  const formNames: Record<FormType, string> = {
    'wedding-day': 'Wedding Day Information',
    'photo-order': 'Photo Order',
    'video-order': 'Video Order',
  }

  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from: 'SIGS Photography <noreply@sigsphoto.ca>',
      to: ['info@sigsphoto.ca'],
      subject: subjects[formType],
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d9488; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">${formNames[formType]} Submitted</h2>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p><strong>Couple:</strong> ${coupleName}</p>
            <p><strong>Wedding Date:</strong> ${weddingDate}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' })}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
            <p><a href="https://studioflow-zeta.vercel.app/admin/couples" style="color: #0d9488; text-decoration: none;">View in StudioFlow \u2192</a></p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    console.error('Email send failed:', err)
    return { success: false, error: err }
  }
}

// ─── Team notification with full schedule ───────────────────────────────────

interface TeamNotifyData {
  coupleId: string
  coupleName: string
  weddingDate: string
  packageType: string | null
  form: Record<string, unknown>
  contract?: { start_time?: string | null; end_time?: string | null } | null
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function sendTeamWeddingDayNotification(data: TeamNotifyData) {
  const { coupleId, coupleName, weddingDate, packageType, form, contract } = data

  const dateFormatted = weddingDate
    ? format(new Date(weddingDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')
    : weddingDate
  const city = ((form.reception_city || form.ceremony_city || form.bride_city || '') as string).trim()

  const isPhotoOnly = packageType === 'photo_only'
  const packageLabel = isPhotoOnly ? '\u{1F4F7} PHOTO ONLY' : '\u{1F4F7}\u{1F3A5} PHOTO & VIDEO'

  // Build schedule
  const scheduleRows = buildScheduleRows(form as Parameters<typeof buildScheduleRows>[0], packageType)
  const { contracted, contractStartFmt, contractEndFmt, actualHours, earliestFmt, latestFmt, exceedsBy } = calculateHoursValidation(
    form as Parameters<typeof calculateHoursValidation>[0],
    contract
  )

  // Schedule table rows
  const scheduleHtml = scheduleRows.map(row => {
    const loc = row.location ? `<span style="color:#6b7280;">${escHtml(row.location)}</span>` : ''
    return `
      <tr>
        <td style="padding:6px 12px 6px 0;font-family:monospace;font-size:13px;color:#374151;white-space:nowrap;">${escHtml(row.time)}</td>
        <td style="padding:6px 8px;font-size:13px;font-weight:600;color:#111827;">${escHtml(row.event)}</td>
        <td style="padding:6px 0 6px 8px;font-size:13px;">${loc}</td>
      </tr>`
  }).join('\n')

  // Hours validation
  let hoursHtml = ''
  if (contracted) {
    const contractLine = contractStartFmt && contractEndFmt
      ? `${contractStartFmt} \u2192 ${contractEndFmt} (${contracted} hours)`
      : `${contracted} hours`
    hoursHtml += `<p style="margin:4px 0;font-size:13px;color:#374151;"><strong>As per contract:</strong> ${contractLine}</p>`
  }
  if (actualHours !== null) {
    hoursHtml += `<p style="margin:4px 0;font-size:13px;color:#374151;"><strong>Actual day:</strong> ${earliestFmt} \u2192 ${latestFmt} (${actualHours} hours)</p>`
  }
  if (exceedsBy !== null) {
    hoursHtml += `<p style="margin:8px 0 4px;font-size:14px;font-weight:700;color:#dc2626;">\u26A0\uFE0F Day exceeds contract by ${exceedsBy} hour${exceedsBy !== 1 ? 's' : ''}</p>`
  } else if (contracted && actualHours !== null) {
    hoursHtml += `<p style="margin:8px 0 4px;font-size:13px;color:#16a34a;">\u2705 Schedule fits within contract</p>`
  }

  // Emergency contacts
  const ec1Name = (form.emergency_contact_1_name as string) || ''
  const ec1Phone = (form.emergency_contact_1_phone as string) || ''
  const ec2Name = (form.emergency_contact_2_name as string) || ''
  const ec2Phone = (form.emergency_contact_2_phone as string) || ''
  let ecHtml = ''
  if (ec1Name || ec2Name) {
    ecHtml = `
      <div style="margin-top:20px;padding-top:16px;border-top:2px solid #e5e7eb;">
        <p style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Emergency Contacts</p>
        ${ec1Name ? `<p style="margin:4px 0;font-size:13px;color:#374151;">${escHtml(ec1Name)} \u2014 ${escHtml(ec1Phone)}</p>` : ''}
        ${ec2Name ? `<p style="margin:4px 0;font-size:13px;color:#374151;">${escHtml(ec2Name)} \u2014 ${escHtml(ec2Phone)}</p>` : ''}
      </div>`
  }

  const viewUrl = `https://studioflow-zeta.vercel.app/client/wedding-day-form/${coupleId}`
  const pdfUrl = `https://studioflow-zeta.vercel.app/api/wedding-form-pdf/${coupleId}`

  const subject = `\u{1F4CB} Wedding Day Form Received \u2014 ${coupleName} (${dateFormatted})`

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;">
      <!-- Header -->
      <div style="background:#1e3a5f;color:white;padding:24px 28px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0 0 4px;font-size:20px;">${escHtml(coupleName)}</h2>
        <p style="margin:0;font-size:14px;opacity:0.85;">submitted their Wedding Day Form</p>
      </div>

      <!-- Package type banner -->
      <div style="background:${isPhotoOnly ? '#f59e0b' : '#1e3a5f'};color:${isPhotoOnly ? '#000000' : '#ffffff'};padding:14px 28px;text-align:center;font-size:18px;font-weight:700;letter-spacing:0.5px;">${packageLabel}</div>

      <div style="padding:24px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        <!-- Date + City -->
        <div style="margin-bottom:20px;">
          <p style="margin:12px 0 4px;font-size:15px;color:#111827;">\u{1F4C5} ${escHtml(dateFormatted)}</p>
          ${city ? `<p style="margin:4px 0;font-size:14px;color:#6b7280;">\u{1F4CD} ${escHtml(city)}</p>` : ''}
        </div>

        <!-- Schedule -->
        <div style="border-top:2px solid #e5e7eb;padding-top:16px;">
          <p style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">Schedule</p>
          <table style="width:100%;border-collapse:collapse;">
            ${scheduleHtml}
          </table>
        </div>

        <!-- Hours -->
        <div style="margin-top:16px;padding:12px 16px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
          ${hoursHtml}
        </div>

        ${ecHtml}

        <!-- Links -->
        <div style="margin-top:24px;padding-top:16px;border-top:2px solid #e5e7eb;">
          <p style="margin:0 0 8px;">
            \u{1F4C4} <a href="${viewUrl}" style="color:#2563eb;text-decoration:none;font-weight:600;">View Full Form</a>
          </p>
          <p style="margin:0;">
            \u{1F4E5} <a href="${pdfUrl}" style="color:#2563eb;text-decoration:none;font-weight:600;">Download PDF</a>
          </p>
        </div>
      </div>
    </div>
  `

  try {
    const resend = getResend()
    const { data: result, error } = await resend.emails.send({
      from: 'SIGS Photography <noreply@sigsphoto.ca>',
      to: TEAM_NOTIFY_EMAILS,
      subject,
      html,
    })

    if (error) {
      console.error('[Team notify] Resend error:', error)
      return { success: false, error }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    console.error('[Team notify] Email send failed:', err)
    return { success: false, error: err }
  }
}
