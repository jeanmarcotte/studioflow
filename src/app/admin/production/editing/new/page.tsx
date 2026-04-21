'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import { formatDateCompact } from '@/lib/formatters'

// ── Constants ──────────────────────────────────────────────────────

type Category = 'wedding' | 'engagement' | 'video'

const MONTH_ABBRS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const VENDOR_SUGGESTIONS = ['Best Canvas', 'CCI', 'Graphi Studio', 'Queensberry']

// ── Types ──────────────────────────────────────────────────────────

interface CoupleOption {
  id: string
  couple_name: string
  wedding_date: string | null
  wedding_year: number | null
}

interface ProductItem {
  product_code: string
  item_name: string
  category: string
}

interface ClientOrder {
  id: string
  order_number: string
  vendor: string | null
  item_count: number
}

// ── Product filtering ──────────────────────────────────────────────

function filterProductsByTab(products: ProductItem[], tab: Category): ProductItem[] {
  return products.filter(p => {
    if (tab === 'wedding') {
      if (p.category === 'Production') return /Wedding/i.test(p.item_name) || /Hi-Res Wedding/i.test(p.item_name)
      if (p.category === 'Album') return true
      if (p.category === 'Portrait') return true
      if (p.category === 'Print') return !['PRT-5X5-50', 'PRT-5X7', 'PRT-8X10'].includes(p.product_code)
      if (p.category === 'Canvas') return true
      if (p.category === 'Mounting') return p.product_code.startsWith('MNT-CNV-')
      if (p.category === 'Collage') return true
      if (p.category === 'Frame') return true
      if (p.category === 'Stationery') return true
      if (p.category === 'Digital') return p.product_code === 'DIG-USB-COMBO'
      return false
    }
    if (tab === 'engagement') {
      if (p.category === 'Production') return /Engagement|Collage|Hi-Res Engagement/i.test(p.item_name)
      if (p.category === 'Print') return ['PRT-5X5-50', 'PRT-5X7', 'PRT-8X10'].includes(p.product_code)
      return false
    }
    if (tab === 'video') {
      if (p.category === 'Production') return /Video/i.test(p.item_name)
      return false
    }
    return false
  })
}

function groupByCategory(products: ProductItem[]): { category: string; products: ProductItem[] }[] {
  const map: Record<string, ProductItem[]> = {}
  for (const p of products) {
    if (!map[p.category]) map[p.category] = []
    map[p.category].push(p)
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, products]) => ({ category, products }))
}

// ══════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function AddEditingJobPage() {
  const router = useRouter()

  // ── Couple search state ────────────────────────────────────────
  const [coupleId, setCoupleId] = useState('')
  const [coupleName, setCoupleName] = useState('')
  const [coupleSearch, setCoupleSearch] = useState('')
  const [coupleOptions, setCoupleOptions] = useState<CoupleOption[]>([])
  const [allCouples, setAllCouples] = useState<CoupleOption[]>([])
  const [coupleDropdownOpen, setCoupleDropdownOpen] = useState(false)
  const coupleDropdownRef = useRef<HTMLDivElement>(null)

  // ── Form state ─────────────────────────────────────────────────
  const [category, setCategory] = useState<Category>('wedding')
  const [products, setProducts] = useState<ProductItem[]>([])
  const [selectedProductCode, setSelectedProductCode] = useState('')
  const [quantity, setQuantity] = useState<number | string>(1)
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')

  // ── Client order state ─────────────────────────────────────────
  const [orderMode, setOrderMode] = useState<'new' | 'existing'>('new')
  const [vendor, setVendor] = useState('')
  const [existingOrders, setExistingOrders] = useState<ClientOrder[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState('')

  // ── Submission state ───────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // ── Derived: selected product info ─────────────────────────────
  const selectedProduct = useMemo(
    () => products.find(p => p.product_code === selectedProductCode) ?? null,
    [products, selectedProductCode]
  )
  const isPhysicalItem = selectedProduct ? selectedProduct.category !== 'Production' : false

  // ── Filtered products for current tab ──────────────────────────
  const filteredProducts = useMemo(
    () => filterProductsByTab(products, category),
    [products, category]
  )
  const groupedProducts = useMemo(
    () => groupByCategory(filteredProducts),
    [filteredProducts]
  )

  // ── Load products on mount ─────────────────────────────────────
  useEffect(() => {
    supabase
      .from('product_catalog')
      .select('product_code, item_name, category')
      .eq('active', true)
      .eq('production_visible', true)
      .order('category')
      .order('sort_order')
      .then(({ data }) => setProducts(data ?? []))
  }, [])

  // ── Couple search (kept from original) ─────────────────────────

  const fetchCouples = useCallback(async (q: string) => {
    const res = await fetch(`/api/couples/search?q=${encodeURIComponent(q)}`)
    const json = await res.json()
    if (json.data) setCoupleOptions(json.data)
  }, [])

  useEffect(() => {
    const loadAll = async () => {
      const res = await fetch('/api/couples/search?q=')
      const json = await res.json()
      if (json.data) setAllCouples(json.data)
    }
    loadAll()
  }, [])

  const isMonthSearch = coupleSearch.trim().length === 3 &&
    MONTH_ABBRS.some(m => m.toLowerCase() === coupleSearch.trim().toLowerCase())

  useEffect(() => {
    if (isMonthSearch) {
      const monthIdx = MONTH_ABBRS.findIndex(m => m.toLowerCase() === coupleSearch.trim().toLowerCase())
      const filtered = allCouples.filter(c => {
        if (!c.wedding_date) return false
        return new Date(c.wedding_date).getMonth() === monthIdx
      })
      setCoupleOptions(filtered)
    } else {
      const timer = setTimeout(() => fetchCouples(coupleSearch), 200)
      return () => clearTimeout(timer)
    }
  }, [coupleSearch, fetchCouples, isMonthSearch, allCouples])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (coupleDropdownRef.current && !coupleDropdownRef.current.contains(e.target as Node)) {
        setCoupleDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const groupedCouples = useMemo(() => {
    const groups: Record<number, CoupleOption[]> = {}
    for (const c of coupleOptions) {
      const year = c.wedding_year ?? (c.wedding_date ? new Date(c.wedding_date).getFullYear() : 0)
      if (!groups[year]) groups[year] = []
      groups[year].push(c)
    }
    for (const year of Object.keys(groups)) {
      groups[Number(year)].sort((a, b) => {
        const aMonth = a.wedding_date ? new Date(a.wedding_date).getMonth() : 99
        const bMonth = b.wedding_date ? new Date(b.wedding_date).getMonth() : 99
        if (aMonth !== bMonth) return aMonth - bMonth
        return a.couple_name.localeCompare(b.couple_name)
      })
    }
    const yearOrder = [2026, 2027, 2025]
    return Object.entries(groups)
      .sort(([a], [b]) => {
        const idxA = yearOrder.indexOf(Number(a))
        const idxB = yearOrder.indexOf(Number(b))
        const posA = idxA === -1 ? yearOrder.length : idxA
        const posB = idxB === -1 ? yearOrder.length : idxB
        return posA - posB
      })
      .map(([year, couples]) => ({ year: Number(year), couples }))
  }, [coupleOptions])

  const selectCouple = (couple: CoupleOption) => {
    setCoupleId(couple.id)
    setCoupleName(couple.couple_name)
    setCoupleSearch(couple.couple_name)
    setCoupleDropdownOpen(false)
    // Fetch existing orders for this couple
    fetchExistingOrders(couple.id)
  }

  const formatDateLocal = (dateStr: string | null) => {
    if (!dateStr) return ''
    return formatDateCompact(dateStr)
  }

  // ── Fetch existing orders for couple ───────────────────────────
  const fetchExistingOrders = async (cId: string) => {
    const { data } = await supabase
      .from('client_orders')
      .select('id, order_number, vendor')
      .eq('couple_id', cId)
      .eq('lab_status', 'pending')
      .order('created_at', { ascending: false })

    if (data) {
      // Count items per order from jobs table
      const orders: ClientOrder[] = []
      for (const order of data) {
        const { count } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('client_order_id', order.id)
        orders.push({
          id: order.id,
          order_number: order.order_number,
          vendor: order.vendor,
          item_count: count ?? 0,
        })
      }
      setExistingOrders(orders)
    }
  }

  // ── Handlers ───────────────────────────────────────────────────

  const handleCategoryChange = (cat: Category) => {
    setCategory(cat)
    setSelectedProductCode('')
    setQuantity(1)
  }

  const handleProductChange = (code: string) => {
    setSelectedProductCode(code)
    setQuantity(1)
    setOrderMode('new')
    setSelectedOrderId('')
  }

  const resetForm = () => {
    setCoupleId('')
    setCoupleName('')
    setCoupleSearch('')
    setCategory('wedding')
    setSelectedProductCode('')
    setVendor('')
    setQuantity(1)
    setDescription('')
    setNotes('')
    setOrderMode('new')
    setSelectedOrderId('')
    setExistingOrders([])
    setSuccess(false)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coupleId || !selectedProductCode) return

    setSubmitting(true)
    setError('')

    try {
      let clientOrderId: string | null = null

      // Create or link client order for physical items
      if (isPhysicalItem) {
        if (orderMode === 'new') {
          // Generate next order number
          const { data: lastOrder } = await supabase
            .from('client_orders')
            .select('order_number')
            .order('created_at', { ascending: false })
            .limit(1)

          const year = new Date().getFullYear()
          let nextNum = 1
          if (lastOrder && lastOrder.length > 0) {
            const match = lastOrder[0].order_number.match(/CO-\d{4}-(\d+)/)
            if (match) nextNum = parseInt(match[1]) + 1
          }
          const orderNumber = `CO-${year}-${String(nextNum).padStart(3, '0')}`
          const orderType = category === 'video' ? 'video' : 'photo'

          const { data: newOrder, error: orderErr } = await supabase
            .from('client_orders')
            .insert({
              couple_id: coupleId,
              order_number: orderNumber,
              order_type: orderType,
              vendor: vendor || null,
              lab_status: 'pending',
            })
            .select('id')
            .limit(1)

          if (orderErr) {
            setError(orderErr.message)
            setSubmitting(false)
            return
          }
          clientOrderId = newOrder?.[0]?.id ?? null
        } else if (orderMode === 'existing' && selectedOrderId) {
          clientOrderId = selectedOrderId
        }
      }

      // Insert into jobs table
      const { error: jobErr } = await supabase
        .from('jobs')
        .insert({
          couple_id: coupleId,
          category,
          job_type: selectedProductCode,
          product_code: selectedProductCode,
          quantity: Number(quantity) || 1,
          client_order_id: clientOrderId,
          description: description.trim() || null,
          notes: notes.trim() || null,
          status: 'not_started',
        })

      if (jobErr) {
        setError(jobErr.message)
        setSubmitting(false)
        return
      }

      setSubmitting(false)
      setSuccess(true)
    } catch (err: any) {
      setError(err?.message ?? 'Unknown error')
      setSubmitting(false)
    }
  }

  // ── Success state ──────────────────────────────────────────────

  if (success) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Add Editing Job</h1>
          <p className="text-muted-foreground text-sm mt-1">Create a new editing job for a couple</p>
        </div>
        <div className="rounded-xl border bg-card p-8 text-center space-y-4">
          <div className="text-green-600 text-lg font-semibold">Job added successfully</div>
          <p className="text-sm text-muted-foreground">
            Editing job for {coupleName} has been created.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={resetForm}
              className="rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              Add Another
            </button>
            <button
              onClick={() => router.push(category === 'video' ? '/admin/production/video' : '/admin/production/photo')}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Go to Production
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Add Editing Job</h1>
        <p className="text-muted-foreground text-sm mt-1">Create a new editing job for a couple</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border bg-card p-5 sm:p-6 space-y-5">

          {/* ── Couple ──────────────────────────────────────── */}
          <div ref={coupleDropdownRef}>
            <Label>Couple *</Label>
            <div className="relative">
              <input
                type="text"
                value={coupleSearch}
                onChange={(e) => {
                  setCoupleSearch(e.target.value)
                  setCoupleDropdownOpen(true)
                  if (!e.target.value) { setCoupleId(''); setCoupleName('') }
                }}
                onFocus={() => { setCoupleDropdownOpen(true); fetchCouples(coupleSearch) }}
                placeholder="Search by name or month (e.g. Jun)..."
                className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring ${coupleId ? 'border-stone-800' : 'border-input'}`}
              />
              {coupleId && (
                <button
                  type="button"
                  onClick={() => { setCoupleId(''); setCoupleName(''); setCoupleSearch(''); setExistingOrders([]) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
              {coupleDropdownOpen && coupleOptions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 rounded-lg border bg-card shadow-lg overflow-auto max-h-[280px]">
                  {groupedCouples.map(({ year, couples }) => (
                    <div key={year}>
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest sticky top-0 bg-muted/50 text-muted-foreground border-b">
                        {year || 'No Date'}
                      </div>
                      {couples.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCouple(c)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
                        >
                          <span>{c.couple_name}</span>
                          {c.wedding_date && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {formatDateLocal(c.wedding_date)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Category ────────────────────────────────────── */}
          <div>
            <Label>Category *</Label>
            <div className="flex gap-2">
              {(['wedding', 'engagement', 'video'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    category === cat
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-accent/50'
                  }`}
                >
                  {cat === 'wedding' ? 'Wedding' : cat === 'engagement' ? 'Engagement' : 'Video'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Product (replaces old Job Type) ────────────── */}
          <div>
            <Label>Product *</Label>
            <select
              value={selectedProductCode}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring"
            >
              <option value="">Select product...</option>
              {groupedProducts.map(({ category: cat, products: prods }) => (
                <optgroup key={cat} label={cat}>
                  {prods.map(p => (
                    <option key={p.product_code} value={p.product_code}>
                      {p.item_name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* ── Quantity ──────────────────────────────────────── */}
          <div>
            <Label>Quantity</Label>
            <input
              type="number"
              min={1}
              max={9999}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
              className="w-24 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring"
            />
          </div>

          {/* ── Description ──────────────────────────────────── */}
          <div>
            <Label>Description</Label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Mom's side, Bride's parents, Groom 24x30"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring"
            />
          </div>

          {/* ── Notes ─────────────────────────────────────────── */}
          <div>
            <Label>Notes</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes..."
              className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm outline-none resize-y transition-colors focus:border-ring"
            />
          </div>

          {/* ── Client Order (physical items only) ────────────── */}
          {isPhysicalItem && (
            <div className="rounded-lg border border-input bg-muted/30 p-4 space-y-3">
              <Label>Client Order</Label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setOrderMode('new'); setSelectedOrderId('') }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    orderMode === 'new'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-accent/50'
                  }`}
                >
                  Create new order
                </button>
                {existingOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOrderMode('existing')}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      orderMode === 'existing'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input hover:bg-accent/50'
                    }`}
                  >
                    Add to existing order
                  </button>
                )}
              </div>

              {orderMode === 'new' && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Vendor</label>
                  <input
                    type="text"
                    list="vendor-suggestions"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="Type or select vendor..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
                  />
                  <datalist id="vendor-suggestions">
                    {VENDOR_SUGGESTIONS.map(v => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Order type: {category === 'video' ? 'video' : 'photo'} — order number auto-generated
                  </p>
                </div>
              )}

              {orderMode === 'existing' && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Select order</label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring"
                  >
                    <option value="">Select an order...</option>
                    {existingOrders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.order_number} — {o.vendor ?? 'No vendor'} ({o.item_count} item{o.item_count !== 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ── Error ───────────────────────────────────────── */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* ── Submit ──────────────────────────────────────── */}
          <button
            type="submit"
            disabled={submitting || !coupleId || !selectedProductCode}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium text-muted-foreground mb-2 select-none">
      {children}
    </div>
  )
}
