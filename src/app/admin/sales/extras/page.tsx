'use client'

import { useState, useEffect, useMemo } from 'react'
import { ShoppingBag, DollarSign, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface InvoiceRow {
  id: string
  couple_name: string
  wedding_date: string
  year: number
  items: Array<{ description: string; amount: string; taxMode: string; beforeTax: number; hst: number; total: number }>
  subtotal: number
  total_hst: number
  discount_amt: number
  discount_type: string
  discount: number
  grand_total: number
  payment_method: string | null
  payment_note: string | null
  invoice_notes: string | null
  created_date: string
  created_at: string
}

type SortField = 'created_date' | 'couple_name' | 'items' | 'grand_total' | 'discount_amt' | 'payment_method' | 'payment_note'
type SortDir = 'asc' | 'desc'

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function itemsSummary(items: InvoiceRow['items']): string {
  return items
    .filter(it => it.description)
    .map(it => it.description.trim())
    .join(', ')
}

export default function ExtrasSalesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('created_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    supabase
      .from('extras_invoices')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Failed to load extras invoices:', error)
        setInvoices(
          (data || []).map(r => ({
            ...r,
            subtotal: Number(r.subtotal),
            total_hst: Number(r.total_hst),
            discount_amt: Number(r.discount_amt),
            discount: Number(r.discount),
            grand_total: Number(r.grand_total),
          })) as InvoiceRow[]
        )
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => {
    if (yearFilter === 'all') return invoices
    return invoices.filter(r => r.year === parseInt(yearFilter))
  }, [invoices, yearFilter])

  const stats = useMemo(() => {
    const numSales = filtered.length
    const totalRevenue = filtered.reduce((sum, r) => sum + r.grand_total, 0)
    const totalDiscount = filtered.reduce((sum, r) => sum + r.discount_amt, 0)
    const avgSale = numSales > 0 ? totalRevenue / numSales : 0
    return { numSales, totalRevenue, totalDiscount, avgSale }
  }, [filtered])

  const years = useMemo(() => {
    const set = new Set(invoices.map(r => r.year))
    return Array.from(set).sort((a, b) => b - a)
  }, [invoices])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    const rows = [...filtered]
    rows.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'created_date': cmp = (a.created_date || '').localeCompare(b.created_date || ''); break
        case 'couple_name': cmp = a.couple_name.localeCompare(b.couple_name); break
        case 'items': cmp = itemsSummary(a.items).localeCompare(itemsSummary(b.items)); break
        case 'grand_total': cmp = a.grand_total - b.grand_total; break
        case 'discount_amt': cmp = a.discount_amt - b.discount_amt; break
        case 'payment_method': cmp = (a.payment_method || '').localeCompare(b.payment_method || ''); break
        case 'payment_note': cmp = (a.payment_note || '').localeCompare(b.payment_note || ''); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [filtered, sortField, sortDir])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

  const SortHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <th className={`p-3 font-medium ${className || ''}`}>
      <button onClick={() => handleSort(field)} className="group flex items-center gap-1 hover:text-foreground">
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
          <p className="text-muted-foreground">Frames, albums & add-on invoices</p>
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

      {/* Invoices Table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Invoices</h2>
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <SortHeader field="created_date" label="Date" className="text-left" />
                  <SortHeader field="couple_name" label="Couple" className="text-left" />
                  <SortHeader field="items" label="Items Sold" className="text-left" />
                  <SortHeader field="grand_total" label="Total" className="text-right" />
                  <SortHeader field="discount_amt" label="Discount" className="text-right" />
                  <SortHeader field="payment_method" label="Payment" className="text-left hidden lg:table-cell" />
                  <SortHeader field="payment_note" label="Notes" className="text-left hidden xl:table-cell" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No extras invoices found{yearFilter !== 'all' ? ` for ${yearFilter}` : ''}.
                    </td>
                  </tr>
                ) : (
                  sorted.map(row => (
                    <tr key={row.id} className="hover:bg-accent/50 transition-colors">
                      <td className="p-3 whitespace-nowrap">{row.created_date}</td>
                      <td className="p-3 font-medium">{row.couple_name}</td>
                      <td className="p-3 text-muted-foreground max-w-xs truncate" title={itemsSummary(row.items)}>
                        {itemsSummary(row.items) || '—'}
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-medium">{fmtMoney(row.grand_total)}</span>
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {row.discount_amt > 0
                          ? `−${fmtMoney(row.discount_amt)}${row.discount_type === 'percent' ? ` (${row.discount}%)` : ''}`
                          : '—'
                        }
                      </td>
                      <td className="p-3 hidden lg:table-cell text-muted-foreground">
                        {row.payment_method || '—'}
                      </td>
                      <td className="p-3 hidden xl:table-cell text-muted-foreground max-w-xs truncate" title={row.payment_note || ''}>
                        {row.payment_note || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {sorted.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-semibold">
                    <td className="p-3" colSpan={3}>
                      Total ({filtered.length} invoice{filtered.length !== 1 ? 's' : ''})
                    </td>
                    <td className="p-3 text-right">{fmtMoney(stats.totalRevenue)}</td>
                    <td className="p-3 text-right text-red-600">
                      {stats.totalDiscount > 0 ? `−${fmtMoney(stats.totalDiscount)}` : '—'}
                    </td>
                    <td className="p-3 hidden lg:table-cell" />
                    <td className="p-3 hidden xl:table-cell" />
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
