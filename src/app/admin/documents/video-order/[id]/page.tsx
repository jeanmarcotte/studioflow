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

function yesNo(value: boolean | null | undefined): string {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
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

export default function VideoOrderViewPage() {
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
        .from('video_orders')
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
    return <div className="p-12 text-center text-muted-foreground">Video Order not found.</div>
  }

  const coupleName = couple
    ? `${couple.bride_first_name} & ${couple.groom_first_name}`
    : order.bride_name && order.groom_name
      ? `${order.bride_name} & ${order.groom_name}`
      : 'Unknown'
  const weddingDate = couple?.wedding_date
    ? formatWeddingDate(couple.wedding_date)
    : order.wedding_date_input || '—'

  // Build songs table from individual columns
  const songs = [
    { song: order.song1, placement: order.song1_placement },
    { song: order.song2, placement: order.song2_placement },
    { song: order.song3, placement: order.song3_placement },
    { song: order.song4, placement: order.song4_placement },
    { song: order.song5, placement: order.song5_placement },
    { song: order.song6, placement: order.song6_placement },
    { song: order.song7, placement: order.song7_placement },
  ].filter(s => s.song)

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
          <h1 className="text-2xl font-serif font-bold">Video Order</h1>
          <p className="text-lg mt-2 font-medium">{coupleName}</p>
          <p className="text-sm text-gray-600">{weddingDate}</p>
        </div>

        {/* Section 1: Music Selections */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Music Selections</h2>
          <div className="mb-4">
            <Field label="Let Jean Choose Music" value={yesNo(order.let_jean_choose_music)} />
          </div>
          {songs.length > 0 && (
            <table className="w-full text-sm border rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 text-xs text-gray-500">#</th>
                  <th className="text-left p-2 text-xs text-gray-500">Song</th>
                  <th className="text-left p-2 text-xs text-gray-500">Placement</th>
                </tr>
              </thead>
              <tbody>
                {songs.map((s, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    <td className="p-2">{s.song}</td>
                    <td className="p-2">{display(s.placement)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {order.song_choice && <div className="mt-3"><Field label="Song Choice (legacy)" value={display(order.song_choice)} /></div>}
          {order.song_backup && <div className="mt-2"><Field label="Backup Song" value={display(order.song_backup)} /></div>}
        </div>

        {/* Section 2: Video Preferences */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Video Preferences</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Recap Style" value={display(order.recap_style)} />
            <Field label="Include Vows" value={yesNo(order.include_vows)} />
            <Field label="Preferred Length" value={display(order.preferred_length)} />
          </div>
        </div>

        {/* Section 3: Content Preferences */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Content Preferences</h2>
          <div className="space-y-4">
            <Field label="Must-Have Moments" value={display(order.must_have_moments)} />
            <Field label="Moments to Feature" value={display(order.moments_to_feature)} />
            <Field label="Moments to Exclude" value={display(order.moments_to_exclude)} />
          </div>
        </div>

        {/* Section 4: Additional Notes */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Additional Notes</h2>
          <div className="space-y-3">
            <Field label="No Special Requests" value={yesNo(order.no_special_requests)} />
            <Field label="Additional Notes" value={display(order.additional_notes)} />
          </div>
        </div>

        {/* Section 5: Submission Info */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Submission Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Submitted By" value={display(order.submitted_by_email || order.email_input)} />
            <Field label="Submitted At" value={order.submitted_at ? new Date(order.submitted_at).toLocaleString('en-CA', { hour12: false }) : '—'} />
            {order.bride_name && <Field label="Bride Name (form input)" value={display(order.bride_name)} />}
            {order.groom_name && <Field label="Groom Name (form input)" value={display(order.groom_name)} />}
            {order.wedding_date_input && <Field label="Wedding Date (form input)" value={display(order.wedding_date_input)} />}
          </div>
        </div>
      </div>
    </>
  )
}
