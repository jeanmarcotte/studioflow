'use client'

import { LeadCard } from './LeadCard'
import type { Lead } from '@/lib/lead-utils'

interface LeadGridProps {
  leads: Lead[]
  onHide: (id: string) => void
  onEmailClick: (lead: Lead) => void
  onCardClick: (lead: Lead) => void
}

export function LeadGrid({ leads, onHide, onEmailClick, onCardClick }: LeadGridProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="text-lg font-medium">No leads in this group</div>
        <div className="text-sm mt-1">Try a different filter</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {leads.map(lead => (
        <LeadCard
          key={lead.id}
          lead={lead}
          onHide={onHide}
          onEmailClick={onEmailClick}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  )
}
