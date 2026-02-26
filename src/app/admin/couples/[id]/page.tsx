'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, Calendar, MapPin, DollarSign,
  Clock, Users, Package, FileText, CreditCard,
  AlertCircle, StickyNote, Upload, Download, Trash2, Loader2,
  Mail, Phone, Video, Target, Zap, ShoppingCart, AlertTriangle
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'

// ═══════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════

interface Couple {
  id: string
  couple_name: string
  bride_name: string | null
  bride_email: string | null
  bride_phone: string | null
  groom_name: string | null
  groom_email: string | null
  groom_phone: string | null
  wedding_date: string | null
  wedding_year: number | null
  ceremony_venue: string | null
  reception_venue: string | null
  park_location: string | null
  package_type: string | null
  coverage_hours: number | null
  photographer: string | null
  lead_source: string | null
  booked_date: string | null
  contract_total: number | null
  extras_total: number | null
  total_paid: number | null
  balance_owing: number | null
  status: string | null
  frame_sale_status: string | null
  engagement_status: string | null
  engagement_date: string | null
  engagement_location: string | null
  notes: string | null
  created_at: string | null
}

interface Payment {
  id: string
  payment_date: string
  amount: number
  method: string | null
  from_name: string | null
  payment_type: string | null
  label: string | null
  notes: string | null
}

interface Deliverable {
  id: string
  deliverable_type: string
  status: string | null
  total_photos: number | null
  edited_photos: number | null
  started_date: string | null
  completed_date: string | null
  delivered_date: string | null
  notes: string | null
}

interface StaffAssignment {
  id: string
  role: string
  staff_name: string
  confirmed: boolean | null
  confirmed_date: string | null
  notes: string | null
}

interface ExtrasOrder {
  id: string
  couple_id: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inclusions?: any
  total: number
  discount_percent?: number
  discount_amount?: number
  status?: string
  notes?: string
  created_at: string
}

interface QuoteRecord {
  id: string
  couple_id: string
  quote_type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any
  subtotal: number
  tax: number
  discount_type: string | null
  discount_value: number
  total: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form_data: any
  status: string
  version: number
  notes: string | null
  created_at: string
}

type MilestoneStatus = 'done' | 'active' | 'urgent' | 'pending' | 'skip'

interface Milestone {
  id: number
  label: string
  status: MilestoneStatus
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function formatMoney(n: number): string {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatPackage(pkg: string | null): string {
  if (!pkg) return 'Not set'
  if (pkg === 'photo_only') return 'Photo Only'
  if (pkg === 'photo_video') return 'Photo + Video'
  return pkg
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return value
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function checkHasDayForm(documents: { name: string }[]): boolean {
  return documents.some(d => {
    const n = d.name.toLowerCase()
    return (n.includes('day') && n.includes('form')) || n.includes('day-form') || n.includes('day_form')
  })
}

const ROW_LABELS = ['PRE-WEDDING', 'ENG SALES \u2192 WEDDING PREP', 'WEDDING \u2192 POST-PRODUCTION', 'DELIVERY \u2192 COMPLETE']

const VIDEO_SEGMENTS = ['Groom Prep', 'Bride Prep', 'Ceremony', 'Park', 'Pre-Reception', 'Reception', 'Recap', 'FINAL']

function computeJourneyMilestones(params: {
  couple: Couple
  payments: Payment[]
  deliverables: Deliverable[]
  staff: StaffAssignment[]
  documents: { name: string }[]
  extrasOrders: ExtrasOrder[]
  daysUntil: number | null
  isPhotoVideo: boolean
}): Milestone[] {
  const { couple, payments, deliverables, staff, documents, extrasOrders, daysUntil, isPhotoVideo } = params

  const weddingPassed = daysUntil !== null && daysUntil < 0
  const isBooked = couple.status === 'booked' || couple.status === 'completed'
  const isCompleted = couple.status === 'completed'
  const engDone = couple.engagement_status === 'completed'
  const hasDayForm = checkHasDayForm(documents)
  const frameSaleResolved = couple.frame_sale_status?.toUpperCase() === 'BOUGHT' || couple.frame_sale_status?.toUpperCase() === 'NO FRAME SALE'
  const hasEngDeliverable = deliverables.find(d => d.deliverable_type === 'engagement')
  const engDelivered = hasEngDeliverable?.status === 'delivered' || hasEngDeliverable?.status === 'completed'
  const hasWeddingPhotos = deliverables.find(d => d.deliverable_type === 'wedding_photos')
  const weddingPhotosDelivered = hasWeddingPhotos?.status === 'delivered'
  const weddingPhotosEdited = hasWeddingPhotos?.status === 'completed' || weddingPhotosDelivered
  const allDelivered = deliverables.length > 0 && deliverables.every(d => d.status === 'delivered')
  const balancePaid = (Number(couple.balance_owing) || 0) <= 0
  const staffAllConfirmed = staff.length > 0 && staff.every(s => s.confirmed)

  const dayFormUrgent = !hasDayForm && daysUntil !== null && daysUntil > 0 && daysUntil < 60
  const staffUrgent = !staffAllConfirmed && daysUntil !== null && daysUntil > 0 && daysUntil < 30 && isBooked

  return [
    // ROW 1: PRE-WEDDING
    { id: 1,  label: 'Lead Captured',        status: 'done' },
    { id: 2,  label: 'Consultation Booked',  status: isBooked || couple.booked_date ? 'done' : 'pending' },
    { id: 3,  label: 'Consultation Done',    status: isBooked || couple.booked_date ? 'done' : 'pending' },
    { id: 4,  label: 'Contract Signed',      status: isBooked ? 'done' : 'pending' },
    { id: 5,  label: 'Deposit Received',     status: payments.length > 0 ? 'done' : (isBooked ? 'active' : 'pending') },
    { id: 6,  label: 'Eng Session Shot',     status: engDone ? 'done' : (couple.engagement_status === 'scheduled' ? 'active' : 'pending') },
    { id: 7,  label: 'Eng Photos Edited',    status: engDelivered ? 'done' : (engDone ? 'active' : 'pending') },
    { id: 8,  label: 'Eng Proofs to Lab',    status: engDelivered ? 'done' : 'pending' },
    { id: 9,  label: 'Eng Prints Picked Up', status: engDelivered ? 'done' : 'pending' },

    // ROW 2: ENG SALES → WEDDING PREP
    { id: 10, label: 'Frame Sale Quote',     status: couple.frame_sale_status ? 'done' : 'pending' },
    { id: 11, label: 'Sale Results + PDF',   status: frameSaleResolved ? 'done' : (couple.frame_sale_status ? 'active' : 'pending') },
    { id: 12, label: 'Eng Order to Lab',     status: extrasOrders.length > 0 ? 'done' : 'pending' },
    { id: 13, label: 'Eng Items Framed',     status: 'pending' },
    { id: 14, label: 'Eng Items Picked Up',  status: 'pending' },
    { id: 15, label: 'Day Form Approved',    status: hasDayForm ? 'done' : (dayFormUrgent ? 'urgent' : 'pending') },
    { id: 16, label: 'Staff Confirmed',      status: staffAllConfirmed ? 'done' : (staffUrgent ? 'urgent' : 'pending') },
    { id: 17, label: 'Tuesday Confirm',      status: 'pending' },
    { id: 18, label: 'Equipment Packed',     status: 'pending' },

    // ROW 3: WEDDING → POST-PRODUCTION
    { id: 19, label: 'Wedding Day \u2713',   status: weddingPassed ? 'done' : 'pending' },
    { id: 20, label: 'Files Backed Up',      status: 'pending' },
    { id: 21, label: 'Sneak Peek Posted',    status: 'pending' },
    { id: 22, label: 'Proofs Edited',        status: weddingPhotosEdited ? 'done' : (weddingPassed ? 'active' : 'pending') },
    { id: 23, label: 'Couple Contacted',     status: 'pending' },
    { id: 24, label: 'Photo Order In',       status: 'pending' },
    { id: 25, label: 'Video Order In',       status: !isPhotoVideo ? 'skip' : 'pending' },
    { id: 26, label: 'Photo Order to Lab',   status: 'pending' },
    { id: 27, label: 'Video Long Form',      status: !isPhotoVideo ? 'skip' : 'pending' },

    // ROW 4: DELIVERY → COMPLETE
    { id: 28, label: 'Recap Edited',         status: !isPhotoVideo ? 'skip' : 'pending' },
    { id: 29, label: 'Lab Order Back',       status: 'pending' },
    { id: 30, label: 'Hi-Res on USB',        status: weddingPhotosDelivered ? 'done' : 'pending' },
    { id: 31, label: 'Video on USB',         status: !isPhotoVideo ? 'skip' : 'pending' },
    { id: 32, label: 'Ready at Studio',      status: allDelivered ? 'done' : 'pending' },
    { id: 33, label: 'Final Payment',        status: balancePaid && isBooked ? 'done' : 'pending' },
    { id: 34, label: 'Items Picked Up',      status: 'pending' },
    { id: 35, label: 'Archived',             status: isCompleted ? 'done' : 'pending' },
    { id: 36, label: 'COMPLETE',             status: isCompleted && allDelivered && balancePaid ? 'done' : 'pending' },
  ]
}

const milestoneStyles: Record<MilestoneStatus, { bg: string; border: string; text: string; label: string; extra: string }> = {
  done:    { bg: 'bg-teal-600', border: 'border-teal-600', text: 'text-white', label: 'text-teal-600', extra: 'ring-2 ring-teal-600/15' },
  active:  { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-white', label: 'text-amber-600', extra: 'ring-2 ring-amber-500/25' },
  urgent:  { bg: 'bg-red-500', border: 'border-red-500', text: 'text-white', label: 'text-red-500', extra: 'ring-2 ring-red-500/30 animate-pulse' },
  pending: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-300', label: 'text-gray-400', extra: '' },
  skip:    { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-400', label: 'text-gray-400', extra: 'opacity-45' },
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════

export default function CoupleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const coupleId = params.id as string

  const [couple, setCouple] = useState<Couple | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [staff, setStaff] = useState<StaffAssignment[]>([])
  const [extrasOrders, setExtrasOrders] = useState<ExtrasOrder[]>([])
  const [quote, setQuote] = useState<QuoteRecord | null>(null)
  const [documents, setDocuments] = useState<{ name: string; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      const [coupleRes, paymentsRes, deliverablesRes, staffRes, extrasRes, quoteRes] = await Promise.all([
        supabase.from('couples').select('*').eq('id', coupleId).single(),
        supabase.from('payments').select('*').eq('couple_id', coupleId).order('payment_date', { ascending: false }),
        supabase.from('deliverables').select('*').eq('couple_id', coupleId).order('deliverable_type'),
        supabase.from('staff_assignments').select('*').eq('couple_id', coupleId).order('role'),
        supabase.from('extras_orders').select('*').eq('couple_id', coupleId).order('created_at', { ascending: false }),
        supabase.from('quotes').select('*').eq('couple_id', coupleId).order('created_at', { ascending: false }).limit(1),
      ])

      if (coupleRes.data) setCouple(coupleRes.data)
      if (paymentsRes.data) setPayments(paymentsRes.data)
      if (deliverablesRes.data) setDeliverables(deliverablesRes.data)
      if (staffRes.data) setStaff(staffRes.data)
      if (extrasRes.data) setExtrasOrders(extrasRes.data)
      if (quoteRes.data && quoteRes.data.length > 0) setQuote(quoteRes.data[0])

      // Fetch documents from storage
      const { data: files } = await supabase.storage
        .from('couple-documents')
        .list(coupleId, { sortBy: { column: 'created_at', order: 'desc' } })
      if (files) setDocuments(files.map(f => ({ name: f.name, created_at: f.created_at })))

      setLoading(false)
    }
    fetchAll()
  }, [coupleId])

  // Document handlers
  const uploadDocument = async (file: File) => {
    setUploading(true)
    const filePath = `${coupleId}/${file.name}`
    const { error } = await supabase.storage
      .from('couple-documents')
      .upload(filePath, file, { upsert: true })
    if (!error) {
      setDocuments(prev => [{ name: file.name, created_at: new Date().toISOString() }, ...prev])
    }
    setUploading(false)
  }

  const deleteDocument = async (fileName: string) => {
    const { error } = await supabase.storage
      .from('couple-documents')
      .remove([`${coupleId}/${fileName}`])
    if (!error) {
      setDocuments(prev => prev.filter(d => d.name !== fileName))
    }
  }

  const getDocumentUrl = (fileName: string) => {
    const { data } = supabase.storage
      .from('couple-documents')
      .getPublicUrl(`${coupleId}/${fileName}`)
    return data.publicUrl
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Not found
  if (!couple) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold mb-2">Couple not found</h2>
        <button onClick={() => router.push('/admin/couples')} className="text-primary hover:underline text-sm">
          Back to Couples
        </button>
      </div>
    )
  }

  // ═══ Computed Values ═══
  const today = new Date()
  const weddingDate = couple.wedding_date ? parseISO(couple.wedding_date) : null
  const daysUntil = weddingDate ? differenceInDays(weddingDate, today) : null
  const isPhotoVideo = couple.package_type === 'photo_video'

  const contractTotal = Number(couple.contract_total) || 0
  const extrasTotal = Number(couple.extras_total) || 0
  const totalPaid = Number(couple.total_paid) || 0
  const grandTotal = contractTotal + extrasTotal
  const balanceOwing = grandTotal > 0 ? grandTotal - totalPaid : (Number(couple.balance_owing) || 0)

  // Journey milestones
  const milestones = computeJourneyMilestones({
    couple, payments, deliverables, staff, documents, extrasOrders, daysUntil, isPhotoVideo,
  })
  const doneCount = milestones.filter(m => m.status === 'done').length
  const skipCount = milestones.filter(m => m.status === 'skip').length
  const urgentCount = milestones.filter(m => m.status === 'urgent').length
  const activeCount = milestones.filter(m => m.status === 'active').length
  const totalRelevant = milestones.length - skipCount
  const journeyPct = totalRelevant > 0 ? Math.round((doneCount / totalRelevant) * 100) : 0

  // Urgent banner conditions
  const hasDayForm = checkHasDayForm(documents)
  const showDayFormBanner = !hasDayForm && daysUntil !== null && daysUntil > 0 && daysUntil < 60
  const showBalanceBanner = balanceOwing > 0 && daysUntil !== null && daysUntil < 0

  // Quote form data
  const fd = quote?.form_data
  const installments = fd?.installments as Array<{ label: string; amount: number; due?: string }> | undefined
  const photoInclusions = fd?.photoInclusions || {}
  const videoInclusions = fd?.videoInclusions || {}
  const webInclusions = fd?.webInclusions || {}

  // Production statuses from deliverables
  const productionItems = [
    {
      label: 'Engagement',
      deliverable: deliverables.find(d => d.deliverable_type === 'engagement'),
      detail: couple.engagement_status === 'completed'
        ? 'Shot & delivered'
        : couple.engagement_date
          ? `Scheduled ${format(parseISO(couple.engagement_date), 'MMM d')}`
          : undefined,
    },
    {
      label: 'Wedding Photos',
      deliverable: deliverables.find(d => d.deliverable_type === 'wedding_photos'),
      detail: weddingDate
        ? (daysUntil !== null && daysUntil > 0
          ? `${format(weddingDate, 'MMM d')} \u2014 ${daysUntil} days`
          : daysUntil === 0 ? 'TODAY' : undefined)
        : undefined,
    },
    {
      label: 'Albums',
      deliverable: deliverables.find(d => d.deliverable_type === 'album'),
      detail: undefined,
    },
    ...(isPhotoVideo ? [{
      label: 'Video',
      deliverable: deliverables.find(d => d.deliverable_type === 'video'),
      detail: undefined,
    }] : []),
  ]

  // Extras items (safely parsed — handles both {item,price} and {name,price} formats)
  const extrasItems: Array<{ item: string; description?: string; price: number | null; note?: string }> =
    extrasOrders.length > 0 && Array.isArray(extrasOrders[0]?.items)
      ? extrasOrders[0].items.map((raw: any) => ({
          item: raw.item || raw.name || '',
          description: raw.description,
          price: typeof raw.price === 'number' ? raw.price : null,
          note: raw.note,
        }))
      : []
  const extrasInclusions: string[] =
    extrasOrders.length > 0 && Array.isArray(extrasOrders[0]?.inclusions)
      ? extrasOrders[0].inclusions
      : (extrasOrders.length > 0 && extrasOrders[0]?.notes?.startsWith('Inclusions: ')
          ? extrasOrders[0].notes.replace('Inclusions: ', '').split('; ')
          : [])

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ═══ URGENT BANNERS ═══ */}
      {showDayFormBanner && (
        <div className="rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-white shrink-0" />
            <div>
              <div className="text-sm font-bold text-white">WEDDING DAY FORM NOT RECEIVED</div>
              <div className="text-xs text-white/90">
                Wedding is in <strong>{daysUntil} days</strong>
                {weddingDate && ` (${format(weddingDate, 'MMM d, yyyy')})`}
              </div>
            </div>
          </div>
        </div>
      )}

      {showBalanceBanner && (
        <div className="rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-white shrink-0" />
            <div>
              <div className="text-sm font-bold text-white">BALANCE OVERDUE</div>
              <div className="text-xs text-white/90">
                Wedding was <strong>{Math.abs(daysUntil!)} days ago</strong> &mdash; <strong>{formatMoney(balanceOwing)}</strong> still owing
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BACK BUTTON + RICH HEADER ═══ */}
      <div>
        <button
          onClick={() => router.push('/admin/couples')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> All Couples
        </button>

        <div className="rounded-xl bg-gradient-to-br from-teal-700 via-teal-600 to-teal-500 p-6 text-white overflow-hidden relative">
          {/* Decorative circle */}
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/5" />

          {/* Badge row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap relative z-10">
            {couple.status && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/15">
                {couple.status === 'booked' ? 'BOOKED' : couple.status === 'completed' ? '\u2705 COMPLETED' : couple.status.toUpperCase()}
              </span>
            )}
            {couple.package_type && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/15">
                {isPhotoVideo ? '\ud83d\udcf7\ud83c\udfac PHOTO + VIDEO' : '\ud83d\udcf7 PHOTO ONLY'}
              </span>
            )}
            {daysUntil !== null && daysUntil > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/30">
                {'⏳'} PRE-WEDDING
              </span>
            )}
            {couple.engagement_status === 'completed' && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/30">
                {'✅'} ENGAGEMENT DONE
              </span>
            )}
            {extrasOrders.length > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-yellow-400/30">
                \ud83d\uded2 EXTRAS PURCHASED
              </span>
            )}
          </div>

          {/* Name + Days */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 relative z-10">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{couple.couple_name}</h1>
              {daysUntil !== null && (
                <div className="text-base mt-1 opacity-90">
                  {daysUntil === 0
                    ? '\ud83c\udf89 Wedding Day is TODAY!'
                    : daysUntil > 0
                      ? `\u23f3 ${daysUntil} days until wedding`
                      : `${Math.abs(daysUntil)} days since wedding`}
                </div>
              )}
              <div className="text-sm opacity-65 mt-1 space-y-0.5">
                {weddingDate && (
                  <div>
                    {'📅'} {format(weddingDate, 'EEEE, MMMM d, yyyy')}
                    {couple.coverage_hours ? ` • ${couple.coverage_hours} hours` : ''}
                  </div>
                )}
                {(couple.ceremony_venue || couple.reception_venue) && (
                  <div>{'🏰'} {couple.reception_venue || couple.ceremony_venue}</div>
                )}
              </div>
            </div>
            <div className="text-right hidden sm:block">
              {couple.booked_date && (
                <div className="text-xs opacity-50">Signed {format(parseISO(couple.booked_date), 'MMM d, yyyy')}</div>
              )}
            </div>
          </div>

          {/* Contact bar */}
          {(couple.bride_email || couple.groom_email || couple.bride_phone || couple.groom_phone) && (
            <div className="flex gap-4 mt-4 px-4 py-2.5 bg-white/10 rounded-lg flex-wrap text-xs opacity-80 relative z-10">
              {couple.bride_email && (
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {couple.bride_email}</span>
              )}
              {couple.groom_email && (
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {couple.groom_email}</span>
              )}
              {couple.bride_phone && (
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {formatPhone(couple.bride_phone)}</span>
              )}
              {couple.groom_phone && (
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {formatPhone(couple.groom_phone)}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ JOURNEY TRACKER ═══ */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <span className="text-sm font-bold">Client Journey</span>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>✅ {doneCount}</span>
              {urgentCount > 0 && <span className="text-red-500 font-bold">🚨 {urgentCount} urgent</span>}
              {activeCount > 0 && <span>🔄 {activeCount}</span>}
              <span>○ {totalRelevant - doneCount - activeCount - urgentCount}</span>
            </div>
            <span className="text-2xl font-extrabold text-teal-600">{journeyPct}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-muted mb-6 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full transition-all"
            style={{ width: `${journeyPct}%` }}
          />
        </div>

        {/* 4 rows of 9 milestones */}
        <div className="overflow-x-auto -mx-2 px-2">
          {[milestones.slice(0, 9), milestones.slice(9, 18), milestones.slice(18, 27), milestones.slice(27, 36)].map((row, ri) => (
            <div key={ri} className={ri < 3 ? 'mb-5' : ''}>
              <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2.5 pl-1">
                {ROW_LABELS[ri]}
              </div>
              <div className="grid grid-cols-9 gap-1" style={{ minWidth: 600 }}>
                {row.map((m) => {
                  const st = milestoneStyles[m.status]
                  const isComplete = m.id === 36
                  return (
                    <div key={m.id} className="flex flex-col items-center gap-1">
                      <div className={`${isComplete ? 'w-10 h-10' : 'w-8 h-8'} rounded-full ${st.bg} border-2 ${st.border} flex items-center justify-center ${st.extra}`}>
                        {m.status === 'done' && <span className="text-white text-xs font-extrabold">✓</span>}
                        {m.status === 'skip' && <span className={`${st.text} text-[10px] font-bold`}>✕</span>}
                        {m.status === 'active' && <span className="text-white text-xs">⟳</span>}
                        {m.status === 'urgent' && <span className="text-white text-xs font-extrabold">!</span>}
                        {m.status === 'pending' && !isComplete && <span className={`${st.text} text-[10px]`}>○</span>}
                        {m.status === 'pending' && isComplete && <span className="text-base">🎉</span>}
                      </div>
                      <span className={`text-[9px] font-semibold ${st.label} text-center leading-tight max-w-[72px] min-h-[22px] ${m.status === 'skip' ? 'line-through' : ''}`}>
                        {m.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ TWO COLUMN LAYOUT ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ──── LEFT COLUMN ──── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Production Status */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="h-0.5 bg-amber-500" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold">Production Status</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {productionItems.map((item) => {
                  const status = item.deliverable?.status
                  const statusLabel = status
                    ? status.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
                    : 'Not started'
                  const statusColor = status === 'completed' || status === 'delivered'
                    ? 'bg-teal-600/10 text-teal-600'
                    : status === 'in_progress'
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-gray-100 text-gray-500'
                  return (
                    <div key={item.label} className="p-3 rounded-lg bg-muted/30 border">
                      <div className="text-xs text-muted-foreground mb-1.5">{item.label}</div>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusColor}`}>
                        {statusLabel}{status === 'delivered' ? ' \u2713' : ''}
                      </span>
                      {item.detail && <div className="text-[10px] text-muted-foreground mt-1">{item.detail}</div>}
                      {item.deliverable?.total_photos && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {item.deliverable.edited_photos || 0}/{item.deliverable.total_photos} photos edited
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Video Editing Progress (photo_video only) */}
          {isPhotoVideo && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold">Video Editing Progress</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">0/8</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {VIDEO_SEGMENTS.map((seg) => (
                    <div key={seg} className="p-2.5 rounded-lg bg-muted/30 border flex items-center justify-between">
                      <span className={`text-xs ${seg === 'FINAL' ? 'font-bold' : ''}`}>{seg}</span>
                      <div className="w-3 h-3 rounded-full bg-gray-200 border-2 border-gray-300" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Team */}
          <div className="rounded-xl border border-dashed bg-card overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold">Team</span>
              </div>
              {staff.length === 0 ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <span className="text-sm font-semibold">{couple.photographer || 'Not assigned'}</span>
                        <span className="text-xs text-muted-foreground ml-2">Lead Photographer</span>
                      </div>
                      {couple.photographer && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-600/10 text-teal-600">{'✓'}</span>
                      )}
                    </div>
                    {isPhotoVideo && (
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-sm font-semibold text-amber-600">⚠️ Not Assigned</span>
                          <span className="text-xs text-muted-foreground ml-2">Videographer</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground italic mt-2">
                    Contract specifies 1 photographer{isPhotoVideo ? ' + 1 videographer' : ''}
                  </div>
                </>
              ) : (
                <div className="space-y-0">
                  {staff.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div>
                        <span className="text-sm font-semibold">{s.staff_name}</span>
                        <span className="text-xs text-muted-foreground ml-2 capitalize">{s.role.replace(/_/g, ' ')}</span>
                      </div>
                      {s.confirmed ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-600/10 text-teal-600">{'✓'} Confirmed</span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lead Source */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold">Lead Source</span>
              </div>
              <div className="space-y-0">
                <InfoRow label="Source" value={couple.lead_source || 'Not recorded'} />
                <InfoRow label="Booked" value={couple.booked_date ? format(parseISO(couple.booked_date), 'MMM d, yyyy') : '\u2014'} />
                <InfoRow
                  label="Day Form"
                  value={hasDayForm ? '\u2713 Received' : '\u26a0\ufe0f NOT RECEIVED'}
                  valueColor={hasDayForm ? 'text-teal-600' : 'text-red-500'}
                  bold={!hasDayForm}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <StickyNote className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold">Notes</span>
              </div>
              {couple.notes ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{couple.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No notes.</p>
              )}
            </div>
          </div>
        </div>

        {/* ──── RIGHT COLUMN ──── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Financial Summary */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="h-0.5 bg-teal-600" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-semibold">Financial Summary</span>
              </div>

              {/* Progress bar */}
              {grandTotal > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between mb-1.5 text-xs">
                    <span className="text-muted-foreground">Collected: {Math.round((totalPaid / grandTotal) * 100)}%</span>
                    <span className="font-semibold text-teal-600">{formatMoney(totalPaid)} / {formatMoney(grandTotal)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full transition-all"
                      style={{ width: `${Math.min((totalPaid / grandTotal) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <InfoRow label="Contract Total" value={contractTotal > 0 ? formatMoney(contractTotal) : '\u2014'} />
              {extrasTotal > 0 && <InfoRow label="Extras Package" value={`+${formatMoney(extrasTotal)}`} valueColor="text-amber-600" />}
              {grandTotal > 0 && extrasTotal > 0 && (
                <>
                  <div className="h-px bg-border my-1" />
                  <InfoRow label="Grand Total" value={formatMoney(grandTotal)} bold />
                </>
              )}
              <InfoRow label="Total Paid" value={totalPaid > 0 ? `-${formatMoney(totalPaid)}` : '$0.00'} valueColor="text-teal-600" bold />
              <div className="h-0.5 bg-red-500 my-2" />
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-bold">BALANCE OWING</span>
                <span className={`text-lg font-extrabold ${balanceOwing > 0 ? 'text-red-500' : 'text-teal-600'}`}>
                  {formatMoney(balanceOwing)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Schedule (if quote has installments) */}
          {installments && installments.length > 0 && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-semibold">Payment Schedule</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-600/10 text-teal-600">
                    {installments.length} installments
                  </span>
                </div>
                {(() => {
                  let runningTotal = 0
                  return installments.map((inst, i) => {
                    runningTotal += inst.amount
                    const isPaid = runningTotal <= totalPaid + 0.01
                    return (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isPaid ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {isPaid ? '\u2713' : i + 1}
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">{inst.label}</div>
                            {inst.due && <div className="text-[10px] text-muted-foreground">Due: {inst.due}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{formatMoney(inst.amount)}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isPaid ? 'bg-teal-600/10 text-teal-600' : 'bg-gray-100 text-gray-400'}`}>
                            {isPaid ? 'PAID' : 'UPCOMING'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )}

          {/* Payment History */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-semibold">Payment History</span>
                </div>
                {payments.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-600/10 text-teal-600">
                    {payments.length} payments &bull; {formatMoney(totalPaid)}
                  </span>
                )}
              </div>
              {payments.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-4">No payments recorded yet.</div>
              ) : (
                <div className="space-y-0">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div>
                        <div className="text-sm font-semibold text-teal-600">{formatMoney(Number(p.amount))}</div>
                        <div className="text-[11px] text-muted-foreground">{format(parseISO(p.payment_date), 'MMM d, yyyy')}</div>
                      </div>
                      <div className="text-right">
                        {p.from_name && <div className="text-xs text-muted-foreground">{p.from_name}</div>}
                        {p.method && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{p.method}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* File Archive (Documents) */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-semibold">File Archive</span>
                  {documents.length > 0 && (
                    <span className="text-xs bg-muted rounded-full px-2 py-0.5">{documents.length}</span>
                  )}
                </div>
                <label className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  uploading ? 'bg-muted text-muted-foreground' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}>
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? 'Uploading...' : 'Upload PDF'}
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadDocument(file)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
              {documents.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-4">No files archived yet.</div>
              ) : (
                <div className="space-y-0">
                  {documents.map((doc) => (
                    <div key={doc.name} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-red-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{doc.name}</div>
                          {doc.created_at && (
                            <div className="text-[10px] text-muted-foreground">{format(new Date(doc.created_at), 'MMM d, yyyy')}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={getDocumentUrl(doc.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-muted transition-colors text-blue-600"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => deleteDocument(doc.name)}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold">Quick Actions</span>
              </div>
              <div className="space-y-1.5">
                {showDayFormBanner && (
                  <button className="w-full text-left px-4 py-2.5 rounded-lg border-2 border-red-500 bg-red-50 text-red-700 text-sm font-semibold">
                    📄 Send Day Form Reminder
                  </button>
                )}
                <button className="w-full text-left px-4 py-2.5 rounded-lg border bg-card text-sm font-semibold hover:bg-muted/50 transition-colors">
                  💳 Record Payment
                </button>
                <button className="w-full text-left px-4 py-2.5 rounded-lg border bg-card text-sm font-semibold hover:bg-muted/50 transition-colors">
                  📧 Send Payment Reminder
                </button>
                <button className="w-full text-left px-4 py-2.5 rounded-lg border bg-card text-sm font-semibold hover:bg-muted/50 transition-colors">
                  📋 Update Production
                </button>
                <button className="w-full text-left px-4 py-2.5 rounded-lg border bg-card text-sm font-semibold hover:bg-muted/50 transition-colors">
                  ➕ Create Add-On Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ WEDDING DAY TIMELINE ═══ */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-semibold">Wedding Day Timeline</span>
            </div>
            {!hasDayForm && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">⚠️ INCOMPLETE</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[
              { event: '\ud83e\udd35 Groom Prep', location: couple.groom_name ? `${couple.groom_name}'s location` : 'Address: TBD' },
              { event: '\ud83d\udc70 Bride Prep', location: couple.bride_name ? `${couple.bride_name}'s location` : 'Address: TBD' },
              { event: '\u26ea Ceremony', location: couple.ceremony_venue || 'Location: TBD' },
              { event: '\ud83c\udf33 Park', location: couple.park_location || 'TBD' },
              { event: '\ud83c\udff0 Reception', location: couple.reception_venue || 'Location: TBD' },
            ].map((slot, i) => (
              <div key={i} className="p-3 bg-muted/30 rounded-xl border border-dashed border-amber-200 relative">
                <div className="text-sm font-bold mb-1">{slot.event}</div>
                <div className="text-[11px] text-amber-600 font-medium">{slot.location}</div>
              </div>
            ))}
          </div>
          {!hasDayForm && (
            <div className="mt-3 p-2.5 bg-red-50 rounded-lg text-xs text-red-800 font-semibold">
              🚨 Day form required for complete timeline &mdash; addresses, emergency contacts, vendors, and drive times all missing
            </div>
          )}
        </div>
      </div>

      {/* ═══ EXTRAS SECTION (conditional) ═══ */}
      {extrasItems.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-white" />
              <span className="text-base font-bold text-white">Frames & Album Extras</span>
            </div>
            <span className="text-xs font-semibold text-white/80">
              Extras Total: <strong className="text-white">{formatMoney(Number(extrasOrders[0]?.total) || extrasTotal)}</strong>
            </span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Items column */}
              <div>
                <div className="text-[11px] font-bold text-amber-600 tracking-wider uppercase mb-3 pb-1.5 border-b-2 border-amber-500">ITEMS PURCHASED</div>
                {extrasItems.map((item: { item: string; description?: string; price: number | null; note?: string }, i: number) => (
                  <div key={i} className="py-2.5 border-b last:border-b-0">
                    <div className="flex justify-between">
                      <span className="text-xs font-semibold">{item.item}</span>
                      <span className={`text-xs font-semibold ${item.price === 0 ? 'text-teal-600' : ''}`}>
                        {item.price == null ? '—' : item.price === 0 ? 'FREE' : formatMoney(item.price)}
                      </span>
                    </div>
                    {item.description && <div className="text-[10px] text-muted-foreground">{item.description}</div>}
                    {item.note && <div className="text-[10px] text-amber-600 italic">{item.note}</div>}
                  </div>
                ))}
              </div>

              {/* Inclusions column */}
              {extrasInclusions.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-amber-600 tracking-wider uppercase mb-3 pb-1.5 border-b-2 border-amber-500">ADDITIONAL INCLUSIONS</div>
                  {extrasInclusions.map((inc: string, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 py-1.5 border-b last:border-b-0">
                      <span className="text-[11px] text-teal-600 font-bold">✓</span>
                      <span className="text-xs">{inc}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pricing column */}
              <div>
                <div className="text-[11px] font-bold text-amber-600 tracking-wider uppercase mb-3 pb-1.5 border-b-2 border-amber-500">PRICING BREAKDOWN</div>
                {extrasItems.map((item: { item: string; price: number | null }, i: number) => (
                  <div key={i} className="flex justify-between py-1 border-b last:border-b-0">
                    <span className="text-xs text-muted-foreground">{item.item}</span>
                    <span className={`text-xs font-semibold ${item.price === 0 ? 'text-teal-600' : ''}`}>
                      {item.price == null ? '—' : item.price === 0 ? 'FREE' : formatMoney(item.price)}
                    </span>
                  </div>
                ))}
                <div className="h-0.5 bg-border my-2" />
                <div className="flex justify-between py-2">
                  <span className="text-sm font-bold">EXTRAS TOTAL</span>
                  <span className="text-base font-extrabold text-amber-600">
                    {formatMoney(Number(extrasOrders[0]?.total) || extrasTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CONTRACT PACKAGE ═══ */}
      {(quote && fd) ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-600 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-white" />
              <span className="text-base font-bold text-white">Contract Package &mdash; As Signed</span>
            </div>
            <div className="flex items-center gap-3">
              {couple.booked_date && (
                <span className="text-xs text-white/60">Signed {format(parseISO(couple.booked_date), 'MMM d, yyyy')}</span>
              )}
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-400/30 text-teal-300">ACTIVE</span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Coverage */}
              <div>
                <div className="text-[11px] font-bold text-teal-600 tracking-wider uppercase mb-3 pb-1.5 border-b-2 border-teal-600">COVERAGE</div>
                <InfoRow label="Hours" value={couple.coverage_hours ? `${couple.coverage_hours}` : '\u2014'} />
                <InfoRow label="Ceremony" value={couple.ceremony_venue || 'TBD'} />
                <InfoRow label="Reception" value={couple.reception_venue || 'TBD'} />
                {couple.park_location && <InfoRow label="Park" value={couple.park_location} />}

                {couple.engagement_status && (
                  <>
                    <div className="text-[11px] font-bold text-teal-600 tracking-wider uppercase mt-4 mb-2 pb-1.5 border-b-2 border-teal-600">ENGAGEMENT</div>
                    <div className={`p-2 rounded-lg text-xs ${
                      couple.engagement_status === 'completed'
                        ? 'bg-green-50 border border-green-200 text-teal-600 font-semibold'
                        : 'bg-muted/30 border text-muted-foreground'
                    }`}>
                      {couple.engagement_status === 'completed' ? '\u2713 Completed' : couple.engagement_status === 'scheduled' ? 'Scheduled' : 'Not scheduled'}
                      {couple.engagement_location && ` \u2014 ${couple.engagement_location}`}
                    </div>
                  </>
                )}
              </div>

              {/* Photo Package Features */}
              <div>
                <div className="text-[11px] font-bold text-teal-600 tracking-wider uppercase mb-3 pb-1.5 border-b-2 border-teal-600">PHOTO INCLUSIONS</div>
                {Object.entries(photoInclusions).filter(([, v]) => v).length > 0 ? (
                  Object.entries(photoInclusions).filter(([, v]) => v).map(([key]) => (
                    <div key={key} className="flex items-center gap-1.5 py-1 border-b last:border-b-0">
                      <span className="text-[11px] text-teal-600 font-bold">✓</span>
                      <span className="text-[11px]">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground py-2">No details available</div>
                )}
              </div>

              {/* Video or Prints/Albums */}
              {isPhotoVideo ? (
                <div>
                  <div className="text-[11px] font-bold text-teal-600 tracking-wider uppercase mb-3 pb-1.5 border-b-2 border-teal-600">VIDEO PACKAGE</div>
                  {Object.entries(videoInclusions).filter(([, v]) => v).length > 0 ? (
                    Object.entries(videoInclusions).filter(([, v]) => v).map(([key]) => (
                      <div key={key} className="flex items-center gap-1.5 py-1 border-b last:border-b-0">
                        <span className="text-[11px] text-teal-600 font-bold">✓</span>
                        <span className="text-[11px]">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground py-2">No details available</div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="text-[11px] font-bold text-teal-600 tracking-wider uppercase mb-3 pb-1.5 border-b-2 border-teal-600">PRINTS & ALBUMS</div>
                  <div className="text-xs text-muted-foreground py-2">Details from contract</div>
                </div>
              )}

              {/* Web + Terms */}
              <div>
                <div className="text-[11px] font-bold text-teal-600 tracking-wider uppercase mb-3 pb-1.5 border-b-2 border-teal-600">WEB PACKAGE</div>
                {Object.entries(webInclusions).filter(([, v]) => v).length > 0 ? (
                  Object.entries(webInclusions).filter(([, v]) => v).map(([key]) => (
                    <div key={key} className="flex items-center gap-1.5 py-1 border-b last:border-b-0">
                      <span className="text-[11px] text-teal-600 font-bold">✓</span>
                      <span className="text-xs">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground py-2">No details available</div>
                )}

                <div className="text-[11px] font-bold text-teal-600 tracking-wider uppercase mt-4 mb-2 pb-1.5 border-b-2 border-teal-600">CONTRACT TERMS</div>
                <InfoRow label="Package" value={formatPackage(couple.package_type)} />
                <InfoRow label="Venue" value={couple.reception_venue || couple.ceremony_venue || '\u2014'} />
              </div>
            </div>

            {/* Contract summary footer */}
            <div className="mt-6 px-4 py-3 bg-muted/30 rounded-lg border flex flex-wrap gap-4 text-[11px] text-muted-foreground items-center justify-between">
              <div className="flex gap-4 flex-wrap">
                <span>{'📋'} Contract: <strong className="text-foreground">{formatMoney(contractTotal)}</strong></span>
                {extrasTotal > 0 && <span>{'🛒'} Extras: <strong className="text-amber-600">{formatMoney(extrasTotal)}</strong></span>}
                <span>{'💰'} Grand Total: <strong className="text-foreground">{formatMoney(grandTotal)}</strong></span>
                <span>{'✅'} Paid: <strong className="text-teal-600">{formatMoney(totalPaid)}</strong></span>
                {balanceOwing > 0 && <span>{'🔴'} Owing: <strong className="text-red-500">{formatMoney(balanceOwing)}</strong></span>}
              </div>
            </div>
          </div>
        </div>
      ) : contractTotal > 0 ? (
        /* Fallback: show basic contract info from couple record when no quote exists */
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-600 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-white" />
              <span className="text-base font-bold text-white">Contract Package &mdash; As Signed</span>
            </div>
            <div className="flex items-center gap-3">
              {couple.booked_date && (
                <span className="text-xs text-white/60">Signed {format(parseISO(couple.booked_date), 'MMM d, yyyy')}</span>
              )}
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-400/30 text-teal-300">ACTIVE</span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Coverage */}
              <div>
                <div className="text-[11px] font-bold text-teal-600 tracking-wider uppercase mb-3 pb-1.5 border-b-2 border-teal-600">COVERAGE</div>
                <InfoRow label="Package" value={formatPackage(couple.package_type)} />
                <InfoRow label="Hours" value={couple.coverage_hours ? `${couple.coverage_hours}` : '\u2014'} />
                <InfoRow label="Ceremony" value={couple.ceremony_venue || 'TBD'} />
                <InfoRow label="Reception" value={couple.reception_venue || 'TBD'} />
                {couple.park_location && <InfoRow label="Park" value={couple.park_location} />}
              </div>

              {/* Engagement */}
              <div>
                <div className="text-[11px] font-bold text-teal-600 tracking-wider uppercase mb-3 pb-1.5 border-b-2 border-teal-600">ENGAGEMENT</div>
                <div className={`p-2 rounded-lg text-xs ${
                  couple.engagement_status === 'completed'
                    ? 'bg-green-50 border border-green-200 text-teal-600 font-semibold'
                    : 'bg-muted/30 border text-muted-foreground'
                }`}>
                  {couple.engagement_status === 'completed' ? '\u2713 Completed' : couple.engagement_status === 'scheduled' ? 'Scheduled' : 'Not scheduled'}
                  {couple.engagement_location && ` \u2014 ${couple.engagement_location}`}
                </div>
                {couple.engagement_date && (
                  <div className="text-xs text-muted-foreground mt-2">Date: {format(parseISO(couple.engagement_date), 'MMM d, yyyy')}</div>
                )}
              </div>

              {/* Team */}
              <div>
                <div className="text-[11px] font-bold text-teal-600 tracking-wider uppercase mb-3 pb-1.5 border-b-2 border-teal-600">TEAM</div>
                <InfoRow label="Photographer" value={couple.photographer || 'Not assigned'} />
                {isPhotoVideo && <InfoRow label="Videographer" value="Not assigned" />}
              </div>

              {/* Financial */}
              <div>
                <div className="text-[11px] font-bold text-teal-600 tracking-wider uppercase mb-3 pb-1.5 border-b-2 border-teal-600">CONTRACT TERMS</div>
                <InfoRow label="Contract Total" value={formatMoney(contractTotal)} />
                {extrasTotal > 0 && <InfoRow label="Extras" value={formatMoney(extrasTotal)} />}
                <InfoRow label="Grand Total" value={formatMoney(grandTotal)} bold />
                <InfoRow label="Paid" value={formatMoney(totalPaid)} valueColor="text-teal-600" />
                <InfoRow label="Balance" value={formatMoney(balanceOwing)} valueColor={balanceOwing > 0 ? 'text-red-500' : 'text-teal-600'} bold />
              </div>
            </div>

            {/* Contract summary footer */}
            <div className="mt-6 px-4 py-3 bg-muted/30 rounded-lg border flex flex-wrap gap-4 text-[11px] text-muted-foreground items-center justify-between">
              <div className="flex gap-4 flex-wrap">
                <span>{'📋'} Contract: <strong className="text-foreground">{formatMoney(contractTotal)}</strong></span>
                {extrasTotal > 0 && <span>{'🛒'} Extras: <strong className="text-amber-600">{formatMoney(extrasTotal)}</strong></span>}
                <span>{'💰'} Grand Total: <strong className="text-foreground">{formatMoney(grandTotal)}</strong></span>
                <span>{'✅'} Paid: <strong className="text-teal-600">{formatMoney(totalPaid)}</strong></span>
                {balanceOwing > 0 && <span>{'🔴'} Owing: <strong className="text-red-500">{formatMoney(balanceOwing)}</strong></span>}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════

function InfoRow({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b last:border-b-0 border-muted/50">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs ${bold ? 'font-bold' : 'font-medium'} ${valueColor || ''}`}>{value}</span>
    </div>
  )
}
