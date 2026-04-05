'use client'

import { useMemo } from 'react'
import { LeadCard } from './LeadCard'
import { PaginationButtonGroup } from '@/components/ui/button-group'
import { Playfair_Display, Nunito } from 'next/font/google'
import type { Lead } from '@/lib/lead-utils'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

type SortKey = 'score' | 'date' | 'name' | 'temperature'

interface LeadGridAreaProps {
  leads: Lead[]
  sortKey: SortKey
  onSortChange: (key: SortKey) => void
  currentPage: number
  onPageChange: (page: number) => void
  pageSize: number
  onHide: (id: string) => void
  onEmailClick: (lead: Lead) => void
  onCardClick: (lead: Lead) => void
}

const TEMP_ORDER: Record<string, number> = { hot: 0, warm: 1, cool: 2, cold: 3 }

export function LeadGridArea({ leads, sortKey, onSortChange, currentPage, onPageChange, pageSize, onHide, onEmailClick, onCardClick }: LeadGridAreaProps) {
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

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className={`${nunito.className} flex-1 min-w-0 bg-white dark:bg-gray-950 rounded-tr-lg flex flex-col`}>
      {/* Title + Sort bar */}
      <div className="flex items-center justify-between px-5 py-4 md:px-6 border-b border-border/40">
        <h1 className={`${playfair.className} text-xl font-bold text-[#0d4f4f] dark:text-teal-400`}>
          Lead Command Center
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">{leads.length} leads</span>
          <select
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="h-8 rounded-lg border border-border bg-white dark:bg-gray-900 px-2 text-xs font-medium outline-none focus:border-[#0d4f4f]"
          >
            <option value="score">Sort by: Score</option>
            <option value="date">Sort by: Date</option>
            <option value="name">Sort by: Name</option>
            <option value="temperature">Sort by: Temperature</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 px-5 py-4 md:px-6 overflow-y-auto">
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="text-lg font-medium">No leads match these filters</div>
            <div className="text-sm mt-1">Try adjusting your filters</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {paginated.map(lead => (
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

      {/* Pagination footer */}
      {sorted.length > pageSize && (
        <PaginationButtonGroup
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          totalItems={sorted.length}
          pageSize={pageSize}
        />
      )}
    </div>
  )
}
