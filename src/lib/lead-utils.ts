// Lead scoring utilities — colors, temperatures, formatters
import { supabase } from '@/lib/supabase'

export interface Lead {
  id: string
  entity_id: string | null
  bride_first_name: string | null
  bride_last_name: string | null
  groom_first_name: string | null
  groom_last_name: string | null
  venue_name: string | null
  wedding_date: string | null
  cell_phone: string | null
  email: string | null
  status: string
  book_score: number | null
  temperature: string | null
  has_photographer: boolean | null
  has_videographer: boolean | null
  has_venue: boolean | null
  show_id: string | null
  contact_count: number | null
  last_contact_date: string | null
  hidden: boolean | null
  service_needs: string | null
  // Discovery fields
  budget_range: string | null
  inferred_ethnicity: string | null
  want_album: string | null
  want_engagement: string | null
  bridal_party_size: number | null
  multi_day_event: boolean | null
  planner_involved: boolean | null
  venue_type: string | null
  venue_rating: number | null
  referral_source: string | null
  inquiry_depth_score: number | null
  response_speed_hours: number | null
  score_breakdown: any | null
  next_contact_due: string | null
  contact_status: string | null
  reactivation_count: number | null
  reactivated_at: string | null
  lead_source_id: string | null
  inbound_channel: string | null
  referrer_id: string | null
  contacted_at: string | null
  quoted_at: string | null
  appointment_date: string | null
  updated_at: string | null
  created_at: string | null
  culture_confirmed: boolean | null
}

export type FilterKey = 'no-no-yes' | 'no-no-no' | 'contacted' | 'meeting_booked' | 'quoted' | 'booked'

export const SCORE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-400', border: 'border-green-300 dark:border-green-700' },
  B: { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-300 dark:border-teal-700' },
  C: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-300 dark:border-yellow-700' },
  D: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-700' },
  E: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-400', border: 'border-red-300 dark:border-red-700' },
  F: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', border: 'border-gray-300 dark:border-gray-600' },
}

export const SCORE_DOT_COLORS: Record<string, string> = {
  A: '#ef4444',
  B: '#f97316',
  C: '#eab308',
  D: '#eab308',
  E: '#3b82f6',
  F: '#3b82f6',
}

export const TEMP_CONFIG: Record<string, { emoji: string; label: string; color: string; dot: string; pulse: boolean }> = {
  hot:  { emoji: '🔴', label: 'HOT',  color: 'text-red-500', dot: '#ef4444', pulse: true },
  warm: { emoji: '🟡', label: 'WARM', color: 'text-yellow-600', dot: '#ca8a04', pulse: false },
  cool: { emoji: '🟡', label: 'WARM', color: 'text-yellow-600', dot: '#ca8a04', pulse: false },
  cold: { emoji: '🔵', label: 'COLD', color: 'text-blue-500', dot: '#3b82f6', pulse: false },
}

export function getScoreTier(score: number): string {
  if (score >= 165) return 'A'
  if (score >= 150) return 'B'
  if (score >= 135) return 'C'
  if (score >= 120) return 'D'
  if (score >= 105) return 'E'
  return 'F'
}

export function getScoreColors(score: number) {
  return SCORE_COLORS[getScoreTier(score)] || SCORE_COLORS.F
}

export function getTempConfig(temp: string | null) {
  return TEMP_CONFIG[(temp || 'cold').toLowerCase()] || TEMP_CONFIG.cold
}

const SHOW_LABELS: Record<string, string> = {
  'modern-feb-2026': 'Modern Feb 2026',
  'weddingring-oakville-mar-2026': 'WR Oakville Mar 2026',
  'hamilton-ring-mar-2026': 'Hamilton Ring Mar 2026',
}

export function formatShowName(showId: string | null): string {
  if (!showId) return '—'
  return SHOW_LABELS[showId] || showId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export function formatWeddingDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export function coupleName(lead: Lead): string {
  const bride = lead.bride_first_name || ''
  const groom = lead.groom_first_name || ''
  if (bride && groom) return `${bride} & ${groom}`.toUpperCase()
  if (bride) return bride.toUpperCase()
  if (groom) return groom.toUpperCase()
  return 'UNKNOWN'
}

/**
 * Fetch a chase_template by touch number and render variables.
 * chase_templates is the single source of truth for all scripts.
 * Falls back to a generic string only if the DB fetch fails.
 */
export async function getMessageTemplate(
  touchNumber: number = 1,
  lead: Lead
): Promise<string> {
  const bride = lead.bride_first_name || 'there'
  const venue = lead.venue_name || 'your venue'
  const weddingDate = lead.wedding_date || 'your wedding'
  const showName = lead.show_id
    ? (SHOW_LABELS[lead.show_id] || 'the bridal show')
    : 'the bridal show'

  const { data } = await supabase
    .from('chase_templates')
    .select('body')
    .eq('touch_number', touchNumber)
    .eq('is_active', true)
    .limit(1)

  const text = data?.[0]?.body ?? null
  if (!text) return `Hi ${bride}! This is Marianna from SIGS Photography. We'd love to chat about capturing your big day!`

  return text
    .replace(/\{\{bride_name\}\}/g, bride)
    .replace(/\{\{venue_name\}\}/g, venue)
    .replace(/\{\{wedding_date\}\}/g, weddingDate)
    .replace(/\{\{show_name\}\}/g, showName)
    .replace(/\\n/g, '\n')
}

/**
 * Detect duplicate ballots by normalized phone number.
 * Keeps the "best" record (highest status + most data) and flags others as duplicates.
 * Returns the number of newly flagged duplicates.
 */
export async function detectAndFlagDuplicates(): Promise<number> {
  const { data: ballots, error } = await supabase
    .from('ballots')
    .select('id, bride_first_name, bride_last_name, groom_first_name, groom_last_name, cell_phone, email, wedding_date, status, created_at, is_duplicate')
    .not('status', 'in', '("dead")')
    .eq('hidden', false)
    .eq('is_duplicate', false)
    .order('created_at', { ascending: true })

  if (error || !ballots) return 0

  const normalize = (phone: string | null): string => {
    if (!phone) return ''
    return phone.replace(/\D/g, '')
  }

  const phoneGroups: Record<string, typeof ballots> = {}
  for (const b of ballots) {
    const norm = normalize(b.cell_phone)
    if (!norm || norm.length < 7) continue
    if (!phoneGroups[norm]) phoneGroups[norm] = []
    phoneGroups[norm].push(b)
  }

  let flagged = 0
  for (const [, group] of Object.entries(phoneGroups)) {
    if (group.length <= 1) continue

    const scored = group.map(b => ({
      ...b,
      score: (b.email ? 2 : 0)
        + (b.wedding_date ? 1 : 0)
        + (b.groom_first_name ? 1 : 0)
        + (['booked', 'quoted', 'meeting_booked'].includes(b.status) ? 10 : 0)
        + (['contacted'].includes(b.status) ? 3 : 0)
    }))

    scored.sort((a, b) => b.score - a.score || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const keeper = scored[0]
    const dupes = scored.slice(1)

    for (const dupe of dupes) {
      const { error: updateError } = await supabase
        .from('ballots')
        .update({
          is_duplicate: true,
          duplicate_of: keeper.id,
          hidden: true
        })
        .eq('id', dupe.id)

      if (!updateError) flagged++
    }
  }

  return flagged
}
