'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
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
  assigned_to: string | null
  status: string
  notes: string | null
  full_video_id: string | null
  created_at: string
  updated_at: string
  couples?: { couple_name: string; id: string }
}

// ── Constants ────────────────────────────────────────────────────

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL: 'Full Video',
  RECAP: 'Recap',
}

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  waiting_photo: 'Waiting on Photo',
  complete: 'Complete',
}

const ALL_STATUSES = ['not_started', 'in_progress', 'waiting_photo', 'complete']

type SwimlaneKey = 'editing' | 'reediting' | 'on_hold' | 'completed'

const LANE_PRIMARY_STATUSES: Record<SwimlaneKey, string[]> = {
  editing: ['not_started', 'in_progress'],
  reediting: ['in_progress'],
  on_hold: ['waiting_photo', 'not_started'],
  completed: ['complete'],
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

const SWIMLANES: { key: SwimlaneKey; label: string; icon: string; badgeClass: string }[] = [
  { key: 'editing', label: 'EDITING', icon: '🎬', badgeClass: 'bg-blue-100 text-blue-700' },
  { key: 'reediting', label: 'REEDITING', icon: '🔄', badgeClass: 'bg-sky-100 text-sky-700' },
  { key: 'on_hold', label: 'ON HOLD', icon: '⏸️', badgeClass: 'bg-slate-100 text-slate-700' },
  { key: 'completed', label: 'COMPLETED', icon: '✅', badgeClass: 'bg-green-100 text-green-700' },
]

// ── Helpers ──────────────────────────────────────────────────────

function getDaysWaiting(weddingDate: string | null): number {
  if (!weddingDate) return 0
  return differenceInDays(new Date(), parseISO(weddingDate))
}

function isOverdue(job: VideoJob): boolean {
  if (!job.wedding_date || job.section === 'completed') return false
  return getDaysWaiting(job.wedding_date) >= 60
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
  const editingRef = useRef<HTMLDivElement>(null)

  // ── Fetch jobs ─────────────────────────────────────────────────

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('video_jobs')
        .select('*, couples(id, couple_name)')
        .order('wedding_date', { ascending: true })

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

  // ── Toggle ceremony/reception done ─────────────────────────────

  const toggleField = async (jobId: string, field: 'ceremony_done' | 'reception_done', currentValue: boolean) => {
    const newValue = !currentValue
    const { error } = await supabase
      .from('video_jobs')
      .update({ [field]: newValue })
      .eq('id', jobId)

    if (!error) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, [field]: newValue } : j))
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
    const lanes: Record<SwimlaneKey, VideoJob[]> = {
      editing: [],
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
      } else {
        lanes.editing.push(job)
      }
    }

    // Sort each lane by wedding_date ASC (longest waiting first)
    for (const key of Object.keys(lanes) as SwimlaneKey[]) {
      lanes[key].sort((a, b) =>
        (a.wedding_date || '9999').localeCompare(b.wedding_date || '9999')
      )
    }

    return lanes
  }, [jobs, search, assignedFilter])

  // ── Stats ──────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalJobs = jobs.length
    const activeJobs = jobs.filter(j => j.section !== 'completed')

    // Overdue: from ALL jobs
    const overdueJobs = activeJobs.filter(j => isOverdue(j))
      .sort((a, b) => (a.wedding_date || '9999').localeCompare(b.wedding_date || '9999'))
    const overdueCount = overdueJobs.length
    const mostUrgent = overdueJobs[0] || null

    const inProgressCount = activeJobs.filter(j => j.status === 'in_progress').length
    const onHoldCount = activeJobs.filter(j => j.section === 'on_hold').length
    const editingCount = activeJobs.filter(j => j.section === 'editing').length

    // Ceremony/reception progress
    const ceremonyDone = jobs.filter(j => j.ceremony_done).length
    const receptionDone = jobs.filter(j => j.reception_done).length

    return {
      totalJobs, overdueCount, mostUrgent, inProgressCount,
      onHoldCount, editingCount, ceremonyDone, receptionDone,
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

  const scrollToEditing = () => {
    setCollapsedLanes(prev => {
      const next = new Set(prev)
      next.delete('editing')
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
                  {getDaysWaiting(stats.mostUrgent.wedding_date)} days
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

            return (
              <div
                key={lane.key}
                className="mb-6"
                ref={lane.key === 'editing' ? editingRef : undefined}
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
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Couple</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Job Type</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Ceremony</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Reception</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Wedding Date</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Waiting</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Assigned</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {laneJobs.map(job => {
                          const daysWaiting = getDaysWaiting(job.wedding_date)
                          const jobOverdue = isOverdue(job)

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
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                                  {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                                </span>
                              </td>
                              <td className="p-3 hidden md:table-cell">
                                <button
                                  onClick={() => toggleField(job.id, 'ceremony_done', job.ceremony_done)}
                                  className={`text-sm cursor-pointer hover:opacity-70 ${job.ceremony_done ? '' : 'opacity-40'}`}
                                  title={job.ceremony_done ? 'Ceremony done' : 'Mark ceremony done'}
                                >
                                  {job.ceremony_done ? '✅' : '⬜'}
                                </button>
                              </td>
                              <td className="p-3 hidden md:table-cell">
                                <button
                                  onClick={() => toggleField(job.id, 'reception_done', job.reception_done)}
                                  className={`text-sm cursor-pointer hover:opacity-70 ${job.reception_done ? '' : 'opacity-40'}`}
                                  title={job.reception_done ? 'Reception done' : 'Mark reception done'}
                                >
                                  {job.reception_done ? '✅' : '⬜'}
                                </button>
                              </td>
                              <td className="p-3 hidden lg:table-cell text-muted-foreground">
                                {job.wedding_date
                                  ? format(parseISO(job.wedding_date), 'MMM d, yyyy')
                                  : <span className="text-amber-600 text-xs">No date</span>
                                }
                              </td>
                              <td className="p-3">
                                {job.wedding_date ? (
                                  <span className={`text-xs font-semibold ${
                                    jobOverdue ? 'text-red-600' : daysWaiting >= 45 ? 'text-orange-600' : 'text-muted-foreground'
                                  }`}>
                                    {daysWaiting} days
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
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
                {stats.mostUrgent.couples?.couple_name} ({getDaysWaiting(stats.mostUrgent.wedding_date)} days)
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

          {/* Ceremony Progress */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-foreground mb-3">
              Ceremony Progress
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${stats.totalJobs > 0 ? Math.round((stats.ceremonyDone / stats.totalJobs) * 100) : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{stats.ceremonyDone} done</span>
              <span>{stats.totalJobs - stats.ceremonyDone} remaining</span>
            </div>
          </div>

          {/* Reception Progress */}
          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs font-semibold text-foreground mb-3">
              Reception Progress
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${stats.totalJobs > 0 ? Math.round((stats.receptionDone / stats.totalJobs) * 100) : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{stats.receptionDone} done</span>
              <span>{stats.totalJobs - stats.receptionDone} remaining</span>
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
