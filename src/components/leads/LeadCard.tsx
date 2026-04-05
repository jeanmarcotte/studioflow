'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QuickActions } from './QuickActions'
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

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card
        className="p-4 cursor-pointer border border-border/80 hover:border-border transition-colors bg-white"
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
        </div>

        {/* Lead info */}
        <div className="space-y-0.5 mb-3">
          <div className="font-bold text-[15px] text-foreground tracking-wide leading-tight">
            {coupleName(lead)}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {lead.venue_name || '—'}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatWeddingDate(lead.wedding_date)}
          </div>
          <div className="text-xs text-muted-foreground/70">
            {formatShowName(lead.show_id)}
          </div>
        </div>

        {/* Quick actions */}
        <QuickActions lead={lead} onHide={onHide} onEmailClick={onEmailClick} />
      </Card>
    </motion.div>
  )
}
