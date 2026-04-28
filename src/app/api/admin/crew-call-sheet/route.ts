import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { format } from 'date-fns'
import { formatTime12h } from '@/lib/formatters'
import { buildCrewEmailHtml } from '@/lib/crew-email-html'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://studioflow-zeta.vercel.app'

// ── Types ────────────────────────────────────────────────────────

interface CrewMemberPayload {
  team_member_id: string
  member_name: string
  member_email: string
  role: string
  call_time: string
  meeting_point: string
  meeting_point_address: string
  meeting_point_maps_url: string
  meeting_point_time: string
  equipment_pickup_location: string
  equipment_pickup_time: string
  equipment_dropoff_location: string
  equipment_dropoff_time: string
  special_notes: string
}

interface ScheduleEvent {
  time: string
  label: string
  address: string
  maps_url: string
}

interface SendPayload {
  couple_id: string
  couple_name: string
  wedding_date: string
  day_of_week: string
  ceremony_location: string
  reception_venue: string
  park_location: string
  start_time: string
  end_time: string
  package_type: string
  notes: string
  dress_code: string
  bridesmaids: string
  groomsmen: string
  vendors: Record<string, string>
  key_moments: string
  weather: string
  schedule: ScheduleEvent[]
  crew_members: CrewMemberPayload[]
  attachments?: { filename: string; path: string }[]
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

// ── POST: Send crew call sheet ───────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const payload: SendPayload = await request.json()
    const {
      couple_id, couple_name, wedding_date, day_of_week,
      ceremony_location, reception_venue, park_location,
      start_time, end_time, notes, crew_members,
      dress_code, bridesmaids, groomsmen, vendors, key_moments, weather,
      schedule,
    } = payload

    if (!couple_id || !crew_members?.length) {
      return NextResponse.json({ error: 'Missing couple_id or crew_members' }, { status: 400 })
    }

    const dateFormatted = wedding_date
      ? format(new Date(wedding_date + 'T12:00:00'), 'MMMM d, yyyy')
      : ''
    const dayUpper = (day_of_week || '').toUpperCase()
    const subjectDate = wedding_date
      ? format(new Date(wedding_date + 'T12:00:00'), 'EEE, MMM d')
      : ''

    // Coverage hours
    let coverageText = ''
    if (start_time && end_time) {
      coverageText = `${formatTime12h(start_time)} – ${formatTime12h(end_time)}`
      const parseTime = (t: string) => {
        const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
        if (!match) return null
        let h = parseInt(match[1])
        const m = parseInt(match[2])
        const ampm = match[3].toUpperCase()
        if (ampm === 'PM' && h !== 12) h += 12
        if (ampm === 'AM' && h === 12) h = 0
        return h * 60 + m
      }
      const s = parseTime(start_time)
      const e = parseTime(end_time)
      if (s !== null && e !== null && e - s > 0) coverageText += ` (${Math.round((e - s) / 60)} hours)`
    }

    // Bridal party text
    const bridalPartyText = (bridesmaids || groomsmen)
      ? `${bridesmaids || '0'} bridesmaids + ${groomsmen || '0'} groomsmen`
      : ''

    // Vendors text
    const vendorLines: string[] = []
    if (vendors) {
      const labels: Record<string, string> = { dj_mc: 'DJ/MC', florist: 'Florist', makeup: 'Makeup', hair: 'Hair', planner: 'Planner', transport: 'Transport' }
      for (const [k, v] of Object.entries(vendors)) {
        if (v) vendorLines.push(`${labels[k] || k}: ${v}`)
      }
    }

    // 1. Create the call sheet record
    const { data: sheet, error: sheetErr } = await supabase
      .from('crew_call_sheets')
      .insert({ couple_id, notes, sent_at: new Date().toISOString(), sent_by: 'Jean' })
      .select('id')
      .limit(1)

    if (sheetErr || !sheet?.length) {
      return NextResponse.json({ error: 'Failed to create call sheet', detail: sheetErr }, { status: 500 })
    }

    const callSheetId = sheet[0].id

    // 2. Insert crew members
    const memberInserts = crew_members.map(cm => ({
      call_sheet_id: callSheetId,
      team_member_id: cm.team_member_id,
      member_name: cm.member_name,
      member_email: cm.member_email,
      role: cm.role,
      call_time: cm.call_time || null,
      meeting_point: cm.meeting_point || null,
      meeting_point_time: cm.meeting_point_time || null,
      equipment_pickup_location: cm.equipment_pickup_location || null,
      equipment_pickup_time: cm.equipment_pickup_time || null,
      equipment_dropoff_location: cm.equipment_dropoff_location || null,
      equipment_dropoff_time: cm.equipment_dropoff_time || null,
      special_notes: cm.special_notes || null,
    }))

    const { data: insertedMembers, error: memberErr } = await supabase
      .from('crew_call_sheet_members')
      .insert(memberInserts)
      .select('id, member_name, member_email, role, call_time, meeting_point, meeting_point_time, equipment_pickup_location, equipment_pickup_time, equipment_dropoff_location, equipment_dropoff_time, special_notes, confirmation_token')

    if (memberErr || !insertedMembers?.length) {
      return NextResponse.json({ error: 'Failed to insert crew members', detail: memberErr }, { status: 500 })
    }

    // 3. Gather all file attachments from Supabase Storage
    const fileAttachments: { filename: string; content: Buffer }[] = []

    // Legacy: check wedding-day-forms bucket
    try {
      const { data: pdfData, error: pdfErr } = await supabase.storage.from('wedding-day-forms').download(`${couple_id}.pdf`)
      if (!pdfErr && pdfData) {
        fileAttachments.push({
          filename: `Wedding-Day-Form-${couple_name.replace(/\s+/g, '-')}.pdf`,
          content: Buffer.from(await pdfData.arrayBuffer()),
        })
      }
    } catch { /* not found */ }

    // New: wedding-documents bucket
    if (payload.attachments?.length) {
      for (const att of payload.attachments) {
        try {
          const { data: fileData, error: fileErr } = await supabase.storage.from('wedding-documents').download(att.path)
          if (!fileErr && fileData) {
            fileAttachments.push({
              filename: att.filename,
              content: Buffer.from(await fileData.arrayBuffer()),
            })
          }
        } catch { /* skip */ }
      }
    }

    // Maps link helper for crew members
    const crewMapsLink = (cm: CrewMemberPayload) => {
      if (cm.meeting_point_maps_url) return cm.meeting_point_maps_url
      if (cm.meeting_point_address) return mapsUrl(cm.meeting_point_address)
      if (cm.meeting_point) return mapsUrl(cm.meeting_point)
      return ''
    }

    // 4. Send individual emails
    const emailResults: { name: string; success: boolean; error?: string }[] = []

    for (let i = 0; i < insertedMembers.length; i++) {
      const cm = insertedMembers[i]
      const crewPayload = crew_members[i]
      const confirmUrl = `${APP_URL}/api/confirm-crew/${cm.confirmation_token}`
      const mpMapsUrl = crewPayload ? crewMapsLink(crewPayload) : ''

      const vendorList = vendorLines.map(v => {
        const colonIdx = v.indexOf(':')
        return { key: v.substring(0, colonIdx), value: v.substring(colonIdx + 2) }
      })

      const html = buildCrewEmailHtml({
        coupleName: couple_name,
        dateFormatted,
        dayUpper,
        weather,
        ceremonyLocation: ceremony_location,
        receptionVenue: reception_venue,
        parkLocation: park_location,
        coverageText,
        bridalPartyText,
        dressCode: dress_code,
        generalNotes: notes,
        keyMoments: key_moments,
        schedule: schedule || [],
        vendors: vendorList,
        member: {
          name: cm.member_name,
          role: cm.role,
          callTime: cm.call_time || '',
          meetingPoint: cm.meeting_point || '',
          meetingPointMapsUrl: mpMapsUrl,
          specialNotes: cm.special_notes || '',
          equipmentPickup: cm.equipment_pickup_location || '',
          equipmentPickupTime: cm.equipment_pickup_time || '',
          equipmentDropoff: cm.equipment_dropoff_location || '',
          equipmentDropoffTime: cm.equipment_dropoff_time || '',
        },
        confirmUrl,
      })

      const emailPayload: any = {
        from: 'SIGS Photography <noreply@sigsphoto.ca>',
        to: [cm.member_email],
        cc: ['info@sigsphoto.ca'],
        bcc: ['jeanmarcotte@gmail.com'],
        subject: `SIGS Photography — Crew Call Sheet: ${couple_name} — ${subjectDate}`,
        html,
      }

      if (fileAttachments.length) {
        emailPayload.attachments = fileAttachments.map(a => ({ filename: a.filename, content: a.content }))
      }

      try {
        const { error: sendErr } = await getResend().emails.send(emailPayload)
        if (sendErr) {
          emailResults.push({ name: cm.member_name, success: false, error: String(sendErr) })
        } else {
          emailResults.push({ name: cm.member_name, success: true })
          await supabase.from('crew_call_sheet_members').update({ email_sent: true, email_sent_at: new Date().toISOString() }).eq('id', cm.id)
        }
      } catch (err) {
        emailResults.push({ name: cm.member_name, success: false, error: String(err) })
      }
    }

    // 5. Summary email to Marianna
    const summaryRows = insertedMembers.map(cm => {
      const isLead = (cm.role || '').toLowerCase().includes('lead')
      let confirmedCell = '⏳ Pending'
      if (isLead) {
        confirmedCell = '—'
      }
      return `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #ccfbf1;font-size:14px;font-weight:600;color:#1a1a1a;">${esc(cm.member_name)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #ccfbf1;font-size:14px;color:#374151;">${esc(cm.role)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #ccfbf1;font-size:14px;color:#374151;">${cm.call_time ? esc(cm.call_time) : '—'}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #ccfbf1;font-size:14px;color:#374151;">${cm.meeting_point ? esc(cm.meeting_point) : '—'}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #ccfbf1;font-size:14px;color:#374151;">${confirmedCell}</td>
      </tr>`
    }).join('')

    // Look up confirmation statuses for all crew members on this call sheet
    const { data: confirmData } = await supabase
      .from('crew_call_sheet_members')
      .select('member_name, confirmed, confirmed_at')
      .eq('call_sheet_id', callSheetId)

    const confirmMap = new Map<string, { confirmed: boolean; confirmed_at: string | null }>()
    if (confirmData) {
      for (const row of confirmData) {
        confirmMap.set(row.member_name, { confirmed: row.confirmed, confirmed_at: row.confirmed_at })
      }
    }

    const summaryHtml = `
<div style="font-family:'Trebuchet MS',sans-serif;max-width:640px;margin:0 auto;background:#ffffff;">
  <div style="background:#0d9488;padding:24px 28px;border-radius:8px 8px 0 0;">
    <p style="margin:0;font-family:Georgia,serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.7);">SIGS Photography</p>
    <h1 style="margin:6px 0 0;font-family:Georgia,serif;font-size:22px;color:#ffffff;">Crew Call Sheet Sent</h1>
  </div>
  <div style="padding:24px 28px;border:1px solid #ccfbf1;border-top:none;border-radius:0 0 8px 8px;">
    <p style="font-size:15px;font-weight:700;color:#1a1a1a;margin:0 0 4px;">${esc(couple_name)}</p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 20px;">${dayUpper}, ${esc(dateFormatted)}</p>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#f0fdfa;">
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#0d9488;border-bottom:2px solid #ccfbf1;">Name</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#0d9488;border-bottom:2px solid #ccfbf1;">Role</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#0d9488;border-bottom:2px solid #ccfbf1;">Call Time</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#0d9488;border-bottom:2px solid #ccfbf1;">Meeting Point</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#0d9488;border-bottom:2px solid #ccfbf1;">Confirmed</th>
      </tr></thead>
      <tbody>${summaryRows}</tbody>
    </table>
    ${dress_code ? `<p style="margin:16px 0 0;font-size:14px;font-weight:700;color:#1a1a1a;">👔 Dress Code: ${esc(dress_code)}</p>` : ''}
    ${notes ? `<div style="margin-top:12px;padding:12px;background:#f0fdfa;border-radius:8px;border:1px solid #ccfbf1;"><p style="margin:0;font-size:13px;color:#374151;"><strong>Notes:</strong> ${esc(notes)}</p></div>` : ''}
    <p style="margin:20px 0 0;font-size:13px;color:#0d9488;">Sent by Jean via StudioFlow</p>
  </div>
</div>`

    try {
      await getResend().emails.send({
        from: 'SIGS Photography <noreply@sigsphoto.ca>',
        to: ['jeanmarcotte@gmail.com', 'info@sigsphoto.ca'],
        subject: `SIGS Photography — Crew Call Sheet Sent: ${couple_name} — ${subjectDate}`,
        html: summaryHtml,
      })
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true, call_sheet_id: callSheetId, emails: emailResults })
  } catch (err) {
    console.error('[crew-call-sheet] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
