'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Trash2, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateCompact } from '@/lib/formatters'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { ProductionPageHeader, ProductionPills, ProductionSidebar } from '@/components/shared'

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

const ITEM_TYPES = ['Additional Person', 'Hi Res Files', 'Hours', 'Parent Album', 'Print', 'Raw Video']

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return formatCurrency(n)
}

function fmtDate(dateStr: string | null): string {
  return formatDateCompact(dateStr)
}

function calcItemTotals(item: FormItem) {
  const lineSubtotal = item.quantity * item.unit_price
  let hst = 0
  if (item.tax_mode === 'before') {
    hst = lineSubtotal * 0.13
  } else if (item.tax_mode === 'included') {
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
      for (const item of items) {
        const t = calcItemTotals(item)
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
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold">New Extras Sale</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    <label className="block text-xs text-muted-foreground mb-1">Tax</label>
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
  const router = useRouter()
  const [rows, setRows] = useState<ExtrasRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set())
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

  useEffect(() => {
    supabase
      .from('couples')
      .select('id, couple_name, wedding_date')
      .eq('status', 'booked')
      .order('wedding_date', { ascending: true })
      .then(({ data }) => setCouples(data || []))
  }, [])

  const toggleLane = (key: string) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Filter by search
  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows
    const q = searchQuery.toLowerCase()
    return rows.filter(r => r.couple_name.toLowerCase().includes(q) || (r.item_type || '').toLowerCase().includes(q))
  }, [rows, searchQuery])

  // Group by year
  const rows2026 = useMemo(() => filteredRows.filter(r => r.wedding_year === 2026), [filteredRows])
  const rows2025 = useMemo(() => filteredRows.filter(r => r.wedding_year === 2025), [filteredRows])

  // Stats
  const rawVideoCount = useMemo(() => rows.filter(r => r.item_type === 'Raw Video').length, [rows])
  const extraHoursCount = useMemo(() => rows.filter(r => r.item_type === 'Hours').length, [rows])
  const revenue2026 = useMemo(() => rows2026.reduce((sum, r) => sum + (r.total || 0), 0), [rows2026])
  const revenue2025 = useMemo(() => rows2025.reduce((sum, r) => sum + (r.total || 0), 0), [rows2025])

  // KPI cards — derived from invoice_date year
  const kpiExtras2026 = useMemo(() => rows.filter(r => r.invoice_date && new Date(r.invoice_date).getFullYear() === 2026), [rows])
  const kpiExtras2025 = useMemo(() => rows.filter(r => r.invoice_date && new Date(r.invoice_date).getFullYear() === 2025), [rows])
  const kpiCouples2026 = useMemo(() => new Set(kpiExtras2026.map(r => r.couple_id)).size, [kpiExtras2026])
  const kpiLineItems2026 = kpiExtras2026.length
  const kpiRevenue2026 = useMemo(() => kpiExtras2026.reduce((s, r) => s + (Number(r.total) || 0), 0), [kpiExtras2026])
  const kpiAvgPerItem = kpiLineItems2026 > 0 ? Math.round(kpiRevenue2026 / kpiLineItems2026) : 0
  const kpiItemTypes2026 = useMemo(() => new Set(kpiExtras2026.map(r => r.item_type)).size, [kpiExtras2026])
  const kpiRevenue2025 = useMemo(() => kpiExtras2025.reduce((s, r) => s + (Number(r.total) || 0), 0), [kpiExtras2025])
  const kpiGrowthMultiple = kpiRevenue2025 > 0 ? Math.round(kpiRevenue2026 / kpiRevenue2025) : 0

  // Sidebar stats (2026 by invoice_date)
  const sidebarHiRes = useMemo(() => kpiExtras2026.filter(r => r.item_type === 'Hi Res Files').length, [kpiExtras2026])
  const sidebarRawVideos = useMemo(() => kpiExtras2026.filter(r => r.item_type === 'Raw Video').length, [kpiExtras2026])
  const sidebarExtraHours = useMemo(() => kpiExtras2026.filter(r => r.item_type === 'Hours').length, [kpiExtras2026])
  const sidebarParentAlbums = useMemo(() => kpiExtras2026.filter(r => r.item_type === 'Parent Album').length, [kpiExtras2026])

  // Column definitions
  const columns: ColumnDef<ExtrasRow>[] = useMemo(() => [
    {
      accessorKey: 'couple_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => (
        <button
          onClick={() => row.original.couple_id && router.push(`/admin/couples/${row.original.couple_id}`)}
          className="text-left font-medium hover:underline"
        >
          {row.original.couple_name}
        </button>
      ),
    },
    {
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      cell: ({ row }) => <span className="whitespace-nowrap">{fmtDate(row.original.wedding_date)}</span>,
    },
    {
      accessorKey: 'item_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item Type" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.item_type || '—'}</span>,
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Qty" />,
      cell: ({ row }) => <span>{row.original.quantity ?? '—'}</span>,
    },
    {
      accessorKey: 'unit_price',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Unit Price" />,
      cell: ({ row }) => <span>{row.original.unit_price != null ? fmtMoney(row.original.unit_price) : '—'}</span>,
    },
    {
      accessorKey: 'total',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => <span className="font-medium">{row.original.total != null ? fmtMoney(row.original.total) : '—'}</span>,
    },
  ], [router])

  // Section renderer
  const renderSection = (id: string, label: string, data: ExtrasRow[], badgeClass: string) => {
    const isCollapsed = collapsedLanes.has(id)
    return (
      <div id={id} className="mb-6">
        <button
          onClick={() => toggleLane(id)}
          className="flex items-center gap-3 py-3 hover:opacity-80"
        >
          {isCollapsed
            ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
          <span className={`inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-sm font-semibold ${badgeClass}`}>
            {label}
          </span>
          <span className="text-sm text-muted-foreground">
            {data.length} sale{data.length !== 1 ? 's' : ''}
          </span>
        </button>
        {!isCollapsed && (
          <DataTable
            columns={columns}
            data={data}
            showPagination={false}
            emptyMessage="No sales"
          />
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <ProductionPageHeader
        title="Extras Sales"
        subtitle="Additional sales by year"
        reportHref="/admin/sales/report"
        actionLabel="New Sale"
        actionHref="/admin/sales/extras/new"
      />

      <div className="flex">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 lg:border-r border-border">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Couples (2026)', value: String(kpiCouples2026) },
              { label: 'Line Items', value: String(kpiLineItems2026) },
              { label: 'Revenue (2026)', value: formatCurrency(kpiRevenue2026) },
              { label: 'Avg Per Item', value: formatCurrency(kpiAvgPerItem) },
              { label: 'Item Types', value: String(kpiItemTypes2026) },
              { label: 'vs 2025', value: `${kpiGrowthMultiple}×`, highlight: true },
            ].map((card: { label: string; value: string; highlight?: boolean }) => (
              <div key={card.label} className="bg-white border rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${card.highlight ? 'text-amber-600' : ''}`}>{card.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search couples or item types..."
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-ring"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          {renderSection('section-2026', '2026 SALES', rows2026, 'bg-teal-100 text-teal-700')}
          {renderSection('section-2025', '2025 SALES', rows2025, 'bg-gray-100 text-gray-700')}
        </div>

        <ProductionSidebar boxes={[
          { label: 'HI-RES FILES', value: sidebarHiRes, scrollToId: 'section-2026', color: 'teal' },
          { label: 'RAW VIDEOS', value: sidebarRawVideos, scrollToId: 'section-2026', color: 'blue' },
          { label: 'EXTRA HOURS', value: sidebarExtraHours, scrollToId: 'section-2026', color: 'yellow' },
          { label: 'PARENT ALBUMS', value: sidebarParentAlbums, scrollToId: 'section-2026', color: 'default' },
          { label: 'AVG ITEM VALUE', value: fmtMoney(kpiAvgPerItem), scrollToId: 'section-2026', color: 'teal' },
          { label: 'TOTAL COUPLES', value: kpiCouples2026, scrollToId: 'section-2026', color: 'green' },
        ]} />
      </div>

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
