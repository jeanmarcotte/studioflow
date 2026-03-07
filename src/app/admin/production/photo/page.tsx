'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'

// ── Types ────────────────────────────────────────────────────────

interface PhotoJob {
  id: string
  couple_id: string
  job_type: string
  section: string
  photos_taken: number
  photos_selected: number
  edited_so_far: number
  deleted: number
  order_date: string | null
  ordered_date: string | null
  due_date: string | null
  assigned_to: string | null
  lab: string | null
  lab_received_date: string | null
  hold_reason: string | null
  pickup_date: string | null
  status: string
  notes: string | null
  brand: string | null
  couples?: { couple_name: string; id: string }
}

// ── Constants ────────────────────────────────────────────────────

const JOB_TYPE_LABELS: Record<string, string> = {
  WED_PACKAGE: 'Wedding Package',
  WED_PROOFS: 'Wedding Proofs',
  WED_ALBUM: 'Wedding Album',
  ENG_PROOFS: 'Engagement Proofs',
  ENG_COLLAGE: 'Engagement Collage',
  PARENT_BOOK: 'Parent Book',
  PORTRAITS: 'Portraits',
  USB: 'USB / Digital',
  PRINTS: 'Prints',
  BEST_PRINT: 'BEST Lab Print',
  CUSTOM_ITEM: 'Custom Item',
  UAF: 'UAF Item',
}

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  waiting_for_bride: 'Waiting for Bride',
  ready_to_reedit: 'Ready to Re-edit',
  on_hold: 'On Hold',
  waiting_for_batch: 'Waiting for Batch',
  at_lab: 'At Lab',
  at_studio: 'At Studio',
  picked_up: 'Picked Up',
  completed: 'Completed',
}

const ALL_STATUSES = [
  'not_started', 'in_progress', 'waiting_for_bride', 'ready_to_reedit',
  'on_hold', 'waiting_for_batch', 'at_lab', 'at_studio', 'picked_up', 'completed',
]

const LANE_PRIMARY_STATUSES: Record<SwimlaneKey, string[]> = {
  overdue: ['not_started', 'in_progress'],
  editing: ['not_started', 'in_progress'],
  reediting: ['waiting_for_bride', 'ready_to_reedit'],
  on_hold: ['on_hold'],
  ready_to_order: ['not_started'],
  best_canvas_batch: ['waiting_for_batch'],
  at_lab: ['at_lab'],
  at_studio: ['at_studio', 'picked_up'],
  completed: ['completed'],
}

function getLaneStatusOptions(laneKey: SwimlaneKey): { value: string; label: string; divider?: boolean }[] {
  const primary = LANE_PRIMARY_STATUSES[laneKey]
  const rest = ALL_STATUSES.filter(s => !primary.includes(s))
  const options: { value: string; label: string; divider?: boolean }[] = [
    ...primary.map(v => ({ value: v, label: STATUS_LABELS[v] || v })),
    { value: '_divider', label: '────────────', divider: true },
    ...rest.map(v => ({ value: v, label: STATUS_LABELS[v] || v })),
  ]
  return options
}

const FAST_OVERDUE_TYPES = ['WED_PACKAGE', 'WED_PROOFS', 'ENG_PROOFS', 'ENG_COLLAGE']

// Sections that should NOT trigger overdue (they're past editing phase)
const NON_OVERDUE_SECTIONS = ['at_lab', 'best_pending', 'best_canvas_batch', 'at_studio', 'on_hold', 'completed']

type SwimlaneKey = 'overdue' | 'editing' | 'reediting' | 'on_hold' | 'ready_to_order' | 'best_canvas_batch' | 'at_lab' | 'at_studio' | 'completed'

const SWIMLANES: { key: SwimlaneKey; label: string; icon: string; badgeClass: string }[] = [
  { key: 'overdue', label: 'OVERDUE', icon: '🔴', badgeClass: 'bg-red-100 text-red-700' },
  { key: 'editing', label: 'EDITING', icon: '📷', badgeClass: 'bg-blue-100 text-blue-700' },
  { key: 'reediting', label: 'REEDITING', icon: '🔄', badgeClass: 'bg-sky-100 text-sky-700' },
  { key: 'on_hold', label: 'ON HOLD', icon: '⏸️', badgeClass: 'bg-slate-100 text-slate-700' },
  { key: 'ready_to_order', label: 'READY TO ORDER', icon: '📦', badgeClass: 'bg-amber-100 text-amber-700' },
  { key: 'best_canvas_batch', label: 'BEST CANVAS BATCH', icon: '🖼️', badgeClass: 'bg-orange-100 text-orange-700' },
  { key: 'at_lab', label: 'AT LAB', icon: '🏭', badgeClass: 'bg-purple-100 text-purple-700' },
  { key: 'at_studio', label: 'AT STUDIO', icon: '🏠', badgeClass: 'bg-teal-100 text-teal-700' },
  { key: 'completed', label: 'COMPLETED', icon: '✅', badgeClass: 'bg-green-100 text-green-700' },
]

// ── Helpers ──────────────────────────────────────────────────────

function getDaysWaiting(orderDate: string | null): number {
  if (!orderDate) return 0
  return differenceInDays(new Date(), parseISO(orderDate))
}

function isOverdue(job: PhotoJob): boolean {
  if (!job.order_date || NON_OVERDUE_SECTIONS.includes(job.section)) return false
  const days = getDaysWaiting(job.order_date)
  const threshold = FAST_OVERDUE_TYPES.includes(job.job_type) ? 14 : 30
  return days >= threshold
}

function getOverdueThreshold(jobType: string): number {
  return FAST_OVERDUE_TYPES.includes(jobType) ? 14 : 30
}

// ═════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════

export default function PhotoProductionPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<PhotoJob[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [assignedFilter, setAssignedFilter] = useState<string>('all')
  const [showCompleted, setShowCompleted] = useState(false)
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set(['completed']))
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingDueDate, setEditingDueDate] = useState<string | null>(null)
  const [hidePickedUp, setHidePickedUp] = useState(false)
  const overdueRef = useRef<HTMLDivElement>(null)

  // ── Fetch jobs ─────────────────────────────────────────────────

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('photo_jobs')
        .select('*, couples(id, couple_name)')
        .order('order_date', { ascending: true })

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
    // When marking completed, also set section
    if (newStatus === 'completed') updates.section = 'completed'

    const { error } = await supabase
      .from('photo_jobs')
      .update(updates)
      .eq('id', jobId)

    if (!error) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j))
    }
  }

  // ── Update due_date inline ──────────────────────────────────────

  const updateJobDueDate = async (jobId: string, newDate: string | null) => {
    setEditingDueDate(null)
    const dueDate = newDate || null
    const { error } = await supabase
      .from('photo_jobs')
      .update({ due_date: dueDate })
      .eq('id', jobId)

    if (!error) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, due_date: dueDate } : j))
    }
  }

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
    const lanes: Record<SwimlaneKey, PhotoJob[]> = {
      overdue: [],
      editing: [],
      reediting: [],
      on_hold: [],
      ready_to_order: [],
      best_canvas_batch: [],
      at_lab: [],
      at_studio: [],
      completed: [],
    }

    for (const job of result) {
      if (job.section === 'completed') {
        lanes.completed.push(job)
      } else if (isOverdue(job)) {
        lanes.overdue.push(job)
      } else if (job.section === 'reediting') {
        lanes.reediting.push(job)
      } else if (job.section === 'on_hold') {
        lanes.on_hold.push(job)
      } else if (job.section === 'ready_to_order') {
        lanes.ready_to_order.push(job)
      } else if (job.section === 'best_canvas_batch') {
        lanes.best_canvas_batch.push(job)
      } else if (job.section === 'at_lab' || job.section === 'best_pending') {
        lanes.at_lab.push(job)
      } else if (job.section === 'at_studio') {
        lanes.at_studio.push(job)
      } else {
        // editing, due_asap, waiting, or any other section → editing lane
        lanes.editing.push(job)
      }
    }

    // Sort each lane by order_date ASC (longest waiting first)
    for (const key of Object.keys(lanes) as SwimlaneKey[]) {
      lanes[key].sort((a, b) =>
        (a.order_date || '9999').localeCompare(b.order_date || '9999')
      )
    }

    return lanes
  }, [jobs, search, assignedFilter])

  // ── Stats ──────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalJobs = jobs.length
    const activeJobs = jobs.filter(j => j.section !== 'completed')

    // Overdue: from ALL jobs (not filtered by search/assignee)
    const overdueJobs = activeJobs.filter(j => isOverdue(j))
      .sort((a, b) => (a.order_date || '9999').localeCompare(b.order_date || '9999'))
    const overdueCount = overdueJobs.length
    const mostUrgent = overdueJobs[0] || null

    // Due this week: due_date within 7 days AND not completed
    const dueThisWeek = activeJobs.filter(j => {
      if (!j.due_date || j.status === 'completed') return false
      const daysLeft = differenceInDays(parseISO(j.due_date), new Date())
      return daysLeft >= 0 && daysLeft <= 7
    })

    const editedYTD = jobs.reduce((sum, j) => sum + (j.edited_so_far || 0), 0)
    const totalTaken = jobs.reduce((sum, j) => sum + (j.photos_taken || 0), 0)
    const totalSelected = jobs.reduce((sum, j) => sum + (j.photos_selected || 0), 0)
    const totalDeleted = jobs.reduce((sum, j) => sum + (j.deleted || 0), 0)
    const atLabCount = activeJobs.filter(j =>
      j.section === 'at_lab' || j.section === 'best_pending' || j.section === 'best_canvas_batch'
    ).length
    const atStudioCount = activeJobs.filter(j => j.section === 'at_studio').length

    const totalToEdit = totalTaken > 0 ? totalTaken - totalDeleted : totalSelected
    const remaining = Math.max(0, totalToEdit - editedYTD)
    const editPercent = totalToEdit > 0 ? Math.round((editedYTD / totalToEdit) * 100) : 0
    const deletePercent = totalTaken > 0 ? Math.round((totalDeleted / totalTaken) * 100) : 0

    return {
      totalJobs, overdueCount, mostUrgent, dueThisWeek, editedYTD,
      totalTaken, totalSelected, totalDeleted, atLabCount, atStudioCount,
      remaining, editPercent: Math.min(editPercent, 100), deletePercent,
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

  // ── Scroll to overdue ──────────────────────────────────────────

  const scrollToOverdue = () => {
    setCollapsedLanes(prev => {
      const next = new Set(prev)
      next.delete('overdue')
      return next
    })
    overdueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Loading ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Photo Production</h1>
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
              <strong>{stats.overdueCount} JOB{stats.overdueCount > 1 ? 'S' : ''} OVERDUE</strong>
              {stats.mostUrgent && (
                <span>
                  {' — '}
                  {stats.mostUrgent.couples?.couple_name} {JOB_TYPE_LABELS[stats.mostUrgent.job_type] || stats.mostUrgent.job_type}
                  {' waiting '}
                  {getDaysWaiting(stats.mostUrgent.order_date)} days
                  {' ('}
                  {getOverdueThreshold(stats.mostUrgent.job_type)}-day limit)
                </span>
              )}
            </span>
          </div>
          <button
            onClick={scrollToOverdue}
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
            const allLaneJobs = processedJobs[lane.key]
            const laneJobs = lane.key === 'at_studio' && hidePickedUp
              ? allLaneJobs.filter(j => j.status !== 'picked_up')
              : allLaneJobs
            const isCollapsed = collapsedLanes.has(lane.key)

            return (
              <div
                key={lane.key}
                className="mb-6"
                ref={lane.key === 'overdue' ? overdueRef : undefined}
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
                      {allLaneJobs.length} job{allLaneJobs.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                  {lane.key === 'at_studio' && (
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hidePickedUp}
                        onChange={e => setHidePickedUp(e.target.checked)}
                        className="rounded border-border"
                      />
                      Hide Picked Up
                    </label>
                  )}
                </div>

                {/* Job table */}
                {!isCollapsed && laneJobs.length > 0 && (
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Couple</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Job Type</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                            {lane.key === 'editing' || lane.key === 'reediting' ? 'Progress' : 'Photos'}
                          </th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Order Date</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Waiting</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Due Date</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Assigned</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {laneJobs.map(job => {
                          const daysWaiting = getDaysWaiting(job.order_date)
                          const threshold = getOverdueThreshold(job.job_type)
                          const isJobOverdue = daysWaiting >= threshold && !NON_OVERDUE_SECTIONS.includes(job.section)
                          const isWarning = !isJobOverdue && daysWaiting >= threshold - 7
                          const photoCount = job.photos_taken || job.photos_selected || 0
                          const totalToEdit = photoCount - (job.deleted || 0)
                          const progressPct = totalToEdit > 0 ? Math.round((job.edited_so_far / totalToEdit) * 100) : 0

                          return (
                            <tr key={job.id} className="hover:bg-accent/50 transition-colors">
                              <td className="p-3">
                                <button
                                  onClick={() => job.couple_id && router.push(`/admin/couples/${job.couple_id}`)}
                                  className="font-medium text-blue-600 hover:underline text-left"
                                >
                                  {job.couples?.couple_name || 'Unknown'}
                                </button>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                                    {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                                  </span>
                                  {/* BEST CANVAS badge for best_canvas_batch lane */}
                                  {lane.key === 'best_canvas_batch' && (
                                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                      BEST CANVAS
                                    </span>
                                  )}
                                  {/* Hold reason badge for on_hold lane */}
                                  {lane.key === 'on_hold' && job.hold_reason && (
                                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700">
                                      {job.hold_reason}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 hidden md:table-cell text-muted-foreground">
                                {(lane.key === 'editing' || lane.key === 'reediting') && totalToEdit > 0 ? (
                                  <span>{job.edited_so_far} / {totalToEdit} ({progressPct}%)</span>
                                ) : (
                                  <span>{photoCount}</span>
                                )}
                              </td>
                              <td className="p-3 hidden lg:table-cell text-muted-foreground">
                                {job.order_date
                                  ? format(parseISO(job.order_date), 'MMM d')
                                  : <span className="text-amber-600 text-xs">No date</span>
                                }
                              </td>
                              <td className="p-3">
                                {job.order_date ? (
                                  <span className={`text-xs font-semibold ${
                                    isJobOverdue ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-muted-foreground'
                                  }`}>
                                    {daysWaiting} days
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="p-3 hidden md:table-cell">
                                {editingDueDate === job.id ? (
                                  <input
                                    type="date"
                                    autoFocus
                                    defaultValue={job.due_date || ''}
                                    onBlur={e => updateJobDueDate(job.id, e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') updateJobDueDate(job.id, (e.target as HTMLInputElement).value)
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
                              <td className="p-3 hidden md:table-cell text-muted-foreground">
                                {job.assigned_to || <span className="text-red-600 text-xs">Unassigned</span>}
                              </td>
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
                          )
                        })}
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
              {stats.totalJobs - jobs.filter(j => j.section === 'completed').length} active
            </div>
          </div>

          {/* Overdue Jobs */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Overdue Jobs
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

          {/* Due This Week */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Due This Week
            </div>
            <div className="text-3xl font-bold">
              {stats.dueThisWeek.length}
            </div>
            {stats.dueThisWeek.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {stats.dueThisWeek.slice(0, 2).map(j => j.couples?.couple_name).join(', ')}
              </div>
            )}
          </div>

          {/* Edited YTD */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Total Edited YTD
            </div>
            <div className="text-3xl font-bold text-green-600">
              {stats.editedYTD.toLocaleString()}
            </div>
            {(stats.totalTaken > 0 || stats.totalSelected > 0) && (
              <div className="text-xs text-muted-foreground mt-1">
                {stats.editPercent}% of {(stats.totalTaken > 0 ? stats.totalTaken - stats.totalDeleted : stats.totalSelected).toLocaleString()}
              </div>
            )}
          </div>

          {/* At Lab */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              At Lab
            </div>
            <div className="text-3xl font-bold">
              {stats.atLabCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">BEST / Custom / UAF</div>
          </div>

          {/* At Studio */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              At Studio
            </div>
            <div className="text-3xl font-bold">
              {stats.atStudioCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Ready for pickup</div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border my-6" />

          {/* Edit Progress Mini Chart */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-foreground mb-3">
              Edit Progress (YTD)
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${stats.editPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{stats.editedYTD.toLocaleString()} edited</span>
              <span>{stats.remaining.toLocaleString()} remaining</span>
            </div>
          </div>

          {/* Deletion Rate Mini Chart */}
          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs font-semibold text-foreground mb-3">
              Deletion Rate
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${stats.deletePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{stats.deletePercent}% avg</span>
              <span>{stats.totalDeleted.toLocaleString()} deleted</span>
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
