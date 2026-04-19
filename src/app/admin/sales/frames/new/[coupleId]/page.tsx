'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import { formatWeddingDate, formatCurrency } from '@/lib/formatters'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { toast } from 'sonner'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'] })

const GOLD = '#C9A84C'
const BG = '#FAFAF5'
const TEXT = '#1A1A1A'

// Hardcoded sale amounts (v1.0)
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

// Photo & Video schedule
const PV_MILESTONES = [
  'Pick Up Portraits',
  'June 1st, 2026',
  'August 1st, 2026',
  'November 1st, 2026',
  'January 15th 2027',
  '2 Weeks before wedding',
  'Wedding Proof Download (1-2 weeks after wedding)',
  'Pick up the final wedding album & prints',
]

// Photo Only schedule
const PO_MILESTONES = [
  'Pick Up Portraits',
  'June 1st, 2026',
  'August 1st, 2026',
  'November 1st, 2026',
  'January 15th 2027',
  'March 1st, 2027',
  '2 Weeks before wedding',
  'Wedding Proof Download (1-2 weeks after wedding)',
]

export default function FrameSalePresentation() {
  const params = useParams()
  const router = useRouter()
  const coupleId = params.coupleId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [couple, setCouple] = useState<CoupleData | null>(null)
  const [contract, setContract] = useState<ContractData | null>(null)

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
        setContract(contractData?.[0] ?? null)
      }
      setLoading(false)
    }
    fetch()
  }, [coupleId])

  async function handleSave() {
    if (!couple) return
    setSaving(true)

    const balanceOwing = couple.balance_owing ?? 0
    const newBalance = balanceOwing + EXTRAS_SALE_AMOUNT
    const numInstallments = 8
    const deposit = balanceOwing + ALBUM_COLLAGE_TOTAL - (numInstallments * Math.floor((balanceOwing + ALBUM_COLLAGE_TOTAL) / numInstallments))
    const installmentAmount = Math.floor((newBalance - deposit) / numInstallments * 100) / 100
    // Recalculate: use even split
    const perInstallment = Math.floor(newBalance / numInstallments * 100) / 100
    const lastInstallment = Math.round((newBalance - perInstallment * (numInstallments - 1)) * 100) / 100

    // Determine milestones based on video
    const hasVideo = !!(contract?.num_videographers && contract.num_videographers > 0) || !!contract?.video_highlights || !!contract?.video_long_form
    const milestones = hasVideo ? PV_MILESTONES : PO_MILESTONES

    // Insert extras_order
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

    // Insert installments
    const installments = milestones.map((desc, i) => ({
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

    // Update couples.c2_amount
    await supabase
      .from('couples')
      .update({ c2_amount: EXTRAS_SALE_AMOUNT })
      .eq('id', coupleId)

    toast.success(`C2 Frame & Album sale created for ${couple.bride_first_name} & ${couple.groom_first_name}`)
    router.push('/admin/sales/frames')
  }

  if (loading || !couple) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: BG }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    )
  }

  const hasVideo = !!(contract?.num_videographers && contract.num_videographers > 0) || !!contract?.video_highlights || !!contract?.video_long_form
  const milestones = hasVideo ? PV_MILESTONES : PO_MILESTONES
  const balanceOwing = couple.balance_owing ?? 0
  const newBalance = balanceOwing + EXTRAS_SALE_AMOUNT
  const perInstallment = Math.floor(newBalance / 8 * 100) / 100

  return (
    <div className={dmSans.className} style={{ backgroundColor: BG, color: TEXT, minHeight: '100vh' }}>
      <div className="mx-auto px-6 py-8" style={{ maxWidth: 880 }}>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((p) => (
            <div
              key={p}
              className="w-2.5 h-2.5 rounded-full transition-colors"
              style={{ backgroundColor: p === page ? GOLD : '#D9D9D9' }}
            />
          ))}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className={`${playfair.className} text-3xl`} style={{ fontWeight: 700 }}>
              {couple.bride_first_name} & {couple.groom_first_name}
            </h1>
            <p className="text-sm mt-1" style={{ color: '#888' }}>
              {formatWeddingDate(couple.wedding_date)}
            </p>
          </div>
          <p className="text-sm" style={{ color: '#999' }}>SIGS Photography Ltd.</p>
        </div>

        {/* PAGE 1 — The Package */}
        {page === 1 && (
          <div className="space-y-10">
            <MenuSection title="Collage" items={[
              '3 \u00d7 16\u00d716 custom-edited prints with editing',
              'All 3 mounted on canvas stretcher',
              'All 3 framed with black float-frame',
            ]} />
            <MenuSection title="Albums" items={[
              '1 \u00d7 28\u00d711 digital album with leather cover or acrylic cover, matt pages',
              'Choice of 80 selected photographs or Omakase style',
              '15 spreads',
              '8\u00d710 Engagement signing book, black linen, 6 spreads, 22 images',
            ]} />
            <MenuSection title="Wedding Frame" items={[
              'Black floating frame same style as engagement portraits',
              '24\u00d730 photo (in wedding package) mounted on canvas stretcher',
              'Assembly including D rings and wire',
            ]} />
            <MenuSection title="Extras Included" items={[
              'Download link of all Engagement Proof files Dropbox without watermark',
              'Online proofing and download share and customer gallery',
              'High-resolution digital files for Wedding images 16\u00d724 300 dpi',
              'High-resolution digital files for Engagement images 16\u00d716 300 dpi',
            ]} />
          </div>
        )}

        {/* PAGE 2 — The Scare Page */}
        {page === 2 && (
          <div className="space-y-8">
            <h2 className={`${playfair.className} text-2xl`} style={{ fontWeight: 700 }}>
              Expense Breakdown
            </h2>

            <div className="space-y-0">
              <LedgerRow label="Engagement Photo Collage" amount="$1,500.00" />
              <LedgerRow label="Wedding Album ($1,750 - $500 print credit)" amount="$1,250.00" />
              <LedgerRow label="Engagement Sign Book" amount="$200.00" />
              <LedgerRow label="Wedding Frame" amount="$400.00" />
              <LedgerRow label="24\u00d730 Canvas" amount="$200.00" />
              <LedgerRow label="Engagement and Wedding High-Resolution files" amount="$0.00" />
            </div>

            {/* Divider */}
            <div className="flex justify-center">
              <hr style={{ width: '100%', border: 'none', borderTop: `1px solid ${GOLD}` }} />
            </div>

            <div className="space-y-0">
              <LedgerRow label="Subtotal" amount="$3,550.00" />
              <LedgerRow label="Tax (13%)" amount="$461.50" />
              <LedgerRow label="Subtotal including Tax" amount="$4,011.50" />
              <LedgerRow label="SIGS Customer Discount (25%)" amount="-$1,002.88" green />
              <div className="flex items-center justify-between py-4">
                <p className={`${playfair.className} text-xl font-bold`}>Total Cost after Discount</p>
                <p className={`${playfair.className} text-2xl font-bold`}>$3,008.63</p>
              </div>
            </div>

            <p className="text-xs italic leading-relaxed" style={{ color: '#999' }}>
              The cost for the Engagement and Wedding High-Resolution files is listed as $0.00 CAD, however, the retail price is $2,250 plus tax. When purchasing the above package there is no additional charge for these files. SIGS Customer Discount (25%) applies only when purchasing the package.
            </p>
          </div>
        )}

        {/* PAGE 3 — The Money */}
        {page === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className={`${playfair.className} text-2xl mb-1`} style={{ fontWeight: 700 }}>
                Payment Schedule
              </h2>
              <p className="text-sm" style={{ color: '#888' }}>
                Including the balance remaining from Photo/Video agreement
              </p>
            </div>

            {/* Key numbers */}
            <div className="space-y-4">
              <MoneyRow label="Remaining in wedding agreement" amount={formatCurrency(balanceOwing)} />
              <MoneyRow label="Album & Collage including tax" amount="+$3,000" prefix="+" />
              <div className="flex justify-center">
                <hr style={{ width: '100%', border: 'none', borderTop: `1px solid ${GOLD}` }} />
              </div>
              <div className="flex items-center justify-between py-2">
                <p className={`${playfair.className} text-xl font-bold`}>
                  {formatCurrency(newBalance)}
                </p>
                <p className="text-base" style={{ color: '#888' }}>
                  divided into 8 equal payments of <span className="font-semibold" style={{ color: TEXT }}>{formatCurrency(perInstallment)}</span>
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div className="pt-4">
              <h3 className={`${playfair.className} text-lg mb-6`} style={{ fontWeight: 700 }}>
                {hasVideo ? 'Photo & Video Schedule' : 'Photo Only Schedule'}
              </h3>
              <div className="relative pl-8">
                {/* Vertical line */}
                <div
                  className="absolute left-[11px] top-2 bottom-2"
                  style={{ width: 1, backgroundColor: '#E0E0E0' }}
                />
                {milestones.map((milestone, i) => (
                  <div key={i} className="relative flex items-start gap-4 mb-5 last:mb-0">
                    {/* Dot */}
                    <div
                      className="absolute -left-8 top-1 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center"
                      style={{
                        borderColor: GOLD,
                        backgroundColor: i === 0 ? GOLD : BG,
                      }}
                    >
                      {i === 0 && (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#fff' }} />
                      )}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <p className="text-base">{milestone}</p>
                      <p className="text-sm font-medium" style={{ color: '#888' }}>
                        {i === milestones.length - 1 ? formatCurrency(Math.round((newBalance - perInstallment * (milestones.length - 1)) * 100) / 100) : formatCurrency(perInstallment)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-12 pt-6" style={{ borderTop: '1px solid #E8E8E4' }}>
          <button
            onClick={() => {
              if (page === 1) router.push('/admin/sales/frames/new')
              else setPage(page - 1)
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ border: `1px solid #D9D9D9`, color: '#666' }}
          >
            &larr; Back
          </button>

          {page < 3 ? (
            <button
              onClick={() => setPage(page + 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: GOLD, color: '#fff' }}
            >
              Next &rarr;
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: GOLD, color: '#fff' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save & Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Sub-components ────────────────────────────────────────────── */

function MenuSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className={`${playfair.className} text-xl mb-3`} style={{ fontWeight: 700, color: TEXT }}>
        {title}
      </h2>
      <div className="space-y-2 pl-1">
        {items.map((item, i) => (
          <p key={i} className="text-base leading-relaxed" style={{ color: '#444' }}>
            <span style={{ color: GOLD, marginRight: 10 }}>&mdash;</span>
            {item}
          </p>
        ))}
      </div>
    </div>
  )
}

function LedgerRow({ label, amount, green }: { label: string; amount: string; green?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #ECECEC' }}>
      <p className="text-base" style={{ color: '#444' }}>{label}</p>
      <p className="text-base font-medium tabular-nums" style={{ color: green ? '#2E7D32' : TEXT }}>
        {amount}
      </p>
    </div>
  )
}

function MoneyRow({ label, amount, prefix }: { label: string; amount: string; prefix?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <p className="text-lg" style={{ color: '#666' }}>{label}</p>
      <p className={`${playfair.className} text-xl font-bold`}>{amount}</p>
    </div>
  )
}
