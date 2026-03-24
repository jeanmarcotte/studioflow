'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, ChevronDown, ChevronRight, GripVertical, X } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'

// ── Types ────────────────────────────────────────────────────────

interface VideoJob {
  id: string
  couple_id: string
  job_type: string
  section: string
  wedding_date: string | null
  order_date: string | null
  hours_raw: number | null
  ceremony_done: boolean
  reception_done: boolean
  park_done: boolean
  prereception_done: boolean
  groom_done: boolean
  bride_done: boolean
  assigned_to: string | null
  active_hd: string | null
  proxies_run: boolean
  video_form: boolean
  sort_order: number | null
  status: string
  notes: string | null
  due_date: string | null
  full_video_id: string | null
  created_at: string
  updated_at: string
  completed_date: string | null
  couples?: { couple_name: string; id: string; wedding_date: string | null }
}

interface PhotoWaitingJob {
  id: string
  couple_id: string
  status: string
  couples?: { couple_name: string; id: string; wedding_date: string | null }
}

interface AwaitingOrderCouple {
  id: string
  couple_name: string
  wedding_date: string | null
}

// ── Constants ────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  waiting_on_recap: 'Waiting on Recap',
  raw_video_output: 'Raw Video Output',
  complete: 'Complete',
  waiting_for_bride: 'Waiting for Bride',
  archived: 'Archived',
}

const ALL_STATUSES = ['not_started', 'in_progress', 'waiting_on_recap', 'waiting_for_bride', 'raw_video_output', 'complete', 'archived']

const STATUS_PILL: Record<string, { bg: string; text: string }> = {
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700' },
  waiting_for_bride: { bg: 'bg-amber-100', text: 'text-amber-700' },
  waiting_on_recap: { bg: 'bg-purple-100', text: 'text-purple-700' },
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL: 'Full video',
  RECAP: 'Recap',
  ENG_SLIDESHOW: 'Slideshow',
}

type SwimlaneKey = 'editing_full' | 'editing_recap' | 'editing_eng_slideshow' | 'reediting' | 'waiting_photo' | 'completed'

const LANE_PRIMARY_STATUSES: Record<SwimlaneKey, string[]> = {
  editing_full: ['not_started', 'in_progress'],
  editing_recap: ['not_started', 'in_progress'],
  editing_eng_slideshow: ['not_started', 'in_progress'],
  reediting: ['in_progress'],
  waiting_photo: ['waiting_photo', 'not_started'],
  completed: ['complete'],
}

function getLaneStatusOptions(laneKey: SwimlaneKey): { value: string; label: string; divider?: boolean }[] {
  const primary = LANE_PRIMARY_STATUSES[laneKey]
  const rest = ALL_STATUSES.filter(s => !primary.includes(s))
  return [
    ...primary.map(v => ({ value: v, label: STATUS_LABELS[v] || v })),
    { value: '_divider', label: '────────────', divider: true },
    ...rest.map(v => ({ value: v, label: STATUS_LABELS[v] || v })),
  ]
}

const SWIMLANES: { key: SwimlaneKey; label: string; icon: string; badgeClass: string }[] = [
  { key: 'editing_full', label: 'EDITING FULL LENGTH VIDEO', icon: '🎬', badgeClass: 'bg-blue-100 text-blue-700' },
  { key: 'editing_recap', label: 'EDITING RECAP', icon: '📋', badgeClass: 'bg-violet-100 text-violet-700' },
  { key: 'editing_eng_slideshow', label: 'ENGAGEMENT SLIDESHOW', icon: '💍', badgeClass: 'bg-pink-100 text-pink-700' },
  { key: 'reediting', label: 'REEDITING', icon: '🔄', badgeClass: 'bg-sky-100 text-sky-700' },
  { key: 'waiting_photo', label: 'WAITING FOR PHOTO ORDER', icon: '⏸️', badgeClass: 'bg-slate-100 text-slate-700' },
  { key: 'completed', label: 'COMPLETED', icon: '✅', badgeClass: 'bg-green-100 text-green-700' },
]

type SegmentField = 'ceremony_done' | 'reception_done' | 'park_done' | 'prereception_done' | 'groom_done' | 'bride_done'
type ToggleField = SegmentField | 'proxies_run' | 'video_form'

const SEGMENTS: { field: SegmentField; label: string; shortLabel: string }[] = [
  { field: 'ceremony_done', label: 'Ceremony', shortLabel: 'Ceremony' },
  { field: 'reception_done', label: 'Reception', shortLabel: 'Reception' },
  { field: 'park_done', label: 'Park', shortLabel: 'Park' },
  { field: 'prereception_done', label: 'Pre-Reception', shortLabel: 'Pre-Reception' },
  { field: 'groom_done', label: 'Groom', shortLabel: 'Groom' },
  { field: 'bride_done', label: 'Bride', shortLabel: 'Bride' },
]

const ACTIVE_HD_OPTIONS = ['', 'NVME', 'T7', 'LACIE']

// ── Helpers ──────────────────────────────────────────────────────

function getDaysWaiting(orderDate: string | null): number {
  if (!orderDate) return 0
  return differenceInDays(new Date(), parseISO(orderDate))
}

function isOverdue(job: VideoJob): boolean {
  if (!job.order_date || job.section === 'completed') return false
  return getDaysWaiting(job.order_date) >= 60
}

function countSegmentsDone(job: VideoJob): number {
  let count = 0
  if (job.ceremony_done) count++
  if (job.reception_done) count++
  if (job.park_done) count++
  if (job.prereception_done) count++
  if (job.groom_done) count++
  if (job.bride_done) count++
  return count
}

// ═════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════

export default function VideoProductionPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<VideoJob[]>([])
  const [photoWaitingJobs, setPhotoWaitingJobs] = useState<PhotoWaitingJob[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [showCompletedRecaps, setShowCompletedRecaps] = useState(false)
  const [showCompletedSlideshows, setShowCompletedSlideshows] = useState(false)
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set(['completed']))
  const [refreshKey, setRefreshKey] = useState(0)
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null)
  const editingRef = useRef<HTMLDivElement>(null)

  // ── Sort & due date editing state ─────────────────────────────
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [editingDueDate, setEditingDueDate] = useState<string | null>(null)
  const [awaitingOrderCouples, setAwaitingOrderCouples] = useState<AwaitingOrderCouple[]>([])
  const [completed2026Collapsed, setCompleted2026Collapsed] = useState(true)

  // ── Fetch jobs ─────────────────────────────────────────────────

  useEffect(() => {
    const fetchJobs = async () => {
      const today = new Date().toISOString().split('T')[0]
      const [videoRes, photoRes, awaitingRes] = await Promise.all([
        supabase
          .from('video_jobs')
          .select('*, couples(id, couple_name, wedding_date)')
          .order('sort_order', { ascending: true, nullsFirst: false }),
        supabase
          .from('editing_queue')
          .select('id, couple_id, status, couples(id, couple_name, wedding_date)')
          .eq('section', 'waiting_photo'),
        supabase
          .from('couples')
          .select('id, couple_name, wedding_date, contracts(num_videographers), couple_milestones(m24_photo_order_in)')
          .lte('wedding_date', today),
      ])

      if (!videoRes.error && videoRes.data) setJobs(videoRes.data)
      if (!photoRes.error && photoRes.data) setPhotoWaitingJobs(photoRes.data as unknown as PhotoWaitingJob[])
      if (!awaitingRes.error && awaitingRes.data) {
        const filtered = (awaitingRes.data as any[]).filter((c) => {
          const contract = Array.isArray(c.contracts) ? c.contracts[0] : c.contracts
          if (!contract || (contract.num_videographers || 0) <= 0) return false
          const milestone = Array.isArray(c.couple_milestones) ? c.couple_milestones[0] : c.couple_milestones
          return !milestone?.m24_photo_order_in
        })
        setAwaitingOrderCouples(filtered.map((c) => ({
          id: c.id,
          couple_name: c.couple_name,
          wedding_date: c.wedding_date,
        })))
      }
      setLoading(false)
    }
    fetchJobs()
  }, [refreshKey])

  // ── Update status inline ───────────────────────────────────────

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    const job = jobs.find(j => j.id === jobId)
    const updates: Record<string, any> = { status: newStatus }
    if (newStatus === 'complete') {
      updates.section = 'completed'
    } else if (job?.section === 'completed') {
      updates.section = 'editing'
    }

    try {
      const res = await fetch(`/api/admin/video-jobs/${jobId}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j))
      }
    } catch {
      // Fallback to direct Supabase if API fails
      const { error } = await supabase
        .from('video_jobs')
        .update(updates)
        .eq('id', jobId)
      if (!error) {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j))
      }
    }
  }

  // ── Toggle boolean field ───────────────────────────────────────

  const toggleField = async (jobId: string, field: ToggleField, currentValue: boolean) => {
    const newValue = !currentValue
    const { error } = await supabase
      .from('video_jobs')
      .update({ [field]: newValue })
      .eq('id', jobId)

    if (!error) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, [field]: newValue } : j))
    }
  }

  // ── Update active_hd inline ────────────────────────────────────

  const updateActiveHd = async (jobId: string, value: string) => {
    const active_hd = value || null
    const { error } = await supabase
      .from('video_jobs')
      .update({ active_hd })
      .eq('id', jobId)

    if (!error) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, active_hd } : j))
    }
  }

  // ── Update due_date inline ──────────────────────────────────────

  const updateDueDate = async (jobId: string, newDate: string | null) => {
    setEditingDueDate(null)
    const dueDate = newDate || null
    const { error } = await supabase
      .from('video_jobs')
      .update({ due_date: dueDate })
      .eq('id', jobId)

    if (!error) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, due_date: dueDate } : j))
    }
  }

  // ── Drag-to-reorder ────────────────────────────────────────────

  const handleDragStart = useCallback((jobId: string) => {
    setDraggedJobId(jobId)
  }, [])

  const handleDrop = useCallback(async (targetJobId: string, laneKey: SwimlaneKey, laneJobs: VideoJob[]) => {
    if (!draggedJobId || draggedJobId === targetJobId) {
      setDraggedJobId(null)
      return
    }

    const oldIndex = laneJobs.findIndex(j => j.id === draggedJobId)
    const newIndex = laneJobs.findIndex(j => j.id === targetJobId)
    if (oldIndex === -1 || newIndex === -1) {
      setDraggedJobId(null)
      return
    }

    // Reorder locally
    const reordered = [...laneJobs]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    // Assign new sort_order values
    const updates: { id: string; sort_order: number }[] = reordered.map((j, i) => ({
      id: j.id,
      sort_order: i + 1,
    }))

    // Optimistic local update
    setJobs(prev => {
      const next = [...prev]
      for (const u of updates) {
        const idx = next.findIndex(j => j.id === u.id)
        if (idx !== -1) next[idx] = { ...next[idx], sort_order: u.sort_order }
      }
      return next
    })

    // Persist to DB
    for (const u of updates) {
      await supabase
        .from('video_jobs')
        .update({ sort_order: u.sort_order })
        .eq('id', u.id)
    }

    setDraggedJobId(null)
  }, [draggedJobId])

  // ── Computed data ──────────────────────────────────────────────

  const processedJobs = useMemo(() => {
    let result = [...jobs]

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(j =>
        j.couples?.couple_name?.toLowerCase().includes(q) ||
        (STATUS_LABELS[j.status] || j.status)?.toLowerCase().includes(q) ||
        j.assigned_to?.toLowerCase().includes(q) ||
        j.notes?.toLowerCase().includes(q)
      )
    }

    // Categorize into swimlanes (waiting_photo comes from editing_queue, not here)
    const lanes: Record<Exclude<SwimlaneKey, 'waiting_photo'>, VideoJob[]> = {
      editing_full: [],
      editing_recap: [],
      editing_eng_slideshow: [],
      reediting: [],
      completed: [],
    }

    for (const job of result) {
      if (job.section === 'completed') {
        lanes.completed.push(job)
        // Also show in respective lanes when toggled on
        if (showCompleted && job.job_type !== 'RECAP' && job.job_type !== 'ENG_SLIDESHOW') {
          lanes.editing_full.push(job)
        }
        if (showCompletedRecaps && job.job_type === 'RECAP') {
          lanes.editing_recap.push(job)
        }
        if (showCompletedSlideshows && job.job_type === 'ENG_SLIDESHOW') {
          lanes.editing_eng_slideshow.push(job)
        }
      } else if (job.section === 'reediting') {
        lanes.reediting.push(job)
      } else if (job.job_type === 'RECAP') {
        lanes.editing_recap.push(job)
      } else if (job.job_type === 'ENG_SLIDESHOW') {
        lanes.editing_eng_slideshow.push(job)
      } else {
        lanes.editing_full.push(job)
      }
    }

    // Sort each lane
    for (const key of Object.keys(lanes) as Exclude<SwimlaneKey, 'waiting_photo'>[]) {
      if (sortColumn) {
        const dir = sortDirection === 'asc' ? 1 : -1
        lanes[key].sort((a, b) => {
          switch (sortColumn) {
            case 'couple_name':
              return (a.couples?.couple_name || '').localeCompare(b.couples?.couple_name || '') * dir
            case 'wedding_date':
              return (a.wedding_date || a.couples?.wedding_date || '9999').localeCompare(b.wedding_date || b.couples?.wedding_date || '9999') * dir
            case 'ceremony_done':
            case 'reception_done':
            case 'park_done':
            case 'prereception_done':
            case 'groom_done':
            case 'bride_done':
            case 'proxies_run':
            case 'video_form': {
              const field = sortColumn as keyof VideoJob
              return ((a[field] ? 0 : 1) - (b[field] ? 0 : 1)) * dir
            }
            case 'active_hd':
              return (a.active_hd || '').localeCompare(b.active_hd || '') * dir
            case 'status':
              return (STATUS_LABELS[a.status] || a.status).localeCompare(STATUS_LABELS[b.status] || b.status) * dir
            case 'due_date':
              return (a.due_date || '9999').localeCompare(b.due_date || '9999') * dir
            default:
              return 0
          }
        })
      } else {
        // Default: sort by manual sort_order (fallback to wedding_date)
        lanes[key].sort((a, b) => {
          const aOrder = a.sort_order ?? 9999
          const bOrder = b.sort_order ?? 9999
          if (aOrder !== bOrder) return aOrder - bOrder
          return (a.wedding_date || a.couples?.wedding_date || '9999').localeCompare(b.wedding_date || b.couples?.wedding_date || '9999')
        })
      }
    }

    return lanes
  }, [jobs, search, sortColumn, sortDirection, showCompleted, showCompletedRecaps, showCompletedSlideshows])

  // ── Stats ──────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalJobs = jobs.length
    const activeJobs = jobs.filter(j => j.section !== 'completed')
    const completedCount = jobs.filter(j => j.section === 'completed').length

    const recapsPending = jobs.filter(j => j.job_type === 'RECAP' && j.section !== 'completed').length
    const slideshowsPending = jobs.filter(j => j.job_type === 'ENG_SLIDESHOW' && j.section !== 'completed').length

    // Overdue (for banner)
    const overdueJobs = activeJobs.filter(j => isOverdue(j))
      .sort((a, b) => (a.order_date || '9999').localeCompare(b.order_date || '9999'))
    const overdueCount = overdueJobs.length
    const mostUrgent = overdueJobs[0] || null

    const inProgressCount = activeJobs.filter(j => j.status === 'in_progress').length
    const onHoldCount = photoWaitingJobs.length
    const editingCount = activeJobs.filter(j => j.section === 'editing').length

    const totalSegmentsDone = activeJobs.reduce((sum, j) => sum + countSegmentsDone(j), 0)
    const totalSegmentsPossible = activeJobs.length * 6

    const remaining2025 = activeJobs.filter(j =>
      j.wedding_date && j.wedding_date >= '2025-01-01' && j.wedding_date <= '2025-12-31'
    ).length
    const remaining2026 = activeJobs.filter(j =>
      j.wedding_date && j.wedding_date >= '2026-01-01' && j.wedding_date <= '2026-12-31'
    ).length

    return {
      totalJobs, completedCount, recapsPending, slideshowsPending, overdueCount, mostUrgent,
      inProgressCount, onHoldCount, editingCount,
      totalSegmentsDone, totalSegmentsPossible, remaining2025, remaining2026,
    }
  }, [jobs, photoWaitingJobs])

  // ── Zone 1 & 3 computed data ────────────────────────────────────

  const currentlyEditingJobs = useMemo(() => {
    let result = jobs.filter(j => ['in_progress', 'waiting_for_bride', 'waiting_on_recap'].includes(j.status))
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(j =>
        j.couples?.couple_name?.toLowerCase().includes(q) ||
        j.assigned_to?.toLowerCase().includes(q)
      )
    }
    return result.sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999))
  }, [jobs, search])

  const inProductionStats = useMemo(() => {
    const totalSegsDone = currentlyEditingJobs.reduce((sum, j) => sum + countSegmentsDone(j), 0)
    const totalSegsPossible = currentlyEditingJobs.length * 6
    return { totalSegsDone, totalSegsPossible }
  }, [currentlyEditingJobs])

  const notStartedCount = useMemo(() => jobs.filter(j => j.status === 'not_started').length, [jobs])

  const edited2026Stats = useMemo(() => {
    const completed = jobs.filter(j => j.completed_date && j.completed_date >= '2026-01-01')
    const full = completed.filter(j => j.job_type === 'FULL').length
    const recap = completed.filter(j => j.job_type === 'RECAP').length
    const other = completed.length - full - recap
    return { total: completed.length, full, recap, other }
  }, [jobs])

  const completed2026JobsList = useMemo(() => {
    let result = jobs.filter(j => j.completed_date && j.completed_date >= '2026-01-01')
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(j =>
        j.couples?.couple_name?.toLowerCase().includes(q) ||
        j.assigned_to?.toLowerCase().includes(q)
      )
    }
    return result.sort((a, b) => (b.completed_date || '').localeCompare(a.completed_date || ''))
  }, [jobs, search])

  // ── Toggle lane collapse ───────────────────────────────────────

  const toggleLane = (key: string) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const scrollToEditing = () => {
    setCollapsedLanes(prev => {
      const next = new Set(prev)
      next.delete('editing_full')
      return next
    })
    editingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Sort handler ──────────────────────────────────────────────

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const renderSortHeader = (column: string, label: string) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
    >
      {label}
      {sortColumn === column && (
        <span className="text-foreground">{sortDirection === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  )

  // ── Loading ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const isRecapLane = (key: SwimlaneKey) => key === 'editing_recap'
  const isSlideshowLane = (key: SwimlaneKey) => key === 'editing_eng_slideshow'
  const isWaitingPhotoLane = (key: SwimlaneKey) => key === 'waiting_photo'

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Video Production</h1>
        <p className="text-muted-foreground">
          {jobs.filter(j => j.section !== 'completed').length} active jobs
        </p>
      </div>

      {/* Overdue Banner */}
      {stats.overdueCount > 0 && (
        <div
          className="bg-destructive text-destructive-foreground px-6 py-3.5 flex items-center justify-between"
          style={{ animation: 'pulse-bg 2s ease-in-out infinite' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🔴</span>
            <span>
              <strong>{stats.overdueCount} VIDEO{stats.overdueCount > 1 ? 'S' : ''} OVERDUE</strong>
              {stats.mostUrgent && (
                <span>
                  {' — '}
                  {stats.mostUrgent.couples?.couple_name}
                  {' waiting '}
                  {getDaysWaiting(stats.mostUrgent.order_date)} days
                  {' (60-day limit)'}
                </span>
              )}
            </span>
          </div>
          <button
            onClick={scrollToEditing}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors"
          >
            View Overdue →
          </button>
        </div>
      )}

      {/* Content area: jobs panel + stats sidebar */}
      <div className="flex">
        {/* Job List Panel */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-border">
          {/* Search */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search couples..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-8 !w-full"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ══════ ZONE 1: Currently Editing ══════ */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-7 rounded-full bg-blue-500" />
              <h2 className="text-lg font-bold tracking-tight">Currently Editing</h2>
              <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2.5 rounded-full bg-blue-600 text-white text-xs font-bold tabular-nums">
                {currentlyEditingJobs.length}
              </span>
            </div>

            <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Couple</th>
                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Type</th>
                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Editor</th>
                    <th className="text-center p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Segments</th>
                    <th className="text-center p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Proxies</th>
                    <th className="text-center p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Form</th>
                    <th className="text-right p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Days</th>
                    <th className="text-right p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {currentlyEditingJobs.map(job => {
                    const segsDone = countSegmentsDone(job)
                    const weddingDate = job.wedding_date || job.couples?.wedding_date
                    const daysWaiting = weddingDate ? differenceInDays(new Date(), parseISO(weddingDate)) : 0
                    const pill = STATUS_PILL[job.status] || { bg: 'bg-gray-100', text: 'text-gray-700' }

                    return (
                      <tr key={job.id} className="hover:bg-accent/50 transition-colors">
                        <td className="p-3">
                          <button
                            onClick={() => job.couple_id && router.push(`/admin/couples/${job.couple_id}`)}
                            className="text-left"
                          >
                            <div className="font-semibold text-foreground">{job.couples?.couple_name || 'Unknown'}</div>
                            {weddingDate && (
                              <div className="text-xs text-muted-foreground">{format(parseISO(weddingDate), 'MMM d, yyyy')}</div>
                            )}
                          </button>
                        </td>
                        <td className="p-3 text-muted-foreground">{JOB_TYPE_LABELS[job.job_type] || job.job_type}</td>
                        <td className="p-3 text-muted-foreground">{job.assigned_to || '\u2014'}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center justify-center font-mono text-xs font-bold min-w-[38px] px-1.5 py-0.5 rounded-md ${
                            segsDone === 6 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                            segsDone > 0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                          }`}>
                            {segsDone}/6
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {job.proxies_run
                            ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold">{'\u2713'}</span>
                            : <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 text-xs">{'\u25CB'}</span>
                          }
                        </td>
                        <td className="p-3 text-center">
                          {job.video_form
                            ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold">{'\u2713'}</span>
                            : <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 text-xs">{'\u25CB'}</span>
                          }
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-mono text-sm ${daysWaiting > 90 ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                            {daysWaiting}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <select
                            value={job.status}
                            onChange={e => updateJobStatus(job.id, e.target.value)}
                            className={`text-xs font-semibold rounded-full px-3 py-1.5 border-0 cursor-pointer ${pill.bg} ${pill.text}`}
                          >
                            <option value="in_progress">In Progress</option>
                            <option value="waiting_for_bride">Waiting for Bride</option>
                            <option value="waiting_on_recap">Waiting on Recap</option>
                            <option disabled>{'────────────'}</option>
                            <option value="not_started">Not Started</option>
                            <option value="raw_video_output">Raw Video Output</option>
                            <option value="complete">Complete</option>
                            <option value="archived">Archived</option>
                          </select>
                        </td>
                      </tr>
                    )
                  })}

                  {currentlyEditingJobs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-muted-foreground">
                        No videos currently being edited
                      </td>
                    </tr>
                  )}

                  {/* Summary Row 1: In production */}
                  <tr className="bg-slate-50 dark:bg-slate-900/40 border-t-2 border-slate-200 dark:border-slate-700">
                    <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wide" colSpan={3}>In production</td>
                    <td className="px-3 py-3 text-center" colSpan={1}>
                      <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200">{inProductionStats.totalSegsDone}/{inProductionStats.totalSegsPossible}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400 text-xs" colSpan={4}>segments complete</td>
                  </tr>

                  {/* Summary Row 2: Awaiting photo order — HIGH CONTRAST */}
                  <tr className="bg-amber-100 dark:bg-amber-900/60">
                    <td className="px-4 py-3.5" colSpan={8}>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <span className="font-semibold text-amber-900 dark:text-amber-100 text-sm">Awaiting photo order</span>
                        <span className="text-amber-800 dark:text-amber-200 text-sm">
                          {awaitingOrderCouples.length} couple{awaitingOrderCouples.length !== 1 ? 's' : ''} shot with video
                          {' \u00B7 '}
                          {notStartedCount} not-started job{notStartedCount !== 1 ? 's' : ''} in backlog
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Summary Row 3: Edited in 2026 */}
                  <tr className="bg-red-600 dark:bg-red-700">
                    <td className="px-4 py-3.5" colSpan={8}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-white text-sm">Edited in 2026</span>
                        <span className="font-medium text-sm text-red-100">
                          {edited2026Stats.total} video{edited2026Stats.total !== 1 ? 's' : ''}
                          {edited2026Stats.total > 0 && (
                            <>
                              {'  \u2014  '}
                              {edited2026Stats.full} full {'\u00B7'} {edited2026Stats.recap} recap{edited2026Stats.recap !== 1 ? 's' : ''}
                              {edited2026Stats.other > 0 && ` \u00B7 ${edited2026Stats.other} other`}
                            </>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Swimlanes */}
          {SWIMLANES.map(lane => {
            if (lane.key === 'completed' && !showCompleted) return null
            const isWaiting = isWaitingPhotoLane(lane.key)
            const laneJobCount = isWaiting ? photoWaitingJobs.length : (processedJobs[lane.key as Exclude<SwimlaneKey, 'waiting_photo'>] || []).length
            const isCollapsed = collapsedLanes.has(lane.key)
            const recap = isRecapLane(lane.key)
            const slideshow = isSlideshowLane(lane.key)
            const hideSegments = recap || slideshow

            return (
              <div
                key={lane.key}
                className="mb-6"
                ref={lane.key === 'editing_full' ? editingRef : undefined}
              >
                {/* Swimlane header */}
                <div className="flex items-center justify-between py-3">
                  <button
                    onClick={() => toggleLane(lane.key)}
                    className="flex items-center gap-3 text-left hover:opacity-80"
                  >
                    {isCollapsed
                      ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    }
                    <span className={`inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-sm font-semibold ${lane.badgeClass}`}>
                      {lane.icon} {lane.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {laneJobCount} job{laneJobCount !== 1 ? 's' : ''}
                    </span>
                  </button>
                  {lane.key === 'editing_full' && (
                    <button
                      onClick={() => setShowCompleted(!showCompleted)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showCompleted ? 'Hide' : 'Show'} Completed ({processedJobs.completed.filter(j => j.job_type !== 'RECAP' && j.job_type !== 'ENG_SLIDESHOW').length})
                    </button>
                  )}
                  {lane.key === 'editing_recap' && (
                    <button
                      onClick={() => setShowCompletedRecaps(!showCompletedRecaps)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showCompletedRecaps ? 'Hide' : 'Show'} Completed ({processedJobs.completed.filter(j => j.job_type === 'RECAP').length})
                    </button>
                  )}
                  {lane.key === 'editing_eng_slideshow' && (
                    <button
                      onClick={() => setShowCompletedSlideshows(!showCompletedSlideshows)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showCompletedSlideshows ? 'Hide' : 'Show'} Completed ({processedJobs.completed.filter(j => j.job_type === 'ENG_SLIDESHOW').length})
                    </button>
                  )}
                </div>

                {/* WAITING FOR PHOTO ORDER — read-only from editing_queue */}
                {isWaiting && !isCollapsed && photoWaitingJobs.length > 0 && (
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Couple</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Wedding Date</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Photo Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {photoWaitingJobs.map(job => (
                          <tr key={job.id} className="hover:bg-accent/50 transition-colors">
                            <td className="p-3">
                              <button
                                onClick={() => job.couple_id && router.push(`/admin/couples/${job.couple_id}`)}
                                className="font-medium text-blue-600 hover:underline text-left"
                              >
                                {job.couples?.couple_name || 'Unknown'}
                              </button>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {job.couples?.wedding_date
                                ? format(parseISO(job.couples.wedding_date), 'MMM d, yyyy')
                                : <span className="text-amber-600 text-xs">No date</span>
                              }
                            </td>
                            <td className="p-3">
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                                Waiting for Photo Order
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Regular video job table */}
                {!isWaiting && !isCollapsed && (() => {
                  const laneJobs = processedJobs[lane.key as Exclude<SwimlaneKey, 'waiting_photo'>] || []
                  return laneJobs.length > 0 ? (
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="w-8 p-2"></th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                            {renderSortHeader('couple_name', 'Couple')}
                          </th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
                            {renderSortHeader('wedding_date', 'Wedding Date')}
                          </th>
                          {!hideSegments && SEGMENTS.map(seg => (
                            <th key={seg.field} className="text-center p-2 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell" title={seg.label}>
                              {renderSortHeader(seg.field, seg.shortLabel)}
                            </th>
                          ))}
                          <th className="text-center p-2 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell" title="Active HD">
                            {renderSortHeader('active_hd', 'HD')}
                          </th>
                          {!hideSegments && (
                            <>
                              <th className="text-center p-2 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell" title="Proxies Run">
                                {renderSortHeader('proxies_run', 'Prox')}
                              </th>
                              <th className="text-center p-2 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell" title="Video Form">
                                {renderSortHeader('video_form', 'Form')}
                              </th>
                            </>
                          )}
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                            {renderSortHeader('status', 'Status')}
                          </th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                            {renderSortHeader('due_date', 'Due Date')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {laneJobs.map(job => (
                          <tr
                            key={job.id}
                            className={`hover:bg-accent/50 transition-colors ${draggedJobId === job.id ? 'opacity-50' : ''} ${job.section === 'completed' ? 'opacity-50' : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(job.id)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => handleDrop(job.id, lane.key, laneJobs)}
                          >
                            <td className="p-2 cursor-grab active:cursor-grabbing text-muted-foreground">
                              <GripVertical className="h-4 w-4" />
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => job.couple_id && router.push(`/admin/couples/${job.couple_id}`)}
                                className="font-medium text-blue-600 hover:underline text-left"
                              >
                                {job.couples?.couple_name || 'Unknown'}
                              </button>
                            </td>
                            <td className="p-3 hidden lg:table-cell text-muted-foreground">
                              {(job.wedding_date || job.couples?.wedding_date)
                                ? format(parseISO((job.wedding_date || job.couples?.wedding_date)!), 'MMM d, yyyy')
                                : <span className="text-amber-600 text-xs">No date</span>
                              }
                            </td>
                            {!hideSegments && SEGMENTS.map(seg => (
                              <td key={seg.field} className="p-2 text-center hidden md:table-cell">
                                <button
                                  onClick={() => toggleField(job.id, seg.field, job[seg.field])}
                                  className={`text-sm cursor-pointer hover:opacity-70 ${job[seg.field] ? '' : 'opacity-40'}`}
                                  title={job[seg.field] ? `${seg.label} done` : `Mark ${seg.label} done`}
                                >
                                  {job[seg.field] ? '✅' : '⬜'}
                                </button>
                              </td>
                            ))}
                            <td className="p-2 text-center hidden md:table-cell">
                              <select
                                value={job.active_hd || ''}
                                onChange={e => updateActiveHd(job.id, e.target.value)}
                                className="text-xs rounded-md border-border bg-background px-1 py-0.5 !w-auto"
                              >
                                {ACTIVE_HD_OPTIONS.map(opt => (
                                  <option key={opt} value={opt}>{opt || '—'}</option>
                                ))}
                              </select>
                            </td>
                            {!hideSegments && (
                              <>
                                <td className="p-2 text-center hidden md:table-cell">
                                  <button
                                    onClick={() => toggleField(job.id, 'proxies_run', job.proxies_run)}
                                    className={`text-sm cursor-pointer hover:opacity-70 ${job.proxies_run ? '' : 'opacity-40'}`}
                                    title={job.proxies_run ? 'Proxies run' : 'Mark proxies run'}
                                  >
                                    {job.proxies_run ? '✅' : '⬜'}
                                  </button>
                                </td>
                                <td className="p-2 text-center hidden md:table-cell">
                                  <button
                                    onClick={() => toggleField(job.id, 'video_form', job.video_form)}
                                    className={`text-sm cursor-pointer hover:opacity-70 ${job.video_form ? '' : 'opacity-40'}`}
                                    title={job.video_form ? 'Video form received' : 'Mark video form received'}
                                  >
                                    {job.video_form ? '✅' : '⬜'}
                                  </button>
                                </td>
                              </>
                            )}
                            <td className="p-3">
                              <select
                                value={job.status}
                                onChange={e => updateJobStatus(job.id, e.target.value)}
                                className="text-xs rounded-md border-border bg-background px-2 py-1 !w-auto"
                              >
                                {getLaneStatusOptions(lane.key).map(opt =>
                                  opt.divider
                                    ? <option key="_divider" disabled>{'────────────'}</option>
                                    : <option key={opt.value} value={opt.value}>{opt.label}</option>
                                )}
                              </select>
                            </td>
                            <td className="p-3 hidden md:table-cell">
                              {editingDueDate === job.id ? (
                                <input
                                  type="date"
                                  autoFocus
                                  defaultValue={job.due_date || ''}
                                  onBlur={e => updateDueDate(job.id, e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') updateDueDate(job.id, (e.target as HTMLInputElement).value)
                                    if (e.key === 'Escape') setEditingDueDate(null)
                                  }}
                                  className="text-xs rounded-md border-border bg-background px-2 py-1 !w-auto"
                                />
                              ) : (
                                <button
                                  onClick={() => setEditingDueDate(job.id)}
                                  className="text-left text-xs hover:underline"
                                >
                                  {job.due_date
                                    ? <span className="text-muted-foreground">{format(parseISO(job.due_date), 'MMM d')}</span>
                                    : <span className="text-muted-foreground/50 italic">Set date</span>
                                  }
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  ) : null
                })()}

                {/* Empty lane */}
                {!isCollapsed && laneJobCount === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                    No jobs in this lane
                  </div>
                )}
              </div>
            )
          })}

          {/* ══════ ZONE 3: Completed 2026 ══════ */}
          <div className="mt-10">
            <button
              onClick={() => setCompleted2026Collapsed(!completed2026Collapsed)}
              className="flex items-center gap-3 py-3 group"
            >
              {completed2026Collapsed
                ? <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                : <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
              }
              <span className="text-base font-semibold tracking-tight text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">Completed 2026</span>
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-semibold tabular-nums">
                {completed2026JobsList.length}
              </span>
            </button>

            {!completed2026Collapsed && completed2026JobsList.length > 0 && (
              <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-900/20 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Couple</th>
                      <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Wedding Date</th>
                      {SEGMENTS.map(seg => (
                        <th key={seg.field} className="text-center p-2 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">{seg.shortLabel}</th>
                      ))}
                      <th className="text-center p-2 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">HD</th>
                      <th className="text-center p-2 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Prox</th>
                      <th className="text-center p-2 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Form</th>
                      <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {completed2026JobsList.map(job => (
                      <tr key={job.id} className="text-muted-foreground">
                        <td className="p-3">
                          <button
                            onClick={() => job.couple_id && router.push(`/admin/couples/${job.couple_id}`)}
                            className="font-medium text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:underline text-left transition-colors"
                          >
                            {job.couples?.couple_name || 'Unknown'}
                          </button>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          {(job.wedding_date || job.couples?.wedding_date)
                            ? format(parseISO((job.wedding_date || job.couples?.wedding_date)!), 'MMM d, yyyy')
                            : '\u2014'
                          }
                        </td>
                        {SEGMENTS.map(seg => (
                          <td key={seg.field} className="px-2 py-2.5 text-center hidden md:table-cell">
                            <span className={job[seg.field] ? 'text-xs text-emerald-400 dark:text-emerald-600' : 'text-xs text-slate-300 dark:text-slate-600'}>{job[seg.field] ? '\u2713' : '\u25CB'}</span>
                          </td>
                        ))}
                        <td className="px-2 py-2.5 text-center hidden md:table-cell text-xs">{job.active_hd || '\u2014'}</td>
                        <td className="px-2 py-2.5 text-center hidden md:table-cell">
                          <span className={job.proxies_run ? 'text-xs text-emerald-400 dark:text-emerald-600' : 'text-xs text-slate-300 dark:text-slate-600'}>{job.proxies_run ? '\u2713' : '\u25CB'}</span>
                        </td>
                        <td className="px-2 py-2.5 text-center hidden md:table-cell">
                          <span className={job.video_form ? 'text-xs text-emerald-400 dark:text-emerald-600' : 'text-xs text-slate-300 dark:text-slate-600'}>{job.video_form ? '\u2713' : '\u25CB'}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-xs">{STATUS_LABELS[job.status] || job.status}</span>
                        </td>
                        <td className="p-3 hidden md:table-cell text-xs">
                          {job.due_date ? format(parseISO(job.due_date), 'MMM d') : '\u2014'}
                        </td>
                      </tr>
                    ))}

                    {/* Summary row */}
                    <tr className="bg-muted/30 border-t-2 border-border text-muted-foreground">
                      <td className="p-3 font-semibold" colSpan={2}>
                        {completed2026JobsList.length} completed
                      </td>
                      <td className="p-3 hidden md:table-cell" colSpan={7}></td>
                      <td className="p-3 text-xs" colSpan={3}>
                        {edited2026Stats.full} full {'\u00B7'} {edited2026Stats.recap} recap{edited2026Stats.other > 0 ? ` \u00B7 ${edited2026Stats.other} other` : ''}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom spacer */}
        </div>

        {/* Stats Sidebar */}
        <aside className="w-[280px] shrink-0 p-6 bg-secondary/50 hidden lg:block">
          {/* Active Jobs */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Active Jobs
            </div>
            <div className="text-3xl font-bold">
              {stats.totalJobs - stats.completedCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.completedCount} non-active
            </div>
          </div>

          {/* Recaps Pending */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Recaps Pending
            </div>
            <div className={`text-3xl font-bold ${stats.recapsPending > 0 ? 'text-violet-600' : 'text-foreground'}`}>
              {stats.recapsPending}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Recap videos to edit</div>
          </div>

          {/* Slideshows Pending */}
          {stats.slideshowsPending > 0 && (
            <div className="rounded-xl border bg-card p-4 mb-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Slideshows Pending
              </div>
              <div className="text-3xl font-bold text-pink-600">
                {stats.slideshowsPending}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Engagement slideshows to edit</div>
            </div>
          )}

          {/* In Progress */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              In Progress
            </div>
            <div className="text-3xl font-bold">
              {stats.inProgressCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Currently editing</div>
          </div>

          {/* Waiting for Photo */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Waiting for Photo
            </div>
            <div className="text-3xl font-bold">
              {stats.onHoldCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Waiting on photo order</div>
          </div>

          {/* Editing Queue */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Editing Queue
            </div>
            <div className="text-3xl font-bold">
              {stats.editingCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Ready to edit</div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border my-6" />

          {/* Videos Complete */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-foreground mb-3">
              Videos Complete
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${stats.totalJobs > 0 ? Math.round((stats.completedCount / stats.totalJobs) * 100) : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{stats.completedCount} of {stats.totalJobs}</span>
              <span>{stats.totalJobs > 0 ? Math.round((stats.completedCount / stats.totalJobs) * 100) : 0}%</span>
            </div>
          </div>

          {/* 2025 Videos Remaining */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              2025 Videos Remaining
            </div>
            <div className="text-3xl font-bold">
              {stats.remaining2025}
            </div>
          </div>

          {/* 2026 Videos Remaining */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              2026 Videos Remaining
            </div>
            <div className="text-3xl font-bold">
              {stats.remaining2026}
            </div>
          </div>

          {/* Segments Done */}
          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs font-semibold text-foreground mb-3">
              Segments Done
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${stats.totalSegmentsPossible > 0 ? Math.round((stats.totalSegmentsDone / stats.totalSegmentsPossible) * 100) : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{stats.totalSegmentsDone} of {stats.totalSegmentsPossible}</span>
              <span>{stats.totalSegmentsPossible > 0 ? Math.round((stats.totalSegmentsDone / stats.totalSegmentsPossible) * 100) : 0}%</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Pulse animation */}
      <style jsx global>{`
        @keyframes pulse-bg {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.92; }
        }
      `}</style>
    </div>
  )
}
