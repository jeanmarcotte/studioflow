'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, ChevronLeft, ChevronRight, X, Plus, Equal, Download, Check } from 'lucide-react'
import { formatWeddingDate, formatCurrency } from '@/lib/formatters'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'] })

const GOLD = '#C9A84C'
const BG = '#EEEAE4'
const PAGE_BG = '#FFFFFF'
const TEXT = '#1A1A1A'
const MUTED = '#999999'
const BORDER = '#E8E8E3'

const EXTRAS_SALE_AMOUNT = 3008.63
const ALBUM_COLLAGE_TOTAL = 3000

interface CoupleData {
  id: string
  bride_first_name: string
  groom_first_name: string
  wedding_date: string | null
  balance_owing: number | null
  total_paid: number | null
}

interface ContractData {
  id: string
  total: number | null
  reception_venue: string | null
  num_videographers: number | null
  video_highlights: boolean | null
  video_long_form: boolean | null
}

interface ProductItem {
  product_code: string
  category: string
  item_name: string
  description: string
  retail_price: number
}

interface SelectedProducts {
  collage: ProductItem | null
  album: ProductItem | null
  signingBook: ProductItem | null
  weddingCanvas: ProductItem | null
  weddingFrame: ProductItem | null
  extras: ProductItem[]
}

const DEFAULT_CODES: Record<keyof Omit<SelectedProducts, 'extras'>, string> = {
  collage: 'COL-TRIO-CANV',
  album: 'ALB-PREM-2811',
  signingBook: 'ALB-SIGN-08',
  weddingCanvas: 'MNT-CNV-24X30',
  weddingFrame: 'FRM-FLOAT-BLK',
}
const DEFAULT_EXTRA_CODES = ['DIG-PROOF-DL', 'DIG-GALLERY', 'DIG-HR-WED', 'DIG-HR-ENG']

// Page 1 descriptions keyed by slot
const PAGE1_DESCRIPTIONS: Record<string, (p: ProductItem) => string[]> = {
  collage: (p) => [p.description, 'Custom-edited prints with professional retouching'],
  album: (p) => ['Bride & Groom Album — 28×11 layflat, leather or acrylic cover, matt pages, choice of 80 selected photographs or Omakase style, 15 spreads'],
  signingBook: (p) => ['Engagement Signing Book — 8×10 black linen, 6 spreads, 22 images'],
  weddingCanvas: (p) => [p.description],
  weddingFrame: (p) => [p.description, 'Assembly including D rings and wire'],
}

const PV_MILESTONES = [
  'Pick Up Portraits',
  'June 1st, 2026',
  'August 1st, 2026',
  'November 1st, 2026',
  'January 15th 2027',
  '2 Weeks before wedding',
  'Wedding Proof Download (1–2 weeks after wedding)',
  'Pick up the final wedding album & prints',
]

const PO_MILESTONES = [
  'Pick Up Portraits',
  'June 1st, 2026',
  'August 1st, 2026',
  'November 1st, 2026',
  'January 15th 2027',
  'March 1st, 2027',
  '2 Weeks before wedding',
  'Wedding Proof Download (1–2 weeks after wedding)',
]

export default function FrameSalePresentation() {
  const params = useParams()
  const router = useRouter()
  const coupleId = params.coupleId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [couple, setCouple] = useState<CoupleData | null>(null)
  const [contract, setContract] = useState<ContractData | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [editMilestones, setEditMilestones] = useState<string[]>([])
  const [editAmounts, setEditAmounts] = useState<number[]>([])
  const [saleAmount, setSaleAmount] = useState(0)
  const [depositAmount, setDepositAmount] = useState(0)
  const [extraItems, setExtraItems] = useState<{ desc: string; code: string }[]>([])
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [selected, setSelected] = useState<SelectedProducts>({ collage: null, album: null, signingBook: null, weddingCanvas: null, weddingFrame: null, extras: [] })
  const [swapOpen, setSwapOpen] = useState<string | null>(null)
  const [saleAmountManuallyEdited, setSaleAmountManuallyEdited] = useState(false)
  const [discountApplies, setDiscountApplies] = useState(true)

  // Redistribute installments evenly based on current total
  const redistribute = useCallback((total: number, count: number) => {
    if (count <= 0) { setEditAmounts([]); return }
    const safeTotal = isNaN(total) ? 0 : total
    const per = Math.floor((safeTotal * 100) / count) / 100
    const remainder = Math.round((safeTotal - per * count) * 100) / 100
    setEditAmounts(Array.from({ length: count }, (_, i) => i === count - 1 ? per + remainder : per))
  }, [])

  useEffect(() => {
    async function fetch() {
      const { data: coupleData } = await supabase
        .from('couples')
        .select('id, bride_first_name, groom_first_name, wedding_date, balance_owing, total_paid')
        .eq('id', coupleId)
        .limit(1)

      const c = coupleData?.[0] ?? null
      setCouple(c)

      if (c) {
        const { data: contractData } = await supabase
          .from('contracts')
          .select('id, total, reception_venue, num_videographers, video_highlights, video_long_form')
          .eq('couple_id', c.id)
          .limit(1)
        const ct = contractData?.[0] ?? null
        setContract(ct)
        const vid = !!(ct?.num_videographers && ct.num_videographers > 0) || !!ct?.video_highlights || !!ct?.video_long_form
        const ms = vid ? [...PV_MILESTONES] : [...PO_MILESTONES]
        setEditMilestones(ms)
        // redistribute will be triggered by the saleAmount useEffect after calculatedTotal is computed
      }
      // Fetch product catalog
      const { data: productData } = await supabase
        .from('product_catalog')
        .select('product_code, category, item_name, description, retail_price, unit, sort_order')
        .eq('active', true)
        .order('sort_order')
      const prods = productData ?? []
      setProducts(prods)
      const find = (code: string) => prods.find((p: any) => p.product_code === code)
      setSelected({
        collage: find(DEFAULT_CODES.collage) ?? null,
        album: find(DEFAULT_CODES.album) ?? null,
        signingBook: find(DEFAULT_CODES.signingBook) ?? null,
        weddingCanvas: find(DEFAULT_CODES.weddingCanvas) ?? null,
        weddingFrame: find(DEFAULT_CODES.weddingFrame) ?? null,
        extras: DEFAULT_EXTRA_CODES.map(code => find(code)).filter(Boolean) as ProductItem[],
      })

      setLoading(false)
    }
    fetch()
  }, [coupleId, redistribute])

  // Calculate Page 2 total from selected products
  const calculatedTotal = useMemo(() => {
    const collagePrice = selected.collage?.retail_price ?? 0
    const albumPrice = selected.album?.retail_price ?? 0
    const printCredit = 500
    const albumNet = albumPrice - printCredit
    const bookPrice = selected.signingBook?.retail_price ?? 0
    const framePrice = selected.weddingFrame?.retail_price ?? 0
    const canvasPrice = selected.weddingCanvas?.retail_price ?? 0
    const subtotal = collagePrice + albumNet + bookPrice + framePrice + canvasPrice
    const tax = Math.round(subtotal * 0.13 * 100) / 100
    const subtotalWithTax = subtotal + tax
    if (!discountApplies) return Math.round(subtotalWithTax * 100) / 100
    const discount = Math.round(subtotalWithTax * 0.25 * 100) / 100
    return Math.round((subtotalWithTax - discount) * 100) / 100
  }, [selected, discountApplies])

  // Sync Page 2 total → Page 3 sale amount (unless manually edited)
  useEffect(() => {
    if (!saleAmountManuallyEdited && calculatedTotal > 0) {
      setSaleAmount(calculatedTotal)
    }
  }, [calculatedTotal, saleAmountManuallyEdited])

  // Auto-redistribute when saleAmount or deposit changes
  useEffect(() => {
    if (!couple) return
    const bal = couple.balance_owing ?? 0
    const total = bal + saleAmount - depositAmount
    redistribute(total, editMilestones.length)
  }, [saleAmount, depositAmount]) // eslint-disable-line react-hooks/exhaustive-deps

  function goNext() {
    if (page < 4) { setDirection('forward'); setPage(page + 1) }
  }

  function goBack() {
    if (page > 1) { setDirection('backward'); setPage(page - 1) }
    else router.push('/admin/sales/frames/new')
  }

  async function handleSave() {
    if (!couple) return
    setSaving(true)

    const bal = couple.balance_owing ?? 0
    const numInstallments = editMilestones.length
    const totalInstallments = editAmounts.reduce((s, a) => s + a, 0)
    const newBalance = bal + EXTRAS_SALE_AMOUNT

    const { data: orderData, error: orderError } = await supabase
      .from('extras_orders')
      .insert({
        couple_id: coupleId,
        order_type: 'frames_albums',
        order_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        extras_sale_amount: saleAmount,
        contract_balance_remaining: bal,
        new_balance: newBalance,
        num_installments: numInstallments,
        payment_per_installment: editAmounts[0] ?? 0,
        last_installment_amount: editAmounts[editAmounts.length - 1] ?? 0,
        downpayment: depositAmount,
        collage_type: 'canvas_float',
        collage_size: '16x16',
        collage_frame_color: 'black',
        album_qty: 1,
        signing_book: true,
        version: 'v1.0',
      })
      .select('id')
      .limit(1)

    if (orderError) {
      toast.error(`Failed to create sale: ${orderError.message}`)
      setSaving(false)
      return
    }

    const orderId = orderData?.[0]?.id
    if (!orderId) {
      toast.error('Failed to get order ID')
      setSaving(false)
      return
    }

    const installments = editMilestones.map((desc, i) => ({
      extras_order_id: orderId,
      installment_number: i + 1,
      due_description: desc,
      amount: editAmounts[i] ?? 0,
      paid: false,
    }))

    const { error: installError } = await supabase
      .from('extras_installments')
      .insert(installments)

    if (installError) {
      toast.error(`Failed to create installments: ${installError.message}`)
      setSaving(false)
      return
    }

    await supabase
      .from('couples')
      .update({ c2_amount: saleAmount })
      .eq('id', coupleId)

    toast.success(`C2 saved as Pending for ${couple.bride_first_name} & ${couple.groom_first_name}`)
    router.push('/admin/sales/frames')
  }

  async function handleApproved() {
    if (!couple) return
    setSaving(true)

    const bal = couple.balance_owing ?? 0
    const numInstallments = editMilestones.length
    const newBalance = bal + saleAmount
    const today = new Date().toISOString().split('T')[0]

    const { data: orderData, error: orderError } = await supabase
      .from('extras_orders')
      .insert({
        couple_id: coupleId,
        order_type: 'frames_albums',
        order_date: today,
        status: 'signed',
        extras_sale_amount: saleAmount,
        contract_balance_remaining: bal,
        new_balance: newBalance,
        num_installments: numInstallments,
        payment_per_installment: editAmounts[0] ?? 0,
        last_installment_amount: editAmounts[editAmounts.length - 1] ?? 0,
        downpayment: depositAmount,
        collage_type: 'canvas_float',
        collage_size: '16x16',
        collage_frame_color: 'black',
        album_qty: 1,
        signing_book: true,
        version: 'v1.0',
      })
      .select('id')
      .limit(1)

    if (orderError) {
      toast.error(`Failed to create sale: ${orderError.message}`)
      setSaving(false)
      return
    }

    const orderId = orderData?.[0]?.id
    if (!orderId) {
      toast.error('Failed to get order ID')
      setSaving(false)
      return
    }

    const installments = editMilestones.map((desc, i) => ({
      extras_order_id: orderId,
      installment_number: i + 1,
      due_description: desc,
      amount: editAmounts[i] ?? 0,
      paid: false,
    }))

    const { error: installError } = await supabase
      .from('extras_installments')
      .insert(installments)

    if (installError) {
      toast.error(`Failed to create installments: ${installError.message}`)
      setSaving(false)
      return
    }

    await supabase
      .from('couples')
      .update({ c2_amount: saleAmount })
      .eq('id', coupleId)

    // Send approval email
    try {
      await fetch('/api/c2/approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bride: couple.bride_first_name,
          groom: couple.groom_first_name,
          saleAmount,
          numInstallments,
          dateApproved: today,
        }),
      })
    } catch (emailErr) {
      console.error('Email notification failed:', emailErr)
    }

    toast.success(`C2 approved for ${couple.bride_first_name} & ${couple.groom_first_name}`)
    router.push('/admin/sales/frames')
  }

  if (loading || !couple) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: BG }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    )
  }

  const hasVideo = !!(contract?.num_videographers && contract.num_videographers > 0) || !!contract?.video_highlights || !!contract?.video_long_form
  const balanceOwing = couple.balance_owing ?? 0

  const slideVariants = {
    enter: (dir: string) => ({ opacity: 0, x: dir === 'forward' ? 50 : -50 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: string) => ({ opacity: 0, x: dir === 'forward' ? -50 : 50 }),
  }

  return (
    <div className={dmSans.className} style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: BG, color: TEXT, overflow: 'auto' }}>

      {/* Left arrow (all pages — page 1 goes back to selector) */}
      <button
        onClick={goBack}
        className="fixed z-50 transition-all rounded-full"
        style={{ left: 16, top: '50%', transform: 'translateY(-50%)', padding: 18, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = GOLD; e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        <ChevronLeft style={{ width: 44, height: 44 }} />
      </button>

      {/* Right arrow */}
      {page < 4 && (
        <button
          onClick={goNext}
          className="fixed z-50 transition-all rounded-full"
          style={{ right: 16, top: '50%', transform: 'translateY(-50%)', padding: 18, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = GOLD; e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <ChevronRight style={{ width: 44, height: 44 }} />
        </button>
      )}

      {/* White page container */}
      <div className="flex justify-center" style={{ padding: '40px 24px', minHeight: '100vh' }}>
        <div
          style={{
            width: '100%',
            maxWidth: 880,
            backgroundColor: PAGE_BG,
            borderRadius: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            padding: '56px 64px',
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between" style={{ marginBottom: 48 }}>
            <div>
              <h1
                className={playfair.className}
                style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.01em' }}
              >
                {couple.bride_first_name} & {couple.groom_first_name}
              </h1>
              <p style={{ fontSize: 14, color: MUTED, marginTop: 6 }}>
                {formatWeddingDate(couple.wedding_date)}
              </p>
            </div>
            <p
              className="text-right"
              style={{ fontSize: 11, color: '#CCCCCC', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 8 }}
            >
              SIGS Photography Ltd.
            </p>
          </div>

          {/* Animated page content */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={page}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >

              {/* ─── PAGE 1: The Package ─── */}
              {page === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
                  {selected.collage && (
                    <MenuSection title="Collage" items={PAGE1_DESCRIPTIONS.collage(selected.collage)} />
                  )}
                  <MenuSection title="Albums" items={[
                    ...(selected.album ? PAGE1_DESCRIPTIONS.album(selected.album) : []),
                    ...(selected.signingBook ? PAGE1_DESCRIPTIONS.signingBook(selected.signingBook) : []),
                  ]} />
                  <MenuSection title="Wedding Frame" items={[
                    ...(selected.weddingFrame ? [selected.weddingFrame.description] : []),
                    ...(selected.weddingCanvas ? PAGE1_DESCRIPTIONS.weddingCanvas(selected.weddingCanvas) : []),
                    'Assembly including D rings and wire',
                  ]} />
                  <MenuSection title="Extras Included" items={
                    selected.extras.map(e => e.description)
                  } />
                </div>
              )}

              {/* ─── PAGE 2: Expense Breakdown ─── */}
              {page === 2 && (() => {
                const collagePrice = selected.collage?.retail_price ?? 0
                const albumPrice = selected.album?.retail_price ?? 0
                const printCredit = 500
                const albumNet = albumPrice - printCredit
                const bookPrice = selected.signingBook?.retail_price ?? 0
                const framePrice = selected.weddingFrame?.retail_price ?? 0
                const canvasPrice = selected.weddingCanvas?.retail_price ?? 0
                const digTotal = selected.extras.reduce((s, e) => s + (e.retail_price ?? 0), 0)
                const subtotal = collagePrice + albumNet + bookPrice + framePrice + canvasPrice
                const tax = Math.round(subtotal * 0.13 * 100) / 100
                const subtotalWithTax = subtotal + tax
                const discount = discountApplies ? Math.round(subtotalWithTax * 0.25 * 100) / 100 : 0
                const totalAfterDiscount = Math.round((subtotalWithTax - discount) * 100) / 100
                return (
                <div>
                  <h2
                    className={playfair.className}
                    style={{ fontSize: 22, fontWeight: 700, marginBottom: 40 }}
                  >
                    Expense Breakdown
                  </h2>

                  <div>
                    <LedgerLine label="Engagement Photo Collage" amount={formatCurrency(collagePrice)} />
                    <LedgerLine label={`Wedding Album ($${albumPrice.toLocaleString()} – $${printCredit} print credit)`} amount={formatCurrency(albumNet)} />
                    <LedgerLine label="Engagement Sign Book" amount={formatCurrency(bookPrice)} />
                    <LedgerLine label="Wedding Frame" amount={formatCurrency(framePrice)} />
                    <LedgerLine label={`${selected.weddingCanvas?.item_name ?? 'Canvas'}`} amount={formatCurrency(canvasPrice)} />
                    <LedgerLine label="Engagement and Wedding High-Resolution files *" amount="$0.00" />
                  </div>

                  <div style={{ margin: '32px 0', height: 1, backgroundColor: GOLD }} />

                  <div>
                    <LedgerLine label="Subtotal" amount={formatCurrency(subtotal)} bold />
                    <LedgerLine label="Tax (13%)" amount={formatCurrency(tax)} />
                    <LedgerLine label="Subtotal including Tax" amount={formatCurrency(subtotalWithTax)} bold />
                    {discountApplies && <LedgerLine label="SIGS Customer Discount (25%)" amount={`–${formatCurrency(discount)}`} green />}
                  </div>

                  <div
                    className="flex items-center justify-between"
                    style={{ marginTop: 32, paddingTop: 24, borderTop: `2px solid ${TEXT}` }}
                  >
                    <p className={playfair.className} style={{ fontSize: 18, fontWeight: 700 }}>
                      Total Cost after Discount
                    </p>
                    <p className={playfair.className} style={{ fontSize: 22, fontWeight: 700 }}>
                      {formatCurrency(totalAfterDiscount)}
                    </p>
                  </div>

                  <p
                    style={{
                      fontSize: 14,
                      color: '#4B5563',
                      lineHeight: 1.7,
                      marginTop: 40,
                      paddingTop: 24,
                      borderTop: `1px solid ${BORDER}`,
                    }}
                  >
{discountApplies
  ? `* The cost for the Engagement and Wedding High-Resolution files is listed as $0.00 CAD, however, the retail price is ${formatCurrency(digTotal)} plus tax. When purchasing the above package there is no additional charge for these files. SIGS Customer Discount (25%) applies only when purchasing the package.`
  : '* SIGS Customer Discount (25%) applies only when purchasing the complete package. Items have been removed from this quote.'}
                  </p>
                </div>
                )
              })()}

              {/* ─── PAGE 3: Payment Schedule ─── */}
              {page === 3 && (() => {
                const derivedTotal = balanceOwing + saleAmount - depositAmount
                return (
                <div>
                  <h2
                    className={playfair.className}
                    style={{ fontSize: 22, fontWeight: 700, marginBottom: 40 }}
                  >
                    Payment Schedule
                  </h2>

                  <div style={{ marginBottom: 40 }}>
                    <FinanceRow
                      amount={formatCurrency(balanceOwing)}
                      label="Remaining in wedding agreement"
                    />
                    <EditableFinanceRow
                      value={saleAmount}
                      onChange={(v) => { setSaleAmount(v); setSaleAmountManuallyEdited(true) }}
                      label="Album & Collage including tax"
                    />
                    <EditableFinanceRow
                      value={depositAmount}
                      onChange={(v) => setDepositAmount(v)}
                      label="Deposit"
                      prefix="–"
                    />

                    <div style={{ height: 1, backgroundColor: GOLD, margin: '20px 0' }} />

                    <FinanceRow
                      amount={formatCurrency(derivedTotal)}
                      label={`divided into ${editMilestones.length} payments of ${formatCurrency(editAmounts[0] ?? 0)} including tax`}
                    />
                  </div>

                  <div style={{ marginBottom: 48 }}>
                    <h3
                      className={playfair.className}
                      style={{ fontSize: 16, fontWeight: 700, marginBottom: 28 }}
                    >
                      {hasVideo ? 'Photo & Video Schedule' : 'Photo Only Schedule'}
                    </h3>

                    <div className="relative" style={{ paddingLeft: 44 }}>
                      <div
                        className="absolute"
                        style={{
                          left: 15,
                          top: 16,
                          bottom: 16,
                          width: 2,
                          backgroundColor: GOLD,
                          opacity: 0.3,
                        }}
                      />

                      {editMilestones.map((milestone, i) => (
                        <div
                          key={i}
                          className="relative flex items-center group"
                          style={{ minHeight: 48, marginBottom: i < editMilestones.length - 1 ? 4 : 0 }}
                        >
                          <div
                            className="absolute flex items-center justify-center rounded-full"
                            style={{
                              left: -44,
                              width: 32,
                              height: 32,
                              backgroundColor: i === 0 ? GOLD : PAGE_BG,
                              border: `2px solid ${GOLD}`,
                              fontSize: 13,
                              fontWeight: 600,
                              color: i === 0 ? '#FFFFFF' : GOLD,
                            }}
                          >
                            {i + 1}
                          </div>

                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={milestone}
                              onChange={(e) => {
                                const next = [...editMilestones]
                                next[i] = e.target.value
                                setEditMilestones(next)
                              }}
                              className="flex-1 bg-transparent outline-none border border-transparent rounded px-2 py-1 transition-colors focus:border-amber-300 focus:bg-amber-50/30"
                              style={{ fontSize: 15, lineHeight: 1.6 }}
                            />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editAmounts[i] ?? 0}
                              onChange={(e) => {
                                const next = [...editAmounts]
                                next[i] = parseFloat(e.target.value) ?? 0
                                setEditAmounts(next)
                              }}
                              onFocus={(e) => e.target.select()}
                              className="tabular-nums bg-transparent outline-none border border-transparent rounded px-2 py-1 text-right transition-colors hover:border-dashed hover:border-amber-400 focus:border-amber-300 focus:bg-amber-50/30"
                              style={{ fontSize: 14, fontWeight: 500, color: MUTED, width: 90, cursor: 'text' }}
                            />
                            {editMilestones.length > 1 && (
                              <button
                                onClick={() => {
                                  const newMs = editMilestones.filter((_, j) => j !== i)
                                  setEditMilestones(newMs)
                                  redistribute(derivedTotal, newMs.length)
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                                style={{ color: '#D97706' }}
                              >
                                <X style={{ width: 14, height: 14 }} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Action buttons */}
                      <div className="flex items-center gap-4 mt-4 ml-2">
                        <button
                          onClick={() => {
                            const newMs = [...editMilestones, '']
                            setEditMilestones(newMs)
                            redistribute(derivedTotal, newMs.length)
                          }}
                          className="flex items-center gap-2 text-sm transition-colors"
                          style={{ color: GOLD, background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <Plus style={{ width: 16, height: 16 }} /> Add Installment
                        </button>
                        <button
                          onClick={() => redistribute(derivedTotal, editMilestones.length)}
                          className="flex items-center gap-2 text-sm transition-colors"
                          style={{ color: GOLD, background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <Equal style={{ width: 16, height: 16 }} /> Redistribute Evenly
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Save + Download + Approved */}
                  <div className="flex justify-center gap-4" style={{ paddingTop: 16 }}>
                    <button
                      onClick={() => window.print()}
                      className="px-8 py-3.5 rounded-xl text-base font-semibold tracking-wide transition-all flex items-center gap-2"
                      style={{
                        border: `1.5px solid ${GOLD}`,
                        color: GOLD,
                        backgroundColor: 'transparent',
                        letterSpacing: '0.02em',
                      }}
                    >
                      <Download style={{ width: 16, height: 16 }} /> Download
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-8 py-3.5 rounded-xl text-base font-semibold tracking-wide transition-all disabled:opacity-50"
                      style={{
                        border: `1.5px solid ${GOLD}`,
                        color: GOLD,
                        backgroundColor: 'transparent',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> : null}
                      Save & Close
                    </button>
                    <button
                      onClick={handleApproved}
                      disabled={saving}
                      className="px-8 py-3.5 rounded-xl text-base font-semibold tracking-wide transition-all disabled:opacity-50 flex items-center gap-2"
                      style={{
                        backgroundColor: '#16a34a',
                        color: '#FFFFFF',
                        boxShadow: '0 2px 12px rgba(22,163,74,0.3)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> : null}
                      Approved <Check style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                </div>
                )
              })()}

              {/* ─── PAGE 4: Calculations ─── */}
              {page === 4 && (() => {
                const slotItems: { slot: keyof Omit<SelectedProducts, 'extras'>; title: string }[] = [
                  { slot: 'collage', title: 'Collage' },
                ]
                const albumItems: (keyof Omit<SelectedProducts, 'extras'>)[] = ['album', 'signingBook']
                const frameItems: (keyof Omit<SelectedProducts, 'extras'>)[] = ['weddingCanvas', 'weddingFrame']

                function swapProduct(slot: keyof Omit<SelectedProducts, 'extras'>, product: ProductItem) {
                  setSelected(prev => ({ ...prev, [slot]: product }))
                  setSwapOpen(null)
                }

                function removeSlot(slot: keyof Omit<SelectedProducts, 'extras'>) {
                  setSelected(prev => ({ ...prev, [slot]: null }))
                  setDiscountApplies(false)
                }

                function removeExtra(i: number) {
                  setSelected(prev => ({ ...prev, extras: prev.extras.filter((_, j) => j !== i) }))
                  setDiscountApplies(false)
                }

                function renderSwappableLine(product: ProductItem | null, slot: string, onSwap: (p: ProductItem) => void, onRemove: () => void) {
                  if (!product) return null
                  const sameCat = products.filter((p: any) => p.category === product.category)
                  return (
                    <div className="flex items-center justify-between group" style={{ padding: '10px 0', borderBottom: `1px dashed ${BORDER}` }}>
                      <p style={{ fontSize: 16, color: '#444444', lineHeight: 1.6 }}>{product.description}</p>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <button
                            onClick={() => setSwapOpen(swapOpen === slot ? null : slot)}
                            className="transition-all"
                            style={{
                              fontSize: 13,
                              color: swapOpen === slot ? '#FFFFFF' : '#9CA3AF',
                              fontFamily: 'monospace',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              background: swapOpen === slot ? GOLD : 'none',
                              border: 'none',
                              padding: '2px 6px',
                              borderRadius: 4,
                              borderBottom: swapOpen === slot ? 'none' : '1px dashed transparent',
                            }}
                            onMouseEnter={(e) => { if (swapOpen !== slot) e.currentTarget.style.borderBottom = `1px dashed ${GOLD}` }}
                            onMouseLeave={(e) => { if (swapOpen !== slot) e.currentTarget.style.borderBottom = '1px dashed transparent' }}
                          >
                            {product.product_code}
                          </button>
                          {swapOpen === slot && (
                            <div
                              className="absolute right-0 top-8 z-20 rounded-xl overflow-hidden"
                              style={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E8E8E3',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                width: 320,
                              }}
                            >
                              {sameCat.map((p: any) => (
                                <button
                                  key={p.product_code}
                                  onClick={() => onSwap(p)}
                                  className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                                  style={{
                                    borderBottom: '1px solid #F3F3EE',
                                    fontWeight: p.product_code === product.product_code ? 700 : 400,
                                    backgroundColor: p.product_code === product.product_code ? '#FFF8E7' : '#FFFFFF',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = p.product_code === product.product_code ? '#FFF8E7' : '#FAFAF5')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = p.product_code === product.product_code ? '#FFF8E7' : '#FFFFFF')}
                                >
                                  <span style={{ fontSize: 14 }}>{p.item_name}</span>
                                  <span style={{ fontSize: 13, color: MUTED }}>{formatCurrency(p.retail_price)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={onRemove}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                          style={{ color: '#D97706', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <X style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
                  {/* Collage */}
                  {selected.collage && (
                    <div>
                      <h3 className={playfair.className} style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: TEXT }}>Collage</h3>
                      <div style={{ width: 40, height: 1, backgroundColor: GOLD, marginBottom: 16 }} />
                      {renderSwappableLine(selected.collage, 'collage', (p) => swapProduct('collage', p), () => removeSlot('collage'))}
                    </div>
                  )}

                  {/* Albums */}
                  {(selected.album ?? selected.signingBook) && (
                    <div>
                      <h3 className={playfair.className} style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: TEXT }}>Albums</h3>
                      <div style={{ width: 40, height: 1, backgroundColor: GOLD, marginBottom: 16 }} />
                      {renderSwappableLine(selected.album, 'album', (p) => swapProduct('album', p), () => removeSlot('album'))}
                      {renderSwappableLine(selected.signingBook, 'signingBook', (p) => swapProduct('signingBook', p), () => removeSlot('signingBook'))}
                    </div>
                  )}

                  {/* Wedding Frame */}
                  {(selected.weddingCanvas ?? selected.weddingFrame) && (
                    <div>
                      <h3 className={playfair.className} style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: TEXT }}>Wedding Frame</h3>
                      <div style={{ width: 40, height: 1, backgroundColor: GOLD, marginBottom: 16 }} />
                      {renderSwappableLine(selected.weddingCanvas, 'weddingCanvas', (p) => swapProduct('weddingCanvas', p), () => removeSlot('weddingCanvas'))}
                      {renderSwappableLine(selected.weddingFrame, 'weddingFrame', (p) => swapProduct('weddingFrame', p), () => removeSlot('weddingFrame'))}
                    </div>
                  )}

                  {/* Extras */}
                  <div>
                    <h3 className={playfair.className} style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: TEXT }}>Extras Included</h3>
                    <div style={{ width: 40, height: 1, backgroundColor: GOLD, marginBottom: 16 }} />
                    {selected.extras.map((ext, i) => (
                      <div key={`${ext.product_code}-${i}`} className="flex items-center justify-between group" style={{ padding: '10px 0', borderBottom: `1px dashed ${BORDER}` }}>
                        <p style={{ fontSize: 16, color: '#444444', lineHeight: 1.6 }}>{ext.description}</p>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 13, color: '#9CA3AF', fontFamily: 'monospace' }}>{ext.product_code}</span>
                          <button
                            onClick={() => removeExtra(i)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                            style={{ color: '#D97706', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            <X style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* Add item */}
                    <div className="relative" style={{ marginTop: 12 }}>
                      <button
                        onClick={() => setShowProductPicker(!showProductPicker)}
                        className="flex items-center gap-2 text-sm transition-colors"
                        style={{ color: GOLD, background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Plus style={{ width: 16, height: 16 }} /> Add Item
                      </button>
                      {showProductPicker && (
                        <div
                          className="absolute left-0 top-8 z-10 rounded-xl overflow-hidden"
                          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E3', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 300, overflowY: 'auto', width: 420 }}
                        >
                          {(() => {
                            const grouped: Record<string, any[]> = {}
                            products.forEach((p: any) => { const cat = p.category ?? 'Other'; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(p) })
                            return Object.entries(grouped).map(([cat, items]) => (
                              <div key={cat}>
                                <p className="px-4 py-2 text-xs uppercase tracking-wider" style={{ color: '#BBBBBB', backgroundColor: '#FAFAF5' }}>{cat}</p>
                                {items.map((p: any) => (
                                  <button
                                    key={p.product_code}
                                    onClick={() => {
                                      const allCodes = [
                                        selected.collage?.product_code,
                                        selected.album?.product_code,
                                        selected.signingBook?.product_code,
                                        selected.weddingCanvas?.product_code,
                                        selected.weddingFrame?.product_code,
                                        ...selected.extras.map(e => e.product_code),
                                      ].filter(Boolean)
                                      if (allCodes.includes(p.product_code)) {
                                        toast.error('This item is already included')
                                        setShowProductPicker(false)
                                        return
                                      }
                                      setSelected(prev => ({ ...prev, extras: [...prev.extras, p] }))
                                      setShowProductPicker(false)
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                                    style={{ borderBottom: '1px solid #F3F3EE' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFAF5')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                                  >
                                    <span style={{ fontSize: 14 }}>{p.item_name ?? p.description}</span>
                                    <span style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>{p.product_code}</span>
                                  </button>
                                ))}
                              </div>
                            ))
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )
              })()}

            </motion.div>
          </AnimatePresence>

          {/* Page numbers — bottom right */}
          <div className="flex justify-end gap-1" style={{ marginTop: 40 }}>
            {[1, 2, 3, 4].map((p) => (
              <button
                key={p}
                onClick={() => {
                  setDirection(p > page ? 'forward' : 'backward')
                  setPage(p)
                }}
                className={`${dmSans.className} transition-colors rounded-lg`}
                style={{
                  padding: '16px 20px',
                  fontSize: 16,
                  fontWeight: p === page ? 700 : 400,
                  color: p === page ? GOLD : '#9CA3AF',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function MenuSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2
        className={playfair.className}
        style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: TEXT }}
      >
        {title}
      </h2>
      <div style={{ width: 40, height: 1, backgroundColor: GOLD, marginBottom: 20 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 2 }}>
        {items.map((item, i) => (
          <p key={i} style={{ fontSize: 14, lineHeight: 1.8, color: '#444444' }}>
            <span style={{ color: GOLD, marginRight: 12 }}>&mdash;</span>
            {item}
          </p>
        ))}
      </div>
    </div>
  )
}

function LedgerLine({ label, amount, bold, green }: { label: string; amount: string; bold?: boolean; green?: boolean }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: '14px 0', borderBottom: `1px solid ${BORDER}` }}
    >
      <p style={{ fontSize: 16, color: '#444444', fontWeight: bold ? 600 : 400 }}>{label}</p>
      <p
        className="tabular-nums"
        style={{
          fontSize: 16,
          fontWeight: bold ? 600 : 500,
          color: green ? '#059669' : TEXT,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {amount}
      </p>
    </div>
  )
}

function InvoiceSection({ title, items }: { title: string; items: { desc: string; code: string }[] }) {
  return (
    <div>
      <h3
        className={playfair.className}
        style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: TEXT }}
      >
        {title}
      </h3>
      <div style={{ width: 40, height: 1, backgroundColor: GOLD, marginBottom: 16 }} />
      <div>
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between"
            style={{ padding: '10px 0', borderBottom: `1px dashed ${BORDER}` }}
          >
            <p style={{ fontSize: 16, color: '#444444', lineHeight: 1.6 }}>{item.desc}</p>
            <p style={{ fontSize: 13, color: '#9CA3AF', fontFamily: 'monospace', whiteSpace: 'nowrap', marginLeft: 16 }}>{item.code}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function FinanceRow({ amount, label }: { amount: string; label: string }) {
  return (
    <div className="flex items-baseline gap-5" style={{ padding: '12px 0' }}>
      <p
        className="tabular-nums"
        style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 120 }}
      >
        {amount}
      </p>
      <p style={{ fontSize: 16, color: '#888888' }}>{label}</p>
    </div>
  )
}

function EditableFinanceRow({ value, onChange, label, prefix }: { value: number; onChange: (v: number) => void; label: string; prefix?: string }) {
  return (
    <div className="flex items-baseline gap-5" style={{ padding: '12px 0' }}>
      <div className="flex items-baseline" style={{ minWidth: 140 }}>
        {prefix && <span className="tabular-nums" style={{ fontSize: 16, fontWeight: 700 }}>{prefix}</span>}
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) ?? 0)}
          onFocus={(e) => e.target.select()}
          className="tabular-nums bg-transparent outline-none border border-transparent rounded px-1 py-0.5 transition-colors hover:border-dashed hover:border-amber-400 focus:border-amber-300 focus:bg-amber-50/30"
          style={{ fontSize: 16, fontWeight: 700, minWidth: 140, cursor: 'text' }}
        />
      </div>
      <p style={{ fontSize: 16, color: '#888888' }}>{label}</p>
    </div>
  )
}
