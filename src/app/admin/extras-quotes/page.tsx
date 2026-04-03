'use client'

import { useState, useEffect, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import { DataTable, DataTableColumnHeader, StatCard } from '@/components/ui'
import { ShoppingBag, DollarSign } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface ExtrasOrder {
  id: string
  couple_id: string | null
  order_date: string | null
  total: number | null
  created_at: string | null
  couples: { couple_name: string } | null
}

const ALLOWED_COUPLES = ['Justine & Josh', 'Georgia & Nikolas']

const columns: ColumnDef<ExtrasOrder>[] = [
  {
    accessorKey: "order_date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => row.original.order_date
      ? format(parseISO(row.original.order_date), 'MMM d, yyyy')
      : <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "couple_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
    cell: ({ row }) => <span className="font-medium">{row.original.couples?.couple_name || 'Unknown'}</span>,
    accessorFn: (row) => row.couples?.couple_name || 'Unknown',
  },
  {
    accessorKey: "total",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sale $" />,
    cell: ({ row }) => row.original.total
      ? <span className="font-medium" style={{ textAlign: 'right', display: 'block' }}>${Number(row.original.total).toLocaleString()}</span>
      : <span className="text-muted-foreground" style={{ textAlign: 'right', display: 'block' }}>—</span>,
  },
]

export default function FramesAlbumsPage() {
  const [orders, setOrders] = useState<ExtrasOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('extras_orders')
        .select('id, couple_id, order_date, total, created_at, couples(couple_name)')
        .gte('order_date', '2026-01-01')
        .lte('order_date', '2026-12-31')
        .order('order_date', { ascending: false })

      if (!error && data) {
        const filtered = (data as unknown as ExtrasOrder[]).filter(o =>
          o.couples?.couple_name && ALLOWED_COUPLES.includes(o.couples.couple_name)
        )
        setOrders(filtered)
      }
      setLoading(false)
    }
    fetchOrders()
  }, [])

  const stats = useMemo(() => {
    const numSales = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
    return { numSales, totalRevenue }
  }, [orders])

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
      <div>
        <h1 className="text-2xl font-bold">Frames & Albums</h1>
        <p className="text-muted-foreground">2026 extras sales</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <StatCard
          label="Sales"
          value={stats.numSales}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <StatCard
          label="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={orders}
        emptyMessage="No 2026 extras sales found."
        showPagination={false}
      />
    </div>
  )
}
