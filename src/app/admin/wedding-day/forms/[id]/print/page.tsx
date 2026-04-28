'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Printer, X } from 'lucide-react'
import { formatPackage, formatTime12h } from '@/lib/formatters'

interface FormData { [key: string]: any }
interface CoupleData {
  couple_name: string
  wedding_date: string | null
  bride_first_name: string | null
  bride_last_name: string | null
  groom_first_name: string | null
  groom_last_name: string | null
  package_type: string | null
}
interface ContractData {
  reception_venue: string | null
  ceremony_location: string | null
  start_time: string | null
  end_time: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTimeToMinutes(time: string): number {
  const cleaned = time.trim().toLowerCase().replace(/\s+/g, '')
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(am|pm)?$/)
  if (!match) return 0
  let hours = parseInt(match[1])
  const minutes = parseInt(match[2])
  const period = match[3]
  if (period) {
    if (period === 'am' && hours === 12) hours = 0
    if (period === 'pm' && hours !== 12) hours += 12
  }
  return hours * 60 + minutes
}

function calcHours(start: string, end: string): string {
  if (!start || !end) return ''
  const startMin = parseTimeToMinutes(start)
  const endMin = parseTimeToMinutes(end)
  const totalMinutes = endMin >= startMin ? endMin - startMin : (24 * 60 - startMin) + endMin
  if (totalMinutes <= 0) return ''
  const hrs = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hours`
}

function calcOvertimeHours(receptionEnd: string, coverageEnd: string): number {
  if (!receptionEnd || !coverageEnd) return 0
  const recMin = parseTimeToMinutes(receptionEnd)
  const covMin = parseTimeToMinutes(coverageEnd)
  const diff = recMin > covMin ? recMin - covMin : recMin < covMin ? (24 * 60 - covMin) + recMin : 0
  return diff / 60
}

function buildAddress(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(', ')
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function igUrl(handle: string): string {
  const clean = handle.replace(/^@/, '')
  return `https://instagram.com/${clean}`
}

// ─── Section Components ───────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 mt-6 px-1">{children}</h2>
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 text-right">{value}</span>
    </div>
  )
}

function LocationCard({ startTime, label, venueName, personName, address, directions, phone }: {
  startTime: string
  label: string
  venueName?: string | null
  personName?: string | null
  address: string
  directions?: string | null
  phone?: string | null
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-3">
      {/* Time + Label header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <span className="text-lg font-bold text-teal-700 tabular-nums min-w-[60px]">{startTime}</span>
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-700">{label}</span>
      </div>
      <div className="px-4 py-3 space-y-3">
        {venueName && <p className="font-bold text-slate-900">{venueName}</p>}
        {personName && <p className="font-semibold text-slate-800">{personName}</p>}
        {address && <p className="text-sm text-slate-500">{address}</p>}
        {directions && <p className="text-xs text-slate-400 italic">{directions}</p>}

        {address && (
          <a
            href={mapsUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full py-3 rounded-lg bg-teal-600 text-white font-medium text-sm hover:bg-teal-700 active:bg-teal-800 transition-colors"
          >
            OPEN IN MAPS
          </a>
        )}

        {phone && (
          <a
            href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
            className="flex items-center justify-center w-full py-3 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            {phone}
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
        supabase.from('couples').select('couple_name, wedding_date, bride_first_name, bride_last_name, groom_first_name, groom_last_name, package_type').eq('id', coupleId).limit(1),
        supabase.from('contracts').select('reception_venue, ceremony_location, start_time, end_time').eq('couple_id', coupleId).limit(1),
      ])
      if (formRes.data?.[0]) setForm(formRes.data[0])
      if (coupleRes.data?.[0]) setCouple(coupleRes.data[0])
      if (contractRes.data?.[0]) setContract(contractRes.data[0])
      setLoading(false)
    }
    fetchData()
  }, [coupleId])

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-slate-400">Loading...</p></div>
  if (!form || !couple) return <div className="flex items-center justify-center min-h-screen"><p className="text-slate-400">No form data found.</p></div>

  const weddingDate = couple.wedding_date
    ? new Date(couple.wedding_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
    : 'TBD'

  const coverageStart = form.groom_start_time || form.bride_start_time || ''
  const coverageEnd = form.photo_video_end_time || ''
  const totalHours = calcHours(coverageStart, coverageEnd)
  const overtime = calcOvertimeHours(form.reception_finish_time, coverageEnd)

  // Build location stops sorted by time
  const stops: { startTime: string; sortMin: number; label: string; venueName?: string | null; personName?: string | null; address: string; directions?: string | null; phone?: string | null; overtime?: number }[] = []

  if (form.groom_start_time || form.groom_address) {
    stops.push({
      startTime: form.groom_start_time || '—',
      sortMin: parseTimeToMinutes(form.groom_start_time || '0:00'),
      label: 'Groom Prep',
      personName: couple.groom_first_name,
      address: buildAddress(form.groom_address, form.groom_city, form.groom_postal_code),
      directions: form.groom_directions || form.groom_intersection,
      phone: form.groom_phone,
    })
  }

  if (form.bride_start_time || form.bride_address) {
    stops.push({
      startTime: form.bride_start_time || '—',
      sortMin: parseTimeToMinutes(form.bride_start_time || '0:00'),
      label: 'Bride Prep',
      personName: couple.bride_first_name,
      address: buildAddress(form.bride_address, form.bride_city, form.bride_postal_code),
      directions: form.bride_directions || form.bride_intersection,
      phone: form.bride_phone,
    })
  }

  if (form.has_first_look && (form.first_look_time || form.first_look_address)) {
    stops.push({
      startTime: form.first_look_time || '—',
      sortMin: parseTimeToMinutes(form.first_look_time || '0:00'),
      label: 'First Look',
      venueName: form.first_look_location_name,
      address: buildAddress(form.first_look_address, form.first_look_city),
    })
  }

  if (form.park_name || form.park_address) {
    stops.push({
      startTime: form.park_start_time || '—',
      sortMin: parseTimeToMinutes(form.park_start_time || '0:00'),
      label: 'Park / Photos',
      venueName: form.park_name,
      address: buildAddress(form.park_address, form.park_city, form.park_postal_code),
      directions: form.park_directions || form.park_intersection,
    })
  }

  if (form.extra_location_name || form.extra_address) {
    stops.push({
      startTime: form.extra_start_time || '—',
      sortMin: parseTimeToMinutes(form.extra_start_time || '0:00'),
      label: 'Extra Location',
      venueName: form.extra_location_name,
      address: buildAddress(form.extra_address, form.extra_city, form.extra_postal_code),
      directions: form.extra_directions || form.extra_location_notes,
    })
  }

  if (form.ceremony_start_time || form.ceremony_address) {
    stops.push({
      startTime: form.ceremony_photo_arrival_time || form.ceremony_start_time || '—',
      sortMin: parseTimeToMinutes(form.ceremony_photo_arrival_time || form.ceremony_start_time || '0:00'),
      label: 'Ceremony',
      venueName: form.ceremony_location_name || contract?.ceremony_location,
      address: buildAddress(form.ceremony_address, form.ceremony_city, form.ceremony_postal_code),
      directions: form.ceremony_directions || form.ceremony_intersection,
    })
  }

  if (form.reception_start_time || form.reception_address) {
    stops.push({
      startTime: form.reception_start_time || '—',
      sortMin: parseTimeToMinutes(form.reception_start_time || '0:00'),
      label: 'Reception',
      venueName: form.reception_venue_name || contract?.reception_venue,
      address: buildAddress(form.reception_address, form.reception_city, form.reception_postal_code),
      directions: form.reception_directions || form.reception_intersection,
      overtime,
    })
  }

  stops.sort((a, b) => a.sortMin - b.sortMin)

  const inspirationLinks = [form.inspiration_link_1, form.inspiration_link_2, form.inspiration_link_3, form.inspiration_link_4, form.inspiration_link_5].filter(Boolean)

  const vendors = [
    { label: 'Planner', name: form.vendor_wedding_planner, ig: form.vendor_wedding_planner_instagram },
    { label: 'Officiant', name: form.vendor_officiant, ig: form.vendor_officiant_instagram },
    { label: 'DJ/MC', name: form.vendor_dj_mc, ig: form.vendor_dj_mc_instagram },
    { label: 'Makeup', name: form.vendor_makeup, ig: form.vendor_makeup_instagram },
    { label: 'Hair', name: form.vendor_hair, ig: form.vendor_hair_instagram },
    { label: 'Floral', name: form.vendor_floral, ig: form.vendor_floral_instagram },
    { label: 'Event Design', name: form.vendor_event_design, ig: form.vendor_event_design_instagram },
    { label: 'Transportation', name: form.vendor_transportation, ig: form.vendor_transportation_instagram },
  ].filter(v => v.name)

  const drives = (form.has_first_look
    ? [
        { label: 'Groom \u2192 Bride', time: form.drive_time_groom_to_bride },
        { label: 'Bride \u2192 First Look', time: form.drive_time_bride_to_first_look },
        { label: 'First Look \u2192 Park', time: form.drive_time_first_look_to_park },
        { label: 'Park \u2192 Reception', time: form.drive_time_park_to_reception },
      ]
    : [
        { label: 'Groom \u2192 Bride', time: form.drive_time_groom_to_bride },
        { label: 'Bride \u2192 Ceremony', time: form.drive_time_bride_to_ceremony },
        { label: 'Ceremony \u2192 Park', time: form.drive_time_ceremony_to_park },
        { label: 'Park \u2192 Reception', time: form.drive_time_park_to_reception },
        { label: 'Ceremony \u2192 Reception', time: form.drive_time_ceremony_to_reception },
      ]
  ).filter(d => d.time)

  return (
    <div className="min-h-screen bg-slate-100">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 0.4in; size: letter; }
        }
      `}</style>

      {/* Top bar */}
      <div className="no-print sticky top-0 z-50 bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm font-medium truncate">{couple.couple_name}</span>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button onClick={() => window.close()} className="p-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-700 mb-1">SIGS Photography</p>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
            {couple.bride_first_name || 'Bride'} & {couple.groom_first_name || 'Groom'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{weddingDate}</p>
          {(coverageStart || coverageEnd) && (
            <p className="text-sm font-semibold text-slate-700 mt-1">
              Coverage: {formatTime12h(coverageStart) || coverageStart} \u2013 {formatTime12h(coverageEnd) || coverageEnd}{totalHours ? ` (${totalHours})` : ''}
            </p>
          )}
        </div>

        {/* Notes */}
        <SectionHeader>Notes</SectionHeader>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-1">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{form.additional_notes || 'None provided'}</p>
        </div>

        {/* Inspiration */}
        <SectionHeader>Wedding Inspiration</SectionHeader>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-1">
          {inspirationLinks.length > 0 ? (
            <div className="space-y-2">
              {inspirationLinks.map((link: string, i: number) => (
                <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="block text-sm text-teal-700 hover:underline truncate">{link}</a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">None provided</p>
          )}
        </div>

        {/* Contract */}
        <SectionHeader>Contract</SectionHeader>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-1">
          <InfoRow label="Coverage" value={coverageStart && coverageEnd ? `${formatTime12h(coverageStart) || coverageStart} \u2013 ${formatTime12h(coverageEnd) || coverageEnd}` : null} />
          <InfoRow label="Hours" value={totalHours || null} />
          <InfoRow label="Package" value={couple.package_type ? formatPackage(couple.package_type) : null} />
          <InfoRow label="Bridal Party" value={form.bridal_party_count ? String(form.bridal_party_count) : null} />
        </div>

        {/* Day Timeline */}
        <SectionHeader>Day Timeline</SectionHeader>
        {stops.map((stop, i) => (
          <div key={i}>
            <LocationCard
              startTime={stop.startTime}
              label={stop.label}
              venueName={stop.venueName}
              personName={stop.personName}
              address={stop.address}
              directions={stop.directions}
              phone={stop.phone}
            />
            {stop.label === 'Reception' && stop.overtime && stop.overtime > 0.25 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-3 text-sm text-red-700 font-medium">
                Party ends {form.reception_finish_time} \u2014 {stop.overtime.toFixed(1)} hrs AFTER contract coverage
              </div>
            )}
          </div>
        ))}

        {/* Drive Times */}
        {drives.length > 0 && (
          <>
            <SectionHeader>Drive Times</SectionHeader>
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-1">
              {drives.map((d, i) => (
                <InfoRow key={i} label={d.label} value={d.time} />
              ))}
            </div>
          </>
        )}

        {/* Emergency Contacts */}
        {(form.emergency_contact_1_name || form.emergency_contact_2_name) && (
          <>
            <SectionHeader>Emergency Contacts</SectionHeader>
            <div className="space-y-2 mb-1">
              {form.emergency_contact_1_name && (
                <a
                  href={`tel:${(form.emergency_contact_1_phone || '').replace(/[^0-9+]/g, '')}`}
                  className="flex items-center justify-center w-full py-3 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 active:bg-red-800 transition-colors"
                >
                  {form.emergency_contact_1_name}{form.contact1_relationship ? ` (${form.contact1_relationship})` : ''}{form.emergency_contact_1_phone ? ` \u2014 ${form.emergency_contact_1_phone}` : ''}
                </a>
              )}
              {form.emergency_contact_2_name && (
                <a
                  href={`tel:${(form.emergency_contact_2_phone || '').replace(/[^0-9+]/g, '')}`}
                  className="flex items-center justify-center w-full py-3 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 active:bg-red-800 transition-colors"
                >
                  {form.emergency_contact_2_name}{form.contact2_relationship ? ` (${form.contact2_relationship})` : ''}{form.emergency_contact_2_phone ? ` \u2014 ${form.emergency_contact_2_phone}` : ''}
                </a>
              )}
            </div>
          </>
        )}

        {/* Vendors */}
        {vendors.length > 0 && (
          <>
            <SectionHeader>Vendors</SectionHeader>
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-1">
              {vendors.map((v, i) => (
                <div key={i} className="flex justify-between py-1.5 text-sm">
                  <span className="text-slate-500">{v.label}</span>
                  <span className="font-medium text-slate-900 text-right">
                    {v.name}
                    {v.ig && (
                      <> <a href={igUrl(v.ig)} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">@{v.ig.replace(/^@/, '')}</a></>
                    )}
                  </span>
                </div>
              ))}
              {(form.venue_contact_name || form.venue_contact_phone) && (
                <div className="flex justify-between py-1.5 text-sm border-t border-slate-100 mt-1 pt-2">
                  <span className="text-slate-500">Venue Contact</span>
                  <span className="font-medium text-slate-900">
                    {form.venue_contact_name}
                    {form.venue_contact_phone && (
                      <> \u2014 <a href={`tel:${form.venue_contact_phone.replace(/[^0-9+]/g, '')}`} className="text-teal-600">{form.venue_contact_phone}</a></>
                    )}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Social */}
        {(form.couple_instagram || form.wedding_hashtag) && (
          <>
            <SectionHeader>Social</SectionHeader>
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-1">
              {form.couple_instagram && <InfoRow label="Couple IG" value={`@${form.couple_instagram}`} />}
              {form.wedding_hashtag && <InfoRow label="Hashtag" value={`#${form.wedding_hashtag}`} />}
            </div>
          </>
        )}

        {/* Family */}
        {(form.parent_info || form.honeymoon_details) && (
          <>
            <SectionHeader>Family</SectionHeader>
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-1">
              {form.parent_info && <div className="text-sm"><span className="text-slate-500">Parents:</span> <span className="text-slate-700">{form.parent_info}</span></div>}
              {form.honeymoon_details && <div className="text-sm mt-1"><span className="text-slate-500">Honeymoon:</span> <span className="text-slate-700">{form.honeymoon_details}</span></div>}
            </div>
          </>
        )}

        {/* Final Notes */}
        {form.final_notes && (
          <>
            <SectionHeader>Final Notes</SectionHeader>
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-1">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{form.final_notes}</p>
            </div>
          </>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-8 mb-4">SIGS Photography — Wedding Day Form</p>
      </div>
    </div>
  )
}
