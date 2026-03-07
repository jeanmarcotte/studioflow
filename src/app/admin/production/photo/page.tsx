'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Search, ChevronDown, ChevronRight, Camera, AlertTriangle,
  Clock, Package, FlaskConical
} from 'lucide-react'
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
  due_date: string | null
  assigned_to: string | null
  lab: string | null
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

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'proofs_sent', label: 'Proofs Sent' },
  { value: 'at_lab', label: 'At Lab' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
]

const FAST_OVERDUE_TYPES = ['WED_PACKAGE', 'WED_PROOFS', 'ENG_PROOFS', 'ENG_COLLAGE']

type SwimlaneKey = 'overdue' | 'editing' | 'due_asap' | 'at_lab' | 'waiting' | 'completed'

const SWIMLANES: { key: SwimlaneKey; label: string; icon: string; badgeClass: string }[] = [
  { key: 'overdue', label: 'OVERDUE', icon: '🔴', badgeClass: 'bg-red-100 text-red-700' },
  { key: 'editing', label: 'EDITING', icon: '📷', badgeClass: 'bg-blue-100 text-blue-700' },
  { key: 'due_asap', label: 'DUE ASAP', icon: '⚡', badgeClass: 'bg-orange-100 text-orange-700' },
  { key: 'at_lab', label: 'AT LAB', icon: '🏭', badgeClass: 'bg-purple-100 text-purple-700' },
  { key: 'waiting', label: 'WAITING ON CLIENT', icon: '⏳', badgeClass: 'bg-yellow-100 text-yellow-700' },
  { key: 'completed', label: 'COMPLETED', icon: '✅', badgeClass: 'bg-green-100 text-green-700' },
]

// ── Helpers ──────────────────────────────────────────────────────

function getDaysWaiting(orderDate: string | null): number {
  if (!orderDate) return 0
  return differenceInDays(new Date(), parseISO(orderDate))
}

function isOverdue(job: PhotoJob): boolean {
  if (!job.order_date || job.section === 'completed') return false
  const days = getDaysWaiting(job.order_date)
  const threshold = FAST_OVERDUE_TYPES.includes(job.job_type) ? 14 : 30
  return days >= threshold
}

function getOverdueThreshold(jobType: string): number {
  return FAST_OVERDUE_TYPES.includes(jobType) ? 14 : 30
}

// ── Status Badge ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-700',
    proofs_sent: 'bg-indigo-100 text-indigo-700',
    at_lab: 'bg-purple-100 text-purple-700',
    delivered: 'bg-teal-100 text-teal-700',
    completed: 'bg-green-100 text-green-700',
  }
  const label = STATUS_OPTIONS.find(s => s.value === status)?.label || status
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
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
    const { error } = await supabase
      .from('photo_jobs')
      .update({ status: newStatus })
      .eq('id', jobId)

    if (!error) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j))
    }
  }

  const updateJobSection = async (jobId: string, newSection: string) => {
    const { error } = await supabase
      .from('photo_jobs')
      .update({ section: newSection })
      .eq('id', jobId)

    if (!error) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, section: newSection } : j))
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
      due_asap: [],
      at_lab: [],
      waiting: [],
      completed: [],
    }

    for (const job of result) {
      if (job.section === 'completed') {
        lanes.completed.push(job)
      } else if (isOverdue(job)) {
        lanes.overdue.push(job)
      } else if (job.section === 'at_lab' || job.section === 'best_pending') {
        lanes.at_lab.push(job)
      } else if (job.section === 'waiting') {
        lanes.waiting.push(job)
      } else if (job.section === 'due_asap') {
        lanes.due_asap.push(job)
      } else {
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

    // Overdue: computed from ALL jobs (not filtered by search/assignee)
    const overdueJobs = activeJobs.filter(j => isOverdue(j))
      .sort((a, b) => (a.order_date || '9999').localeCompare(b.order_date || '9999'))
    const overdueCount = overdueJobs.length
    const mostUrgent = overdueJobs[0] || null

    // Due this week: jobs with due_date within 7 days
    const dueThisWeek = activeJobs.filter(j => {
      if (!j.due_date) return false
      const daysLeft = differenceInDays(parseISO(j.due_date), new Date())
      return daysLeft >= 0 && daysLeft <= 7
    })

    const editedYTD = jobs.reduce((sum, j) => sum + (j.edited_so_far || 0), 0)
    const totalTaken = jobs.reduce((sum, j) => sum + (j.photos_taken || 0), 0)
    const totalSelected = jobs.reduce((sum, j) => sum + (j.photos_selected || 0), 0)
    const totalDeleted = jobs.reduce((sum, j) => sum + (j.deleted || 0), 0)
    const atLabCount = activeJobs.filter(j => j.section === 'at_lab' || j.section === 'best_pending').length

    // Use photos_taken if available, otherwise photos_selected for progress calc
    const totalToEdit = totalTaken > 0 ? totalTaken - totalDeleted : totalSelected
    const remaining = Math.max(0, totalToEdit - editedYTD)
    const editPercent = totalToEdit > 0 ? Math.round((editedYTD / totalToEdit) * 100) : 0
    const deletePercent = totalTaken > 0 ? Math.round((totalDeleted / totalTaken) * 100) : 0

    return {
      totalJobs, overdueCount, mostUrgent, dueThisWeek, editedYTD,
      totalTaken, totalSelected, totalDeleted, atLabCount, remaining,
      editPercent: Math.min(editPercent, 100), deletePercent,
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
          className="bg-destructive text-destructive-foreground px-6 py-3.5 flex items-center justify-between animate-pulse-subtle"
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
            const laneJobs = processedJobs[lane.key]
            const isCollapsed = collapsedLanes.has(lane.key)

            return (
              <div
                key={lane.key}
                className="mb-6"
                ref={lane.key === 'overdue' ? overdueRef : undefined}
              >
                {/* Swimlane header */}
                <button
                  onClick={() => toggleLane(lane.key)}
                  className="flex items-center gap-3 py-3 w-full text-left hover:opacity-80"
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

                {/* Job table */}
                {!isCollapsed && laneJobs.length > 0 && (
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Couple</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Job Type</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                            {lane.key === 'editing' ? 'Progress' : 'Photos'}
                          </th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Order Date</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Waiting</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Assigned</th>
                          <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {laneJobs.map(job => {
                          const daysWaiting = getDaysWaiting(job.order_date)
                          const threshold = getOverdueThreshold(job.job_type)
                          const isJobOverdue = daysWaiting >= threshold
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
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                                  {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                                </span>
                              </td>
                              <td className="p-3 hidden md:table-cell text-muted-foreground">
                                {lane.key === 'editing' && totalToEdit > 0 ? (
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
                              <td className="p-3 hidden md:table-cell text-muted-foreground">
                                {job.assigned_to || <span className="text-red-600 text-xs">Unassigned</span>}
                              </td>
                              <td className="p-3">
                                <select
                                  value={job.status}
                                  onChange={e => updateJobStatus(job.id, e.target.value)}
                                  className="text-xs rounded-md border-border bg-background px-2 py-1 !w-auto"
                                >
                                  {STATUS_OPTIONS.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                  ))}
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
              {stats.totalJobs - (jobs.filter(j => j.section === 'completed').length)} active
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
            {stats.totalTaken > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {stats.editPercent}% of {(stats.totalTaken - stats.totalDeleted).toLocaleString()}
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
