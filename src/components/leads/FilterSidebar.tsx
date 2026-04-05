'use client'

import { Button } from '@/components/ui/button'
import { BounceButton } from '@/components/ui/bounce-button'
import { X, ChevronsLeft, ChevronsRight, RotateCcw } from 'lucide-react'
import { Nunito } from 'next/font/google'
import type { FilterKey } from '@/lib/lead-utils'

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

export interface SidebarFilters {
  status: FilterKey
  location: string | null
  dateRange: string
  venueType: string[]
  chaseStatus: string[]
}

interface FilterSidebarProps {
  filters: SidebarFilters
  onFiltersChange: (filters: SidebarFilters) => void
  counts: Record<FilterKey, number>
  open: boolean
  onClose: () => void
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

const LOCATIONS = ['All', 'Vaughan', 'Toronto', 'Oakville', 'Mississauga', 'Markham', 'Richmond Hill', 'Brampton', 'Scarborough', 'Hamilton']
const DATE_RANGES = [
  { value: 'all', label: 'All' },
  { value: '<6m', label: '< 6 months' },
  { value: '6-12m', label: '6–12 months' },
  { value: '12-14m', label: '12–14 months' },
  { value: '14-18m', label: '14–18 months' },
  { value: '18m+', label: '18+ months' },
]
const VENUE_TYPES = ['Banquet Hall', 'Estate', 'Golf Club', 'Hotel', 'Restaurant', 'Barn', 'Winery']
const VENUE_RATINGS = ['All', '5★', '4★', '3★', '2★', '1★']
const ETHNICITIES = ['Italian', 'Portuguese', 'Greek', 'Jewish', 'Indian', 'Canadian']
const RELIGIONS = ['Catholic', 'Orthodox', 'Non-denom', 'Muslim', 'Hindu', 'Sikh', 'Jewish', 'Christian', 'Other']
const CEREMONY_LOCATIONS = ['Church', 'Temple', 'Hotel', 'Venue', 'Outdoor/Barn']
const CHASE_STATUSES = ['Due Today', 'Overdue', 'Upcoming', 'Exhausted']

function SectionLabel({ children }: { children: string }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{children}</h3>
}

function Divider() {
  return <div className="border-t border-slate-200 dark:border-slate-800" />
}

function ActivePillGroup({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (item: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => {
        const active = selected.includes(item)
        return (
          <button key={item} onClick={() => onToggle(item)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
              active
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-500/10'
            }`}>
            {item}
          </button>
        )
      })}
    </div>
  )
}

function DisabledPillGroup({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span key={item} title="Coming soon"
          className="px-3 py-1.5 text-xs rounded-full border border-slate-200 dark:border-slate-800 text-slate-400/50 dark:text-slate-600 cursor-not-allowed">
          {item}
        </span>
      ))}
      <p className="w-full text-[10px] text-slate-400 dark:text-slate-600 mt-1 italic">Coming soon</p>
    </div>
  )
}

function RadioGroup({ name, options, value, onChange }: { name: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-0.5">
      {options.map(opt => (
        <label key={opt.value}
          className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-2 -mx-2">
          <input type="radio" name={name} checked={value === opt.value} onChange={() => onChange(opt.value)}
            className="accent-teal-600" />
          <span className="text-sm text-slate-700 dark:text-slate-300">{opt.label}</span>
        </label>
      ))}
    </div>
  )
}

function LocationRadio({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="space-y-0.5">
      {LOCATIONS.map(loc => (
        <label key={loc}
          className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-2 -mx-2">
          <input type="radio" name="location" checked={loc === 'All' ? value === null : value === loc}
            onChange={() => onChange(loc === 'All' ? null : loc)}
            className="accent-teal-600" />
          <span className="text-sm text-slate-700 dark:text-slate-300">{loc}</span>
        </label>
      ))}
    </div>
  )
}

// Collapsed icon-only view
const STATUS_ICONS: Record<FilterKey, { icon: string; tip: string }> = {
  'no-no-yes': { icon: '🟢', tip: 'NO-NO-YES' },
  'no-no-no': { icon: '⚪', tip: 'NO-NO-NO' },
  'contacted': { icon: '📞', tip: 'CONTACTED' },
}

export function FilterSidebar({ filters, onFiltersChange, counts, open, onClose, collapsed, onCollapsedChange }: FilterSidebarProps) {
  const update = (patch: Partial<SidebarFilters>) => onFiltersChange({ ...filters, ...patch })

  const resetAll = () => {
    onFiltersChange({ status: 'no-no-yes', location: null, dateRange: 'all', venueType: [], chaseStatus: [] })
  }

  const toggleArray = (key: 'venueType' | 'chaseStatus', item: string) => {
    const current = filters[key]
    const next = current.includes(item) ? current.filter(i => i !== item) : [...current, item]
    update({ [key]: next })
  }

  // Collapsed sidebar
  if (collapsed) {
    return (
      <aside className={`${nunito.className} hidden lg:flex flex-col items-center w-16 shrink-0 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 py-3 gap-2`}>
        <button onClick={() => onCollapsedChange(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 mb-2" title="Expand sidebar">
          <ChevronsRight className="h-4 w-4" />
        </button>
        {(['no-no-yes', 'no-no-no', 'contacted'] as FilterKey[]).map(key => (
          <button key={key} onClick={() => update({ status: key })}
            title={`${STATUS_ICONS[key].tip} (${counts[key]})`}
            className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg transition-colors ${
              filters.status === key ? 'bg-[#0d4f4f] shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}>
            {STATUS_ICONS[key].icon}
          </button>
        ))}
        <div className="border-t border-slate-200 dark:border-slate-800 w-8 my-1" />
        <button onClick={resetAll} title="Reset filters" className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </aside>
    )
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={onClose} />}

      <aside className={`${nunito.className} fixed lg:static inset-y-0 left-0 z-50 w-64 shrink-0 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Filters</span>
          <div className="flex gap-1">
            <button onClick={() => onCollapsedChange(true)} className="hidden lg:flex h-7 w-7 rounded items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800" title="Collapse">
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 1. STATUS */}
          <div>
            <SectionLabel>Status</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <BounceButton variant={filters.status === 'no-no-yes' ? 'default' : 'outline'} onClick={() => update({ status: 'no-no-yes' })}
                className={`h-11 text-xs font-bold flex flex-col gap-0 leading-tight ${filters.status === 'no-no-yes' ? 'bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white border-[#0d4f4f]' : ''}`}>
                <span>NO-NO-YES</span>
                <span className="text-[10px] opacity-70">({counts['no-no-yes']})</span>
              </BounceButton>
              <BounceButton variant={filters.status === 'no-no-no' ? 'default' : 'outline'} onClick={() => update({ status: 'no-no-no' })}
                className={`h-11 text-xs font-bold flex flex-col gap-0 leading-tight ${filters.status === 'no-no-no' ? 'bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white border-[#0d4f4f]' : ''}`}>
                <span>NO-NO-NO</span>
                <span className="text-[10px] opacity-70">({counts['no-no-no']})</span>
              </BounceButton>
            </div>
            <BounceButton variant={filters.status === 'contacted' ? 'default' : 'outline'} onClick={() => update({ status: 'contacted' })}
              className={`w-full h-11 text-xs font-bold ${filters.status === 'contacted' ? 'bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white border-[#0d4f4f]' : ''}`}>
              CONTACTED ({counts['contacted']})
            </BounceButton>
          </div>

          {/* 2. CHASE STATUS (contacted only) */}
          {filters.status === 'contacted' && (
            <div>
              <SectionLabel>Chase Status</SectionLabel>
              <ActivePillGroup items={CHASE_STATUSES} selected={filters.chaseStatus} onToggle={(item) => toggleArray('chaseStatus', item)} />
            </div>
          )}

          <Divider />

          {/* 3. LOCATION */}
          <div>
            <SectionLabel>Location</SectionLabel>
            <LocationRadio value={filters.location} onChange={(v) => update({ location: v })} />
          </div>

          <Divider />

          {/* 4. WEDDING DATE */}
          <div>
            <SectionLabel>Wedding Date</SectionLabel>
            <RadioGroup name="dateRange" options={DATE_RANGES} value={filters.dateRange} onChange={(v) => update({ dateRange: v })} />
          </div>

          <Divider />

          {/* 5. VENUE TYPE (functional) */}
          <div>
            <SectionLabel>Venue Type</SectionLabel>
            <ActivePillGroup items={VENUE_TYPES} selected={filters.venueType} onToggle={(item) => toggleArray('venueType', item)} />
          </div>

          <Divider />

          {/* 6. VENUE RATING (disabled) */}
          <div>
            <SectionLabel>Venue Rating</SectionLabel>
            <DisabledPillGroup items={VENUE_RATINGS} />
          </div>

          <Divider />

          {/* 7. ETHNICITY (disabled) */}
          <div>
            <SectionLabel>Ethnicity</SectionLabel>
            <DisabledPillGroup items={ETHNICITIES} />
          </div>

          <Divider />

          {/* 8. RELIGION (disabled) */}
          <div>
            <SectionLabel>Religion</SectionLabel>
            <DisabledPillGroup items={RELIGIONS} />
          </div>

          <Divider />

          {/* 9. CEREMONY LOCATION (disabled) */}
          <div>
            <SectionLabel>Ceremony Location</SectionLabel>
            <DisabledPillGroup items={CEREMONY_LOCATIONS} />
          </div>

          <Divider />

          {/* Reset */}
          <button onClick={resetAll} className="w-full text-xs text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 underline underline-offset-2 py-2">
            Reset Filters
          </button>
        </div>
      </aside>
    </>
  )
}
