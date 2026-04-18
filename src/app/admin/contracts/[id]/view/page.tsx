'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import Image from 'next/image'

function check(value: boolean | null | undefined): string {
  return value ? '✓' : 'n/a'
}

function formatWeddingDate(dateStr: string, dayOfWeek?: string): string {
  const d = parseISO(dateStr)
  const day = dayOfWeek?.toUpperCase() || format(d, 'EEEE').toUpperCase()
  return `${day} ${format(d, 'MMMM do, yyyy')}`
}

function printQty(qty: number | null | undefined): string {
  if (qty === null || qty === undefined || qty === 0) return 'n/a'
  return String(qty)
}

function display(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'n/a'
  return String(value)
}

export default function ContractViewPage() {
  const params = useParams()
  const contractId = params.id as string

  const [contract, setContract] = useState<any>(null)
  const [couple, setCouple] = useState<any>(null)
  const [installments, setInstallments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!contractId) return

      // Try fetching by contract ID first, then by couple_id
      let { data: contractData } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .limit(1)

      if (!contractData || contractData.length === 0) {
        // Try as couple_id
        const { data: byCoupleId } = await supabase
          .from('contracts')
          .select('*')
          .eq('couple_id', contractId)
          .limit(1)
        contractData = byCoupleId
      }

      if (!contractData || contractData.length === 0) {
        setLoading(false)
        return
      }

      const c = contractData[0]
      setContract(c)

      // Fetch couple info
      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .eq('id', c.couple_id)
        .limit(1)
      setCouple(coupleData?.[0] ?? null)

      // Fetch installments
      const { data: instData } = await supabase
        .from('contract_installments')
        .select('*')
        .eq('contract_id', c.id)
        .order('installment_number')
      setInstallments(instData || [])

      setLoading(false)
    }

    fetchData()
  }, [contractId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Contract not found</p>
      </div>
    )
  }

  const brideName = [contract.bride_first_name, contract.bride_last_name].filter(Boolean).join(' ')
  const groomName = [contract.groom_first_name, contract.groom_last_name].filter(Boolean).join(' ')
  const weddingDateStr = contract.wedding_date ? formatWeddingDate(contract.wedding_date, contract.day_of_week) : 'n/a'
  const signedDateStr = contract.signed_date ? format(parseISO(contract.signed_date), 'MMMM do, yyyy') : 'n/a'
  const coupleSummary = `${contract.bride_first_name || ''} & ${contract.groom_first_name || ''} ${contract.day_of_week?.substring(0, 3)?.toUpperCase() || ''} ${contract.wedding_date ? format(parseISO(contract.wedding_date), 'MMMM do, yyyy') : ''}`

  return (
    <div className="min-h-screen bg-gray-100">
      <style jsx global>{`
        .contract-form {
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          line-height: 1.7;
          color: #000;
        }
        .contract-header {
          font-family: 'Georgia', serif;
          font-size: 18px;
          font-weight: bold;
        }
        .field {
          border-bottom: 1px solid #000;
          display: inline;
          padding: 0 4px;
        }
        .field-wide {
          border-bottom: 1px solid #000;
          display: inline-block;
          min-width: 300px;
          padding: 0 4px;
        }
        .field-full {
          border-bottom: 1px solid #000;
          display: inline-block;
          width: 100%;
          padding: 0 4px;
        }
        .field-sm {
          border-bottom: 1px solid #000;
          display: inline;
          min-width: 80px;
          padding: 0 4px;
        }
        .field-med {
          border-bottom: 1px solid #000;
          display: inline;
          min-width: 150px;
          padding: 0 4px;
        }
        .divider {
          border-top: 1px solid #000;
          margin: 8px 0;
        }
        @media print {
          .no-print { display: none !important; }
          @page { size: letter; margin: 0.75in; }
          .page-break { page-break-after: always; }
          body { background: white !important; }
        }
      `}</style>

      {/* ==================== PAGE 1 ==================== */}
      <div className="max-w-[8.5in] mx-auto bg-white shadow-md print:shadow-none p-10 mb-8 contract-form">
        {/* Header */}
        <div className="relative mb-2">
          <Image src="/images/sigslogo.png" alt="SIGS Photography" width={180} height={60} />
          <button
            type="button"
            onClick={() => window.print()}
            className="print:hidden absolute bottom-0 right-0 font-mono text-sm tracking-wider uppercase border border-black rounded-none px-3 py-1 hover:bg-black hover:text-white transition-colors cursor-pointer"
          >
            [ PRINT ]
          </button>
        </div>
        <div className="divider" />

        <div className="text-center my-6 pb-4 border-b border-black">
          This constitutes a contract for Wedding photography and videography by the undersigned parties.
        </div>

        <p>Wedding Date: <span className="field-wide">{weddingDateStr}</span></p>

        <div className="mt-4">
          <p>Bride&apos;s Name: <span className="field-wide">{brideName}</span></p>
        </div>

        <div className="mt-4">
          <p>Groom&apos;s Name: <span className="field-wide">{groomName}</span></p>
        </div>

        <div className="mt-4">
          <p className="font-bold">Locations:</p>
          <p>
            Groom <span className="field-sm">{check(contract.loc_groom)}</span>{' '}
            Bride <span className="field-sm">{check(contract.loc_bride)}</span>{' '}
            Ceremony <span className="field-sm">{check(contract.loc_ceremony)}</span>{' '}
            Park <span className="field-sm">{check(contract.loc_park)}</span>{' '}
            Reception <span className="field-sm">{check(contract.loc_reception)}</span>
          </p>
        </div>

        <div className="mt-4">
          <p className="font-bold">Work Included:</p>
          <p>
            Engagement Photo Shoot <span className="field-sm">{check(contract.engagement_session)}</span>
            {contract.engagement_location && (
              <span> *Eng session {contract.engagement_location}</span>
            )}
          </p>
          <p className="text-xs">*50 digital images watermarked</p>
        </div>

        <div className="mt-4">
          <p>Wedding Prints: Hours: <span className="field-sm">{display(contract.start_time)}</span> to <span className="field-sm">{display(contract.end_time)}</span></p>
          <p className="text-xs">*All weddings on USB/Dropbox, ready to print. 300 DPI 4x6, no watermarks</p>
        </div>

        <div className="mt-3">
          <p>
            Post Card style Thank You Cards <span className="field-sm">{printQty(contract.prints_postcard_thankyou)}</span>{' '}
            5x7 <span className="field-sm">{printQty(contract.prints_5x7)}</span>{' '}
            8x10 <span className="field-sm">{printQty(contract.prints_8x10)}</span>{' '}
            11x14 <span className="field-sm">{printQty(contract.prints_11x14)}</span>{' '}
            16x16 <span className="field-sm">{printQty(contract.prints_16x16)}</span>
          </p>
          <p>
            16x20 <span className="field-sm">{printQty(contract.prints_16x20)}</span>{' '}
            20x24 <span className="field-sm">{printQty(contract.prints_20x24)}</span>{' '}
            24x30 <span className="field-sm">{printQty(contract.prints_24x30)}</span>{' '}
            30x40 <span className="field-sm">{printQty(contract.prints_30x40)}</span>{' '}
            Post Production* <span className="field-sm">{check(contract.post_production)}</span>{' '}
            Drone Photography <span className="field-sm">{check(contract.drone_photography)}</span>
          </p>
        </div>

        <div className="mt-4">
          <p className="font-bold">Albums:</p>
          <p>
            Parents Size: <span className="field-sm">{display(contract.parent_albums_size)}</span>{' '}
            quantity <span className="field-sm">{display(contract.parent_albums_qty)}</span>{' '}
            # of Spreads <span className="field-sm">{display(contract.parent_albums_spreads)}</span>{' '}
            # of images <span className="field-sm">{display(contract.parent_albums_images)}</span>{' '}
            Cover: <span className="field-sm">{display(contract.parent_albums_cover)}</span>
          </p>
          <p>
            Bride &amp; Groom ({contract.bride_groom_album_qty ?? 0}) Size: <span className="field-sm">{display(contract.bride_groom_album_size)}</span>{' '}
            # of Spreads <span className="field-sm">{display(contract.bride_groom_album_spreads)}</span>{' '}
            # of images <span className="field-sm">{display(contract.bride_groom_album_images)}</span>{' '}
            Cover: <span className="field-sm">{display(contract.bride_groom_album_cover)}</span>
          </p>
          <p className="text-xs">*Omakase style if album purchased &amp; $500 print credit</p>
        </div>

        <div className="mt-4">
          <p className="font-bold">Video Included</p>
          <p>
            Baby Pictures <span className="field-sm">{check(contract.video_baby_pictures)}</span>{' '}
            Dating Pictures <span className="field-sm">{check(contract.video_dating_pictures)}</span>{' '}
            Music choice <span className="field-sm">{check(contract.video_music)}</span>{' '}
            End Credits <span className="field-sm">{check(contract.video_end_credits)}</span>
          </p>
          <p>
            HD Video <span className="field-sm">{check(contract.video_hd)}</span>{' '}
            GoPro <span className="field-sm">{check(contract.video_gopro)}</span>{' '}
            Drone <span className="field-sm">{check(contract.video_drone)}</span>{' '}
            LED Lighting <span className="field-sm">{check(contract.video_led_lights)}</span>{' '}
            Proof Video <span className="field-sm">{check(contract.video_proof)}</span>{' '}
            USB Drive <span className="field-sm">{check(contract.video_usb)}</span>
          </p>
          <p>
            Single Camera throughout <span className="field-sm">{check(contract.video_single_camera)}</span>{' '}
            Multi-Camera (Ceremony &amp; Reception) <span className="field-sm">{check(contract.video_multi_camera)}</span>{' '}
            Slideshow see site for details <span className="field-sm">{check(contract.video_slideshow)}</span>
          </p>
          <p>
            Long version up to 2 hrs <span className="field-sm">{check(contract.video_long_form)}</span>{' '}
            Instagram/Facebook Video <span className="field-sm">{check(contract.video_instagram_facebook)}</span>{' '}
            highlight clips: <span className="field-sm">{display(contract.video_highlights)}</span>
          </p>
        </div>

        <div className="mt-4">
          <p className="font-bold">Web:</p>
          <p>
            Personal Web Page <span className="field-sm">{check(contract.web_personal_page)}</span>{' '}
            Engagement Upload ({display(contract.web_engagement_upload)}pics) <span className="field-sm">{check(contract.web_engagement_upload > 0)}</span>{' '}
            Wedding Photo gallery ({display(contract.web_wedding_upload)}pics) <span className="field-sm">{check(contract.web_wedding_upload > 0)}</span>
          </p>
          <p className="text-xs">*10 minutes per image enlarged</p>
        </div>
      </div>

      {/* ==================== PAGE 2 ==================== */}
      <div className="page-break" />
      <div className="max-w-[8.5in] mx-auto bg-white shadow-md print:shadow-none p-10 mb-8 contract-form">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <Image src="/images/sigslogo.png" alt="SIGS Photography" width={180} height={60} />
          </div>
          <div className="text-right text-sm">Page | 2</div>
        </div>
        <div className="divider" />

        <p className="mt-4">
          Name &amp; Wedding Date: <span className="field-wide">{coupleSummary}</span>{' '}
          Signed Date: <span className="field-med">{signedDateStr}</span>
        </p>

        <div className="mt-6">
          <p className="font-bold mb-2">Installment Schedule:</p>
          {installments.length > 0 ? (
            installments.map((inst, idx) => (
              <div key={inst.id} className="flex justify-between mb-1">
                <span>
                  {idx + 1}{idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} Installment: {display(inst.due_description)}
                </span>
                <span>$ <span className="field-med">{Number(inst.amount).toLocaleString()}</span></span>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No installments recorded</p>
          )}
        </div>

        <div className="mt-6 flex gap-12">
          <span>Subtotal <span className="field-med">{Number(contract.subtotal || 0).toLocaleString()}</span></span>
          <span>Tax <span className="field-med">{Number(contract.tax || 0).toLocaleString()}</span></span>
          <span>Total <span className="field-med">{Number(contract.total || 0).toLocaleString()}</span></span>
        </div>

        <p className="mt-4">E-Transfer = info@sigsphoto.ca</p>

        <div className="mt-6">
          <p>
            Met at which Bridal Show or Referral? <span className="field-wide">{display(contract.lead_source || couple?.lead_source)}</span>
          </p>
          <p>
            # of guests <span className="field-sm">{display(contract.num_guests)}</span>{' '}
            # of BP <span className="field-sm">{display(contract.num_bridal_party)}</span>{' '}
            Flower Girl <span className="field-sm">{display(contract.flower_girl)}</span>{' '}
            Ring Boy <span className="field-sm">{display(contract.ring_boy)}</span>
          </p>
        </div>

        <div className="mt-4">
          <p>
            Venue Name: <span className="field-wide">{display(contract.reception_venue)}</span>{' '}
            DJ: <span className="field-sm">{display(contract.dj)}</span>{' '}
            Planner <span className="field-sm">{display(contract.planner)}</span>
          </p>
        </div>

        <div className="mt-6">
          <p className="font-bold mb-2">Approximate Timeline</p>
          <p>Groom: <span className="field-sm">{display(contract.groom_start_time)}</span> to <span className="field-sm">{display(contract.groom_end_time)}</span></p>
          <p>Bride: <span className="field-sm">{display(contract.bride_start_time)}</span> to <span className="field-sm">{display(contract.bride_end_time)}</span></p>
          <p>Drive 15</p>
          <p>1st look: <span className="field-sm">{display(contract.first_look_start)}</span> to <span className="field-sm">{display(contract.first_look_end)}</span></p>
          <p>Arrive at Ceremony: <span className="field-sm">{display(contract.ceremony_arrival)}</span></p>
          <p>Ceremony <span className="field-sm">{display(contract.ceremony_start)}</span> to <span className="field-sm">{display(contract.ceremony_end)}</span></p>
          <p>Park ideas: <span className="field-sm">{display(contract.park_start)}</span> to <span className="field-sm">{display(contract.park_end)}</span></p>
          <p>Venue: <span className="field-sm">{display(contract.venue_start)}</span> to <span className="field-sm">{display(contract.venue_end)}</span></p>
        </div>
      </div>

    </div>
  )
}
