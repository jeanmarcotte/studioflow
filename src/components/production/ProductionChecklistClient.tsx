'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  ChevronDown, ChevronRight, Check, X, RefreshCw,
  Camera, Video, ListChecks, CheckCircle2, CheckSquare, Square,
} from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { Playfair_Display, Nunito } from 'next/font/google'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatDateCompact, formatWeddingDateShort } from '@/lib/formatters'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

type TrackingSource = 'photo_job' | 'video_job' | 'checklist'

interface ChecklistRow {
  couple_id: string
  product_code: string | null
  item_name: string | null
  category: string | null
  source: string | null
  tracking_source: TrackingSource
  quantity: number | null
  job_status: string | null
  is_complete: boolean
  completed_date: string | null
  source_id: string | null
}

interface CoupleRow {
  id: string
  bride_first_name: string | null
  groom_first_name: string | null
  wedding_date: string | null
}

interface ItemRow extends ChecklistRow {
  rowId: string
}

interface ConfirmState {
  coupleId: string
  coupleName: string
  pendingCount: number
}

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  at_lab: 'bg-yellow-100 text-yellow-700',
  at_studio: 'bg-yellow-100 text-yellow-700',
  waiting_approval: 'bg-yellow-100 text-yellow-700',
  waiting_for_bride: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  complete: 'bg-green-100 text-green-700',
  picked_up: 'bg-green-100 text-green-700',
  on_hold: 'bg-red-100 text-red-700',
}

const SOURCE_LABELS: Record<TrackingSource, { label: string; icon: typeof Camera }> = {
  photo_job: { label: 'Photo Jobs', icon: Camera },
  video_job: { label: 'Video Jobs', icon: Video },
  checklist: { label: 'Deliverables', icon: ListChecks },
}

const YEAR_OPTIONS = [2025, 2026, 2027]

export function ProductionChecklistClient() {
  const [year, setYear] = useState<number>(2026)
  const [rows, setRows] = useState<ChecklistRow[]>([])
  const [couples, setCouples] = useState<CoupleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [openCouples, setOpenCouples] = useState<Set<string>>(new Set())
  const [busyItems, setBusyItems] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [batchBusy, setBatchBusy] = useState(false)

  // Filters
  const [coupleFilter, setCoupleFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState<string>('')

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  const fetchData = async () => {
    setLoading(true)
    const [couplesRes, viewRes] = await Promise.all([
      supabase
        .from('couples')
        .select('id, bride_first_name, groom_first_name, wedding_date')
        .gte('wedding_date', yearStart)
        .lte('wedding_date', yearEnd)
        .order('wedding_date', { ascending: true }),
      supabase
        .from('vw_couple_production_checklist')
        .select('couple_id, product_code, item_name, category, source, tracking_source, quantity, job_status, is_complete, completed_date, source_id'),
    ])

    if (couplesRes.error) {
      toast.error(`Failed to load couples: ${couplesRes.error.message}`)
    }
    if (viewRes.error) {
      toast.error(`Failed to load checklist: ${viewRes.error.message}`)
    }

    const couplesData = (couplesRes.data || []) as CoupleRow[]
    const coupleIds = new Set(couplesData.map(c => c.id))
    const allRows = (viewRes.data || []) as ChecklistRow[]
    const filteredRows = allRows.filter(r => coupleIds.has(r.couple_id))

    setCouples(couplesData)
    setRows(filteredRows)
    setOpenCouples(prev => prev.size === 0 ? new Set(couplesData.map(c => c.id)) : prev)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year])

  const handleRefreshAll = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/production/refresh-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Refresh failed')
      toast.success(`Refreshed: ${data.jobs_created} jobs created, ${data.checklist_items_added} items added`)
      await fetchData()
    } catch (err: any) {
      toast.error(`Refresh failed: ${err.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  const setItemBusy = (id: string, busy: boolean) => {
    setBusyItems(prev => {
      const next = new Set(prev)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const markItemComplete = async (item: ItemRow) => {
    if (!item.source_id) return
    setItemBusy(item.source_id, true)
    try {
      const res = await fetch('/api/production/mark-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.source_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      toast.success(`${item.item_name || 'Item'} marked complete`)
      await fetchData()
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`)
    } finally {
      setItemBusy(item.source_id!, false)
    }
  }

  const markItemIncomplete = async (item: ItemRow) => {
    if (!item.source_id) return
    setItemBusy(item.source_id, true)
    try {
      const res = await fetch('/api/production/mark-complete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.source_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      toast.success(`${item.item_name || 'Item'} marked incomplete`)
      await fetchData()
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`)
    } finally {
      setItemBusy(item.source_id!, false)
    }
  }

  const confirmMarkAll = async () => {
    if (!confirm) return
    setBatchBusy(true)
    try {
      const res = await fetch('/api/production/mark-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: confirm.coupleId, mark_all: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      toast.success(`${data.updated} item${data.updated === 1 ? '' : 's'} marked complete`)
      setConfirm(null)
      await fetchData()
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`)
    } finally {
      setBatchBusy(false)
    }
  }

  // Apply filters
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(r => {
      if (coupleFilter !== 'all' && r.couple_id !== coupleFilter) return false
      if (sourceFilter !== 'all' && r.source !== sourceFilter) return false
      if (statusFilter === 'complete' && !r.is_complete) return false
      if (statusFilter === 'pending' && r.is_complete) return false
      if (term) {
        const name = (r.item_name || '').toLowerCase()
        const code = (r.product_code || '').toLowerCase()
        if (!name.includes(term) && !code.includes(term)) return false
      }
      return true
    })
  }, [rows, coupleFilter, sourceFilter, statusFilter, search])

  // Metrics
  const metrics = useMemo(() => {
    const total = filteredRows.length
    const complete = filteredRows.filter(r => r.is_complete).length
    const pending = total - complete
    const pct = total === 0 ? 0 : Math.round((complete / total) * 1000) / 10
    return { total, complete, pending, pct }
  }, [filteredRows])

  // Group rows by couple, then tracking_source
  const couplesWithItems = useMemo(() => {
    const byCouple = new Map<string, ChecklistRow[]>()
    filteredRows.forEach(r => {
      if (!byCouple.has(r.couple_id)) byCouple.set(r.couple_id, [])
      byCouple.get(r.couple_id)!.push(r)
    })

    return couples
      .map(c => {
        const items = byCouple.get(c.id) || []
        const complete = items.filter(i => i.is_complete).length
        const total = items.length
        const sections: Record<TrackingSource, ItemRow[]> = {
          photo_job: [],
          video_job: [],
          checklist: [],
        }
        items.forEach(i => {
          const key: TrackingSource = (i.tracking_source as TrackingSource) || 'checklist'
          sections[key].push({ ...i, rowId: `${i.couple_id}-${i.tracking_source}-${i.source_id}-${i.product_code}` })
        })
        const pendingChecklistCount = sections.checklist.filter(i => !i.is_complete).length
        const allComplete = total > 0 && complete === total
        return { couple: c, items, total, complete, sections, pendingChecklistCount, allComplete }
      })
      .filter(g => g.items.length > 0 || coupleFilter === 'all')
  }, [couples, filteredRows, coupleFilter])

  const toggleCouple = (id: string) => {
    setOpenCouples(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sharedColumns: ColumnDef<ItemRow>[] = useMemo(() => [
    {
      id: 'row_number',
      header: '#',
      cell: ({ row }) => <span className="text-xs text-muted-foreground tabular-nums">{row.index + 1}</span>,
      enableSorting: false,
      size: 40,
    },
    {
      accessorKey: 'item_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.item_name || '—'}</span>,
    },
    {
      accessorKey: 'product_code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => <span className="text-xs text-muted-foreground font-mono">{row.original.product_code || '—'}</span>,
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Qty" />,
      cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.quantity ?? '—'}</span>,
      size: 60,
    },
    {
      accessorKey: 'source',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Source" />,
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.source || '—'}</span>,
      size: 70,
    },
    {
      accessorKey: 'job_status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const s = (row.original.job_status || 'pending').toLowerCase()
        const cls = STATUS_COLORS[s] || STATUS_COLORS.pending
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
            {s.replace(/_/g, ' ')}
          </span>
        )
      },
    },
  ], [])

  const readOnlyColumns: ColumnDef<ItemRow>[] = useMemo(() => [
    ...sharedColumns,
    {
      id: 'is_complete',
      accessorFn: (row) => (row.is_complete ? 1 : 0),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Complete" />,
      cell: ({ row }) => row.original.is_complete
        ? <Check className="h-4 w-4 text-green-600" />
        : <X className="h-4 w-4 text-gray-400" />,
      size: 90,
    },
    {
      accessorKey: 'completed_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Completed" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.completed_date ? formatDateCompact(row.original.completed_date) : '—'}
        </span>
      ),
    },
  ], [sharedColumns])

  const deliverableColumns: ColumnDef<ItemRow>[] = useMemo(() => [
    ...sharedColumns,
    {
      id: 'is_complete',
      accessorFn: (row) => (row.is_complete ? 1 : 0),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Complete" />,
      cell: ({ row }) => {
        const item = row.original
        const busy = item.source_id ? busyItems.has(item.source_id) : false
        const isComplete = item.is_complete
        return (
          <button
            type="button"
            disabled={busy || !item.source_id}
            onClick={() => isComplete ? markItemIncomplete(item) : markItemComplete(item)}
            aria-label={isComplete ? 'Mark incomplete' : 'Mark complete'}
            className="inline-flex items-center justify-center rounded p-1 transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isComplete
              ? <CheckSquare className="h-5 w-5 text-green-600" />
              : <Square className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            }
          </button>
        )
      },
      size: 90,
    },
    {
      accessorKey: 'completed_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Completed" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.completed_date ? formatDateCompact(row.original.completed_date) : '—'}
        </span>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [sharedColumns, busyItems])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className={`space-y-6 max-w-6xl mx-auto ${nunito.className}`}>
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl md:text-2xl font-bold ${playfair.className}`}>Production Checklist</h1>
          <p className="text-sm text-muted-foreground">All deliverables grouped by couple — photo, video, and checklist items</p>
        </div>
        <div className="flex items-center gap-3">
          <YearPills value={year} onChange={setYear} />
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 text-white px-3 py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh All'}
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-4 md:px-6">
        <MetricCard label="Total Items" value={metrics.total} />
        <MetricCard label="Complete" value={metrics.complete} accent="green" />
        <MetricCard label="Pending" value={metrics.pending} accent="yellow" />
        <MetricCard label="% Complete" value={`${metrics.pct.toFixed(1)}%`} accent="teal" />
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 grid grid-cols-1 md:grid-cols-4 gap-2">
        <select
          value={coupleFilter}
          onChange={(e) => setCoupleFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All couples</option>
          {couples.map(c => (
            <option key={c.id} value={c.id}>
              {coupleDisplay(c)}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All sources</option>
          <option value="C1">C1</option>
          <option value="C2">C2</option>
          <option value="C3">C3</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="complete">Complete</option>
          <option value="pending">Pending</option>
        </select>
        <input
          type="search"
          placeholder="Search product or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      {/* Couple accordion */}
      <div className="px-4 md:px-6 pb-12 space-y-3">
        {couplesWithItems.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-12 border rounded-lg">
            No couples or items match the current filters.
          </div>
        )}
        {couplesWithItems.map(group => {
          const isOpen = openCouples.has(group.couple.id)
          const pct = group.total === 0 ? 0 : (group.complete / group.total) * 100
          const showCompleteBadge = group.allComplete
          const showMarkAll = group.pendingChecklistCount > 0

          return (
            <div key={group.couple.id} className="rounded-lg border bg-card">
              {/* Header row — toggle area + action area as siblings (no nested buttons) */}
              <div className="px-4 py-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleCouple(group.couple.id)}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left rounded -mx-1 px-1 py-1 hover:bg-muted/40 transition-colors"
                >
                  {isOpen
                    ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-semibold">{coupleDisplay(group.couple)}</span>
                      <span className="text-xs text-muted-foreground">
                        {group.couple.wedding_date ? formatWeddingDateShort(group.couple.wedding_date) : '—'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      {showCompleteBadge ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          COMPLETE
                        </span>
                      ) : (
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {group.complete}/{group.total} complete
                      </span>
                    </div>
                  </div>
                </button>

                {showMarkAll && (
                  <button
                    type="button"
                    onClick={() => setConfirm({
                      coupleId: group.couple.id,
                      coupleName: coupleDisplay(group.couple),
                      pendingCount: group.pendingChecklistCount,
                    })}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Mark All Complete
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="border-t px-4 py-4 space-y-5">
                  {(['photo_job', 'video_job', 'checklist'] as TrackingSource[]).map(ts => {
                    const items = group.sections[ts]
                    if (items.length === 0) return null
                    const meta = SOURCE_LABELS[ts]
                    const Icon = meta.icon
                    const cols = ts === 'checklist' ? deliverableColumns : readOnlyColumns
                    return (
                      <section key={ts}>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold">{meta.label}</h3>
                          <span className="text-xs text-muted-foreground">({items.length})</span>
                        </div>
                        <DataTable
                          columns={cols}
                          data={items}
                          showPagination={items.length > 25}
                          pageSize={25}
                          emptyMessage="No items"
                        />
                      </section>
                    )
                  })}
                  {group.items.length === 0 && (
                    <div className="text-sm text-muted-foreground py-6 text-center">
                      No checklist items yet for this couple. Click <span className="font-medium">Refresh All</span> above to populate from C1/C2/C3 line items.
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Confirmation dialog for "Mark All Complete" */}
      <AlertDialog
        open={confirm !== null}
        onOpenChange={(o) => { if (!o && !batchBusy) setConfirm(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark all deliverables complete?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm
                ? `Mark all ${confirm.pendingCount} pending deliverable${confirm.pendingCount === 1 ? '' : 's'} for ${confirm.coupleName} as complete? Photo and video job statuses will not be changed.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMarkAll}
              disabled={batchBusy}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {batchBusy ? 'Marking…' : 'Mark Complete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function MetricCard({ label, value, accent }: {
  label: string
  value: string | number
  accent?: 'green' | 'yellow' | 'teal'
}) {
  const accentClass =
    accent === 'green' ? 'text-green-600' :
    accent === 'yellow' ? 'text-yellow-600' :
    accent === 'teal' ? 'text-teal-600' :
    'text-foreground'
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${accentClass}`}>{value}</div>
    </div>
  )
}

function YearPills({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  return (
    <div className="flex gap-1 rounded-full bg-gray-100 p-1">
      {YEAR_OPTIONS.map(y => {
        const active = y === value
        return (
          <button
            key={y}
            onClick={() => onChange(y)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              active ? 'bg-teal-600 text-white' : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            {y}
          </button>
        )
      })}
    </div>
  )
}

function coupleDisplay(c: CoupleRow): string {
  const bride = c.bride_first_name?.trim() || '—'
  const groom = c.groom_first_name?.trim() || '—'
  return `${bride} & ${groom}`
}
