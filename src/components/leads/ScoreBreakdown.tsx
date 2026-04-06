'use client'

import { Badge } from '@/components/ui/badge'
import { getScoreTier, getScoreColors } from '@/lib/lead-utils'

interface ScoreBreakdownProps {
  lead: {
    book_score: number | null
    score_breakdown: any | null
    wedding_date: string | null
    venue_name: string | null
    venue_rating: number | null
    budget_range: string | null
    want_album: string | null
    want_engagement: string | null
    inferred_ethnicity: string | null
    multi_day_event: boolean | null
    planner_involved: boolean | null
    referral_source: string | null
    inquiry_depth_score: number | null
    response_speed_hours: number | null
  }
}

interface ScoreFactor {
  label: string
  points: number
  hint: string | null
}

function calculateTimingScore(lead: ScoreBreakdownProps['lead']): ScoreFactor {
  if (!lead.wedding_date) return { label: 'Timing', points: 0, hint: 'no wedding date' }
  const months = Math.floor((new Date(lead.wedding_date + 'T12:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
  if (months < 6) return { label: 'Timing', points: 15, hint: `wedding in ${months} months` }
  if (months <= 12) return { label: 'Timing', points: 10, hint: `wedding in ${months} months` }
  if (months <= 18) return { label: 'Timing', points: 5, hint: `wedding in ${months} months` }
  return { label: 'Timing', points: 0, hint: `wedding in ${months} months` }
}

function calculateResponseScore(lead: ScoreBreakdownProps['lead']): ScoreFactor {
  const hrs = lead.response_speed_hours
  if (!hrs) return { label: 'Response', points: 0, hint: 'not set' }
  if (hrs < 24) return { label: 'Response', points: 10, hint: `responded in ${hrs}h` }
  if (hrs <= 48) return { label: 'Response', points: 5, hint: `responded in ${hrs}h` }
  return { label: 'Response', points: 0, hint: `responded in ${hrs}h` }
}

function calculateVenueScore(lead: ScoreBreakdownProps['lead']): ScoreFactor {
  const vr = lead.venue_rating
  if (!vr) return { label: 'Venue', points: 0, hint: 'not rated' }
  if (vr >= 9) return { label: 'Venue', points: 15, hint: `${lead.venue_name} = ${vr}/10` }
  if (vr >= 7) return { label: 'Venue', points: 10, hint: `${lead.venue_name} = ${vr}/10` }
  if (vr >= 5) return { label: 'Venue', points: 5, hint: `${lead.venue_name} = ${vr}/10` }
  return { label: 'Venue', points: 0, hint: `${lead.venue_name} = ${vr}/10` }
}

function calculateBudgetScore(lead: ScoreBreakdownProps['lead']): ScoreFactor {
  const b = lead.budget_range
  if (!b) return { label: 'Budget', points: 0, hint: 'not set' }
  if (b === 'over_10k') return { label: 'Budget', points: 10, hint: 'over $10,000' }
  if (b === '7k_10k' || b === '8k_10k') return { label: 'Budget', points: 8, hint: '$7,000–$10,000' }
  if (b === '5k_7k' || b === '6k_8k') return { label: 'Budget', points: 5, hint: '$5,000–$7,000' }
  if (b === '4k_5k' || b === '4k_6k') return { label: 'Budget', points: 3, hint: '$4,000–$5,000' }
  return { label: 'Budget', points: 0, hint: b.replace(/_/g, ' ') }
}

function calculateUpsellScore(lead: ScoreBreakdownProps['lead']): ScoreFactor {
  let pts = 0
  const hints: string[] = []
  if (lead.want_album === 'yes') { pts += 5; hints.push('album') }
  if (lead.want_engagement === 'yes') { pts += 5; hints.push('engagement') }
  if (lead.multi_day_event) { pts += 5; hints.push('multi-day') }
  if (lead.inquiry_depth_score && lead.inquiry_depth_score >= 7) { pts += 5; hints.push('detailed inquiry') }
  if (hints.length === 0) return { label: 'Upsell', points: 0, hint: 'not set' }
  return { label: 'Upsell', points: pts, hint: hints.join(', ') }
}

function calculateEthnicityScore(lead: ScoreBreakdownProps['lead']): ScoreFactor {
  const e = lead.inferred_ethnicity
  if (!e) return { label: 'Ethnicity', points: 0, hint: 'not set' }
  const map: Record<string, number> = {
    italian: 10, portuguese: 10, greek: 8, middle_eastern: 8, south_asian: 8, filipino: 5
  }
  return { label: 'Ethnicity', points: map[e] || 0, hint: e.replace(/_/g, ' ') }
}

function calculateSourceScore(lead: ScoreBreakdownProps['lead']): ScoreFactor {
  let pts = 0
  const hints: string[] = []
  if (lead.referral_source === 'past_client') { pts += 10; hints.push('past client referral') }
  else if (lead.referral_source === 'venue') { pts += 8; hints.push('venue referral') }
  if (lead.planner_involved) { pts += 5; hints.push('planner') }
  if (hints.length === 0) return { label: 'Source', points: 0, hint: 'bridal show' }
  return { label: 'Source', points: pts, hint: hints.join(', ') }
}

export function ScoreBreakdown({ lead }: ScoreBreakdownProps) {
  const factors: ScoreFactor[] = [
    calculateTimingScore(lead),
    calculateResponseScore(lead),
    calculateVenueScore(lead),
    calculateBudgetScore(lead),
    calculateUpsellScore(lead),
    calculateSourceScore(lead),
  ]

  const total = factors.reduce((s, f) => s + f.points, 0)
  const displayScore = lead.book_score ?? total
  const tier = getScoreTier(displayScore)
  const colors = getScoreColors(displayScore)

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <span>📊</span> Score Breakdown
      </h3>

      <div className="space-y-1.5">
        {factors.map(f => (
          <div key={f.label} className={`flex items-center justify-between text-sm ${f.points === 0 ? 'text-muted-foreground/50' : 'text-foreground'}`}>
            <div className="flex items-center gap-2">
              <span className="font-medium w-20">{f.label}</span>
              {f.hint && (
                <span className={`text-xs ${f.points === 0 ? 'text-muted-foreground/40 italic' : 'text-muted-foreground'}`}>
                  ({f.hint})
                </span>
              )}
            </div>
            <span className={`font-bold tabular-nums ${f.points > 0 ? 'text-[#0d4f4f]' : ''}`}>
              +{f.points}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-border/60 pt-2 flex items-center justify-between">
        <span className="text-sm font-bold">TOTAL</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[#0d4f4f]">{displayScore}</span>
          <Badge className={`${colors.bg} ${colors.text} ${colors.border} border font-bold text-xs`}>
            {tier}-TIER
          </Badge>
        </div>
      </div>
    </div>
  )
}
