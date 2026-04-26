'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, ChevronDown, ChevronRight, X } from 'lucide-react'
import { ProductionPageHeader, ProductionPills, ProductionSidebar } from '@/components/shared'
import { format, parseISO, differenceInDays } from 'date-fns'
import { formatDate, formatDateCompact } from '@/lib/formatters'
import { Playfair_Display, Nunito } from 'next/font/google'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { SortableVideoTable } from '@/components/video/SortableVideoTable'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

// ── Types ────────────────────────────────────────────────────────

interface VideoJob {
  id: string
  couple_id: string
  job_type: string
  product_code?: string | null
  quantity?: number | null
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
  video_proofs_out: 'Video Out',
  waiting_on_recap: 'Waiting on Recap',
  raw_video_output: 'Raw Video Output',
  complete: 'Complete',
  waiting_for_bride: 'Waiting for Bride',
  archived: 'Archived',
}

const ALL_STATUSES = ['not_started', 'in_progress', 'video_proofs_out', 'waiting_on_recap', 'waiting_for_bride', 'raw_video_output', 'complete', 'archived']

const STATUS_PILL: Record<string, { bg: string; text: string }> = {
  in_progress: { bg: 'bg-[#dbeafe]', text: 'text-[#1e40af]' },
  video_proofs_out: { bg: 'bg-[#bae6fd]', text: 'text-[#0c4a6e]' },
  waiting_for_bride: { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]' },
  waiting_on_recap: { bg: 'bg-[#f3e8ff]', text: 'text-[#3b0764]' },
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL: 'Full video',
  RECAP: 'Recap',
  ENG_SLIDESHOW: 'Slideshow',
}

type SwimlaneKey = 'editing_full' | 'editing_recap' | 'editing_eng_slideshow' | 'reediting' | 'waiting_photo' | 'completed'

const LANE_PRIMARY_STATUSES: Record<SwimlaneKey, string[]> = {
  editing_full: ['not_started', 'in_progress', 'video_proofs_out'],
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
  const [showVideoOut, setShowVideoOut] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const editingRef = useRef<HTMLDivElement>(null)

  // ── Due date editing state ─────────────────────────────────────
  const [editingDueDate, setEditingDueDate] = useState<string | null>(null)
  const [awaitingOrderCouples, setAwaitingOrderCouples] = useState<AwaitingOrderCouple[]>([])
  const [booked2026Count, setBooked2026Count] = useState(0)
  const [completed2026Collapsed, setCompleted2026Collapsed] = useState(true)

  // ── Fetch jobs ─────────────────────────────────────────────────

  useEffect(() => {
    const fetchJobs = async () => {
      const today = new Date().toISOString().split('T')[0]
      const [videoRes, photoRes, awaitingRes, booked2026Res] = await Promise.all([
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
          .select('id, couple_name, wedding_date, status, contracts(num_videographers), couple_milestones(m24_photo_order_in)')
          .lte('wedding_date', today)
          .not('status', 'in', '("declined","cancelled")')
          .order('wedding_date', { ascending: true }),
        supabase
          .from('couples')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'booked')
          .gte('wedding_date', '2026-01-01')
          .lte('wedding_date', '2026-12-31')
          .in('package_type', ['photo_video']),
      ])

      if (!videoRes.error && videoRes.data) setJobs(videoRes.data)
      if (!photoRes.error && photoRes.data) setPhotoWaitingJobs(photoRes.data as unknown as PhotoWaitingJob[])
      if (!awaitingRes.error && awaitingRes.data) {
        const filtered = (awaitingRes.data as any[]).filter((c) => {
          if (['declined', 'cancelled'].includes(c.status)) return false
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
      setBooked2026Count(booked2026Res.count ?? 0)
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

  // ── Reorder handler for SortableVideoTable ───────────────────

  const handleEditingFullReorder = useCallback((reorderedJobs: VideoJob[]) => {
    setJobs(prev => {
      const next = [...prev]
      for (let i = 0; i < reorderedJobs.length; i++) {
        const idx = next.findIndex(j => j.id === reorderedJobs[i].id)
        if (idx !== -1) next[idx] = { ...next[idx], sort_order: i + 1 }
      }
      return next
    })
  }, [])

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

    // Filter video_proofs_out from editing_full when toggle is off
    if (!showVideoOut) {
      lanes.editing_full = lanes.editing_full.filter(j => j.status !== 'video_proofs_out')
    }

    // Sort each lane by manual sort_order (fallback to wedding_date)
    for (const key of Object.keys(lanes) as Exclude<SwimlaneKey, 'waiting_photo'>[]) {
      lanes[key].sort((a, b) => {
        const aOrder = a.sort_order ?? 9999
        const bOrder = b.sort_order ?? 9999
        if (aOrder !== bOrder) return aOrder - bOrder
        return (a.wedding_date || a.couples?.wedding_date || '9999').localeCompare(b.wedding_date || b.couples?.wedding_date || '9999')
      })
    }

    return lanes
  }, [jobs, search, showCompleted, showCompletedRecaps, showCompletedSlideshows, showVideoOut])

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

    const inProductionTotal = jobs.filter(j => j.section === 'editing').length

    const remaining2025 = jobs.filter(j => {
      const wd = j.wedding_date || j.couples?.wedding_date
      return j.job_type === 'FULL' && j.status !== 'complete' && wd && wd >= '2025-01-01' && wd <= '2025-12-31'
    }).length
    const remaining2026 = jobs.filter(j => {
      const wd = j.wedding_date || j.couples?.wedding_date
      return j.job_type === 'FULL' && j.status !== 'complete' && wd && wd >= '2026-01-01' && wd <= '2026-12-31'
    }).length
    const remaining2027 = jobs.filter(j => {
      const wd = j.wedding_date || j.couples?.wedding_date
      return j.job_type === 'FULL' && j.status !== 'complete' && wd && wd >= '2027-01-01' && wd <= '2027-12-31'
    }).length

    return {
      totalJobs, completedCount, recapsPending, slideshowsPending, overdueCount, mostUrgent,
      inProgressCount, onHoldCount, editingCount, inProductionTotal,
      totalSegmentsDone, totalSegmentsPossible, remaining2025, remaining2026, remaining2027,
    }
  }, [jobs, photoWaitingJobs])

  // ── Zone 1 & 3 computed data ────────────────────────────────────

  const currentlyEditingJobs = useMemo(() => {
    let result = jobs.filter(j => ['in_progress', 'video_proofs_out', 'waiting_for_bride', 'waiting_on_recap'].includes(j.status))
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

  const pipelineStats = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {}
    for (const j of jobs) {
      if (!counts[j.job_type]) counts[j.job_type] = {}
      counts[j.job_type][j.status] = (counts[j.job_type][j.status] || 0) + 1
    }
    const fullTotal = Object.values(counts['FULL'] || {}).reduce((s, n) => s + n, 0)
    // Sidebar counts
    const fullEditing = jobs.filter(j => j.job_type === 'FULL' && j.section === 'editing').length
    const recapEditing = jobs.filter(j => j.job_type === 'RECAP' && j.section === 'editing').length
    const slideshowEditing = jobs.filter(j => j.job_type === 'ENG_SLIDESHOW' && j.section === 'editing').length

    // 2025 not_started FULL videos
    const fullNotStarted2025 = jobs.filter(j => {
      const wd = j.wedding_date || j.couples?.wedding_date
      return j.job_type === 'FULL' && j.status === 'not_started' && wd && wd >= '2025-01-01' && wd <= '2025-12-31'
    }).length

    // 2026 completed FULL videos
    const fullCompleted2026 = jobs.filter(j => {
      const wd = j.wedding_date || j.couples?.wedding_date
      return j.job_type === 'FULL' && j.section === 'completed' && wd && wd >= '2026-01-01' && wd <= '2026-12-31'
    }).length

    return {
      fullInProgress: counts['FULL']?.['in_progress'] || 0,
      fullVideoOut: counts['FULL']?.['video_proofs_out'] || 0,
      fullWaitingBride: counts['FULL']?.['waiting_for_bride'] || 0,
      fullNotStarted: counts['FULL']?.['not_started'] || 0,
      fullComplete: counts['FULL']?.['complete'] || 0,
      fullTotal,
      slideshowsNotStarted: counts['ENG_SLIDESHOW']?.['not_started'] || 0,
      fullEditing,
      recapEditing,
      slideshowEditing,
      fullNotStarted2025,
      fullCompleted2026,
    }
  }, [jobs])

  const edited2026Stats = useMemo(() => {
    const completed = jobs.filter(j => j.completed_date && j.completed_date >= '2026-01-01')
    const typeCounts: Record<string, number> = {}
    completed.forEach(j => { typeCounts[j.job_type] = (typeCounts[j.job_type] || 0) + 1 })
    const full = typeCounts['FULL'] || 0
    const recap = typeCounts['RECAP'] || 0
    // Build ordered breakdown with actual type labels uppercase
    const typeOrder = ['FULL', 'RECAP']
    const breakdown = Object.entries(typeCounts)
      .sort(([a], [b]) => {
        const ai = typeOrder.indexOf(a), bi = typeOrder.indexOf(b)
        if (ai >= 0 && bi >= 0) return ai - bi
        if (ai >= 0) return -1
        if (bi >= 0) return 1
        return a.localeCompare(b)
      })
      .map(([type, count]) => ({
        label: (type === 'ENG_SLIDESHOW' ? 'SLIDESHOW' : type.replace(/_/g, ' ')).toUpperCase(),
        count,
      }))
    return { total: completed.length, full, recap, other: completed.length - full - recap, breakdown }
  }, [jobs])

  const completed2026JobsList = useMemo(() => {
    let result = jobs.filter(j => j.section === 'completed' && j.completed_date && j.completed_date >= '2026-01-01' && j.completed_date <= '2026-12-31')
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(j =>
        j.couples?.couple_name?.toLowerCase().includes(q) ||
        j.assigned_to?.toLowerCase().includes(q)
      )
    }
    return result.sort((a, b) => (b.completed_date || '').localeCompare(a.completed_date || ''))
  }, [jobs, search])

  const videosRemainingByYear = useMemo(() => {
    let result = jobs.filter(j => j.job_type === 'FULL' && j.status !== 'complete')
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(j =>
        j.couples?.couple_name?.toLowerCase().includes(q) ||
        j.assigned_to?.toLowerCase().includes(q)
      )
    }
    return result.sort((a, b) => {
      const aWd = a.wedding_date || a.couples?.wedding_date || '9999'
      const bWd = b.wedding_date || b.couples?.wedding_date || '9999'
      return aWd.localeCompare(bWd)
    })
  }, [jobs, search])

  const [remainingByYearCollapsed, setRemainingByYearCollapsed] = useState(true)

  // Column defs for Videos Remaining DataTable
  const videosRemainingColumns: ColumnDef<VideoJob>[] = useMemo(() => [
    {
      accessorKey: 'couple_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      accessorFn: (row) => row.couples?.couple_name || 'Unknown',
      cell: ({ row }) => (
        <a
          href={`/admin/production/couples/${row.original.couple_id}`}
          className="font-medium text-teal-700 hover:underline text-left"
        >
          {row.original.couples?.couple_name || 'Unknown'}
        </a>
      ),
    },
    {
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      accessorFn: (row) => row.wedding_date || row.couples?.wedding_date || '',
      cell: ({ row }) => {
        const wd = row.original.wedding_date || row.original.couples?.wedding_date
        return wd ? <span className="text-muted-foreground">{formatDateCompact(wd)}</span> : <span className="text-amber-600 text-xs">No date</span>
      },
    },
    {
      id: 'product_remaining',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
      accessorFn: (row) => row.product_code ?? JOB_TYPE_LABELS[row.job_type] ?? row.job_type,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.product_code ?? JOB_TYPE_LABELS[row.original.job_type] ?? row.original.job_type}</span>
      ),
    },
    {
      id: 'qty_remaining',
      header: 'Qty',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.quantity ?? '—'}</span>,
      enableSorting: false,
    },
    {
      id: 'days_since',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Days" />,
      accessorFn: (row) => {
        const wd = row.wedding_date || row.couples?.wedding_date
        return wd ? Math.floor((new Date().getTime() - new Date(wd).getTime()) / (1000 * 60 * 60 * 24)) : -1
      },
      cell: ({ row }) => {
        const wd = row.original.wedding_date || row.original.couples?.wedding_date
        const daysSince = wd ? Math.floor((new Date().getTime() - new Date(wd).getTime()) / (1000 * 60 * 60 * 24)) : null
        return daysSince !== null ? (
          <span className={`text-sm font-medium tabular-nums ${daysSince > 180 ? 'text-red-600' : 'text-muted-foreground'}`} style={{ textAlign: 'center', display: 'block' }}>
            {daysSince}
          </span>
        ) : <span style={{ textAlign: 'center', display: 'block' }}>—</span>
      },
    },
    {
      accessorKey: 'active_hd',
      header: ({ column }) => <DataTableColumnHeader column={column} title="HD" />,
      cell: ({ row }) => (
        <select
          value={row.original.active_hd || ''}
          onChange={e => updateActiveHd(row.original.id, e.target.value)}
          className="text-xs rounded-md border-border bg-background px-1 py-0.5 !w-auto"
        >
          {ACTIVE_HD_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt || '—'}</option>
          ))}
        </select>
      ),
    },
    {
      accessorKey: 'proxies_run',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Prox" />,
      cell: ({ row }) => (
        <button
          onClick={() => toggleField(row.original.id, 'proxies_run', row.original.proxies_run)}
          className={`text-sm cursor-pointer hover:opacity-70 ${row.original.proxies_run ? '' : 'opacity-40'}`}
          title={row.original.proxies_run ? 'Proxies run' : 'Mark proxies run'}
        >
          {row.original.proxies_run ? '✅' : '⬜'}
        </button>
      ),
    },
    {
      accessorKey: 'video_form',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Form" />,
      cell: ({ row }) => (
        <button
          onClick={() => toggleField(row.original.id, 'video_form', row.original.video_form)}
          className={`text-sm cursor-pointer hover:opacity-70 ${row.original.video_form ? '' : 'opacity-40'}`}
          title={row.original.video_form ? 'Video form received' : 'Mark video form received'}
        >
          {row.original.video_form ? '✅' : '⬜'}
        </button>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      accessorFn: (row) => STATUS_LABELS[row.status] || row.status,
      cell: ({ row }) => (
        <select
          value={row.original.status}
          onChange={e => updateJobStatus(row.original.id, e.target.value)}
          className="text-xs rounded-md border-border bg-background px-2 py-1 !w-auto"
        >
          {getLaneStatusOptions('editing_full').map(opt =>
            opt.divider
              ? <option key="_divider" disabled>{'────────────'}</option>
              : <option key={opt.value} value={opt.value}>{opt.label}</option>
          )}
        </select>
      ),
    },
    {
      accessorKey: 'due_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Due Date" />,
      cell: ({ row }) => {
        const job = row.original
        if (editingDueDate === job.id) {
          return (
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
          )
        }
        return (
          <button onClick={() => setEditingDueDate(job.id)} className="text-left text-xs hover:underline">
            {job.due_date
              ? <span className="text-muted-foreground">{formatDateCompact(job.due_date).replace(/, \d{4}$/, '')}</span>
              : <span className="text-muted-foreground/50 italic">Set date</span>
            }
          </button>
        )
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [editingDueDate])

  // ── Swimlane column factory ──────────────────────────────────

  const makeSwimlaneColumns = (laneKey: SwimlaneKey, hideSegments: boolean): ColumnDef<VideoJob>[] => {
    const cols: ColumnDef<VideoJob>[] = [
      {
        id: 'couple_name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
        accessorFn: (row) => row.couples?.couple_name || 'Unknown',
        cell: ({ row }) => (
          <a href={`/admin/production/couples/${row.original.couple_id}`}
            className="font-medium text-teal-700 hover:underline text-left">
            {row.original.couples?.couple_name || 'Unknown'}
          </a>
        ),
      },
      {
        id: 'wedding_date',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
        accessorFn: (row) => row.wedding_date || row.couples?.wedding_date || '',
        cell: ({ row }) => {
          const wd = row.original.wedding_date || row.original.couples?.wedding_date
          return wd ? <span className="text-muted-foreground">{formatDateCompact(wd)}</span> : <span className="text-amber-600 text-xs">No date</span>
        },
      },
    ]

    cols.push({
      id: 'product',
      header: 'Product',
      accessorFn: (row) => row.product_code ?? JOB_TYPE_LABELS[row.job_type] ?? row.job_type,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate">
          {row.original.product_code ?? JOB_TYPE_LABELS[row.original.job_type] ?? row.original.job_type}
        </span>
      ),
    })
    cols.push({
      id: 'quantity',
      header: 'Qty',
      accessorFn: (row) => row.quantity ?? 1,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.quantity ?? '—'}</span>
      ),
      enableSorting: false,
    })

    if (!hideSegments) {
      cols.push({
        id: 'days_since',
        header: 'Days',
        accessorFn: (row) => {
          const wd = row.wedding_date || row.couples?.wedding_date
          return wd ? Math.floor((Date.now() - new Date(wd).getTime()) / 86400000) : -1
        },
        cell: ({ row }) => {
          const wd = row.original.wedding_date || row.original.couples?.wedding_date
          const daysSince = wd ? Math.floor((Date.now() - new Date(wd).getTime()) / 86400000) : null
          return daysSince !== null ? (
            <span className={`text-sm font-medium tabular-nums ${daysSince > 180 ? 'text-red-600' : 'text-muted-foreground'}`}>{daysSince}</span>
          ) : '—'
        },
        enableSorting: false,
      })

      SEGMENTS.forEach(seg => {
        cols.push({
          id: seg.field,
          header: seg.shortLabel,
          cell: ({ row }) => (
            <button onClick={() => toggleField(row.original.id, seg.field, row.original[seg.field])}
              className={`text-sm cursor-pointer hover:opacity-70 ${row.original[seg.field] ? '' : 'opacity-40'}`}
              title={row.original[seg.field] ? `${seg.label} done` : `Mark ${seg.label} done`}>
              {row.original[seg.field] ? '✅' : '⬜'}
            </button>
          ),
          enableSorting: false,
        } as ColumnDef<VideoJob>)
      })
    }

    cols.push({
      id: 'active_hd',
      header: ({ column }) => <DataTableColumnHeader column={column} title="HD" />,
      accessorFn: (row) => row.active_hd || '',
      cell: ({ row }) => (
        <select value={row.original.active_hd || ''} onChange={e => updateActiveHd(row.original.id, e.target.value)}
          className="text-xs rounded-md border-border bg-background px-1 py-0.5 !w-auto">
          {ACTIVE_HD_OPTIONS.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
        </select>
      ),
    })

    if (!hideSegments) {
      cols.push({
        id: 'proxies_run',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Prox" />,
        accessorFn: (row) => row.proxies_run ? 1 : 0,
        cell: ({ row }) => (
          <button onClick={() => toggleField(row.original.id, 'proxies_run', row.original.proxies_run)}
            className={`text-sm cursor-pointer hover:opacity-70 ${row.original.proxies_run ? '' : 'opacity-40'}`}
            title={row.original.proxies_run ? 'Proxies run' : 'Mark proxies run'}>
            {row.original.proxies_run ? '✅' : '⬜'}
          </button>
        ),
      })
      cols.push({
        id: 'video_form',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Form" />,
        accessorFn: (row) => row.video_form ? 1 : 0,
        cell: ({ row }) => (
          <button onClick={() => toggleField(row.original.id, 'video_form', row.original.video_form)}
            className={`text-sm cursor-pointer hover:opacity-70 ${row.original.video_form ? '' : 'opacity-40'}`}
            title={row.original.video_form ? 'Video form received' : 'Mark video form received'}>
            {row.original.video_form ? '✅' : '⬜'}
          </button>
        ),
      })
    }

    cols.push({
      id: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      accessorFn: (row) => STATUS_LABELS[row.status] || row.status,
      cell: ({ row }) => (
        <select value={row.original.status} onChange={e => updateJobStatus(row.original.id, e.target.value)}
          className="text-xs rounded-md border-border bg-background px-2 py-1 !w-auto">
          {getLaneStatusOptions(laneKey).map(opt =>
            opt.divider ? <option key="_divider" disabled>{'────────────'}</option>
              : <option key={opt.value} value={opt.value}>{opt.label}</option>
          )}
        </select>
      ),
    })

    cols.push({
      id: 'due_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Due Date" />,
      accessorFn: (row) => row.due_date || '',
      cell: ({ row }) => {
        const job = row.original
        if (editingDueDate === job.id) {
          return (
            <input type="date" autoFocus defaultValue={job.due_date || ''}
              onBlur={e => updateDueDate(job.id, e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') updateDueDate(job.id, (e.target as HTMLInputElement).value)
                if (e.key === 'Escape') setEditingDueDate(null)
              }}
              className="text-xs rounded-md border-border bg-background px-2 py-1 !w-auto" />
          )
        }
        return (
          <button onClick={() => setEditingDueDate(job.id)} className="text-left text-xs hover:underline">
            {job.due_date ? <span className="text-muted-foreground">{formatDateCompact(job.due_date).replace(/, \d{4}$/, '')}</span>
              : <span className="text-muted-foreground/50 italic">Set date</span>}
          </button>
        )
      },
    })

    return cols
  }

  // ── Completed 2026 columns ──────────────────────────────────

  const completed2026Columns: ColumnDef<VideoJob>[] = useMemo(() => [
    {
      accessorKey: 'couple_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      accessorFn: (row) => row.couples?.couple_name || 'Unknown',
      cell: ({ row }) => (
        <button onClick={() => row.original.couple_id && router.push(`/admin/couples/${row.original.couple_id}`)}
          className="font-medium hover:underline text-left transition-colors text-[13px] text-muted-foreground">
          {row.original.couples?.couple_name || 'Unknown'}
        </button>
      ),
    },
    {
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      accessorFn: (row) => row.wedding_date || row.couples?.wedding_date || '',
      cell: ({ row }) => {
        const wd = row.original.wedding_date || row.original.couples?.wedding_date
        return wd ? <span className="text-xs">{formatDateCompact(wd)}</span> : '—'
      },
    },
    ...SEGMENTS.map(seg => ({
      id: seg.field,
      header: seg.shortLabel,
      accessorFn: (row: VideoJob) => row[seg.field] ? 1 : 0,
      cell: ({ row }: any) => (
        <span style={{ color: row.original[seg.field] ? '#86efac' : '#d6d3d1' }} className="text-xs">
          {row.original[seg.field] ? '✓' : '○'}
        </span>
      ),
      enableSorting: false,
    } as ColumnDef<VideoJob>)),
    { id: 'active_hd_completed', header: 'HD', accessorFn: (row: VideoJob) => row.active_hd || '', cell: ({ row }: any) => <span className="text-xs">{row.original.active_hd || '—'}</span>, enableSorting: false },
    { id: 'proxies_completed', header: 'Prox', accessorFn: (row: VideoJob) => row.proxies_run ? 1 : 0, cell: ({ row }: any) => <span style={{ color: row.original.proxies_run ? '#86efac' : '#d6d3d1' }} className="text-xs">{row.original.proxies_run ? '✓' : '○'}</span>, enableSorting: false },
    { id: 'form_completed', header: 'Form', accessorFn: (row: VideoJob) => row.video_form ? 1 : 0, cell: ({ row }: any) => <span style={{ color: row.original.video_form ? '#86efac' : '#d6d3d1' }} className="text-xs">{row.original.video_form ? '✓' : '○'}</span>, enableSorting: false },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      accessorFn: (row) => STATUS_LABELS[row.status] || row.status,
      cell: ({ row }) => (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-background text-muted-foreground border border-border">
          {STATUS_LABELS[row.original.status] || row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'due_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Due Date" />,
      cell: ({ row }) => <span className="text-xs">{row.original.due_date ? formatDateCompact(row.original.due_date).replace(/, \d{4}$/, '') : '—'}</span>,
    },
    {
      accessorKey: 'completed_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date Completed" />,
      cell: ({ row }) => <span className="text-xs">{row.original.completed_date ? formatDateCompact(row.original.completed_date) : '—'}</span>,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [router])

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
  // waiting_photo lane removed (WO-299) — table moved to Photo page

  return (
    <div className="space-y-0">
      <ProductionPageHeader
        title="Video Production"
        subtitle={`${jobs.filter(j => j.section === 'editing' && j.status !== 'video_proofs_out').length} active jobs`}
        actionLabel="+ Add Job"
        actionHref="/admin/production/editing/new"
      />

      <ProductionPills pills={[
        { label: 'Not Started', count: jobs.filter(j => j.status === 'not_started').length, color: 'yellow' },
        { label: 'In Progress', count: jobs.filter(j => j.status === 'in_progress').length, color: 'blue' },
        { label: 'Proofs Out', count: jobs.filter(j => j.status === 'video_proofs_out').length, color: 'teal' },
        { label: 'Complete', count: jobs.filter(j => j.status === 'complete').length, color: 'green' },
      ]} />

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
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:border-r border-border">
          {/* Search */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search couples..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-input bg-background pl-9 pr-8 py-2.5 text-sm outline-none transition-colors focus:border-ring"
                style={{ paddingLeft: '2.25rem' }}
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

          {/* ══════ ZONE 1: Video Out ══════ */}
          <div id="section-video-out" className={`mb-10 ${nunito.className}`}>
            {/* Section header */}
            <div className="flex items-center gap-3 mb-6">
              <h2 className={`text-xl text-primary font-bold ${playfair.className}`}>
                Video Out
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-primary">
                {currentlyEditingJobs.length} job{currentlyEditingJobs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Job Cards */}
            {currentlyEditingJobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {currentlyEditingJobs.map(job => {
                  const segsDone = countSegmentsDone(job)
                  const weddingDate = job.wedding_date || job.couples?.wedding_date
                  const daysWaiting = weddingDate ? differenceInDays(new Date(), parseISO(weddingDate)) : 0
                  const pill = STATUS_PILL[job.status] || { bg: 'bg-muted', text: 'text-muted-foreground' }
                  const daysColor = daysWaiting > 90 ? '#dc2626' : daysWaiting > 60 ? '#d97706' : '#1c1917'

                  return (
                    <div
                      key={job.id}
                      className="rounded-xl p-5 transition-shadow hover:shadow-md border border-border bg-background"
                    >
                      {/* Top row: Days waiting + Status pill */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="font-bold tabular-nums leading-none" style={{ fontSize: '28px', color: daysColor }}>
                            {daysWaiting}
                          </div>
                          <div className="text-xs mt-1 text-muted-foreground">days since wedding</div>
                        </div>
                        <select
                          value={job.status}
                          onChange={e => updateJobStatus(job.id, e.target.value)}
                          className={`text-xs font-bold rounded-full px-3 py-1.5 border-0 cursor-pointer ${pill.bg} ${pill.text}`}
                        >
                          <option value="in_progress">In Progress</option>
                          <option value="video_proofs_out">Video Out</option>
                          <option value="waiting_for_bride">Waiting for Bride</option>
                          <option value="waiting_on_recap">Waiting on Recap</option>
                          <option disabled>{'\u2500'.repeat(12)}</option>
                          <option value="not_started">Not Started</option>
                          <option value="raw_video_output">Raw Video Output</option>
                          <option value="complete">Complete</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>

                      {/* Couple name + date */}
                      <button
                        onClick={() => job.couple_id && router.push(`/admin/couples/${job.couple_id}`)}
                        className="text-left group mb-0.5 block"
                      >
                        <div className="text-base font-semibold group-hover:underline text-foreground">
                          {job.couples?.couple_name || 'Unknown'}
                        </div>
                      </button>
                      {weddingDate && (
                        <div className="text-[13px] mb-1 text-muted-foreground">{formatDate(weddingDate)}</div>
                      )}

                      {/* Job type */}
                      <div className="text-[13px] mb-4 text-muted-foreground">{JOB_TYPE_LABELS[job.job_type] || job.job_type}</div>

                      {/* Segment progress circles */}
                      <div className="mb-4">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {SEGMENTS.map(seg => (
                            <div
                              key={seg.field}
                              className="w-5 h-5 rounded-full transition-colors"
                              style={{ backgroundColor: job[seg.field] ? '#0d9488' : '#e5e7eb' }}
                              title={seg.label}
                            />
                          ))}
                        </div>
                        <div className="text-xs font-medium" style={{ color: segsDone === 6 ? '#0d9488' : segsDone > 0 ? '#d97706' : '#a8a29e' }}>
                          {segsDone} of 6 segments
                        </div>
                      </div>

                      {/* Bottom row: Proxies, Form, Editor */}
                      <div className="flex items-center gap-4 pt-3 border-t border-border">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: job.proxies_run ? '#0d9488' : '#d4d4d8' }} />
                          <span className="text-xs text-muted-foreground">Proxies</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: job.video_form ? '#0d9488' : '#d4d4d8' }} />
                          <span className="text-xs text-muted-foreground">Form</span>
                        </div>
                        {job.assigned_to && (
                          <div className="text-xs ml-auto text-muted-foreground">{job.assigned_to}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-sm rounded-xl mb-6 text-muted-foreground border border-dashed border-border">
                No videos currently being edited
              </div>
            )}

            {/* Metric Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tile 1: Completed in 2026 */}
              <div className="rounded-lg p-4 bg-muted">
                <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">Completed in 2026</div>
                <div className="font-bold tabular-nums mb-2 text-foreground" style={{ fontSize: '24px' }}>
                  {edited2026Stats.total}
                </div>
                <div className="text-xs mb-1 text-muted-foreground">videos delivered this year</div>
              </div>

              {/* Tile 2: Incoming Work */}
              <div className="rounded-lg p-4 bg-muted">
                <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">Incoming Work</div>
                <div className="font-bold tabular-nums mb-2" style={{ fontSize: '24px', color: '#d97706' }}>
                  {awaitingOrderCouples.length}
                </div>
                <div className="text-xs mb-1 text-muted-foreground">couples awaiting photo order</div>
                <div className="text-xs text-muted-foreground">
                  {notStartedCount} not-started job{notStartedCount !== 1 ? 's' : ''} in backlog
                </div>
              </div>

              {/* Tile 3: 2026 Velocity */}
              <div className="rounded-lg p-4 bg-muted">
                <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">2026 Velocity</div>
                <div className="font-bold tabular-nums mb-2" style={{ fontSize: '24px', color: '#0d9488' }}>
                  {edited2026Stats.total}
                </div>
                <div className="text-xs mb-1 text-muted-foreground">videos edited in 2026</div>
                <div className="text-xs text-muted-foreground">
                  {edited2026Stats.breakdown.map((b, i) => <span key={b.label}>{i > 0 ? ' \u00B7 ' : ''}{b.count} {b.label}</span>)}
                </div>
              </div>
            </div>
          </div>

          {/* Swimlanes */}
          {SWIMLANES.map(lane => {
            if (lane.key === 'completed' && !showCompleted) return null
            const laneJobCount = (processedJobs[lane.key as Exclude<SwimlaneKey, 'waiting_photo'>] || []).length

            const isCollapsed = collapsedLanes.has(lane.key)
            const recap = isRecapLane(lane.key)
            const slideshow = isSlideshowLane(lane.key)
            const hideSegments = recap || slideshow

            return (
              <div key={lane.key}>
              <div
                id={`section-${lane.key}`}
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
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowVideoOut(!showVideoOut)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showVideoOut ? 'Hide Video Out' : 'Show All'}
                      </button>
                      <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showCompleted ? 'Hide' : 'Show'} Completed ({processedJobs.completed.filter(j => j.job_type !== 'RECAP' && j.job_type !== 'ENG_SLIDESHOW').length})
                      </button>
                    </div>
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

                {/* Regular video job table */}
                {!isCollapsed && (() => {
                  const laneJobs = processedJobs[lane.key as Exclude<SwimlaneKey, 'waiting_photo'>] || []
                  if (laneJobs.length === 0) return null
                  if (lane.key === 'editing_full') {
                    return (
                      <SortableVideoTable
                        columns={makeSwimlaneColumns(lane.key, hideSegments)}
                        data={laneJobs}
                        onReorder={handleEditingFullReorder}
                        emptyMessage="No jobs in this lane"
                      />
                    )
                  }
                  return (
                    <DataTable
                      columns={makeSwimlaneColumns(lane.key, hideSegments)}
                      data={laneJobs}
                      showPagination={false}
                      emptyMessage="No jobs in this lane"
                    />
                  )
                })()}

                {/* Empty lane */}
                {!isCollapsed && laneJobCount === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                    No jobs in this lane
                  </div>
                )}
              </div>
              </div>
            )
          })}

          {/* ══════ Videos Remaining by Year ══════ */}
          <div id="section-videos-remaining" className="mb-6">
            <div className="flex items-center justify-between py-3">
              <button
                onClick={() => setRemainingByYearCollapsed(!remainingByYearCollapsed)}
                className="flex items-center gap-3 text-left hover:opacity-80"
              >
                {remainingByYearCollapsed
                  ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
                <span className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-sm font-semibold bg-orange-100 text-orange-700">
                  📅 VIDEOS REMAINING BY YEAR
                </span>
                <span className="text-sm text-muted-foreground">
                  {videosRemainingByYear.length} video{videosRemainingByYear.length !== 1 ? 's' : ''}
                </span>
              </button>
            </div>
            {!remainingByYearCollapsed && (
              <DataTable
                columns={videosRemainingColumns}
                data={videosRemainingByYear}
                showPagination={false}
                emptyMessage="No remaining videos"
              />
            )}
          </div>

          {/* ══════ ZONE 3: Completed in 2026 ══════ */}
          <div id="section-completed-2026" className={`mt-10 ${nunito.className}`}>
            <button
              onClick={() => setCompleted2026Collapsed(!completed2026Collapsed)}
              className="flex items-center gap-3 py-3 group"
            >
              {completed2026Collapsed
                ? <ChevronRight className="h-4 w-4 transition-colors text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 transition-colors text-muted-foreground" />
              }
              <span className={`text-base font-bold tracking-tight transition-colors text-muted-foreground ${playfair.className}`}>
                Completed in 2026
              </span>
              <span className="inline-flex items-center justify-center h-5 min-w-[22px] px-1.5 rounded-full text-xs font-bold tabular-nums bg-muted text-muted-foreground">
                {completed2026JobsList.length}
              </span>
            </button>

            {!completed2026Collapsed && (
              <DataTable
                columns={completed2026Columns}
                data={completed2026JobsList}
                showPagination={false}
                emptyMessage="No completed jobs"
              />
            )}
          </div>

          {/* Bottom spacer */}
        </div>

        <ProductionSidebar boxes={[
          { label: 'VIDEO PROOFS OUT', value: pipelineStats.fullVideoOut, scrollToId: 'section-video-out', color: 'teal' },
          { label: '2025 VIDEOS REMAINING', value: pipelineStats.fullNotStarted2025, scrollToId: 'section-videos-remaining', color: 'teal' },
          { label: '2026 VIDEOS REMAINING', value: Math.max(0, booked2026Count - pipelineStats.fullCompleted2026), scrollToId: 'section-videos-remaining', color: 'teal' },
          { label: 'VIDEOS READY TO EDIT', value: pipelineStats.fullEditing, scrollToId: 'section-editing_full', color: 'teal' },
          { label: 'RECAPS QUEUE', value: pipelineStats.recapEditing, scrollToId: 'section-editing_recap', color: 'teal' },
          { label: 'SLIDESHOWS QUEUE', value: pipelineStats.slideshowEditing, scrollToId: 'section-editing_eng_slideshow', color: 'teal' },
          { label: 'WAITING FOR PHOTO', value: awaitingOrderCouples.length, scrollToId: 'section-video-out', color: 'red' },
          { label: 'COMPLETED IN 2026', value: completed2026JobsList.length, scrollToId: 'section-completed-2026', color: 'teal' },
        ]} />
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
