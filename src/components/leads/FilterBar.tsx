'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { FilterKey } from '@/lib/lead-utils'

interface FilterBarProps {
  activeFilter: FilterKey
  onFilterChange: (filter: FilterKey) => void
  counts: Record<FilterKey, number>
}

const FILTERS: { key: FilterKey; label: string; activeClass: string }[] = [
  { key: 'no-no-yes', label: 'NO-NO-YES', activeClass: 'bg-[#0d4f4f] text-white hover:bg-[#0d4f4f]/90 border-[#0d4f4f]' },
  { key: 'no-no-no', label: 'NO-NO-NO', activeClass: 'bg-gray-700 text-white hover:bg-gray-700/90 border-gray-700' },
  { key: 'contacted', label: 'CONTACTED', activeClass: 'bg-blue-600 text-white hover:bg-blue-600/90 border-blue-600' },
]

export function FilterBar({ activeFilter, onFilterChange, counts }: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {FILTERS.map(({ key, label, activeClass }) => (
        <Button
          key={key}
          variant="outline"
          onClick={() => onFilterChange(key)}
          className={`h-12 px-5 text-sm font-bold tracking-wide rounded-xl transition-all ${
            activeFilter === key
              ? activeClass
              : 'bg-white text-muted-foreground border-border hover:bg-muted/60'
          }`}
        >
          {label}
          <span className={`ml-2 text-xs font-semibold rounded-full px-2 py-0.5 ${
            activeFilter === key ? 'bg-white/20' : 'bg-muted'
          }`}>
            {counts[key]}
          </span>
        </Button>
      ))}
      <div className="flex-1" />
      <Button
        variant="outline"
        className="h-12 px-4 rounded-xl border-dashed border-2 text-muted-foreground hover:border-[#0d4f4f] hover:text-[#0d4f4f]"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Add Lead
      </Button>
    </div>
  )
}
