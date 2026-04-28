'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, Plus, ChevronDown, ChevronRight, X } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { formatDateCompact } from '@/lib/formatters'
import { Playfair_Display, Nunito } from 'next/font/google'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

// ── Types ────────────────────────────────────────────────────────

interface Job {
  id: string
  couple_id: string
  job_type: string
  category: string
  product_code: string | null
  quantity: number | null
  photos_taken: number | null
  edited_so_far: number | null
  total_proofs: number | null
  vendor: string | null
  status: string
  due_date: string | null
  at_lab_date: string | null
  notes: string | null
  completed_date: string | null
  sent_for_review_date: string | null
  approval_round: number | null
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
  best_canvas: 'Best Canvas',
  cci: 'CCI (Custom Colour Imaging)',
  uaf: 'UAF',
}

const VENDOR_COLORS: Record<string, string> = {
  best_canvas: 'bg-amber-100 text-amber-700',
  cci: 'bg-blue-100 text-blue-700',
  uaf: 'bg-purple-100 text-purple-700',
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

const DONE_EDITING_STATUSES = [
  'completed',
  'proofs_delivered',
  'at_lab',
  'at_studio',
  'picked_up',
  'waiting_approval',
]

const LANES = [
  { key: 'not_started', label: 'Ready to Start', badge: 'bg-gray-100 text-gray-700' },
  { key: 'in_progress', label: 'In Progress', badge: 'bg-blue-100 text-blue-700' },
  { key: 'proofs_delivered', label: 'Proofs Out', badge: 'bg-sky-100 text-sky-700' },
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
  proofs_delivered: 'Proofs Out',
  waiting_approval: 'Waiting for Bride',
  reedits: 'Re-edits',
  at_lab: 'At Lab',
  ready_to_order: 'Ready to Order',
  not_started: 'Ready to Start',
}

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Ready to Start' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_approval', label: 'Waiting for Bride' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'at_lab', label: 'At Lab' },
  { value: 'at_studio', label: 'At Studio' },
  { value: 'picked_up', label: 'Picked Up' },
]

const STATUS_DROPDOWN_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-teal-100 text-teal-700',
  waiting_approval: 'bg-yellow-100 text-yellow-700',
  on_hold: 'bg-gray-100 text-gray-700',
  completed: 'bg-blue-100 text-blue-700',
  at_lab: 'bg-yellow-100 text-yellow-700',
  at_studio: 'bg-green-100 text-green-700',
  picked_up: 'bg-blue-100 text-blue-700',
}

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

  // Collapsed lanes
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set(['not_started', 'proofs_delivered', 'waiting_approval', 'ready_to_order', 'at_lab', 'at_studio', 'on_hold']))

  // Stats (fetched separately since main query excludes completed)
  const [completedCount, setCompletedCount] = useState(0)
  const [waitingOrderCouples, setWaitingOrderCouples] = useState<WaitingOrderCouple[]>([])
  const [reeditYtdCount, setReeditYtdCount] = useState(0)
  const [editedSoFar, setEditedSoFar] = useState(0)
  const [totalPhotos, setTotalPhotos] = useState(0)
  const [totalProofsAll, setTotalProofsAll] = useState(0)

  // YTD data (all proofs jobs including completed)
  const [ytdData, setYtdData] = useState<{ photos_taken: number; edited_so_far: number; total_proofs: number; deleted: number; remaining: number }>({ photos_taken: 0, edited_so_far: 0, total_proofs: 0, deleted: 0, remaining: 0 })

  // Save tracking for green flash
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set())

  // Toast
  const [toast, setToast] = useState('')

  // Sidebar popup
  const [popupStatus, setPopupStatus] = useState<string | null>(null)

  // Waiting for Photo Order section
  const [waitingPhotoOrderOpen, setWaitingPhotoOrderOpen] = useState(true)

  // Waiting on Client banner
  const [waitingBannerOpen, setWaitingBannerOpen] = useState(true)

  // Cemetery (completed & picked up)
  const [cemeteryJobs, setCemeteryJobs] = useState<Job[]>([])
  const [cemeteryOpen, setCemeteryOpen] = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────

  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date().toISOString().split('T')[0]

      const [jobsRes, couplesRes, completedRes, waitingRes, reeditRes, photosRes, cemeteryRes] = await Promise.all([
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
        // Completed count (all done-editing statuses)
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .in('status', DONE_EDITING_STATUSES),
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
          .select('job_type, edited_so_far, photos_taken, total_proofs, status'),
        // Cemetery — done editing jobs
        supabase
          .from('jobs')
          .select('*')
          .in('status', DONE_EDITING_STATUSES)
          .order('created_at', { ascending: false }),
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
        // Sidebar progress bar uses ALL jobs
        const edited = photosRes.data.reduce((sum, r: any) => sum + (r.edited_so_far || 0), 0)
        const taken = photosRes.data.reduce((sum, r: any) => sum + (r.photos_taken || 0), 0)
        const proofs = photosRes.data.reduce((sum, r: any) => sum + (r.total_proofs || 0), 0)
        setEditedSoFar(edited)
        setTotalPhotos(taken)
        setTotalProofsAll(proofs)

        // YTD row uses ALL proofs-type jobs regardless of status
        const proofsOnly = photosRes.data.filter((r: any) => r.job_type && r.job_type.toLowerCase().includes('proofs'))
        const ytdEdited = proofsOnly.reduce((sum, r: any) => sum + (r.edited_so_far || 0), 0)
        const ytdTaken = proofsOnly.reduce((sum, r: any) => sum + (r.photos_taken || 0), 0)
        const ytdProofs = proofsOnly.reduce((sum, r: any) => sum + (r.total_proofs || 0), 0)
        // Deleted = unedited photos in completed jobs (culled). Remaining = unedited photos in active jobs (in pipeline).
        const ytdDeleted = proofsOnly.filter((r: any) => r.status === 'completed').reduce((sum, r: any) => sum + ((r.photos_taken || 0) - (r.edited_so_far || 0)), 0)
        const ytdRemaining = proofsOnly.filter((r: any) => r.status !== 'completed').reduce((sum, r: any) => sum + ((r.photos_taken || 0) - (r.edited_so_far || 0)), 0)
        setYtdData({ photos_taken: ytdTaken, edited_so_far: ytdEdited, total_proofs: ytdProofs, deleted: ytdDeleted, remaining: ytdRemaining })
      }

      // Cemetery jobs
      if (!cemeteryRes.error && cemeteryRes.data) {
        const enrichedCemetery = (cemeteryRes.data as any[]).map(j => ({
          ...j,
          couples: coupleMap.get(j.couple_id) || null,
        }))
        enrichedCemetery.sort((a: any, b: any) => {
          const dateA = a.couples?.wedding_date || '0000'
          const dateB = b.couples?.wedding_date || '0000'
          return dateB.localeCompare(dateA)
        })
        setCemeteryJobs(enrichedCemetery as Job[])
      }

      setLoading(false)
    }
    fetchAll()
  }, [])

  // ── Status update ─────────────────────────────────────────────

  const updateStatus = async (jobId: string, newStatus: string) => {
    const job = jobs.find(j => j.id === jobId)
    const updates: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // Auto-set at_lab_date when moving to at_lab
    if (newStatus === 'at_lab') {
      updates.at_lab_date = new Date().toISOString().split('T')[0]
    }

    // Auto-set sent_for_review_date and increment approval_round when moving to waiting_approval
    if (newStatus === 'waiting_approval') {
      updates.sent_for_review_date = new Date().toISOString().split('T')[0]
      updates.approval_round = (job?.approval_round || 0) + 1
    }

    const { error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)

    if (!error) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j))
      const statusLabel = STATUS_OPTIONS.find(s => s.value === newStatus)?.label || newStatus
      setToast(`Status updated to ${statusLabel}`)
      setTimeout(() => setToast(''), 3000)
    } else {
      setToast('Error updating status')
      setTimeout(() => setToast(''), 3000)
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

  // ── Vendor update (At Lab only) ─────────────────────────────

  const updateVendor = async (jobId: string, value: string) => {
    const vendorValue = value === '' ? null : value
    // Optimistic update
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, vendor: vendorValue } : j))

    const { error } = await supabase
      .from('jobs')
      .update({ vendor: vendorValue, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    if (error) {
      setToast('Error updating vendor')
      setTimeout(() => setToast(''), 3000)
      // Revert on error
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, vendor: j.vendor } : j))
    } else {
      const label = vendorValue ? (VENDOR_LABELS[vendorValue.toLowerCase().replace(/-/g, '_')] || vendorValue) : null
      setToast(label ? `Vendor updated to ${label}` : 'Vendor cleared')
      setTimeout(() => setToast(''), 3000)
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

    return result
  }, [jobs, searchTerm, filterCategory, filterVendor])

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
    notStartedCount: jobs.filter(j => j.status === 'not_started').length,
    photosPercent: totalProofsAll > 0 ? Math.round((editedSoFar / totalProofsAll) * 100) : 0,
  }), [jobs, editedSoFar, totalProofsAll])

  // ── Currently Editing data ───────────────────────────────────

  const inProgressJobs = useMemo(() => filteredJobs.filter(j => j.status === 'in_progress'), [filteredJobs])

  const asapTotals = useMemo(() => {
    const pt = inProgressJobs.reduce((s, j) => s + (j.photos_taken || 0), 0)
    const esf = inProgressJobs.reduce((s, j) => s + (j.edited_so_far || 0), 0)
    const tp = inProgressJobs.reduce((s, j) => s + (j.total_proofs || 0), 0)
    const remaining = Math.max(0, tp > 0 ? tp - esf : pt - esf)
    const deleted = tp > 0 ? pt - tp : 0
    return {
      photosTaken: pt, editedSoFar: esf, totalProofs: tp, remaining, deleted,
      pctDeleted: deleted > 0 && pt > 0 ? ((deleted / pt) * 100).toFixed(1) : null,
      pctCompleted: tp > 0 ? ((esf / tp) * 100).toFixed(1) : null,
    }
  }, [inProgressJobs])

  const cemeteryProofsTotals = useMemo(() => {
    const proofs = cemeteryJobs.filter(j => j.job_type.toLowerCase().includes('proofs') && j.status === 'completed')
    const pt = proofs.reduce((s, j) => s + (j.photos_taken || 0), 0)
    const esf = proofs.reduce((s, j) => s + (j.edited_so_far || 0), 0)
    const tp = proofs.reduce((s, j) => s + (j.total_proofs || 0), 0)
    const remaining = 0 // Completed jobs have nothing remaining
    const deleted = pt - esf // Unedited photos in completed jobs are culled
    return {
      photosTaken: pt, editedSoFar: esf, totalProofs: tp, remaining, deleted,
      pctDeleted: deleted > 0 && pt > 0 ? ((deleted / pt) * 100).toFixed(1) : null,
      pctCompleted: pt > 0 ? ((esf / pt) * 100).toFixed(1) : null,
    }
  }, [cemeteryJobs])

  const ytdTotals = useMemo(() => {
    const pt = ytdData.photos_taken
    const esf = ytdData.edited_so_far
    const tp = ytdData.total_proofs
    const deleted = ytdData.deleted
    const remaining = ytdData.remaining
    return {
      photosTaken: pt, editedSoFar: esf, totalProofs: tp, remaining, deleted,
      pctDeleted: deleted > 0 && pt > 0 ? ((deleted / pt) * 100).toFixed(1) : null,
      pctCompleted: pt > 0 ? ((esf / pt) * 100).toFixed(1) : null,
    }
  }, [ytdData])

  // Waiting on Client banner data
  const waitingOnClientData = useMemo(() => {
    const waitingJobs = jobs.filter(j => j.status === 'waiting_approval')
    if (waitingJobs.length === 0) return []
    const grouped = new Map<string, { coupleId: string; coupleName: string; count: number }>()
    waitingJobs.forEach(j => {
      const existing = grouped.get(j.couple_id)
      if (existing) {
        existing.count++
      } else {
        grouped.set(j.couple_id, {
          coupleId: j.couple_id,
          coupleName: j.couples?.couple_name || 'Unknown',
          count: 1,
        })
      }
    })
    return Array.from(grouped.values())
  }, [jobs])

  const getPopupJobs = (key: string): Job[] => {
    switch (key) {
      case 'active': return jobs
      case 'in_progress': return jobs.filter(j => j.status === 'in_progress')
      case 'proofs_delivered': return jobs.filter(j => j.status === 'proofs_delivered')
      case 'waiting_approval': return jobs.filter(j => j.status === 'waiting_approval')
      case 'reedits': return jobs.filter(j => j.status === 'ready_to_reedit' || j.status === 'reediting')
      case 'at_lab': return jobs.filter(j => j.status === 'at_lab')
      case 'ready_to_order': return jobs.filter(j => j.status === 'ready_to_order')
      case 'not_started': return jobs.filter(j => j.status === 'not_started')
      default: return []
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

  // ── Column definitions ─────────────────────────────────────────

  const laneColumns: ColumnDef<Job>[] = useMemo(() => [
    {
      id: 'couple_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      accessorFn: (row) => row.couples?.couple_name || 'Unknown',
      cell: ({ row }) => (
        <div className="min-w-0">
          <a href={`/admin/production/couples/${row.original.couple_id}`} className="text-sm font-medium truncate block text-teal-700 hover:underline">
            {row.original.couples?.couple_name || 'Unknown'}
          </a>
          {row.original.couples?.wedding_date && (
            <div className="text-[11px] text-muted-foreground">
              {formatDateCompact(row.original.couples.wedding_date)}
            </div>
          )}
          {row.original.status === 'at_lab' && row.original.at_lab_date && (
            <div className="text-[11px] text-indigo-600">
              At lab {differenceInDays(new Date(), parseISO(row.original.at_lab_date))} days — since {formatDateCompact(row.original.at_lab_date).replace(/, \d{4}$/, '')}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'product_code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground truncate">
          {row.original.product_code ?? JOB_TYPE_LABELS[row.original.job_type] ?? row.original.job_type}
        </div>
      ),
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Qty" />,
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.original.quantity ?? '—'}
        </div>
      ),
    },
    {
      accessorKey: 'photos_taken',
      header: 'Photos',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.original.photos_taken ?? '—'}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'vendor',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
      cell: ({ row }) => {
        const job = row.original
        if (job.vendor) {
          return (
            <span className={`text-[11px] rounded-full px-2 py-0.5 font-medium ${getVendorInfo(job.vendor).color}`}>
              {getVendorInfo(job.vendor).label}
            </span>
          )
        }
        return <span className="text-xs text-muted-foreground">—</span>
      },
    },
    {
      id: 'status_select',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <select
            value={row.original.status}
            onChange={(e) => updateStatus(row.original.id, e.target.value)}
            className={`text-xs rounded-lg border border-input px-2 py-1.5 outline-none transition-colors focus:border-ring cursor-pointer ${STATUS_DROPDOWN_COLORS[row.original.status] || 'bg-background'}`}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {row.original.status === 'at_lab' && (
            <select
              value={row.original.vendor || ''}
              onChange={(e) => updateVendor(row.original.id, e.target.value)}
              className="text-xs rounded-lg border border-input bg-background px-1.5 py-1.5 outline-none transition-colors focus:border-ring cursor-pointer"
            >
              <option value="">Vendor...</option>
              <option value="best_canvas">Best Canvas</option>
              <option value="cci">CCI</option>
              <option value="uaf">UAF</option>
            </select>
          )}
        </div>
      ),
      enableSorting: false,
    },
  ], [])

  // At Lab columns — same as laneColumns but with editable vendor dropdown + total_proofs for Photos
  const atLabColumns: ColumnDef<Job>[] = useMemo(() => [
    ...laneColumns.filter(col => {
      const id = (col as any).accessorKey || (col as any).id
      return id !== 'vendor' && id !== 'status_select' && id !== 'photos_taken'
    }),
    {
      accessorKey: 'photos_taken',
      header: 'Photos',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {(row.original.total_proofs && row.original.total_proofs > 0) ? row.original.total_proofs : (row.original.photos_taken ?? '—')}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'vendor',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
      cell: ({ row }) => (
        <select
          value={row.original.vendor || ''}
          onChange={(e) => updateVendor(row.original.id, e.target.value)}
          className="text-xs rounded-lg border border-input bg-background px-2 py-1.5 outline-none transition-colors focus:border-ring cursor-pointer"
        >
          <option value="">—</option>
          <option value="best_canvas">Best Canvas</option>
          <option value="cci">CCI</option>
          <option value="uaf">UAF</option>
        </select>
      ),
    },
    {
      id: 'status_select',
      header: 'Status',
      cell: ({ row }) => (
        <select
          value={row.original.status}
          onChange={(e) => updateStatus(row.original.id, e.target.value)}
          className={`text-xs rounded-lg border border-input px-2 py-1.5 outline-none transition-colors focus:border-ring cursor-pointer ${STATUS_DROPDOWN_COLORS[row.original.status] || 'bg-background'}`}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      ),
      enableSorting: false,
    },
  ], [laneColumns])

  const waitingPhotoColumns: ColumnDef<WaitingOrderCouple>[] = useMemo(() => [
    {
      accessorKey: 'couple_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => (
        <a href={`/admin/production/couples/${row.original.id}`}
          className="font-medium text-teal-700 hover:underline text-left text-sm">
          {row.original.couple_name}
        </a>
      ),
    },
    {
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      cell: ({ row }) => row.original.wedding_date
        ? <span className="text-muted-foreground text-sm">{formatDateCompact(row.original.wedding_date)}</span>
        : <span>—</span>,
    },
    {
      id: 'days_since',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Days Since Wedding" />,
      accessorFn: (row) => row.wedding_date ? differenceInDays(new Date(), parseISO(row.wedding_date)) : 0,
      cell: ({ row }) => {
        const daysSince = row.original.wedding_date ? differenceInDays(new Date(), parseISO(row.original.wedding_date)) : 0
        return (
          <span className={`text-sm font-medium ${daysSince > 180 ? 'text-red-600' : daysSince > 90 ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {daysSince} days
          </span>
        )
      },
    },
    {
      id: 'photo_stage',
      header: 'Photo Stage',
      cell: () => <span className="text-xs text-amber-600 font-medium">Awaiting Order</span>,
      enableSorting: false,
    },
  ], [router])

  const completedPhotoColumns: ColumnDef<Job>[] = useMemo(() => [
    {
      id: 'couple_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      accessorFn: (row) => row.couples?.couple_name || 'Unknown',
      cell: ({ row }) => (
        <div>
          <a href={`/admin/production/couples/${row.original.couple_id}`} className="font-medium text-sm text-teal-700 hover:underline">{row.original.couples?.couple_name || 'Unknown'}</a>
          {row.original.couples?.wedding_date && (
            <div className="text-[11px] text-muted-foreground">{formatDateCompact(row.original.couples.wedding_date)}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'product_code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.product_code ?? JOB_TYPE_LABELS[row.original.job_type] ?? row.original.job_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>,
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Qty" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.quantity ?? '—'}</span>,
    },
    {
      accessorKey: 'photos_taken',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Photos Taken" />,
      cell: ({ row }) => {
        const pt = row.original.photos_taken || 0
        return <span className="text-muted-foreground" style={{ textAlign: 'right', display: 'block' }}>{pt > 0 ? pt.toLocaleString() : '—'}</span>
      },
    },
    {
      accessorKey: 'edited_so_far',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Edited So Far" />,
      cell: ({ row }) => {
        const esf = row.original.edited_so_far || 0
        return <span className="text-muted-foreground" style={{ textAlign: 'right', display: 'block' }}>{esf > 0 ? esf.toLocaleString() : '—'}</span>
      },
    },
    {
      accessorKey: 'total_proofs',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Proofs" />,
      cell: ({ row }) => {
        const tp = row.original.total_proofs || 0
        return <span className="text-muted-foreground" style={{ textAlign: 'right', display: 'block' }}>{tp > 0 ? tp.toLocaleString() : '—'}</span>
      },
    },
    {
      id: 'deleted',
      header: 'Deleted',
      accessorFn: (row) => {
        const pt = row.photos_taken || 0; const tp = row.total_proofs || 0
        return tp > 0 && pt > tp ? pt - tp : 0
      },
      cell: ({ row }) => {
        const pt = row.original.photos_taken || 0; const tp = row.original.total_proofs || 0
        const deleted = tp > 0 && pt > tp ? pt - tp : 0
        return <span className="text-muted-foreground" style={{ textAlign: 'right', display: 'block' }}>{deleted > 0 ? deleted.toLocaleString() : '—'}</span>
      },
      enableSorting: false,
    },
    {
      id: 'pct_deleted',
      header: '% Deleted',
      cell: ({ row }) => {
        const pt = row.original.photos_taken || 0; const tp = row.original.total_proofs || 0
        const deleted = tp > 0 && pt > tp ? pt - tp : 0
        const pct = deleted > 0 && pt > 0 ? ((deleted / pt) * 100).toFixed(1) : null
        return <span className="text-muted-foreground" style={{ textAlign: 'right', display: 'block' }}>{pct ? `${pct}%` : '—'}</span>
      },
      enableSorting: false,
    },
    {
      accessorKey: 'vendor',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
      cell: ({ row }) => {
        const vendorInfo = getVendorInfo(row.original.vendor)
        return <span className="text-muted-foreground">{vendorInfo.label}</span>
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground italic">
          {row.original.status === 'picked_up' ? 'Picked Up' : 'Completed'}
        </span>
      ),
    },
    {
      accessorKey: 'completed_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date Completed" />,
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.completed_date ? formatDateCompact(row.original.completed_date) : '—'}</span>,
    },
  ], [])

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
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Photo Production</h1>
          <p className="text-sm text-muted-foreground">{activeCount} active jobs</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/admin/production/editing/new')}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
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

      {/* Waiting on Client Banner */}
      {waitingOnClientData.length > 0 && (
        <div className="px-6 pb-4">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50">
            <button
              onClick={() => setWaitingBannerOpen(!waitingBannerOpen)}
              className="w-full px-4 py-3 flex items-center gap-2 text-left"
            >
              {waitingBannerOpen
                ? <ChevronDown className="h-4 w-4 text-yellow-700 shrink-0" />
                : <ChevronRight className="h-4 w-4 text-yellow-700 shrink-0" />
              }
              <span className="text-sm font-semibold text-yellow-800">
                Waiting on Client ({jobs.filter(j => j.status === 'waiting_approval').length})
              </span>
            </button>
            {waitingBannerOpen && (
              <div className="px-4 pb-3 text-sm text-yellow-700">
                {waitingOnClientData.map((c, i) => (
                  <span key={c.coupleId}>
                    {i > 0 && <span className="mx-1">&middot;</span>}
                    <a href={`/admin/production/couples/${c.coupleId}`} className="font-medium hover:underline">
                      {c.coupleName}
                    </a>
                    <span className="text-yellow-600"> ({c.count} item{c.count !== 1 ? 's' : ''})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content area: jobs panel + stats sidebar */}
      <div className="flex">
        {/* Job List Panel */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:border-r border-border">
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
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none transition-colors focus:border-ring"
                style={{ paddingLeft: '2.25rem' }}
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
                      ? 'bg-primary text-primary-foreground'
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
              className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none transition-colors focus:border-ring"
            >
              <option value="">All Vendors</option>
              {Object.entries(VENDOR_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Currently Editing Section */}
          <div className="rounded-xl border border-border mb-4 bg-muted" style={{ boxShadow: '0 1px 3px rgba(13,79,79,0.06)' }}>
            <button
              onClick={() => toggleLane('in_progress')}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted transition-colors rounded-t-xl"
            >
              <div className="flex items-center gap-3">
                {collapsedLanes.has('in_progress')
                  ? <ChevronRight className="h-4 w-4 text-primary" />
                  : <ChevronDown className="h-4 w-4 text-primary" />
                }
                <span className={`${playfair.className} text-lg text-primary`}>Currently Editing</span>
                <span className="text-xs rounded-full px-2.5 py-0.5 font-semibold bg-[#dbeafe] text-[#1e40af]">
                  {inProgressJobs.length}
                </span>
              </div>
            </button>

            {!collapsedLanes.has('in_progress') && (
              <>
                {/* ── Metric Tiles ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-5 pb-4">
                  <div className="rounded-lg bg-muted border border-border p-3.5">
                    <div className={`${nunito.className} text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`}>Photos Remaining</div>
                    <div className={`${nunito.className} text-2xl font-bold text-primary mt-1`}>{asapTotals.remaining.toLocaleString()}</div>
                    <div className={`${nunito.className} text-[11px] text-muted-foreground mt-0.5`}>{asapTotals.editedSoFar.toLocaleString()} of {(asapTotals.totalProofs || asapTotals.photosTaken).toLocaleString()} edited</div>
                  </div>
                  <div className="rounded-lg bg-muted border border-border p-3.5">
                    <div className={`${nunito.className} text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`}>Awaiting Order</div>
                    <div className={`${nunito.className} text-2xl font-bold mt-1 ${waitingOrderCouples.length > 0 ? 'text-amber-700' : 'text-primary'}`}>{waitingOrderCouples.length}</div>
                    <div className={`${nunito.className} text-[11px] text-muted-foreground mt-0.5`}>Past weddings, no order</div>
                  </div>
                  <div className="rounded-lg bg-muted border border-border p-3.5">
                    <div className={`${nunito.className} text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`}>At Lab</div>
                    <div className={`${nunito.className} text-2xl font-bold mt-1 ${sidebarStats.atLabCount > 0 ? 'text-indigo-700' : 'text-primary'}`}>{sidebarStats.atLabCount}</div>
                    <div className={`${nunito.className} text-[11px] text-muted-foreground mt-0.5`}>Prints & albums in production</div>
                  </div>
                  <div className="rounded-lg bg-muted border border-border p-3.5">
                    <div className={`${nunito.className} text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`}>2026 Progress</div>
                    <div className={`${nunito.className} text-2xl font-bold text-primary mt-1`}>{completedCount}</div>
                    <div className={`${nunito.className} text-[11px] text-muted-foreground mt-0.5`}>Jobs completed YTD</div>
                  </div>
                </div>

                {/* ── Data Table ── */}
                <div className="border-t border-border overflow-x-auto">
                  <table className={`${nunito.className} w-full text-sm min-w-[1100px]`}>
                    <thead>
                      <tr className="border-b border-border bg-primary/5">
                        <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-primary min-w-[180px]">Couple</th>
                        <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-primary min-w-[130px]">Product</th>
                        <th className="text-right px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-primary w-[50px]">Qty</th>
                        <th className="text-right px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-primary w-[90px]">Photos Taken</th>
                        <th className="text-right px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-primary w-[90px]">Edited So Far</th>
                        <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-primary w-[80px]">Remaining</th>
                        <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-primary w-[70px]">Deleted</th>
                        <th className="text-right px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-primary w-[90px]">Total Proofs</th>
                        <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-primary w-[80px]">% Deleted</th>
                        <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-primary w-[90px]">% Completed</th>
                        <th className="text-left px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-primary w-[150px]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inProgressJobs.map(job => {
                        const pt = job.photos_taken || 0
                        const esf = job.edited_so_far || 0
                        const tp = job.total_proofs || 0
                        const isCompleted = DONE_EDITING_STATUSES.includes(job.status)
                        const remaining = isCompleted ? 0 : Math.max(0, tp > 0 ? tp - esf : pt - esf)
                        const deleted = tp > 0 ? pt - tp : 0
                        const pctDeleted = deleted > 0 && pt > 0 ? ((deleted / pt) * 100).toFixed(1) : null
                        const pctCompleted = tp > 0 ? ((esf / tp) * 100).toFixed(1) : null

                        return (
                          <tr key={job.id} className="border-b border-border/60 hover:bg-muted/50 transition-colors">
                            <td className="px-3 py-2.5">
                              <div className={`${nunito.className} font-semibold text-sm text-foreground`}>{job.couples?.couple_name || 'Unknown'}</div>
                              {job.couples?.wedding_date && (
                                <div className="text-[11px] text-muted-foreground">
                                  {formatDateCompact(job.couples.wedding_date)}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {job.product_code ?? JOB_TYPE_LABELS[job.job_type] ?? job.job_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </td>
                            <td className="px-2 py-2.5 text-right text-muted-foreground">{job.quantity ?? '—'}</td>
                            <td className="px-1 py-1 text-right">
                              <input
                                key={`pt_${job.id}_${job.photos_taken}`}
                                type="text"
                                defaultValue={job.photos_taken ?? ''}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value.replace(/,/g, '')) || 0
                                  if (val !== (job.photos_taken || 0)) updateJobField(job.id, 'photos_taken', val)
                                }}
                                className={`w-[80px] text-right text-sm border border-border rounded-md px-2 py-1.5 outline-none transition-all duration-300 focus:border-primary focus:ring-1 focus:ring-primary/20 ${savedFields.has(`${job.id}_photos_taken`) ? 'bg-green-100' : 'bg-background'}`}
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
                                className={`w-[80px] text-right text-sm border border-border rounded-md px-2 py-1.5 outline-none transition-all duration-300 focus:border-primary focus:ring-1 focus:ring-primary/20 ${savedFields.has(`${job.id}_edited_so_far`) ? 'bg-green-100' : 'bg-background'}`}
                              />
                            </td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground">{remaining.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground">{deleted > 0 ? deleted.toLocaleString() : '\u2014'}</td>
                            <td className="px-1 py-1 text-right">
                              <input
                                key={`tp_${job.id}_${job.total_proofs}`}
                                type="text"
                                defaultValue={job.total_proofs ?? ''}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value.replace(/,/g, '')) || 0
                                  if (val !== (job.total_proofs || 0)) updateJobField(job.id, 'total_proofs', val)
                                }}
                                className={`w-[80px] text-right text-sm border border-border rounded-md px-2 py-1.5 outline-none transition-all duration-300 focus:border-primary focus:ring-1 focus:ring-primary/20 ${savedFields.has(`${job.id}_total_proofs`) ? 'bg-green-100' : 'bg-background'}`}
                              />
                            </td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground">{pctDeleted !== null ? `${pctDeleted}%` : '\u2014'}</td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground">{pctCompleted !== null ? `${pctCompleted}%` : '\u2014'}</td>
                            <td className="px-2 py-1">
                              <select
                                value={job.status}
                                onChange={(e) => updateStatus(job.id, e.target.value)}
                                className={`${nunito.className} text-xs rounded-lg border border-border px-2 py-1.5 outline-none transition-colors focus:border-primary cursor-pointer ${STATUS_DROPDOWN_COLORS[job.status] || 'bg-background'}`}
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
                          <td colSpan={12} className="px-4 py-6 text-center text-sm text-muted-foreground">
                            No jobs currently being edited
                          </td>
                        </tr>
                      )}

                      {/* Currently Due ASAP Summary */}
                      <tr className="border-t-2 border-border bg-muted">
                        <td className={`px-3 py-2.5 font-bold text-sm text-foreground ${nunito.className}`}>Currently Due ASAP</td>
                        <td></td>
                        <td></td>
                        <td className="px-3 py-2.5 text-right font-semibold text-sm text-foreground">{asapTotals.photosTaken.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-sm text-foreground">{asapTotals.editedSoFar.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-sm text-foreground">{asapTotals.remaining.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-sm text-foreground">{asapTotals.deleted > 0 ? asapTotals.deleted.toLocaleString() : '\u2014'}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-sm text-foreground">{asapTotals.totalProofs.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-sm text-foreground">{asapTotals.pctDeleted !== null ? `${asapTotals.pctDeleted}%` : '\u2014'}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-sm text-foreground">{asapTotals.pctCompleted !== null ? `${asapTotals.pctCompleted}%` : '\u2014'}</td>
                        <td></td>
                      </tr>

                      {/* Completed in 2026 */}
                      <tr className="border-t border-border bg-muted/60">
                        <td className={`px-3 py-2.5 font-bold text-sm text-muted-foreground ${nunito.className}`}>Completed in 2026</td>
                        <td></td>
                        <td></td>
                        <td className="px-3 py-2.5 text-right font-semibold text-sm text-muted-foreground">{cemeteryProofsTotals.photosTaken.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-sm text-muted-foreground">{cemeteryProofsTotals.editedSoFar.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-sm text-muted-foreground">{cemeteryProofsTotals.remaining.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-sm text-muted-foreground">{cemeteryProofsTotals.deleted > 0 ? cemeteryProofsTotals.deleted.toLocaleString() : '\u2014'}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-sm text-muted-foreground">{cemeteryProofsTotals.totalProofs.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-sm text-muted-foreground">{cemeteryProofsTotals.pctDeleted !== null ? `${cemeteryProofsTotals.pctDeleted}%` : '\u2014'}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-sm text-muted-foreground">{cemeteryProofsTotals.pctCompleted !== null ? `${cemeteryProofsTotals.pctCompleted}%` : '\u2014'}</td>
                        <td></td>
                      </tr>

                      {/* Year to Date Summary — TEAL */}
                      <tr style={{ fontSize: '15px' }} className="bg-primary text-primary-foreground font-bold">
                        <td className={`px-3 py-3 font-bold rounded-bl-xl ${nunito.className}`}>Year to Date</td>
                        <td></td>
                        <td></td>
                        <td className="px-3 py-3 text-right">{ytdTotals.photosTaken.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right">{ytdTotals.editedSoFar.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right">{ytdTotals.remaining.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right">{ytdTotals.deleted > 0 ? ytdTotals.deleted.toLocaleString() : '\u2014'}</td>
                        <td className="px-3 py-3 text-right">{ytdTotals.totalProofs.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right">{ytdTotals.pctDeleted !== null ? `${ytdTotals.pctDeleted}%` : '\u2014'}</td>
                        <td className="px-3 py-3 text-right">{ytdTotals.pctCompleted !== null ? `${ytdTotals.pctCompleted}%` : '\u2014'}</td>
                        <td className="rounded-br-xl"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
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
                      <DataTable columns={lane.key === 'at_lab' ? atLabColumns : laneColumns} data={lane.jobs} showPagination={false} emptyMessage="No jobs" />
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

          {/* ⏸️ WAITING FOR PHOTO ORDER */}
          <div className="mt-6 rounded-xl border border-border bg-card">
            <button
              onClick={() => setWaitingPhotoOrderOpen(!waitingPhotoOrderOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {waitingPhotoOrderOpen
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                }
                <span className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">
                  ⏸️ WAITING FOR PHOTO ORDER
                </span>
                <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-muted text-muted-foreground">
                  {waitingOrderCouples.length}
                </span>
              </div>
            </button>

            {waitingPhotoOrderOpen && (
              <div className="border-t">
                <DataTable columns={waitingPhotoColumns} data={waitingOrderCouples} showPagination={false} emptyMessage="No couples waiting for photo order" />
              </div>
            )}
          </div>

          {/* Completed in 2026 */}
          <div className="mt-6 rounded-xl border border-border bg-card">
            <button
              onClick={() => setCemeteryOpen(!cemeteryOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {cemeteryOpen
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                }
                <span className="font-semibold text-sm text-muted-foreground">Completed in 2026</span>
                <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-muted text-muted-foreground">
                  {cemeteryJobs.length}
                </span>
              </div>
            </button>

            {cemeteryOpen && (
              <div className="border-t">
                <DataTable columns={completedPhotoColumns} data={cemeteryJobs} showPagination={false} emptyMessage="No completed jobs" />
              </div>
            )}
          </div>
        </div>

        {/* Stats Sidebar */}
        <aside className="w-[280px] shrink-0 p-6 bg-secondary/50 hidden lg:block">
          <div className="rounded-xl border bg-card p-4 mb-4 cursor-pointer hover:border-ring transition-colors" onClick={() => setPopupStatus('active')}>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">ACTIVE JOBS</div>
            <div className="text-3xl font-bold">{activeCount}</div>
          </div>

          <div className="rounded-xl border bg-card p-4 mb-4 cursor-pointer hover:border-ring transition-colors" onClick={() => setPopupStatus('waiting_order')}>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">WAITING FOR ORDER</div>
            <div className="text-3xl font-bold" style={{ color: '#0d9488' }}>{waitingOrderCouples.length}</div>
          </div>

          <div className="rounded-xl border bg-card p-4 mb-4 cursor-pointer hover:border-ring transition-colors" onClick={() => setPopupStatus('in_progress')}>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">IN PROGRESS</div>
            <div className="text-3xl font-bold" style={{ color: '#0d9488' }}>{sidebarStats.inProgressCount}</div>
          </div>

          <div className="rounded-xl border bg-card p-4 mb-4 cursor-pointer hover:border-ring transition-colors" onClick={() => setPopupStatus('waiting_approval')}>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">WAITING FOR BRIDE</div>
            <div className="text-3xl font-bold" style={{ color: '#ea580c' }}>{sidebarStats.waitingApprovalCount}</div>
          </div>

          <div className="rounded-xl border bg-card p-4 mb-4 cursor-pointer hover:border-ring transition-colors" onClick={() => setPopupStatus('reedits')}>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">RE-EDITS</div>
            <div className="text-3xl font-bold" style={{ color: '#ea580c' }}>{sidebarStats.reeditCount}</div>
          </div>

          <div className="rounded-xl border bg-card p-4 mb-4 cursor-pointer hover:border-ring transition-colors" onClick={() => setPopupStatus('at_lab')}>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">AT LAB</div>
            <div className="text-3xl font-bold" style={{ color: '#0d9488' }}>{sidebarStats.atLabCount}</div>
          </div>

          <div className="rounded-xl border bg-card p-4 mb-4 cursor-pointer hover:border-ring transition-colors" onClick={() => setPopupStatus('not_started')}>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">READY TO START</div>
            <div className="text-3xl font-bold" style={{ color: '#0d9488' }}>{sidebarStats.notStartedCount}</div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">RE-EDITS YTD</div>
            <div className="text-3xl font-bold">{reeditYtdCount}</div>
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
                        {couple.wedding_date ? formatDateCompact(couple.wedding_date) : 'No date'}
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

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg transition-all ${toast.includes('Error') ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast}
        </div>
      )}
    </div>
  )
}
