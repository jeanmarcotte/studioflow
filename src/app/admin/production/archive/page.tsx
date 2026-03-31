'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, ChevronDown, ChevronRight, X, HardDrive, Users, Database, CheckCircle, AlertTriangle, Copy, Sparkles } from 'lucide-react'
import { Playfair_Display, Nunito } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

// ── Types ────────────────────────────────────────────────────────

interface ArchiveDrive {
  id: string
  drive_number: number
  drive_name: string
  total_folders: number | null
  total_files: number | null
  total_size_gb: number | null
  couples_found: number | null
  scanned_at: string | null
  cleaned_cfa_at: string | null
  notes: string | null
  created_at: string
}

interface ArchiveCouple {
  id: string
  bride_name: string
  groom_name: string
  event_date: string | null
  wedding_year: number | null
  primary_service: string | null
  contracted_services: string[] | null
  drive_number: number
  total_size_gb: number | null
  total_file_count: number | null
  studioflow_couple_id: string | null
  fully_archived: boolean | null
  last_review_at: string | null
  notes: string | null
}

interface ArchiveMilestone {
  id: string
  couple_id: string | null
  drive_id: string | null
  drive_number: number
  folder_name: string
  relative_path: string
  full_path: string
  service_type: string
  service_label: string
  size_gb: number | null
  file_count: number | null
  is_redundant: boolean | null
  status: string | null
  verified: boolean | null
}

// ── Helpers ──────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatGB(gb: number | null): string {
  if (gb == null) return '—'
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`
  return `${gb.toFixed(1)} GB`
}

function formatNumber(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString()
}

// ── Sortable Table Header ────────────────────────────────────────

function SortHeader({ column, label, sortColumn, sortDirection, onSort, align }: {
  column: string
  label: string
  sortColumn: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (col: string) => void
  align?: 'right'
}) {
  return (
    <th
      className="px-3 py-2 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
      style={align === 'right' ? { textAlign: 'right' } : undefined}
      onClick={() => onSort(column)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortColumn === column && (
          <span className="text-foreground">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </span>
    </th>
  )
}

// ── Collapsible Section ──────────────────────────────────────────

function CollapsibleSection({ title, count, defaultOpen, children }: {
  title: string
  count: number
  defaultOpen: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-8">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 mb-4 group"
      >
        {open ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
        <h2 className={`text-xl ${playfair.className}`} style={{ color: '#0d4f4f', fontWeight: 700 }}>
          {title}
        </h2>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#ecfdf5', color: '#0d4f4f' }}>
          {count}
        </span>
      </button>
      {open && children}
    </div>
  )
}

// ── Search Box ───────────────────────────────────────────────────

function SearchBox({ value, onChange, placeholder }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative mb-4 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pl-9 pr-8 !w-full"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════

export default function ProductionArchivePage() {
  const [drives, setDrives] = useState<ArchiveDrive[]>([])
  const [couples, setCouples] = useState<ArchiveCouple[]>([])
  const [milestones, setMilestones] = useState<ArchiveMilestone[]>([])
  const [loading, setLoading] = useState(true)

  // Search states
  const [driveSearch, setDriveSearch] = useState('')
  const [coupleSearch, setCoupleSearch] = useState('')
  const [milestoneSearch, setMilestoneSearch] = useState('')

  // Sort states per section
  const [driveSortCol, setDriveSortCol] = useState<string | null>(null)
  const [driveSortDir, setDriveSortDir] = useState<'asc' | 'desc'>('asc')
  const [coupleSortCol, setCoupleSortCol] = useState<string | null>(null)
  const [coupleSortDir, setCoupleSortDir] = useState<'asc' | 'desc'>('asc')
  const [milestoneSortCol, setMilestoneSortCol] = useState<string | null>(null)
  const [milestoneSortDir, setMilestoneSortDir] = useState<'asc' | 'desc'>('asc')

  // Drawer
  const [selectedCoupleId, setSelectedCoupleId] = useState<string | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)

  // ── Fetch Data ──────────────────────────────────────────────────

  useEffect(() => {
    const fetchAll = async () => {
      const [drivesRes, couplesRes, milestonesRes] = await Promise.all([
        supabase.from('archive_drives').select('*').order('drive_number', { ascending: true }),
        supabase.from('archive_couples').select('*').order('bride_name', { ascending: true }),
        supabase.from('archive_milestones').select('*').order('drive_number', { ascending: true }),
      ])

      if (!drivesRes.error && drivesRes.data) setDrives(drivesRes.data)
      if (!couplesRes.error && couplesRes.data) setCouples(couplesRes.data)
      if (!milestonesRes.error && milestonesRes.data) setMilestones(milestonesRes.data)
      setLoading(false)
    }
    fetchAll()
  }, [])

  // ── Sort Handlers ───────────────────────────────────────────────

  const handleDriveSort = useCallback((col: string) => {
    if (driveSortCol === col) setDriveSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setDriveSortCol(col); setDriveSortDir('asc') }
  }, [driveSortCol])

  const handleCoupleSort = useCallback((col: string) => {
    if (coupleSortCol === col) setCoupleSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setCoupleSortCol(col); setCoupleSortDir('asc') }
  }, [coupleSortCol])

  const handleMilestoneSort = useCallback((col: string) => {
    if (milestoneSortCol === col) setMilestoneSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setMilestoneSortCol(col); setMilestoneSortDir('asc') }
  }, [milestoneSortCol])

  // ── Computed: Stats ─────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalDrives = drives.length
    const totalCouples = couples.length
    const totalStorageGB = drives.reduce((sum, d) => sum + (d.total_size_gb || 0), 0)
    const fullyArchived = couples.filter(c => c.fully_archived).length
    // Missing assets: couples where contracted_services has items not matched in milestones
    const missingAssets = couples.filter(c => {
      if (!c.contracted_services || c.contracted_services.length === 0) return false
      const coupleMilestones = milestones.filter(m => m.couple_id === c.id)
      const milestoneTypes = new Set(coupleMilestones.map(m => m.service_type))
      return c.contracted_services.some(s => !milestoneTypes.has(s))
    }).length
    const redundantFiles = milestones.filter(m => m.is_redundant).length
    const cfaCleaned = drives.filter(d => d.cleaned_cfa_at).length

    return { totalDrives, totalCouples, totalStorageGB, fullyArchived, missingAssets, redundantFiles, cfaCleaned }
  }, [drives, couples, milestones])

  // ── Computed: Filtered & Sorted Drives ──────────────────────────

  const filteredDrives = useMemo(() => {
    let result = [...drives]
    if (driveSearch.trim()) {
      const q = driveSearch.toLowerCase()
      result = result.filter(d =>
        d.drive_name.toLowerCase().includes(q) ||
        String(d.drive_number).includes(q) ||
        d.notes?.toLowerCase().includes(q)
      )
    }
    if (driveSortCol) {
      const dir = driveSortDir === 'asc' ? 1 : -1
      result.sort((a, b) => {
        switch (driveSortCol) {
          case 'drive_number': return ((a.drive_number || 0) - (b.drive_number || 0)) * dir
          case 'drive_name': return (a.drive_name || '').localeCompare(b.drive_name || '') * dir
          case 'scanned_at': return (a.scanned_at || '').localeCompare(b.scanned_at || '') * dir
          case 'total_size_gb': return ((a.total_size_gb || 0) - (b.total_size_gb || 0)) * dir
          case 'total_folders': return ((a.total_folders || 0) - (b.total_folders || 0)) * dir
          case 'total_files': return ((a.total_files || 0) - (b.total_files || 0)) * dir
          case 'couples_found': return ((a.couples_found || 0) - (b.couples_found || 0)) * dir
          case 'cleaned_cfa_at': return (a.cleaned_cfa_at || '').localeCompare(b.cleaned_cfa_at || '') * dir
          case 'notes': return (a.notes || '').localeCompare(b.notes || '') * dir
          default: return 0
        }
      })
    }
    return result
  }, [drives, driveSearch, driveSortCol, driveSortDir])

  // ── Computed: Milestone map per couple ───────────────────────────

  const coupleMilestoneMap = useMemo(() => {
    const map: Record<string, ArchiveMilestone[]> = {}
    for (const m of milestones) {
      if (m.couple_id) {
        if (!map[m.couple_id]) map[m.couple_id] = []
        map[m.couple_id].push(m)
      }
    }
    return map
  }, [milestones])

  // ── Computed: Drive numbers per couple ──────────────────────────

  const coupleDriveNumbers = useMemo(() => {
    const map: Record<string, Set<number>> = {}
    for (const m of milestones) {
      if (m.couple_id) {
        if (!map[m.couple_id]) map[m.couple_id] = new Set()
        map[m.couple_id].add(m.drive_number)
      }
    }
    return map
  }, [milestones])

  // ── Computed: Filtered & Sorted Couples ─────────────────────────

  const filteredCouples = useMemo(() => {
    let result = [...couples]
    if (coupleSearch.trim()) {
      const q = coupleSearch.toLowerCase()
      result = result.filter(c =>
        c.bride_name.toLowerCase().includes(q) ||
        c.groom_name.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q)
      )
    }
    if (coupleSortCol) {
      const dir = coupleSortDir === 'asc' ? 1 : -1
      result.sort((a, b) => {
        switch (coupleSortCol) {
          case 'bride_name': return a.bride_name.localeCompare(b.bride_name) * dir
          case 'groom_name': return a.groom_name.localeCompare(b.groom_name) * dir
          case 'wedding_year': return ((a.wedding_year || 0) - (b.wedding_year || 0)) * dir
          case 'drives': {
            const aDrives = coupleDriveNumbers[a.id] ? Array.from(coupleDriveNumbers[a.id]).sort().join(',') : ''
            const bDrives = coupleDriveNumbers[b.id] ? Array.from(coupleDriveNumbers[b.id]).sort().join(',') : ''
            return aDrives.localeCompare(bDrives) * dir
          }
          case 'services': {
            const aMs = coupleMilestoneMap[a.id]?.length || 0
            const bMs = coupleMilestoneMap[b.id]?.length || 0
            return (aMs - bMs) * dir
          }
          case 'total_size_gb': return ((a.total_size_gb || 0) - (b.total_size_gb || 0)) * dir
          case 'studioflow': {
            const aLinked = a.studioflow_couple_id ? 1 : 0
            const bLinked = b.studioflow_couple_id ? 1 : 0
            return (aLinked - bLinked) * dir
          }
          case 'fully_archived': {
            const aVal = a.fully_archived ? 1 : 0
            const bVal = b.fully_archived ? 1 : 0
            return (aVal - bVal) * dir
          }
          default: return 0
        }
      })
    }
    return result
  }, [couples, coupleSearch, coupleSortCol, coupleSortDir, coupleDriveNumbers, coupleMilestoneMap])

  // ── Computed: Filtered & Sorted Milestones ──────────────────────

  const filteredMilestones = useMemo(() => {
    let result = [...milestones]
    if (milestoneSearch.trim()) {
      const q = milestoneSearch.toLowerCase()
      result = result.filter(m => {
        const couple = couples.find(c => c.id === m.couple_id)
        const coupleName = couple ? `${couple.bride_name} ${couple.groom_name}` : ''
        return coupleName.toLowerCase().includes(q) ||
          m.folder_name.toLowerCase().includes(q) ||
          m.service_label.toLowerCase().includes(q) ||
          String(m.drive_number).includes(q)
      })
    }
    if (milestoneSortCol) {
      const dir = milestoneSortDir === 'asc' ? 1 : -1
      result.sort((a, b) => {
        switch (milestoneSortCol) {
          case 'couple': {
            const ac = couples.find(c => c.id === a.couple_id)
            const bc = couples.find(c => c.id === b.couple_id)
            return (ac?.bride_name || '').localeCompare(bc?.bride_name || '') * dir
          }
          case 'service_label': return a.service_label.localeCompare(b.service_label) * dir
          case 'drive_number': return (a.drive_number - b.drive_number) * dir
          case 'folder_name': return a.folder_name.localeCompare(b.folder_name) * dir
          case 'size_gb': return ((a.size_gb || 0) - (b.size_gb || 0)) * dir
          case 'file_count': return ((a.file_count || 0) - (b.file_count || 0)) * dir
          case 'is_redundant': return ((a.is_redundant ? 1 : 0) - (b.is_redundant ? 1 : 0)) * dir
          case 'status': return (a.status || '').localeCompare(b.status || '') * dir
          case 'verified': return ((a.verified ? 1 : 0) - (b.verified ? 1 : 0)) * dir
          default: return 0
        }
      })
    }
    return result
  }, [milestones, milestoneSearch, milestoneSortCol, milestoneSortDir, couples])

  // ── Selected couple for drawer ──────────────────────────────────

  const selectedCouple = useMemo(() => {
    if (!selectedCoupleId) return null
    return couples.find(c => c.id === selectedCoupleId) || null
  }, [selectedCoupleId, couples])

  const selectedCoupleMilestones = useMemo(() => {
    if (!selectedCoupleId) return []
    return coupleMilestoneMap[selectedCoupleId] || []
  }, [selectedCoupleId, coupleMilestoneMap])

  // ── Mark as Reviewed ────────────────────────────────────────────

  const handleMarkReviewed = useCallback(async () => {
    if (!selectedCoupleId) return
    setReviewLoading(true)
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('archive_couples')
      .update({ last_review_at: now })
      .eq('id', selectedCoupleId)
    if (!error) {
      setCouples(prev => prev.map(c => c.id === selectedCoupleId ? { ...c, last_review_at: now } : c))
    }
    setReviewLoading(false)
  }, [selectedCoupleId])

  // ── Loading ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════

  return (
    <div className={`space-y-0 ${nunito.className}`}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className={`text-2xl font-bold ${playfair.className}`} style={{ color: '#0d4f4f' }}>
          PhotoVault Archive
        </h1>
        <p className="text-muted-foreground">
          {drives.length} drives &middot; {couples.length} couples &middot; {formatGB(stats.totalStorageGB)} total
        </p>
      </div>

      {/* Content area: main + sidebar */}
      <div className="flex">
        {/* Main Panel */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-border">

          {/* ══════ SECTION 1: Drive Inventory ══════ */}
          <CollapsibleSection title="Drive Inventory" count={filteredDrives.length} defaultOpen={true}>
            <SearchBox value={driveSearch} onChange={setDriveSearch} placeholder="Search drives..." />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <SortHeader column="drive_number" label="Drive #" sortColumn={driveSortCol} sortDirection={driveSortDir} onSort={handleDriveSort} />
                    <SortHeader column="drive_name" label="Drive Name" sortColumn={driveSortCol} sortDirection={driveSortDir} onSort={handleDriveSort} />
                    <SortHeader column="scanned_at" label="Scanned" sortColumn={driveSortCol} sortDirection={driveSortDir} onSort={handleDriveSort} />
                    <SortHeader column="total_size_gb" label="Size" sortColumn={driveSortCol} sortDirection={driveSortDir} onSort={handleDriveSort} align="right" />
                    <SortHeader column="total_folders" label="Folders" sortColumn={driveSortCol} sortDirection={driveSortDir} onSort={handleDriveSort} align="right" />
                    <SortHeader column="total_files" label="Files" sortColumn={driveSortCol} sortDirection={driveSortDir} onSort={handleDriveSort} align="right" />
                    <SortHeader column="couples_found" label="Couples" sortColumn={driveSortCol} sortDirection={driveSortDir} onSort={handleDriveSort} align="right" />
                    <SortHeader column="cleaned_cfa_at" label="CFA Cleaned" sortColumn={driveSortCol} sortDirection={driveSortDir} onSort={handleDriveSort} />
                    <SortHeader column="notes" label="Notes" sortColumn={driveSortCol} sortDirection={driveSortDir} onSort={handleDriveSort} />
                  </tr>
                </thead>
                <tbody>
                  {filteredDrives.map(d => (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 font-semibold">{d.drive_number}</td>
                      <td className="px-3 py-2.5">{d.drive_name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{formatDate(d.scanned_at)}</td>
                      <td className="px-3 py-2.5" style={{ textAlign: 'right' }}>{formatGB(d.total_size_gb)}</td>
                      <td className="px-3 py-2.5" style={{ textAlign: 'right' }}>{formatNumber(d.total_folders)}</td>
                      <td className="px-3 py-2.5" style={{ textAlign: 'right' }}>{formatNumber(d.total_files)}</td>
                      <td className="px-3 py-2.5" style={{ textAlign: 'right' }}>{formatNumber(d.couples_found)}</td>
                      <td className="px-3 py-2.5">
                        {d.cleaned_cfa_at ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            {formatDate(d.cleaned_cfa_at)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{d.notes || '—'}</td>
                    </tr>
                  ))}
                  {filteredDrives.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No drives found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>

          {/* ══════ SECTION 2: Couples Master List ══════ */}
          <CollapsibleSection title="Couples Master List" count={filteredCouples.length} defaultOpen={true}>
            <SearchBox value={coupleSearch} onChange={setCoupleSearch} placeholder="Search couples..." />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <SortHeader column="bride_name" label="Bride" sortColumn={coupleSortCol} sortDirection={coupleSortDir} onSort={handleCoupleSort} />
                    <SortHeader column="groom_name" label="Groom" sortColumn={coupleSortCol} sortDirection={coupleSortDir} onSort={handleCoupleSort} />
                    <SortHeader column="wedding_year" label="Year" sortColumn={coupleSortCol} sortDirection={coupleSortDir} onSort={handleCoupleSort} />
                    <SortHeader column="drives" label="Drive(s)" sortColumn={coupleSortCol} sortDirection={coupleSortDir} onSort={handleCoupleSort} />
                    <SortHeader column="services" label="Services" sortColumn={coupleSortCol} sortDirection={coupleSortDir} onSort={handleCoupleSort} />
                    <SortHeader column="total_size_gb" label="Total GB" sortColumn={coupleSortCol} sortDirection={coupleSortDir} onSort={handleCoupleSort} align="right" />
                    <SortHeader column="studioflow" label="StudioFlow" sortColumn={coupleSortCol} sortDirection={coupleSortDir} onSort={handleCoupleSort} />
                    <SortHeader column="fully_archived" label="Archived" sortColumn={coupleSortCol} sortDirection={coupleSortDir} onSort={handleCoupleSort} />
                  </tr>
                </thead>
                <tbody>
                  {filteredCouples.map(c => {
                    const driveNums = coupleDriveNumbers[c.id]
                    const ms = coupleMilestoneMap[c.id] || []
                    const contractedCount = c.contracted_services?.length || 0
                    const serviceCount = ms.length

                    return (
                      <tr
                        key={c.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedCoupleId(c.id)}
                      >
                        <td className="px-3 py-2.5 font-semibold">{c.bride_name}</td>
                        <td className="px-3 py-2.5">{c.groom_name}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{c.wedding_year || '—'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {driveNums ? Array.from(driveNums).sort((a, b) => a - b).join(', ') : String(c.drive_number)}
                        </td>
                        <td className="px-3 py-2.5">
                          {contractedCount > 0 ? (
                            <span className={serviceCount >= contractedCount ? 'text-green-600' : 'text-amber-600'}>
                              {serviceCount} of {contractedCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{serviceCount}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5" style={{ textAlign: 'right' }}>{formatGB(c.total_size_gb)}</td>
                        <td className="px-3 py-2.5">
                          {c.studioflow_couple_id ? (
                            <span className="text-green-600 font-semibold">&#x2705;</span>
                          ) : (
                            <span className="text-amber-500">&#x26A0;&#xFE0F;</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {c.fully_archived ? (
                            <span className="text-green-600 font-semibold">&#x2705;</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredCouples.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No couples found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>

          {/* ══════ SECTION 3: Milestone Details ══════ */}
          <CollapsibleSection title="Milestone Details" count={filteredMilestones.length} defaultOpen={false}>
            <SearchBox value={milestoneSearch} onChange={setMilestoneSearch} placeholder="Search milestones..." />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <SortHeader column="couple" label="Couple" sortColumn={milestoneSortCol} sortDirection={milestoneSortDir} onSort={handleMilestoneSort} />
                    <SortHeader column="service_label" label="Service" sortColumn={milestoneSortCol} sortDirection={milestoneSortDir} onSort={handleMilestoneSort} />
                    <SortHeader column="drive_number" label="Drive" sortColumn={milestoneSortCol} sortDirection={milestoneSortDir} onSort={handleMilestoneSort} />
                    <SortHeader column="folder_name" label="Folder Name" sortColumn={milestoneSortCol} sortDirection={milestoneSortDir} onSort={handleMilestoneSort} />
                    <SortHeader column="size_gb" label="Size GB" sortColumn={milestoneSortCol} sortDirection={milestoneSortDir} onSort={handleMilestoneSort} align="right" />
                    <SortHeader column="file_count" label="Files" sortColumn={milestoneSortCol} sortDirection={milestoneSortDir} onSort={handleMilestoneSort} align="right" />
                    <SortHeader column="is_redundant" label="Redundant" sortColumn={milestoneSortCol} sortDirection={milestoneSortDir} onSort={handleMilestoneSort} />
                    <SortHeader column="status" label="Status" sortColumn={milestoneSortCol} sortDirection={milestoneSortDir} onSort={handleMilestoneSort} />
                    <SortHeader column="verified" label="Verified" sortColumn={milestoneSortCol} sortDirection={milestoneSortDir} onSort={handleMilestoneSort} />
                  </tr>
                </thead>
                <tbody>
                  {filteredMilestones.map(m => {
                    const couple = couples.find(c => c.id === m.couple_id)
                    return (
                      <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5">
                          {couple ? `${couple.bride_name} & ${couple.groom_name}` : '—'}
                        </td>
                        <td className="px-3 py-2.5">{m.service_label}</td>
                        <td className="px-3 py-2.5">{m.drive_number}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate" title={m.folder_name}>
                          {m.folder_name}
                        </td>
                        <td className="px-3 py-2.5" style={{ textAlign: 'right' }}>{formatGB(m.size_gb)}</td>
                        <td className="px-3 py-2.5" style={{ textAlign: 'right' }}>{formatNumber(m.file_count)}</td>
                        <td className="px-3 py-2.5">
                          {m.is_redundant ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Yes</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            {m.status || 'Online'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {m.verified ? (
                            <span className="text-green-600 font-semibold">&#x2705;</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredMilestones.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No milestones found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>

        </div>

        {/* ══════ SIDEBAR: Stats ══════ */}
        <div className="w-72 shrink-0 p-6 space-y-4">
          <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${playfair.className}`} style={{ color: '#0d4f4f' }}>
            Archive Stats
          </h3>

          {/* Stat boxes */}
          {[
            { label: 'Total Drives', value: stats.totalDrives, icon: HardDrive, color: '#0d4f4f' },
            { label: 'Total Couples', value: stats.totalCouples, icon: Users, color: '#0d4f4f' },
            { label: 'Total Storage', value: formatGB(stats.totalStorageGB), icon: Database, color: '#0d4f4f' },
            { label: 'Fully Archived', value: stats.fullyArchived, icon: CheckCircle, color: '#16a34a' },
            { label: 'Missing Assets', value: stats.missingAssets, icon: AlertTriangle, color: stats.missingAssets > 0 ? '#d97706' : '#0d4f4f' },
            { label: 'Redundant Files', value: stats.redundantFiles, icon: Copy, color: '#6366f1' },
            { label: 'CFA Cleaned', value: stats.cfaCleaned, icon: Sparkles, color: '#0d9488' },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-lg border border-border p-3 flex items-center gap-3"
              style={{ backgroundColor: '#faf8f5' }}
            >
              <div className="p-2 rounded-md" style={{ backgroundColor: `${s.color}15` }}>
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════ COUPLE DETAIL DRAWER ══════ */}
      {selectedCouple && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSelectedCoupleId(null)}
          />
          {/* Drawer */}
          <div className="relative w-[480px] max-w-full bg-background shadow-xl overflow-y-auto" style={{ backgroundColor: '#faf8f5' }}>
            <div className="p-6">
              {/* Close button */}
              <button
                onClick={() => setSelectedCoupleId(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header */}
              <h2 className={`text-xl mb-1 ${playfair.className}`} style={{ color: '#0d4f4f', fontWeight: 700 }}>
                {selectedCouple.bride_name} &amp; {selectedCouple.groom_name}
              </h2>
              {selectedCouple.event_date && (
                <p className="text-sm text-muted-foreground mb-2">
                  {formatDate(selectedCouple.event_date)}
                </p>
              )}
              {selectedCouple.wedding_year && !selectedCouple.event_date && (
                <p className="text-sm text-muted-foreground mb-2">
                  Year: {selectedCouple.wedding_year}
                </p>
              )}

              {/* StudioFlow link status */}
              <div className="flex items-center gap-2 mb-6 text-sm">
                <span className="font-semibold">StudioFlow:</span>
                {selectedCouple.studioflow_couple_id ? (
                  <span className="text-green-600">&#x2705; Linked</span>
                ) : (
                  <span className="text-amber-500">&#x26A0;&#xFE0F; Unlinked</span>
                )}
                {selectedCouple.primary_service && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <span>Package: {selectedCouple.primary_service}</span>
                  </>
                )}
              </div>

              {/* Checkbox View — The Golden View */}
              <div className="mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#0d4f4f' }}>
                  What Should Be Here:
                </h3>

                {selectedCoupleMilestones.length > 0 ? (
                  <div className="space-y-2">
                    {selectedCoupleMilestones.map(m => (
                      <div key={m.id} className="flex items-start gap-2 text-sm">
                        <span className="text-green-600 mt-0.5">&#x2611;</span>
                        <div className="flex-1">
                          <span className="font-medium">{m.service_label}</span>
                          <span className="text-muted-foreground ml-2">
                            Drive {m.drive_number} — {formatGB(m.size_gb)}
                          </span>
                          {m.is_redundant && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                              Redundant
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No milestones found for this couple.</p>
                )}

                {/* Show missing contracted services */}
                {selectedCouple.contracted_services && selectedCouple.contracted_services.length > 0 && (() => {
                  const foundTypes = new Set(selectedCoupleMilestones.map(m => m.service_type))
                  const missing = selectedCouple.contracted_services!.filter(s => !foundTypes.has(s))
                  if (missing.length === 0) return null
                  return (
                    <div className="mt-3 space-y-2">
                      {missing.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-red-500 mt-0.5">&#x2610;</span>
                          <div className="flex-1">
                            <span className="font-medium">{s}</span>
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                              NOT FOUND
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* Summary */}
              <div className="text-sm text-muted-foreground mb-6 space-y-1">
                <p>
                  Total: {formatGB(selectedCouple.total_size_gb)}
                  {' across '}
                  {coupleDriveNumbers[selectedCouple.id]
                    ? Array.from(coupleDriveNumbers[selectedCouple.id]).length
                    : 1}
                  {' drive(s)'}
                </p>
                <p>
                  Last reviewed: {selectedCouple.last_review_at ? formatDate(selectedCouple.last_review_at) : 'Never'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleMarkReviewed}
                  disabled={reviewLoading}
                  className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: '#0d4f4f' }}
                >
                  {reviewLoading ? 'Saving...' : 'Mark as Reviewed'}
                </button>
                {selectedCouple.studioflow_couple_id && (
                  <a
                    href={`/admin/couples/${selectedCouple.studioflow_couple_id}`}
                    className="px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors"
                  >
                    View in StudioFlow &rarr;
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
