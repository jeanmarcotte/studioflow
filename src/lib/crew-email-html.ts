// Shared HTML builder for crew call sheet emails
// Used by both the preview modal and the send API route

export interface CrewEmailData {
  coupleName: string
  dateFormatted: string
  dayUpper: string
  weather: string
  ceremonyLocation: string
  receptionVenue: string
  parkLocation: string
  coverageText: string
  bridalPartyText: string
  dressCode: string
  generalNotes: string
  keyMoments: string
  schedule: { time: string; label: string; address: string; maps_url: string }[]
  vendors: { key: string; value: string }[]
  member: {
    name: string
    role: string
    callTime: string
    meetingPoint: string
    meetingPointMapsUrl: string
    specialNotes: string
    equipmentPickup: string
    equipmentPickupTime: string
    equipmentDropoff: string
    equipmentDropoffTime: string
  }
  confirmUrl: string | null // null for preview
}

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export function buildCrewEmailHtml(data: CrewEmailData): string {
  const {
    coupleName, dateFormatted, dayUpper, weather,
    ceremonyLocation, receptionVenue, parkLocation,
    coverageText, bridalPartyText, dressCode, generalNotes, keyMoments,
    schedule, vendors, member, confirmUrl,
  } = data

  const weatherHtml = weather ? `
    <tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Weather</td><td style="padding:4px 0;font-size:14px;color:#374151;">${esc(weather)}</td></tr>` : ''

  const bridalPartyHtml = bridalPartyText ? `
    <tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Bridal Party</td><td style="padding:4px 0;font-size:14px;color:#374151;">${esc(bridalPartyText)}</td></tr>` : ''

  const dressCodeHtml = dressCode ? `
    <tr><td colspan="2" style="padding:12px 0 8px;">
      <div style="background:#faf8f5;border-radius:6px;padding:10px 14px;border:1px solid #e7e1d8;">
        <p style="margin:0;font-size:15px;font-weight:700;color:#1a1a1a;">👔 DRESS CODE: ${esc(dressCode)}</p>
      </div>
    </td></tr>` : ''

  const vendorLines = vendors.filter(v => v.value).map(v => `${v.key}: ${v.value}`)
  const vendorsHtml = vendorLines.length ? `
    <tr><td colspan="2" style="padding:12px 0 4px;">
      <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0d4f4f;">Key Vendors</p>
      ${vendorLines.map(v => `<p style="margin:2px 0;font-size:13px;color:#374151;">${esc(v)}</p>`).join('')}
    </td></tr>` : ''

  const keyMomentsHtml = keyMoments ? `
    <tr><td colspan="2" style="padding:12px 0 8px;">
      <div style="background:#fffbeb;border-radius:6px;padding:10px 14px;border:1px solid #fde68a;">
        <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#92400e;">📸 Must-Capture Moments</p>
        ${esc(keyMoments).split('\n').filter(Boolean).map(line => `<p style="margin:2px 0;font-size:14px;color:#374151;">• ${line.replace(/^[-•]\s*/, '')}</p>`).join('')}
      </div>
    </td></tr>` : ''

  const generalNotesHtml = generalNotes ? `
    <tr><td colspan="2" style="padding:12px 0 8px;">
      <div style="border-top:2px solid #e7e1d8;padding-top:12px;">
        <p style="margin:0 0 8px;font-family:Georgia,serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0d4f4f;">General Notes</p>
        <p style="margin:0;font-size:14px;color:#374151;">${esc(generalNotes)}</p>
      </div>
    </td></tr>` : ''

  const notesHtml = member.specialNotes ? `
    <tr><td colspan="2" style="padding:8px 0;">
      <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0d4f4f;">Notes</p>
      <p style="margin:0;font-size:14px;color:#374151;">${esc(member.specialNotes)}</p>
    </td></tr>` : ''

  const equipmentHtml = (member.equipmentPickup || member.equipmentDropoff) ? `
    <tr><td colspan="2" style="padding:16px 0 8px;">
      <div style="border-top:2px solid #e7e1d8;padding-top:12px;">
        <p style="margin:0 0 8px;font-family:Georgia,serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0d4f4f;">Equipment</p>
        ${member.equipmentPickup ? `<p style="margin:4px 0;font-size:14px;color:#374151;"><strong>Pickup:</strong> ${esc(member.equipmentPickup)}${member.equipmentPickupTime ? ` — ${esc(member.equipmentPickupTime)}` : ''}</p>` : ''}
        ${member.equipmentDropoff ? `<p style="margin:4px 0;font-size:14px;color:#374151;"><strong>Dropoff:</strong> ${esc(member.equipmentDropoff)}${member.equipmentDropoffTime ? ` — ${esc(member.equipmentDropoffTime)}` : ''}</p>` : ''}
      </div>
    </td></tr>` : ''

  const scheduleHtml = schedule.length ? `
    <tr><td colspan="2" style="padding:16px 0 8px;">
      <div style="border-top:2px solid #e7e1d8;padding-top:12px;">
        <p style="margin:0 0 12px;font-family:Georgia,serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#0d4f4f;">Wedding Day Schedule</p>
        ${schedule.map(evt => `
          <div style="margin-bottom:12px;padding-left:12px;border-left:3px solid #0d4f4f;">
            <p style="margin:0;font-size:14px;">
              ${evt.time ? `<span style="font-family:'Courier New',monospace;font-weight:700;color:#0d4f4f;">⏰ ${esc(evt.time)}</span> &mdash; ` : ''}
              <strong>${esc(evt.label)}</strong>
            </p>
            ${evt.address ? `<p style="margin:2px 0 0;font-size:13px;color:#374151;">📍 ${esc(evt.address)}</p>` : ''}
            ${evt.maps_url ? `<p style="margin:2px 0 0;"><a href="${evt.maps_url}" style="color:#0d4f4f;text-decoration:underline;font-weight:600;font-size:13px;">🗺️ Open in Google Maps</a></p>` : ''}
          </div>
        `).join('')}
      </div>
    </td></tr>` : ''

  const confirmHtml = confirmUrl
    ? `<a href="${confirmUrl}" style="display:inline-block;padding:14px 40px;background:#0d4f4f;color:#ffffff;font-family:Georgia,serif;font-size:16px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.5px;">✅ Click Here to Confirm</a>`
    : `<span style="display:inline-block;padding:14px 40px;background:#0d4f4f;color:#ffffff;font-family:Georgia,serif;font-size:16px;font-weight:700;border-radius:8px;letter-spacing:0.5px;">✅ Click Here to Confirm</span>`

  return `
<div style="font-family:'Trebuchet MS',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:#0d4f4f;padding:24px 28px;border-radius:8px 8px 0 0;">
    <p style="margin:0;font-family:Georgia,serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.7);">SIGS Photography</p>
    <h1 style="margin:6px 0 0;font-family:Georgia,serif;font-size:22px;color:#ffffff;">Crew Call Sheet</h1>
  </div>

  <div style="padding:24px 28px;border:1px solid #e7e1d8;border-top:none;border-radius:0 0 8px 8px;">
    <!-- Jean's phone — TOP -->
    <div style="background:#e6f4f1;border-radius:6px;padding:8px 14px;margin-bottom:16px;text-align:center;">
      <p style="margin:0;font-size:14px;font-weight:700;color:#0d4f4f;">📞 Questions? Call Jean: (416) 731-6748</p>
    </div>

    <!-- Wedding Details -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:4px 0;font-size:14px;color:#6b7280;width:100px;">Couple</td><td style="padding:4px 0;font-size:14px;font-weight:700;color:#1a1a1a;">${esc(coupleName)}</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Date</td><td style="padding:4px 0;font-size:14px;font-weight:700;color:#1a1a1a;">${dayUpper}, ${esc(dateFormatted)}</td></tr>
      ${weatherHtml}
      ${ceremonyLocation ? `<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Ceremony</td><td style="padding:4px 0;font-size:14px;color:#374151;">${esc(ceremonyLocation)} <a href="${mapsUrl(ceremonyLocation)}" style="color:#0d4f4f;text-decoration:underline;font-weight:600;font-size:13px;">📍 Open in Google Maps</a></td></tr>` : ''}
      ${receptionVenue ? `<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Reception</td><td style="padding:4px 0;font-size:14px;color:#374151;">${esc(receptionVenue)} <a href="${mapsUrl(receptionVenue)}" style="color:#0d4f4f;text-decoration:underline;font-weight:600;font-size:13px;">📍 Open in Google Maps</a></td></tr>` : ''}
      ${parkLocation ? `<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Park</td><td style="padding:4px 0;font-size:14px;color:#374151;">${esc(parkLocation)} <a href="${mapsUrl(parkLocation)}" style="color:#0d4f4f;text-decoration:underline;font-weight:600;font-size:13px;">📍 Open in Google Maps</a></td></tr>` : ''}
      ${coverageText ? `<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Coverage</td><td style="padding:4px 0;font-size:14px;color:#374151;">${esc(coverageText)}</td></tr>` : ''}
      ${bridalPartyHtml}
    </table>

    <!-- Divider -->
    <div style="border-top:3px solid #0d4f4f;margin:20px 0;"></div>

    <!-- Assignment -->
    <table style="width:100%;border-collapse:collapse;">
      <tr><td colspan="2" style="padding:0 0 12px;">
        <p style="margin:0;font-family:Georgia,serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#0d4f4f;">Your Assignment</p>
      </td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#6b7280;width:120px;">Name</td><td style="padding:4px 0;font-size:14px;font-weight:700;color:#1a1a1a;">${esc(member.name)}</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Role</td><td style="padding:4px 0;font-size:14px;font-weight:700;color:#1a1a1a;">${esc(member.role)}</td></tr>
      ${member.callTime ? `<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Meet Jean at:</td><td style="padding:4px 0;font-size:14px;font-weight:700;color:#1a1a1a;">${esc(member.callTime)}</td></tr>` : ''}
      ${member.meetingPoint ? `
      <tr><td colspan="2" style="padding:12px 0 4px;">
        <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0d4f4f;">Meeting Point</p>
        <p style="margin:0;font-size:14px;color:#374151;">📍 ${esc(member.meetingPoint)}</p>
        ${member.meetingPointMapsUrl ? `<p style="margin:4px 0 0;"><a href="${member.meetingPointMapsUrl}" style="color:#0d4f4f;text-decoration:underline;font-weight:600;font-size:13px;">📍 Open in Google Maps</a></p>` : ''}
        ${member.callTime ? `<p style="margin:4px 0 0;font-size:14px;color:#374151;font-weight:600;">⏰ Arrive by ${esc(member.callTime)}</p>` : ''}
      </td></tr>` : ''}
      ${equipmentHtml}
      ${notesHtml}
      ${scheduleHtml}
      ${dressCodeHtml}
      ${vendorsHtml}
      ${keyMomentsHtml}
      ${generalNotesHtml}
    </table>

    <!-- Confirm Button -->
    <div style="text-align:center;margin:28px 0 16px;">
      ${confirmHtml}
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #e7e1d8;padding-top:16px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#6b7280;">📞 Questions? Call Jean: (416) 731-6748</p>
    </div>
  </div>
</div>`
}
