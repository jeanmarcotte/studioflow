/**
 * Shared time formatting and parsing utilities for wedding day form data.
 * Used by the view page, PDF endpoint, and team notification emails.
 */

/** Normalize a single time token (no ranges) into "H:MM AM/PM" */
function formatSingleTime(raw: string, hint: 'am' | 'pm' | 'auto'): string {
  const s = raw.trim()
  if (!s) return ''

  const ampmMatch = s.match(/([ap])\.?\s*m\.?/i)
  let period = ampmMatch
    ? (ampmMatch[0].replace(/[\s.]/g, '').toUpperCase().startsWith('A') ? 'AM' : 'PM')
    : ''

  const numeric = s.replace(/\s*[ap]\.?\s*m\.?/gi, '').trim()

  let hour: number, minute: number
  if (numeric.includes(':')) {
    const [h, m] = numeric.split(':')
    hour = parseInt(h, 10)
    minute = parseInt(m, 10) || 0
  } else {
    hour = parseInt(numeric, 10)
    minute = 0
  }
  if (isNaN(hour)) return s

  if (!period) {
    if (hint === 'am') period = 'AM'
    else if (hint === 'pm') period = 'PM'
    else period = (hour >= 8 && hour <= 11) ? 'AM' : 'PM'
  }

  return `${hour}:${minute.toString().padStart(2, '0')} ${period}`
}

/**
 * Format a time string that may contain ranges ("3:45-4PM") into clean display.
 * hint provides context for AM/PM inference when the bride didn't type it.
 */
export function formatTime(raw: string | null | undefined, hint: 'am' | 'pm' | 'auto' = 'auto'): string {
  if (!raw) return ''
  const s = raw.trim()

  const rangeSep = s.match(/\s*[-–]\s*/)
  if (rangeSep && rangeSep.index !== undefined) {
    const left = s.slice(0, rangeSep.index)
    const right = s.slice(rangeSep.index + rangeSep[0].length)
    const rightFormatted = formatSingleTime(right, hint)
    const rightPeriod = rightFormatted.includes('PM') ? 'pm' : rightFormatted.includes('AM') ? 'am' : hint
    const leftFormatted = formatSingleTime(left, rightPeriod as 'am' | 'pm' | 'auto')
    return `${leftFormatted} – ${rightFormatted}`
  }

  return formatSingleTime(s, hint)
}

/** Parse a time string to minutes since midnight. Returns null if unparseable. */
export function parseTimeToMinutes(raw: string | null | undefined, hint: 'am' | 'pm' | 'auto' = 'auto'): number | null {
  if (!raw) return null
  const formatted = formatTime(raw, hint)
  const first = formatted.split('–')[0].trim()
  const match = first.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) return null
  let hour = parseInt(match[1], 10)
  const min = parseInt(match[2], 10)
  const p = match[3].toUpperCase()
  if (p === 'PM' && hour !== 12) hour += 12
  if (p === 'AM' && hour === 12) hour = 0
  return hour * 60 + min
}

/** Parse the LAST time in a range for end-time duration calc. */
export function parseEndTimeToMinutes(raw: string | null | undefined, hint: 'am' | 'pm' | 'auto' = 'auto'): number | null {
  if (!raw) return null
  const formatted = formatTime(raw, hint)
  const parts = formatted.split('–')
  const last = parts[parts.length - 1].trim()
  const match = last.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) return null
  let hour = parseInt(match[1], 10)
  const min = parseInt(match[2], 10)
  const p = match[3].toUpperCase()
  if (p === 'PM' && hour !== 12) hour += 12
  if (p === 'AM' && hour === 12) hour = 0
  return hour * 60 + min
}

/** Format minutes since midnight to "H:MM AM/PM" */
export function minutesToDisplay(totalMin: number): string {
  // Handle next-day times (> 1440)
  const normalized = totalMin % 1440
  const h24 = Math.floor(normalized / 60)
  const m = normalized % 60
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 > 12 ? h24 - 12 : (h24 === 0 ? 12 : h24)
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

/**
 * Calculate hours validation for a wedding day form.
 * Returns contracted hours, actual span, and any overage.
 */
export function calculateHoursValidation(form: {
  groom_start_time?: string | null
  bride_start_time?: string | null
  venue_arrival_time?: string | null
  reception_finish_time?: string | null
  photo_video_end_time?: string | null
  hours_in_contract?: number | null
}) {
  const startCandidates = [
    parseTimeToMinutes(form.groom_start_time, 'am'),
    parseTimeToMinutes(form.bride_start_time, 'auto'),
    parseTimeToMinutes(form.venue_arrival_time, 'auto'),
  ].filter((v): v is number => v !== null)

  const endCandidatesRaw = [
    parseEndTimeToMinutes(form.reception_finish_time, 'pm'),
    parseEndTimeToMinutes(form.photo_video_end_time, 'pm'),
  ].filter((v): v is number => v !== null)

  const earliestMin = startCandidates.length > 0 ? Math.min(...startCandidates) : null
  // If an end time is AM (before 6 AM / 360 min), treat as next day
  const endCandidates = endCandidatesRaw.map(m => m < 360 ? m + 1440 : m)
  const latestMin = endCandidates.length > 0 ? Math.max(...endCandidates) : null

  if (earliestMin === null || latestMin === null) {
    return { contracted: form.hours_in_contract ?? null, actualHours: null, earliestFmt: '', latestFmt: '', exceedsBy: null }
  }

  const actualHours = Math.round((latestMin - earliestMin) / 60 * 10) / 10
  const earliestFmt = minutesToDisplay(earliestMin)
  const latestFmt = minutesToDisplay(latestMin)
  const exceedsBy = (form.hours_in_contract && actualHours > form.hours_in_contract)
    ? Math.ceil(actualHours - form.hours_in_contract)
    : null

  return { contracted: form.hours_in_contract ?? null, actualHours, earliestFmt, latestFmt, exceedsBy }
}

/**
 * Build the schedule rows for the Quick Overview.
 */
export function buildScheduleRows(form: {
  venue_arrival_time?: string | null
  photo_video_end_time?: string | null
  hours_in_contract?: number | null
  groom_start_time?: string | null
  groom_finish_time?: string | null
  groom_address?: string | null
  groom_city?: string | null
  bride_start_time?: string | null
  bride_finish_time?: string | null
  bride_address?: string | null
  bride_city?: string | null
  has_first_look?: boolean | null
  first_look_time?: string | null
  first_look_location_name?: string | null
  ceremony_start_time?: string | null
  ceremony_finish_time?: string | null
  ceremony_location_name?: string | null
  park_start_time?: string | null
  park_finish_time?: string | null
  park_name?: string | null
  reception_start_time?: string | null
  reception_finish_time?: string | null
  reception_venue_name?: string | null
}): { time: string; event: string; location: string }[] {
  const rows: { time: string; event: string; location: string }[] = []

  const arrivalFmt = formatTime(form.venue_arrival_time, 'auto')
  const endFmt = formatTime(form.photo_video_end_time, 'pm')
  if (arrivalFmt || endFmt) {
    const contractTime = [arrivalFmt, endFmt].filter(Boolean).join(' → ')
    const hoursNote = form.hours_in_contract ? ` (${form.hours_in_contract}h)` : ''
    rows.push({ time: contractTime + hoursNote, event: 'Photo / Video', location: '' })
  }

  const groomStart = formatTime(form.groom_start_time, 'am')
  const groomEnd = formatTime(form.groom_finish_time, 'am')
  if (groomStart || groomEnd) {
    rows.push({
      time: [groomStart, groomEnd].filter(Boolean).join(' → '),
      event: 'Groom Prep',
      location: [form.groom_address, form.groom_city].filter(Boolean).join(', ').trim(),
    })
  }

  const brideStart = formatTime(form.bride_start_time, 'auto')
  const brideEnd = formatTime(form.bride_finish_time, 'pm')
  if (brideStart || brideEnd) {
    rows.push({
      time: [brideStart, brideEnd].filter(Boolean).join(' → '),
      event: 'Bride Prep',
      location: [form.bride_address, form.bride_city].filter(Boolean).join(', ').trim(),
    })
  }

  if (form.has_first_look && form.first_look_time) {
    rows.push({
      time: formatTime(form.first_look_time, 'pm'),
      event: 'First Look',
      location: form.first_look_location_name || '',
    })
  }

  const ceremonyStart = formatTime(form.ceremony_start_time, 'pm')
  const ceremonyEnd = formatTime(form.ceremony_finish_time, 'pm')
  if (ceremonyStart || ceremonyEnd) {
    rows.push({
      time: [ceremonyStart, ceremonyEnd].filter(Boolean).join(' → '),
      event: 'Ceremony',
      location: form.ceremony_location_name || '',
    })
  }

  const parkStart = formatTime(form.park_start_time, 'pm')
  const parkEnd = formatTime(form.park_finish_time, 'pm')
  if (parkStart || parkEnd) {
    rows.push({
      time: [parkStart, parkEnd].filter(Boolean).join(' → '),
      event: 'Photos',
      location: form.park_name || '',
    })
  }

  const recStart = formatTime(form.reception_start_time, 'pm')
  const recEnd = formatTime(form.reception_finish_time, 'pm')
  if (recStart || recEnd) {
    rows.push({
      time: [recStart, recEnd].filter(Boolean).join(' → '),
      event: 'Reception',
      location: form.reception_venue_name || '',
    })
  }

  return rows
}
