'use client'

import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { Nunito } from 'next/font/google'
import type { FilterKey } from '@/lib/lead-utils'

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

export interface SidebarFilters {
  status: FilterKey
  locations: string[]
  dateRange: string
  venueRatings: string[]
  backgrounds: string[]
  chaseStatus: string[]
}

interface FilterSidebarProps {
  filters: SidebarFilters
  onFiltersChange: (filters: SidebarFilters) => void
  counts: Record<FilterKey, number>
  open: boolean
  onClose: () => void
}

const LOCATIONS = ['Vaughan', 'Hamilton', 'Oakville', 'Toronto', 'Other']
const DATE_RANGES = [
  { value: 'all', label: 'All' },
  { value: '3m', label: 'Next 3 months' },
  { value: '3-6m', label: '3–6 months' },
  { value: '6-12m', label: '6–12 months' },
  { value: '12m+', label: '12+ months' },
]
const VENUE_RATINGS = ['8+', '6-7', '<6', 'Unknown']
const BACKGROUNDS = ['Italian', 'Greek', 'South Asian', 'Filipino', 'Other']
const CHASE_STATUSES = ['Due Today', 'Overdue', 'Upcoming', 'Exhausted']

function SectionLabel({ children }: { children: string }) {
  return <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{children}</div>
}

function PillGroup({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (item: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => {
        const active = selected.includes(item)
        return (
          <button
            key={item}
            onClick={() => onToggle(item)}
            className={`h-8 px-3 rounded-full text-xs font-medium transition-colors ${
              active
                ? 'bg-[#0d4f4f] text-white'
                : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
            }`}
          >
            {item}
          </button>
        )
      })}
    </div>
  )
}

export function FilterSidebar({ filters, onFiltersChange, counts, open, onClose }: FilterSidebarProps) {
  const update = (patch: Partial<SidebarFilters>) => onFiltersChange({ ...filters, ...patch })

  const toggleArray = (key: keyof SidebarFilters, item: string) => {
    const current = filters[key] as string[]
    const next = current.includes(item) ? current.filter(i => i !== item) : [...current, item]
    update({ [key]: next })
  }

  const resetAll = () => {
    onFiltersChange({
      status: 'no-no-yes',
      locations: [],
      dateRange: 'all',
      venueRatings: [],
      backgrounds: [],
      chaseStatus: [],
    })
  }

  const statusButtons: { key: FilterKey; label: string }[] = [
    { key: 'no-no-yes', label: 'NO-NO-YES' },
    { key: 'no-no-no', label: 'NO-NO-NO' },
    { key: 'contacted', label: 'CONTACTED' },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`${nunito.className} fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-border/60 overflow-y-auto transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Mobile close */}
        <div className="flex items-center justify-between p-4 lg:hidden border-b border-border/60">
          <span className="text-sm font-bold text-[#0d4f4f]">Filters</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-5">
          {/* Status */}
          <div>
            <SectionLabel>Status</SectionLabel>
            <div className="space-y-1.5">
              {statusButtons.map(({ key, label }) => (
                <Button
                  key={key}
                  variant={filters.status === key ? 'default' : 'outline'}
                  onClick={() => update({ status: key })}
                  className={`w-full justify-between h-10 text-sm font-bold ${
                    filters.status === key
                      ? 'bg-[#0f766e] hover:bg-[#0f766e]/90 text-white border-[#0f766e]'
                      : ''
                  }`}
                >
                  {label}
                  <span className={`text-xs rounded-full px-2 py-0.5 ${
                    filters.status === key ? 'bg-white/20' : 'bg-muted'
                  }`}>
                    {counts[key]}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <SectionLabel>Location</SectionLabel>
            <PillGroup items={LOCATIONS} selected={filters.locations} onToggle={(item) => toggleArray('locations', item)} />
          </div>

          {/* Wedding Date */}
          <div>
            <SectionLabel>Wedding Date</SectionLabel>
            <div className="space-y-1">
              {DATE_RANGES.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                  <input
                    type="radio"
                    name="dateRange"
                    checked={filters.dateRange === value}
                    onChange={() => update({ dateRange: value })}
                    className="accent-[#0d4f4f]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Venue Rating */}
          <div>
            <SectionLabel>Venue Rating</SectionLabel>
            <PillGroup items={VENUE_RATINGS} selected={filters.venueRatings} onToggle={(item) => toggleArray('venueRatings', item)} />
          </div>

          {/* Background */}
          <div>
            <SectionLabel>Background</SectionLabel>
            <PillGroup items={BACKGROUNDS} selected={filters.backgrounds} onToggle={(item) => toggleArray('backgrounds', item)} />
          </div>

          {/* Chase Status — only when CONTACTED */}
          {filters.status === 'contacted' && (
            <div>
              <SectionLabel>Chase Status</SectionLabel>
              <PillGroup items={CHASE_STATUSES} selected={filters.chaseStatus} onToggle={(item) => toggleArray('chaseStatus', item)} />
            </div>
          )}

          {/* Reset */}
          <button
            onClick={resetAll}
            className="w-full text-xs text-muted-foreground hover:text-[#0d4f4f] underline underline-offset-2 py-2"
          >
            Reset Filters
          </button>
        </div>
      </aside>
    </>
  )
}
