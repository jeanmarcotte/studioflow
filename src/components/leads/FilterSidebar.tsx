'use client'

import { Button } from '@/components/ui/button'
import { BounceButton } from '@/components/ui/bounce-button'
import { X } from 'lucide-react'
import { Nunito } from 'next/font/google'
import type { FilterKey } from '@/lib/lead-utils'

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

export interface SidebarFilters {
  status: FilterKey
  location: string | null
  dateRange: string
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
  { value: '3m', label: 'Next 3mo' },
  { value: '3-6m', label: '3–6mo' },
  { value: '6-12m', label: '6–12mo' },
  { value: '12m+', label: '12mo+' },
]
const VENUE_RATINGS = ['8+', '6-7', '<6', 'Unknown']
const BACKGROUNDS = ['Italian', 'Greek', 'South Asian', 'Filipino', 'Other']
const CHASE_STATUSES = ['Due Today', 'Overdue', 'Upcoming', 'Exhausted']

function SectionLabel({ children }: { children: string }) {
  return <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{children}</div>
}

function DisabledPillGroup({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span
          key={item}
          title="Coming soon"
          className="h-7 px-3 rounded-full text-xs font-medium bg-gray-100 text-muted-foreground/40 cursor-not-allowed flex items-center dark:bg-gray-800 dark:text-muted-foreground/30"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

export function FilterSidebar({ filters, onFiltersChange, counts, open, onClose }: FilterSidebarProps) {
  const update = (patch: Partial<SidebarFilters>) => onFiltersChange({ ...filters, ...patch })

  const resetAll = () => {
    onFiltersChange({
      status: 'no-no-yes',
      location: null,
      dateRange: 'all',
      chaseStatus: [],
    })
  }

  const toggleChase = (item: string) => {
    const next = filters.chaseStatus.includes(item)
      ? filters.chaseStatus.filter(i => i !== item)
      : [...filters.chaseStatus, item]
    update({ chaseStatus: next })
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={onClose} />}

      <aside className={`${nunito.className} fixed lg:static inset-y-0 left-0 z-50 w-[260px] shrink-0 bg-[#f8f8f8] dark:bg-gray-900 border-r border-border/60 overflow-y-auto transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Mobile close */}
        <div className="flex items-center justify-between p-4 lg:hidden border-b border-border/60">
          <span className="text-sm font-bold text-[#0d4f4f] dark:text-teal-400">Filters</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-5">
          {/* Status — NNY + NNN side by side, CONTACTED full width below */}
          <div>
            <SectionLabel>Status</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <BounceButton
                variant={filters.status === 'no-no-yes' ? 'default' : 'outline'}
                onClick={() => update({ status: 'no-no-yes' })}
                className={`h-11 text-xs font-bold flex flex-col gap-0 leading-tight ${
                  filters.status === 'no-no-yes'
                    ? 'bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white border-[#0d4f4f]'
                    : ''
                }`}
              >
                <span>NO-NO-YES</span>
                <span className="text-[10px] opacity-70">({counts['no-no-yes']})</span>
              </BounceButton>
              <BounceButton
                variant={filters.status === 'no-no-no' ? 'default' : 'outline'}
                onClick={() => update({ status: 'no-no-no' })}
                className={`h-11 text-xs font-bold flex flex-col gap-0 leading-tight ${
                  filters.status === 'no-no-no'
                    ? 'bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white border-[#0d4f4f]'
                    : ''
                }`}
              >
                <span>NO-NO-NO</span>
                <span className="text-[10px] opacity-70">({counts['no-no-no']})</span>
              </BounceButton>
            </div>
            <BounceButton
              variant={filters.status === 'contacted' ? 'default' : 'outline'}
              onClick={() => update({ status: 'contacted' })}
              className={`w-full h-11 text-xs font-bold ${
                filters.status === 'contacted'
                  ? 'bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white border-[#0d4f4f]'
                  : ''
              }`}
            >
              CONTACTED ({counts['contacted']})
            </BounceButton>
          </div>

          {/* Contacted sub-filters */}
          {filters.status === 'contacted' && (
            <div>
              <SectionLabel>Chase Status</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {CHASE_STATUSES.map(item => {
                  const active = filters.chaseStatus.includes(item)
                  return (
                    <button
                      key={item}
                      onClick={() => toggleChase(item)}
                      className={`h-7 px-3 rounded-full text-xs font-medium transition-colors ${
                        active
                          ? 'bg-[#0d4f4f] text-white dark:bg-teal-600'
                          : 'bg-white text-muted-foreground hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
                      }`}
                    >
                      {item}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Location — single select */}
          <div>
            <SectionLabel>Location</SectionLabel>
            <div className="space-y-1">
              {LOCATIONS.map(loc => (
                <label key={loc} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                  <input
                    type="radio"
                    name="location"
                    checked={filters.location === loc}
                    onChange={() => update({ location: filters.location === loc ? null : loc })}
                    className="accent-[#0d4f4f]"
                  />
                  {loc}
                </label>
              ))}
            </div>
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

          {/* Venue Rating — disabled */}
          <div>
            <SectionLabel>Venue Rating</SectionLabel>
            <DisabledPillGroup items={VENUE_RATINGS} />
            <p className="text-[10px] text-muted-foreground/50 mt-1 italic">Coming soon</p>
          </div>

          {/* Background — disabled */}
          <div>
            <SectionLabel>Background</SectionLabel>
            <DisabledPillGroup items={BACKGROUNDS} />
            <p className="text-[10px] text-muted-foreground/50 mt-1 italic">Coming soon</p>
          </div>

          {/* Reset */}
          <button
            onClick={resetAll}
            className="w-full text-xs text-muted-foreground hover:text-[#0d4f4f] dark:hover:text-teal-400 underline underline-offset-2 py-2"
          >
            Reset Filters
          </button>
        </div>
      </aside>
    </>
  )
}
