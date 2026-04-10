'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { ScoreBar } from './ScoreBar'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Lead } from '@/lib/lead-utils'
import {
  getScoreTier,
  getScoreColors,
  getTempConfig,
  formatShowName,
  formatWeddingDate,
  coupleName,
  SCORE_DOT_COLORS,
} from '@/lib/lead-utils'

const CULTURE_BUTTONS = [
  { value: 'portuguese', emoji: '🇵🇹', label: 'Portuguese', points: 30 },
  { value: 'greek', emoji: '🇬🇷', label: 'Greek', points: 30 },
  { value: 'italian', emoji: '🇮🇹', label: 'Italian', points: 30 },
  { value: 'filipino', emoji: '🇵🇭', label: 'Filipino', points: 30 },
  { value: 'jewish', emoji: '🇮🇱', label: 'Jewish', points: 25 },
  { value: 'caribbean', emoji: '🇹🇹', label: 'Caribbean', points: 24 },
  { value: 'ghanaian', emoji: '🇬🇭', label: 'Ghanaian', points: 24 },
  { value: 'jamaican', emoji: '🇯🇲', label: 'Jamaican', points: 24 },
  { value: 'spanish', emoji: '🇪🇸', label: 'Spanish', points: 16 },
  { value: 'canadian', emoji: '🇨🇦', label: 'Canadian', points: 10 },
]

const CULTURE_FLAGS: Record<string, string> = {
  'portuguese': '🇵🇹',
  'greek': '🇬🇷',
  'italian': '🇮🇹',
  'filipino': '🇵🇭',
  'jewish': '🇮🇱',
  'caribbean': '🇹🇹',
  'trinidadian': '🇹🇹',
  'ghanaian': '🇬🇭',
  'jamaican': '🇯🇲',
  'spanish': '🇪🇸',
  'mexican': '🇪🇸',
  'venezuelan': '🇪🇸',
  'colombian': '🇪🇸',
  'canadian': '🇨🇦',
}

const CHANNEL_ICONS: Record<string, string> = {
  ballot: '📋',
  website: '🌐',
  instagram_dm: '📸',
  facebook_dm: '👥',
  email: '✉️',
  phone: '📞',
  referral: '🤝',
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'NEW' },
  contacted: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-400', label: 'CONTACTED' },
  meeting_booked: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-400', label: 'APPT' },
  quoted: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-400', label: 'QUOTED' },
  booked: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-400', label: 'BOOKED ✓' },
  dead: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-400', label: 'LOST' },
  lost: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-400', label: 'LOST' },
}

function daysBetween(from: string | Date, to: Date): number {
  const start = typeof from === 'string' ? new Date(from) : from
  return Math.floor((to.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

interface LeadCardProps {
  lead: Lead
  onHide: (id: string) => void
  onEmailClick: (lead: Lead) => void
  onCardClick: (lead: Lead) => void
  onLeadUpdate?: (updated: Lead) => void
}

export function LeadCard({ lead, onHide, onEmailClick, onCardClick, onLeadUpdate }: LeadCardProps) {
  const score = lead.book_score ?? 0
  const tier = getScoreTier(score)
  const colors = getScoreColors(score)
  const temp = getTempConfig(lead.temperature)
  const dotColor = SCORE_DOT_COLORS[tier]
  const status = lead.status?.toLowerCase()
  const now = new Date()

  const today = now.toISOString().split('T')[0]
  const isOverdue = lead.next_contact_due != null && lead.next_contact_due < today
  const isDueToday = lead.next_contact_due === today

  // Status-based display logic
  const showHeatAndScore = ['new', 'contacted'].includes(status)
  const flag = lead.inferred_ethnicity ? CULTURE_FLAGS[lead.inferred_ethnicity.toLowerCase()] || null : null
  const isBooked = status === 'booked'
  const isQuoted = status === 'quoted'
  const isAppt = status === 'meeting_booked'

  // Days pending for QUOTED
  const daysPending = isQuoted
    ? daysBetween(lead.quoted_at || lead.updated_at || lead.contacted_at || now.toISOString(), now)
    : 0

  // Days until appointment for MEETING_BOOKED
  const daysUntilAppt = isAppt && lead.appointment_date
    ? daysBetween(now, new Date(lead.appointment_date))
    : null

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div
        className="p-4 cursor-pointer rounded-xl border transition-all bg-white border-slate-200 hover:border-slate-300 hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-[#273548] dark:hover:border-teal-600 dark:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]"
        onClick={() => onCardClick(lead)}
      >
        {/* Top row — status-specific */}
        <div className="flex items-center gap-2 mb-3">
          {isBooked && (
            <span className="text-2xl leading-none">💍</span>
          )}

          {isQuoted && (
            <div className={`flex items-center gap-1.5 ${
              daysPending <= 7 ? 'text-green-600' : daysPending <= 14 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              <span className="text-lg leading-none">⏳</span>
              <span className="font-bold text-sm">{daysPending} DAYS PENDING</span>
            </div>
          )}

          {isAppt && (
            <div className={`flex items-center gap-1.5 ${
              daysUntilAppt === null ? 'text-purple-600' :
              daysUntilAppt <= 1 ? 'text-red-600' :
              daysUntilAppt <= 3 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              <span className="text-lg leading-none">📅</span>
              <span className="font-bold text-sm">
                {daysUntilAppt === null ? 'APPT SCHEDULED' :
                 daysUntilAppt === 0 ? 'TODAY!' :
                 daysUntilAppt < 0 ? `${Math.abs(daysUntilAppt)} DAYS AGO` :
                 `${daysUntilAppt} DAYS UNTIL APPT`}
              </span>
            </div>
          )}

          {showHeatAndScore && (
            <>
              <Badge className={`${colors.bg} ${colors.text} ${colors.border} border font-bold text-sm px-2.5 py-0.5`}>
                {score}
              </Badge>
              <span className={`text-xs font-bold uppercase tracking-wider ${temp.color} flex items-center gap-1`}>
                {temp.pulse ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: dotColor }} />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: dotColor }} />
                  </span>
                ) : (
                  <span className="inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: dotColor }} />
                )}
                {temp.label}
              </span>
              <span className={`ml-auto text-[11px] font-bold tracking-wider ${colors.text}`}>{tier}-TIER</span>
            </>
          )}

          {/* Overdue/due-today badges — only for contacted/new */}
          {showHeatAndScore && isOverdue && (
            <Badge className="bg-red-100 text-red-700 border-red-300 border text-[10px] font-bold px-1.5 py-0 animate-pulse dark:bg-red-900/40 dark:text-red-400 dark:border-red-800">
              OVERDUE
            </Badge>
          )}
          {showHeatAndScore && isDueToday && !isOverdue && (
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 border text-[10px] font-bold px-1.5 py-0 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-800">
              DUE TODAY
            </Badge>
          )}
        </div>

        {/* Lead info */}
        <div className="space-y-0.5 mb-3">
          <div className="font-bold text-[15px] text-slate-900 dark:text-slate-100 tracking-wide leading-tight flex items-center gap-1.5">
            {coupleName(lead)}
            {flag && <span className="text-base" title={lead.inferred_ethnicity || ''}>{flag}</span>}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 truncate">
            {lead.venue_name || '—'}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {formatWeddingDate(lead.wedding_date)}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
            {lead.inbound_channel && (
              <span>{CHANNEL_ICONS[lead.inbound_channel] || '📋'}</span>
            )}
            {formatShowName(lead.show_id)}
          </div>
        </div>

        {/* Culture flag buttons — NEW/CONTACTED only */}
        {showHeatAndScore && (
          <div className="flex flex-wrap gap-1 mb-2">
            {CULTURE_BUTTONS.map(cb => {
              const isSelected = lead.inferred_ethnicity === cb.value
              return (
                <button
                  key={cb.value}
                  className={`w-7 h-7 rounded text-base flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-2 border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                      : 'border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                  title={`${cb.label} (${cb.points} pts)${isSelected ? ' ✓' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    const newValue = isSelected ? null : cb.value
                    supabase
                      .from('ballots')
                      .update({ inferred_ethnicity: newValue, culture_confirmed: !!newValue })
                      .eq('id', lead.id)
                      .then(({ error }) => {
                        if (error) { toast.error('Failed to save culture'); return }
                        const updated = { ...lead, inferred_ethnicity: newValue, culture_confirmed: !!newValue }
                        onLeadUpdate?.(updated as Lead)
                        // Recalculate score
                        fetch('/api/leads/score', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ballotId: lead.id }),
                        }).then(res => res.json()).then(result => {
                          if (result.success) {
                            onLeadUpdate?.({ ...updated, book_score: result.bookScore } as Lead)
                          }
                        })
                      })
                  }}
                >
                  {cb.emoji}
                </button>
              )
            })}
          </div>
        )}

        {/* Score bar — only for statuses that show score */}
        {showHeatAndScore && (
          <ScoreBar score={score} size="sm" showBadge={false} />
        )}

        {/* Status badge */}
        {(() => {
          const sb = STATUS_BADGE[lead.status] || STATUS_BADGE.new
          return (
            <Badge className={`${sb.bg} ${sb.text} border-0 text-[11px] font-bold px-2 py-0.5 w-fit mt-2`}>
              {sb.label}
            </Badge>
          )
        })()}
      </div>
    </motion.div>
  )
}
