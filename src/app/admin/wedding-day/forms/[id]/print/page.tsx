'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Phone, MapPin, Clock, AlertTriangle, Printer, X } from 'lucide-react'

interface FormData { [key: string]: any }
interface CoupleData {
  couple_name: string
  wedding_date: string | null
  bride_first_name: string | null
  groom_first_name: string | null
}
interface ContractData {
  reception_venue: string | null
  ceremony_location: string | null
  start_time: string | null
  end_time: string | null
  num_photographers: number | null
  num_videographers: number | null
}

export default function WeddingDayFormPrintPage() {
  const params = useParams()
  const coupleId = params.id as string
  const [form, setForm] = useState<FormData | null>(null)
  const [couple, setCouple] = useState<CoupleData | null>(null)
  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [formRes, coupleRes, contractRes] = await Promise.all([
        supabase.from('wedding_day_forms').select('*').eq('couple_id', coupleId).limit(1),
        supabase.from('couples').select('couple_name, wedding_date, bride_first_name, groom_first_name').eq('id', coupleId).limit(1),
        supabase.from('contracts').select('reception_venue, ceremony_location, start_time, end_time, num_photographers, num_videographers').eq('couple_id', coupleId).limit(1),
      ])
      if (formRes.data?.[0]) setForm(formRes.data[0])
      if (coupleRes.data?.[0]) setCouple(coupleRes.data[0])
      if (contractRes.data?.[0]) setContract(contractRes.data[0])
      setLoading(false)
    }
    fetchData()
  }, [coupleId])

  useEffect(() => {
    if (!loading && form) setTimeout(() => window.print(), 600)
  }, [loading, form])

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-slate-400 font-serif italic">Loading...</p></div>
  if (!form || !couple) return <div className="flex items-center justify-center min-h-screen"><p className="text-slate-400">No form data found.</p></div>

  const weddingDate = couple.wedding_date
    ? new Date(couple.wedding_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'TBD'
  const venueName = form.reception_venue_name || contract?.reception_venue || ''

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 0.5in 0.6in; size: letter; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      {/* Print / Close bar */}
      <div className="no-print sticky top-0 z-50 bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
        <span className="text-sm font-medium">Wedding Day Form — {couple.couple_name}</span>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm font-medium transition-colors">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
          <button onClick={() => window.close()} className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ═══ DESKTOP / PRINT VIEW ═══ */}
      <div className="hidden md:block print:block">
        <div className="max-w-[700px] mx-auto px-8 py-10 print:px-0 print:py-0 print:max-w-none">

          {/* ── HEADER ── */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px flex-1 bg-slate-300" />
              <div className="tracking-[0.3em] text-xs font-semibold text-slate-400 uppercase">SIGS Photography</div>
              <div className="h-px flex-1 bg-slate-300" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-slate-900 tracking-tight mb-1">{couple.couple_name}</h1>
            <p className="text-slate-500 text-sm tracking-wide">{weddingDate}</p>
            {venueName && <p className="text-slate-400 text-sm mt-0.5">{venueName}</p>}
          </div>

          {/* ── TIMELINE OVERVIEW ── */}
          {(form.groom_start_time || form.bride_start_time || form.venue_arrival_time) && (
            <div className="mb-8">
              <SectionTitle>Timeline Overview</SectionTitle>
              <div className="grid grid-cols-4 gap-3 mt-3">
                <TimeBox label="Groom Prep" time={form.groom_start_time && form.groom_finish_time ? `${form.groom_start_time} - ${form.groom_finish_time}` : form.groom_start_time} />
                <TimeBox label="Bride Prep" time={form.bride_start_time && form.bride_finish_time ? `${form.bride_start_time} - ${form.bride_finish_time}` : form.bride_start_time} />
                <TimeBox label={form.has_first_look ? 'First Look' : 'Ceremony Arrival'} time={form.has_first_look ? form.first_look_time : (form.ceremony_photo_arrival_time || form.ceremony_start_time)} />
                <TimeBox label="Coverage End" time={form.photo_video_end_time} />
              </div>
            </div>
          )}

          {/* ── EMERGENCY CONTACTS ── */}
          {(form.emergency_contact_1_name || form.emergency_contact_2_name) && (
            <div className="mb-8 border-2 border-amber-200 bg-amber-50/50 rounded-lg p-5 print:border-amber-300">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Emergency Contacts</span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {form.emergency_contact_1_name && (
                  <div>
                    <p className="text-sm text-slate-600 mb-1">{form.emergency_contact_1_name}{form.contact1_relationship ? ` (${form.contact1_relationship})` : ''}</p>
                    <a href={`tel:${form.emergency_contact_1_phone}`} className="text-xl font-bold text-slate-900 tracking-wide">
                      {form.emergency_contact_1_phone}
                    </a>
                  </div>
                )}
                {form.emergency_contact_2_name && (
                  <div>
                    <p className="text-sm text-slate-600 mb-1">{form.emergency_contact_2_name}{form.contact2_relationship ? ` (${form.contact2_relationship})` : ''}</p>
                    <a href={`tel:${form.emergency_contact_2_phone}`} className="text-xl font-bold text-slate-900 tracking-wide">
                      {form.emergency_contact_2_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PREP ── */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <LocationCard
              title="Bride Prep"
              name={couple.bride_first_name}
              address={form.bride_address}
              city={form.bride_city}
              postalCode={form.bride_postal_code}
              intersection={form.bride_intersection}
              phone={form.bride_phone}
              startTime={form.bride_start_time}
              finishTime={form.bride_finish_time}
              directions={form.bride_directions}
            />
            <LocationCard
              title="Groom Prep"
              name={couple.groom_first_name}
              address={form.groom_address}
              city={form.groom_city}
              postalCode={form.groom_postal_code}
              intersection={form.groom_intersection}
              phone={form.groom_phone}
              startTime={form.groom_start_time}
              finishTime={form.groom_finish_time}
              directions={form.groom_directions}
            />
          </div>

          {/* ── CEREMONY + RECEPTION ── */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <LocationCard
              title="Ceremony"
              name={form.ceremony_location_name || contract?.ceremony_location}
              address={form.ceremony_address}
              city={form.ceremony_city}
              postalCode={form.ceremony_postal_code}
              intersection={form.ceremony_intersection}
              startTime={form.ceremony_start_time}
              finishTime={form.ceremony_finish_time}
              photoArrival={form.ceremony_photo_arrival_time}
              directions={form.ceremony_directions}
            />
            <LocationCard
              title="Reception"
              name={form.reception_venue_name || contract?.reception_venue}
              address={form.reception_address}
              city={form.reception_city}
              postalCode={form.reception_postal_code}
              intersection={form.reception_intersection}
              startTime={form.reception_start_time}
              finishTime={form.reception_finish_time}
              directions={form.reception_directions}
            />
          </div>

          {/* ── FIRST LOOK ── */}
          {form.has_first_look && form.first_look_location_name && (
            <div className="grid grid-cols-2 gap-8 mb-8">
              <LocationCard
                title="First Look"
                name={form.first_look_location_name}
                address={form.first_look_address}
                city={form.first_look_city}
                startTime={form.first_look_time}
              />
              {form.park_name && (
                <LocationCard
                  title="Park / Photos"
                  name={form.park_name}
                  address={form.park_address}
                  city={form.park_city}
                  postalCode={form.park_postal_code}
                  intersection={form.park_intersection}
                  startTime={form.park_start_time}
                  finishTime={form.park_finish_time}
                  permit={form.park_permit_obtained}
                  directions={form.park_directions}
                />
              )}
            </div>
          )}

          {/* Park without first look */}
          {!form.has_first_look && form.park_name && (
            <div className="grid grid-cols-2 gap-8 mb-8">
              <LocationCard
                title="Park / Photos"
                name={form.park_name}
                address={form.park_address}
                city={form.park_city}
                postalCode={form.park_postal_code}
                intersection={form.park_intersection}
                startTime={form.park_start_time}
                finishTime={form.park_finish_time}
                permit={form.park_permit_obtained}
                directions={form.park_directions}
              />
              <div />
            </div>
          )}

          {/* ── EXTRA LOCATION ── */}
          {form.extra_location_name && (
            <div className="grid grid-cols-2 gap-8 mb-8">
              <LocationCard
                title="Extra Location"
                name={form.extra_location_name}
                address={form.extra_address}
                city={form.extra_city}
                postalCode={form.extra_postal_code}
                intersection={form.extra_intersection}
                startTime={form.extra_start_time}
                finishTime={form.extra_finish_time}
                directions={form.extra_directions}
              />
              <div />
            </div>
          )}

          {/* ── DRIVE TIMES ── */}
          <DriveTimesSection form={form} />

          {/* ── VENUE CONTACT ── */}
          {(form.venue_contact_name || form.venue_contact_phone) && (
            <div className="mb-8">
              <SectionTitle>Venue Contact</SectionTitle>
              <div className="mt-3 flex gap-6 text-sm">
                {form.venue_contact_name && <span className="text-slate-700">{form.venue_contact_name}</span>}
                {form.venue_contact_phone && <a href={`tel:${form.venue_contact_phone}`} className="font-semibold text-slate-900">{form.venue_contact_phone}</a>}
                {form.venue_contact_email && <span className="text-slate-500">{form.venue_contact_email}</span>}
              </div>
            </div>
          )}

          {/* ── VENDORS ── */}
          <VendorsSection form={form} />

          {/* ── ADDITIONAL INFO ── */}
          <AdditionalInfoSection form={form} />

          {/* ── NOTES ── */}
          {(form.additional_notes || form.final_notes) && (
            <div className="mb-8">
              <SectionTitle>Special Notes</SectionTitle>
              <div className="mt-3 bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {form.additional_notes}
                {form.additional_notes && form.final_notes && '\n\n'}
                {form.final_notes}
              </div>
            </div>
          )}

          {/* ── FOOTER ── */}
          <div className="mt-12 pt-4 border-t border-slate-200 text-center">
            <p className="text-[10px] text-slate-400 tracking-wider uppercase">
              SIGS Photography — Wedding Day Form — Submitted {new Date(form.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ MOBILE VIEW ═══ */}
      <div className="md:hidden print:hidden">
        <MobileView form={form} couple={couple} contract={contract} venueName={venueName} weddingDate={weddingDate} />
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */
/* Shared Components                                          */
/* ────────────────────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">{children}</h2>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  )
}

function TimeBox({ label, time }: { label: string; time: string | null }) {
  if (!time) return <div />
  return (
    <div className="text-center bg-slate-50 rounded-lg py-3 px-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      <div className="text-lg font-bold text-slate-900 tabular-nums">{time}</div>
    </div>
  )
}

function LocationCard({
  title, name, address, city, postalCode, intersection, phone, startTime, finishTime, photoArrival, permit, directions,
}: {
  title: string; name?: string | null; address?: string | null; city?: string | null;
  postalCode?: string | null; intersection?: string | null; phone?: string | null;
  startTime?: string | null; finishTime?: string | null; photoArrival?: string | null;
  permit?: boolean | null; directions?: string | null;
}) {
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <div className="mt-3 space-y-1.5">
        {name && <p className="font-serif text-base font-semibold text-slate-900">{name}</p>}
        {(startTime || finishTime || photoArrival) && (
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <Clock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            {photoArrival && <span>Arrive {photoArrival}</span>}
            {photoArrival && startTime && <span className="text-slate-300">|</span>}
            {startTime && <span>{startTime}</span>}
            {finishTime && <span>– {finishTime}</span>}
          </div>
        )}
        {(address || city) && (
          <div className="flex items-start gap-1.5 text-sm text-slate-600">
            <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
            <span>{[address, city, postalCode].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {intersection && <p className="text-xs text-slate-400 ml-5">Near {intersection}</p>}
        {phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <a href={`tel:${phone}`} className="text-sm font-semibold text-slate-800">{phone}</a>
          </div>
        )}
        {permit !== null && permit !== undefined && (
          <p className="text-xs text-slate-500 ml-5">Permit: {permit ? 'Yes' : 'No'}</p>
        )}
        {directions && <p className="text-xs text-slate-500 italic mt-1">{directions}</p>}
      </div>
    </div>
  )
}

function DriveTimesSection({ form }: { form: FormData }) {
  const drives = [
    { label: 'Groom → Bride', val: form.drive_time_groom_to_bride },
    { label: 'Bride → First Look', val: form.drive_time_bride_to_first_look },
    { label: 'Bride → Ceremony', val: form.drive_time_bride_to_ceremony },
    { label: 'First Look → Park', val: form.drive_time_first_look_to_park },
    { label: 'Ceremony → Park', val: form.drive_time_ceremony_to_park },
    { label: 'Park → Ceremony', val: form.drive_time_park_to_ceremony },
    { label: 'Park → Reception', val: form.drive_time_park_to_reception },
    { label: 'Ceremony → Reception', val: form.drive_time_ceremony_to_reception },
  ].filter(d => d.val)

  if (drives.length === 0) return null

  return (
    <div className="mb-8">
      <SectionTitle>Drive Times</SectionTitle>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {drives.map(d => (
          <div key={d.label} className="text-center bg-slate-50 rounded py-2 px-1">
            <div className="text-[9px] uppercase tracking-wide text-slate-400 leading-tight mb-1">{d.label}</div>
            <div className="text-sm font-bold text-slate-800 tabular-nums">{d.val} min</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function VendorsSection({ form }: { form: FormData }) {
  const vendors = [
    { label: 'Wedding Planner', name: form.vendor_wedding_planner, ig: form.vendor_wedding_planner_instagram },
    { label: 'Officiant', name: form.vendor_officiant, ig: form.vendor_officiant_instagram },
    { label: 'Makeup', name: form.vendor_makeup, ig: form.vendor_makeup_instagram },
    { label: 'Hair', name: form.vendor_hair, ig: form.vendor_hair_instagram },
    { label: 'Floral', name: form.vendor_floral, ig: form.vendor_floral_instagram },
    { label: 'Event Design', name: form.vendor_event_design, ig: form.vendor_event_design_instagram },
    { label: 'DJ / MC', name: form.vendor_dj_mc, ig: form.vendor_dj_mc_instagram },
    { label: 'Transportation', name: form.vendor_transportation, ig: form.vendor_transportation_instagram },
  ].filter(v => v.name)

  if (vendors.length === 0) return null

  return (
    <div className="mb-8">
      <SectionTitle>Vendors</SectionTitle>
      <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2">
        {vendors.map(v => (
          <div key={v.label} className="flex justify-between text-sm py-1">
            <span className="text-slate-400">{v.label}</span>
            <span className="text-slate-800 font-medium text-right">{v.name}{v.ig ? ` @${v.ig}` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdditionalInfoSection({ form }: { form: FormData }) {
  const items = [
    { label: 'Bridal Party', val: form.bridal_party_count?.toString() },
    { label: 'Parent Info', val: form.parent_info },
    { label: 'Honeymoon', val: form.honeymoon_details },
    { label: 'Instagram', val: form.couple_instagram },
    { label: 'Hashtag', val: form.wedding_hashtag },
  ].filter(i => i.val)

  if (items.length === 0) return null

  return (
    <div className="mb-8">
      <SectionTitle>Additional Info</SectionTitle>
      <div className="mt-3 space-y-1">
        {items.map(i => (
          <div key={i.label} className="flex gap-2 text-sm py-0.5">
            <span className="text-slate-400 min-w-[120px]">{i.label}</span>
            <span className="text-slate-700">{i.val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */
/* Mobile View                                                */
/* ────────────────────────────────────────────────────────── */

function MobileView({ form, couple, contract, venueName, weddingDate }: {
  form: FormData; couple: CoupleData; contract: ContractData | null; venueName: string; weddingDate: string
}) {
  return (
    <div className="pb-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b px-4 py-3">
        <h1 className="font-serif text-lg font-bold text-slate-900">{couple.couple_name}</h1>
        <p className="text-xs text-slate-500">{weddingDate}</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Timeline */}
        {(form.venue_arrival_time || form.photo_video_end_time || form.groom_start_time) && (
          <MobileCard title="Timeline">
            <div className="grid grid-cols-3 gap-2">
              <TimeBox label="Groom Prep" time={form.groom_start_time} />
              <TimeBox label="Bride Prep" time={form.bride_start_time} />
              <TimeBox label="Coverage End" time={form.photo_video_end_time} />
            </div>
          </MobileCard>
        )}

        {/* Emergency */}
        {(form.emergency_contact_1_name || form.emergency_contact_2_name) && (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Emergency Contacts</span>
            </div>
            {form.emergency_contact_1_name && (
              <div className="mb-3">
                <p className="text-sm text-slate-600">{form.emergency_contact_1_name}</p>
                <a href={`tel:${form.emergency_contact_1_phone}`} className="text-2xl font-bold text-slate-900 block mt-1" style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                  {form.emergency_contact_1_phone}
                </a>
              </div>
            )}
            {form.emergency_contact_2_name && (
              <div className="pt-3 border-t border-amber-200">
                <p className="text-sm text-slate-600">{form.emergency_contact_2_name}</p>
                <a href={`tel:${form.emergency_contact_2_phone}`} className="text-2xl font-bold text-slate-900 block mt-1" style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                  {form.emergency_contact_2_phone}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Bride Prep */}
        <MobileLocationCard title="Bride Prep" form={form} prefix="bride" name={couple.bride_first_name} />
        <MobileLocationCard title="Groom Prep" form={form} prefix="groom" name={couple.groom_first_name} />
        <MobileLocationCard title="Ceremony" form={form} prefix="ceremony" name={form.ceremony_location_name || contract?.ceremony_location} />
        <MobileLocationCard title="Reception" form={form} prefix="reception" name={form.reception_venue_name || contract?.reception_venue} />

        {form.has_first_look && form.first_look_location_name && (
          <MobileCard title="First Look">
            <p className="font-semibold text-slate-900">{form.first_look_location_name}</p>
            {form.first_look_time && <p className="text-sm text-slate-600 mt-1">Time: {form.first_look_time}</p>}
            {form.first_look_address && <p className="text-sm text-slate-500">{form.first_look_address}, {form.first_look_city}</p>}
          </MobileCard>
        )}

        {form.park_name && (
          <MobileLocationCard title="Park / Photos" form={form} prefix="park" name={form.park_name} />
        )}

        {/* Notes */}
        {(form.additional_notes || form.final_notes) && (
          <MobileCard title="Notes">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{form.additional_notes}{form.additional_notes && form.final_notes && '\n\n'}{form.final_notes}</p>
          </MobileCard>
        )}
      </div>
    </div>
  )
}

function MobileCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function MobileLocationCard({ title, form, prefix, name }: { title: string; form: FormData; prefix: string; name?: string | null }) {
  const addr = form[`${prefix}_address`]
  const city = form[`${prefix}_city`]
  const phone = form[`${prefix}_phone`]
  const start = form[`${prefix}_start_time`]
  const finish = form[`${prefix}_finish_time`]
  if (!addr && !name && !start) return null

  return (
    <MobileCard title={title}>
      {name && <p className="font-semibold text-slate-900 mb-1">{name}</p>}
      {(start || finish) && <p className="text-sm text-slate-600 mb-1">{start}{finish ? ` – ${finish}` : ''}</p>}
      {addr && <p className="text-sm text-slate-500">{addr}{city ? `, ${city}` : ''}</p>}
      {phone && (
        <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 mt-2 text-base font-bold text-slate-900" style={{ minHeight: '44px' }}>
          <Phone className="h-4 w-4 text-slate-400" /> {phone}
        </a>
      )}
    </MobileCard>
  )
}
