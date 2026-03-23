'use client'

import { useState, useEffect, useMemo } from 'react'
import { ShoppingBag, DollarSign, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'

// ── Interfaces ──────────────────────────────────────────────────────────────

interface ExtrasRow {
  id: string
  couple_id: string
  item_type: string
  description: string | null
  quantity: number | null
  unit_price: number | null
  subtotal: number | null
  hst: number | null
  total: number | null
  discount_type: string | null
  discount_value: number | null
  payment_note: string | null
  status: string | null
  paid_date: string | null
  invoice_date: string | null
  couple_name: string
  wedding_date: string | null
  wedding_year: number | null
}

type SortField = 'invoice_date' | 'couple_name' | 'item_type' | 'description' | 'total' | 'discount_value' | 'status' | 'payment_note'
type SortDir = 'asc' | 'desc'

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

function statusBadge(status: string | null) {
  switch (status) {
    case 'paid':
      return <span className="inline-flex items-center rounded-full bg-green-50 text-green-600 px-2 py-0.5 text-xs font-medium">Paid</span>
    case 'sent':
      return <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 text-xs font-medium">Sent</span>
    case 'pending':
      return <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-600 px-2 py-0.5 text-xs font-medium">Pending</span>
    case 'cancelled':
      return <span className="inline-flex items-center rounded-full bg-red-50 text-red-600 px-2 py-0.5 text-xs font-medium line-through">Cancelled</span>
    default:
      return <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-xs font-medium">{status || '—'}</span>
  }
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function ExtrasSalesPage() {
  const [rows, setRows] = useState<ExtrasRow[]>([])
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('invoice_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('client_extras')
          .select('id, couple_id, item_type, description, quantity, unit_price, subtotal, hst, total, discount_type, discount_value, payment_note, status, paid_date, invoice_date, couples(couple_name, wedding_date, wedding_year)')
          .order('invoice_date', { ascending: false })

        if (error) {
          console.error('[ExtrasSalesPage] fetch error:', error)
          setLoading(false)
          return
        }

        setRows(
          (data || []).map((r: any) => ({
            id: r.id,
            couple_id: r.couple_id,
            item_type: r.item_type || '',
            description: r.description,
            quantity: r.quantity != null ? Number(r.quantity) : null,
            unit_price: r.unit_price != null ? Number(r.unit_price) : null,
            subtotal: r.subtotal != null ? Number(r.subtotal) : null,
            hst: r.hst != null ? Number(r.hst) : null,
            total: r.total != null ? Number(r.total) : null,
            discount_type: r.discount_type,
            discount_value: r.discount_value != null ? Number(r.discount_value) : null,
            payment_note: r.payment_note,
            status: r.status,
            paid_date: r.paid_date,
            invoice_date: r.invoice_date,
            couple_name: r.couples?.couple_name || '—',
            wedding_date: r.couples?.wedding_date || null,
            wedding_year: r.couples?.wedding_year || null,
          }))
        )
        setLoading(false)
      } catch (err) {
        console.error('[ExtrasSalesPage] error:', err)
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Year filter
  const filtered = useMemo(() => {
    if (yearFilter === 'all') return rows
    return rows.filter(r => r.wedding_year === parseInt(yearFilter))
  }, [rows, yearFilter])

  const years = useMemo(() => {
    const set = new Set(rows.map(r => r.wedding_year).filter(Boolean) as number[])
    return Array.from(set).sort((a, b) => b - a)
  }, [rows])

  // Stats
  const stats = useMemo(() => {
    const active = filtered.filter(r => r.status !== 'cancelled')
    const numSales = active.length
    const totalRevenue = active.reduce((sum, r) => sum + (r.total || 0), 0)
    const totalDiscount = active.reduce((sum, r) => {
      if (!r.discount_value) return sum
      if (r.discount_type === 'percent') {
        // For percent discounts, calculate the dollar amount from subtotal
        return sum + ((r.subtotal || 0) * r.discount_value / 100)
      }
      return sum + r.discount_value
    }, 0)
    const avgSale = numSales > 0 ? totalRevenue / numSales : 0
    return { numSales, totalRevenue, totalDiscount, avgSale }
  }, [filtered])

  // Sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'invoice_date': cmp = (a.invoice_date || '').localeCompare(b.invoice_date || ''); break
        case 'couple_name': cmp = a.couple_name.localeCompare(b.couple_name); break
        case 'item_type': cmp = a.item_type.localeCompare(b.item_type); break
        case 'description': cmp = (a.description || '').localeCompare(b.description || ''); break
        case 'total': cmp = (a.total || 0) - (b.total || 0); break
        case 'discount_value': cmp = (a.discount_value || 0) - (b.discount_value || 0); break
        case 'status': cmp = (a.status || '').localeCompare(b.status || ''); break
        case 'payment_note': cmp = (a.payment_note || '').localeCompare(b.payment_note || ''); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filtered, sortField, sortDir])

  // Sort header component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

  const SortHeader = ({ field, label, align }: { field: SortField; label: string; align?: 'right' | 'center' }) => (
    <th className="p-3 font-medium" style={{ textAlign: align || 'left' }}>
      <button
        onClick={() => handleSort(field)}
        className={`group flex items-center gap-1 hover:text-foreground ${align === 'right' ? 'ml-auto' : ''}`}
      >
        {label} <SortIcon field={field} />
      </button>
    </th>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Extras Sales</h1>
          <p className="text-muted-foreground">Post-contract add-ons & extras</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://sigs-extras-invoice.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="relative inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent/50 transition-colors group"
            title="Mobile entry (for Marianna)"
          >
            <span className="text-lg">📱</span>
            Mobile Entry
            <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-stone-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
              Mobile entry (for Marianna)
            </span>
          </a>
          {years.length > 0 && (
            <select
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Years</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <ShoppingBag className="h-4 w-4" />
            Invoices
          </div>
          <div className="text-2xl font-bold">{stats.numSales}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
            <DollarSign className="h-4 w-4" />
            Total Revenue
          </div>
          <div className="text-2xl font-bold text-green-600">{fmtMoney(stats.totalRevenue)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <DollarSign className="h-4 w-4" />
            Avg Sale
          </div>
          <div className="text-2xl font-bold">{fmtMoney(stats.avgSale)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
            <DollarSign className="h-4 w-4" />
            Discounts
          </div>
          <div className="text-2xl font-bold text-red-600">{fmtMoney(stats.totalDiscount)}</div>
        </div>
      </div>

      {/* Table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Invoices</h2>
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 1000 }}>
              <thead>
                <tr className="border-b bg-muted/50">
                  <SortHeader field="invoice_date" label="Date" />
                  <SortHeader field="couple_name" label="Couple" />
                  <SortHeader field="item_type" label="Item Type" />
                  <SortHeader field="description" label="Description" />
                  <SortHeader field="total" label="Total" align="right" />
                  <SortHeader field="discount_value" label="Discount" align="right" />
                  <SortHeader field="status" label="Status" />
                  <SortHeader field="payment_note" label="Notes" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No extras found{yearFilter !== 'all' ? ` for ${yearFilter}` : ''}.
                    </td>
                  </tr>
                ) : (
                  sorted.map(row => (
                    <tr key={row.id} className="hover:bg-accent/50 transition-colors">
                      <td className="p-3 whitespace-nowrap" style={{ textAlign: 'left' }}>{fmtDate(row.invoice_date)}</td>
                      <td className="p-3 font-medium" style={{ textAlign: 'left' }}>{row.couple_name}</td>
                      <td className="p-3 text-muted-foreground" style={{ textAlign: 'left' }}>{row.item_type || '—'}</td>
                      <td className="p-3 text-muted-foreground max-w-xs truncate" style={{ textAlign: 'left' }} title={row.description || ''}>
                        {row.description || '—'}
                      </td>
                      <td className="p-3 font-medium" style={{ textAlign: 'right' }}>
                        {row.total != null ? fmtMoney(row.total) : '—'}
                      </td>
                      <td className="p-3 text-muted-foreground" style={{ textAlign: 'right' }}>
                        {row.discount_value && row.discount_value > 0
                          ? `−${row.discount_type === 'percent' ? `${row.discount_value}%` : fmtMoney(row.discount_value)}`
                          : '—'
                        }
                      </td>
                      <td className="p-3" style={{ textAlign: 'left' }}>
                        {statusBadge(row.status)}
                      </td>
                      <td className="p-3 text-muted-foreground max-w-xs truncate" style={{ textAlign: 'left' }} title={row.payment_note || ''}>
                        {row.payment_note || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {sorted.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-semibold">
                    <td className="p-3" style={{ textAlign: 'left' }} colSpan={4}>
                      Total ({filtered.filter(r => r.status !== 'cancelled').length} item{filtered.filter(r => r.status !== 'cancelled').length !== 1 ? 's' : ''})
                    </td>
                    <td className="p-3 text-green-600" style={{ textAlign: 'right' }}>{fmtMoney(stats.totalRevenue)}</td>
                    <td className="p-3 text-red-600" style={{ textAlign: 'right' }}>
                      {stats.totalDiscount > 0 ? `−${fmtMoney(stats.totalDiscount)}` : '—'}
                    </td>
                    <td className="p-3" colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
