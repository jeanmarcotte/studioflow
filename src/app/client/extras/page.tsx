'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/layout/layout'
import { studioflowClientConfig } from '@/config/sidebar'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  Plus, ArrowUpDown, ArrowUp, ArrowDown,
  Package, DollarSign, Calendar, FileText,
} from 'lucide-react'

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

type SortField = 'couple_name' | 'wedding_date' | 'item_type' | 'description' | 'quantity' | 'total' | 'status' | 'invoice_date'
type SortDir = 'asc' | 'desc'

export default function ExtrasListPage() {
  const router = useRouter()
  const [extras, setExtras] = useState<Extra[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('invoice_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    const fetchExtras = async () => {
      const { data, error } = await supabase
        .from('client_extras')
        .select('*, couples(couple_name, wedding_date)')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching extras:', error)
        setLoading(false)
        return
      }

      const mapped = (data || []).map((row: any) => ({
        ...row,
        couple_name: row.couples?.couple_name || 'Unknown',
        wedding_date: row.couples?.wedding_date || null,
      }))

      setExtras(mapped)
      setLoading(false)
    }

    fetchExtras()
  }, [])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    return [...extras].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const valA = a[sortField]
      const valB = b[sortField]

      if (valA == null && valB == null) return 0
      if (valA == null) return 1
      if (valB == null) return -1

      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * dir
      }

      return String(valA).localeCompare(String(valB)) * dir
    })
  }, [extras, sortField, sortDir])

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortField === field ? (
          sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  )

  const statusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val)

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <Layout sidebarConfig={studioflowClientConfig}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Extras</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {extras.length} extra{extras.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <button
            onClick={() => router.push('/client/extras/new')}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Extra
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : extras.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No extras yet</p>
            <p className="text-sm">Click "New Extra" to create your first one.</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <SortHeader field="couple_name" label="Couple" />
                  <SortHeader field="wedding_date" label="Wedding Date" />
                  <SortHeader field="item_type" label="Item Type" />
                  <SortHeader field="description" label="Description" />
                  <SortHeader field="quantity" label="Qty" />
                  <SortHeader field="total" label="Total" />
                  <SortHeader field="status" label="Status" />
                  <SortHeader field="invoice_date" label="Invoice Date" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map(extra => (
                  <tr
                    key={extra.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/client/extras/${extra.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{extra.couple_name}</td>
                    <td className="px-4 py-3">{formatDate(extra.wedding_date)}</td>
                    <td className="px-4 py-3">{extra.item_type}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{extra.description || '—'}</td>
                    <td className="px-4 py-3 text-center">{extra.quantity}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(extra.total)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize', statusColor(extra.status))}>
                        {extra.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(extra.invoice_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
