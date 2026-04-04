'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { Users, Search, Filter, ChevronUp, ChevronDown, Calendar, Camera, Frame, FileText, Package } from 'lucide-react'
import { formatWeddingDate, formatCurrency } from '@/lib/formatters'
import PdfImporter from '@/components/admin/PdfImporter'
import ExtrasImporter from '@/components/admin/ExtrasImporter'

interface Couple {
  id: string
  couple_name: string
  wedding_date: string | null
  wedding_year: number | null
  package_type: string | null
  reception_venue: string | null
  contract_price: number | null
  balance_owing: number | null
  ceremony_venue: string | null
  contract_total: number | null
  frame_sale_status: string | null
  frames_total: number
  extras_total: number
  payments_count: number
  eng_pipeline: string
}

const YEARS = [2027, 2026, 2025]
const ENG_STATES = [
  { value: 'all', label: 'All Eng' },
  { value: 'pending', label: 'Pending' },
  { value: 'declined', label: 'Declined' },
  { value: 'shot', label: 'Shot' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'no_sale', label: 'No Sale' },
  { value: 'sold', label: 'Sold' },
]

const ENG_SORT_ORDER: Record<string, number> = {
  quoted: 0, shot: 1, no_sale: 2, declined: 3, pending: 4, sold: 5,
}

function formatPackage(pkg: string | null): string {
  if (!pkg) return '—'
  if (pkg === 'photo_only') return 'Photo Only'
  if (pkg === 'photo_video') return 'Photo + Video'
  return pkg
}

// Engagement-to-Sale Pipeline (couple_milestones)
// Tracks the full engagement shoot → frame sale journey
// Declined = m06_declined true (opted out of engagement shoot)
// Pending  = m06_eng_session_shot false, m06_declined false (not yet shot)
// Shot     = m06_eng_session_shot true, m10_frame_sale_quote false (done, no quote yet)
// Quoted   = m10 true, m11 false, m11_no_sale false (has quote, deciding)
// No Sale  = m11_no_sale true (saw proofs, passed on frames)
// Sold     = m11_sale_results_pdf true (bought frames/albums)
// Added March 22, 2026
interface MilestoneRow {
  couple_id: string
  m06_eng_session_shot: boolean
  m06_declined: boolean
  m10_frame_sale_quote: boolean
  m11_sale_results_pdf: boolean
  m11_no_sale: boolean
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

export default function CouplesPage() {
  const router = useRouter()
  const [couples, setCouples] = useState<Couple[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const [engFilter, setEngFilter] = useState<string>('all')
  const [packageFilter, setPackageFilter] = useState<string>('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeImporter, setActiveImporter] = useState<'none' | 'contract' | 'extras'>('none')

  useEffect(() => {
    const fetchCouples = async () => {
      const [couplesRes, framesRes, extrasRes, paymentsRes, milestonesRes] = await Promise.all([
        supabase
          .from('couples')
          .select('id, couple_name, wedding_date, wedding_year, package_type, frame_sale_status, balance_owing, ceremony_venue, contract_total, contracts(reception_venue, total)')
          .order('wedding_date', { ascending: true }),
        supabase
          .from('extras_orders')
          .select('couple_id, total'),
        supabase
          .from('client_extras')
          .select('couple_id, total'),
        supabase
          .from('payments')
          .select('couple_id'),
        supabase
          .from('couple_milestones')
          .select('couple_id, m06_eng_session_shot, m06_declined, m10_frame_sale_quote, m11_sale_results_pdf, m11_no_sale'),
      ])

      // Sum frames by couple
      const framesSums: Record<string, number> = {}
      if (framesRes.data) {
        for (const row of framesRes.data) {
          framesSums[row.couple_id] = (framesSums[row.couple_id] || 0) + (Number(row.total) || 0)
        }
      }

      // Sum extras by couple
      const extrasSums: Record<string, number> = {}
      if (extrasRes.data) {
        for (const row of extrasRes.data) {
          extrasSums[row.couple_id] = (extrasSums[row.couple_id] || 0) + (Number(row.total) || 0)
        }
      }

      // Count payments by couple
      const paymentsCounts: Record<string, number> = {}
      if (paymentsRes.data) {
        for (const row of paymentsRes.data) {
          paymentsCounts[row.couple_id] = (paymentsCounts[row.couple_id] || 0) + 1
        }
      }

      // Map milestones by couple
      const milestonesMap: Record<string, MilestoneRow> = {}
      if (milestonesRes.data) {
        for (const row of milestonesRes.data as MilestoneRow[]) {
          milestonesMap[row.couple_id] = row
        }
      }

      if (!couplesRes.error && couplesRes.data) {
        setCouples(couplesRes.data.map((row: any) => {
          const contract = Array.isArray(row.contracts) ? row.contracts[0] : row.contracts
          return {
            ...row,
            reception_venue: contract?.reception_venue || null,
            contract_price: contract?.total != null ? Number(contract.total) : null,
            frames_total: framesSums[row.id] || 0,
            extras_total: extrasSums[row.id] || 0,
            payments_count: paymentsCounts[row.id] || 0,
            eng_pipeline: computeEngPipeline(milestonesMap[row.id]),
          }
        }))
      }
      setLoading(false)
    }
    fetchCouples()
  }, [refreshKey])

  const filtered = useMemo(() => {
    let result = [...couples]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.couple_name.toLowerCase().includes(q) ||
        c.ceremony_venue?.toLowerCase().includes(q) ||
        c.reception_venue?.toLowerCase().includes(q)
      )
    }

    // Year filter
    if (yearFilter !== 'all') {
      result = result.filter(c => c.wedding_year === yearFilter)
    }

    // Eng pipeline filter
    if (engFilter !== 'all') {
      result = result.filter(c => c.eng_pipeline === engFilter)
    }

    // Package filter
    if (packageFilter !== 'all') {
      result = result.filter(c => c.package_type === packageFilter)
    }

    return result
  }, [couples, search, yearFilter, engFilter, packageFilter])

  // Column definitions for DataTable
  const columns: ColumnDef<Couple>[] = useMemo(() => [
    {
      accessorKey: "couple_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => <span className="font-medium">{row.original.couple_name}</span>,
    },
    {
      accessorKey: "wedding_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => row.original.wedding_date
        ? <span style={{ whiteSpace: 'nowrap' }}>{formatWeddingDate(row.original.wedding_date)}</span>
        : <span className="text-muted-foreground/40">—</span>,
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
        ? <span className="text-muted-foreground truncate block max-w-[180px]" title={row.original.reception_venue}>{row.original.reception_venue}</span>
        : <span className="text-muted-foreground/40">—</span>,
    },
    {
      accessorKey: "contract_price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contract" />,
      cell: ({ row }) => row.original.contract_price
        ? <span className="text-muted-foreground" style={{ textAlign: 'right', display: 'block' }}>{formatCurrency(Math.round(Number(row.original.contract_price)))}</span>
        : <span className="text-muted-foreground/40" style={{ textAlign: 'right', display: 'block' }}>—</span>,
    },
    {
      accessorKey: "frames_total",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Frames" />,
      cell: ({ row }) => row.original.frames_total > 0
        ? <span className="text-muted-foreground" style={{ textAlign: 'right', display: 'block' }}>{formatCurrency(Math.round(row.original.frames_total))}</span>
        : <span className="text-muted-foreground/40" style={{ textAlign: 'right', display: 'block' }}>—</span>,
    },
    {
      accessorKey: "extras_total",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Extras" />,
      cell: ({ row }) => row.original.extras_total > 0
        ? <span className="text-muted-foreground" style={{ textAlign: 'right', display: 'block' }}>{formatCurrency(Math.round(row.original.extras_total))}</span>
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
      accessorKey: "balance_owing",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
      cell: ({ row }) => {
        const bal = Number(row.original.balance_owing) || 0
        return bal > 0
          ? <span className="font-semibold text-red-600" style={{ textAlign: 'right', display: 'block' }}>{formatCurrency(Math.round(bal))}</span>
          : <span className="text-muted-foreground/50 font-normal" style={{ textAlign: 'right', display: 'block' }}>$0</span>
      },
    },
  ], [])

  // Stats computed from loaded data
  const stats = useMemo(() => {
    const byYear = { 2025: 0, 2026: 0, 2027: 0 }
    const byPackage = { photo_only: 0, photo_video: 0 }
    const byFrame = { bought: 0, pending: 0, noSale: 0 }

    couples.forEach(c => {
      const year = c.wedding_date ? new Date(c.wedding_date).getFullYear() : null
      if (year && year in byYear) byYear[year as keyof typeof byYear]++
      if (c.package_type === 'photo_only') byPackage.photo_only++
      else if (c.package_type === 'photo_video') byPackage.photo_video++
      const fs = c.frame_sale_status?.toUpperCase()
      if (fs === 'BOUGHT') byFrame.bought++
      else if (fs === 'NO FRAME SALE') byFrame.noSale++
      else byFrame.pending++
    })

    return { byYear, byPackage, byFrame }
  }, [couples])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Couples</h1>
          <p className="text-muted-foreground">{couples.length} couples in database</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveImporter(v => v === 'contract' ? 'none' : 'contract')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeImporter === 'contract'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            New Couple Contract
          </button>
          <button
            onClick={() => setActiveImporter(v => v === 'extras' ? 'none' : 'extras')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeImporter === 'extras'
                ? 'bg-teal-600 text-white'
                : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
            }`}
          >
            <Package className="h-4 w-4" />
            Frames & Albums Invoice
          </button>
        </div>
      </div>

      {/* Importers — toggled by header buttons */}
      {activeImporter === 'contract' && (
        <PdfImporter
          defaultOpen
          onImportComplete={() => { setRefreshKey(k => k + 1); setActiveImporter('none') }}
        />
      )}
      {activeImporter === 'extras' && (
        <ExtrasImporter
          defaultOpen
          onImportComplete={() => { setRefreshKey(k => k + 1); setActiveImporter('none') }}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Weddings by Year */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-blue-500" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Weddings by Year</h3>
          </div>
          <div className="space-y-1.5">
            {([2025, 2026, 2027] as const).map(yr => (
              <div
                key={yr}
                onClick={() => setYearFilter(yearFilter === yr ? 'all' : yr)}
                className={`flex items-center justify-between rounded px-2 py-0.5 -mx-2 cursor-pointer transition-colors ${yearFilter === yr ? 'bg-blue-100 text-blue-800' : 'hover:bg-muted'}`}
              >
                <span className="text-sm">{yr}</span>
                <span className="text-sm font-semibold">{stats.byYear[yr]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Package Type */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Package Type</h3>
          </div>
          <div className="space-y-1.5">
            <div
              onClick={() => setPackageFilter(packageFilter === 'photo_only' ? 'all' : 'photo_only')}
              className={`flex items-center justify-between rounded px-2 py-0.5 -mx-2 cursor-pointer transition-colors ${packageFilter === 'photo_only' ? 'bg-emerald-100 text-emerald-800' : 'hover:bg-muted'}`}
            >
              <span className="text-sm">Photo Only</span>
              <span className="text-sm font-semibold">{stats.byPackage.photo_only}</span>
            </div>
            <div
              onClick={() => setPackageFilter(packageFilter === 'photo_video' ? 'all' : 'photo_video')}
              className={`flex items-center justify-between rounded px-2 py-0.5 -mx-2 cursor-pointer transition-colors ${packageFilter === 'photo_video' ? 'bg-emerald-100 text-emerald-800' : 'hover:bg-muted'}`}
            >
              <span className="text-sm">Photo + Video</span>
              <span className="text-sm font-semibold">{stats.byPackage.photo_video}</span>
            </div>
          </div>
        </div>

        {/* Frame Sales */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Frame className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Frame Sales</h3>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bought</span>
              <span className="text-sm font-semibold text-green-600">{stats.byFrame.bought}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending</span>
              <span className="text-sm font-semibold text-amber-600">{stats.byFrame.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">No Sale</span>
              <span className="text-sm font-semibold text-muted-foreground">{stats.byFrame.noSale}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
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

        {/* Year filter */}
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="!w-auto"
        >
          <option value="all">All Years</option>
          {YEARS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Eng pipeline filter */}
        <select
          value={engFilter}
          onChange={(e) => setEngFilter(e.target.value)}
          className="!w-auto"
        >
          {ENG_STATES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Package filter */}
        <select
          value={packageFilter}
          onChange={(e) => setPackageFilter(e.target.value)}
          className="!w-auto"
        >
          <option value="all">All Packages</option>
          <option value="photo_only">Photo Only</option>
          <option value="photo_video">Photo + Video</option>
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filtered.length} of {couples.length} couples
        {yearFilter !== 'all' && ` — ${yearFilter}`}
        {engFilter !== 'all' && ` — ${ENG_STATES.find(s => s.value === engFilter)?.label}`}
        {packageFilter !== 'all' && ` — ${formatPackage(packageFilter)}`}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(row) => router.push(`/admin/couples/${row.id}`)}
        emptyMessage="No couples found matching your filters."
        pageSize={50}
      />
    </div>
  )
}
