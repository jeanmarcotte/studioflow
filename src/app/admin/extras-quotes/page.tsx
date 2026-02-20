'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { ShoppingBag, Search, ChevronUp, ChevronDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface ExtrasOrder {
  id: string
  couple_id: string | null
  order_date: string | null
  order_type: string | null
  subtotal: number | null
  tax: number | null
  discount: number | null
  total: number | null
  status: string | null
  created_at: string | null
  couples: { couple_name: string } | null
}

type SortField = 'couple_name' | 'order_date' | 'total' | 'status' | 'created_at'
type SortDir = 'asc' | 'desc'

const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'delivered', label: 'Delivered' },
]

function statusBadge(status: string | null) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    ordered: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
  }
  const cls = map[status] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function ExtrasQuotesPage() {
  const [orders, setOrders] = useState<ExtrasOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('extras_orders')
        .select('id, couple_id, order_date, order_type, subtotal, tax, discount, total, status, created_at, couples(couple_name)')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setOrders(data as unknown as ExtrasOrder[])
      }
      setLoading(false)
    }
    fetchOrders()
  }, [])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let result = [...orders]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(r =>
        r.couples?.couple_name?.toLowerCase().includes(q) ||
        r.order_type?.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter)
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'couple_name':
          cmp = (a.couples?.couple_name || '').localeCompare(b.couples?.couple_name || '')
          break
        case 'order_date':
          cmp = (a.order_date || '').localeCompare(b.order_date || '')
          break
        case 'total':
          cmp = (Number(a.total) || 0) - (Number(b.total) || 0)
          break
        case 'status':
          cmp = (a.status || '').localeCompare(b.status || '')
          break
        case 'created_at':
          cmp = (a.created_at || '').localeCompare(b.created_at || '')
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [orders, search, statusFilter, sortField, sortDir])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

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
        <h1 className="text-2xl font-bold">Extras Quotes</h1>
        <p className="text-muted-foreground">{orders.length} extras orders from frames & albums</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by couple name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 !w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="!w-auto"
        >
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filtered.length} of {orders.length} orders
        {statusFilter !== 'all' && ` — ${statusFilter}`}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">
                  <button onClick={() => handleSort('couple_name')} className="group flex items-center gap-1 hover:text-foreground">
                    Couple <SortIcon field="couple_name" />
                  </button>
                </th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Type</th>
                <th className="text-left p-3 font-medium">
                  <button onClick={() => handleSort('order_date')} className="group flex items-center gap-1 hover:text-foreground">
                    Order Date <SortIcon field="order_date" />
                  </button>
                </th>
                <th className="text-left p-3 font-medium hidden md:table-cell">
                  <button onClick={() => handleSort('status')} className="group flex items-center gap-1 hover:text-foreground">
                    Status <SortIcon field="status" />
                  </button>
                </th>
                <th className="text-right p-3 font-medium">
                  <button onClick={() => handleSort('total')} className="group flex items-center gap-1 justify-end hover:text-foreground">
                    Total <SortIcon field="total" />
                  </button>
                </th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">
                  <button onClick={() => handleSort('created_at')} className="group flex items-center gap-1 hover:text-foreground">
                    Created <SortIcon field="created_at" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No extras orders found.
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-3">
                      <div className="font-medium">{order.couples?.couple_name || 'Unknown'}</div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {order.order_type || '—'}
                    </td>
                    <td className="p-3">
                      {order.order_date
                        ? format(parseISO(order.order_date), 'MMM d, yyyy')
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      {statusBadge(order.status)}
                    </td>
                    <td className="p-3 text-right">
                      {order.total
                        ? <span className="font-medium">${Number(order.total).toLocaleString()}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">
                      {order.created_at
                        ? format(parseISO(order.created_at), 'MMM d, yyyy')
                        : '—'
                      }
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
