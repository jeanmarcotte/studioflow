"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQueryState } from "nuqs"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { ControlPageTemplate } from "@/components/templates"
import {
  DataTable,
  DataTableColumnHeader,
  CollapsibleSection,
  StatusBadge,
  StatCard,
} from "@/components/ui"
import { supabase } from "@/lib/supabase"
import { DollarSign, TrendingUp, Percent, Package } from "lucide-react"

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
  // Joined from couples
  couple_name?: string
  wedding_date?: string
}

// Fetch orders with couple data
async function fetchOrders(year: number): Promise<ExtrasOrder[]> {
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const { data, error } = await supabase
    .from("extras_orders")
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
    .gte("order_date", startDate)
    .lte("order_date", endDate)
    .order("order_date", { ascending: false })

  if (error) throw error

  // Flatten the joined data
  return (data || []).map((order: any) => ({
    ...order,
    couple_name: order.couples?.couple_name || "Unknown",
    wedding_date: order.couples?.wedding_date || null,
  }))
}

// Item icons component
function ItemIcons({ order }: { order: ExtrasOrder }) {
  const items = []
  if (order.collage_size) items.push("🖼️")
  if (order.album_qty && order.album_qty > 0) items.push("📖")
  if (order.signing_book) items.push("✍️")
  if (order.wedding_frame_size) items.push("🎨")
  if (order.printed_5x5) items.push("📸")
  return <span className="text-lg">{items.join(" ") || "—"}</span>
}

// Format currency
function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "—"
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Couple name formatter
function formatCoupleName(name: string | undefined): string {
  return name || "Unknown Couple"
}

export default function FrameSalesPage() {
  const router = useRouter()

  // URL state for filters
  const [year, setYear] = useQueryState("year", {
    defaultValue: new Date().getFullYear().toString(),
    parse: (v) => v,
    serialize: (v) => v,
  })
  const [search, setSearch] = useQueryState("q", { defaultValue: "" })
  const [statusFilter, setStatusFilter] = useQueryState("status")

  // Data state
  const [orders, setOrders] = useState<ExtrasOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data
  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchOrders(parseInt(year))
        setOrders(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [year])

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter && order.status !== statusFilter) return false

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        const coupleName = formatCoupleName(order.couple_name).toLowerCase()
        if (!coupleName.includes(searchLower)) return false
      }

      return true
    })
  }, [orders, statusFilter, search])

  // Group by status
  const ordersByStatus = useMemo(() => {
    const groups: Record<string, ExtrasOrder[]> = {
      signed: [],
      completed: [],
      declined: [],
    }
    filteredOrders.forEach((order) => {
      if (groups[order.status]) {
        groups[order.status].push(order)
      }
    })
    return groups
  }, [filteredOrders])

  // Calculate stats
  const stats = useMemo(() => {
    const signed = ordersByStatus.signed || []
    const completed = ordersByStatus.completed || []

    const allSold = [...signed, ...completed]
    const totalRevenue = allSold.reduce((sum, o) => sum + (o.extras_sale_amount || 0), 0)
    const avgSale = allSold.length > 0 ? totalRevenue / allSold.length : 0
    const conversionRate = orders.length > 0
      ? (allSold.length / orders.length) * 100
      : 0

    return {
      totalRevenue,
      avgSale,
      conversionRate,
      signedCount: signed.length,
      completedCount: completed.length,
      declinedCount: (ordersByStatus.declined || []).length,
    }
  }, [orders, ordersByStatus])

  // Table columns
  const columns: ColumnDef<ExtrasOrder>[] = [
    {
      accessorKey: "couple_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Couple" />
      ),
      cell: ({ row }) => formatCoupleName(row.original.couple_name),
      filterFn: "includesString",
    },
    {
      accessorKey: "wedding_date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Wedding" />
      ),
      cell: ({ row }) => {
        const date = row.original.wedding_date
        return date ? format(new Date(date), "MMM d, yyyy") : "—"
      },
    },
    {
      accessorKey: "order_date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Order Date" />
      ),
      cell: ({ row }) => format(new Date(row.original.order_date), "MMM d, yyyy"),
    },
    {
      accessorKey: "extras_sale_amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {formatCurrency(row.original.extras_sale_amount)}
        </span>
      ),
    },
    {
      accessorKey: "items",
      header: "Items",
      cell: ({ row }) => <ItemIcons order={row.original} />,
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ]

  // Calculate section totals
  const sectionTotal = (orders: ExtrasOrder[]) => {
    const total = orders.reduce((sum, o) => sum + (o.extras_sale_amount || 0), 0)
    return formatCurrency(total)
  }

  return (
    <ControlPageTemplate
      title="Frame Sales"
      subtitle={`Extras orders for ${year}`}
      primaryAction={{
        label: "New Sale",
        onClick: () => {/* TODO: Open new sale modal */},
      }}
      searchValue={search || ""}
      onSearchChange={(v) => setSearch(v || null)}
      searchPlaceholder="Search couples..."
      filters={[
        {
          key: "year",
          label: "Year",
          options: [
            { value: "2026", label: "2026" },
            { value: "2025", label: "2025" },
            { value: "2024", label: "2024" },
          ],
          value: year,
          onChange: (v) => setYear(v || new Date().getFullYear().toString()),
        },
        {
          key: "status",
          label: "Status",
          options: [
            { value: "signed", label: "Signed" },
            { value: "completed", label: "Completed" },
            { value: "declined", label: "Declined" },
          ],
          value: statusFilter,
          onChange: setStatusFilter,
        },
      ]}
      onClearFilters={() => {
        setSearch(null)
        setStatusFilter(null)
      }}
      sidebar={
        <>
          <StatCard
            label="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <StatCard
            label="Average Sale"
            value={formatCurrency(stats.avgSale)}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard
            label="Conversion Rate"
            value={`${stats.conversionRate.toFixed(0)}%`}
            icon={<Percent className="h-4 w-4" />}
          />
          <StatCard
            label="Total Orders"
            value={orders.length}
            icon={<Package className="h-4 w-4" />}
          />
        </>
      }
      isLoading={isLoading}
      error={error}
    >
      {/* Signed Section */}
      <CollapsibleSection
        title="Signed"
        count={ordersByStatus.signed.length}
        badge="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
        headerRight={<span className="font-semibold text-green-700 dark:text-green-300">{sectionTotal(ordersByStatus.signed)}</span>}
        defaultOpen
      >
        <DataTable
          columns={columns}
          data={ordersByStatus.signed}
          rowNumber
          onRowClick={(row) => router.push(`/admin/couples/${row.couple_id}`)}
          emptyMessage="No signed orders"
          showPagination={false}
        />
      </CollapsibleSection>

      {/* Completed Section */}
      <CollapsibleSection
        title="Completed"
        count={ordersByStatus.completed.length}
        badge="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
        headerRight={<span className="font-semibold text-blue-700 dark:text-blue-300">{sectionTotal(ordersByStatus.completed)}</span>}
      >
        <DataTable
          columns={columns}
          data={ordersByStatus.completed}
          rowNumber
          onRowClick={(row) => router.push(`/admin/couples/${row.couple_id}`)}
          emptyMessage="No completed orders"
          showPagination={false}
        />
      </CollapsibleSection>

      {/* Declined Section */}
      <CollapsibleSection
        title="Declined"
        count={ordersByStatus.declined.length}
        badge="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
        defaultOpen={false}
      >
        <DataTable
          columns={columns}
          data={ordersByStatus.declined}
          rowNumber
          onRowClick={(row) => router.push(`/admin/couples/${row.couple_id}`)}
          emptyMessage="No declined orders"
          showPagination={false}
        />
      </CollapsibleSection>
    </ControlPageTemplate>
  )
}
