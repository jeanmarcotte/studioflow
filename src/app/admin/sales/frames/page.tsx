'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

// ── Types ────────────────────────────────────────────────────────────────────

interface ExtrasOrder {
  id: string
  couple_id: string
  couple_name: string
  wedding_date: string | null
  order_date: string | null
  status: string | null
  extras_sale_amount: number | null
  order_type: string | null
}

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  signed: { label: 'Signed', variant: 'default' },
  completed: { label: 'Completed', variant: 'secondary' },
  declined: { label: 'Declined', variant: 'destructive' },
  pending: { label: 'Pending', variant: 'outline' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === 0) return '—'
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// ── Collapsible Table Section ────────────────────────────────────────────────

function OrderSection({
  title,
  orders,
  totalAmount,
  defaultOpen = false,
  onRowClick,
}: {
  title: string
  orders: ExtrasOrder[]
  totalAmount: number
  defaultOpen?: boolean
  onRowClick: (order: ExtrasOrder) => void
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const statusKey = title.toLowerCase()
  const config = STATUS_CONFIG[statusKey] || { label: title, variant: 'outline' as const }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="font-medium">{title}</span>
          <Badge variant={config.variant}>{orders.length}</Badge>
        </div>
        <span className="font-semibold">{formatCurrency(totalAmount)}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {orders.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No orders in this category</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Couple</TableHead>
                <TableHead>Wedding Date</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order, index) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick(order)}
                >
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{order.couple_name}</TableCell>
                  <TableCell>{formatDate(order.wedding_date)}</TableCell>
                  <TableCell>{formatDate(order.order_date)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(order.extras_sale_amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

// ── Stats Sidebar ────────────────────────────────────────────────────────────

function StatsSidebar({ orders }: { orders: ExtrasOrder[] }) {
  const signedOrders = orders.filter(o => o.status === 'signed')
  const completedOrders = orders.filter(o => o.status === 'completed')
  const declinedOrders = orders.filter(o => o.status === 'declined')

  const revenueOrders = [...signedOrders, ...completedOrders]
  const totalRevenue = revenueOrders.reduce(
    (sum, o) => sum + (Number(o.extras_sale_amount) || 0), 0
  )

  const avgSale = revenueOrders.length > 0
    ? totalRevenue / revenueOrders.length
    : 0

  const conversionRate = orders.length > 0
    ? (revenueOrders.length / orders.length) * 100
    : 0

  return (
    <div className="space-y-4 w-[280px] shrink-0 hidden lg:block">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Average Sale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(avgSale)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{conversionRate.toFixed(0)}%</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">By Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Signed</span>
            <Badge variant="default">{signedOrders.length}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Completed</span>
            <Badge variant="secondary">{completedOrders.length}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Declined</span>
            <Badge variant="destructive">{declinedOrders.length}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function FrameSalesPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<ExtrasOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true)
      setError(null)

      const [extrasRes, couplesRes] = await Promise.all([
        supabase
          .from('extras_orders')
          .select('id, couple_id, extras_sale_amount, status, order_date, order_type')
          .in('order_type', ['frames', 'frames_albums'])
          .order('order_date', { ascending: false }),
        supabase
          .from('couples')
          .select('id, couple_name, wedding_date'),
      ])

      if (extrasRes.error) {
        setError(extrasRes.error.message)
        setLoading(false)
        return
      }

      // Build couple lookup
      const coupleMap = new Map<string, { couple_name: string; wedding_date: string | null }>()
      if (couplesRes.data) {
        for (const c of couplesRes.data) {
          coupleMap.set(c.id, { couple_name: c.couple_name, wedding_date: c.wedding_date })
        }
      }

      // Enrich orders with couple data
      const enriched: ExtrasOrder[] = (extrasRes.data || []).map((row: any) => {
        const couple = coupleMap.get(row.couple_id)
        return {
          ...row,
          couple_name: couple?.couple_name || 'Unknown Couple',
          wedding_date: couple?.wedding_date || null,
        }
      })

      setOrders(enriched)
      setLoading(false)
    }

    fetchOrders()
  }, [])

  // Filter by year and search
  const filteredOrders = orders.filter(order => {
    if (year !== 'all') {
      const orderYear = order.wedding_date
        ? new Date(order.wedding_date + 'T12:00:00').getFullYear().toString()
        : null
      if (orderYear !== year) return false
    }

    if (search) {
      const searchLower = search.toLowerCase()
      if (!order.couple_name.toLowerCase().includes(searchLower)) return false
    }

    return true
  })

  // Group by status
  const signedOrders = filteredOrders.filter(o => o.status === 'signed' || o.status === 'paid' || o.status === 'confirmed')
  const completedOrders = filteredOrders.filter(o => o.status === 'completed')
  const declinedOrders = filteredOrders.filter(o => o.status === 'declined' || o.status === 'no_sale')
  const pendingOrders = filteredOrders.filter(o => o.status === 'pending' || o.status === 'active')

  // Calculate totals
  const signedTotal = signedOrders.reduce((sum, o) => sum + (Number(o.extras_sale_amount) || 0), 0)
  const completedTotal = completedOrders.reduce((sum, o) => sum + (Number(o.extras_sale_amount) || 0), 0)
  const declinedTotal = 0
  const pendingTotal = pendingOrders.reduce((sum, o) => sum + (Number(o.extras_sale_amount) || 0), 0)

  const handleRowClick = (order: ExtrasOrder) => {
    if (order.couple_id) {
      router.push(`/admin/couples/${order.couple_id}`)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-8">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading frame sales: {error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Frame Sales</h1>
          <p className="text-muted-foreground">C2 engagement session extras and frame orders</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={year} onValueChange={(val) => val && setYear(val)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by couple name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Empty state */}
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No frame sales found for {year === 'all' ? 'any year' : year}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Signed Section */}
              {signedOrders.length > 0 && (
                <OrderSection
                  title="Signed"
                  orders={signedOrders}
                  totalAmount={signedTotal}
                  defaultOpen={true}
                  onRowClick={handleRowClick}
                />
              )}

              {/* Pending Section */}
              {pendingOrders.length > 0 && (
                <OrderSection
                  title="Pending"
                  orders={pendingOrders}
                  totalAmount={pendingTotal}
                  defaultOpen={false}
                  onRowClick={handleRowClick}
                />
              )}

              {/* Completed Section */}
              {completedOrders.length > 0 && (
                <OrderSection
                  title="Completed"
                  orders={completedOrders}
                  totalAmount={completedTotal}
                  defaultOpen={false}
                  onRowClick={handleRowClick}
                />
              )}

              {/* Declined Section */}
              {declinedOrders.length > 0 && (
                <OrderSection
                  title="Declined"
                  orders={declinedOrders}
                  totalAmount={declinedTotal}
                  defaultOpen={false}
                  onRowClick={handleRowClick}
                />
              )}
            </>
          )}
        </div>

        {/* Stats Sidebar */}
        <StatsSidebar orders={filteredOrders} />
      </div>
    </div>
  )
}
