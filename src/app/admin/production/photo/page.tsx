'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, Plus, ChevronDown, ChevronRight, X, FileText } from 'lucide-react'
import { differenceInDays, parseISO, format } from 'date-fns'

// ── Types ────────────────────────────────────────────────────────

interface Job {
  id: string
  couple_id: string
  job_type: string
  category: string
  photos_taken: number | null
  edited_so_far: number | null
  total_proofs: number | null
  vendor: string | null
  status: string
  due_date: string | null
  at_lab_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  couples?: { couple_name: string; wedding_date: string | null } | null
}

interface WaitingOrderCouple {
  id: string
  couple_name: string
  wedding_date: string | null
}

// ── Constants ────────────────────────────────────────────────────

const JOB_TYPE_LABELS: Record<string, string> = {
  wedding_proofs: 'Wedding Proofs',
  parent_album: 'Parent Album',
  bg_album: 'B&G Album',
  bg_portrait_canvas: 'B&G Portrait (Canvas)',
  bg_portrait_print: 'B&G Portrait (Print)',
  parent_portrait_canvas: 'Parent Portrait (Canvas)',
  parent_portrait_print: 'Parent Portrait (Print)',
  tyc: 'Thank You Cards',
  hires_wedding: 'Hi-Res Wedding',
  eng_proofs: 'Engagement Proofs',
  eng_collage: 'Engagement Collage',
  eng_signing_book: 'Engagement Signing Book',
  eng_album: 'Engagement Album',
  eng_prints: 'Engagement Prints',
  hires_engagement: 'Hi-Res Engagement',
}

const VENDOR_LABELS: Record<string, string> = {
  cci: 'CCI',
  uaf: 'UAF',
  best_canvas: 'Best Canvas',
  best: 'Best',
  custom: 'Custom',
  in_house: 'In-house',
}

const VENDOR_COLORS: Record<string, string> = {
  cci: 'bg-blue-100 text-blue-700',
  uaf: 'bg-purple-100 text-purple-700',
  best_canvas: 'bg-amber-100 text-amber-700',
  best: 'bg-amber-100 text-amber-700',
  custom: 'bg-slate-100 text-slate-700',
  in_house: 'bg-green-100 text-green-700',
}

// Normalize vendor values (handles lowercase with hyphens like "in-house")
const getVendorInfo = (vendor: string | null) => {
  if (!vendor) return { label: '—', color: '' }
  const normalized = vendor.toLowerCase().replace(/-/g, '_')
  return {
    label: VENDOR_LABELS[normalized] || VENDOR_LABELS[vendor] || vendor,
    color: VENDOR_COLORS[normalized] || VENDOR_COLORS[vendor] || 'bg-gray-100 text-gray-700',
  }
}

const LANES = [
  { key: 'not_started', label: 'Ready to Start', badge: 'bg-gray-100 text-gray-700' },
  { key: 'in_progress', label: 'In Progress', badge: 'bg-blue-100 text-blue-700' },
  { key: 'waiting_approval', label: 'Waiting for Bride', badge: 'bg-amber-100 text-amber-700' },
  { key: 'ready_to_reedit', label: 'Ready to Re-edit', badge: 'bg-orange-100 text-orange-700' },
  { key: 'reediting', label: 'Re-editing', badge: 'bg-rose-100 text-rose-700' },
  { key: 'at_lab', label: 'At Lab', badge: 'bg-indigo-100 text-indigo-700' },
  { key: 'at_studio', label: 'At Studio', badge: 'bg-teal-100 text-teal-700' },
  { key: 'on_hold', label: 'On Hold', badge: 'bg-stone-100 text-stone-700' },
  { key: 'ready_to_order', label: 'Ready to Order', badge: 'bg-cyan-100 text-cyan-700' },
] as const

const POPUP_LABELS: Record<string, string> = {
  active: 'Active Jobs',
  waiting_order: 'Waiting for Order',
  in_progress: 'In Progress',
  waiting_approval: 'Waiting for Bride',
  reedits: 'Re-edits',
  at_lab: 'At Lab',
  ready_to_order: 'Ready to Order',
}

const STATUS_OPTIONS = [
  ...LANES.map(l => ({ value: l.key, label: l.label })),
  { value: 'completed', label: 'Completed' },
  { value: 'picked_up', label: 'Picked Up' },
]

type SortField = 'couple' | 'job_type' | 'vendor' | 'created_at'
type SortDir = 'asc' | 'desc'

// ══════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════

export default function PhotoProductionPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<'all' | 'wedding' | 'engagement'>('all')
  const [filterVendor, setFilterVendor] = useState('')

  // Sort
  const [sortField, setSortField] = useState<SortField>('couple')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Collapsed lanes
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set(['not_started', 'waiting_approval', 'ready_to_order', 'at_lab', 'at_studio', 'on_hold']))

  // Stats (fetched separately since main query excludes completed)
  const [completedCount, setCompletedCount] = useState(0)
  const [waitingOrderCouples, setWaitingOrderCouples] = useState<WaitingOrderCouple[]>([])
  const [reeditYtdCount, setReeditYtdCount] = useState(0)
  const [editedSoFar, setEditedSoFar] = useState(0)
  const [totalPhotos, setTotalPhotos] = useState(0)

  // YTD data (all jobs including completed)
  const [ytdData, setYtdData] = useState<{ photos_taken: number; edited_so_far: number; total_proofs: number }>({ photos_taken: 0, edited_so_far: 0, total_proofs: 0 })

  // Save tracking for green flash
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set())

  // Sidebar popup
  const [popupStatus, setPopupStatus] = useState<string | null>(null)

  // ── Fetch ─────────────────────────────────────────────────────

  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date().toISOString().split('T')[0]

      const [jobsRes, couplesRes, completedRes, waitingRes, reeditRes, photosRes] = await Promise.all([
        // Active jobs — exclude completed & picked_up
        supabase
          .from('jobs')
          .select('*')
          .neq('status', 'completed')
          .neq('status', 'picked_up')
          .order('created_at', { ascending: false }),
        // All couples (for name lookup)
        supabase
          .from('couples')
          .select('id, couple_name, wedding_date'),
        // Completed count
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .in('status', ['completed', 'picked_up']),
        // Waiting for order (past weddings without photo order)
        supabase
          .from('couples')
          .select('id, couple_name, wedding_date, couple_milestones!inner(m24_photo_order_in)')
          .lt('wedding_date', today)
          .eq('couple_milestones.m24_photo_order_in', false)
          .order('wedding_date', { ascending: true }),
        // Re-edit counts (for YTD sum)
        supabase
          .from('jobs')
          .select('reedit_count'),
        // Photos progress (all jobs including completed for true progress + YTD)
        supabase
          .from('jobs')
          .select('edited_so_far, photos_taken, total_proofs'),
      ])

      // Build couple lookup map
      const coupleMap = new Map<string, { couple_name: string; wedding_date: string | null }>()
      if (couplesRes.data) {
        couplesRes.data.forEach((c: any) => coupleMap.set(c.id, { couple_name: c.couple_name, wedding_date: c.wedding_date }))
      }

      console.log('[Photo] jobsRes:', jobsRes.data?.length, 'error:', jobsRes.error)
      console.log('[Photo] couplesRes:', couplesRes.data?.length, 'error:', couplesRes.error)

      if (!jobsRes.error && jobsRes.data) {
        const enriched = (jobsRes.data as any[]).map(j => ({
          ...j,
          couples: coupleMap.get(j.couple_id) || null,
        }))
        setJobs(enriched as Job[])
      } else if (jobsRes.error) {
        console.error('[Photo] Jobs query failed:', jobsRes.error)
      }
      setCompletedCount(completedRes.count ?? 0)
      if (!waitingRes.error && waitingRes.data) {
        setWaitingOrderCouples(waitingRes.data as unknown as WaitingOrderCouple[])
      }

      if (!reeditRes.error && reeditRes.data) {
        const total = reeditRes.data.reduce((sum, r: any) => sum + (r.reedit_count || 0), 0)
        console.log('[Photo Stats] reedit YTD total:', total)
        setReeditYtdCount(total)
      }
      if (!photosRes.error && photosRes.data) {
        const edited = photosRes.data.reduce((sum, r: any) => sum + (r.edited_so_far || 0), 0)
        const taken = photosRes.data.reduce((sum, r: any) => sum + (r.photos_taken || 0), 0)
        const proofs = photosRes.data.reduce((sum, r: any) => sum + (r.total_proofs || 0), 0)
        console.log('[Photo Stats] photos:', edited, 'of', taken, 'proofs:', proofs)
        setEditedSoFar(edited)
        setTotalPhotos(taken)
        setYtdData({ photos_taken: taken, edited_so_far: edited, total_proofs: proofs })
      }

      setLoading(false)
    }
    fetchAll()
  }, [])

  // ── Status update ─────────────────────────────────────────────

  const updateStatus = async (jobId: string, newStatus: string) => {
    const updates: Record<string, string> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // Auto-set at_lab_date when moving to at_lab
    if (newStatus === 'at_lab') {
      updates.at_lab_date = new Date().toISOString().split('T')[0]
    }

    const { error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)

    if (!error) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j))
    }
  }

  // ── Field update (auto-save on blur) ─────────────────────────

  const updateJobField = async (jobId: string, field: string, value: number) => {
    // Optimistic local update
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, [field]: value } : j))

    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })

      if (res.ok) {
        const fieldKey = `${jobId}_${field}`
        setSavedFields(prev => new Set(prev).add(fieldKey))
        setTimeout(() => {
          setSavedFields(prev => {
            const next = new Set(prev)
            next.delete(fieldKey)
            return next
          })
        }, 500)
      }
    } catch (err) {
      console.error('[updateJobField] Error:', err)
    }
  }

  // ── Filtered & sorted jobs ────────────────────────────────────

  const filteredJobs = useMemo(() => {
    let result = jobs

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(j =>
        (j.couples?.couple_name || '').toLowerCase().includes(term) ||
        (JOB_TYPE_LABELS[j.job_type] || j.job_type).toLowerCase().includes(term) ||
        (j.notes || '').toLowerCase().includes(term)
      )
    }

    if (filterCategory !== 'all') {
      result = result.filter(j => j.category === filterCategory)
    }

    if (filterVendor) {
      result = result.filter(j => j.vendor === filterVendor)
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'couple':
          cmp = (a.couples?.couple_name || '').localeCompare(b.couples?.couple_name || '')
          break
        case 'job_type':
          cmp = (JOB_TYPE_LABELS[a.job_type] || a.job_type).localeCompare(JOB_TYPE_LABELS[b.job_type] || b.job_type)
          break
        case 'vendor':
          cmp = (a.vendor || '').localeCompare(b.vendor || '')
          break
        case 'created_at':
          cmp = (a.created_at || '').localeCompare(b.created_at || '')
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [jobs, searchTerm, filterCategory, filterVendor, sortField, sortDir])

  // ── Lane data ─────────────────────────────────────────────────

  const laneData = useMemo(() => {
    return LANES.map(lane => ({
      ...lane,
      jobs: filteredJobs.filter(j => j.status === lane.key),
    }))
  }, [filteredJobs])

  const activeCount = jobs.length

  const sidebarStats = useMemo(() => ({
    inProgressCount: jobs.filter(j => j.status === 'in_progress').length,
    waitingApprovalCount: jobs.filter(j => j.status === 'waiting_approval').length,
    reeditCount: jobs.filter(j => j.status === 'ready_to_reedit' || j.status === 'reediting').length,
    atLabCount: jobs.filter(j => j.status === 'at_lab').length,
    readyToOrderCount: jobs.filter(j => j.status === 'ready_to_order').length,
    photosPercent: totalPhotos > 0 ? Math.round((editedSoFar / totalPhotos) * 100) : 0,
  }), [jobs, editedSoFar, totalPhotos])

  // ── Currently Editing data ───────────────────────────────────

  const inProgressJobs = useMemo(() => filteredJobs.filter(j => j.status === 'in_progress'), [filteredJobs])

  const asapTotals = useMemo(() => {
    const pt = inProgressJobs.reduce((s, j) => s + (j.photos_taken || 0), 0)
    const esf = inProgressJobs.reduce((s, j) => s + (j.edited_so_far || 0), 0)
    const tp = inProgressJobs.reduce((s, j) => s + (j.total_proofs || 0), 0)
    const remaining = pt - esf
    const deleted = tp > 0 ? pt - tp : 0
    return {
      photosTaken: pt, editedSoFar: esf, totalProofs: tp, remaining, deleted,
      pctDeleted: deleted > 0 && pt > 0 ? ((deleted / pt) * 100).toFixed(1) : null,
      pctCompleted: pt > 0 ? ((esf / pt) * 100).toFixed(1) : null,
    }
  }, [inProgressJobs])

  const ytdTotals = useMemo(() => {
    const pt = ytdData.photos_taken
    const esf = ytdData.edited_so_far
    const tp = ytdData.total_proofs
    const remaining = pt - esf
    const deleted = tp > 0 ? pt - tp : 0
    return {
      photosTaken: pt, editedSoFar: esf, totalProofs: tp, remaining, deleted,
      pctDeleted: deleted > 0 && pt > 0 ? ((deleted / pt) * 100).toFixed(1) : null,
      pctCompleted: pt > 0 ? ((esf / pt) * 100).toFixed(1) : null,
    }
  }, [ytdData])

  const getPopupJobs = (key: string): Job[] => {
    switch (key) {
      case 'active': return jobs
      case 'in_progress': return jobs.filter(j => j.status === 'in_progress')
      case 'waiting_approval': return jobs.filter(j => j.status === 'waiting_approval')
      case 'reedits': return jobs.filter(j => j.status === 'ready_to_reedit' || j.status === 'reediting')
      case 'at_lab': return jobs.filter(j => j.status === 'at_lab')
      case 'ready_to_order': return jobs.filter(j => j.status === 'ready_to_order')
      default: return []
    }
  }

  // ── Sort handler ──────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const toggleLane = (key: string) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
      {sortField === field && (
        <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  )

  // ── Report ───────────────────────────────────────────────────

  const openReport = () => {
    window.open('/admin/production/report', '_blank')
  }

  // ── Loading ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Photo Production</h1>
          <p className="text-sm text-muted-foreground">{activeCount} active jobs</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openReport}
            className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-accent/50 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Report
          </button>
          <button
            onClick={() => router.push('/admin/production/editing/new')}
            className="flex items-center gap-2 rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Job
          </button>
        </div>
      </div>

      {/* Status badges row */}
      <div className="px-6 pb-4 flex flex-wrap gap-2">
        {laneData.map(lane => (
          <span key={lane.key} className={`text-xs rounded-full px-2.5 py-1 font-medium ${lane.badge}`}>
            {lane.label}: {lane.jobs.length}
          </span>
        ))}
      </div>

      {/* Content area: jobs panel + stats sidebar */}
      <div className="flex">
        {/* Job List Panel */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-border">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search couples, job types..."
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none transition-colors focus:border-stone-400"
              />
            </div>

            {/* Category filter */}
            <div className="flex rounded-lg border border-input overflow-hidden">
              {(['all', 'wedding', 'engagement'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    filterCategory === cat
                      ? 'bg-stone-800 text-white'
                      : 'bg-background hover:bg-accent/50'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat === 'wedding' ? 'Wedding' : 'Engagement'}
                </button>
              ))}
            </div>

            {/* Vendor filter */}
            <select
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none transition-colors focus:border-stone-400"
            >
              <option value="">All Vendors</option>
              {Object.entries(VENDOR_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Currently Editing Section */}
          <div className="rounded-xl border bg-card mb-4">
            <button
              onClick={() => toggleLane('in_progress')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {collapsedLanes.has('in_progress')
                  ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
                <span className="font-semibold text-sm">Currently Editing</span>
                <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-blue-100 text-blue-700">
                  {inProgressJobs.length}
                </span>
              </div>
            </button>

            {!collapsedLanes.has('in_progress') && (
              <div className="border-t overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground min-w-[180px]">Couple</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground min-w-[130px]">Job</th>
                      <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground w-[90px]">Photos Taken</th>
                      <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground w-[90px]">Edited So Far</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-[80px]">Remaining</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-[70px]">Deleted</th>
                      <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground w-[90px]">Total Proofs</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-[80px]">% Deleted</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-[90px]">% Completed</th>
                      <th className="text-left px-2 py-2 text-xs font-medium text-muted-foreground w-[150px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inProgressJobs.map(job => {
                      const pt = job.photos_taken || 0
                      const esf = job.edited_so_far || 0
                      const tp = job.total_proofs || 0
                      const remaining = pt - esf
                      const deleted = tp > 0 ? pt - tp : 0
                      const pctDeleted = deleted > 0 && pt > 0 ? ((deleted / pt) * 100).toFixed(1) : null
                      const pctCompleted = pt > 0 ? ((esf / pt) * 100).toFixed(1) : null

                      return (
                        <tr key={job.id} className="border-b hover:bg-accent/20 transition-colors">
                          <td className="px-3 py-2">
                            <div className="font-medium text-sm">{job.couples?.couple_name || 'Unknown'}</div>
                            {job.couples?.wedding_date && (
                              <div className="text-[11px] text-muted-foreground">
                                {format(parseISO(job.couples.wedding_date), 'MMM d, yyyy')}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {JOB_TYPE_LABELS[job.job_type] || job.job_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </td>
                          <td className="px-1 py-1 text-right">
                            <input
                              key={`pt_${job.id}_${job.photos_taken}`}
                              type="text"
                              defaultValue={job.photos_taken ?? ''}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value.replace(/,/g, '')) || 0
                                if (val !== (job.photos_taken || 0)) updateJobField(job.id, 'photos_taken', val)
                              }}
                              className={`w-[80px] text-right text-sm border rounded px-2 py-1 outline-none transition-all duration-300 focus:border-stone-400 ${savedFields.has(`${job.id}_photos_taken`) ? 'bg-green-100' : 'bg-white'}`}
                            />
                          </td>
                          <td className="px-1 py-1 text-right">
                            <input
                              key={`esf_${job.id}_${job.edited_so_far}`}
                              type="text"
                              defaultValue={job.edited_so_far ?? ''}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value.replace(/,/g, '')) || 0
                                if (val !== (job.edited_so_far || 0)) updateJobField(job.id, 'edited_so_far', val)
                              }}
                              className={`w-[80px] text-right text-sm border rounded px-2 py-1 outline-none transition-all duration-300 focus:border-stone-400 ${savedFields.has(`${job.id}_edited_so_far`) ? 'bg-green-100' : 'bg-white'}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500">{remaining.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{deleted > 0 ? deleted.toLocaleString() : '—'}</td>
                          <td className="px-1 py-1 text-right">
                            <input
                              key={`tp_${job.id}_${job.total_proofs}`}
                              type="text"
                              defaultValue={job.total_proofs ?? ''}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value.replace(/,/g, '')) || 0
                                if (val !== (job.total_proofs || 0)) updateJobField(job.id, 'total_proofs', val)
                              }}
                              className={`w-[80px] text-right text-sm border rounded px-2 py-1 outline-none transition-all duration-300 focus:border-stone-400 ${savedFields.has(`${job.id}_total_proofs`) ? 'bg-green-100' : 'bg-white'}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500">{pctDeleted !== null ? `${pctDeleted}%` : '—'}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{pctCompleted !== null ? `${pctCompleted}%` : '—'}</td>
                          <td className="px-2 py-1">
                            <select
                              value={job.status}
                              onChange={(e) => updateStatus(job.id, e.target.value)}
                              className="text-xs rounded-lg border border-input bg-background px-2 py-1.5 outline-none transition-colors focus:border-stone-400 cursor-pointer"
                            >
                              {STATUS_OPTIONS.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )
                    })}

                    {inProgressJobs.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No jobs currently being edited
                        </td>
                      </tr>
                    )}

                    {/* Currently Due ASAP Summary */}
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td className="px-3 py-2 font-bold text-sm">Currently Due ASAP</td>
                      <td></td>
                      <td className="px-3 py-2 text-right font-semibold text-sm">{asapTotals.photosTaken.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-semibold text-sm">{asapTotals.editedSoFar.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-semibold text-sm">{asapTotals.remaining.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-semibold text-sm">{asapTotals.deleted > 0 ? asapTotals.deleted.toLocaleString() : '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold text-sm">{asapTotals.totalProofs.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-semibold text-sm">{asapTotals.pctDeleted !== null ? `${asapTotals.pctDeleted}%` : '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold text-sm">{asapTotals.pctCompleted !== null ? `${asapTotals.pctCompleted}%` : '—'}</td>
                      <td></td>
                    </tr>

                    {/* Year to Date Summary */}
                    <tr className="bg-red-600 text-white font-bold" style={{ fontSize: '15px' }}>
                      <td className="px-3 py-2.5 font-bold rounded-bl-xl">Year to Date</td>
                      <td></td>
                      <td className="px-3 py-2.5 text-right">{ytdTotals.photosTaken.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right">{ytdTotals.editedSoFar.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right">{ytdTotals.remaining.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right">{ytdTotals.deleted > 0 ? ytdTotals.deleted.toLocaleString() : '—'}</td>
                      <td className="px-3 py-2.5 text-right">{ytdTotals.totalProofs.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right">{ytdTotals.pctDeleted !== null ? `${ytdTotals.pctDeleted}%` : '—'}</td>
                      <td className="px-3 py-2.5 text-right">{ytdTotals.pctCompleted !== null ? `${ytdTotals.pctCompleted}%` : '—'}</td>
                      <td className="rounded-br-xl"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Lanes */}
          <div className="space-y-4">
            {laneData.filter(lane => lane.key !== 'in_progress').map(lane => {
              const laneCount = lane.jobs.length

              if (laneCount === 0 && lane.key !== 'not_started') return null

              const isCollapsed = collapsedLanes.has(lane.key)

              return (
                <div key={lane.key} className="rounded-xl border bg-card">
                  {/* Lane header */}
                  <button
                    onClick={() => toggleLane(lane.key)}
                    className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed
                        ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                      <span className="font-semibold text-sm">{lane.label}</span>
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${lane.badge}`}>
                        {laneCount}
                      </span>
                    </div>
                  </button>

                  {/* Lane body */}
                  {!isCollapsed && laneCount > 0 && (
                    <div className="border-t">
                      {/* Column headers */}
                      <div className="grid grid-cols-[1.2fr_160px_80px_110px_150px] gap-4 px-4 py-2 border-b bg-muted/30">
                        <SortHeader field="couple">Couple</SortHeader>
                        <SortHeader field="job_type">Job Type</SortHeader>
                        <span className="text-xs font-medium text-muted-foreground">Photos</span>
                        <SortHeader field="vendor">Vendor</SortHeader>
                        <span className="text-xs font-medium text-muted-foreground">Status</span>
                      </div>

                      {/* Jobs */}
                      {lane.jobs.map(job => (
                        <div
                          key={job.id}
                          className="grid grid-cols-[1.2fr_160px_80px_110px_150px] gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-accent/30 transition-colors items-center"
                        >
                          {/* Couple */}
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {job.couples?.couple_name || 'Unknown'}
                            </div>
                            {job.couples?.wedding_date && (
                              <div className="text-[11px] text-muted-foreground">
                                {format(parseISO(job.couples.wedding_date), 'MMM d, yyyy')}
                              </div>
                            )}
                            {job.status === 'at_lab' && job.at_lab_date && (
                              <div className="text-[11px] text-indigo-600">
                                At lab {differenceInDays(new Date(), parseISO(job.at_lab_date))} days — since {format(parseISO(job.at_lab_date), 'MMM d')}
                              </div>
                            )}
                          </div>

                          {/* Job Type */}
                          <div className="text-sm text-muted-foreground truncate">
                            {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                          </div>

                          {/* Photos Taken */}
                          <div className="text-sm text-muted-foreground">
                            {job.photos_taken ?? '—'}
                          </div>

                          {/* Vendor */}
                          <div>
                            {job.vendor ? (
                              <span className={`text-[11px] rounded-full px-2 py-0.5 font-medium ${getVendorInfo(job.vendor).color}`}>
                                {getVendorInfo(job.vendor).label}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>

                          {/* Status dropdown */}
                          <select
                            value={job.status}
                            onChange={(e) => updateStatus(job.id, e.target.value)}
                            className="text-xs rounded-lg border border-input bg-background px-2 py-1.5 outline-none transition-colors focus:border-stone-400 cursor-pointer"
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty lane */}
                  {!isCollapsed && laneCount === 0 && (
                    <div className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
                      No jobs
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Stats Sidebar */}
        <aside className="w-[280px] shrink-0 p-6 bg-secondary/50 hidden lg:block">
          {/* Active Jobs */}
          <div
            className="rounded-xl border bg-card p-4 mb-4 cursor-pointer hover:border-stone-400 transition-colors"
            onClick={() => setPopupStatus('active')}
          >
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Active Jobs
            </div>
            <div className="text-3xl font-bold">
              {activeCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {completedCount} completed
            </div>
          </div>

          {/* Waiting for Order */}
          <div
            className="rounded-xl border bg-card p-4 mb-4 cursor-pointer hover:border-stone-400 transition-colors"
            onClick={() => setPopupStatus('waiting_order')}
          >
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Waiting for Order
            </div>
            <div className={`text-3xl font-bold ${waitingOrderCouples.length > 0 ? 'text-amber-600' : 'text-foreground'}`}>
              {waitingOrderCouples.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Past weddings awaiting order</div>
          </div>

          {/* In Progress */}
          <div
            className="rounded-xl border bg-card p-4 mb-4 cursor-pointer hover:border-stone-400 transition-colors"
            onClick={() => setPopupStatus('in_progress')}
          >
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              In Progress
            </div>
            <div className="text-3xl font-bold">
              {sidebarStats.inProgressCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Currently editing</div>
          </div>

          {/* Waiting for Bride */}
          <div
            className="rounded-xl border bg-card p-4 mb-4 cursor-pointer hover:border-stone-400 transition-colors"
            onClick={() => setPopupStatus('waiting_approval')}
          >
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Waiting for Bride
            </div>
            <div className={`text-3xl font-bold ${sidebarStats.waitingApprovalCount > 0 ? 'text-orange-600' : 'text-foreground'}`}>
              {sidebarStats.waitingApprovalCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Awaiting client approval</div>
          </div>

          {/* Re-edits */}
          <div
            className="rounded-xl border bg-card p-4 mb-4 cursor-pointer hover:border-stone-400 transition-colors"
            onClick={() => setPopupStatus('reedits')}
          >
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Re-edits
            </div>
            <div className={`text-3xl font-bold ${sidebarStats.reeditCount > 0 ? 'text-rose-600' : 'text-foreground'}`}>
              {sidebarStats.reeditCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Client requested changes</div>
          </div>

          {/* At Lab */}
          <div
            className="rounded-xl border bg-card p-4 mb-4 cursor-pointer hover:border-stone-400 transition-colors"
            onClick={() => setPopupStatus('at_lab')}
          >
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              At Lab
            </div>
            <div className={`text-3xl font-bold ${sidebarStats.atLabCount > 0 ? 'text-indigo-600' : 'text-foreground'}`}>
              {sidebarStats.atLabCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Prints/albums being made</div>
          </div>

          {/* Ready to Order */}
          <div
            className="rounded-xl border bg-card p-4 mb-4 cursor-pointer hover:border-stone-400 transition-colors"
            onClick={() => setPopupStatus('ready_to_order')}
          >
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Ready to Order
            </div>
            <div className={`text-3xl font-bold ${sidebarStats.readyToOrderCount > 0 ? 'text-cyan-600' : 'text-foreground'}`}>
              {sidebarStats.readyToOrderCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Ready for lab submission</div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border my-6" />

          {/* Re-edits YTD */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Re-edits YTD
            </div>
            <div className="text-3xl font-bold">
              {reeditYtdCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Times client requested changes</div>
          </div>

          {/* Photos Complete */}
          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs font-semibold text-foreground mb-3">
              Photos Complete
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${sidebarStats.photosPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{editedSoFar} of {totalPhotos} edited</span>
              <span>{sidebarStats.photosPercent}%</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Stats Popup Modal */}
      {popupStatus && POPUP_LABELS[popupStatus] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPopupStatus(null)}>
          <div className="bg-card rounded-xl border shadow-xl w-[480px] max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{POPUP_LABELS[popupStatus]}</h3>
              <button onClick={() => setPopupStatus(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
              {popupStatus === 'waiting_order' ? (
                waitingOrderCouples.length > 0 ? (
                  waitingOrderCouples.map(couple => (
                    <div key={couple.id} className="px-4 py-3 border-b last:border-b-0 hover:bg-accent/30 transition-colors">
                      <div className="font-medium text-sm">{couple.couple_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {couple.wedding_date ? format(parseISO(couple.wedding_date), 'MMM d, yyyy') : 'No date'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">No couples</div>
                )
              ) : getPopupJobs(popupStatus).length > 0 ? (
                getPopupJobs(popupStatus).map(job => (
                  <div key={job.id} className="px-4 py-3 border-b last:border-b-0 hover:bg-accent/30 transition-colors">
                    <div className="font-medium text-sm">{job.couples?.couple_name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">
                      {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                      {job.photos_taken != null && <span> &middot; {job.photos_taken} photos</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">No jobs</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
