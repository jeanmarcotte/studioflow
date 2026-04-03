'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ShoppingBag, DollarSign, ChevronUp, ChevronDown, Plus, X, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateCompact } from '@/lib/formatters'

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

interface CoupleOption {
  id: string
  couple_name: string
  wedding_date: string | null
}

interface FormItem {
  item_type: string
  description: string
  quantity: number
  unit_price: number
  tax_mode: 'before' | 'included' | 'none'
}

type SortField = 'invoice_date' | 'couple_name' | 'item_type' | 'description' | 'total' | 'discount_value' | 'status' | 'payment_note'
type SortDir = 'asc' | 'desc'

const ITEM_TYPES = ['Additional Person', 'Hi Res Files', 'Hours', 'Parent Album', 'Print', 'Raw Video']

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return formatCurrency(n)
}

function fmtDate(dateStr: string | null): string {
  return formatDateCompact(dateStr)
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

function calcItemTotals(item: FormItem) {
  const lineSubtotal = item.quantity * item.unit_price
  let hst = 0
  if (item.tax_mode === 'before') {
    hst = lineSubtotal * 0.13
  } else if (item.tax_mode === 'included') {
    // Tax already included — back it out for display
    hst = lineSubtotal - lineSubtotal / 1.13
  }
  const total = item.tax_mode === 'included' ? lineSubtotal : lineSubtotal + hst
  return { subtotal: lineSubtotal, hst: Math.round(hst * 100) / 100, total: Math.round(total * 100) / 100 }
}

function emptyItem(): FormItem {
  return { item_type: '', description: '', quantity: 1, unit_price: 0, tax_mode: 'before' }
}

// ── New Sale Modal ──────────────────────────────────────────────────────────

function NewSaleModal({ couples, onClose, onSaved }: { couples: CoupleOption[]; onClose: () => void; onSaved: () => void }) {
  const [coupleId, setCoupleId] = useState('')
  const [items, setItems] = useState<FormItem[]>([emptyItem()])
  const [discountType, setDiscountType] = useState<'percent' | 'fixed' | ''>('')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [paymentNote, setPaymentNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const updateItem = (i: number, patch: Partial<FormItem>) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, ...patch } : item))
  }

  const removeItem = (i: number) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  // Running totals
  const totals = useMemo(() => {
    let subtotal = 0
    let hst = 0
    let total = 0
    for (const item of items) {
      const t = calcItemTotals(item)
      subtotal += t.subtotal
      hst += t.hst
      total += t.total
    }
    // Apply discount
    let discountAmt = 0
    if (discountType === 'percent' && discountValue > 0) {
      discountAmt = total * discountValue / 100
    } else if (discountType === 'fixed' && discountValue > 0) {
      discountAmt = discountValue
    }
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      hst: Math.round(hst * 100) / 100,
      total: Math.round(total * 100) / 100,
      discountAmt: Math.round(discountAmt * 100) / 100,
      grandTotal: Math.round((total - discountAmt) * 100) / 100,
    }
  }, [items, discountType, discountValue])

  const selectedCouple = couples.find(c => c.id === coupleId)

  const handleSubmit = async () => {
    if (!coupleId || items.some(i => !i.item_type || i.unit_price <= 0)) return

    setSaving(true)
    const invoiceDate = new Date().toISOString().split('T')[0]
    const coupleName = selectedCouple?.couple_name || ''

    try {
      // Insert each item as a separate row
      for (const item of items) {
        const t = calcItemTotals(item)

        // Apply discount proportionally if multiple items
        let itemDiscountAmt = 0
        if (totals.discountAmt > 0 && totals.total > 0) {
          itemDiscountAmt = totals.discountAmt * (t.total / totals.total)
        }
        const finalTotal = Math.round((t.total - itemDiscountAmt) * 100) / 100

        const { data: inserted, error: insertErr } = await supabase
          .from('client_extras')
          .insert({
            couple_id: coupleId,
            item_type: item.item_type,
            description: item.description || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_mode: item.tax_mode,
            subtotal: item.tax_mode === 'included' ? Math.round((t.subtotal / 1.13) * 100) / 100 : t.subtotal,
            hst: t.hst,
            total: finalTotal,
            discount_type: discountType || null,
            discount_value: discountValue > 0 ? discountValue : null,
            payment_note: paymentNote || null,
            status: 'pending',
            invoice_date: invoiceDate,
          })
          .select('id')
          .single()

        if (insertErr) {
          console.error('Insert error:', insertErr)
          setToast('Error saving — check console')
          setSaving(false)
          return
        }

        // Insert couple_charges row
        if (inserted) {
          await supabase.from('couple_charges').insert({
            couple_id: coupleId,
            charge_date: invoiceDate,
            contract_type: 'C3',
            description: `${item.item_type} — ${coupleName}`,
            amount: finalTotal,
            source_table: 'client_extras',
            source_id: inserted.id,
          })
        }
      }

      setToast('Sale saved!')
      setTimeout(() => {
        onSaved()
        onClose()
      }, 800)
    } catch (err) {
      console.error('Save error:', err)
      setToast('Error saving — check console')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto border"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold">New Extras Sale</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Couple selector */}
          <div>
            <label className="block text-sm font-medium mb-1">Couple</label>
            <select
              value={coupleId}
              onChange={e => setCoupleId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a couple...</option>
              {couples.map(c => (
                <option key={c.id} value={c.id}>
                  {c.couple_name}{c.wedding_date ? ` — ${fmtDate(c.wedding_date)}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Items */}
          <div>
            <label className="block text-sm font-medium mb-2">Items</label>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="rounded-xl border bg-muted p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Item {i + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Item Type</label>
                      <select
                        value={item.item_type}
                        onChange={e => updateItem(i, { item_type: e.target.value })}
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select...</option>
                        {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => updateItem(i, { description: e.target.value })}
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Description"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => updateItem(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Unit Price</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unit_price || ''}
                        onChange={e => updateItem(i, { unit_price: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tax</label>
                    <div className="flex gap-2">
                      {([['before', '+ Tax (13%)'], ['included', 'Tax Included'], ['none', 'No Tax']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => updateItem(i, { tax_mode: val })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            item.tax_mode === val
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-foreground border-border hover:border-ring'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Item line total */}
                  <div className="text-right text-sm text-muted-foreground">
                    Line total: <span className="font-semibold text-foreground">{fmtMoney(calcItemTotals(item).total)}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setItems(prev => [...prev, emptyItem()])}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
            >
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-medium mb-1">Discount (optional)</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={0}
                step={0.01}
                value={discountValue || ''}
                onChange={e => {
                  setDiscountValue(parseFloat(e.target.value) || 0)
                  if (!discountType) setDiscountType('fixed')
                }}
                className="w-32 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0"
              />
              <div className="flex gap-1">
                {([['fixed', '$'], ['percent', '%']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setDiscountType(val)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      discountType === val
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:border-ring'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Note */}
          <div>
            <label className="block text-sm font-medium mb-1">Payment Note</label>
            <input
              type="text"
              value={paymentNote}
              onChange={e => setPaymentNote(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="When / How will they pay?"
            />
          </div>

          {/* Running Total */}
          <div className="rounded-xl bg-muted border p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{fmtMoney(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">HST (13%)</span>
              <span>{fmtMoney(totals.hst)}</span>
            </div>
            {totals.discountAmt > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Discount</span>
                <span>-{fmtMoney(totals.discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
              <span>TOTAL</span>
              <span className="text-green-700">{fmtMoney(totals.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex items-center justify-between rounded-b-2xl">
          {toast ? (
            <span className={`text-sm font-medium ${toast.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{toast}</span>
          ) : (
            <span />
          )}
          <button
            onClick={handleSubmit}
            disabled={saving || !coupleId || items.some(i => !i.item_type || i.unit_price <= 0)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Sale'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function ExtrasSalesPage() {
  const [rows, setRows] = useState<ExtrasRow[]>([])
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('invoice_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showNewSale, setShowNewSale] = useState(false)
  const [couples, setCouples] = useState<CoupleOption[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchData = useCallback(async () => {
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
  }, [])

  useEffect(() => { fetchData() }, [fetchData, refreshKey])

  // Fetch couples for the modal
  useEffect(() => {
    supabase
      .from('couples')
      .select('id, couple_name, wedding_date')
      .eq('status', 'booked')
      .order('wedding_date', { ascending: true })
      .then(({ data }) => setCouples(data || []))
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
          <button
            onClick={() => setShowNewSale(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Sale
          </button>
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

      {/* New Sale Modal */}
      {showNewSale && (
        <NewSaleModal
          couples={couples}
          onClose={() => setShowNewSale(false)}
          onSaved={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  )
}
