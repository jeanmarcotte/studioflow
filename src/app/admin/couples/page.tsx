'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { Users, Search, Calendar, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatWeddingDateShort, formatPackage } from '@/lib/formatters'
import Link from 'next/link'
import { HistoricalCouplesArchive } from '@/components/couples/HistoricalCouplesArchive'

interface CoupleRow {
  id: string
  couple_name: string
  status: string
  wedding_date: string | null
  wedding_year: number | null
  package_type: string | null
  reception_venue: string | null
  c1_contract: number
  c2_frames_albums: number
  c3_extras: number
  total_invoiced: number
  total_received: number
  balance_due: number
  payments_count: number
  eng_pipeline: string
  is_shot: boolean
  m06_eng_session_shot: boolean
  m06_declined: boolean
  m15_day_form_approved: boolean
  m19_wedding_day: boolean
  m22_proofs_edited: boolean
  m24_photo_order_in: boolean
  m25_video_order_in: boolean
}

interface MilestoneRow {
  couple_id: string
  m06_eng_session_shot: boolean
  m06_declined: boolean
  m10_frame_sale_quote: boolean
  m11_sale_results_pdf: boolean
  m11_no_sale: boolean
  m15_day_form_approved: boolean
  m19_wedding_day: boolean
  m22_proofs_edited: boolean
  m24_photo_order_in: boolean
  m25_video_order_in: boolean
}

const YEARS = [2028, 2027, 2026, 2025]

const ENG_SORT_ORDER: Record<string, number> = {
  quoted: 0, shot: 1, no_sale: 2, declined: 3, pending: 4, sold: 5,
}

function computeEngPipeline(m: MilestoneRow | undefined): string {
  if (!m) return 'pending'
  if (m.m06_declined) return 'declined'
  if (!m.m06_eng_session_shot) return 'pending'
  if (!m.m10_frame_sale_quote) return 'shot'
  if (m.m11_no_sale) return 'no_sale'
  if (m.m11_sale_results_pdf) return 'sold'
  return 'quoted'
}

function engBadge(state: string) {
  switch (state) {
    case 'pending':
      return <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-medium">Pending</span>
    case 'declined':
      return <span className="inline-flex items-center rounded-full bg-red-50 text-red-600 px-2 py-0.5 text-xs font-medium">Declined</span>
    case 'shot':
      return <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 text-xs font-medium">Shot</span>
    case 'quoted':
      return <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-600 px-2 py-0.5 text-xs font-medium">Quoted</span>
    case 'no_sale':
      return <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-400 px-2 py-0.5 text-xs font-medium line-through">No Sale</span>
    case 'sold':
      return <span className="inline-flex items-center rounded-full bg-green-50 text-green-600 px-2 py-0.5 text-xs font-medium">Sold</span>
    default:
      return null
  }
}

function formatDateFull(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

export default function CouplesPage() {
  const router = useRouter()
  const [couples, setCouples] = useState<CoupleRow[]>([])
  const [upcomingWeddings, setUpcomingWeddings] = useState<{ bride_first_name: string; groom_first_name: string; wedding_date: string }[]>([])
  const [pendingEngCount, setPendingEngCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const [engFilter, setEngFilter] = useState<string>('all')

  useEffect(() => {
    const fetchCouples = async () => {
      const today = new Date().toISOString().split('T')[0]
      const in14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const [couplesRes, financialsRes, paymentCountsRes, milestonesRes, upcomingRes] = await Promise.all([
        supabase
          .from('couples')
          .select('id, couple_name, wedding_date, wedding_year, package_type, status, contracts(reception_venue)')
          .order('wedding_date', { ascending: true }),
        supabase
          .from('couple_financial_summary')
          .select('couple_id, c1_owed, c2_owed, c3_owed, total_owed, total_paid, balance_due'),
        supabase
          .from('payments')
          .select('couple_id'),
        supabase
          .from('couple_milestones')
          .select('couple_id, m06_eng_session_shot, m06_declined, m10_frame_sale_quote, m11_sale_results_pdf, m11_no_sale, m15_day_form_approved, m19_wedding_day, m22_proofs_edited, m24_photo_order_in, m25_video_order_in'),
        supabase
          .from('couples')
          .select('bride_first_name, groom_first_name, wedding_date')
          .gte('wedding_date', today)
          .lte('wedding_date', in14)
          .order('wedding_date', { ascending: true }),
      ])

      // Map financials from VIEW
      const financialMap: Record<string, any> = {}
      if (financialsRes.data) {
        for (const row of financialsRes.data) {
          financialMap[row.couple_id] = row
        }
      }

      // Count payments by couple
      const paymentCounts: Record<string, number> = {}
      if (paymentCountsRes.data) {
        for (const row of paymentCountsRes.data) {
          paymentCounts[row.couple_id] = (paymentCounts[row.couple_id] || 0) + 1
        }
      }

      // Map milestones
      const milestonesMap: Record<string, MilestoneRow> = {}
      if (milestonesRes.data) {
        for (const row of milestonesRes.data as MilestoneRow[]) {
          milestonesMap[row.couple_id] = row
        }
      }

      // Set upcoming weddings for Next 14 Days widget
      setUpcomingWeddings((upcomingRes.data || []).map((r: any) => ({
        bride_first_name: r.bride_first_name || '',
        groom_first_name: r.groom_first_name || '',
        wedding_date: r.wedding_date,
      })))

      if (!couplesRes.error && couplesRes.data) {
        // Compute pending eng count: booked couples without m06_eng_session_shot and not declined
        const bookedCouples = couplesRes.data.filter((r: any) => r.status === 'booked')
        let pendingCount = 0
        bookedCouples.forEach((r: any) => {
          const ms = milestonesMap[r.id]
          if (!(ms?.m06_eng_session_shot ?? false) && !(ms?.m06_declined ?? false)) {
            pendingCount++
          }
        })
        setPendingEngCount(pendingCount)

        setCouples(couplesRes.data.map((row: any) => {
          const contract = Array.isArray(row.contracts) ? row.contracts[0] : row.contracts
          const ms = milestonesMap[row.id]
          const fin = financialMap[row.id]

          return {
            id: row.id,
            couple_name: row.couple_name,
            status: row.status || 'lead',
            wedding_date: row.wedding_date,
            wedding_year: row.wedding_year,
            package_type: row.package_type,
            reception_venue: contract?.reception_venue || null,
            c1_contract: Number(fin?.c1_owed) || 0,
            c2_frames_albums: Number(fin?.c2_owed) || 0,
            c3_extras: Number(fin?.c3_owed) || 0,
            total_invoiced: Number(fin?.total_owed) || 0,
            total_received: Number(fin?.total_paid) || 0,
            balance_due: Number(fin?.balance_due) || 0,
            payments_count: paymentCounts[row.id] || 0,
            eng_pipeline: computeEngPipeline(ms),
            is_shot: ms?.m19_wedding_day || false,
            m06_eng_session_shot: ms?.m06_eng_session_shot || false,
            m06_declined: ms?.m06_declined || false,
            m15_day_form_approved: ms?.m15_day_form_approved || false,
            m19_wedding_day: ms?.m19_wedding_day || false,
            m22_proofs_edited: ms?.m22_proofs_edited || false,
            m24_photo_order_in: ms?.m24_photo_order_in || false,
            m25_video_order_in: ms?.m25_video_order_in || false,
          }
        }))
      }
      setLoading(false)
    }
    fetchCouples()
  }, [])

  const filtered = useMemo(() => {
    let result = [...couples]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.couple_name.toLowerCase().includes(q) ||
        c.reception_venue?.toLowerCase().includes(q)
      )
    }

    if (yearFilter !== 'all') {
      result = result.filter(c => c.wedding_year === yearFilter)
    }

    if (engFilter !== 'all') {
      result = result.filter(c => c.eng_pipeline === engFilter)
    }

    return result
  }, [couples, search, yearFilter, engFilter])

  // Stats
  const stats = useMemo(() => {
    const today = new Date()
    const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)

    const byYear: Record<number, number> = {}
    YEARS.forEach(y => { byYear[y] = 0 })
    let next14 = 0
    let pendingEng = 0
    const remainingByYear: Record<number, number> = {}
    YEARS.forEach(y => { remainingByYear[y] = 0 })

    // Frame sales by year (c2 > 0)
    const frameSalesByYear: Record<number, number> = {}
    YEARS.forEach(y => { frameSalesByYear[y] = 0 })

    couples.forEach(c => {
      const year = c.wedding_date ? new Date(c.wedding_date + 'T12:00:00').getFullYear() : null
      if (year && year in byYear) byYear[year]++

      // Next 14 days
      if (c.wedding_date) {
        const wd = new Date(c.wedding_date + 'T12:00:00')
        if (wd >= today && wd <= in14Days) next14++
      }

      // Pending engagements (booked only)
      if (c.status === 'booked' && !c.m06_eng_session_shot && !c.m06_declined) pendingEng++

      // Remaining (not shot) by year
      if (!c.m19_wedding_day && year && year in remainingByYear) remainingByYear[year]++

      // Frame sales by year
      if (c.c2_frames_albums > 0 && year && year in frameSalesByYear) frameSalesByYear[year]++
    })

    return { byYear, next14, pendingEng, remainingByYear, frameSalesByYear }
  }, [couples])

  // Milestone alerts
  const alerts = useMemo(() => {
    const today = new Date()
    const result: { couple: string; id: string; message: string; type: 'warning' | 'danger' }[] = []

    couples.forEach(c => {
      if (!c.wedding_date) return
      const wd = new Date(c.wedding_date + 'T12:00:00')
      const daysUntil = daysBetween(today, wd)
      const daysSince = daysBetween(wd, today)

      // WD Form missing < 60 days
      if (!c.m15_day_form_approved && daysUntil > 0 && daysUntil <= 60) {
        result.push({ couple: c.couple_name, id: c.id, message: `WD Form missing (${daysUntil}d)`, type: 'danger' })
      }

      // Photo order overdue
      if (c.m22_proofs_edited && !c.m24_photo_order_in && daysSince > 60) {
        result.push({ couple: c.couple_name, id: c.id, message: `Photo order overdue (${daysSince}d post)`, type: 'warning' })
      }

      // Video order overdue
      if (c.m22_proofs_edited && !c.m25_video_order_in && daysSince > 60) {
        result.push({ couple: c.couple_name, id: c.id, message: `Video order overdue (${daysSince}d post)`, type: 'warning' })
      }
    })

    return result
  }, [couples])

  // Filtered stats for table header
  const filteredStats = useMemo(() => {
    const total = filtered.length
    const remaining = filtered.filter(c => !c.m19_wedding_day).length
    const shot = filtered.filter(c => c.m19_wedding_day).length
    const totalBalance = filtered.reduce((sum, c) => sum + Math.max(0, c.balance_due), 0)
    return { total, remaining, shot, totalBalance }
  }, [filtered])

  // Shot vs remaining for sidebar (based on year filter)
  const shotVsRemaining = useMemo(() => {
    const yearCouples = yearFilter === 'all' ? couples : couples.filter(c => c.wedding_year === yearFilter)
    const shot = yearCouples.filter(c => c.m19_wedding_day).length
    const remaining = yearCouples.filter(c => !c.m19_wedding_day).length
    return { shot, remaining, total: yearCouples.length }
  }, [couples, yearFilter])

  const columns: ColumnDef<CoupleRow>[] = useMemo(() => [
    {
      accessorKey: "couple_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => (
        <Link href={`/admin/couples/${row.original.id}`} className="text-blue-600 hover:underline font-medium">
          {row.original.couple_name}
        </Link>
      ),
    },
    {
      accessorKey: "wedding_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => (
        <span style={{ whiteSpace: 'nowrap' }}>
          {formatDateFull(row.original.wedding_date)}
        </span>
      ),
    },
    {
      accessorKey: "eng_pipeline",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Eng" />,
      cell: ({ row }) => engBadge(row.original.eng_pipeline),
      sortingFn: (a, b) => (ENG_SORT_ORDER[a.original.eng_pipeline] ?? 99) - (ENG_SORT_ORDER[b.original.eng_pipeline] ?? 99),
    },
    {
      accessorKey: "package_type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Package" />,
      cell: ({ row }) => <span className="text-muted-foreground">{formatPackage(row.original.package_type)}</span>,
    },
    {
      accessorKey: "reception_venue",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Venue" />,
      cell: ({ row }) => row.original.reception_venue
        ? <span className="text-muted-foreground truncate block max-w-[160px]" title={row.original.reception_venue}>{row.original.reception_venue}</span>
        : <span className="text-muted-foreground/40">—</span>,
    },
    {
      accessorKey: "c1_contract",
      header: ({ column }) => <DataTableColumnHeader column={column} title="C1 Contract" />,
      cell: ({ row }) => row.original.c1_contract > 0
        ? <Link href={`/admin/contracts/${row.original.id}/view`} className="text-blue-600 hover:underline" style={{ textAlign: 'right', display: 'block' }}>{formatCurrency(Math.round(row.original.c1_contract))}</Link>
        : <span className="text-muted-foreground/40" style={{ textAlign: 'right', display: 'block' }}>—</span>,
    },
    {
      accessorKey: "c2_frames_albums",
      header: ({ column }) => <DataTableColumnHeader column={column} title="C2 Frames" />,
      cell: ({ row }) => row.original.c2_frames_albums > 0
        ? <Link href={`/admin/albums/${row.original.id}/view`} className="text-blue-600 hover:underline" style={{ textAlign: 'right', display: 'block' }}>{formatCurrency(Math.round(row.original.c2_frames_albums))}</Link>
        : <span className="text-muted-foreground/40" style={{ textAlign: 'right', display: 'block' }}>—</span>,
    },
    {
      accessorKey: "c3_extras",
      header: ({ column }) => <DataTableColumnHeader column={column} title="C3 Extras" />,
      cell: ({ row }) => row.original.c3_extras > 0
        ? <Link href={`/admin/extras/${row.original.id}/view`} className="text-blue-600 hover:underline" style={{ textAlign: 'right', display: 'block' }}>{formatCurrency(Math.round(row.original.c3_extras))}</Link>
        : <span className="text-muted-foreground/40" style={{ textAlign: 'right', display: 'block' }}>—</span>,
    },
    {
      accessorKey: "total_invoiced",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Invoiced" />,
      cell: ({ row }) => row.original.total_invoiced > 0
        ? <span className="font-medium" style={{ textAlign: 'right', display: 'block' }}>{formatCurrency(Math.round(row.original.total_invoiced))}</span>
        : <span className="text-muted-foreground/40" style={{ textAlign: 'right', display: 'block' }}>—</span>,
    },
    {
      accessorKey: "total_received",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Received" />,
      cell: ({ row }) => row.original.total_received > 0
        ? <span className="text-muted-foreground" style={{ textAlign: 'right', display: 'block' }}>{formatCurrency(Math.round(row.original.total_received))}</span>
        : <span className="text-muted-foreground/40" style={{ textAlign: 'right', display: 'block' }}>—</span>,
    },
    {
      accessorKey: "payments_count",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Pmts" />,
      cell: ({ row }) => row.original.payments_count > 0
        ? <span className="text-muted-foreground" style={{ textAlign: 'center', display: 'block' }}>{row.original.payments_count}</span>
        : <span className="text-muted-foreground/50" style={{ textAlign: 'center', display: 'block' }}>—</span>,
    },
    {
      accessorKey: "balance_due",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Balance Due" />,
      cell: ({ row }) => {
        const bal = row.original.balance_due
        if (bal > 0.50) return <span className="font-semibold text-red-600" style={{ textAlign: 'right', display: 'block' }}>{formatCurrency(Math.round(bal))}</span>
        if (bal < -0.50) return <span className="font-medium text-green-600" style={{ textAlign: 'right', display: 'block' }}>{formatCurrency(Math.round(bal))}</span>
        return <span className="text-muted-foreground/50" style={{ textAlign: 'right', display: 'block' }}>$0</span>
      },
    },
  ], [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Couples</h1>
          <p className="text-muted-foreground">{couples.length} couples in database</p>
        </div>

        {/* Top Row — 4 Info Boxes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Weddings by Year */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-blue-500" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Weddings by Year</h3>
            </div>
            <div className="space-y-0.5">
              <div
                onClick={() => setYearFilter('all')}
                className={`flex items-center justify-between text-sm px-2 py-1 rounded cursor-pointer transition-colors ${yearFilter === 'all' ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-100 text-muted-foreground'}`}
              >
                <span>All</span>
                <span className="font-semibold">{couples.length}</span>
              </div>
              {YEARS.map(yr => (
                <div
                  key={yr}
                  onClick={() => setYearFilter(yearFilter === yr ? 'all' : yr)}
                  className={`flex items-center justify-between text-sm px-2 py-1 rounded cursor-pointer transition-colors ${yearFilter === yr ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-100 text-muted-foreground'}`}
                >
                  <span>{yr}</span>
                  <span className="font-semibold">{stats.byYear[yr] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Next 14 Days */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Next 14 Days</h3>
            </div>
            <div className="text-xs text-muted-foreground mb-2">{upcomingWeddings.length} upcoming</div>
            {upcomingWeddings.length === 0 ? (
              <div className="text-xs text-muted-foreground">No weddings in next 14 days</div>
            ) : (
              <div className="space-y-0.5">
                {upcomingWeddings.map((w, i) => (
                  <div key={i} className="text-sm">
                    {formatWeddingDateShort(w.wedding_date)} — {w.bride_first_name} & {w.groom_first_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Engagements */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-indigo-500" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending Eng.</h3>
            </div>
            <div className="text-3xl font-bold text-indigo-600">{pendingEngCount}</div>
            <div className="text-xs text-muted-foreground mt-1">not yet shot</div>
          </div>

          {/* Remaining by Year */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-teal-500" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Remaining by Year</h3>
            </div>
            <div className="space-y-1">
              {YEARS.map(yr => {
                const rem = stats.remainingByYear[yr] || 0
                return rem > 0 ? (
                  <div key={yr} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{yr}</span>
                    <span className="font-semibold">{rem}</span>
                  </div>
                ) : null
              }).filter(Boolean)}
              {YEARS.every(yr => (stats.remainingByYear[yr] || 0) === 0) && (
                <div className="text-sm text-muted-foreground">All shot</div>
              )}
            </div>
          </div>
        </div>

        {/* Search + Eng Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none transition-colors focus:border-ring"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <select
            value={engFilter}
            onChange={(e) => setEngFilter(e.target.value)}
            className="!w-auto"
          >
            <option value="all">All Eng</option>
            <option value="pending">Pending</option>
            <option value="declined">Declined</option>
            <option value="shot">Shot</option>
            <option value="quoted">Quoted</option>
            <option value="no_sale">No Sale</option>
            <option value="sold">Sold</option>
          </select>
        </div>

        {/* Table Card */}
        <div className="rounded-xl border bg-card">
          {/* Table Header Stats */}
          <div className="px-4 py-3 border-b flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold">{filteredStats.total} couples</span>
            <span className="text-muted-foreground">{filteredStats.remaining} remaining</span>
            <span className="text-muted-foreground/60">{filteredStats.shot} shot</span>
            {filteredStats.totalBalance > 0 && (
              <span className="text-red-600 font-semibold ml-auto">
                {formatCurrency(Math.round(filteredStats.totalBalance))} balance due
              </span>
            )}
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            emptyMessage="No couples found matching your filters."
            pageSize={50}
            rowClassName={(row) => row.is_shot ? 'bg-gray-50/80 text-gray-400 [&_span]:text-gray-400' : ''}
          />
        </div>

        <HistoricalCouplesArchive />
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-[260px] flex-shrink-0 space-y-4">
        {/* Year Filter Pills */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Filter by Year</h3>
          <div className="flex flex-wrap gap-2">
            {YEARS.map(yr => (
              <button
                key={yr}
                onClick={() => setYearFilter(yearFilter === yr ? 'all' : yr)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  yearFilter === yr
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                {yr}
              </button>
            ))}
            <button
              onClick={() => setYearFilter('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                yearFilter === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{ minHeight: '44px' }}
            >
              All
            </button>
          </div>
        </div>

        {/* Shot vs Remaining */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Shot vs Remaining {yearFilter !== 'all' ? `(${yearFilter})` : ''}
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shot</span>
              <span className="font-semibold text-green-600">{shotVsRemaining.shot}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining</span>
              <span className="font-semibold text-amber-600">{shotVsRemaining.remaining}</span>
            </div>
            {shotVsRemaining.total > 0 && (
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all"
                  style={{ width: `${(shotVsRemaining.shot / shotVsRemaining.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Frame Sales by Year */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Frame Sales by Year</h3>
          <div className="space-y-1.5">
            {YEARS.map(yr => (
              <div key={yr} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{yr}</span>
                <span className="font-semibold">{stats.frameSalesByYear[yr] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Milestone Alerts */}
        {alerts.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Alerts ({alerts.length})</h3>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className="text-xs cursor-pointer hover:bg-amber-100 rounded px-1 py-1 -mx-1 transition-colors"
                  onClick={() => router.push(`/admin/couples/${alert.id}`)}
                >
                  <span className={`font-semibold ${alert.type === 'danger' ? 'text-red-700' : 'text-amber-700'}`}>
                    {alert.couple}
                  </span>
                  <span className="text-amber-600 ml-1">— {alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
