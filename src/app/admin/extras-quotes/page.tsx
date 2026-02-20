'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
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
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <ShoppingBag className="h-4 w-4" />
            Sales
          </div>
          <div className="text-2xl font-bold">{stats.numSales}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <DollarSign className="h-4 w-4" />
            Total Revenue
          </div>
          <div className="text-2xl font-bold">
            ${stats.totalRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Couple</th>
                <th className="text-right p-3 font-medium">Sale $</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-muted-foreground">
                    <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No 2026 extras sales found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-3">
                      {order.order_date
                        ? format(parseISO(order.order_date), 'MMM d, yyyy')
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="p-3 font-medium">
                      {order.couples?.couple_name || 'Unknown'}
                    </td>
                    <td className="p-3 text-right">
                      {order.total
                        ? <span className="font-medium">${Number(order.total).toLocaleString()}</span>
                        : <span className="text-muted-foreground">—</span>
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
