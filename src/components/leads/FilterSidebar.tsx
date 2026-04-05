'use client'

import { Button } from '@/components/ui/button'
import { BounceButton } from '@/components/ui/bounce-button'
import { X, ChevronsLeft, ChevronsRight, RotateCcw, ChevronDown } from 'lucide-react'
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

const LOCATIONS = [
  { value: '', label: 'All Locations' },
  { value: 'Vaughan', label: 'Vaughan' },
  { value: 'Toronto', label: 'Toronto' },
  { value: 'Oakville', label: 'Oakville' },
  { value: 'Mississauga', label: 'Mississauga' },
  { value: 'Markham', label: 'Markham' },
  { value: 'Richmond Hill', label: 'Richmond Hill' },
  { value: 'Brampton', label: 'Brampton' },
  { value: 'Scarborough', label: 'Scarborough' },
  { value: 'Hamilton', label: 'Hamilton' },
]

const DATE_RANGES = [
  { value: 'all', label: 'All Dates' },
  { value: '<6m', label: '< 6 months' },
  { value: '6-12m', label: '6–12 months' },
  { value: '12-14m', label: '12–14 months' },
  { value: '14-18m', label: '14–18 months' },
  { value: '18m+', label: '18+ months' },
]

const VENUE_TYPES = [
  { value: '', label: 'All Venue Types' },
  { value: 'banquet_hall', label: 'Banquet Hall' },
  { value: 'estate', label: 'Estate' },
  { value: 'golf_club', label: 'Golf Club' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'barn', label: 'Barn' },
  { value: 'winery', label: 'Winery' },
]

const CHASE_STATUSES = ['Due Today', 'Overdue', 'Upcoming', 'Exhausted']

function SectionLabel({ children }: { children: string }) {
  return <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">{children}</h3>
}

function FilterSelect({ label, value, options, onChange }: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <SectionLabel>{label}</SectionLabel>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 appearance-none"
          style={{ paddingLeft: '0.75rem', paddingRight: '2rem' }}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
      </div>
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

  const toggleChase = (item: string) => {
    const next = filters.chaseStatus.includes(item)
      ? filters.chaseStatus.filter(i => i !== item)
      : [...filters.chaseStatus, item]
    update({ chaseStatus: next })
  }

  // Collapsed sidebar
  if (collapsed) {
    return (
      <aside className={`${nunito.className} hidden lg:flex flex-col items-center w-14 shrink-0 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 py-3 gap-1.5`}>
        <button onClick={() => onCollapsedChange(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 mb-1" title="Expand">
          <ChevronsRight className="h-4 w-4" />
        </button>
        {(['no-no-yes', 'no-no-no', 'contacted'] as FilterKey[]).map(key => (
          <button key={key} onClick={() => update({ status: key })}
            title={`${STATUS_ICONS[key].tip} (${counts[key]})`}
            className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm transition-colors ${
              filters.status === key ? 'bg-[#0d4f4f] shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}>
            {STATUS_ICONS[key].icon}
          </button>
        ))}
        <div className="border-t border-slate-200 dark:border-slate-700 w-6 my-1" />
        <button onClick={resetAll} title="Reset" className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800">
          <RotateCcw className="h-3 w-3" />
        </button>
      </aside>
    )
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} />}

      <aside className={`${nunito.className} fixed lg:static inset-y-0 left-0 z-50 w-[250px] shrink-0 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Filters</span>
          <div className="flex items-center gap-1">
            <button onClick={resetAll} className="text-[10px] text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 underline underline-offset-2 mr-1">Reset</button>
            <button onClick={() => onCollapsedChange(true)} className="hidden lg:flex h-6 w-6 rounded items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800" title="Collapse">
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
            <Button variant="ghost" size="icon" className="h-6 w-6 lg:hidden" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* STATUS */}
          <div>
            <SectionLabel>Status</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <BounceButton variant={filters.status === 'no-no-yes' ? 'default' : 'outline'} onClick={() => update({ status: 'no-no-yes' })}
                className={`h-10 text-[11px] font-bold flex flex-col gap-0 leading-tight ${filters.status === 'no-no-yes' ? 'bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white border-[#0d4f4f]' : ''}`}>
                <span>NO-NO-YES</span>
                <span className="text-[9px] opacity-70">({counts['no-no-yes']})</span>
              </BounceButton>
              <BounceButton variant={filters.status === 'no-no-no' ? 'default' : 'outline'} onClick={() => update({ status: 'no-no-no' })}
                className={`h-10 text-[11px] font-bold flex flex-col gap-0 leading-tight ${filters.status === 'no-no-no' ? 'bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white border-[#0d4f4f]' : ''}`}>
                <span>NO-NO-NO</span>
                <span className="text-[9px] opacity-70">({counts['no-no-no']})</span>
              </BounceButton>
            </div>
            <BounceButton variant={filters.status === 'contacted' ? 'default' : 'outline'} onClick={() => update({ status: 'contacted' })}
              className={`w-full h-10 text-[11px] font-bold ${filters.status === 'contacted' ? 'bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white border-[#0d4f4f]' : ''}`}>
              CONTACTED ({counts['contacted']})
            </BounceButton>
          </div>

          {/* CHASE STATUS (contacted only) */}
          {filters.status === 'contacted' && (
            <div>
              <SectionLabel>Chase Status</SectionLabel>
              <div className="flex flex-wrap gap-1">
                {CHASE_STATUSES.map(item => {
                  const active = filters.chaseStatus.includes(item)
                  return (
                    <button key={item} onClick={() => toggleChase(item)}
                      className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${
                        active ? 'bg-teal-600 text-white border-teal-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                      }`}>
                      {item}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* LOCATION dropdown */}
          <FilterSelect
            label="Location"
            value={filters.location || ''}
            options={LOCATIONS}
            onChange={(v) => update({ location: v || null })}
          />

          {/* WEDDING DATE dropdown */}
          <FilterSelect
            label="Wedding Date"
            value={filters.dateRange}
            options={DATE_RANGES}
            onChange={(v) => update({ dateRange: v })}
          />

          {/* VENUE TYPE dropdown */}
          <FilterSelect
            label="Venue Type"
            value={filters.venueType.length === 1 ? filters.venueType[0] : ''}
            options={VENUE_TYPES}
            onChange={(v) => update({ venueType: v ? [v] : [] })}
          />

          {/* COMING SOON — single compact box */}
          <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Coming Soon</div>
            <div className="text-[11px] text-slate-400 dark:text-slate-600 leading-relaxed">
              Venue Rating · Ethnicity · Religion · Ceremony Location
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
