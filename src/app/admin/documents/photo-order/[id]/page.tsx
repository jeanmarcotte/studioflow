'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import { formatWeddingDate } from '@/lib/formatters'
import Image from 'next/image'

function display(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function yesNo(value: boolean | string | null | undefined): string {
  if (value === true || value === 'yes') return 'Yes'
  if (value === false || value === 'no') return 'No'
  if (value === 'not_sure') return 'Not Sure'
  if (typeof value === 'string' && value) return value
  return '—'
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-sm mt-0.5 whitespace-pre-wrap">{value}</div>
    </div>
  )
}

function JsonList({ data }: { data: any }) {
  if (!data) return <span>—</span>
  if (typeof data === 'string') return <span>{data}</span>
  if (Array.isArray(data)) {
    return (
      <ul className="list-disc list-inside text-sm space-y-0.5">
        {data.map((item: any, i: number) => (
          <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
        ))}
      </ul>
    )
  }
  return <span>{JSON.stringify(data)}</span>
}

export default function PhotoOrderViewPage() {
  const params = useParams()
  const id = params.id as string
  const searchParams = useSearchParams()

  const [order, setOrder] = useState<any>(null)
  const [couple, setCouple] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!loading && searchParams.get('print') === 'true') {
      const timer = setTimeout(() => window.print(), 800)
      return () => clearTimeout(timer)
    }
  }, [loading, searchParams])

  useEffect(() => {
    async function fetchData() {
      if (!id) return

      const { data } = await supabase
        .from('photo_orders')
        .select('*')
        .eq('id', id)
        .limit(1)

      const o = data?.[0]
      if (!o) { setLoading(false); return }
      setOrder(o)

      if (o.couple_id) {
        const { data: coupleData } = await supabase
          .from('couples')
          .select('bride_first_name, groom_first_name, wedding_date')
          .eq('id', o.couple_id)
          .limit(1)
        setCouple(coupleData?.[0] || null)
      }
      setLoading(false)
    }
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!order) {
    return <div className="p-12 text-center text-muted-foreground">Photo Order not found.</div>
  }

  const coupleName = couple
    ? `${couple.bride_first_name} & ${couple.groom_first_name}`
    : order.bride_name && order.groom_name
      ? `${order.bride_name} & ${order.groom_name}`
      : 'Unknown'
  const weddingDate = couple?.wedding_date
    ? formatWeddingDate(couple.wedding_date)
    : order.wedding_date_input || '—'

  const printSizes = [
    { label: 'Postcards', value: order.prints_postcard_photos || order.postcard_photos },
    { label: '5\u00d77', value: order.prints_5x7_photos },
    { label: '8\u00d710', value: order.prints_8x10_photos },
    { label: '11\u00d714', value: order.prints_11x14_photos },
    { label: '16\u00d716', value: order.prints_16x16_photos },
    { label: '16\u00d720', value: order.prints_16x20_photos },
    { label: '20\u00d724', value: order.prints_20x24_photos },
    { label: '24\u00d730', value: order.prints_24x30_photos },
    { label: '30\u00d740', value: order.prints_30x40_photos },
  ].filter(p => p.value)

  return (
    <>
      <style jsx global>{`
        @media print {
          .print-hide { display: none !important; }
          @page { margin: 0.4in; }
          .section-card { break-inside: avoid; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto p-8 relative">
        <button
          onClick={() => window.print()}
          className="print-hide absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700"
        >
          PRINT
        </button>

        {/* Header */}
        <div className="text-center mb-8 border-b pb-6">
          <Image src="/sigs-logo.png" alt="SIGS Photography" width={80} height={80} className="mx-auto mb-3" />
          <h1 className="text-2xl font-serif font-bold">Photo Order</h1>
          <p className="text-lg mt-2 font-medium">{coupleName}</p>
          <p className="text-sm text-gray-600">{weddingDate}</p>
        </div>

        {/* Section 1: Wedding Album */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Wedding Album</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Has Wedding Album" value={yesNo(order.has_wedding_album ?? order.wants_wedding_album ?? order.wedding_album_response)} />
            <Field label="Design Preference" value={display(order.album_design_preference)} />
            <Field label="Cover Preference" value={display(order.album_cover_preference)} />
            <Field label="Cover Color" value={display(order.album_cover_color)} />
            <Field label="Cover Material" value={display(order.album_cover_material)} />
            <Field label="Cover Text" value={display(order.album_cover_text)} />
            <Field label="Cover Photo" value={display(order.cover_photo_filename)} />
            <Field label="Album Size" value={display(order.album_size)} />
            {order.album_photos && <div className="col-span-2"><Field label="Album Photos" value={display(order.album_photos)} /></div>}
            {order.main_album_photos && (
              <div className="col-span-2">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Main Album Photos</div>
                <div className="mt-0.5"><JsonList data={order.main_album_photos} /></div>
              </div>
            )}
            {order.main_album_notes && <div className="col-span-2"><Field label="Main Album Notes" value={display(order.main_album_notes)} /></div>}
          </div>
        </div>

        {/* Section 2: Parent Albums */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Parent Albums</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Number of Parent Albums" value={display(order.num_parent_albums ?? order.parent_album_count)} />
            <Field label="Parent Album Size" value={display(order.parent_album_size)} />
          </div>
          {[
            { label: 'Parent Album 1', photos: order.parent_album_1_photos, notes: order.parent_album_1_notes },
            { label: 'Parent Album 2', photos: order.parent_album_2_photos, notes: order.parent_album_2_notes },
            { label: 'Parent Album 3', photos: order.parent_album_3_photos, notes: null },
            { label: 'Parent Album 4', photos: order.parent_album_4_photos, notes: null },
          ].filter(a => a.photos).map(a => (
            <div key={a.label} className="mt-3">
              <h3 className="text-sm font-semibold text-gray-600 mb-1">{a.label}</h3>
              <div className="text-sm"><JsonList data={a.photos} /></div>
              {a.notes && <div className="text-sm text-gray-600 mt-1">Notes: {a.notes}</div>}
            </div>
          ))}
        </div>

        {/* Section 3: Print Orders */}
        {printSizes.length > 0 && (
          <div className="section-card mb-6">
            <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Print Orders</h2>
            <table className="w-full text-sm border rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 text-xs text-gray-500">Size</th>
                  <th className="text-left p-2 text-xs text-gray-500">Photos / Details</th>
                </tr>
              </thead>
              <tbody>
                {printSizes.map(p => (
                  <tr key={p.label} className="border-t">
                    <td className="p-2 font-medium">{p.label}</td>
                    <td className="p-2">{p.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 4: Additional Items */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Additional Items</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Thank You Cards" value={order.thank_you_cards ? `Yes (${order.thank_you_cards_qty || '—'} qty)` : yesNo(order.thank_you_cards)} />
            {order.portrait_prints && (
              <div className="col-span-2">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Portrait Prints</div>
                <div className="mt-0.5"><JsonList data={order.portrait_prints} /></div>
              </div>
            )}
            {order.collage_photos && (
              <div className="col-span-2">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Collage Photos</div>
                <div className="mt-0.5"><JsonList data={order.collage_photos} /></div>
              </div>
            )}
            <Field label="Wedding Frame Photo" value={display(order.wedding_frame_photo)} />
            <Field label="Engagement Portrait Photo" value={display(order.eng_portrait_photo)} />
            <Field label="Canvas Upgrade Notes" value={display(order.canvas_upgrade_notes)} />
            <Field label="USB Preference" value={display(order.usb_preference)} />
            <Field label="Print Preference" value={display(order.print_preference)} />
            {order.postcard_message && <Field label="Postcard Message" value={display(order.postcard_message)} />}
            <div className="col-span-2"><Field label="Special Instructions" value={display(order.special_instructions)} /></div>
            <div className="col-span-2"><Field label="Additional Notes" value={display(order.additional_notes)} /></div>
            <Field label="No Special Requests" value={yesNo(order.no_special_requests)} />
          </div>
        </div>

        {/* Section 5: Submission Info */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Submission Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Submitted By" value={display(order.submitted_by_email)} />
            <Field label="Submitted At" value={order.submitted_at ? new Date(order.submitted_at).toLocaleString('en-CA', { hour12: false }) : '—'} />
          </div>
        </div>
      </div>
    </>
  )
}
