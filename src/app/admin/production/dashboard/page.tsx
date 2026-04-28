'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronRight, Camera, Video, Package, Clock, ArrowRight } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { formatDateCompact } from '@/lib/formatters'
import { Playfair_Display, Nunito } from 'next/font/google'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import Link from 'next/link'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

// ── Types ────────────────────────────────────────────────────────

interface OrderRow {
  id: string
  couple_id: string
  product_code: string | null
  status: string
  vendor: string | null
  created_at: string
  sent_for_review_date: string | null
  approval_round: number | null
  reedit_count: number | null
  couple_name: string
  wedding_date: string | null
  item_name: string | null
}

interface WaitingItem {
  coupleId: string
  coupleName: string
  items: { productName: string; daysSince: number }[]
}

// ── Constants ────────────────────────────────────────────────────

const EXCLUDED_ORDER_CODES = [
  'PROD-ENG-PROOFS', 'PROD-WED-PROOFS',
  'PROD-VID-LONGFORM', 'PROD-VID-RECAP', 'PROD-VID-SLIDESHOW', 'PROD-VID-SOCIAL',
  'PROD-BACKUP-PHOTO', 'PROD-BACKUP-VIDEO',
]

const PHOTO_CODES = ['PROD-ENG-PROOFS', 'PROD-WED-PROOFS']

const STATUS_PRIORITY: Record<string, number> = {
  waiting_approval: 1, at_lab: 2, in_progress: 3, not_started: 4,
  at_studio: 5, on_hold: 6, completed: 7, picked_up: 8,
}

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-teal-100 text-teal-700',
  waiting_approval: 'bg-yellow-100 text-yellow-700',
  on_hold: 'bg-gray-100 text-gray-700',
  completed: 'bg-blue-100 text-blue-700',
  at_lab: 'bg-yellow-100 text-yellow-700',
  at_studio: 'bg-green-100 text-green-700',
  picked_up: 'bg-blue-100 text-blue-700',
}

const VENDOR_LABELS: Record<string, string> = {
  best_canvas: 'Best Canvas',
  cci: 'CCI',
  uaf: 'UAF',
}

// ══════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════

export default function ProductionDashboardPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [videoJobs, setVideoJobs] = useState<any[]>([])
  const [productMap, setProductMap] = useState<Map<string, string>>(new Map())
  const [coupleMap, setCoupleMap] = useState<Map<string, { name: string; wedding_date: string | null }>>(new Map())
  const [showCompleted, setShowCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [waitingBannerOpen, setWaitingBannerOpen] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      const [jobsRes, videoRes, productsRes, couplesRes] = await Promise.all([
        supabase.from('jobs').select('id, couple_id, product_code, job_type, status, vendor, created_at, sent_for_review_date, approval_round, reedit_count'),
        supabase.from('video_jobs').select('id, couple_id, status, sent_for_review_date'),
        supabase.from('product_catalog').select('product_code, item_name'),
        supabase.from('couples').select('id, couple_name, wedding_date'),
      ])

      setJobs(jobsRes.data || [])
      setVideoJobs(videoRes.data || [])

      const pMap = new Map<string, string>()
      ;(productsRes.data || []).forEach((p: any) => pMap.set(p.product_code, p.item_name))
      setProductMap(pMap)

      const cMap = new Map<string, { name: string; wedding_date: string | null }>()
      ;(couplesRes.data || []).forEach((c: any) => cMap.set(c.id, { name: c.couple_name, wedding_date: c.wedding_date }))
      setCoupleMap(cMap)

      setLoading(false)
    }
    fetchAll()
  }, [])

  // ── Computed stats ──────────────────────────────────────────────

  const photoJobs = useMemo(() => jobs.filter(j => PHOTO_CODES.includes(j.product_code)), [jobs])
  const orderJobs = useMemo(() => jobs.filter(j => !EXCLUDED_ORDER_CODES.includes(j.product_code || j.job_type || '')), [jobs])

  const photoStats = useMemo(() => {
    const total = photoJobs.length
    const editing = photoJobs.filter(j => j.status === 'in_progress').length
    const atLab = photoJobs.filter(j => j.status === 'at_lab').length
    return { total, editing, atLab }
  }, [photoJobs])

  const videoStats = useMemo(() => {
    const total = videoJobs.length
    const editing = videoJobs.filter(j => j.status === 'in_progress').length
    const notStarted = videoJobs.filter(j => j.status === 'not_started').length
    return { total, editing, notStarted }
  }, [videoJobs])

  const orderStats = useMemo(() => {
    const active = orderJobs.filter(j => j.status !== 'completed' && j.status !== 'picked_up')
    const total = orderJobs.length
    const activeCount = active.length
    const atLab = active.filter(j => j.status === 'at_lab').length
    const waiting = active.filter(j => j.status === 'waiting_approval').length
    return { total, activeCount, atLab, waiting }
  }, [orderJobs])

  // Waiting on client — both job tables
  const waitingStats = useMemo(() => {
    const waitingJobs = jobs.filter(j => j.status === 'waiting_approval')
    const waitingVideo = videoJobs.filter(j => j.status === 'waiting_approval' || j.status === 'waiting_for_bride')
    const allWaiting = [...waitingJobs, ...waitingVideo]
    const count = allWaiting.length
    let oldestDays = 0
    allWaiting.forEach(j => {
      const dateStr = j.sent_for_review_date || j.created_at
      if (dateStr) {
        const days = differenceInDays(new Date(), parseISO(dateStr))
        if (days > oldestDays) oldestDays = days
      }
    })
    return { count, oldestDays }
  }, [jobs, videoJobs])

  // Waiting on client grouped by couple
  const waitingGrouped = useMemo((): WaitingItem[] => {
    const waitingJobs = jobs.filter(j => j.status === 'waiting_approval')
    const grouped = new Map<string, WaitingItem>()
    waitingJobs.forEach(j => {
      const existing = grouped.get(j.couple_id)
      const dateStr = j.sent_for_review_date || j.created_at
      const days = dateStr ? differenceInDays(new Date(), parseISO(dateStr)) : 0
      const productName = productMap.get(j.product_code) || j.product_code || j.job_type || 'Unknown'
      if (existing) {
        existing.items.push({ productName, daysSince: days })
      } else {
        grouped.set(j.couple_id, {
          coupleId: j.couple_id,
          coupleName: coupleMap.get(j.couple_id)?.name || 'Unknown',
          items: [{ productName, daysSince: days }],
        })
      }
    })
    return Array.from(grouped.values())
  }, [jobs, productMap, coupleMap])

  // Orders table data
  const allOrderTableData: OrderRow[] = useMemo(() => {
    return orderJobs
      .map(j => {
        const couple = coupleMap.get(j.couple_id)
        return {
          id: j.id,
          couple_id: j.couple_id,
          product_code: j.product_code,
          status: j.status,
          vendor: j.vendor,
          created_at: j.created_at,
          sent_for_review_date: j.sent_for_review_date,
          approval_round: j.approval_round,
          reedit_count: j.reedit_count,
          couple_name: couple?.name || 'Unknown',
          wedding_date: couple?.wedding_date || null,
          item_name: productMap.get(j.product_code) || j.product_code || j.job_type || 'Unknown',
        }
      })
      .sort((a, b) => (STATUS_PRIORITY[a.status] || 99) - (STATUS_PRIORITY[b.status] || 99))
  }, [orderJobs, coupleMap, productMap])

  const activeOrderData = useMemo(() => allOrderTableData.filter(o => o.status !== 'completed' && o.status !== 'picked_up'), [allOrderTableData])
  const completedOrderCount = useMemo(() => allOrderTableData.length - activeOrderData.length, [allOrderTableData, activeOrderData])
  const orderTableData = showCompleted ? allOrderTableData : activeOrderData

  // ── Column definitions ──────────────────────────────────────────

  const orderColumns: ColumnDef<OrderRow>[] = useMemo(() => [
    {
      id: 'row_number',
      header: '#',
      cell: ({ row }) => <span className="text-xs text-muted-foreground tabular-nums">{row.index + 1}</span>,
      enableSorting: false,
    },
    {
      accessorKey: 'couple_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => (
        <Link href={`/admin/production/couples/${row.original.couple_id}`} className="font-medium text-teal-700 hover:underline text-sm">
          {row.original.couple_name}
        </Link>
      ),
    },
    {
      id: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      accessorFn: (row) => row.wedding_date || '',
      cell: ({ row }) => {
        const wd = row.original.wedding_date
        if (!wd) return <span className="text-xs text-muted-foreground">—</span>
        const d = parseISO(wd)
        const dayName = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]
        const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]
        return <span className="text-xs text-muted-foreground">{dayName} {monthName} {d.getDate()}</span>
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      accessorFn: (row) => STATUS_PRIORITY[row.status] || 99,
      cell: ({ row }) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[row.original.status] || 'bg-gray-100 text-gray-700'}`}>
          {row.original.status.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      id: 'days',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Days" />,
      accessorFn: (row) => {
        const dateStr = (row.status === 'waiting_approval' && row.sent_for_review_date) ? row.sent_for_review_date : row.created_at
        return differenceInDays(new Date(), parseISO(dateStr))
      },
      cell: ({ row }) => {
        const dateStr = (row.original.status === 'waiting_approval' && row.original.sent_for_review_date)
          ? row.original.sent_for_review_date!
          : row.original.created_at
        const days = differenceInDays(new Date(), parseISO(dateStr))
        return <span className={`text-sm tabular-nums ${days > 30 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>{days}d</span>
      },
    },
    {
      accessorKey: 'item_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.item_name}</span>,
    },
    {
      accessorKey: 'vendor',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.vendor ? (VENDOR_LABELS[row.original.vendor] || row.original.vendor) : '—'}
        </span>
      ),
    },
  ], [])

  // ── Loading ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className={`space-y-6 max-w-4xl ${nunito.className}`}>
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 md:pt-6">
        <h1 className={`text-xl md:text-2xl font-bold ${playfair.className}`}>Production Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of all production activity</p>
      </div>

      {/* Section 1: Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 md:px-6">
        <StatCard
          icon={<Camera className="h-5 w-5 text-teal-600" />}
          title="Photo Jobs"
          value={photoStats.total}
          lines={[
            `${photoStats.editing} editing`,
            `${photoStats.atLab} at lab`,
          ]}
        />
        <StatCard
          icon={<Video className="h-5 w-5 text-blue-600" />}
          title="Video Jobs"
          value={videoStats.total}
          lines={[
            `${videoStats.editing} editing`,
            `${videoStats.notStarted} not started`,
          ]}
        />
        <StatCard
          icon={<Package className="h-5 w-5 text-amber-600" />}
          title="Orders"
          value={orderStats.activeCount}
          lines={[
            `${orderStats.atLab} at lab · ${orderStats.waiting} waiting`,
            `${orderStats.total} total`,
          ]}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-yellow-600" />}
          title="Waiting on Client"
          value={waitingStats.count}
          lines={[
            waitingStats.oldestDays > 0 ? `oldest: ${waitingStats.oldestDays}d` : '',
          ].filter(Boolean)}
          highlight={waitingStats.count > 0}
        />
      </div>

      {/* Section 2: Waiting on Client Banner */}
      {waitingGrouped.length > 0 && (
        <div className="px-4 md:px-6">
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
                Waiting on Client ({waitingStats.count})
              </span>
            </button>
            {waitingBannerOpen && (
              <div className="px-4 pb-3 space-y-2">
                {waitingGrouped.map(group => {
                  const maxDays = Math.max(...group.items.map(i => i.daysSince))
                  return (
                    <div key={group.coupleId} className="text-sm text-yellow-700">
                      <Link href={`/admin/production/couples/${group.coupleId}`} className="font-medium hover:underline">
                        {group.coupleName}
                      </Link>
                      <span className="text-yellow-600">
                        {' — '}{group.items.length} item{group.items.length !== 1 ? 's' : ''}
                        {' ('}
                        {group.items.map(i => i.productName).join(', ')}
                        {') — '}{maxDays} day{maxDays !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 3: Client Orders Summary Table */}
      <div className="px-4 md:px-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-lg font-bold ${playfair.className}`}>
            Client Orders ({activeOrderData.length} active)
          </h2>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showCompleted ? 'Hide' : 'Show'} Completed ({completedOrderCount})
          </button>
        </div>
        {orderTableData.length > 0 ? (
          <DataTable
            columns={orderColumns}
            data={orderTableData}
            showPagination={orderTableData.length > 20}
            emptyMessage="No orders"
          />
        ) : (
          <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg">No orders</div>
        )}
      </div>

      {/* Section 4: Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 md:px-6 pb-8">
        <QuickLink href="/admin/production/photo" icon={<Camera className="h-5 w-5" />} title="Photo Editing" />
        <QuickLink href="/admin/production/video" icon={<Video className="h-5 w-5" />} title="Video Editing" />
        <QuickLink href="/admin/production/archive" icon={<Package className="h-5 w-5" />} title="Archive" />
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function StatCard({ icon, title, value, lines, highlight }: {
  icon: React.ReactNode
  title: string
  value: number
  lines: string[]
  highlight?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-yellow-300 bg-yellow-50' : 'bg-card'}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      {lines.map((line, i) => (
        <div key={i} className="text-xs text-muted-foreground">{line}</div>
      ))}
    </div>
  )
}

function QuickLink({ href, icon, title }: { href: string; icon: React.ReactNode; title: string }) {
  return (
    <Link href={href} className="rounded-xl border bg-card p-4 flex items-center justify-between hover:border-ring transition-colors group">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">{icon}</span>
        <span className="font-medium text-sm">{title}</span>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
    </Link>
  )
}
