import { format, parseISO } from 'date-fns';

/**
 * SIGS PHOTOGRAPHY — DATE/TIME FORMATTING STANDARD
 *
 * Wedding dates: Always show day of week → "SAT April 3, 2026"
 * Regular dates: "April 3, 2026"
 * Compact dates: "Apr 3, 2026" (for table columns)
 * Times: 24-hour clock → "14:30"
 * Database: YYYY-MM-DD (ISO 8601)
 *
 * RULE: Wedding dates MUST show the day of the week.
 * A couple once told everyone "Sunday Nov 23" — it was Saturday.
 * The DJ and photographer almost didn't show.
 */

function parseDateSafe(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  try {
    if (date instanceof Date) return date;
    return parseISO(date);
  } catch {
    return null;
  }
}

/** Wedding date — ALWAYS includes day of week: "SAT April 3, 2026" */
export function formatWeddingDate(date: string | Date | null | undefined): string {
  const parsed = parseDateSafe(date);
  if (!parsed) return '—';
  return format(parsed, "EEE MMMM d, yyyy").replace(/^(\w{3})/, (m) => m.toUpperCase());
}

/** Regular date — full month name: "April 3, 2026" */
export function formatDate(date: string | Date | null | undefined): string {
  const parsed = parseDateSafe(date);
  if (!parsed) return '—';
  return format(parsed, 'MMMM d, yyyy');
}

/** Compact date — abbreviated month, for table columns: "Apr 3, 2026" */
export function formatDateCompact(date: string | Date | null | undefined): string {
  const parsed = parseDateSafe(date);
  if (!parsed) return '—';
  return format(parsed, 'MMM d, yyyy');
}

/** Time — 24-hour clock, no AM/PM: "14:30" */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '—';
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  try {
    const parsed = parseISO(time);
    return format(parsed, 'HH:mm');
  } catch {
    return time;
  }
}

/**
 * Display a 24h time string cleanly.
 * "00:00" → "00:00 (Midnight)"
 * "12:00" → "12:00 (Noon)"
 * "14:30" → "14:30"
 * null/undefined → ""
 */
export function formatMilitaryTime(time: string | null | undefined): string {
  if (!time) return '';
  const trimmed = time.trim();
  if (trimmed === '00:00') return '00:00 (Midnight)';
  if (trimmed === '12:00') return '12:00 (Noon)';
  return trimmed;
}

/** @deprecated Use formatMilitaryTime instead */
export const formatTime12h = formatMilitaryTime;

/** Date + Time combined: "April 3, 2026 14:30" */
export function formatDateTime(date: string | Date | null | undefined): string {
  const parsed = parseDateSafe(date);
  if (!parsed) return '—';
  return format(parsed, 'MMMM d, yyyy HH:mm');
}

/** Relative date for timeline displays: "Mar 26" */
export function formatTimelineDate(date: string | Date | null | undefined): string {
  const parsed = parseDateSafe(date);
  if (!parsed) return '—';
  return format(parsed, 'MMM d');
}

/** Short wedding date with DOW — "FRI Apr 24": for widget displays */
export function formatWeddingDateShort(date: string | Date | null | undefined): string {
  const parsed = parseDateSafe(date);
  if (!parsed) return '—';
  const dow = format(parsed, 'EEE').toUpperCase();
  const monthDay = format(parsed, 'MMM d');
  return `${dow} ${monthDay}`;
}

/** Package type — "Photo Only" or "Photo + Video" */
export function formatPackage(pkg: string | null | undefined): string {
  if (!pkg) return '—'
  const map: Record<string, string> = {
    photo_only: 'Photo Only',
    photo_video: 'Photo + Video',
  }
  return map[pkg] ?? pkg
}

/** Currency — "$5,300" or "$5,300.00" */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '$0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0';
  return num % 1 === 0
    ? `$${num.toLocaleString('en-CA')}`
    : `$${num.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
