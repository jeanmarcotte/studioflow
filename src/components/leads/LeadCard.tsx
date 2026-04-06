'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
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
  booked: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-400', label: 'BOOKED' },
  dead: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-400', label: 'LOST' },
  lost: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-400', label: 'LOST' },
}

interface LeadCardProps {
  lead: Lead
  onHide: (id: string) => void
  onEmailClick: (lead: Lead) => void
  onCardClick: (lead: Lead) => void
}

export function LeadCard({ lead, onHide, onEmailClick, onCardClick }: LeadCardProps) {
  const score = lead.book_score ?? 0
  const tier = getScoreTier(score)
  const colors = getScoreColors(score)
  const temp = getTempConfig(lead.temperature)
  const dotColor = SCORE_DOT_COLORS[tier]

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = lead.next_contact_due != null && lead.next_contact_due < today
  const isDueToday = lead.next_contact_due === today

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
        {/* Score row */}
        <div className="flex items-center gap-2 mb-3">
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
          {isOverdue && (
            <Badge className="bg-red-100 text-red-700 border-red-300 border text-[10px] font-bold px-1.5 py-0 animate-pulse dark:bg-red-900/40 dark:text-red-400 dark:border-red-800">
              OVERDUE
            </Badge>
          )}
          {isDueToday && !isOverdue && (
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 border text-[10px] font-bold px-1.5 py-0 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-800">
              DUE TODAY
            </Badge>
          )}
        </div>

        {/* Lead info */}
        <div className="space-y-0.5 mb-3">
          <div className="font-bold text-[15px] text-slate-900 dark:text-slate-100 tracking-wide leading-tight">
            {coupleName(lead)}
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

        {/* Status badge */}
        {(() => {
          const sb = STATUS_BADGE[lead.status] || STATUS_BADGE.new
          return (
            <Badge className={`${sb.bg} ${sb.text} border-0 text-[11px] font-bold px-2 py-0.5 w-fit`}>
              {sb.label}
            </Badge>
          )
        })()}
      </div>
    </motion.div>
  )
}
