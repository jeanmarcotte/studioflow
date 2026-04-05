'use client'

import { X, ChevronsLeft, ChevronsRight, RotateCcw, ChevronDown } from 'lucide-react'
import { Nunito } from 'next/font/google'
import type { FilterKey } from '@/lib/lead-utils'

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

export interface SidebarFilters {
  status: FilterKey
  location: string | null
  dateRange: string
  venueType: string[]
  venueRating: string | null
  ethnicity: string[]
  religion: string[]
  ceremonyLocation: string[]
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
  { value: '', label: 'All Locations' }, { value: 'Vaughan', label: 'Vaughan' }, { value: 'Toronto', label: 'Toronto' },
  { value: 'Oakville', label: 'Oakville' }, { value: 'Mississauga', label: 'Mississauga' }, { value: 'Markham', label: 'Markham' },
  { value: 'Richmond Hill', label: 'Richmond Hill' }, { value: 'Brampton', label: 'Brampton' }, { value: 'Scarborough', label: 'Scarborough' },
  { value: 'Hamilton', label: 'Hamilton' },
]
const DATE_RANGES = [
  { value: 'all', label: 'All' }, { value: '<6m', label: '<6mo' }, { value: '6-12m', label: '6–12mo' },
  { value: '12-14m', label: '12–14mo' }, { value: '14-18m', label: '14–18mo' }, { value: '18m+', label: '18+' },
]
const VENUE_TYPES = [
  { value: '', label: 'All Types' }, { value: 'banquet_hall', label: 'Banquet Hall' }, { value: 'estate', label: 'Estate' },
  { value: 'golf_club', label: 'Golf Club' }, { value: 'hotel', label: 'Hotel' }, { value: 'restaurant', label: 'Restaurant' },
  { value: 'barn', label: 'Barn' }, { value: 'winery', label: 'Winery' },
]
const VENUE_RATINGS = ['All', '5\u2605', '4\u2605', '3\u2605', '2\u2605', '1\u2605']
const ETHNICITIES = ['Italian', 'Portuguese', 'Greek', 'Jewish', 'Indian', 'Canadian']
const RELIGIONS = ['Catholic', 'Orthodox', 'Non-denom', 'Muslim', 'Hindu', 'Sikh', 'Jewish', 'Christian', 'Other']
const CEREMONY_LOCS = ['Church', 'Temple', 'Hotel', 'Venue', 'Outdoor/Barn']
const CHASE_STATUSES = ['Due Today', 'Overdue', 'Upcoming', 'Exhausted']

/* ── Shared sub-components ──────────────────────────────────── */

function Lbl({ children }: { children: string }) {
  return <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 select-none">{children}</h4>
}

function Dropdown({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-[34px] rounded-md border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 text-[12px] text-slate-700 dark:text-slate-300 outline-none transition-all duration-150 focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15 appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600"
        style={{ paddingLeft: '10px', paddingRight: '28px' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
    </div>
  )
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-2.5 py-[5px] text-[11px] font-medium rounded-full border transition-all duration-150 hover:shadow-sm active:scale-95 cursor-pointer ${
        active
          ? 'bg-[#0d4f4f] text-white border-[#0d4f4f] shadow-sm shadow-[#0d4f4f]/20'
          : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:border-[#0d9488] hover:text-[#0d4f4f] dark:hover:text-teal-400'
      }`}>
      {label}
    </button>
  )
}

function PillGroup({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (i: string) => void }) {
  return (
    <div className="flex flex-wrap gap-[5px]">
      {items.map(item => <Pill key={item} label={item} active={selected.includes(item)} onClick={() => onToggle(item)} />)}
    </div>
  )
}

function SinglePills({ items, selected, onSelect }: { items: string[]; selected: string | null; onSelect: (v: string | null) => void }) {
  return (
    <div className="flex flex-wrap gap-[5px]">
      {items.map(item => {
        const isAll = item === 'All'
        const active = isAll ? selected === null : selected === item
        return <Pill key={item} label={item} active={active} onClick={() => onSelect(isAll ? null : (selected === item ? null : item))} />
      })}
    </div>
  )
}

/* ── Status button ──────────────────────────────────────────── */

function StatusBtn({ label, count, active, onClick, className }: { label: string; count: number; active: boolean; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick}
      className={`relative py-2.5 rounded-lg font-semibold text-[12px] transition-all duration-150 border-2 overflow-hidden cursor-pointer active:scale-[0.97] ${
        active
          ? 'bg-[#0d4f4f] text-white border-[#0d4f4f] shadow-md shadow-[#0d4f4f]/25'
          : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:border-[#0d9488]/60 hover:text-[#0d4f4f] dark:hover:text-teal-400'
      } ${className || ''}`}>
      {active && <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />}
      <span className="block leading-tight">{label}</span>
      <span className={`block text-[10px] mt-0.5 ${active ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>({count})</span>
    </button>
  )
}

/* ── Collapsed sidebar ──────────────────────────────────────── */

const SICONS: Record<FilterKey, string> = { 'no-no-yes': '\u{1F7E2}', 'no-no-no': '\u26AA', 'contacted': '\u{1F4DE}' }

function CollapsedSidebar({ filters, counts, onUpdate, onExpand, onReset }: {
  filters: SidebarFilters; counts: Record<FilterKey, number>; onUpdate: (p: Partial<SidebarFilters>) => void; onExpand: () => void; onReset: () => void
}) {
  return (
    <aside className={`${nunito.className} hidden lg:flex flex-col items-center w-[52px] shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-r border-slate-200/60 dark:border-slate-800/60 py-4 gap-2`}>
      <button onClick={onExpand} className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-2" title="Expand">
        <ChevronsRight className="h-3.5 w-3.5" />
      </button>
      {(['no-no-yes', 'no-no-no', 'contacted'] as FilterKey[]).map(key => (
        <button key={key} onClick={() => onUpdate({ status: key })} title={`${key} (${counts[key]})`}
          className={`h-9 w-9 rounded-md flex items-center justify-center text-sm transition-all duration-150 ${
            filters.status === key ? 'bg-[#0d4f4f] shadow-md shadow-[#0d4f4f]/25' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}>
          {SICONS[key]}
        </button>
      ))}
      <div className="w-5 border-t border-slate-200 dark:border-slate-700 my-1" />
      <button onClick={onReset} title="Reset" className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-[#0d4f4f] transition-colors">
        <RotateCcw className="h-3 w-3" />
      </button>
    </aside>
  )
}

/* ── Main export ─────────────────────────────────────────────── */

export function FilterSidebar({ filters, onFiltersChange, counts, open, onClose, collapsed, onCollapsedChange }: FilterSidebarProps) {
  const update = (patch: Partial<SidebarFilters>) => onFiltersChange({ ...filters, ...patch })

  const resetAll = () => onFiltersChange({
    status: 'no-no-yes', location: null, dateRange: 'all', venueType: [], venueRating: null, ethnicity: [], religion: [], ceremonyLocation: [], chaseStatus: [],
  })

  const toggleArr = (key: 'venueType' | 'chaseStatus' | 'ethnicity' | 'religion' | 'ceremonyLocation', item: string) => {
    const cur = filters[key]
    update({ [key]: cur.includes(item) ? cur.filter(i => i !== item) : [...cur, item] })
  }

  if (collapsed) {
    return <CollapsedSidebar filters={filters} counts={counts} onUpdate={update} onExpand={() => onCollapsedChange(false)} onReset={resetAll} />
  }

  const sidebarContent = (
    <>
      {/* Sticky header — flush to top, aligned with main header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/60 dark:border-slate-800/60 px-4 h-[57px] flex items-center justify-between shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Filters</span>
        <div className="flex items-center gap-2">
          <button onClick={resetAll} className="text-[10px] font-medium text-slate-400 hover:text-[#0d4f4f] dark:hover:text-teal-400 transition-colors">Reset</button>
          <button onClick={() => onCollapsedChange(true)} className="hidden lg:flex h-6 w-6 rounded-md items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Collapse">
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
          <button className="lg:hidden h-6 w-6 flex items-center justify-center text-slate-400" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter sections */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* STATUS */}
        <div className="space-y-1.5">
          <Lbl>Status</Lbl>
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <StatusBtn label="NO-NO-YES" count={counts['no-no-yes']} active={filters.status === 'no-no-yes'} onClick={() => update({ status: 'no-no-yes' })} />
            <StatusBtn label="NO-NO-NO" count={counts['no-no-no']} active={filters.status === 'no-no-no'} onClick={() => update({ status: 'no-no-no' })} />
          </div>
          <StatusBtn label="CONTACTED" count={counts['contacted']} active={filters.status === 'contacted'} onClick={() => update({ status: 'contacted' })} className="w-full" />
        </div>

        {/* CHASE STATUS (contacted only) */}
        {filters.status === 'contacted' && (
          <div className="space-y-1.5">
            <Lbl>Chase Status</Lbl>
            <PillGroup items={CHASE_STATUSES} selected={filters.chaseStatus} onToggle={(i) => toggleArr('chaseStatus', i)} />
          </div>
        )}

        {/* LOCATION */}
        <div className="space-y-1.5">
          <Lbl>Location</Lbl>
          <Dropdown value={filters.location || ''} options={LOCATIONS} onChange={(v) => update({ location: v || null })} />
        </div>

        {/* WEDDING DATE — compact radio grid */}
        <div className="space-y-1.5">
          <Lbl>Wedding Date</Lbl>
          <div className="grid grid-cols-3 gap-x-1 gap-y-0.5">
            {DATE_RANGES.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-1.5 py-[3px] cursor-pointer group">
                <input type="radio" name="dateRange" checked={filters.dateRange === value} onChange={() => update({ dateRange: value })}
                  className="accent-[#0d4f4f] h-3 w-3 cursor-pointer" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* VENUE TYPE */}
        <div className="space-y-1.5">
          <Lbl>Venue Type</Lbl>
          <Dropdown value={filters.venueType.length === 1 ? filters.venueType[0] : ''} options={VENUE_TYPES} onChange={(v) => update({ venueType: v ? [v] : [] })} />
        </div>

        {/* VENUE RATING */}
        <div className="space-y-1.5">
          <Lbl>Venue Rating</Lbl>
          <SinglePills items={VENUE_RATINGS} selected={filters.venueRating} onSelect={(v) => update({ venueRating: v })} />
        </div>

        {/* ETHNICITY */}
        <div className="space-y-1.5">
          <Lbl>Ethnicity</Lbl>
          <PillGroup items={ETHNICITIES} selected={filters.ethnicity} onToggle={(i) => toggleArr('ethnicity', i)} />
        </div>

        {/* RELIGION */}
        <div className="space-y-1.5">
          <Lbl>Religion</Lbl>
          <PillGroup items={RELIGIONS} selected={filters.religion} onToggle={(i) => toggleArr('religion', i)} />
        </div>

        {/* CEREMONY LOCATION */}
        <div className="space-y-1.5">
          <Lbl>Ceremony Location</Lbl>
          <PillGroup items={CEREMONY_LOCS} selected={filters.ceremonyLocation} onToggle={(i) => toggleArr('ceremonyLocation', i)} />
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden" onClick={onClose} />}

      {/* Desktop: fixed full-height sidebar */}
      <aside className={`${nunito.className} hidden lg:flex flex-col w-[256px] shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800/60`}>
        {sidebarContent}
      </aside>

      {/* Mobile: slide-out drawer */}
      <aside className={`${nunito.className} lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>
    </>
  )
}
