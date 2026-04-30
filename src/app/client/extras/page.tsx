"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Layout } from "@/components/layout/layout"
import { studioflowClientConfig } from "@/config/sidebar"
import { supabase } from "@/lib/supabase"
import { InfoPageTemplate } from "@/components/templates"
import {
  DataTable,
  DataTableColumnHeader,
  StatCard,
} from "@/components/ui"
import { Package, DollarSign, Plus } from "lucide-react"
import { formatWeddingDate, formatDateCompact, formatCurrency } from "@/lib/formatters"

interface Extra {
  id: string
  couple_id: string
  product_code: string | null
  item_name: string
  category: string
  quantity: number
  unit_price: number
  subtotal: number
  hst: number
  total: number
  invoice_date: string
  created_at: string
  couple_name: string
  wedding_date: string | null
}

const columns: ColumnDef<Extra>[] = [
  {
    accessorKey: "couple_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Couple" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.couple_name}</span>
    ),
  },
  {
    accessorKey: "wedding_date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Wedding Date" />
    ),
    cell: ({ row }) => formatWeddingDate(row.original.wedding_date),
  },
  {
    accessorKey: "item_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span>{row.original.item_name}</span>
        {row.original.product_code && (
          <span className="font-mono text-[10px] text-muted-foreground">{row.original.product_code}</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.category}</span>
    ),
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Qty" />
    ),
    cell: ({ row }) => (
      <span className="text-center block">{row.original.quantity}</span>
    ),
  },
  {
    accessorKey: "total",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{formatCurrency(row.original.total)}</span>
    ),
  },
  {
    accessorKey: "invoice_date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Invoice Date" />
    ),
    cell: ({ row }) => formatDateCompact(row.original.invoice_date),
  },
]

export default function ExtrasListPage() {
  const router = useRouter()
  const [extras, setExtras] = useState<Extra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function fetchExtras() {
      const { data, error } = await supabase
        .from("c3_line_items")
        .select("*, couples(couple_name, wedding_date), product_catalog(item_name, category)")
        .order("created_at", { ascending: false })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        couple_id: row.couple_id,
        product_code: row.product_code,
        item_name: row.product_catalog?.item_name || row.product_code || "—",
        category: row.product_catalog?.category || "Other",
        quantity: Number(row.quantity) || 0,
        unit_price: Number(row.unit_price) || 0,
        subtotal: Number(row.subtotal) || 0,
        hst: Number(row.hst) || 0,
        total: Number(row.total) || 0,
        invoice_date: row.invoice_date,
        created_at: row.created_at,
        couple_name: row.couples?.couple_name || "Unknown",
        wedding_date: row.couples?.wedding_date || null,
      }))

      setExtras(mapped)
      setLoading(false)
    }

    fetchExtras()
  }, [])

  const stats = useMemo(() => {
    const totalRevenue = extras.reduce((sum, e) => sum + (e.total || 0), 0)
    return {
      count: extras.length,
      totalRevenue,
    }
  }, [extras])

  const filteredExtras = useMemo(() => {
    if (!search) return extras
    const lower = search.toLowerCase()
    return extras.filter(
      (e) =>
        e.couple_name.toLowerCase().includes(lower) ||
        e.item_name.toLowerCase().includes(lower) ||
        (e.product_code || "").toLowerCase().includes(lower)
    )
  }, [extras, search])

  return (
    <Layout sidebarConfig={studioflowClientConfig}>
      <InfoPageTemplate
        title="Extras"
        subtitle={`${extras.length} extra${extras.length !== 1 ? "s" : ""} total`}
        primaryAction={{
          label: "New Extra",
          onClick: () => router.push("/admin/sales/extras/new"),
          icon: <Plus className="h-4 w-4 mr-2" />,
        }}
        statsRow={
          <>
            <StatCard
              label="Total Extras"
              value={stats.count}
              icon={<Package className="h-4 w-4" />}
            />
            <StatCard
              label="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              icon={<DollarSign className="h-4 w-4" />}
            />
          </>
        }
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search couples, products..."
        isLoading={loading}
        error={error}
      >
        <DataTable
          columns={columns}
          data={filteredExtras}
          onRowClick={(row) => router.push(`/client/extras/${row.id}`)}
          emptyMessage="No extras yet."
        />
      </InfoPageTemplate>
    </Layout>
  )
}
