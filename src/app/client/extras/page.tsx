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
  StatusBadge,
  StatCard,
} from "@/components/ui"
import { Package, DollarSign, FileText, Plus } from "lucide-react"
import { formatWeddingDate, formatDateCompact, formatCurrency } from "@/lib/formatters"

interface Extra {
  id: string
  couple_id: string
  item_type: string
  description: string | null
  quantity: number
  unit_price: number
  tax_mode: string
  subtotal: number
  hst: number
  total: number
  status: string
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
    accessorKey: "item_type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Item Type" />
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground max-w-[200px] truncate block">
        {row.original.description || "—"}
      </span>
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
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
        .from("client_extras")
        .select("*, couples(couple_name, wedding_date)")
        .order("created_at", { ascending: false })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const mapped = (data || []).map((row: any) => ({
        ...row,
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
        e.item_type?.toLowerCase().includes(lower) ||
        e.description?.toLowerCase().includes(lower)
    )
  }, [extras, search])

  return (
    <Layout sidebarConfig={studioflowClientConfig}>
      <InfoPageTemplate
        title="Extras"
        subtitle={`${extras.length} extra${extras.length !== 1 ? "s" : ""} total`}
        primaryAction={{
          label: "New Extra",
          onClick: () => router.push("/client/extras/new"),
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
        searchPlaceholder="Search couples, items..."
        isLoading={loading}
        error={error}
      >
        <DataTable
          columns={columns}
          data={filteredExtras}
          onRowClick={(row) => router.push(`/client/extras/${row.id}`)}
          emptyMessage="No extras yet. Click 'New Extra' to create your first one."
        />
      </InfoPageTemplate>
    </Layout>
  )
}
