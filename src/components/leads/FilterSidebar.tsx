'use client'

import { X, ChevronsLeft, ChevronsRight, RotateCcw, ChevronDown } from 'lucide-react'
import { Nunito } from 'next/font/google'
import { ButtonWithBadge } from '@/components/ui/button-with-badge'
import Link from 'next/link'
import type { FilterKey } from '@/lib/lead-utils'

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

export interface SidebarFilters {
  status: FilterKey
  location: string | null
  dateRange: string
  venueType: string[]
  venueRating: string | null
  religion: string[]
  ceremonyLocation: string[]
  chaseStatus: string[]
}

interface FilterSidebarProps {
  filters: SidebarFilters
  onFiltersChange: (filters: SidebarFilters) => void
  counts: Record<FilterKey, number>
  lostCount: number
  showLost: boolean
  onShowLostChange: (show: boolean) => void
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
const DATE_OPTS = [
  { value: 'all', label: 'All' }, { value: '<6m', label: '<6mo' }, { value: '6-12m', label: '6–12mo' },
  { value: '12-14m', label: '12–14' }, { value: '14-18m', label: '14–18' }, { value: '18m+', label: '18+' },
]
const VENUE_TYPES = [
  { value: '', label: 'All Venue Types' }, { value: 'banquet_hall', label: 'Banquet Hall' }, { value: 'estate', label: 'Estate' },
  { value: 'golf_club', label: 'Golf Club' }, { value: 'hotel', label: 'Hotel' }, { value: 'restaurant', label: 'Restaurant' },
  { value: 'barn', label: 'Barn' }, { value: 'winery', label: 'Winery' },
]
const RATINGS = ['All', '5\u2605', '4\u2605', '3\u2605', '2\u2605', '1\u2605']
const RELIGIONS = ['Catholic', 'Orthodox', 'Non-denom', 'Muslim', 'Hindu', 'Sikh', 'Jewish', 'Christian', 'Other']
const CEREMONY = ['Church', 'Temple', 'Hotel', 'Venue', 'Outdoor/Barn']
const CHASE = ['Due Today', 'Overdue', 'Upcoming', 'Exhausted']

/* ── Primitives ─────────────────────────────────────────────── */

function SectionLabel({ children }: { children: string }) {
  return <label className="block text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">{children}</label>
}

function Divider() {
  return <div className="border-t border-slate-100 dark:border-slate-800/80" />
}

function StyledDropdown({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none transition-all duration-200 hover:border-teal-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 appearance-none cursor-pointer"
        style={{ paddingLeft: '16px', paddingRight: '36px' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
    </div>
  )
}

function ButtonGrid({ items, selected, onChange }: { items: { value: string; label: string }[]; selected: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {items.map(({ value, label }) => (
        <button key={value} onClick={() => onChange(value)}
          className={`py-2 px-2 rounded-md text-xs font-medium border transition-all duration-150 cursor-pointer active:scale-95 ${
            selected === value
              ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20'
          }`}>
          {label}
        </button>
      ))}
    </div>
  )
}

function PremiumPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 cursor-pointer hover:shadow-sm active:scale-95 ${
        active
          ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/30'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400'
      }`}>
      {label}
    </button>
  )
}

function PillRow({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (i: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => <PremiumPill key={item} label={item} active={selected.includes(item)} onClick={() => onToggle(item)} />)}
    </div>
  )
}

function SinglePillRow({ items, selected, onSelect }: { items: string[]; selected: string | null; onSelect: (v: string | null) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => {
        const isAll = item === 'All'
        const active = isAll ? selected === null : selected === item
        return <PremiumPill key={item} label={item} active={active} onClick={() => onSelect(isAll ? null : (selected === item ? null : item))} />
      })}
    </div>
  )
}

/* ── Status toggle card ─────────────────────────────────────── */

function StatusCard({ label, count, active, onClick, className }: { label: string; count: number; active: boolean; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick}
      className={`relative p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:shadow-md active:scale-[0.98] ${
        active
          ? 'bg-gradient-to-br from-teal-500 to-teal-600 border-teal-500 text-white shadow-lg shadow-teal-500/25'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400'
      } ${className || ''}`}>
      <span className="font-semibold text-sm">{label}</span>
      <span className={`text-xs ${active ? 'text-white/80' : 'text-slate-400'}`}>({count})</span>
    </button>
  )
}

/* ── Collapsed view ─────────────────────────────────────────── */

const SICONS: Record<FilterKey, string> = {
  'no-no-yes': '\u{1F7E2}',
  'no-no-no': '\u26AA',
  'contacted': '\u{1F4DE}',
  'meeting_booked': '\u{1F4C5}',
  'quoted': '\u{1F4B0}',
  'booked': '\u2705',
}

function CollapsedBar({ filters, counts, update, onExpand, onReset }: {
  filters: SidebarFilters; counts: Record<FilterKey, number>; update: (p: Partial<SidebarFilters>) => void; onExpand: () => void; onReset: () => void
}) {
  return (
    <aside className={`${nunito.className} hidden lg:flex flex-col items-center w-[56px] shrink-0 bg-slate-50 dark:bg-slate-950 py-4 gap-2`}>
      <button onClick={onExpand} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm border border-slate-200/60 dark:border-slate-800 mb-2" title="Expand">
        <ChevronsRight className="h-4 w-4" />
      </button>
      {(['no-no-yes', 'no-no-no', 'contacted', 'meeting_booked', 'quoted', 'booked'] as FilterKey[]).map(key => (
        <button key={key} onClick={() => update({ status: key })} title={`${key} (${counts[key]})`}
          className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm transition-all duration-200 ${
            filters.status === key ? 'bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/25' : 'hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
          }`}>
          {SICONS[key]}
        </button>
      ))}
      <div className="w-6 border-t border-slate-200 dark:border-slate-800 my-1" />
      <button onClick={onReset} title="Reset" className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-teal-600 transition-colors">
        <RotateCcw className="h-3 w-3" />
      </button>
    </aside>
  )
}

/* ── Main export ─────────────────────────────────────────────── */

export function FilterSidebar({ filters, onFiltersChange, counts, lostCount, showLost, onShowLostChange, open, onClose, collapsed, onCollapsedChange }: FilterSidebarProps) {
  const update = (patch: Partial<SidebarFilters>) => onFiltersChange({ ...filters, ...patch })
  const resetAll = () => onFiltersChange({ status: 'no-no-yes', location: null, dateRange: 'all', venueType: [], venueRating: null, religion: [], ceremonyLocation: [], chaseStatus: [] })
  const toggleArr = (key: 'venueType' | 'chaseStatus' | 'religion' | 'ceremonyLocation', item: string) => {
    const cur = filters[key]; update({ [key]: cur.includes(item) ? cur.filter(i => i !== item) : [...cur, item] })
  }

  if (collapsed) return <CollapsedBar filters={filters} counts={counts} update={update} onExpand={() => onCollapsedChange(false)} onReset={resetAll} />

  const filterCard = (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Card header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Filter</h2>
        <div className="flex items-center gap-2">
          <button onClick={resetAll} className="text-sm text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Reset</button>
          <button onClick={() => onCollapsedChange(true)} className="hidden lg:flex h-7 w-7 rounded-md items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Collapse">
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button className="lg:hidden h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-600" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Card body — scrollable */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Logo */}
        <Link href="/leads" className="block text-base font-bold text-[#0d4f4f] dark:text-teal-400 tracking-tight hover:text-[#0d4f4f]/80 mb-1">
          SIGS BridalFlow
        </Link>

        {/* STATUS */}
        <div className="space-y-2.5">
          <SectionLabel>Status</SectionLabel>
          {/* Row 1: NNY and NNN side by side */}
          <div className="grid grid-cols-2 gap-2">
            <StatusCard label="NNY" count={counts['no-no-yes']} active={filters.status === 'no-no-yes'} onClick={() => update({ status: 'no-no-yes' })} />
            <StatusCard label="NNN" count={counts['no-no-no']} active={filters.status === 'no-no-no'} onClick={() => update({ status: 'no-no-no' })} />
          </div>
          {/* Row 2: CONTACTED full width */}
          <StatusCard label="CONTACTED" count={counts['contacted']} active={filters.status === 'contacted'} onClick={() => update({ status: 'contacted' })} className="w-full" />
          {/* Row 3: APPT, QUOTED, BOOKED — three buttons */}
          <div className="grid grid-cols-3 gap-2">
            <StatusCard label="APPT" count={counts['meeting_booked']} active={filters.status === 'meeting_booked'} onClick={() => update({ status: 'meeting_booked' })} />
            <StatusCard label="QUOTED" count={counts['quoted']} active={filters.status === 'quoted'} onClick={() => update({ status: 'quoted' })} />
            <StatusCard label="BOOKED" count={counts['booked']} active={filters.status === 'booked'} onClick={() => update({ status: 'booked' })} />
          </div>
        </div>

        {/* CHASE STATUS (contacted only) */}
        {filters.status === 'contacted' && (
          <>
            <div className="space-y-2">
              <SectionLabel>Chase Status</SectionLabel>
              <PillRow items={CHASE} selected={filters.chaseStatus} onToggle={(i) => toggleArr('chaseStatus', i)} />
            </div>
          </>
        )}

        <Divider />

        {/* LOCATION */}
        <div className="space-y-2">
          <SectionLabel>Location</SectionLabel>
          <StyledDropdown value={filters.location || ''} options={LOCATIONS} onChange={(v) => update({ location: v || null })} />
        </div>

        {/* WEDDING DATE */}
        <div className="space-y-2">
          <SectionLabel>Wedding Date</SectionLabel>
          <ButtonGrid items={DATE_OPTS} selected={filters.dateRange} onChange={(v) => update({ dateRange: v })} />
        </div>

        {/* VENUE TYPE */}
        <div className="space-y-2">
          <SectionLabel>Venue Type</SectionLabel>
          <StyledDropdown value={filters.venueType.length === 1 ? filters.venueType[0] : ''} options={VENUE_TYPES} onChange={(v) => update({ venueType: v ? [v] : [] })} />
        </div>

        <Divider />

        {/* VENUE RATING */}
        <div className="space-y-2">
          <SectionLabel>Venue Rating</SectionLabel>
          <SinglePillRow items={RATINGS} selected={filters.venueRating} onSelect={(v) => update({ venueRating: v })} />
        </div>

        {/* RELIGION */}
        <div className="space-y-2">
          <SectionLabel>Religion</SectionLabel>
          <PillRow items={RELIGIONS} selected={filters.religion} onToggle={(i) => toggleArr('religion', i)} />
        </div>

        {/* CEREMONY LOCATION */}
        <div className="space-y-2">
          <SectionLabel>Ceremony Location</SectionLabel>
          <PillRow items={CEREMONY} selected={filters.ceremonyLocation} onToggle={(i) => toggleArr('ceremonyLocation', i)} />
        </div>

        {/* LOST TOGGLE */}
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
          <ButtonWithBadge
            label="Lost"
            count={lostCount}
            active={showLost}
            onClick={() => onShowLostChange(!showLost)}
          />
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden" onClick={onClose} />}

      {/* Desktop sidebar */}
      <aside className={`${nunito.className} hidden lg:block w-[288px] shrink-0 p-4 pr-2 bg-slate-50 dark:bg-slate-950`}>
        {filterCard}
      </aside>

      {/* Mobile drawer */}
      <aside className={`${nunito.className} lg:hidden fixed inset-y-0 left-0 z-50 w-[300px] p-3 bg-slate-50 dark:bg-slate-950 shadow-2xl transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {filterCard}
      </aside>
    </>
  )
}
