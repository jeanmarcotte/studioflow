'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { differenceInDays, parseISO, format } from 'date-fns'

// ── Types ────────────────────────────────────────────────────────

interface EditingJob {
  id: string
  couple_id: string
  job_type: string
  category: string
  description: string | null
  quantity: number
  vendor: string | null
  status: string
  due_date: string | null
  at_lab_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  couples?: { couple_name: string; wedding_date: string | null } | null
}

interface PhotoWaitingJob {
  id: string
  couple_id: string
  status: string
  section: string
  couples?: { couple_name: string; id: string; wedding_date: string | null } | null
}

// ── Constants ────────────────────────────────────────────────────

const JOB_TYPE_LABELS: Record<string, string> = {
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
  eng_album: 'Engagement Album',
  eng_prints: 'Engagement Prints',
  hires_engagement: 'Hi-Res Engagement',
  eng_slideshow: 'Engagement Slideshow',
}

const VENDOR_LABELS: Record<string, string> = {
  cci: 'CCI',
  uaf: 'UAF',
  best_canvas: 'Best Canvas',
  in_house: 'In-house',
}

const VENDOR_COLORS: Record<string, string> = {
  cci: 'bg-blue-100 text-blue-700',
  uaf: 'bg-purple-100 text-purple-700',
  best_canvas: 'bg-amber-100 text-amber-700',
  in_house: 'bg-green-100 text-green-700',
}

const LANES = [
  { key: 'waiting_photo', label: 'Waiting for Photo Order', badge: 'bg-yellow-100 text-yellow-700' },
  { key: 'not_started', label: 'Ready to Edit', badge: 'bg-gray-100 text-gray-700' },
  { key: 'in_progress', label: 'In Progress', badge: 'bg-blue-100 text-blue-700' },
  { key: 'reediting', label: 'Re-editing', badge: 'bg-rose-100 text-rose-700' },
  { key: 'at_lab', label: 'At Lab', badge: 'bg-indigo-100 text-indigo-700' },
  { key: 'ready_to_order', label: 'Ready to Order', badge: 'bg-cyan-100 text-cyan-700' },
  { key: 'on_hold', label: 'On Hold', badge: 'bg-stone-100 text-stone-700' },
  { key: 'waiting_approval', label: 'Waiting Approval', badge: 'bg-amber-100 text-amber-700' },
  { key: 'ready_to_reedit', label: 'Ready to Re-edit', badge: 'bg-orange-100 text-orange-700' },
  { key: 'completed', label: 'Completed', badge: 'bg-green-100 text-green-700' },
] as const

const STATUS_OPTIONS = LANES.map(l => ({ value: l.key, label: l.label }))

type SortField = 'couple' | 'job_type' | 'vendor' | 'created_at'
type SortDir = 'asc' | 'desc'

// ══════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════

export default function PhotoProductionPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<EditingJob[]>([])
  const [photoWaitingJobs, setPhotoWaitingJobs] = useState<PhotoWaitingJob[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<'all' | 'wedding' | 'engagement'>('all')
  const [filterVendor, setFilterVendor] = useState('')

  // Sort
  const [sortField, setSortField] = useState<SortField>('couple')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Collapsed lanes
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set(['completed']))

  // Show completed
  const [showCompleted, setShowCompleted] = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────

  useEffect(() => {
    const fetchJobs = async () => {
      const [editingRes, photoRes] = await Promise.all([
        supabase
          .from('editing_jobs')
          .select('*, couples(couple_name, wedding_date)')
          .order('created_at', { ascending: false }),
        supabase
          .from('photo_jobs')
          .select('id, couple_id, status, section, couples(id, couple_name, wedding_date)')
          .eq('section', 'waiting_photo'),
      ])

      if (!editingRes.error && editingRes.data) {
        setJobs(editingRes.data as unknown as EditingJob[])
      }
      if (!photoRes.error && photoRes.data) {
        setPhotoWaitingJobs(photoRes.data as unknown as PhotoWaitingJob[])
      }
      setLoading(false)
    }
    fetchJobs()
  }, [])

  // ── Move photo_job from waiting_photo to not_started ──────────

  const initiatePhotoJob = async (jobId: string) => {
    const { error } = await supabase
      .from('photo_jobs')
      .update({ section: 'editing', status: 'not_started' })
      .eq('id', jobId)

    if (!error) {
      setPhotoWaitingJobs(prev => prev.filter(j => j.id !== jobId))
    }
  }

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
      .from('editing_jobs')
      .update(updates)
      .eq('id', jobId)

    if (!error) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j))
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
        (j.description || '').toLowerCase().includes(term)
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

  const activeCount = jobs.filter(j => j.status !== 'completed' && j.status !== 'not_started').length

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Photo Production</h1>
          <p className="text-sm text-muted-foreground">{activeCount} active jobs</p>
        </div>
        <button
          onClick={() => router.push('/admin/production/editing/new')}
          className="flex items-center gap-2 rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Job
        </button>
      </div>

      {/* Status badges row */}
      <div className="flex flex-wrap gap-2">
        {laneData.filter(l => l.key !== 'completed').map(lane => (
          <span key={lane.key} className={`text-xs rounded-full px-2.5 py-1 font-medium ${lane.badge}`}>
            {lane.label}: {lane.key === 'waiting_photo' ? photoWaitingJobs.length : lane.jobs.length}
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
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

      {/* Lanes */}
      <div className="space-y-4">
        {laneData.map(lane => {
          const isWaitingPhoto = lane.key === 'waiting_photo'
          const laneCount = isWaitingPhoto ? photoWaitingJobs.length : lane.jobs.length

          if (lane.key === 'completed' && !showCompleted) return null
          if (laneCount === 0 && !isWaitingPhoto && lane.key !== 'in_progress' && lane.key !== 'on_hold') return null

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

              {/* Waiting for Photo Order — from photo_jobs */}
              {isWaitingPhoto && !isCollapsed && photoWaitingJobs.length > 0 && (
                <div className="border-t">
                  <div className="grid grid-cols-[1.2fr_160px_1fr_150px] gap-4 px-4 py-2 border-b bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground">Couple</span>
                    <span className="text-xs font-medium text-muted-foreground">Wedding Date</span>
                    <span className="text-xs font-medium text-muted-foreground">Photo Status</span>
                    <span className="text-xs font-medium text-muted-foreground">Action</span>
                  </div>
                  {photoWaitingJobs.map(job => (
                    <div key={job.id} className="grid grid-cols-[1.2fr_160px_1fr_150px] gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-accent/30 transition-colors items-center">
                      <div className="text-sm font-medium truncate">
                        <button
                          onClick={() => job.couple_id && router.push(`/admin/couples/${job.couple_id}`)}
                          className="text-blue-600 hover:underline text-left"
                        >
                          {job.couples?.couple_name || 'Unknown'}
                        </button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {job.couples?.wedding_date
                          ? format(parseISO(job.couples.wedding_date), 'MMM d, yyyy')
                          : <span className="text-amber-600 text-xs">No date</span>
                        }
                      </div>
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                          Waiting for Photo Order
                        </span>
                      </div>
                      <div>
                        <button
                          onClick={() => initiatePhotoJob(job.id)}
                          className="text-xs rounded-lg bg-stone-800 text-white px-3 py-1.5 hover:bg-stone-700 transition-colors font-medium"
                        >
                          Move to Ready to Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Regular lane body */}
              {!isWaitingPhoto && !isCollapsed && lane.jobs.length > 0 && (
                <div className="border-t">
                  {/* Column headers */}
                  <div className="grid grid-cols-[1.2fr_160px_1fr_110px_150px] gap-4 px-4 py-2 border-b bg-muted/30">
                    <SortHeader field="couple">Couple</SortHeader>
                    <SortHeader field="job_type">Job Type</SortHeader>
                    <span className="text-xs font-medium text-muted-foreground">Description</span>
                    <SortHeader field="vendor">Vendor</SortHeader>
                    <span className="text-xs font-medium text-muted-foreground">Status</span>
                  </div>

                  {/* Jobs */}
                  {lane.jobs.map(job => (
                    <div
                      key={job.id}
                      className="grid grid-cols-[1.2fr_160px_1fr_110px_150px] gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-accent/30 transition-colors items-center"
                    >
                      {/* Couple */}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {job.couples?.couple_name || 'Unknown'}
                        </div>
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

                      {/* Description */}
                      <div className="text-sm text-muted-foreground truncate">
                        {job.description || '—'}
                      </div>

                      {/* Vendor */}
                      <div>
                        {job.vendor ? (
                          <span className={`text-[11px] rounded-full px-2 py-0.5 font-medium ${VENDOR_COLORS[job.vendor] || 'bg-gray-100 text-gray-700'}`}>
                            {VENDOR_LABELS[job.vendor] || job.vendor}
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

      {/* Show/hide completed */}
      <div className="text-center">
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
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showCompleted ? 'Hide Completed' : `Show Completed (${laneData.find(l => l.key === 'completed')?.jobs.length || 0})`}
        </button>
      </div>
    </div>
  )
}
