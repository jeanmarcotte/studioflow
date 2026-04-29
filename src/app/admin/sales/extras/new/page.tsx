'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Loader2, Search, Plus, X, Trash2, Send } from 'lucide-react'
import { formatWeddingDate } from '@/lib/formatters'
import Link from 'next/link'
import { Playfair_Display, DM_Sans } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'] })

const GOLD = '#C9A84C'
const GOLD_HOVER = '#B8963F'
const BG = '#FAFAF5'
const PAGE_BG = '#FFFFFF'
const TEXT = '#1A1A1A'
const MUTED = '#999999'
const BORDER = '#E8E8E3'
const LIGHT_BG = '#FAFAF5'

const TOP_SELLER_CODES = [
  'SVC-OT-HOUR',
  'VID-RAW-DATA',
  'DIG-HR-WED',
  'DIG-HR-ENG',
  'DIG-HR-HALF',
  'ALB-PAR-1008',
  'TYC-4X6-PC',
  'PRT-5X5-50',
  'SVC-ADD-PHOTO',
]

interface CoupleOption {
  id: string
  bride_first_name: string
  groom_first_name: string
  wedding_date: string | null
}

interface ProductItem {
  product_code: string
  item_name: string
  category: string
  retail_price: number
}

interface LineItem {
  product_code: string
  item_name: string
  quantity: number
  unit_price: number
}

export default function C3ExtrasPage() {
  const router = useRouter()

  // Couple picker state
  const [couples, setCouples] = useState<CoupleOption[]>([])
  const [search, setSearch] = useState('')
  const [selectedCouple, setSelectedCouple] = useState<CoupleOption | null>(null)
  const [searchFocused, setSearchFocused] = useState(false)

  // Form state
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [items, setItems] = useState<LineItem[]>([])
  const [showAddPopup, setShowAddPopup] = useState(false)
  const [taxMode, setTaxMode] = useState<'before' | 'including'>('before')
  const [paymentNote, setPaymentNote] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  // Load couples + products on mount
  useEffect(() => {
    async function fetchData() {
      const [couplesRes, productsRes] = await Promise.all([
        supabase
          .from('couples')
          .select('id, bride_first_name, groom_first_name, wedding_date')
          .not('is_cancelled', 'eq', true)
          .not('booked_date', 'is', null)
          .order('wedding_date', { ascending: true }),
        supabase
          .from('product_catalog')
          .select('product_code, item_name, category, retail_price')
          .eq('active', true)
          .neq('category', 'Package')
          .order('category')
          .order('sort_order'),
      ])

      setCouples(couplesRes.data ?? [])
      setProducts(
        (productsRes.data ?? []).map((p: any) => ({
          ...p,
          retail_price: Number(p.retail_price) || 0,
        }))
      )
      setLoading(false)
    }
    fetchData()
  }, [])

  // Couple search filtering — show results when typing and no couple selected
  const filtered = search.trim().length > 0 && !selectedCouple
    ? couples.filter((c) => {
        const name = `${c.bride_first_name} ${c.groom_first_name}`.toLowerCase()
        return name.includes(search.toLowerCase())
      }).slice(0, 5)
    : []

  function selectCouple(couple: CoupleOption) {
    setSelectedCouple(couple)
    setSearch(`${couple.bride_first_name} & ${couple.groom_first_name}`)
    setSearchFocused(false)
  }

  function clearCouple() {
    setSelectedCouple(null)
    setSearch('')
    setItems([])
    setToast('')
  }

  // Computed totals
  const totals = useMemo(() => {
    const lineSum = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    let subtotal: number
    let hst: number
    let total: number

    if (taxMode === 'before') {
      subtotal = lineSum
      hst = subtotal * 0.13
      total = subtotal + hst
    } else {
      total = lineSum
      subtotal = total / 1.13
      hst = total - subtotal
    }

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      hst: Math.round(hst * 100) / 100,
      total: Math.round(total * 100) / 100,
    }
  }, [items, taxMode])

  function addProduct(product: ProductItem) {
    setItems((prev) => [
      ...prev,
      {
        product_code: product.product_code,
        item_name: product.item_name,
        quantity: 1,
        unit_price: product.retail_price,
      },
    ])
    setShowAddPopup(false)
  }

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!selectedCouple || items.length === 0) return
    setSaving(true)

    try {
      for (const item of items) {
        const lineTotal = item.quantity * item.unit_price
        let lineSubtotal: number
        let lineHst: number
        let lineGrandTotal: number

        if (taxMode === 'before') {
          lineSubtotal = lineTotal
          lineHst = lineSubtotal * 0.13
          lineGrandTotal = lineSubtotal + lineHst
        } else {
          lineGrandTotal = lineTotal
          lineSubtotal = lineTotal / 1.13
          lineHst = lineTotal - lineSubtotal
        }

        await supabase.from('c3_line_items').insert({
          couple_id: selectedCouple.id,
          product_code: item.product_code,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_mode: taxMode,
          subtotal: Math.round(lineSubtotal * 100) / 100,
          hst: Math.round(lineHst * 100) / 100,
          total: Math.round(lineGrandTotal * 100) / 100,
          payment_note: paymentNote || null,
          invoice_date: invoiceDate,
        })
      }

      await fetch('/api/c3/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bride: selectedCouple.bride_first_name,
          groom: selectedCouple.groom_first_name,
          weddingDate: formatWeddingDate(selectedCouple.wedding_date),
          items: items.map((item) => ({
            item_name: item.item_name,
            product_code: item.product_code,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.quantity * item.unit_price,
          })),
          subtotal: totals.subtotal,
          hst: totals.hst,
          total: totals.total,
          paymentNote,
          invoiceDate,
        }),
      })

      setToast('Invoice sent!')
      setTimeout(() => router.push('/admin/sales/extras'), 1200)
    } catch (err) {
      console.error('Save error:', err)
      setToast('Error saving — check console')
      setSaving(false)
    }
  }

  // Product grouping for popup
  const topSellers = products.filter((p) => TOP_SELLER_CODES.includes(p.product_code))
  const otherProducts = products.filter((p) => !TOP_SELLER_CODES.includes(p.product_code))
  const groupedOther = otherProducts.reduce<Record<string, ProductItem[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})
  const sortedCategories = Object.keys(groupedOther).sort()

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: BG }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    )
  }

  return (
    <div className={dmSans.className} style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: BG, color: TEXT, overflow: 'auto' }}>
      {/* Back arrow */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 z-50">
        <Link
          href="/admin/sales/extras"
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: MUTED }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
      </div>

      <div className="flex justify-center px-4" style={{ paddingTop: selectedCouple ? '5vh' : '20vh', paddingBottom: 80 }}>
        <div className="w-full md:max-w-[600px]">

          {/* Brand + Title */}
          <p
            className="uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: '0.2em', color: '#BBBBBB', fontWeight: 500 }}
          >
            SIGS Photography Ltd.
          </p>
          <h1
            className={dmSans.className}
            style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 28, color: TEXT }}
          >
            Extras Sale
          </h1>

          {/* Couple Search Bar */}
          <div className="relative mb-2">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ width: 17, height: 17, color: selectedCouple ? GOLD : '#CCCCCC' }}
            />
            <input
              type="text"
              placeholder="Search by couple name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                if (selectedCouple) clearCouple()
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              className={`${dmSans.className} w-full pr-10 py-3.5 rounded-xl text-sm outline-none transition-all`}
              style={{
                paddingLeft: 44,
                backgroundColor: PAGE_BG,
                border: `1px solid ${selectedCouple ? GOLD : BORDER}`,
                boxShadow: selectedCouple ? `0 0 0 1px ${GOLD}20` : '0 2px 8px rgba(0,0,0,0.04)',
                fontSize: 15,
                color: TEXT,
              }}
            />
            {selectedCouple && (
              <button
                onClick={clearCouple}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors"
                style={{ color: '#CCCCCC' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#888')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#CCCCCC')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Wedding date subtitle when couple selected */}
          {selectedCouple && selectedCouple.wedding_date && (
            <p className="mb-1" style={{ fontSize: 13, color: MUTED, paddingLeft: 2 }}>
              {formatWeddingDate(selectedCouple.wedding_date)}
            </p>
          )}

          {/* Search results dropdown */}
          {filtered.length > 0 && searchFocused && (
            <div
              className="rounded-xl overflow-hidden mb-4"
              style={{
                backgroundColor: PAGE_BG,
                border: `1px solid ${BORDER}`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}
            >
              {filtered.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => selectCouple(c)}
                  className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors"
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #F3F3EE' : 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = LIGHT_BG)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PAGE_BG)}
                >
                  <span className="font-medium" style={{ fontSize: 14 }}>
                    {c.bride_first_name} & {c.groom_first_name}
                  </span>
                  <span style={{ fontSize: 12, color: MUTED }}>
                    {formatWeddingDate(c.wedding_date)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {search.trim().length > 0 && !selectedCouple && filtered.length === 0 && (
            <p className="text-center text-sm mt-4 mb-4" style={{ color: '#BBBBBB' }}>
              No eligible couples found
            </p>
          )}

          {/* ── Form sections (visible after couple selected) ── */}
          {selectedCouple && (
            <>
              {/* Divider */}
              <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 20, marginBottom: 28 }} />

              {/* Invoice Items Card */}
              <div
                className="rounded-2xl overflow-hidden mb-6"
                style={{ backgroundColor: PAGE_BG, border: `1px solid ${BORDER}`, boxShadow: '0 1px 8px rgba(0,0,0,0.03)' }}
              >
                <div className="px-6 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: TEXT }}>
                    Invoice Items
                  </h2>
                </div>

                {items.length === 0 ? (
                  <div className="px-6 py-10 text-center" style={{ color: '#CCCCCC' }}>
                    <p className="text-sm">No items added yet</p>
                  </div>
                ) : (
                  <div>
                    {items.map((item, i) => (
                      <div
                        key={i}
                        className="px-4 md:px-6 py-3.5 flex flex-wrap md:flex-nowrap items-center gap-3"
                        style={{ borderBottom: i < items.length - 1 ? '1px solid #F3F3EE' : 'none' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.item_name}</p>
                          <p className="text-xs" style={{ color: `${GOLD}CC` }}>{item.product_code}</p>
                        </div>
                        <div style={{ width: 58 }}>
                          <label className="block text-[10px] uppercase tracking-wider mb-0.5" style={{ color: MUTED }}>Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-full rounded-lg px-2 py-1.5 text-sm text-center outline-none"
                            style={{ border: `1px solid ${BORDER}` }}
                          />
                        </div>
                        <div style={{ width: 90 }}>
                          <label className="block text-[10px] uppercase tracking-wider mb-0.5" style={{ color: MUTED }}>Price</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unit_price || ''}
                            onChange={(e) => updateItem(i, { unit_price: parseFloat(e.target.value) || 0 })}
                            className="w-full rounded-lg px-2 py-1.5 text-sm text-right outline-none"
                            style={{ border: `1px solid ${BORDER}` }}
                          />
                        </div>
                        <div style={{ width: 85, textAlign: 'right' }}>
                          <label className="block text-[10px] uppercase tracking-wider mb-0.5" style={{ color: MUTED }}>Total</label>
                          <p className="text-sm font-semibold tabular-nums">
                            ${(item.quantity * item.unit_price).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(i)}
                          className="p-1 rounded-lg transition-colors mt-3"
                          style={{ color: '#CCCCCC' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#CCCCCC')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="px-6 py-3.5" style={{ borderTop: '1px solid #F3F3EE' }}>
                  <button
                    onClick={() => setShowAddPopup(true)}
                    className="flex items-center gap-1.5 text-sm font-medium transition-opacity"
                    style={{ color: GOLD }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>
              </div>

              {/* Totals + Fields Card */}
              <div
                className="rounded-2xl overflow-hidden mb-8"
                style={{ backgroundColor: PAGE_BG, border: `1px solid ${BORDER}`, boxShadow: '0 1px 8px rgba(0,0,0,0.03)' }}
              >
                <div className="px-6 py-5 space-y-5">
                  {/* Tax Mode */}
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
                    <label
                      className="uppercase"
                      style={{ fontSize: 10, letterSpacing: '0.08em', color: MUTED, fontWeight: 600, minWidth: 70 }}
                    >
                      Tax Mode
                    </label>
                    <select
                      value={taxMode}
                      onChange={(e) => setTaxMode(e.target.value as 'before' | 'including')}
                      className="rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ border: `1px solid ${BORDER}`, backgroundColor: LIGHT_BG }}
                    >
                      <option value="before">Before Tax</option>
                      <option value="including">Tax Included</option>
                    </select>
                  </div>

                  {/* Totals */}
                  <div style={{ borderTop: '1px solid #F3F3EE', paddingTop: 16 }}>
                    <div className="flex justify-between py-1.5">
                      <span className="text-sm" style={{ color: MUTED }}>Subtotal</span>
                      <span className="text-sm tabular-nums">${totals.subtotal.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-sm" style={{ color: MUTED }}>HST (13%)</span>
                      <span className="text-sm tabular-nums">${totals.hst.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 mt-2" style={{ borderTop: `2px solid ${GOLD}` }}>
                      <span className="text-base font-bold">TOTAL</span>
                      <span className="text-base font-bold tabular-nums">${totals.total.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Payment Note */}
                  <div>
                    <label
                      className="block uppercase mb-1.5"
                      style={{ fontSize: 10, letterSpacing: '0.08em', color: MUTED, fontWeight: 600 }}
                    >
                      Payment Note
                    </label>
                    <input
                      type="text"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="When / how will they pay?"
                      className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                      style={{ border: `1px solid ${BORDER}`, backgroundColor: LIGHT_BG }}
                    />
                  </div>

                  {/* Invoice Date */}
                  <div>
                    <label
                      className="block uppercase mb-1.5"
                      style={{ fontSize: 10, letterSpacing: '0.08em', color: MUTED, fontWeight: 600 }}
                    >
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full md:w-auto rounded-lg px-4 py-2.5 text-sm outline-none"
                      style={{ border: `1px solid ${BORDER}`, backgroundColor: LIGHT_BG }}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button — centered */}
              <div className="flex flex-col items-center gap-3 mb-16">
                {toast && (
                  <span className={`text-sm font-medium ${toast.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                    {toast}
                  </span>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={saving || items.length === 0}
                  className="flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: GOLD,
                    color: '#FFFFFF',
                    boxShadow: '0 2px 12px rgba(201,168,76,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    if (!saving && items.length > 0) {
                      e.currentTarget.style.backgroundColor = GOLD_HOVER
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(201,168,76,0.4)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = GOLD
                    e.currentTarget.style.boxShadow = '0 2px 12px rgba(201,168,76,0.3)'
                  }}
                >
                  <Send className="w-4 h-4" />
                  {saving ? 'Sending...' : 'Submit & Send Invoice'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Item Popup */}
      {showAddPopup && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] px-4" onClick={() => setShowAddPopup(false)}>
          <div className="fixed inset-0 bg-black/30" />
          <div
            className="relative rounded-2xl overflow-hidden w-full max-w-lg max-h-[75vh] flex flex-col"
            style={{ backgroundColor: PAGE_BG, boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Add Product</h3>
              <button onClick={() => setShowAddPopup(false)} className="p-1 rounded-lg transition-colors" style={{ color: MUTED }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="px-6 pt-4 pb-2">
                <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: GOLD }}>Top Sellers</p>
              </div>
              {topSellers.map((p) => (
                <button
                  key={p.product_code}
                  onClick={() => addProduct(p)}
                  className="w-full flex items-center justify-between px-6 py-3 text-left transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = LIGHT_BG)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.item_name}</p>
                    <p className="text-xs" style={{ color: `${GOLD}CC` }}>{p.product_code}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums ml-4" style={{ color: TEXT }}>
                    ${p.retail_price.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </button>
              ))}

              <div className="mx-6 my-3" style={{ borderTop: `1px solid ${BORDER}` }} />

              {sortedCategories.map((category) => (
                <div key={category}>
                  <div className="px-6 pt-3 pb-1">
                    <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: MUTED }}>{category}</p>
                  </div>
                  {groupedOther[category].map((p) => (
                    <button
                      key={p.product_code}
                      onClick={() => addProduct(p)}
                      className="w-full flex items-center justify-between px-6 py-2.5 text-left transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = LIGHT_BG)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{p.item_name}</p>
                        <p className="text-xs" style={{ color: `${GOLD}CC` }}>{p.product_code}</p>
                      </div>
                      <span className="text-sm tabular-nums ml-4" style={{ color: MUTED }}>
                        ${p.retail_price.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                    </button>
                  ))}
                </div>
              ))}

              <div className="h-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
