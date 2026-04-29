'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { PickupSlipCard } from '@/components/couples/PickupSlipCard'
import { FinanceCard } from '@/components/couples/FinanceCard'
import { CoupleResourcesCard } from '@/components/couples/CoupleResourcesCard'
import { WeddingDayItinerary } from '@/components/couples/WeddingDayItinerary'
import { EngagementAppointments } from '@/components/couples/EngagementAppointments'
import { buildPhases, countMilestones } from '@/lib/milestones'
import { formatPackage, formatMilitaryTime } from '@/lib/formatters'

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
  const [contractInstallments, setContractInstallments] = useState<any[]>([])
  const [extrasInstallments, setExtrasInstallments] = useState<any[]>([])
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

        // Fetch contract installments (C1)
        if (contractData?.[0]?.id) {
          const { data: contractInstData } = await supabase
            .from('contract_installments')
            .select('*')
            .eq('contract_id', contractData[0].id)
            .order('installment_number', { ascending: true })
          setContractInstallments(contractInstData || [])
        }

        // Fetch extras orders
        const { data: extrasData } = await supabase
          .from('extras_orders')
          .select('*')
          .eq('couple_id', coupleId)
          .order('order_date')
        setExtrasOrders(extrasData || [])

        // Fetch extras installments (C2)
        if (extrasData?.[0]?.id) {
          const { data: extrasInstData } = await supabase
            .from('extras_installments')
            .select('*')
            .eq('extras_order_id', extrasData[0].id)
            .order('installment_number', { ascending: true })
          setExtrasInstallments(extrasInstData || [])
        }

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
  const phase = couple.phase || 'new_client'
  const weddingDate = couple.wedding_date ? parseISO(couple.wedding_date) : null
  const daysUntil = weddingDate ? differenceInDays(weddingDate, new Date()) : 0
  const weddingDateFormatted = weddingDate ? format(weddingDate, 'MMMM d, yyyy') : 'TBD'
  const signedDate = contract?.signed_date ? format(parseISO(contract.signed_date), 'MMM d, yyyy') : 'N/A'
  const bookedDate = couple.booked_date ? format(parseISO(couple.booked_date), 'MMM d, yyyy') : signedDate

  // Phase comes directly from DB
  const ms = milestones || {}

  // Milestone phases for ClientJourney
  const journeyPhases = buildPhases(ms, couple.package_type)
  const { total: totalMilestones, completed: completedMilestones } = countMilestones(ms, couple.package_type)

  // Coverage hours
  const coverageHours = contract?.start_time && contract?.end_time
    ? `${formatMilitaryTime(contract.start_time)} – ${formatMilitaryTime(contract.end_time)}`
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

  // Build resources array
  const resources = [
    {
      label: 'Contract (C1)',
      href: contract?.id ? `/admin/contracts/${contract.id}/view` : null,
      exists: !!contract
    },
    {
      label: 'Frames & Albums (C2)',
      href: extrasOrder ? `/admin/albums/${coupleId}/view` : null,
      exists: !!extrasOrder,
      emptyText: 'No record'
    },
    {
      label: 'Extras (C3)',
      href: clientExtras && clientExtras.length > 0 ? `/admin/extras/${coupleId}/view` : null,
      exists: clientExtras && clientExtras.length > 0,
      emptyText: 'No record'
    },
    {
      label: 'Wedding Day Form',
      href: weddingDayForm?.id ? `/admin/wedding-day/forms/${weddingDayForm.id}/print` : null,
      exists: !!weddingDayForm
    },
    {
      label: 'Photo Form',
      href: null,
      exists: false
    },
    {
      label: 'Video Form',
      href: videoOrder?.id ? `/admin/video-orders/${videoOrder.id}` : null,
      exists: !!videoOrder?.submitted_at
    },
    {
      label: 'Portal Editor',
      href: couple.portal_slug ? `/admin/portal/${couple.id}` : null,
      exists: !!couple.portal_slug
    }
  ]

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* 1. Header */}
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

      {/* 2. Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
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

      {/* 3. Team + Notes (2 col) */}
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

      {/* 4. Client Journey */}
      <ClientJourney
        phases={journeyPhases}
        totalMilestones={totalMilestones}
        completedMilestones={completedMilestones}
      />

      {/* 5. Couple Resources + Itinerary (2 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CoupleResourcesCard resources={resources} />
        {weddingDayForm ? (
          <WeddingDayItinerary formData={weddingDayForm} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Wedding Day Itinerary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 italic">No wedding day form submitted yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 6. Finance */}
      <FinanceCard
        lines={financeLines}
        totalInvoiced={totalInvoiced}
        totalReceived={totalReceived}
        balanceDue={balanceDue}
        coupleId={coupleId}
        payments={payments}
        contractInstallments={contractInstallments}
        extrasInstallments={extrasInstallments}
        hasExtrasOrder={!!extrasOrder}
        contractId={contract?.id || null}
        hasClientExtras={clientExtras.length > 0}
      />

      {/* C1 Contract Package — ALWAYS RENDER */}
      {contract ? (
        <ContractPackageCard
          signedDate={signedDate}
          isActive={!couple.is_cancelled}
          coverage={{
            package: formatPackage(couple.package_type),
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
      ) : (
        <ContractPackageCard />
      )}

      {/* C2 Frames & Albums — ALWAYS RENDER */}
      {extrasOrder ? (
        <FramesAlbumsCard
          items={extrasItems}
          specs={extrasSpecs}
          financials={{
            retailValue: extrasRetail,
            discount: extrasDiscount,
            salePrice: extrasSale
          }}
        />
      ) : (
        <FramesAlbumsCard />
      )}

      {/* C3 Extras & Add-ons — ALWAYS RENDER */}
      <ExtrasCard extras={clientExtras || []} />

      {/* Appointments */}
      <EngagementAppointments coupleId={coupleId} />

      {/* Pickup Slip - at the very bottom */}
      <PickupSlipCard coupleId={couple.id} coupleName={couple.couple_name} />
    </div>
  )
}
