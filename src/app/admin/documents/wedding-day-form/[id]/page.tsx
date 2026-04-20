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
      <div className="text-sm mt-0.5">{value}</div>
    </div>
  )
}

export default function WeddingDayFormViewPage() {
  const params = useParams()
  const id = params.id as string
  const searchParams = useSearchParams()

  const [form, setForm] = useState<any>(null)
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

      const { data: formData } = await supabase
        .from('wedding_day_forms')
        .select('*')
        .eq('id', id)
        .limit(1)

      const f = formData?.[0]
      if (!f) { setLoading(false); return }
      setForm(f)

      if (f.couple_id) {
        const { data: coupleData } = await supabase
          .from('couples')
          .select('bride_first_name, groom_first_name, wedding_date')
          .eq('id', f.couple_id)
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

  if (!form) {
    return <div className="p-12 text-center text-muted-foreground">Wedding Day Form not found.</div>
  }

  const coupleName = couple
    ? `${couple.bride_first_name} & ${couple.groom_first_name}`
    : 'Unknown'
  const weddingDate = couple?.wedding_date ? formatWeddingDate(couple.wedding_date) : '—'

  const vendors = [
    { label: 'Wedding Planner', name: form.vendor_wedding_planner, ig: form.vendor_wedding_planner_instagram },
    { label: 'Officiant', name: form.vendor_officiant, ig: form.vendor_officiant_instagram },
    { label: 'Makeup', name: form.vendor_makeup, ig: form.vendor_makeup_instagram },
    { label: 'Hair', name: form.vendor_hair, ig: form.vendor_hair_instagram },
    { label: 'Floral', name: form.vendor_floral, ig: form.vendor_floral_instagram },
    { label: 'Event Design', name: form.vendor_event_design, ig: form.vendor_event_design_instagram },
    { label: 'DJ / MC', name: form.vendor_dj_mc, ig: form.vendor_dj_mc_instagram },
    { label: 'Transportation', name: form.vendor_transportation, ig: form.vendor_transportation_instagram },
    { label: 'Venue', name: form.vendor_venue, ig: null },
  ]

  const driveTimes = [
    { label: 'Groom to Bride', value: form.drive_time_groom_to_bride },
    { label: 'Bride to Ceremony', value: form.drive_time_bride_to_ceremony },
    { label: 'Bride to First Look', value: form.drive_time_bride_to_first_look },
    { label: 'First Look to Park', value: form.drive_time_first_look_to_park },
    { label: 'Ceremony to Park', value: form.drive_time_ceremony_to_park },
    { label: 'Park to Ceremony', value: form.drive_time_park_to_ceremony },
    { label: 'Park to Reception', value: form.drive_time_park_to_reception },
    { label: 'Ceremony to Reception', value: form.drive_time_ceremony_to_reception },
  ].filter(d => d.value)

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
        {/* Print button */}
        <button
          onClick={() => window.print()}
          className="print-hide absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700"
        >
          PRINT
        </button>

        {/* Header */}
        <div className="text-center mb-8 border-b pb-6">
          <Image src="/sigs-logo.png" alt="SIGS Photography" width={80} height={80} className="mx-auto mb-3" />
          <h1 className="text-2xl font-serif font-bold">Wedding Day Information</h1>
          <p className="text-lg mt-2 font-medium">{coupleName}</p>
          <p className="text-sm text-gray-600">{weddingDate}</p>
        </div>

        {/* Section 1: Getting Ready */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Getting Ready</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">Groom Prep</h3>
              <div className="space-y-2">
                <Field label="Address" value={display(form.groom_address)} />
                <Field label="City" value={display(form.groom_city)} />
                <Field label="Start Time" value={display(form.groom_start_time)} />
                <Field label="Finish Time" value={display(form.groom_finish_time)} />
                <Field label="Phone" value={display(form.groom_phone)} />
                <Field label="Directions" value={display(form.groom_directions)} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">Bride Prep</h3>
              <div className="space-y-2">
                <Field label="Address" value={display(form.bride_address)} />
                <Field label="City" value={display(form.bride_city)} />
                <Field label="Start Time" value={display(form.bride_start_time)} />
                <Field label="Finish Time" value={display(form.bride_finish_time)} />
                <Field label="Phone" value={display(form.bride_phone)} />
                <Field label="Directions" value={display(form.bride_directions)} />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Ceremony */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Ceremony</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Location" value={display(form.ceremony_location_name)} />
            <Field label="Address" value={display(form.ceremony_address)} />
            <Field label="City" value={display(form.ceremony_city)} />
            <Field label="Photo Arrival Time" value={display(form.ceremony_photo_arrival_time)} />
            <Field label="Ceremony Begins At" value={display(form.ceremony_begins_at)} />
            <Field label="Start Time" value={display(form.ceremony_start_time)} />
            <Field label="Finish Time" value={display(form.ceremony_finish_time)} />
            <Field label="First Look" value={yesNo(form.has_first_look || form.ceremony_first_look)} />
            {(form.has_first_look || form.ceremony_first_look) && (
              <>
                <Field label="First Look Location" value={display(form.first_look_location_name)} />
                <Field label="First Look Time" value={display(form.first_look_time)} />
                <Field label="First Look Address" value={display(form.first_look_address)} />
                <Field label="First Look City" value={display(form.first_look_city)} />
              </>
            )}
          </div>
        </div>

        {/* Section 3: Park / Photo Location */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Park / Photo Location</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Park Name" value={display(form.park_name)} />
            <Field label="Address" value={display(form.park_address)} />
            <Field label="City" value={display(form.park_city)} />
            <Field label="Start Time" value={display(form.park_start_time)} />
            <Field label="Finish Time" value={display(form.park_finish_time)} />
            <Field label="Permit Obtained" value={yesNo(form.park_permit_obtained)} />
          </div>
        </div>

        {/* Section 4: Reception */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Reception</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Venue" value={display(form.reception_venue_name)} />
            <Field label="Address" value={display(form.reception_address)} />
            <Field label="City" value={display(form.reception_city)} />
            <Field label="Start Time" value={display(form.reception_start_time)} />
            <Field label="Finish Time" value={display(form.reception_finish_time)} />
            <Field label="Venue Arrival Time" value={display(form.venue_arrival_time)} />
            <Field label="Contact Name" value={display(form.venue_contact_name)} />
            <Field label="Contact Phone" value={display(form.venue_contact_phone)} />
            <Field label="Contact Email" value={display(form.venue_contact_email)} />
          </div>
        </div>

        {/* Section 5: Extra Location */}
        {form.extra_location_name && (
          <div className="section-card mb-6">
            <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Extra Location</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" value={display(form.extra_location_name)} />
              <Field label="Address" value={display(form.extra_address)} />
              <Field label="City" value={display(form.extra_city)} />
              <Field label="Start Time" value={display(form.extra_start_time)} />
              <Field label="Finish Time" value={display(form.extra_finish_time)} />
              <Field label="Notes" value={display(form.extra_location_notes)} />
            </div>
          </div>
        )}

        {/* Section 6: Timeline Summary */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Timeline Summary</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Hours in Contract" value={form.hours_in_contract ? `${form.hours_in_contract} hours` : '—'} />
            <Field label="Photo/Video End Time" value={display(form.photo_video_end_time)} />
          </div>
          {driveTimes.length > 0 && (
            <table className="w-full text-sm border rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 text-xs text-gray-500">Route</th>
                  <th className="text-right p-2 text-xs text-gray-500">Minutes</th>
                </tr>
              </thead>
              <tbody>
                {driveTimes.map(d => (
                  <tr key={d.label} className="border-t">
                    <td className="p-2">{d.label}</td>
                    <td className="p-2 text-right">{d.value} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 7: Vendors */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Vendors</h2>
          <div className="grid grid-cols-2 gap-3">
            {vendors.filter(v => v.name).map(v => (
              <div key={v.label}>
                <div className="text-xs text-gray-500 uppercase tracking-wide">{v.label}</div>
                <div className="text-sm mt-0.5">
                  {v.name}
                  {v.ig && <span className="text-gray-400 ml-1">@{v.ig}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 8: Additional Info */}
        <div className="section-card mb-6">
          <h2 className="text-lg font-serif font-bold border-b pb-2 mb-4">Additional Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Emergency Contact 1" value={form.emergency_contact_1_name ? `${form.emergency_contact_1_name} — ${display(form.emergency_contact_1_phone)}${form.contact1_relationship ? ` (${form.contact1_relationship})` : ''}` : '—'} />
            <Field label="Emergency Contact 2" value={form.emergency_contact_2_name ? `${form.emergency_contact_2_name} — ${display(form.emergency_contact_2_phone)}${form.contact2_relationship ? ` (${form.contact2_relationship})` : ''}` : '—'} />
            <Field label="Bridal Party Count" value={display(form.bridal_party_count)} />
            <Field label="Parent Info" value={display(form.parent_info)} />
            <Field label="Instagram" value={display(form.couple_instagram)} />
            <Field label="Wedding Hashtag" value={display(form.wedding_hashtag)} />
            {[form.inspiration_link_1, form.inspiration_link_2, form.inspiration_link_3, form.inspiration_link_4, form.inspiration_link_5].filter(Boolean).length > 0 && (
              <div className="col-span-2">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Inspiration Links</div>
                <div className="text-sm mt-0.5 space-y-1">
                  {[form.inspiration_link_1, form.inspiration_link_2, form.inspiration_link_3, form.inspiration_link_4, form.inspiration_link_5].filter(Boolean).map((link: string, i: number) => (
                    <div key={i}>{link}</div>
                  ))}
                </div>
              </div>
            )}
            <Field label="Honeymoon Details" value={display(form.honeymoon_details)} />
            <Field label="Additional Notes" value={display(form.additional_notes)} />
            {form.final_notes && <div className="col-span-2"><Field label="Final Notes" value={display(form.final_notes)} /></div>}
          </div>
        </div>
      </div>
    </>
  )
}
