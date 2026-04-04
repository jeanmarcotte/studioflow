'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, ChevronDown, ChevronRight, X } from 'lucide-react'
import { ProductionPageHeader, ProductionPills, ProductionSidebar } from '@/components/shared'
import { Playfair_Display, Nunito } from 'next/font/google'
import { formatDateCompact } from '@/lib/formatters'

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

const formatDateLocal = formatDateCompact

function formatGB(gb: number | null): string {
  if (gb == null) return '—'
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`
  return `${gb.toFixed(1)} GB`
}

function formatNumber(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString()
}

type SortDir = 'asc' | 'desc'

// ══════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════

export default function ProductionArchivePage() {
  const [drives, setDrives] = useState<ArchiveDrive[]>([])
  const [couples, setCouples] = useState<ArchiveCouple[]>([])
  const [milestones, setMilestones] = useState<ArchiveMilestone[]>([])
  const [loading, setLoading] = useState(true)

  // Search
  const [driveSearch, setDriveSearch] = useState('')
  const [coupleSearch, setCoupleSearch] = useState('')
  const [milestoneSearch, setMilestoneSearch] = useState('')

  // Sort per section
  const [driveSortCol, setDriveSortCol] = useState<string | null>(null)
  const [driveSortDir, setDriveSortDir] = useState<SortDir>('asc')
  const [coupleSortCol, setCoupleSortCol] = useState<string | null>(null)
  const [coupleSortDir, setCoupleSortDir] = useState<SortDir>('asc')
  const [milestoneSortCol, setMilestoneSortCol] = useState<string | null>(null)
  const [milestoneSortDir, setMilestoneSortDir] = useState<SortDir>('asc')

  // Collapsed lanes
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set(['milestones']))

  // Drawer
  const [selectedCoupleId, setSelectedCoupleId] = useState<string | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)

  // ── Fetch ───────────────────────────────────────────────────────

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

  // ── Sort handlers ───────────────────────────────────────────────

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

  const toggleLane = (key: string) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── Computed: Stats ─────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalDrives = drives.length
    const totalCouples = couples.length
    const totalStorageGB = drives.reduce((sum, d) => sum + (d.total_size_gb || 0), 0)
    const fullyArchived = couples.filter(c => c.fully_archived).length
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

  // ── Sort header helper ──────────────────────────────────────────

  const SortBtn = ({ col, children, sortCol, sortDir: sd, onSort }: {
    col: string; children: React.ReactNode; sortCol: string | null; sortDir: SortDir; onSort: (c: string) => void
  }) => (
    <button
      onClick={() => onSort(col)}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wide"
    >
      {children}
      {sortCol === col && (
        <span className="text-[10px]">{sd === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  )

  // ── Loading ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-0">
      <ProductionPageHeader
        title="Photo Vault Archive"
        subtitle={`${drives.length} drives \u00B7 ${couples.length} couples \u00B7 ${formatGB(stats.totalStorageGB)} total`}
        reportHref="/admin/production/report"
        actionLabel="+ Add Archive"
        actionHref="/admin/production/archive/new"
        actionDisabled={true}
      />

      <ProductionPills pills={[
        { label: 'Total Couples', count: stats.totalCouples, color: 'default' },
        { label: 'Fully Archived', count: stats.fullyArchived, color: 'green' },
        { label: 'Not Archived', count: stats.totalCouples - stats.fullyArchived, color: 'yellow' },
        { label: 'Missing Assets', count: stats.missingAssets, color: 'red' },
      ]} />

      {/* Content area: main panel + stats sidebar */}
      <div className="flex">
        {/* Main Panel */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-border">

          {/* ══════ SECTION 1: Drive Inventory ══════ */}
          <div id="section-drives" className="rounded-xl border bg-card mb-6">
            <button
              onClick={() => toggleLane('drives')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {collapsedLanes.has('drives')
                  ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
                <span className="font-semibold text-sm">Drive Inventory</span>
                <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-muted text-muted-foreground">
                  {filteredDrives.length}
                </span>
              </div>
            </button>

            {!collapsedLanes.has('drives') && (
              <div className="border-t">
                {/* Search */}
                <div className="px-4 pt-3 pb-2">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={driveSearch}
                      onChange={e => setDriveSearch(e.target.value)}
                      placeholder="Search drives..."
                      className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none transition-colors focus:border-ring"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className={`${nunito.className} w-full text-sm`}>
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-3 py-2.5"><SortBtn col="drive_number" sortCol={driveSortCol} sortDir={driveSortDir} onSort={handleDriveSort}>Drive #</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="drive_name" sortCol={driveSortCol} sortDir={driveSortDir} onSort={handleDriveSort}>Drive Name</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="scanned_at" sortCol={driveSortCol} sortDir={driveSortDir} onSort={handleDriveSort}>Scanned</SortBtn></th>
                        <th className="text-right px-3 py-2.5"><SortBtn col="total_size_gb" sortCol={driveSortCol} sortDir={driveSortDir} onSort={handleDriveSort}>Size</SortBtn></th>
                        <th className="text-right px-3 py-2.5"><SortBtn col="total_folders" sortCol={driveSortCol} sortDir={driveSortDir} onSort={handleDriveSort}>Folders</SortBtn></th>
                        <th className="text-right px-3 py-2.5"><SortBtn col="total_files" sortCol={driveSortCol} sortDir={driveSortDir} onSort={handleDriveSort}>Files</SortBtn></th>
                        <th className="text-right px-3 py-2.5"><SortBtn col="couples_found" sortCol={driveSortCol} sortDir={driveSortDir} onSort={handleDriveSort}>Couples</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="cleaned_cfa_at" sortCol={driveSortCol} sortDir={driveSortDir} onSort={handleDriveSort}>CFA Cleaned</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="notes" sortCol={driveSortCol} sortDir={driveSortDir} onSort={handleDriveSort}>Notes</SortBtn></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredDrives.map(d => (
                        <tr key={d.id} className="hover:bg-accent/30 transition-colors">
                          <td className="px-3 py-2.5 font-semibold">{d.drive_number}</td>
                          <td className="px-3 py-2.5">{d.drive_name}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{formatDateLocal(d.scanned_at)}</td>
                          <td className="px-3 py-2.5 text-muted-foreground" style={{ textAlign: 'right' }}>{formatGB(d.total_size_gb)}</td>
                          <td className="px-3 py-2.5 text-muted-foreground" style={{ textAlign: 'right' }}>{formatNumber(d.total_folders)}</td>
                          <td className="px-3 py-2.5 text-muted-foreground" style={{ textAlign: 'right' }}>{formatNumber(d.total_files)}</td>
                          <td className="px-3 py-2.5 text-muted-foreground" style={{ textAlign: 'right' }}>{formatNumber(d.couples_found)}</td>
                          <td className="px-3 py-2.5">
                            {d.cleaned_cfa_at ? (
                              <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-green-100 text-green-700">
                                {formatDateLocal(d.cleaned_cfa_at)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground text-xs">{d.notes || '—'}</td>
                        </tr>
                      ))}
                      {filteredDrives.length === 0 && (
                        <tr><td colSpan={9} className="px-4 py-6 text-center text-sm text-muted-foreground">No drives found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ══════ SECTION 2: Couples Master List ══════ */}
          <div id="section-couples" className="rounded-xl border bg-card mb-6">
            <button
              onClick={() => toggleLane('couples')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {collapsedLanes.has('couples')
                  ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
                <span className="font-semibold text-sm">Couples Master List</span>
                <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-muted text-muted-foreground">
                  {filteredCouples.length}
                </span>
              </div>
            </button>

            {!collapsedLanes.has('couples') && (
              <div className="border-t">
                {/* Search */}
                <div className="px-4 pt-3 pb-2">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={coupleSearch}
                      onChange={e => setCoupleSearch(e.target.value)}
                      placeholder="Search couples..."
                      className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none transition-colors focus:border-ring"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className={`${nunito.className} w-full text-sm`}>
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-3 py-2.5"><SortBtn col="bride_name" sortCol={coupleSortCol} sortDir={coupleSortDir} onSort={handleCoupleSort}>Bride</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="groom_name" sortCol={coupleSortCol} sortDir={coupleSortDir} onSort={handleCoupleSort}>Groom</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="wedding_year" sortCol={coupleSortCol} sortDir={coupleSortDir} onSort={handleCoupleSort}>Year</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="drives" sortCol={coupleSortCol} sortDir={coupleSortDir} onSort={handleCoupleSort}>Drive(s)</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="services" sortCol={coupleSortCol} sortDir={coupleSortDir} onSort={handleCoupleSort}>Services</SortBtn></th>
                        <th className="text-right px-3 py-2.5"><SortBtn col="total_size_gb" sortCol={coupleSortCol} sortDir={coupleSortDir} onSort={handleCoupleSort}>Total GB</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="studioflow" sortCol={coupleSortCol} sortDir={coupleSortDir} onSort={handleCoupleSort}>StudioFlow</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="fully_archived" sortCol={coupleSortCol} sortDir={coupleSortDir} onSort={handleCoupleSort}>Archived</SortBtn></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredCouples.map(c => {
                        const driveNums = coupleDriveNumbers[c.id]
                        const ms = coupleMilestoneMap[c.id] || []
                        const contractedCount = c.contracted_services?.length || 0
                        const serviceCount = ms.length

                        return (
                          <tr
                            key={c.id}
                            className="hover:bg-accent/30 transition-colors cursor-pointer"
                            onClick={() => setSelectedCoupleId(c.id)}
                          >
                            <td className="px-3 py-2.5 font-medium">{c.bride_name}</td>
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
                            <td className="px-3 py-2.5 text-muted-foreground" style={{ textAlign: 'right' }}>{formatGB(c.total_size_gb)}</td>
                            <td className="px-3 py-2.5">
                              {c.studioflow_couple_id
                                ? <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-green-100 text-green-700">Linked</span>
                                : <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-amber-100 text-amber-700">Unlinked</span>
                              }
                            </td>
                            <td className="px-3 py-2.5">
                              {c.fully_archived
                                ? <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-green-100 text-green-700">Yes</span>
                                : <span className="text-muted-foreground">—</span>
                              }
                            </td>
                          </tr>
                        )
                      })}
                      {filteredCouples.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-muted-foreground">No couples found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ══════ SECTION 3: Milestone Details ══════ */}
          <div id="section-milestones" className="rounded-xl border bg-card">
            <button
              onClick={() => toggleLane('milestones')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {collapsedLanes.has('milestones')
                  ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
                <span className="font-semibold text-sm">Milestone Details</span>
                <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-muted text-muted-foreground">
                  {filteredMilestones.length}
                </span>
              </div>
            </button>

            {!collapsedLanes.has('milestones') && (
              <div className="border-t">
                {/* Search */}
                <div className="px-4 pt-3 pb-2">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={milestoneSearch}
                      onChange={e => setMilestoneSearch(e.target.value)}
                      placeholder="Search milestones..."
                      className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none transition-colors focus:border-ring"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className={`${nunito.className} w-full text-sm`}>
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-3 py-2.5"><SortBtn col="couple" sortCol={milestoneSortCol} sortDir={milestoneSortDir} onSort={handleMilestoneSort}>Couple</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="service_label" sortCol={milestoneSortCol} sortDir={milestoneSortDir} onSort={handleMilestoneSort}>Service</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="drive_number" sortCol={milestoneSortCol} sortDir={milestoneSortDir} onSort={handleMilestoneSort}>Drive</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="folder_name" sortCol={milestoneSortCol} sortDir={milestoneSortDir} onSort={handleMilestoneSort}>Folder Name</SortBtn></th>
                        <th className="text-right px-3 py-2.5"><SortBtn col="size_gb" sortCol={milestoneSortCol} sortDir={milestoneSortDir} onSort={handleMilestoneSort}>Size GB</SortBtn></th>
                        <th className="text-right px-3 py-2.5"><SortBtn col="file_count" sortCol={milestoneSortCol} sortDir={milestoneSortDir} onSort={handleMilestoneSort}>Files</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="is_redundant" sortCol={milestoneSortCol} sortDir={milestoneSortDir} onSort={handleMilestoneSort}>Redundant</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="status" sortCol={milestoneSortCol} sortDir={milestoneSortDir} onSort={handleMilestoneSort}>Status</SortBtn></th>
                        <th className="text-left px-3 py-2.5"><SortBtn col="verified" sortCol={milestoneSortCol} sortDir={milestoneSortDir} onSort={handleMilestoneSort}>Verified</SortBtn></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredMilestones.map(m => {
                        const couple = couples.find(c => c.id === m.couple_id)
                        return (
                          <tr key={m.id} className="hover:bg-accent/30 transition-colors">
                            <td className="px-3 py-2.5">
                              {couple ? `${couple.bride_name} & ${couple.groom_name}` : '—'}
                            </td>
                            <td className="px-3 py-2.5">{m.service_label}</td>
                            <td className="px-3 py-2.5">{m.drive_number}</td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate" title={m.folder_name}>
                              {m.folder_name}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground" style={{ textAlign: 'right' }}>{formatGB(m.size_gb)}</td>
                            <td className="px-3 py-2.5 text-muted-foreground" style={{ textAlign: 'right' }}>{formatNumber(m.file_count)}</td>
                            <td className="px-3 py-2.5">
                              {m.is_redundant ? (
                                <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-amber-100 text-amber-700">Yes</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-blue-100 text-blue-700">
                                {m.status || 'Online'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              {m.verified
                                ? <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-green-100 text-green-700">Yes</span>
                                : <span className="text-muted-foreground">—</span>
                              }
                            </td>
                          </tr>
                        )
                      })}
                      {filteredMilestones.length === 0 && (
                        <tr><td colSpan={9} className="px-4 py-6 text-center text-sm text-muted-foreground">No milestones found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>

        <ProductionSidebar boxes={[
          { label: 'TOTAL DRIVES', value: stats.totalDrives, scrollToId: 'section-drives', color: 'default' },
          { label: 'TOTAL COUPLES', value: stats.totalCouples, scrollToId: 'section-couples', color: 'default' },
          { label: 'TOTAL STORAGE', value: formatGB(stats.totalStorageGB), scrollToId: 'section-drives', color: 'teal' },
          { label: 'FULLY ARCHIVED', value: stats.fullyArchived, scrollToId: 'section-couples', color: 'green' },
          { label: 'MISSING ASSETS', value: stats.missingAssets, scrollToId: 'section-couples', color: 'yellow' },
          { label: 'REDUNDANT FILES', value: stats.redundantFiles, scrollToId: 'section-milestones', color: 'blue' },
          { label: 'CFA CLEANED', value: stats.cfaCleaned, scrollToId: 'section-drives', color: 'teal' },
        ]} />
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
          <div className="relative w-[480px] max-w-full bg-card shadow-xl overflow-y-auto border-l">
            <div className="p-6">
              {/* Close */}
              <button
                onClick={() => setSelectedCoupleId(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header */}
              <h2 className={`text-xl font-bold mb-1 ${playfair.className} text-primary`}>
                {selectedCouple.bride_name} &amp; {selectedCouple.groom_name}
              </h2>
              {selectedCouple.event_date && (
                <p className="text-sm text-muted-foreground mb-2">{formatDateLocal(selectedCouple.event_date)}</p>
              )}
              {selectedCouple.wedding_year && !selectedCouple.event_date && (
                <p className="text-sm text-muted-foreground mb-2">Year: {selectedCouple.wedding_year}</p>
              )}

              {/* StudioFlow link */}
              <div className="flex items-center gap-2 mb-6 text-sm">
                <span className="font-semibold">StudioFlow:</span>
                {selectedCouple.studioflow_couple_id ? (
                  <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-green-100 text-green-700">Linked</span>
                ) : (
                  <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-amber-100 text-amber-700">Unlinked</span>
                )}
                {selectedCouple.primary_service && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <span>Package: {selectedCouple.primary_service}</span>
                  </>
                )}
              </div>

              {/* Checkbox View */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
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
                            <span className="ml-2 text-xs rounded-full px-1.5 py-0.5 font-medium bg-amber-100 text-amber-700">
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

                {/* Missing contracted services */}
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
                            <span className="ml-2 text-xs rounded-full px-1.5 py-0.5 font-medium bg-red-100 text-red-700">
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
                  Last reviewed: {selectedCouple.last_review_at ? formatDateLocal(selectedCouple.last_review_at) : 'Never'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleMarkReviewed}
                  disabled={reviewLoading}
                  className="rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 transition-colors"
                >
                  {reviewLoading ? 'Saving...' : 'Mark as Reviewed'}
                </button>
                {selectedCouple.studioflow_couple_id && (
                  <a
                    href={`/admin/couples/${selectedCouple.studioflow_couple_id}`}
                    className="rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-accent/50 transition-colors"
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
