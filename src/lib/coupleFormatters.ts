// Shared formatters for the couple detail page. Every component on the couple
// page imports from here. No component formats its own values.

const PACKAGE_LABELS: Record<string, string> = {
  photo_video: 'Photo + Video',
  photo_only: 'Photo Only',
  video_only: 'Video Only',
}

export function formatPackageType(type: string | null | undefined): string {
  if (!type) return 'Not specified'
  return PACKAGE_LABELS[type] || type
}

// Time format in the DB is inconsistent: "09:45", "10am", "9:30am", "11:00pm",
// "22:30", or null.
export function parseTime(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null
  const cleaned = timeStr.trim().toLowerCase()

  const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) {
    const h = parseInt(match24[1], 10)
    const m = parseInt(match24[2], 10)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h + m / 60
  }

  const match12 = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i)
  if (match12) {
    let h = parseInt(match12[1], 10)
    const m = match12[2] ? parseInt(match12[2], 10) : 0
    const period = match12[3].toLowerCase()
    if (period === 'pm' && h !== 12) h += 12
    if (period === 'am' && h === 12) h = 0
    return h + m / 60
  }

  return null
}

export function calculateTotalHours(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): number | null {
  if (!startTime || !endTime) return null
  const start = parseTime(startTime)
  const end = parseTime(endTime)
  if (start === null || end === null) return null
  let diff = end - start
  if (diff <= 0) diff += 24
  return diff
}

function hoursLabel(total: number): string {
  return total % 1 === 0 ? `${total}` : `${total.toFixed(1)}`
}

export function formatHoursDisplay(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string {
  if (!startTime || !endTime) return 'Not specified'
  const total = calculateTotalHours(startTime, endTime)
  if (total === null) return `${startTime} – ${endTime}`
  return `${startTime} – ${endTime} (${hoursLabel(total)} hrs)`
}

export function formatTotalHoursOnly(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string {
  const total = calculateTotalHours(startTime, endTime)
  if (total === null) return startTime && endTime ? `${startTime} – ${endTime}` : 'Not specified'
  return `${hoursLabel(total)} hours`
}

export function formatCurrency(
  amount: number | string | null | undefined,
  decimals: number = 0
): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (!Number.isFinite(num)) return '—'
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function formatCoupleName(
  bride: string | null | undefined,
  groom: string | null | undefined
): string {
  if (!bride && !groom) return 'Unknown Couple'
  if (!groom) return bride || 'Unknown'
  if (!bride) return groom
  return `${bride} & ${groom}`
}
