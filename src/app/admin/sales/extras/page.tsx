'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateCompact } from '@/lib/formatters'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { ProductionPageHeader, ProductionSidebar } from '@/components/shared'

// ── Interfaces ──────────────────────────────────────────────────────────────

interface ExtrasRow {
  id: string
  couple_id: string
  product_code: string | null
  item_name: string
  category: string
  quantity: number | null
  unit_price: number | null
  subtotal: number | null
  hst: number | null
  total: number | null
  payment_note: string | null
  invoice_date: string | null
  couple_name: string
  couple_phase: string
  wedding_date: string | null
  wedding_year: number | null
}

const PHASE_OPTIONS = [
  { value: 'all', label: 'All Phases' },
  { value: 'new_client', label: 'New Client' },
  { value: 'pre_engagement', label: 'Pre-Engagement' },
  { value: 'post_engagement', label: 'Post-Engagement' },
  { value: 'pre_wedding', label: 'Pre-Wedding' },
  { value: 'post_wedding', label: 'Post-Wedding' },
  { value: 'post_production', label: 'Post-Production' },
  { value: 'completed', label: 'Completed' },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return formatCurrency(n)
}

function fmtDate(dateStr: string | null): string {
  return formatDateCompact(dateStr)
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function ExtrasSalesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<ExtrasRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [phaseFilter, setPhaseFilter] = useState<string>('all')
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('c3_line_items')
        .select('id, couple_id, product_code, quantity, unit_price, subtotal, hst, total, payment_note, invoice_date, product_catalog(item_name, category), couples(couple_name, wedding_date, wedding_year, phase)')
        .order('invoice_date', { ascending: false })

      if (error) {
        console.error('[ExtrasSalesPage] fetch error:', error)
        setLoading(false)
        return
      }

      setRows(
        (data || []).map((r: any) => ({
          id: r.id,
          couple_id: r.couple_id,
          product_code: r.product_code,
          item_name: r.product_catalog?.item_name || r.product_code || '—',
          category: r.product_catalog?.category || 'Other',
          quantity: r.quantity != null ? Number(r.quantity) : null,
          unit_price: r.unit_price != null ? Number(r.unit_price) : null,
          subtotal: r.subtotal != null ? Number(r.subtotal) : null,
          hst: r.hst != null ? Number(r.hst) : null,
          total: r.total != null ? Number(r.total) : null,
          payment_note: r.payment_note,
          invoice_date: r.invoice_date,
          couple_name: r.couples?.couple_name || '—',
          couple_phase: r.couples?.phase || 'new_client',
          wedding_date: r.couples?.wedding_date || null,
          wedding_year: r.couples?.wedding_year || null,
        }))
      )
      setLoading(false)
    } catch (err) {
      console.error('[ExtrasSalesPage] error:', err)
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleLane = (key: string) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Filter by search
  const filteredRows = useMemo(() => {
    let result = rows
    if (phaseFilter !== 'all') {
      result = result.filter(r => r.couple_phase === phaseFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(r => r.couple_name.toLowerCase().includes(q) || r.item_name.toLowerCase().includes(q) || (r.product_code || '').toLowerCase().includes(q))
    }
    return result
  }, [rows, searchQuery, phaseFilter])

  // Group by year
  const rows2026 = useMemo(() => filteredRows.filter(r => r.wedding_year === 2026), [filteredRows])
  const rows2025 = useMemo(() => filteredRows.filter(r => r.wedding_year === 2025), [filteredRows])

  // KPI cards — derived from invoice_date year
  const kpiExtras2026 = useMemo(() => rows.filter(r => r.invoice_date && new Date(r.invoice_date).getFullYear() === 2026), [rows])
  const kpiExtras2025 = useMemo(() => rows.filter(r => r.invoice_date && new Date(r.invoice_date).getFullYear() === 2025), [rows])
  const kpiCouples2026 = useMemo(() => new Set(kpiExtras2026.map(r => r.couple_id)).size, [kpiExtras2026])
  const kpiLineItems2026 = kpiExtras2026.length
  const kpiRevenue2026 = useMemo(() => kpiExtras2026.reduce((s, r) => s + (Number(r.total) || 0), 0), [kpiExtras2026])
  const kpiAvgPerItem = kpiLineItems2026 > 0 ? Math.round(kpiRevenue2026 / kpiLineItems2026) : 0
  const kpiCategories2026 = useMemo(() => new Set(kpiExtras2026.map(r => r.category)).size, [kpiExtras2026])
  const kpiRevenue2025 = useMemo(() => kpiExtras2025.reduce((s, r) => s + (Number(r.total) || 0), 0), [kpiExtras2025])
  const kpiGrowthMultiple = kpiRevenue2025 > 0 ? Math.round(kpiRevenue2026 / kpiRevenue2025) : 0

  // Sidebar stats (2026 by invoice_date, grouped by category)
  const categoryCount = useCallback((cat: string) => kpiExtras2026.filter(r => r.category === cat).length, [kpiExtras2026])
  const sidebarHiRes = useMemo(() => categoryCount('Hi-Res Files'), [categoryCount])
  const sidebarRawVideos = useMemo(() => categoryCount('Raw Video'), [categoryCount])
  const sidebarExtraHours = useMemo(() => categoryCount('Hours'), [categoryCount])
  const sidebarParentAlbums = useMemo(() => categoryCount('Parent Album'), [categoryCount])

  // Column definitions
  const columns: ColumnDef<ExtrasRow>[] = useMemo(() => [
    {
      accessorKey: 'couple_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => (
        <button
          onClick={() => row.original.couple_id && router.push(`/admin/couples/${row.original.couple_id}`)}
          className="text-left font-medium hover:underline"
        >
          {row.original.couple_name}
        </button>
      ),
    },
    {
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      cell: ({ row }) => <span className="whitespace-nowrap">{fmtDate(row.original.wedding_date)}</span>,
    },
    {
      accessorKey: 'item_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm">{row.original.item_name}</span>
          {row.original.product_code && (
            <span className="font-mono text-[10px] text-muted-foreground">{row.original.product_code}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.category}</span>,
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Qty" />,
      cell: ({ row }) => <span>{row.original.quantity ?? '—'}</span>,
    },
    {
      accessorKey: 'unit_price',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Unit Price" />,
      cell: ({ row }) => <span>{row.original.unit_price != null ? fmtMoney(row.original.unit_price) : '—'}</span>,
    },
    {
      accessorKey: 'total',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => <span className="font-medium">{row.original.total != null ? fmtMoney(row.original.total) : '—'}</span>,
    },
  ], [router])

  // Section renderer
  const renderSection = (id: string, label: string, data: ExtrasRow[], badgeClass: string) => {
    const isCollapsed = collapsedLanes.has(id)
    return (
      <div id={id} className="mb-6">
        <button
          onClick={() => toggleLane(id)}
          className="flex items-center gap-3 py-3 hover:opacity-80"
        >
          {isCollapsed
            ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
          <span className={`inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-sm font-semibold ${badgeClass}`}>
            {label}
          </span>
          <span className="text-sm text-muted-foreground">
            {data.length} sale{data.length !== 1 ? 's' : ''}
          </span>
        </button>
        {!isCollapsed && (
          <DataTable
            columns={columns}
            data={data}
            showPagination={false}
            emptyMessage="No sales"
          />
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <ProductionPageHeader
        title="Extras Sales"
        subtitle="Additional sales by year"
        actionLabel="New Sale"
        actionHref="/admin/sales/extras/new"
      />

      <div className="flex">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 lg:border-r border-border">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Couples (2026)', value: String(kpiCouples2026) },
              { label: 'Line Items', value: String(kpiLineItems2026) },
              { label: 'Revenue (2026)', value: formatCurrency(kpiRevenue2026) },
              { label: 'Avg Per Item', value: formatCurrency(kpiAvgPerItem) },
              { label: 'Categories', value: String(kpiCategories2026) },
              { label: 'vs 2025', value: `${kpiGrowthMultiple}×`, highlight: true },
            ].map((card: { label: string; value: string; highlight?: boolean }) => (
              <div key={card.label} className="bg-white border rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${card.highlight ? 'text-amber-600' : ''}`}>{card.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Search + Phase Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search couples or products..."
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-ring"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="text-sm rounded-md border border-input bg-background px-3 py-2.5"
            >
              {PHASE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {renderSection('section-2026', '2026 SALES', rows2026, 'bg-teal-100 text-teal-700')}
          {renderSection('section-2025', '2025 SALES', rows2025, 'bg-gray-100 text-gray-700')}
        </div>

        <ProductionSidebar boxes={[
          { label: 'HI-RES FILES', value: sidebarHiRes, scrollToId: 'section-2026', color: 'teal' },
          { label: 'RAW VIDEOS', value: sidebarRawVideos, scrollToId: 'section-2026', color: 'blue' },
          { label: 'EXTRA HOURS', value: sidebarExtraHours, scrollToId: 'section-2026', color: 'yellow' },
          { label: 'PARENT ALBUMS', value: sidebarParentAlbums, scrollToId: 'section-2026', color: 'default' },
          { label: 'AVG ITEM VALUE', value: fmtMoney(kpiAvgPerItem), scrollToId: 'section-2026', color: 'teal' },
          { label: 'TOTAL COUPLES', value: kpiCouples2026, scrollToId: 'section-2026', color: 'green' },
        ]} />
      </div>
    </div>
  )
}
