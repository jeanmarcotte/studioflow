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
import { FormsCard } from '@/components/couples/FormsCard'
import { FinanceCard } from '@/components/couples/FinanceCard'
import { DocumentsCard } from '@/components/couples/DocumentsCard'
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
  const [weddingDayForm, setWeddingDayForm] = useState<any>(null)

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
          .select('*')
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

        const { data: formData } = await supabase
          .from('wedding_day_forms')
          .select('id')
          .eq('couple_id', coupleId)
          .limit(1)
        setWeddingDayForm(formData?.[0] ?? null)

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

  // Contract coverage info
  const locations = [
    contract?.loc_groom && 'Groom Prep',
    contract?.loc_bride && 'Bride Prep',
    contract?.loc_ceremony && 'Ceremony',
    contract?.loc_park && 'Park/Outdoor',
    contract?.loc_reception && 'Reception'
  ].filter(Boolean).join(', ') || 'Not specified'

  const coverageHours = contract?.start_time && contract?.end_time
    ? `${contract.start_time} – ${contract.end_time}`
    : 'N/A'

  // Team members
  const teamMembers = [
    assignment?.lead_photographer && { role: 'Lead Photographer', name: assignment.lead_photographer },
    assignment?.second_photographer && { role: '2nd Photographer', name: assignment.second_photographer },
    assignment?.lead_videographer && { role: 'Lead Videographer', name: assignment.lead_videographer },
    assignment?.second_videographer && { role: '2nd Videographer', name: assignment.second_videographer },
  ].filter(Boolean) as { role: string; name: string }[]

  // Finance calculations
  const contractTotal = parseFloat(couple.contract_total || '0')
  const c2Total = extrasOrders.reduce((sum: number, o: any) => sum + parseFloat(o.extras_sale_amount || '0'), 0)
  const totalInvoiced = contractTotal + c2Total
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
      received: Math.max(totalReceived - contractTotal, 0),
      balance: c2Total - Math.max(totalReceived - contractTotal, 0)
    }
  ]

  // Forms status
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
  const extrasItems: Record<string, string> = {}
  const extrasSpecs: Record<string, string> = {}
  if (extrasOrder) {
    if (extrasOrder.album_size) extrasItems['Album'] = extrasOrder.album_size
    if (extrasOrder.parent_album_size) extrasItems['Parent Album'] = extrasOrder.parent_album_size
    if (extrasOrder.frame_1) extrasItems['Frame 1'] = extrasOrder.frame_1
    if (extrasOrder.frame_2) extrasItems['Frame 2'] = extrasOrder.frame_2
    if (extrasOrder.frame_3) extrasItems['Frame 3'] = extrasOrder.frame_3
    if (extrasOrder.canvas_1) extrasItems['Canvas'] = extrasOrder.canvas_1
    if (extrasOrder.album_cover) extrasSpecs['Album Cover'] = extrasOrder.album_cover
    if (extrasOrder.album_pages) extrasSpecs['Pages'] = extrasOrder.album_pages
    if (extrasOrder.parent_album_cover) extrasSpecs['Parent Cover'] = extrasOrder.parent_album_cover
  }

  const extrasRetail = parseFloat(extrasOrder?.total || '0')
  const extrasSale = parseFloat(extrasOrder?.extras_sale_amount || '0')
  const extrasDiscount = extrasRetail - extrasSale

  // Documents
  const documents = [
    {
      name: 'Wedding Day Form PDF',
      status: (weddingDayForm ? 'available' : 'unavailable') as 'available' | 'generating' | 'unavailable',
      generateAction: weddingDayForm ? () => {
        window.open(`/api/wedding-form-pdf/${coupleId}`, '_blank')
      } : undefined,
      unavailableReason: 'No form submitted'
    },
    {
      name: 'Contract PDF',
      status: (contract ? 'available' : 'unavailable') as 'available' | 'generating' | 'unavailable',
      generateAction: contract ? () => {
        window.open(`/api/contract-pdf/${coupleId}`, '_blank')
      } : undefined,
      unavailableReason: 'No contract'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
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

      {/* Info Grid — 3 columns */}
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
            { label: 'Locations', value: locations },
            { label: 'Guests', value: contract?.num_guests?.toString() || null },
          ]}
        />
      </div>

      {/* Team + Notes — side by side */}
      <div className="grid grid-cols-2 gap-6">
        <TeamCard
          members={teamMembers.length > 0 ? teamMembers : [{ role: 'Lead Photographer', name: 'TBD' }]}
          confirmed={ms.m16_staff_confirmed || false}
          contractNote={contract?.appointment_notes || undefined}
        />
        <NotesCard notes={couple.notes || null} />
      </div>

      {/* Client Journey */}
      <ClientJourney
        phases={journeyPhases}
        totalMilestones={totalMilestones}
        completedMilestones={completedMilestones}
      />

      {/* Forms */}
      <FormsCard forms={forms} />

      {/* Finance */}
      <FinanceCard
        lines={financeLines}
        totalInvoiced={totalInvoiced}
        totalReceived={totalReceived}
        balanceDue={balanceDue}
        coupleId={coupleId}
      />

      {/* Contract Package */}
      {contract && (
        <ContractPackageCard
          signedDate={signedDate}
          isActive={status === 'booked'}
          coverage={{
            package: packageType,
            hours: coverageHours,
            day: contract.day_of_week || 'Saturday',
            locations: locations,
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

      {/* Frames & Albums */}
      {extrasOrder && (
        <FramesAlbumsCard
          items={extrasItems}
          specs={extrasSpecs}
          financials={{
            retailValue: extrasRetail,
            discount: extrasDiscount,
            salePrice: extrasSale
          }}
          coupleName={coupleName}
        />
      )}

      {/* Documents */}
      <DocumentsCard documents={documents} />
    </div>
  )
}
