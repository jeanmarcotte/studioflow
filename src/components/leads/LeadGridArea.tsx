'use client'

import { useState, useMemo } from 'react'
import { LeadCard } from './LeadCard'
import { Nunito } from 'next/font/google'
import type { Lead } from '@/lib/lead-utils'

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

type SortKey = 'score' | 'date' | 'name' | 'temperature'

interface LeadGridAreaProps {
  leads: Lead[]
  onHide: (id: string) => void
  onEmailClick: (lead: Lead) => void
  onCardClick: (lead: Lead) => void
}

const TEMP_ORDER: Record<string, number> = { hot: 0, warm: 1, cool: 2, cold: 3 }

export function LeadGridArea({ leads, onHide, onEmailClick, onCardClick }: LeadGridAreaProps) {
  const [sortKey, setSortKey] = useState<SortKey>('score')

  const sorted = useMemo(() => {
    return [...leads].sort((a, b) => {
      switch (sortKey) {
        case 'score': return (b.book_score ?? 0) - (a.book_score ?? 0)
        case 'date': return (a.wedding_date || '9999').localeCompare(b.wedding_date || '9999')
        case 'name': return (a.bride_first_name || '').localeCompare(b.bride_first_name || '')
        case 'temperature': return (TEMP_ORDER[a.temperature || 'cold'] ?? 4) - (TEMP_ORDER[b.temperature || 'cold'] ?? 4)
        default: return 0
      }
    })
  }, [leads, sortKey])

  return (
    <div className={`${nunito.className} flex-1 min-w-0`}>
      {/* Sort bar */}
      <div className="flex items-center justify-between px-5 py-3 md:px-6">
        <span className="text-sm text-muted-foreground">{leads.length} leads</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort by:</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-8 rounded-lg border border-border bg-white px-2 text-xs font-medium outline-none focus:border-[#0d4f4f]"
          >
            <option value="score">Score</option>
            <option value="date">Wedding Date</option>
            <option value="name">Name</option>
            <option value="temperature">Temperature</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="px-5 pb-8 md:px-6">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="text-lg font-medium">No leads match these filters</div>
            <div className="text-sm mt-1">Try adjusting your filters</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onHide={onHide}
                onEmailClick={onEmailClick}
                onCardClick={onCardClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
