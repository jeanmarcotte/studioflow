'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, ChevronLeft, ChevronRight, X, Plus, Equal, Download } from 'lucide-react'
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
  const [saleAmount, setSaleAmount] = useState(ALBUM_COLLAGE_TOTAL)
  const [depositAmount, setDepositAmount] = useState(0)
  const [extraItems, setExtraItems] = useState<{ desc: string; code: string }[]>([])
  const [showProductPicker, setShowProductPicker] = useState(false)

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
        const bal = c.balance_owing ?? 0
        const dep = Math.round((bal + ALBUM_COLLAGE_TOTAL - (ms.length * Math.floor((bal + ALBUM_COLLAGE_TOTAL) / ms.length))) * 100) / 100
        setDepositAmount(dep)
        const totalAfter = bal + ALBUM_COLLAGE_TOTAL - dep
        const perInst = Math.floor(totalAfter / ms.length * 100) / 100
        const lastInst = Math.round((totalAfter - perInst * (ms.length - 1)) * 100) / 100
        setEditAmounts(ms.map((_, i) => i === ms.length - 1 ? lastInst : perInst))
      }
      // Fetch product catalog
      const { data: productData } = await supabase
        .from('product_catalog')
        .select('product_code, category, item_name, description, retail_price, unit, sort_order')
        .eq('active', true)
        .order('sort_order')
      setProducts(productData ?? [])

      setLoading(false)
    }
    fetch()
  }, [coupleId])

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

    const balanceOwing = couple.balance_owing ?? 0
    const numInstallments = editMilestones.length
    const deposit = balanceOwing + ALBUM_COLLAGE_TOTAL - (numInstallments * Math.floor((balanceOwing + ALBUM_COLLAGE_TOTAL) / numInstallments))
    const totalAfterDeposit = balanceOwing + ALBUM_COLLAGE_TOTAL - deposit
    const perInstallment = Math.floor(totalAfterDeposit / numInstallments * 100) / 100
    const lastInstallment = Math.round((totalAfterDeposit - perInstallment * (numInstallments - 1)) * 100) / 100
    const newBalance = balanceOwing + EXTRAS_SALE_AMOUNT

    const { data: orderData, error: orderError } = await supabase
      .from('extras_orders')
      .insert({
        couple_id: coupleId,
        order_type: 'frames_albums',
        order_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        extras_sale_amount: EXTRAS_SALE_AMOUNT,
        contract_balance_remaining: balanceOwing,
        new_balance: newBalance,
        num_installments: numInstallments,
        payment_per_installment: perInstallment,
        last_installment_amount: lastInstallment,
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
      amount: i === numInstallments - 1 ? lastInstallment : perInstallment,
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
      .update({ c2_amount: EXTRAS_SALE_AMOUNT })
      .eq('id', coupleId)

    toast.success(`C2 Frame & Album sale created for ${couple.bride_first_name} & ${couple.groom_first_name}`)
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
                  <MenuSection title="Collage" items={[
                    '3 × 16×16 custom-edited prints with editing',
                    'All 3 mounted on canvas stretcher',
                    'All 3 framed with black float-frame',
                  ]} />
                  <MenuSection title="Albums" items={[
                    '1 × 28×11 digital album with leather cover or acrylic cover, matt pages',
                    'Choice of 80 selected photographs or Omakase style',
                    '15 spreads',
                    '8×10 Engagement signing book, black linen, 6 spreads, 22 images',
                  ]} />
                  <MenuSection title="Wedding Frame" items={[
                    'Black floating frame same style as engagement portraits',
                    '24×30 photo (in wedding package) mounted on canvas stretcher',
                    'Assembly including D rings and wire',
                  ]} />
                  <MenuSection title="Extras Included" items={[
                    'Download link of all Engagement Proof files Dropbox without watermark',
                    'Online proofing and download share and customer gallery',
                    'High-resolution digital files for Wedding images 16×24 300 dpi',
                    'High-resolution digital files for Engagement images 16×16 300 dpi',
                  ]} />
                </div>
              )}

              {/* ─── PAGE 2: Expense Breakdown ─── */}
              {page === 2 && (
                <div>
                  <h2
                    className={playfair.className}
                    style={{ fontSize: 22, fontWeight: 700, marginBottom: 40 }}
                  >
                    Expense Breakdown
                  </h2>

                  <div>
                    <LedgerLine label="Engagement Photo Collage" amount="$1,500.00" />
                    <LedgerLine label="Wedding Album ($1,750 – $500 print credit)" amount="$1,250.00" />
                    <LedgerLine label="Engagement Sign Book" amount="$200.00" />
                    <LedgerLine label="Wedding Frame" amount="$400.00" />
                    <LedgerLine label="24×30 Canvas" amount="$200.00" />
                    <LedgerLine label="Engagement and Wedding High-Resolution files *" amount="$0.00" />
                  </div>

                  <div style={{ margin: '32px 0', height: 1, backgroundColor: GOLD }} />

                  <div>
                    <LedgerLine label="Subtotal" amount="$3,550.00" bold />
                    <LedgerLine label="Tax (13%)" amount="$461.50" />
                    <LedgerLine label="Subtotal including Tax" amount="$4,011.50" bold />
                    <LedgerLine label="SIGS Customer Discount (25%)" amount="–$1,002.88" green />
                  </div>

                  <div
                    className="flex items-center justify-between"
                    style={{ marginTop: 32, paddingTop: 24, borderTop: `2px solid ${TEXT}` }}
                  >
                    <p className={playfair.className} style={{ fontSize: 20, fontWeight: 700 }}>
                      Total Cost after Discount
                    </p>
                    <p className={playfair.className} style={{ fontSize: 28, fontWeight: 700 }}>
                      $3,008.63
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
* The cost for the Engagement and Wedding High-Resolution files is listed as $0.00 CAD, however, the retail price is $2,250 plus tax. When purchasing the above package there is no additional charge for these files. SIGS Customer Discount (25%) applies only when purchasing the package.
                  </p>
                </div>
              )}

              {/* ─── PAGE 3: Payment Schedule ─── */}
              {page === 3 && (() => {
                const n = editMilestones.length
                const dep = balanceOwing + ALBUM_COLLAGE_TOTAL - (n * Math.floor((balanceOwing + ALBUM_COLLAGE_TOTAL) / n))
                const totalAfterDep = balanceOwing + ALBUM_COLLAGE_TOTAL - dep
                const perInst = Math.floor(totalAfterDep / n * 100) / 100
                const lastInst = Math.round((totalAfterDep - perInst * (n - 1)) * 100) / 100
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
                    <FinanceRow
                      amount={formatCurrency(ALBUM_COLLAGE_TOTAL)}
                      label="Album & Collage including tax"
                    />
                    <FinanceRow
                      amount={`–${formatCurrency(dep)}`}
                      label="Deposit by E-transfer"
                    />

                    <div style={{ height: 1, backgroundColor: GOLD, margin: '20px 0' }} />

                    <FinanceRow
                      amount={formatCurrency(totalAfterDep)}
                      label={`divided into ${n} equal payments of ${formatCurrency(perInst)} including tax`}
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
                            <p
                              className="tabular-nums"
                              style={{ fontSize: 14, fontWeight: 500, color: MUTED, whiteSpace: 'nowrap' }}
                            >
                              {i === editMilestones.length - 1 ? formatCurrency(lastInst) : formatCurrency(perInst)}
                            </p>
                            {i > 0 && (
                              <button
                                onClick={() => setEditMilestones(editMilestones.filter((_, j) => j !== i))}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                                style={{ color: '#D97706' }}
                              >
                                <X style={{ width: 14, height: 14 }} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Add installment */}
                      <button
                        onClick={() => setEditMilestones([...editMilestones, ''])}
                        className="flex items-center gap-2 mt-4 ml-2 text-sm transition-colors"
                        style={{ color: GOLD, background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Plus style={{ width: 16, height: 16 }} /> Add Installment
                      </button>
                    </div>
                  </div>

                  {/* Save & Close */}
                  <div className="flex justify-center" style={{ paddingTop: 16 }}>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-10 py-4 rounded-xl text-base font-semibold tracking-wide transition-all disabled:opacity-50"
                      style={{
                        backgroundColor: GOLD,
                        color: '#FFFFFF',
                        boxShadow: '0 2px 12px rgba(201,168,76,0.3)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> : null}
                      Save & Close
                    </button>
                  </div>
                </div>
                )
              })()}

              {/* ─── PAGE 4: Calculations ─── */}
              {page === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
                  <InvoiceSection title="Collage" items={[
                    { desc: '3 × 16×16 custom-edited prints with editing', code: 'COL-TRIO-CANV' },
                  ]} />
                  <InvoiceSection title="Albums" items={[
                    { desc: '28×11 digital album, leather/acrylic, 15 spreads', code: 'ALB-PREM-2811' },
                    { desc: '8×10 Engagement signing book, black linen', code: 'ALB-SIGN-08' },
                  ]} />
                  <InvoiceSection title="Wedding Frame" items={[
                    { desc: '24×30 photo mounted on canvas stretcher', code: 'CNV-24X30' },
                    { desc: 'Black floating frame, D-rings and wire', code: 'FRM-FLOAT-BLK' },
                  ]} />
                  <div>
                    <InvoiceSection title="Extras Included" items={[
                      { desc: 'Engagement Proof files — Dropbox, no watermark', code: 'DIG-PROOF-DL' },
                      { desc: 'Online proofing, download share, gallery', code: 'DIG-GALLERY' },
                      { desc: 'High-res Wedding files — 16×24, 300 dpi', code: 'DIG-HR-WED' },
                      { desc: 'High-res Engagement files — 16×16, 300 dpi', code: 'DIG-HR-ENG' },
                      ...extraItems,
                    ]} />
                    {/* Remove buttons for added extras */}
                    {extraItems.length > 0 && (
                      <div style={{ marginTop: -4 }}>
                        {extraItems.map((item, i) => (
                          <div key={i} className="flex items-center justify-end" style={{ padding: '2px 0' }}>
                            <button
                              onClick={() => setExtraItems(extraItems.filter((_, j) => j !== i))}
                              className="flex items-center gap-1 text-xs transition-colors"
                              style={{ color: '#D97706', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              <X style={{ width: 12, height: 12 }} /> Remove {item.code}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Add item picker */}
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
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E8E8E3',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            maxHeight: 300,
                            overflowY: 'auto',
                            width: 420,
                          }}
                        >
                          {(() => {
                            const grouped: Record<string, any[]> = {}
                            products.forEach((p: any) => {
                              const cat = p.category ?? 'Other'
                              if (!grouped[cat]) grouped[cat] = []
                              grouped[cat].push(p)
                            })
                            return Object.entries(grouped).map(([cat, items]) => (
                              <div key={cat}>
                                <p className="px-4 py-2 text-xs uppercase tracking-wider" style={{ color: '#BBBBBB', backgroundColor: '#FAFAF5' }}>{cat}</p>
                                {items.map((p: any) => (
                                  <button
                                    key={p.product_code}
                                    onClick={() => {
                                      setExtraItems([...extraItems, { desc: p.item_name ?? p.description, code: p.product_code }])
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
              )}

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
        style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: TEXT }}
      >
        {title}
      </h2>
      <div style={{ width: 40, height: 1, backgroundColor: GOLD, marginBottom: 20 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 2 }}>
        {items.map((item, i) => (
          <p key={i} style={{ fontSize: 16, lineHeight: 1.8, color: '#444444' }}>
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
        style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 120 }}
      >
        {amount}
      </p>
      <p style={{ fontSize: 16, color: '#888888' }}>{label}</p>
    </div>
  )
}
