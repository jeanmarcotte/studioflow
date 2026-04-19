'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { supabase } from '@/lib/supabase'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import { ProductionPageHeader, ProductionPills, ProductionSidebar } from '@/components/shared'

// Types
interface ExtrasOrder {
  id: string
  couple_id: string
  order_date: string
  status: string
  extras_sale_amount: number | null
  collage_size: string | null
  album_qty: number | null
  signing_book: boolean | null
  wedding_frame_size: string | null
  printed_5x5: boolean | null
  couple_name?: string
  wedding_date?: string
}

// Fetch all orders with couple data (no year filter — show all)
async function fetchOrders(): Promise<ExtrasOrder[]> {
  const { data, error } = await supabase
    .from('extras_orders')
    .select(`
      id,
      couple_id,
      order_date,
      status,
      extras_sale_amount,
      collage_size,
      album_qty,
      signing_book,
      wedding_frame_size,
      printed_5x5,
      couples (
        couple_name,
        wedding_date
      )
    `)
    .order('order_date', { ascending: false })

  if (error) throw error

  return (data || []).map((order: any) => ({
    ...order,
    couple_name: order.couples?.couple_name || 'Unknown',
    wedding_date: order.couples?.wedding_date || null,
  }))
}

// Item icons
function ItemIcons({ order }: { order: ExtrasOrder }) {
  const items = []
  if (order.collage_size) items.push('🖼️')
  if (order.album_qty && order.album_qty > 0) items.push('📖')
  if (order.signing_book) items.push('✍️')
  if (order.wedding_frame_size) items.push('🎨')
  if (order.printed_5x5) items.push('📸')
  return <span className="text-lg">{items.join(' ') || '—'}</span>
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function FrameSalesPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<ExtrasOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const data = await fetchOrders()
        setOrders(data)
      } catch (err) {
        console.error('[fetchOrders] Failed:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const toggleLane = (key: string) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Filter by search
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders
    const q = searchQuery.toLowerCase()
    return orders.filter(o => (o.couple_name || '').toLowerCase().includes(q))
  }, [orders, searchQuery])

  // Group by status
  const signedOrders = useMemo(() => filteredOrders.filter(o => o.status === 'signed'), [filteredOrders])
  const completedOrders = useMemo(() => filteredOrders.filter(o => o.status === 'completed'), [filteredOrders])
  const declinedOrders = useMemo(() => filteredOrders.filter(o => o.status === 'declined'), [filteredOrders])
  const pendingOrders = useMemo(() => filteredOrders.filter(o => o.status === 'pending'), [filteredOrders])

  // Stats
  const signedRevenue = useMemo(() => signedOrders.reduce((sum, o) => sum + (o.extras_sale_amount || 0), 0), [signedOrders])

  // Column definitions
  const columns: ColumnDef<ExtrasOrder>[] = useMemo(() => [
    {
      accessorKey: 'couple_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => (
        <button
          onClick={() => row.original.couple_id && router.push(`/admin/couples/${row.original.couple_id}`)}
          className="text-left font-medium hover:underline"
        >
          {row.original.couple_name || 'Unknown Couple'}
        </button>
      ),
    },
    {
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      cell: ({ row }) => {
        const date = row.original.wedding_date
        return date ? <span className="whitespace-nowrap">{format(new Date(date), 'EEE MMM d, yyyy')}</span> : '—'
      },
    },
    {
      accessorKey: 'extras_sale_amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sale Amount" />,
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.extras_sale_amount)}</span>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      cell: ({ row }) => <ItemIcons order={row.original} />,
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const s = row.original.status
        const colors = s === 'signed' ? 'bg-green-100 text-green-700'
          : s === 'completed' ? 'bg-blue-100 text-blue-700'
          : s === 'declined' ? 'bg-red-100 text-red-700'
          : 'bg-amber-100 text-amber-700'
        const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown'
        return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors}`}>{label}</span>
      },
    },
  ], [router])

  // Section renderer
  const renderSection = (id: string, label: string, data: ExtrasOrder[], badgeClass: string) => {
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
            {data.length} order{data.length !== 1 ? 's' : ''}
          </span>
        </button>
        {!isCollapsed && (
          <DataTable
            columns={columns}
            data={data}
            showPagination={false}
            emptyMessage="No orders"
          />
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <ProductionPageHeader
        title="Frames & Albums"
        subtitle="Extras orders by status"
        reportHref="/admin/production/report"
        actionLabel="New Sale"
        actionHref="/admin/sales/frames/new"
      />

      <ProductionPills pills={[
        { label: 'Signed', count: signedOrders.length, color: 'green' },
        { label: 'Completed', count: completedOrders.length, color: 'blue' },
        { label: 'Declined', count: declinedOrders.length, color: 'red' },
        { label: 'Pending', count: pendingOrders.length, color: 'yellow' },
      ]} />

      {/* Content area: main panel + stats sidebar */}
      <div className="flex">
        {/* Main Panel */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-border">
          {/* Search */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search couples..."
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-ring"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
          </div>

          {renderSection('section-signed', 'SIGNED', signedOrders, 'bg-green-100 text-green-700')}
          {renderSection('section-completed', 'COMPLETED', completedOrders, 'bg-blue-100 text-blue-700')}
          {renderSection('section-declined', 'DECLINED', declinedOrders, 'bg-red-100 text-red-700')}
          {renderSection('section-pending', 'PENDING', pendingOrders, 'bg-amber-100 text-amber-700')}
        </div>

        <ProductionSidebar boxes={[
          { label: 'TOTAL ORDERS', value: orders.length, scrollToId: 'section-signed', color: 'default' },
          { label: 'SIGNED', value: signedOrders.length, scrollToId: 'section-signed', color: 'green' },
          { label: 'COMPLETED', value: completedOrders.length, scrollToId: 'section-completed', color: 'blue' },
          { label: 'DECLINED', value: declinedOrders.length, scrollToId: 'section-declined', color: 'red' },
          { label: 'REVENUE', value: formatCurrency(signedRevenue), scrollToId: 'section-signed', color: 'teal' },
        ]} />
      </div>
    </div>
  )
}
