'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { ProductionPageHeader, ProductionPills, ProductionSidebar } from '@/components/shared'
import { formatCurrency, formatDateCompact } from '@/lib/formatters'
import { motion } from 'framer-motion'

interface ExtrasOrder {
  id: string
  couple_id: string
  order_date: string | null
  status: string
  extras_sale_amount: number | null
  collage_type: string | null
  collage_size: string | null
  album_qty: number | null
  signing_book: boolean | null
  wedding_frame_size: string | null
  printed_5x5: boolean | null
  bride_first_name?: string | null
  groom_first_name?: string | null
  couple_name?: string
  wedding_date?: string | null
}

function getDaysPending(dateStr: string | null): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function daysBadgeClass(days: number): string {
  if (days >= 15) return 'bg-red-100 text-red-700 font-semibold'
  if (days >= 8) return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

function check(val: any): string {
  return val ? '✓' : '—'
}

export default function FrameSalesPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<ExtrasOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [declinedOpen, setDeclinedOpen] = useState(false)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('extras_orders')
          .select(`
            id,
            couple_id,
            order_date,
            status,
            extras_sale_amount,
            collage_type,
            collage_size,
            album_qty,
            signing_book,
            wedding_frame_size,
            printed_5x5,
            couples (
              couple_name,
              wedding_date,
              bride_first_name,
              groom_first_name
            )
          `)
          .order('order_date', { ascending: true })

        if (error) throw error

        setOrders((data || []).map((o: any) => ({
          ...o,
          couple_name: o.couples?.couple_name || 'Unknown',
          wedding_date: o.couples?.wedding_date || null,
          bride_first_name: o.couples?.bride_first_name || null,
          groom_first_name: o.couples?.groom_first_name || null,
        })))
      } catch (err) {
        console.error('[fetchOrders] Failed:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // ── Derived data ──

  const currentYear = new Date().getFullYear()

  const signedOrders = useMemo(() => orders.filter(o => o.status === 'signed'), [orders])
  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending'), [orders])
  const declinedOrders = useMemo(() => orders.filter(o => o.status === 'declined'), [orders])

  const orders2026 = useMemo(() => orders.filter(o => o.order_date && new Date(o.order_date).getFullYear() === currentYear), [orders, currentYear])
  const signed2026 = useMemo(() => orders2026.filter(o => o.status === 'signed'), [orders2026])
  const revenue2026 = useMemo(() => signed2026.reduce((s, o) => s + (Number(o.extras_sale_amount) || 0), 0), [signed2026])
  const avgSale2026 = signed2026.length > 0 ? Math.round(revenue2026 / signed2026.length) : 0
  const convRate2026 = orders2026.length > 0 ? Math.round((signed2026.length / orders2026.length) * 100) : 0

  // Sidebar stats
  const orders2025 = useMemo(() => orders.filter(o => o.order_date && new Date(o.order_date).getFullYear() === currentYear - 1), [orders, currentYear])
  const revenue2025 = useMemo(() => orders2025.filter(o => o.status === 'signed').reduce((s, o) => s + (Number(o.extras_sale_amount) || 0), 0), [orders2025])
  const collagesCount = useMemo(() => signedOrders.filter(o => o.collage_type).length, [signedOrders])
  const signingBooksCount = useMemo(() => signedOrders.filter(o => o.signing_book === true).length, [signedOrders])

  // Couple display name
  const coupleName = (o: ExtrasOrder) => {
    if (o.bride_first_name && o.groom_first_name) return `${o.bride_first_name} & ${o.groom_first_name}`
    return o.couple_name || 'Unknown'
  }

  // Signed table columns
  // Group signed orders by year with custom sort: current year first, future ascending, past descending
  const signedByYear = useMemo(() => {
    const groups: Record<number, ExtrasOrder[]> = {}
    signedOrders.forEach(o => {
      const year = o.order_date ? new Date(o.order_date).getFullYear() : currentYear
      if (!groups[year]) groups[year] = []
      groups[year].push(o)
    })
    const sortedYears = Object.keys(groups).map(Number).sort((a, b) => {
      const priorityA = a === currentYear ? 0 : a > currentYear ? 1 + (a - currentYear) : 100 + (currentYear - a)
      const priorityB = b === currentYear ? 0 : b > currentYear ? 1 + (b - currentYear) : 100 + (currentYear - b)
      return priorityA - priorityB
    })
    return sortedYears.map(year => ({ year, orders: groups[year] }))
  }, [signedOrders, currentYear])

  const signedColumns: ColumnDef<ExtrasOrder>[] = useMemo(() => [
    {
      id: 'couple',
      accessorFn: (row) => coupleName(row),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => <span className="font-medium">{coupleName(row.original)}</span>,
    },
    {
      id: 'wedding_date',
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDateCompact(row.original.wedding_date)}</span>,
    },
    {
      id: 'order_date',
      accessorKey: 'order_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order Date" />,
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDateCompact(row.original.order_date)}</span>,
    },
    {
      id: 'sale_amount',
      accessorFn: (row) => Number(row.extras_sale_amount) || 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sale Amount" />,
      cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.extras_sale_amount)}</span>,
    },
    {
      id: 'collage',
      header: 'Collage',
      cell: ({ row }) => check(row.original.collage_type),
      enableSorting: false,
    },
    {
      id: 'album',
      header: 'Album',
      cell: ({ row }) => check(row.original.album_qty && row.original.album_qty > 0),
      enableSorting: false,
    },
    {
      id: 'frame',
      header: 'Frame',
      cell: ({ row }) => check(row.original.wedding_frame_size),
      enableSorting: false,
    },
    {
      id: 'signing_book',
      header: 'Signing Book',
      cell: ({ row }) => check(row.original.signing_book),
      enableSorting: false,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/admin/albums/${row.original.id}/view`)}
          className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          title="View"
        >
          <Eye className="h-3 w-3" />
          View
        </button>
      ),
      enableSorting: false,
    },
  ], [router])

  // Declined table columns
  const declinedColumns: ColumnDef<ExtrasOrder>[] = useMemo(() => [
    {
      id: 'couple',
      accessorFn: (row) => coupleName(row),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => <span className="font-medium">{coupleName(row.original)}</span>,
    },
    {
      id: 'wedding_date',
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDateCompact(row.original.wedding_date)}</span>,
    },
    {
      id: 'sale_amount',
      accessorFn: (row) => Number(row.extras_sale_amount) || 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sale Amount" />,
      cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.extras_sale_amount)}</span>,
    },
  ], [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* SECTION 1 — HEADER */}
      <ProductionPageHeader
        title="Frame Sales"
        subtitle="2026 frame & album orders"
        actionLabel="New Sale"
        actionHref="/admin/sales/frames/new"
      />

      <ProductionPills pills={[
        { label: 'Signed', count: signedOrders.length, color: 'green' },
        { label: 'Pending', count: pendingOrders.length, color: 'yellow' },
        { label: 'Declined', count: declinedOrders.length, color: 'red' },
      ]} />

      <div className="flex">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 lg:border-r border-border">
        {/* SECTION 3 — KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Orders (2026)', value: String(orders2026.length) },
            { label: 'Signed (2026)', value: String(signed2026.length) },
            { label: 'Conversion Rate', value: `${convRate2026}%` },
            { label: 'Revenue (2026)', value: formatCurrency(revenue2026) },
            { label: 'Avg Sale', value: formatCurrency(avgSale2026) },
            { label: 'Declined (all time)', value: String(declinedOrders.length) },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* PENDING HERO BANNER */}
        {pendingOrders.length > 0 && (
          <motion.div
            animate={{ scale: [1, 1.015, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="border-2 border-amber-400 bg-amber-50 rounded-xl p-5 mb-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-amber-800 text-lg">Pending Frame Orders</h2>
                <p className="text-amber-700 mt-1">
                  {pendingOrders.length === 1
                    ? `${coupleName(pendingOrders[0])} needs a decision — ${getDaysPending(pendingOrders[0].order_date)}d waiting`
                    : `${pendingOrders.length} couples waiting`}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-amber-800">{pendingOrders.length}</div>
                <div className="text-sm text-amber-600">{pendingOrders.length === 1 ? 'order' : 'orders'}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* PENDING TABLE */}
        {pendingOrders.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">
              Pending Orders <span className="text-amber-600">({pendingOrders.length})</span>
            </h3>
            <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Couple</th>
                  <th className="text-left p-3">Wedding Date</th>
                  <th className="text-left p-3">Order Date</th>
                  <th className="text-left p-3">Sale Amount</th>
                  <th className="text-left p-3">Days Pending</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((order, i) => {
                  const days = getDaysPending(order.order_date)
                  return (
                    <tr key={order.id} className="border-t">
                      <td className="p-3">{coupleName(order)}</td>
                      <td className="p-3">{formatDateCompact(order.wedding_date)}</td>
                      <td className="p-3">{order.order_date ? formatDateCompact(order.order_date) : '—'}</td>
                      <td className="p-3">{formatCurrency(order.extras_sale_amount)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${daysBadgeClass(days)}`}>{days}d</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* SIGNED ORDERS TABLE — grouped by year */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-lg font-semibold">Signed Orders</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {signedOrders.length}
            </span>
          </div>
          {signedByYear.length === 0 ? (
            <p className="text-muted-foreground text-sm">No signed orders</p>
          ) : (
            signedByYear.map(({ year, orders: yearOrders }) => (
              <div key={year} className="mb-6">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {year} Sales
                  <span className="ml-2 text-xs font-normal">({yearOrders.length})</span>
                </h4>
                <DataTable
                  columns={signedColumns}
                  data={yearOrders}
                  showPagination={false}
                  emptyMessage="No signed orders"
                />
              </div>
            ))
          )}
        </div>

        {/* SECTION 6 — DECLINED ORDERS (collapsed by default) */}
        {declinedOrders.length > 0 && (
          <div>
            <button
              onClick={() => setDeclinedOpen(!declinedOpen)}
              className="flex items-center gap-3 py-3 hover:opacity-80"
            >
              {declinedOpen
                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
              }
              <span className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-sm font-semibold bg-red-100 text-red-700">
                DECLINED
              </span>
              <span className="text-sm text-muted-foreground">
                {declinedOrders.length} order{declinedOrders.length !== 1 ? 's' : ''}
              </span>
            </button>
            {declinedOpen && (
              <DataTable
                columns={declinedColumns}
                data={declinedOrders}
                showPagination={false}
                emptyMessage="No declined orders"
              />
            )}
          </div>
        )}
        </div>

        <ProductionSidebar boxes={[
          { label: '2026 ORDERS', value: orders2026.length, scrollToId: 'section-pending', color: 'teal' },
          { label: '2026 REVENUE', value: formatCurrency(revenue2026), scrollToId: 'section-pending', color: 'teal' },
          { label: '2025 ORDERS', value: orders2025.length, scrollToId: 'section-pending', color: 'default' },
          { label: '2025 REVENUE', value: formatCurrency(revenue2025), scrollToId: 'section-pending', color: 'default' },
          { label: 'COLLAGES', value: collagesCount, scrollToId: 'section-pending', color: 'blue' },
          { label: 'SIGNING BOOKS', value: signingBooksCount, scrollToId: 'section-pending', color: 'yellow' },
        ]} />
      </div>
    </div>
  )
}
