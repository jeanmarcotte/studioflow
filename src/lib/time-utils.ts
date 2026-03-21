/**
 * Shared time formatting and parsing utilities for wedding day form data.
 * Used by the view page, PDF endpoint, and team notification emails.
 * All times displayed in 24-hour (military) format.
 */

/** Context hint for AM/PM inference when bride omits it */
export type TimeHint = 'prep' | 'ceremony' | 'photos' | 'reception' | 'reception_end' | 'venue_arrival' | 'photo_video_end' | 'auto'

/** Normalize a single time token (no ranges) into "HH:MM" (24h) */
function formatSingleTime(raw: string, hint: TimeHint): string {
  const s = raw.trim()
  if (!s) return ''

  // Check for explicit AM/PM
  const ampmMatch = s.match(/([ap])\.?\s*m\.?/i)
  let explicitPeriod: 'AM' | 'PM' | '' = ''
  if (ampmMatch) {
    explicitPeriod = ampmMatch[0].replace(/[\s.]/g, '').toUpperCase().startsWith('A') ? 'AM' : 'PM'
  }

  // Strip AM/PM to get numeric part
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

  // Already in 24h format (13-23, or 0 without explicit period)
  if (!explicitPeriod && (hour >= 13 || hour === 0)) {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  // Determine period if not explicit
  let period: 'AM' | 'PM'
  if (explicitPeriod) {
    period = explicitPeriod
  } else {
    switch (hint) {
      case 'prep':
      case 'venue_arrival':
        // 7-11 = morning, everything else = afternoon/evening
        period = (hour >= 7 && hour <= 11) ? 'AM' : 'PM'
        break
      case 'ceremony':
      case 'photos':
      case 'reception':
      case 'photo_video_end':
        period = 'PM'
        break
      case 'reception_end':
        // 1-5 = next-day early morning, else PM
        period = (hour >= 1 && hour <= 5) ? 'AM' : 'PM'
        break
      case 'auto':
      default:
        period = (hour >= 7 && hour <= 11) ? 'AM' : 'PM'
        break
    }
  }

  // Convert to 24h
  let h24 = hour
  if (period === 'PM' && hour !== 12) h24 = hour + 12
  if (period === 'AM' && hour === 12) h24 = 0

  return `${h24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

/**
 * Format a time string that may contain ranges ("3:45-4PM") into clean 24h display.
 * hint provides context for AM/PM inference when the bride didn't type it.
 */
export function formatTime(raw: string | null | undefined, hint: TimeHint = 'auto'): string {
  if (!raw) return ''
  const s = raw.trim()

  const rangeSep = s.match(/\s*[-–]\s*/)
  if (rangeSep && rangeSep.index !== undefined) {
    const left = s.slice(0, rangeSep.index)
    const right = s.slice(rangeSep.index + rangeSep[0].length)
    const rightFormatted = formatSingleTime(right, hint)
    const leftFormatted = formatSingleTime(left, hint)
    return `${leftFormatted} – ${rightFormatted}`
  }

  return formatSingleTime(s, hint)
}

/** Parse a time string to minutes since midnight. Returns null if unparseable. */
export function parseTimeToMinutes(raw: string | null | undefined, hint: TimeHint = 'auto'): number | null {
  if (!raw) return null
  const formatted = formatTime(raw, hint)
  const first = formatted.split('–')[0].trim()
  const match = first.match(/(\d{2}):(\d{2})/)
  if (!match) return null
  const hour = parseInt(match[1], 10)
  const min = parseInt(match[2], 10)
  return hour * 60 + min
}

/** Parse the LAST time in a range for end-time duration calc. */
export function parseEndTimeToMinutes(raw: string | null | undefined, hint: TimeHint = 'auto'): number | null {
  if (!raw) return null
  const formatted = formatTime(raw, hint)
  const parts = formatted.split('–')
  const last = parts[parts.length - 1].trim()
  const match = last.match(/(\d{2}):(\d{2})/)
  if (!match) return null
  const hour = parseInt(match[1], 10)
  const min = parseInt(match[2], 10)
  return hour * 60 + min
}

/** Format minutes since midnight to "HH:MM" (24h) */
export function minutesToDisplay(totalMin: number): string {
  const normalized = totalMin % 1440
  const h24 = Math.floor(normalized / 60)
  const m = normalized % 60
  return `${h24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/**
 * Calculate hours validation for a wedding day form.
 * Returns contracted hours, actual span, and any overage.
 */
export function calculateHoursValidation(
  form: {
    groom_start_time?: string | null
    bride_start_time?: string | null
    venue_arrival_time?: string | null
    reception_finish_time?: string | null
    photo_video_end_time?: string | null
    hours_in_contract?: number | null
  },
  contract?: { start_time?: string | null; end_time?: string | null } | null
) {
  const startCandidates = [
    parseTimeToMinutes(form.groom_start_time, 'prep'),
    parseTimeToMinutes(form.bride_start_time, 'prep'),
    parseTimeToMinutes(form.venue_arrival_time, 'venue_arrival'),
  ].filter((v): v is number => v !== null)

  const endCandidatesRaw = [
    parseEndTimeToMinutes(form.reception_finish_time, 'reception_end'),
    parseEndTimeToMinutes(form.photo_video_end_time, 'photo_video_end'),
  ].filter((v): v is number => v !== null)

  const earliestMin = startCandidates.length > 0 ? Math.min(...startCandidates) : null
  // If an end time is before 6 AM (360 min), treat as next day
  const endCandidates = endCandidatesRaw.map(m => m < 360 ? m + 1440 : m)
  const latestMin = endCandidates.length > 0 ? Math.max(...endCandidates) : null

  // Contract hours from contracts table (source of truth)
  let contractedHours: number | null = null
  let contractStartFmt = ''
  let contractEndFmt = ''

  if (contract?.start_time && contract?.end_time) {
    const [sh, sm] = contract.start_time.split(':').map(Number)
    const [ehRaw, em] = contract.end_time.split(':').map(Number)
    // If end hour < start hour, it's PM — add 12
    const eh = ehRaw < sh ? ehRaw + 12 : ehRaw
    const startMin = sh * 60 + (sm || 0)
    const endMin = eh * 60 + (em || 0)
    contractedHours = Math.round((endMin - startMin) / 60 * 10) / 10
    contractStartFmt = minutesToDisplay(startMin)
    contractEndFmt = minutesToDisplay(endMin)
  }

  // Fall back to bride's form input if no contract data
  const contracted = contractedHours ?? form.hours_in_contract ?? null

  // Contract start/end in minutes for alert computation
  let contractStartMin: number | null = null
  let contractEndMin: number | null = null
  if (contract?.start_time && contract?.end_time) {
    const [csh, csm] = contract.start_time.split(':').map(Number)
    const [cehRaw, cem] = contract.end_time.split(':').map(Number)
    const ceh = cehRaw < csh ? cehRaw + 12 : cehRaw
    contractStartMin = csh * 60 + (csm || 0)
    contractEndMin = ceh * 60 + (cem || 0)
  }

  if (earliestMin === null || latestMin === null) {
    return { contracted, contractStartFmt, contractEndFmt, actualHours: null, earliestFmt: '', latestFmt: '', exceedsBy: null, contractStartMin, contractEndMin, startsBeforeBy: null, endsAfterBy: null }
  }

  const actualHours = Math.round((latestMin - earliestMin) / 60 * 10) / 10
  const earliestFmt = minutesToDisplay(earliestMin)
  const latestFmt = minutesToDisplay(latestMin)
  const exceedsBy = (contracted && actualHours > contracted)
    ? Math.ceil(actualHours - contracted)
    : null

  // Granular alerts: how many minutes the schedule starts before / ends after contract
  const startsBeforeBy = contractStartMin !== null && earliestMin < contractStartMin
    ? contractStartMin - earliestMin
    : null
  const endsAfterBy = contractEndMin !== null && latestMin > contractEndMin
    ? latestMin - contractEndMin
    : null

  return { contracted, contractStartFmt, contractEndFmt, actualHours, earliestFmt, latestFmt, exceedsBy, contractStartMin, contractEndMin, startsBeforeBy, endsAfterBy }
}

/**
 * Build the schedule rows for the Quick Overview.
 */
export function buildScheduleRows(form: {
  venue_arrival_time?: string | null
  photo_video_end_time?: string | null
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
}, packageType?: string | null): { time: string; event: string; location: string }[] {
  const rows: { time: string; event: string; location: string }[] = []

  const arrivalFmt = formatTime(form.venue_arrival_time, 'venue_arrival')
  const endFmt = formatTime(form.photo_video_end_time, 'photo_video_end')
  if (arrivalFmt || endFmt) {
    const coverageLabel = packageType === 'photo_only' ? '\u{1F4F7} Photography' : '\u{1F4F7}\u{1F3A5} Photo & Video'
    rows.push({ time: [arrivalFmt, endFmt].filter(Boolean).join(' \u2192 '), event: coverageLabel, location: '' })
  }

  const groomStart = formatTime(form.groom_start_time, 'prep')
  const groomEnd = formatTime(form.groom_finish_time, 'prep')
  if (groomStart || groomEnd) {
    rows.push({
      time: [groomStart, groomEnd].filter(Boolean).join(' \u2192 '),
      event: 'Groom Prep',
      location: [form.groom_address, form.groom_city].filter(Boolean).join(', ').trim(),
    })
  }

  const brideStart = formatTime(form.bride_start_time, 'prep')
  const brideEnd = formatTime(form.bride_finish_time, 'prep')
  if (brideStart || brideEnd) {
    rows.push({
      time: [brideStart, brideEnd].filter(Boolean).join(' \u2192 '),
      event: 'Bride Prep',
      location: [form.bride_address, form.bride_city].filter(Boolean).join(', ').trim(),
    })
  }

  if (form.has_first_look && form.first_look_time) {
    rows.push({
      time: formatTime(form.first_look_time, 'ceremony'),
      event: 'First Look',
      location: form.first_look_location_name || '',
    })
  }

  const ceremonyStart = formatTime(form.ceremony_start_time, 'ceremony')
  const ceremonyEnd = formatTime(form.ceremony_finish_time, 'ceremony')
  if (ceremonyStart || ceremonyEnd) {
    rows.push({
      time: [ceremonyStart, ceremonyEnd].filter(Boolean).join(' \u2192 '),
      event: 'Ceremony',
      location: form.ceremony_location_name || '',
    })
  }

  const parkStart = formatTime(form.park_start_time, 'photos')
  const parkEnd = formatTime(form.park_finish_time, 'photos')
  if (parkStart || parkEnd) {
    rows.push({
      time: [parkStart, parkEnd].filter(Boolean).join(' \u2192 '),
      event: 'Photos',
      location: form.park_name || '',
    })
  }

  const recStart = formatTime(form.reception_start_time, 'reception')
  const recEnd = formatTime(form.reception_finish_time, 'reception_end')
  if (recStart || recEnd) {
    rows.push({
      time: [recStart, recEnd].filter(Boolean).join(' \u2192 '),
      event: 'Reception',
      location: form.reception_venue_name || '',
    })
  }

  return rows
}
