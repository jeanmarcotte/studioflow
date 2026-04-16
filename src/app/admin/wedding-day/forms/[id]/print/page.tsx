'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface FormData {
  [key: string]: any
}

interface CoupleData {
  couple_name: string
  wedding_date: string | null
  bride_first_name: string | null
  groom_first_name: string | null
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-2 py-1">
      <span className="text-gray-500 min-w-[160px] text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 break-inside-avoid">
      <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 border-b border-gray-300 pb-1 mb-2">
        {title}
      </h2>
      <div>{children}</div>
    </div>
  )
}

function formatTime(t: string | null): string {
  if (!t) return ''
  return t
}

export default function WeddingDayFormPrintPage() {
  const params = useParams()
  const coupleId = params.id as string
  const [form, setForm] = useState<FormData | null>(null)
  const [couple, setCouple] = useState<CoupleData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [formRes, coupleRes] = await Promise.all([
        supabase
          .from('wedding_day_forms')
          .select('*')
          .eq('couple_id', coupleId)
          .limit(1),
        supabase
          .from('couples')
          .select('couple_name, wedding_date, bride_first_name, groom_first_name')
          .eq('id', coupleId)
          .limit(1),
      ])

      if (formRes.data?.[0]) setForm(formRes.data[0])
      if (coupleRes.data?.[0]) setCouple(coupleRes.data[0])
      setLoading(false)
    }
    fetchData()
  }, [coupleId])

  // Auto-trigger print once loaded
  useEffect(() => {
    if (!loading && form) {
      setTimeout(() => window.print(), 500)
    }
  }, [loading, form])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading form data...</p>
      </div>
    )
  }

  if (!form || !couple) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No form data found for this couple.</p>
      </div>
    )
  }

  const weddingDateFormatted = couple.wedding_date
    ? new Date(couple.wedding_date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      })
    : 'TBD'

  return (
    <div className="max-w-3xl mx-auto p-8 print:p-4 print:max-w-none">
      {/* Print styles */}
      <style>{`
        @media print {
          body { font-size: 11px; }
          .no-print { display: none !important; }
          @page { margin: 0.5in; }
        }
      `}</style>

      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
        <h1 className="text-xl font-bold">{couple.couple_name}</h1>
        <p className="text-gray-600">{weddingDateFormatted}</p>
        <p className="text-xs text-gray-400 mt-1">Wedding Day Form — SIGS Photography</p>
      </div>

      {/* Print button (hidden in print) */}
      <div className="no-print mb-6 flex gap-2 justify-center">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
        >
          Print / Save as PDF
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-8">
        {/* Emergency Contacts */}
        <Section title="Emergency Contacts">
          <Field label="Contact 1" value={form.emergency_contact_1_name} />
          <Field label="Phone" value={form.emergency_contact_1_phone} />
          <Field label="Contact 2" value={form.emergency_contact_2_name} />
          <Field label="Phone" value={form.emergency_contact_2_phone} />
        </Section>

        {/* Contract Info */}
        <Section title="Contract Info">
          <Field label="Ceremony Begins" value={formatTime(form.ceremony_begins_at)} />
          <Field label="Hours in Contract" value={form.hours_in_contract?.toString()} />
          <Field label="Photo/Video End" value={formatTime(form.photo_video_end_time)} />
          <Field label="Venue Arrival" value={formatTime(form.venue_arrival_time)} />
        </Section>

        {/* Groom Prep */}
        <Section title="Groom Prep">
          <Field label="Times" value={form.groom_start_time && form.groom_finish_time ? `${form.groom_start_time} – ${form.groom_finish_time}` : null} />
          <Field label="Address" value={form.groom_address} />
          <Field label="City" value={form.groom_city} />
          <Field label="Postal Code" value={form.groom_postal_code} />
          <Field label="Intersection" value={form.groom_intersection} />
          <Field label="Phone" value={form.groom_phone} />
        </Section>

        {/* Bride Prep */}
        <Section title="Bride Prep">
          <Field label="Times" value={form.bride_start_time && form.bride_finish_time ? `${form.bride_start_time} – ${form.bride_finish_time}` : null} />
          <Field label="Address" value={form.bride_address} />
          <Field label="City" value={form.bride_city} />
          <Field label="Postal Code" value={form.bride_postal_code} />
          <Field label="Intersection" value={form.bride_intersection} />
          <Field label="Phone" value={form.bride_phone} />
        </Section>

        {/* Ceremony */}
        <Section title="Ceremony">
          <Field label="Venue" value={form.ceremony_location_name} />
          <Field label="Photo Arrival" value={formatTime(form.ceremony_photo_arrival_time)} />
          <Field label="Start" value={formatTime(form.ceremony_start_time)} />
          <Field label="Finish" value={formatTime(form.ceremony_finish_time)} />
          <Field label="Address" value={form.ceremony_address} />
          <Field label="City" value={form.ceremony_city} />
          <Field label="Intersection" value={form.ceremony_intersection} />
          <Field label="First Look Here" value={form.ceremony_first_look ? 'Yes' : null} />
        </Section>

        {/* First Look */}
        {form.has_first_look && form.first_look_location_name && (
          <Section title="First Look">
            <Field label="Location" value={form.first_look_location_name} />
            <Field label="Time" value={formatTime(form.first_look_time)} />
            <Field label="Address" value={form.first_look_address} />
            <Field label="City" value={form.first_look_city} />
          </Section>
        )}

        {/* Park / Photos */}
        {form.park_name && (
          <Section title="Park / Photos">
            <Field label="Location" value={form.park_name} />
            <Field label="Permit" value={form.park_permit_obtained ? 'Yes' : 'No'} />
            <Field label="Times" value={form.park_start_time && form.park_finish_time ? `${form.park_start_time} – ${form.park_finish_time}` : null} />
            <Field label="Address" value={form.park_address} />
            <Field label="City" value={form.park_city} />
            <Field label="Intersection" value={form.park_intersection} />
          </Section>
        )}

        {/* Extra Location */}
        {form.extra_location_name && (
          <Section title="Extra Location">
            <Field label="Location" value={form.extra_location_name} />
            <Field label="Times" value={form.extra_start_time && form.extra_finish_time ? `${form.extra_start_time} – ${form.extra_finish_time}` : null} />
            <Field label="Address" value={form.extra_address} />
            <Field label="City" value={form.extra_city} />
            <Field label="Notes" value={form.extra_location_notes} />
          </Section>
        )}

        {/* Reception */}
        <Section title="Reception">
          <Field label="Venue" value={form.reception_venue_name} />
          <Field label="Start" value={formatTime(form.reception_start_time)} />
          <Field label="Finish" value={formatTime(form.reception_finish_time)} />
          <Field label="Address" value={form.reception_address} />
          <Field label="City" value={form.reception_city} />
          <Field label="Intersection" value={form.reception_intersection} />
        </Section>

        {/* Drive Times */}
        <Section title="Drive Times">
          <Field label="Groom → Bride" value={form.drive_time_groom_to_bride ? `${form.drive_time_groom_to_bride} min` : null} />
          <Field label="Bride → Ceremony" value={form.drive_time_bride_to_ceremony ? `${form.drive_time_bride_to_ceremony} min` : null} />
          <Field label="Ceremony → Park" value={form.drive_time_ceremony_to_park ? `${form.drive_time_ceremony_to_park} min` : null} />
          <Field label="Park → Reception" value={form.drive_time_park_to_reception ? `${form.drive_time_park_to_reception} min` : null} />
          {form.drive_time_bride_to_first_look && <Field label="Bride → First Look" value={`${form.drive_time_bride_to_first_look} min`} />}
          {form.drive_time_first_look_to_park && <Field label="First Look → Park" value={`${form.drive_time_first_look_to_park} min`} />}
          {form.drive_time_park_to_ceremony && <Field label="Park → Ceremony" value={`${form.drive_time_park_to_ceremony} min`} />}
          {form.drive_time_ceremony_to_reception && <Field label="Ceremony → Reception" value={`${form.drive_time_ceremony_to_reception} min`} />}
        </Section>

        {/* Venue Contact */}
        <Section title="Venue Contact">
          <Field label="Name" value={form.venue_contact_name} />
          <Field label="Phone" value={form.venue_contact_phone} />
          <Field label="Email" value={form.venue_contact_email} />
        </Section>

        {/* Vendors */}
        <Section title="Vendors">
          <Field label="Wedding Planner" value={form.vendor_wedding_planner} />
          <Field label="Officiant" value={form.vendor_officiant} />
          <Field label="Makeup" value={form.vendor_makeup} />
          <Field label="Hair" value={form.vendor_hair} />
          <Field label="Floral" value={form.vendor_floral} />
          <Field label="Event Design" value={form.vendor_event_design} />
          <Field label="DJ / MC" value={form.vendor_dj_mc} />
          <Field label="Transportation" value={form.vendor_transportation} />
        </Section>
      </div>

      {/* Full-width sections */}
      <Section title="Additional Info">
        <Field label="Bridal Party Count" value={form.bridal_party_count?.toString()} />
        <Field label="Parent Info" value={form.parent_info} />
        <Field label="Honeymoon" value={form.honeymoon_details} />
        <Field label="Instagram" value={form.couple_instagram} />
        <Field label="Hashtag" value={form.wedding_hashtag} />
      </Section>

      {(form.additional_notes || form.final_notes) && (
        <Section title="Notes">
          {form.additional_notes && (
            <p className="text-sm whitespace-pre-wrap mb-2">{form.additional_notes}</p>
          )}
          {form.final_notes && (
            <p className="text-sm whitespace-pre-wrap">{form.final_notes}</p>
          )}
        </Section>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 mt-8 pt-4 border-t">
        Form submitted {new Date(form.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        {form.updated_at && form.updated_at !== form.created_at && (
          <> — Last updated {new Date(form.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</>
        )}
      </div>
    </div>
  )
}
