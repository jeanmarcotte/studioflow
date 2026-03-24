'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, ChevronDown, ChevronRight, X } from 'lucide-react'
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
  completed_date: string | null
  created_at: string
  updated_at: string
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
  waiting_photo: 'Waiting Photo',
  waiting_on_recap: 'Waiting on Recap',
  waiting_for_bride: 'Waiting for Bride',
  raw_video_output: 'Raw Video Output',
  complete: 'Complete',
  archived: 'Archived',
}

const ALL_STATUSES = ['not_started', 'in_progress', 'waiting_photo', 'waiting_for_bride', 'waiting_on_recap', 'raw_video_output', 'complete', 'archived']

const STATUS_PILL: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  waiting_for_bride: 'bg-amber-100 text-amber-700',
  waiting_on_recap: 'bg-violet-100 text-violet-700',
  not_started: 'bg-gray-100 text-gray-700',
  raw_video_output: 'bg-cyan-100 text-cyan-700',
  waiting_photo: 'bg-slate-100 text-slate-700',
  complete: 'bg-green-100 text-green-700',
  archived: 'bg-stone-100 text-stone-700',
}

type SegmentField = 'ceremony_done' | 'reception_done' | 'park_done' | 'prereception_done' | 'groom_done' | 'bride_done'
type ToggleField = SegmentField | 'proxies_run' | 'video_form'

const SEGMENT_FIELDS: SegmentField[] = ['ceremony_done', 'reception_done', 'park_done', 'prereception_done', 'groom_done', 'bride_done']

// ── Helpers ──────────────────────────────────────────────────────

function formatJobType(type: string): string {
  const map: Record<string, string> = {
    FULL: 'Full wedding video',
    RECAP: 'Recap video',
    ENG_SLIDESHOW: 'Engagement slideshow',
  }
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function countSegmentsDone(job: VideoJob): number {
  return SEGMENT_FIELDS.filter(f => job[f]).length
}

function getDaysWaiting(dateStr: string | null): number {
  if (!dateStr) return 0
  return differenceInDays(new Date(), parseISO(dateStr))
}

// ═════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════

export default function VideoProductionPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<VideoJob[]>([])
  const [awaitingOrderCouples, setAwaitingOrderCouples] = useState<AwaitingOrderCouple[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set(['completed_2026']))

  // ── Fetch ─────────────────────────────────────────────────────

  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date().toISOString().split('T')[0]

      const [videoRes, awaitingRes] = await Promise.all([
        supabase
          .from('video_jobs')
          .select('*, couples(id, couple_name, wedding_date)')
          .order('sort_order', { ascending: true, nullsFirst: false }),
        // Couples shot with video who haven't placed photo order yet
        supabase
          .from('couples')
          .select('id, couple_name, wedding_date, contracts!inner(num_videographers), couple_milestones!inner(m24_photo_order_in)')
          .lt('wedding_date', today)
          .gt('contracts.num_videographers', 0)
          .eq('couple_milestones.m24_photo_order_in', false)
          .order('wedding_date', { ascending: true }),
      ])

      if (!videoRes.error && videoRes.data) setJobs(videoRes.data)
      if (!awaitingRes.error && awaitingRes.data) {
        setAwaitingOrderCouples(awaitingRes.data.map((c: any) => ({
          id: c.id, couple_name: c.couple_name, wedding_date: c.wedding_date,
        })))
      }
      setLoading(false)
    }
    fetchAll()
  }, [])

  // ── Update status via API ─────────────────────────────────────

  const updateJobStatus = useCallback(async (jobId: string, newStatus: string) => {
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
      const { error } = await supabase
        .from('video_jobs')
        .update(updates)
        .eq('id', jobId)
      if (!error) {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j))
      }
    }
  }, [jobs])

  // ── Toggle boolean field ──────────────────────────────────────

  const toggleField = useCallback(async (jobId: string, field: ToggleField, currentValue: boolean) => {
    const newValue = !currentValue
    const { error } = await supabase
      .from('video_jobs')
      .update({ [field]: newValue })
      .eq('id', jobId)

    if (!error) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, [field]: newValue } : j))
    }
  }, [])

  // ── Toggle lane collapse ──────────────────────────────────────

  const toggleLane = (key: string) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── Computed data ─────────────────────────────────────────────

  // Search filter
  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs
    const q = search.toLowerCase()
    return jobs.filter(j =>
      j.couples?.couple_name?.toLowerCase().includes(q) ||
      (STATUS_LABELS[j.status] || j.status)?.toLowerCase().includes(q) ||
      j.assigned_to?.toLowerCase().includes(q) ||
      j.notes?.toLowerCase().includes(q)
    )
  }, [jobs, search])

  // ZONE 1: Currently Editing (in_progress + waiting_for_bride + waiting_on_recap)
  const editingJobs = useMemo(() =>
    filteredJobs.filter(j => ['in_progress', 'waiting_for_bride', 'waiting_on_recap'].includes(j.status))
      .sort((a, b) => {
        const aOrder = a.sort_order ?? 9999
        const bOrder = b.sort_order ?? 9999
        if (aOrder !== bOrder) return aOrder - bOrder
        return (a.couples?.wedding_date || '9999').localeCompare(b.couples?.wedding_date || '9999')
      }),
  [filteredJobs])

  // ZONE 2: Pipeline (not_started, raw_video_output, waiting_photo)
  const pipelineLanes = useMemo(() => {
    const lanes = [
      { key: 'not_started', label: 'Not Started', badge: 'bg-gray-100 text-gray-700', jobs: [] as VideoJob[] },
      { key: 'raw_video_output', label: 'Raw Video Output', badge: 'bg-cyan-100 text-cyan-700', jobs: [] as VideoJob[] },
      { key: 'waiting_photo', label: 'Waiting Photo', badge: 'bg-slate-100 text-slate-700', jobs: [] as VideoJob[] },
    ]

    for (const job of filteredJobs) {
      if (job.status === 'not_started') {
        lanes[0].jobs.push(job)
      } else if (job.status === 'raw_video_output') {
        lanes[1].jobs.push(job)
      } else if (job.status === 'waiting_photo') {
        lanes[2].jobs.push(job)
      }
    }

    // Sort not_started by wedding_date ASC
    lanes[0].jobs.sort((a, b) => (a.couples?.wedding_date || '9999').localeCompare(b.couples?.wedding_date || '9999'))
    // Sort others by sort_order then wedding_date
    for (let i = 1; i < lanes.length; i++) {
      lanes[i].jobs.sort((a, b) => {
        const aOrder = a.sort_order ?? 9999
        const bOrder = b.sort_order ?? 9999
        if (aOrder !== bOrder) return aOrder - bOrder
        return (a.couples?.wedding_date || '9999').localeCompare(b.couples?.wedding_date || '9999')
      })
    }

    return lanes
  }, [filteredJobs])

  // ZONE 3: Completed
  const completedJobs = useMemo(() =>
    filteredJobs
      .filter(j => j.status === 'complete' || j.status === 'archived')
      .sort((a, b) => (b.completed_date || b.updated_at || '').localeCompare(a.completed_date || a.updated_at || '')),
  [filteredJobs])

  // Summary stats
  const stats = useMemo(() => {
    const activeJobs = jobs.filter(j => j.status !== 'complete' && j.status !== 'archived')
    const completedCount = jobs.filter(j => j.status === 'complete' || j.status === 'archived').length

    // Zone 1 summary: segments for editing jobs
    const editingOnly = jobs.filter(j => ['in_progress', 'waiting_for_bride', 'waiting_on_recap'].includes(j.status))
    const totalSegsDone = editingOnly.reduce((s, j) => s + countSegmentsDone(j), 0)
    const totalSegsPossible = editingOnly.length * 6

    // Awaiting order
    const notStartedCount = jobs.filter(j => j.status === 'not_started').length

    // Edited in 2026
    const edited2026 = jobs.filter(j => j.completed_date && j.completed_date >= '2026-01-01')
    const edited2026Full = edited2026.filter(j => j.job_type === 'FULL').length
    const edited2026Recap = edited2026.filter(j => j.job_type === 'RECAP').length
    const edited2026Other = edited2026.length - edited2026Full - edited2026Recap

    // Sidebar stats
    const remaining2025 = activeJobs.filter(j => {
      const wd = j.couples?.wedding_date
      return wd && wd >= '2025-01-01' && wd < '2026-01-01'
    }).length
    const remaining2026 = activeJobs.filter(j => {
      const wd = j.couples?.wedding_date
      return wd && wd >= '2026-01-01'
    }).length

    const recapsPending = activeJobs.filter(j => j.job_type === 'RECAP').length
    const slideshowsPending = activeJobs.filter(j => j.job_type === 'ENG_SLIDESHOW').length
    const inProgressCount = activeJobs.filter(j => j.status === 'in_progress').length

    return {
      totalJobs: jobs.length, activeCount: activeJobs.length, completedCount,
      totalSegsDone, totalSegsPossible,
      notStartedCount,
      edited2026, edited2026Full, edited2026Recap, edited2026Other,
      remaining2025, remaining2026, recapsPending, slideshowsPending, inProgressCount,
    }
  }, [jobs])

  // ── Loading ───────────────────────────────────────────────────

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
          {stats.activeCount} active jobs
        </p>
      </div>

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

          {/* ═══ ZONE 1: Currently Editing ═══ */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                Currently Editing
              </span>
              <span className="text-sm text-muted-foreground">
                {editingJobs.length} job{editingJobs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {editingJobs.length > 0 ? (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1000px]">
                    <thead>
                      <tr className="bg-muted/30 border-b">
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground min-w-[180px]">Couple</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground min-w-[140px]">Type</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-[100px]">Assigned</th>
                        <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground w-[80px]">Segments</th>
                        <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground w-[60px]">Proxies</th>
                        <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground w-[50px]">Form</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-[80px]">Days</th>
                        <th className="text-left px-2 py-2 text-xs font-medium text-muted-foreground w-[170px]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingJobs.map(job => {
                        const segsDone = countSegmentsDone(job)
                        const weddingDate = job.wedding_date || job.couples?.wedding_date || null
                        const daysWaiting = getDaysWaiting(weddingDate)

                        return (
                          <tr key={job.id} className="border-b hover:bg-accent/20 transition-colors">
                            <td className="px-3 py-2">
                              <button
                                onClick={() => job.couple_id && router.push(`/admin/couples/${job.couple_id}`)}
                                className="font-medium text-sm text-blue-600 hover:underline text-left"
                              >
                                {job.couples?.couple_name || 'Unknown'}
                              </button>
                              {weddingDate && (
                                <div className="text-[11px] text-muted-foreground">
                                  {format(parseISO(weddingDate), 'MMM d, yyyy')}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{formatJobType(job.job_type)}</td>
                            <td className="px-3 py-2 text-muted-foreground text-sm">{job.assigned_to || '—'}</td>
                            <td className="px-2 py-2 text-center">
                              <span className={`text-xs font-semibold ${segsDone === 6 ? 'text-green-600' : segsDone > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                                {segsDone}/6
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                onClick={() => toggleField(job.id, 'proxies_run', job.proxies_run)}
                                className="cursor-pointer hover:opacity-70"
                              >
                                {job.proxies_run
                                  ? <span className="text-green-600 font-bold text-xs">✓</span>
                                  : <span className="text-gray-300 text-xs">○</span>
                                }
                              </button>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                onClick={() => toggleField(job.id, 'video_form', job.video_form)}
                                className="cursor-pointer hover:opacity-70"
                              >
                                {job.video_form
                                  ? <span className="text-green-600 font-bold text-xs">✓</span>
                                  : <span className="text-gray-300 text-xs">○</span>
                                }
                              </button>
                            </td>
                            <td className="px-3 py-2 text-right">
                              {weddingDate ? (
                                <span className={`text-xs font-medium ${daysWaiting > 90 ? 'text-red-600 font-bold' : daysWaiting > 60 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                  {daysWaiting}d
                                </span>
                              ) : <span className="text-xs text-gray-300">—</span>}
                            </td>
                            <td className="px-2 py-1">
                              <select
                                value={job.status}
                                onChange={e => updateJobStatus(job.id, e.target.value)}
                                className={`text-xs rounded-full border-0 px-2.5 py-1 font-medium cursor-pointer ${STATUS_PILL[job.status] || 'bg-gray-100 text-gray-700'}`}
                              >
                                {ALL_STATUSES.map(s => (
                                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        )
                      })}

                      {/* ROW 1: In production summary */}
                      <tr className="bg-gray-100 border-t-2 border-gray-300">
                        <td className="px-3 py-2 font-bold text-sm">In production</td>
                        <td></td>
                        <td></td>
                        <td className="px-2 py-2 text-center font-semibold text-sm">
                          {stats.totalSegsDone} / {stats.totalSegsPossible}
                        </td>
                        <td colSpan={4}></td>
                      </tr>

                      {/* ROW 2: Awaiting photo order */}
                      <tr className="bg-amber-50 border-t border-amber-200">
                        <td colSpan={8} className="px-3 py-2 text-sm font-semibold text-amber-800">
                          Awaiting photo order — {awaitingOrderCouples.length} couple{awaitingOrderCouples.length !== 1 ? 's' : ''} shot with video · {stats.notStartedCount} not-started jobs in backlog
                        </td>
                      </tr>

                      {/* ROW 3: Edited in 2026 */}
                      <tr className="bg-red-600 text-white font-bold" style={{ fontSize: '15px' }}>
                        <td className="px-3 py-2.5 font-bold rounded-bl-xl">Edited in 2026</td>
                        <td colSpan={7} className="px-3 py-2.5 rounded-br-xl">
                          <span>{stats.edited2026.length} video{stats.edited2026.length !== 1 ? 's' : ''}</span>
                          <span className="ml-3 text-sm font-normal opacity-80">
                            {stats.edited2026Full > 0 && `${stats.edited2026Full} full`}
                            {stats.edited2026Full > 0 && stats.edited2026Recap > 0 && ' + '}
                            {stats.edited2026Recap > 0 && `${stats.edited2026Recap} recap${stats.edited2026Recap !== 1 ? 's' : ''}`}
                            {stats.edited2026Other > 0 && ` + ${stats.edited2026Other} other`}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                No jobs currently being edited
              </div>
            )}
          </div>

          {/* ═══ ZONE 2: Pipeline Swimlanes ═══ */}
          <div className="space-y-4 mb-8">
            {pipelineLanes.map(lane => {
              const isCollapsed = collapsedLanes.has(lane.key)
              const count = lane.jobs.length

              return (
                <div key={lane.key} className="rounded-xl border bg-card">
                  <button
                    onClick={() => toggleLane(lane.key)}
                    className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed
                        ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                      <span className={`inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-sm font-semibold ${lane.badge}`}>
                        {lane.label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {count} job{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </button>

                  {!isCollapsed && count > 0 && (
                    <div className="border-t overflow-x-auto">
                      <table className="w-full text-sm min-w-[800px]">
                        <thead>
                          <tr className="bg-muted/30 border-b">
                            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground min-w-[180px]">Couple</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground min-w-[140px]">Type</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-[100px]">Assigned</th>
                            <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground w-[60px]">Proxies</th>
                            <th className="text-left px-2 py-2 text-xs font-medium text-muted-foreground w-[170px]">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lane.jobs.map(job => {
                            const weddingDate = job.wedding_date || job.couples?.wedding_date || null

                            return (
                              <tr key={job.id} className="border-b hover:bg-accent/20 transition-colors">
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => job.couple_id && router.push(`/admin/couples/${job.couple_id}`)}
                                    className="font-medium text-sm text-blue-600 hover:underline text-left"
                                  >
                                    {job.couples?.couple_name || 'Unknown'}
                                  </button>
                                  {weddingDate && (
                                    <div className="text-[11px] text-muted-foreground">
                                      {format(parseISO(weddingDate), 'MMM d, yyyy')}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{formatJobType(job.job_type)}</td>
                                <td className="px-3 py-2 text-muted-foreground text-sm">{job.assigned_to || '—'}</td>
                                <td className="px-2 py-2 text-center">
                                  <button
                                    onClick={() => toggleField(job.id, 'proxies_run', job.proxies_run)}
                                    className="cursor-pointer hover:opacity-70"
                                  >
                                    {job.proxies_run
                                      ? <span className="text-green-600 font-bold text-xs">✓</span>
                                      : <span className="text-gray-300 text-xs">○</span>
                                    }
                                  </button>
                                </td>
                                <td className="px-2 py-1">
                                  <select
                                    value={job.status}
                                    onChange={e => updateJobStatus(job.id, e.target.value)}
                                    className={`text-xs rounded-full border-0 px-2.5 py-1 font-medium cursor-pointer ${STATUS_PILL[job.status] || 'bg-gray-100 text-gray-700'}`}
                                  >
                                    {ALL_STATUSES.map(s => (
                                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
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

                  {!isCollapsed && count === 0 && (
                    <div className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
                      No jobs
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ═══ ZONE 3: Completed 2026 ═══ */}
          <div className="rounded-xl border border-gray-200 bg-card">
            <button
              onClick={() => toggleLane('completed_2026')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {collapsedLanes.has('completed_2026')
                  ? <ChevronRight className="h-4 w-4 text-gray-400" />
                  : <ChevronDown className="h-4 w-4 text-gray-400" />
                }
                <span className="font-semibold text-sm text-gray-400">Completed 2026</span>
                <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-gray-100 text-gray-500">
                  {completedJobs.length}
                </span>
              </div>
            </button>

            {!collapsedLanes.has('completed_2026') && completedJobs.length > 0 && (
              <div className="border-t overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Couple</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Type</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Wedding Date</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Completed</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedJobs.map((job, i) => {
                      const weddingDate = job.wedding_date || job.couples?.wedding_date || null

                      return (
                        <tr key={job.id} className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                          <td className="px-3 py-2">
                            <span className="font-medium text-sm text-gray-500">
                              {job.couples?.couple_name || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-400">{formatJobType(job.job_type)}</td>
                          <td className="px-3 py-2 text-gray-400">
                            {weddingDate ? format(parseISO(weddingDate), 'MMM d, yyyy') : '—'}
                          </td>
                          <td className="px-3 py-2 text-gray-400">
                            {job.completed_date ? format(parseISO(job.completed_date), 'MMM d, yyyy') : '—'}
                          </td>
                          <td className="px-3 py-2 text-gray-400">{job.assigned_to || '—'}</td>
                        </tr>
                      )
                    })}
                    {/* Summary row */}
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td className="px-3 py-2 font-bold text-sm text-gray-500">Total</td>
                      <td colSpan={4} className="px-3 py-2 text-sm font-semibold text-gray-500">
                        {completedJobs.length} completed · {stats.edited2026.length} edited in 2026
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {!collapsedLanes.has('completed_2026') && completedJobs.length === 0 && (
              <div className="border-t px-4 py-6 text-center text-sm text-gray-400">
                No completed jobs
              </div>
            )}
          </div>
        </div>

        {/* Stats Sidebar */}
        <aside className="w-[280px] shrink-0 p-6 bg-secondary/50 hidden lg:block">
          {/* Active Jobs */}
          <div className="rounded-xl border bg-card p-4 mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Active Jobs
            </div>
            <div className="text-3xl font-bold">
              {stats.activeCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.completedCount} completed
            </div>
          </div>

          {/* Recaps Pending */}
          {stats.recapsPending > 0 && (
            <div className="rounded-xl border bg-card p-4 mb-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Recaps Pending
              </div>
              <div className="text-3xl font-bold text-violet-600">
                {stats.recapsPending}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Recap videos to edit</div>
            </div>
          )}

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
                style={{ width: `${stats.totalSegsPossible > 0 ? Math.round((stats.totalSegsDone / stats.totalSegsPossible) * 100) : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{stats.totalSegsDone} of {stats.totalSegsPossible}</span>
              <span>{stats.totalSegsPossible > 0 ? Math.round((stats.totalSegsDone / stats.totalSegsPossible) * 100) : 0}%</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
