'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
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
  full_video_id: string | null
  created_at: string
  updated_at: string
  couples?: { couple_name: string; id: string }
}

// ── Constants ────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  waiting_photo: 'Waiting on Photo',
  complete: 'Complete',
}

const ALL_STATUSES = ['not_started', 'in_progress', 'waiting_photo', 'complete']

type SwimlaneKey = 'editing_full' | 'editing_recap' | 'reediting' | 'on_hold' | 'completed'

const LANE_PRIMARY_STATUSES: Record<SwimlaneKey, string[]> = {
  editing_full: ['not_started', 'in_progress'],
  editing_recap: ['not_started', 'in_progress'],
  reediting: ['in_progress'],
  on_hold: ['waiting_photo', 'not_started'],
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
  { key: 'reediting', label: 'REEDITING', icon: '🔄', badgeClass: 'bg-sky-100 text-sky-700' },
  { key: 'on_hold', label: 'ON HOLD', icon: '⏸️', badgeClass: 'bg-slate-100 text-slate-700' },
  { key: 'completed', label: 'COMPLETED', icon: '✅', badgeClass: 'bg-green-100 text-green-700' },
]

type SegmentField = 'ceremony_done' | 'reception_done' | 'park_done' | 'prereception_done' | 'groom_done' | 'bride_done'
type ToggleField = SegmentField | 'proxies_run' | 'video_form'

const SEGMENTS: { field: SegmentField; label: string; shortLabel: string }[] = [
  { field: 'ceremony_done', label: 'Ceremony', shortLabel: 'Cer' },
  { field: 'reception_done', label: 'Reception', shortLabel: 'Rec' },
  { field: 'park_done', label: 'Park', shortLabel: 'Park' },
  { field: 'prereception_done', label: 'PreReception', shortLabel: 'Pre' },
  { field: 'groom_done', label: 'Groom', shortLabel: 'Grm' },
  { field: 'bride_done', label: 'Bride', shortLabel: 'Brd' },
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
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [assignedFilter, setAssignedFilter] = useState<string>('all')
  const [showCompleted, setShowCompleted] = useState(false)
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set(['completed']))
  const [refreshKey, setRefreshKey] = useState(0)
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null)
  const editingRef = useRef<HTMLDivElement>(null)

  // ── Fetch jobs ─────────────────────────────────────────────────

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('video_jobs')
        .select('*, couples(id, couple_name)')
        .order('sort_order', { ascending: true, nullsFirst: false })

      if (!error && data) {
        setJobs(data)
      }
      setLoading(false)
    }
    fetchJobs()
  }, [refreshKey])

  // ── Update status inline ───────────────────────────────────────

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    const updates: Record<string, any> = { status: newStatus }
    if (newStatus === 'complete') updates.section = 'completed'

    const { error } = await supabase
      .from('video_jobs')
      .update(updates)
      .eq('id', jobId)

    if (!error) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j))
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
        j.notes?.toLowerCase().includes(q)
      )
    }

    // Assigned filter
    if (assignedFilter !== 'all') {
      result = result.filter(j => j.assigned_to === assignedFilter)
    }

    // Categorize into swimlanes
    const lanes: Record<SwimlaneKey, VideoJob[]> = {
      editing_full: [],
      editing_recap: [],
      reediting: [],
      on_hold: [],
      completed: [],
    }

    for (const job of result) {
      if (job.section === 'completed') {
        lanes.completed.push(job)
      } else if (job.section === 'reediting') {
        lanes.reediting.push(job)
      } else if (job.section === 'on_hold') {
        lanes.on_hold.push(job)
      } else if (job.job_type === 'RECAP') {
        lanes.editing_recap.push(job)
      } else {
        lanes.editing_full.push(job)
      }
    }

    // Sort each lane by sort_order (fallback to wedding_date)
    for (const key of Object.keys(lanes) as SwimlaneKey[]) {
      lanes[key].sort((a, b) => {
        const aOrder = a.sort_order ?? 9999
        const bOrder = b.sort_order ?? 9999
        if (aOrder !== bOrder) return aOrder - bOrder
        return (a.wedding_date || '9999').localeCompare(b.wedding_date || '9999')
      })
    }

    return lanes
  }, [jobs, search, assignedFilter])

  // ── Stats ──────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalJobs = jobs.length
    const activeJobs = jobs.filter(j => j.section !== 'completed')
    const completedCount = jobs.filter(j => j.section === 'completed').length

    const overdueJobs = activeJobs.filter(j => isOverdue(j))
      .sort((a, b) => (a.order_date || '9999').localeCompare(b.order_date || '9999'))
    const overdueCount = overdueJobs.length
    const mostUrgent = overdueJobs[0] || null

    const inProgressCount = activeJobs.filter(j => j.status === 'in_progress').length
    const onHoldCount = activeJobs.filter(j => j.section === 'on_hold').length
    const editingCount = activeJobs.filter(j => j.section === 'editing').length

    const totalSegmentsDone = activeJobs.reduce((sum, j) => sum + countSegmentsDone(j), 0)
    const totalSegmentsPossible = activeJobs.length * 6

    return {
      totalJobs, completedCount, overdueCount, mostUrgent, inProgressCount,
      onHoldCount, editingCount, totalSegmentsDone, totalSegmentsPossible,
    }
  }, [jobs])

  // ── Unique assignees ───────────────────────────────────────────

  const assignees = useMemo(() => {
    const set = new Set<string>()
    jobs.forEach(j => { if (j.assigned_to) set.add(j.assigned_to) })
    return Array.from(set).sort()
  }, [jobs])

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
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search couples..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 !w-full"
              />
            </div>
            <button
              onClick={() => setAssignedFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                assignedFilter === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted'
              }`}
            >
              All
            </button>
            {assignees.map(name => (
              <button
                key={name}
                onClick={() => setAssignedFilter(name === assignedFilter ? 'all' : name)}
                className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                  assignedFilter === name
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Swimlanes */}
          {SWIMLANES.map(lane => {
            if (lane.key === 'completed' && !showCompleted) return null
            const laneJobs = processedJobs[lane.key]
            const isCollapsed = collapsedLanes.has(lane.key)
            const recap = isRecapLane(lane.key)

            return (
              <div
                key={lane.key}
                className="mb-6"
                ref={lane.key === 'editing_full' ? editingRef : undefined}
              >
                {/* Swimlane header */}
                <div className="flex items-center gap-3 py-3">
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
                      {laneJobs.length} job{laneJobs.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                </div>

                {/* Job table */}
                {!isCollapsed && laneJobs.length > 0 && (
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="w-8 p-2"></th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Couple</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Wedding Date</th>
                          {!recap && SEGMENTS.map(seg => (
                            <th key={seg.field} className="text-center p-2 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell" title={seg.label}>
                              {seg.shortLabel}
                            </th>
                          ))}
                          <th className="text-center p-2 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell" title="Active HD">HD</th>
                          {!recap && (
                            <>
                              <th className="text-center p-2 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell" title="Proxies Run">Prox</th>
                              <th className="text-center p-2 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell" title="Video Form">Form</th>
                            </>
                          )}
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {laneJobs.map(job => (
                          <tr
                            key={job.id}
                            className={`hover:bg-accent/50 transition-colors ${draggedJobId === job.id ? 'opacity-50' : ''}`}
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
                              {job.wedding_date
                                ? format(parseISO(job.wedding_date), 'MMM d, yyyy')
                                : <span className="text-amber-600 text-xs">No date</span>
                              }
                            </td>
                            {!recap && SEGMENTS.map(seg => (
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
                            {!recap && (
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Empty lane */}
                {!isCollapsed && laneJobs.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                    No jobs in this lane
                  </div>
                )}
              </div>
            )
          })}

          {/* Show/Hide Completed toggle */}
          <button
            onClick={() => {
              setShowCompleted(!showCompleted)
              if (!showCompleted) {
                setCollapsedLanes(prev => {
                  const next = new Set(prev)
                  next.delete('completed')
                  return next
                })
              }
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showCompleted ? 'Hide' : 'Show'} Completed ({processedJobs.completed.length})
          </button>
        </div>

        {/* Stats Sidebar */}
        <aside className="w-[280px] shrink-0 p-6 bg-secondary/50 hidden lg:block">
          {/* Total Jobs */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Total Jobs
            </div>
            <div className="text-3xl font-bold">
              {stats.totalJobs}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.totalJobs - stats.completedCount} active
            </div>
          </div>

          {/* Overdue Videos */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Overdue Videos
            </div>
            <div className={`text-3xl font-bold ${stats.overdueCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {stats.overdueCount}
            </div>
            {stats.mostUrgent && (
              <div className="text-xs text-muted-foreground mt-1">
                {stats.mostUrgent.couples?.couple_name} ({getDaysWaiting(stats.mostUrgent.order_date)} days)
              </div>
            )}
          </div>

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

          {/* On Hold */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              On Hold
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
