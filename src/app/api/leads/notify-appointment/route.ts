import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

function esc(s: string | null | undefined): string {
  return (s || '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      bride, groom, phone, email, weddingDate, venue, source,
      apptDate, apptTime, meetingType, notes,
      budget, album, engagement, dj, planner, multiDay, firstLook, bridalParty,
    } = body

    const coupleName = bride && groom ? `${bride} & ${groom}` : bride || groom || 'Unknown'

    // Format appointment date/time for subject
    let apptLabel = ''
    if (apptDate) {
      const d = new Date(apptDate + 'T12:00:00')
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      apptLabel = `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`
    }
    let timeLabel = ''
    if (apptTime) {
      const [h, m] = apptTime.split(':').map(Number)
      const ampm = h >= 12 ? 'PM' : 'AM'
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      timeLabel = `${h12}:${String(m).padStart(2, '0')} ${ampm}`
    }

    // Build discovery summary
    const discoveryItems: string[] = []
    if (album) discoveryItems.push(`Album: ${album}`)
    if (engagement) discoveryItems.push(`Engagement: ${engagement}`)
    if (dj) discoveryItems.push(`DJ: ${dj}`)
    if (planner) discoveryItems.push(`Planner: ${planner === true ? 'yes' : planner}`)
    if (multiDay) discoveryItems.push(`Multi-Day: ${multiDay === true ? 'yes' : multiDay}`)
    if (firstLook) discoveryItems.push(`First Look: ${firstLook}`)
    if (bridalParty) discoveryItems.push(`Bridal Party: ${bridalParty}`)
    const discoveryHtml = discoveryItems.length > 0
      ? discoveryItems.map(d => `<tr><td style="padding: 4px 12px 4px 0; color: #666;">${esc(d.split(':')[0])}</td><td>${esc(d.split(':')[1])}</td></tr>`).join('')
      : ''

    const resend = getResend()
    await resend.emails.send({
      from: 'SIGS BridalFlow <noreply@sigsphoto.ca>',
      to: ['jeanmarcotte@gmail.com', 'mariannakogan@gmail.com'],
      subject: `📅 APPT BOOKED: ${coupleName}${apptLabel ? ` — ${apptLabel}` : ''}${timeLabel ? ` @ ${timeLabel}` : ''}`,
      html: `
        <div style="font-family: sans-serif; max-width: 550px;">
          <h2 style="color: #0d4f4f; margin-bottom: 16px;">New Appointment Booked</h2>
          <table style="font-size: 14px; border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 6px 12px 6px 0; color: #666; font-weight: 600;">Couple</td><td><strong>${esc(coupleName)}</strong></td></tr>
            <tr><td style="padding: 6px 12px 6px 0; color: #666; font-weight: 600;">Phone</td><td>${esc(phone)}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0; color: #666; font-weight: 600;">Email</td><td>${esc(email)}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0; color: #666; font-weight: 600;">Wedding Date</td><td>${esc(weddingDate)}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0; color: #666; font-weight: 600;">Venue</td><td>${esc(venue)}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0; color: #666; font-weight: 600;">Source</td><td>${esc(source)}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0; color: #666; font-weight: 600;">Budget</td><td>${esc(budget)}</td></tr>
            <tr style="background: #f0fdf4;">
              <td style="padding: 8px 12px 8px 0; color: #0d4f4f; font-weight: 700;">Appt Date</td>
              <td style="font-weight: 700; color: #0d4f4f;">${esc(apptDate)}</td>
            </tr>
            <tr style="background: #f0fdf4;">
              <td style="padding: 8px 12px 8px 0; color: #0d4f4f; font-weight: 700;">Appt Time</td>
              <td style="font-weight: 700; color: #0d4f4f;">${esc(apptTime)}</td>
            </tr>
            <tr><td style="padding: 6px 12px 6px 0; color: #666; font-weight: 600;">Meeting Type</td><td>${esc(meetingType)}</td></tr>
            ${discoveryHtml}
          </table>
          ${notes ? `<p style="margin-top: 12px; font-size: 13px; color: #666;"><strong>Notes:</strong> ${esc(notes)}</p>` : ''}
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Appointment notification error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
