'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { format, differenceInDays, parseISO } from 'date-fns'

import { CoupleHeader } from '@/components/couples/CoupleHeader'
import { InfoGrid } from '@/components/couples/InfoGrid'
import { TeamCard } from '@/components/couples/TeamCard'
import { NotesCard } from '@/components/couples/NotesCard'
import { ClientJourney } from '@/components/couples/ClientJourney'
import { ContractPackageCard } from '@/components/couples/ContractPackageCard'
import { FramesAlbumsCard } from '@/components/couples/FramesAlbumsCard'
import { ExtrasCard } from '@/components/couples/ExtrasCard'
import { FormsCard } from '@/components/couples/FormsCard'
import { FinanceCard } from '@/components/couples/FinanceCard'
import { DocumentsCard } from '@/components/couples/DocumentsCard'
import { WeddingDayItinerary } from '@/components/couples/WeddingDayItinerary'
import { buildPhases, countMilestones } from '@/lib/milestones'

export default function CoupleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const coupleId = params.id as string

  const [loading, setLoading] = useState(true)
  const [couple, setCouple] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [milestones, setMilestones] = useState<any>(null)
  const [assignment, setAssignment] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [installments, setInstallments] = useState<any[]>([])
  const [extrasOrders, setExtrasOrders] = useState<any[]>([])
  const [clientExtras, setClientExtras] = useState<any[]>([])
  const [weddingDayForm, setWeddingDayForm] = useState<any>(null)
  const [videoOrder, setVideoOrder] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      if (!coupleId) return

      try {
        const { data: coupleData } = await supabase
          .from('couples')
          .select('*')
          .eq('id', coupleId)
          .limit(1)

        const c = coupleData?.[0] ?? null
        if (!c) {
          router.push('/admin/couples')
          return
        }
        setCouple(c)

        const { data: contractData } = await supabase
          .from('contracts')
          .select('*')
          .eq('couple_id', coupleId)
          .limit(1)
        setContract(contractData?.[0] ?? null)

        const { data: milestoneRows } = await supabase
          .from('couple_milestones')
          .select('*')
          .eq('couple_id', coupleId)
          .limit(1)
        setMilestones(milestoneRows?.[0] ?? null)

        const { data: assignmentData } = await supabase
          .from('wedding_assignments')
          .select('photo_1, photo_2, video_1, status')
          .eq('couple_id', coupleId)
          .limit(1)
        setAssignment(assignmentData?.[0] ?? null)

        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('couple_id', coupleId)
          .order('payment_date')
        setPayments(paymentsData || [])

        if (contractData?.[0]?.id) {
          const { data: installmentsData } = await supabase
            .from('contract_installments')
            .select('*')
            .eq('contract_id', contractData[0].id)
            .order('installment_number')
          setInstallments(installmentsData || [])
        }

        const { data: extrasData } = await supabase
          .from('extras_orders')
          .select('*')
          .eq('couple_id', coupleId)
          .order('order_date')
        setExtrasOrders(extrasData || [])

        const { data: clientExtrasData } = await supabase
          .from('client_extras')
          .select('*')
          .eq('couple_id', coupleId)
          .order('invoice_date')
        setClientExtras(clientExtrasData || [])

        const { data: formData } = await supabase
          .from('wedding_day_forms')
          .select('id, reception_venue_name, groom_start_time, groom_finish_time, bride_start_time, bride_finish_time, ceremony_start_time, ceremony_finish_time, venue_arrival_time, park_start_time, park_finish_time, additional_notes, final_notes')
          .eq('couple_id', coupleId)
          .limit(1)
        setWeddingDayForm(formData?.[0] ?? null)

        const { data: videoOrderData } = await supabase
          .from('video_orders')
          .select('id, status, submitted_at')
          .eq('couple_id', coupleId)
          .limit(1)
        setVideoOrder(videoOrderData?.[0] ?? null)

      } catch (error) {
        console.error('Error fetching couple data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [coupleId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (!couple) {
    return (
      <div className="p-8">
        <p>Couple not found</p>
        <Link href="/admin/couples" className="text-teal-600 hover:underline">
          ← Back to couples
        </Link>
      </div>
    )
  }

  // --- Derived data ---

  const coupleName = couple.couple_name || 'Unknown'
  const packageType = couple.package_type || 'Photo + Video'
  const status = couple.status || 'lead'
  const weddingDate = couple.wedding_date ? parseISO(couple.wedding_date) : null
  const daysUntil = weddingDate ? differenceInDays(weddingDate, new Date()) : 0
  const weddingDateFormatted = weddingDate ? format(weddingDate, 'MMMM d, yyyy') : 'TBD'
  const signedDate = contract?.signed_date ? format(parseISO(contract.signed_date), 'MMM d, yyyy') : 'N/A'
  const bookedDate = couple.booked_date ? format(parseISO(couple.booked_date), 'MMM d, yyyy') : signedDate

  // Determine phase from milestones
  const ms = milestones || {}
  const phase = ms.m36_complete ? 'Complete'
    : ms.m35_archived ? 'Archived'
    : ms.m19_wedding_day ? 'Post-Production'
    : ms.m04_contract_signed ? 'Pre-Wedding'
    : 'Onboarding'

  // Milestone phases for ClientJourney
  const journeyPhases = buildPhases(ms)
  const { total: totalMilestones, completed: completedMilestones } = countMilestones(ms)

  // Coverage hours
  const coverageHours = contract?.start_time && contract?.end_time
    ? `${contract.start_time} – ${contract.end_time}`
    : 'N/A'

  // Finance calculations
  const contractTotal = parseFloat(couple.contract_total || '0')
  const c2Total = extrasOrders.reduce((sum: number, o: any) => sum + parseFloat(o.extras_sale_amount || '0'), 0)
  const c3Total = clientExtras.reduce((sum: number, e: any) => sum + parseFloat(String(e.total || '0')), 0)
  const totalInvoiced = contractTotal + c2Total + c3Total
  const totalReceived = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0)
  const balanceDue = totalInvoiced - totalReceived

  const financeLines = [
    {
      label: 'C1 Contract',
      invoiced: contractTotal,
      received: Math.min(totalReceived, contractTotal),
      balance: Math.max(contractTotal - totalReceived, 0)
    },
    {
      label: 'C2 Frames & Albums',
      invoiced: c2Total,
      received: Math.max(Math.min(totalReceived - contractTotal, c2Total), 0),
      balance: c2Total - Math.max(Math.min(totalReceived - contractTotal, c2Total), 0)
    },
    {
      label: 'C3 Extras',
      invoiced: c3Total,
      received: 0,
      balance: c3Total
    }
  ].filter(line => line.invoiced > 0)

  // Combined installments
  const allInstallments = [
    ...installments.map((i: any) => ({ ...i, source: 'contract' as const })),
  ].sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))

  // Forms status (for FormsCard — kept for backwards compat)
  const forms = [
    {
      name: 'Wedding Day Form',
      status: (weddingDayForm ? 'complete' : 'awaiting') as 'complete' | 'awaiting' | 'na',
      viewUrl: weddingDayForm ? `/admin/wedding-day/forms/${weddingDayForm.id}/print` : undefined
    },
    {
      name: 'Photo Order Form',
      status: (ms.m24_photo_order_in ? 'complete' : 'awaiting') as 'complete' | 'awaiting' | 'na',
    },
    {
      name: 'Video Order Form',
      status: (couple.package_type === 'photo_only' ? 'na' : ms.m25_video_order_in ? 'complete' : 'awaiting') as 'complete' | 'awaiting' | 'na',
    }
  ]

  // Extras order (first one = frames & albums)
  const extrasOrder = extrasOrders[0]
  const extrasItems: Record<string, string> = extrasOrder?.items && typeof extrasOrder.items === 'object'
    ? extrasOrder.items
    : {}
  const extrasSpecs: Record<string, string> = {}
  if (extrasOrder) {
    if (extrasOrder.album_cover) extrasSpecs['Album Cover'] = extrasOrder.album_cover
    if (extrasOrder.album_pages) extrasSpecs['Pages'] = extrasOrder.album_pages
    if (extrasOrder.parent_album_cover) extrasSpecs['Parent Cover'] = extrasOrder.parent_album_cover
  }

  const extrasRetail = parseFloat(extrasOrder?.total || '0')
  const extrasSale = parseFloat(extrasOrder?.extras_sale_amount || '0')
  const extrasDiscount = extrasRetail - extrasSale

  // Locations for info grid
  const locationsList = [
    contract?.loc_groom && 'Groom Prep',
    contract?.loc_bride && 'Bride Prep',
    contract?.loc_ceremony && 'Ceremony',
    contract?.loc_park && 'Park/Outdoor',
    contract?.loc_reception && 'Reception'
  ].filter(Boolean).join(', ') || 'Not specified'

  return (
    <div className="p-6 space-y-6">
      {/* Q03 — Header */}
      <CoupleHeader
        coupleName={coupleName}
        packageType={packageType}
        status={status}
        phase={phase}
        weddingDate={weddingDateFormatted}
        daysUntil={daysUntil}
        signedDate={signedDate}
        bookedDate={bookedDate}
      />

      {/* Q03b — Info Grid */}
      <div className="grid grid-cols-3 gap-6 border rounded-lg p-6">
        <InfoGrid
          title="Couple"
          items={[
            { label: 'Bride', value: [couple.bride_first_name, couple.bride_last_name].filter(Boolean).join(' ') || null },
            { label: 'Groom', value: [couple.groom_first_name, couple.groom_last_name].filter(Boolean).join(' ') || null },
            { label: 'Phone', value: couple.phone || null },
            { label: 'Email', value: couple.email || null },
          ]}
        />
        <InfoGrid
          title="Venues"
          items={[
            { label: 'Ceremony', value: contract?.ceremony_location || null },
            { label: 'Reception', value: contract?.reception_venue || null },
          ]}
        />
        <InfoGrid
          title="Coverage"
          items={[
            { label: 'Package', value: packageType },
            { label: 'Hours', value: coverageHours },
            { label: 'Locations', value: locationsList },
            { label: 'Guests', value: contract?.num_guests?.toString() || null },
          ]}
        />
      </div>

      {/* Q04 — Team + Notes (2 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamCard assignment={assignment} />
        <NotesCard
          coupleNotes={couple.notes || null}
          weddingDayNotes={weddingDayForm ? {
            additional: weddingDayForm.additional_notes,
            final: weddingDayForm.final_notes
          } : null}
        />
      </div>

      {/* Q05 — Client Journey */}
      <ClientJourney
        phases={journeyPhases}
        totalMilestones={totalMilestones}
        completedMilestones={completedMilestones}
      />

      {/* Q06 — Forms + Itinerary (2 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DocumentsCard
          coupleId={coupleId}
          formsStatus={{
            weddingDayForm: {
              submitted: !!weddingDayForm,
              formId: weddingDayForm?.id
            },
            videoOrderForm: {
              submitted: !!videoOrder?.submitted_at,
              formId: videoOrder?.id
            }
          }}
        />
        <WeddingDayItinerary formData={weddingDayForm} />
      </div>

      {/* Q07 — Finance */}
      <FinanceCard
        lines={financeLines}
        totalInvoiced={totalInvoiced}
        totalReceived={totalReceived}
        balanceDue={balanceDue}
        coupleId={coupleId}
        payments={payments}
        installments={allInstallments}
      />

      {/* Q08 — C1 Contract Package */}
      {contract && (
        <ContractPackageCard
          signedDate={signedDate}
          isActive={status === 'booked'}
          coverage={{
            package: packageType,
            hours: coverageHours,
            day: contract.day_of_week || 'Saturday',
            locationFlags: {
              groom: contract.loc_groom || false,
              bride: contract.loc_bride || false,
              ceremony: contract.loc_ceremony || false,
              park: contract.loc_park || false,
              reception: contract.loc_reception || false,
            },
            drone: contract.drone_photography || false,
            guests: contract.num_guests || 0
          }}
          engagement={{
            included: contract.engagement_session || false,
            location: contract.engagement_location || null
          }}
          team={{
            photographers: contract.num_photographers || 1,
            videographers: contract.num_videographers || 0
          }}
          financials={{
            c1Contract: contractTotal,
            c2FramesAlbums: c2Total,
            total: contractTotal + c2Total
          }}
        />
      )}

      {/* Q09 — C2 Frames & Albums */}
      {extrasOrder && (
        <FramesAlbumsCard
          items={extrasItems}
          specs={extrasSpecs}
          financials={{
            retailValue: extrasRetail,
            discount: extrasDiscount,
            salePrice: extrasSale
          }}
        />
      )}

      {/* Q10 — C3 Extras */}
      {clientExtras && clientExtras.length > 0 && (
        <ExtrasCard extras={clientExtras} />
      )}
    </div>
  )
}
