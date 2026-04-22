'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { formatDateCompact } from '@/lib/formatters'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MoreVertical } from 'lucide-react'

interface ClientOrderRow {
  id: string
  order_number: string
  couple_id: string
  couple_name: string
  order_type: string
  vendor: string | null
  lab_status: string
  created_at: string
  item_count: number
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  sent_to_lab: 'bg-blue-100 text-blue-700',
  at_lab: 'bg-indigo-100 text-indigo-700',
  back_at_studio: 'bg-teal-100 text-teal-700',
  picked_up: 'bg-green-100 text-green-700',
}

const TYPE_COLORS: Record<string, string> = {
  photo: 'bg-amber-100 text-amber-700',
  video: 'bg-violet-100 text-violet-700',
}

export default function ClientOrdersPage() {
  const router = useRouter()
  const [rows, setRows] = useState<ClientOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: orders } = await supabase
        .from('client_orders')
        .select('id, order_number, couple_id, order_type, vendor, lab_status, created_at, couples(bride_first_name, groom_first_name)')
        .order('created_at', { ascending: false })

      if (!orders) { setLoading(false); return }

      // Count jobs per order
      const orderIds = orders.map((o: any) => o.id)
      const { data: jobs } = await supabase
        .from('jobs')
        .select('client_order_id')
        .in('client_order_id', orderIds)

      const countMap = new Map<string, number>()
      ;(jobs ?? []).forEach((j: any) => {
        countMap.set(j.client_order_id, (countMap.get(j.client_order_id) ?? 0) + 1)
      })

      setRows(orders.map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        couple_id: o.couple_id,
        couple_name: o.couples ? `${o.couples.bride_first_name} & ${o.couples.groom_first_name}` : '\u2014',
        order_type: o.order_type,
        vendor: o.vendor,
        lab_status: o.lab_status,
        created_at: o.created_at,
        item_count: countMap.get(o.id) ?? 0,
      })))
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let result = rows
    if (statusFilter !== 'all') result = result.filter(r => r.lab_status === statusFilter)
    if (typeFilter !== 'all') result = result.filter(r => r.order_type === typeFilter)
    if (yearFilter !== 'all') {
      result = result.filter(r => {
        try { return new Date(r.created_at).getFullYear() === parseInt(yearFilter) } catch { return false }
      })
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(r =>
        r.couple_name.toLowerCase().includes(q) ||
        r.order_number.toLowerCase().includes(q) ||
        (r.vendor ?? '').toLowerCase().includes(q)
      )
    }
    return result
  }, [rows, statusFilter, typeFilter, yearFilter, search])

  const columns: ColumnDef<ClientOrderRow>[] = useMemo(() => [
    {
      accessorKey: 'order_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order #" />,
      cell: ({ row }) => (
        <a
          href={`/admin/orders/${row.original.id}/view`}
          className="text-blue-600 hover:underline font-medium text-sm"
        >
          {row.original.order_number}
        </a>
      ),
    },
    {
      id: 'couple',
      accessorFn: (row) => row.couple_name,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/admin/couples/${row.original.couple_id}`)}
          className="text-left font-medium hover:underline text-sm"
        >
          {row.original.couple_name}
        </button>
      ),
    },
    {
      accessorKey: 'order_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[row.original.order_type] ?? 'bg-gray-100 text-gray-700'}`}>
          {row.original.order_type}
        </span>
      ),
    },
    {
      accessorKey: 'vendor',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.vendor ?? '\u2014'}</span>,
    },
    {
      accessorKey: 'item_count',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Items" />,
      cell: ({ row }) => <span className="text-sm">{row.original.item_count}</span>,
    },
    {
      accessorKey: 'lab_status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.original.lab_status] ?? 'bg-gray-100 text-gray-700'}`}>
          {row.original.lab_status.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDateCompact(row.original.created_at)}</span>,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="p-1 rounded hover:bg-gray-100">
              <MoreVertical size={16} className="text-gray-500" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 p-1">
            <a
              href={`/admin/orders/${row.original.id}/view`}
              className="block px-3 py-1.5 text-sm rounded hover:bg-gray-100 text-gray-700"
            >
              View Order
            </a>
            <a
              href={`/admin/orders/${row.original.id}/view?print=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-1.5 text-sm rounded hover:bg-gray-100 text-gray-700"
            >
              Print Order
            </a>
          </PopoverContent>
        </Popover>
      ),
    },
  ], [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <div className="border-b border-border bg-background px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">Client Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} total orders</p>
      </div>

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v) }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent_to_lab">Sent to Lab</SelectItem>
              <SelectItem value="at_lab">At Lab</SelectItem>
              <SelectItem value="back_at_studio">Back at Studio</SelectItem>
              <SelectItem value="picked_up">Picked Up</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => { if (v) setTypeFilter(v) }}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="photo">Photo</SelectItem>
              <SelectItem value="video">Video</SelectItem>
            </SelectContent>
          </Select>

          <Select value={yearFilter} onValueChange={(v) => { if (v) setYearFilter(v) }}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />

          <span className="text-sm text-muted-foreground ml-auto">
            Showing {filtered.length} of {rows.length}
          </span>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          showPagination={false}
          emptyMessage="No client orders found"
        />
      </div>
    </div>
  )
}
