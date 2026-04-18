'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Printer, X, AlertTriangle } from 'lucide-react'
import { formatPackage } from '@/lib/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

const CIRCLE_NUMBERS = ['\u2460', '\u2461', '\u2462', '\u2463', '\u2464', '\u2465', '\u2466', '\u2467', '\u2468', '\u2469']

function buildAddress(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(', ')
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

// ─── Stop Card (iPhone field document) ───────────────────────────────────────

function StopCard({ number, label, timeDisplay, name, address, phone }: {
  number: string
  label: string
  timeDisplay: string
  name?: string | null
  address: string
  phone?: string | null
}) {
  return (
    <Card className="mb-3">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-xl">{number}</span>
          <span className="uppercase tracking-wide">{label}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {/* Time bar */}
        {timeDisplay && (
          <div className="bg-slate-100 rounded-md py-2.5 px-3 text-center">
            <span className="text-lg font-bold tabular-nums">{timeDisplay}</span>
          </div>
        )}

        {/* Name + address */}
        {name && <p className="font-semibold text-slate-900">{name}</p>}
        {address && <p className="text-sm text-muted-foreground">{address}</p>}

        {/* Open in Maps */}
        {address && (
          <a
            href={mapsUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            OPEN IN MAPS
          </a>
        )}

        {/* Call */}
        {phone && (
          <a
            href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
            className="flex items-center justify-center w-full h-11 rounded-lg border border-border font-medium text-sm hover:bg-accent transition-colors"
          >
            {phone}
          </a>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

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

  const brideFull = [couple.bride_first_name, couple.bride_last_name].filter(Boolean).join(' ') || 'Bride'
  const groomFull = [couple.groom_first_name, couple.groom_last_name].filter(Boolean).join(' ') || 'Groom'

  const coverageStart = form.groom_start_time || form.bride_start_time || ''
  const coverageEnd = form.photo_video_end_time || ''

  // Calculate total hours
  function calcHours(start: string, end: string): string {
    if (!start || !end) return ''
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + (m || 0)
    }
    const diff = toMin(end) - toMin(start)
    if (diff <= 0) return ''
    const hrs = Math.floor(diff / 60)
    const mins = diff % 60
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hours`
  }

  const totalHours = calcHours(coverageStart, coverageEnd)

  // ─── Build stops dynamically ─────────────────────────────────────────────
  const stops: { label: string; timeDisplay: string; name?: string | null; address: string; phone?: string | null }[] = []

  // Groom
  if (form.groom_start_time || form.groom_address) {
    stops.push({
      label: 'GROOM',
      timeDisplay: [form.groom_start_time, form.groom_finish_time].filter(Boolean).join(' \u2013 '),
      name: couple.groom_first_name,
      address: buildAddress(form.groom_address, form.groom_city, form.groom_postal_code),
      phone: form.groom_phone,
    })
  }

  // Bride
  if (form.bride_start_time || form.bride_address) {
    stops.push({
      label: 'BRIDE',
      timeDisplay: [form.bride_start_time, form.bride_finish_time].filter(Boolean).join(' \u2013 '),
      name: couple.bride_first_name,
      address: buildAddress(form.bride_address, form.bride_city, form.bride_postal_code),
      phone: form.bride_phone,
    })
  }

  // First Look
  if (form.has_first_look && (form.first_look_time || form.first_look_address)) {
    stops.push({
      label: 'FIRST LOOK',
      timeDisplay: form.first_look_time || '',
      name: form.first_look_location_name,
      address: buildAddress(form.first_look_address, form.first_look_city),
    })
  }

  // Park / Photos
  if (form.park_name || form.park_address) {
    stops.push({
      label: 'PARK / PHOTOS',
      timeDisplay: [form.park_start_time, form.park_finish_time].filter(Boolean).join(' \u2013 '),
      name: form.park_name,
      address: buildAddress(form.park_address, form.park_city, form.park_postal_code),
    })
  }

  // Extra Location
  if (form.extra_location_name || form.extra_address) {
    stops.push({
      label: 'EXTRA LOCATION',
      timeDisplay: [form.extra_start_time, form.extra_finish_time].filter(Boolean).join(' \u2013 '),
      name: form.extra_location_name,
      address: buildAddress(form.extra_address, form.extra_city),
    })
  }

  // Ceremony
  if (form.ceremony_start_time || form.ceremony_address) {
    const ceremonyTime = form.ceremony_photo_arrival_time && form.ceremony_start_time
      ? `Arrive: ${form.ceremony_photo_arrival_time} | Starts: ${form.ceremony_start_time}`
      : form.ceremony_photo_arrival_time
        ? `Arrive: ${form.ceremony_photo_arrival_time}`
        : form.ceremony_start_time || ''
    stops.push({
      label: 'CEREMONY',
      timeDisplay: ceremonyTime,
      name: form.ceremony_location_name || contract?.ceremony_location,
      address: buildAddress(form.ceremony_address, form.ceremony_city, form.ceremony_postal_code),
    })
  }

  // Reception
  if (form.reception_start_time || form.reception_address) {
    stops.push({
      label: 'RECEPTION',
      timeDisplay: [form.reception_start_time, form.reception_finish_time].filter(Boolean).join(' \u2013 '),
      name: form.reception_venue_name || contract?.reception_venue,
      address: buildAddress(form.reception_address, form.reception_city, form.reception_postal_code),
    })
  }

  // Build timeline entries for the Day Timeline card
  const timelineEntries: { label: string; time: string; address?: string }[] = []
  timelineEntries.push({ label: 'Photography', time: [coverageStart, coverageEnd].filter(Boolean).join(' \u2013 ') })
  for (const stop of stops) {
    if (stop.timeDisplay) {
      timelineEntries.push({ label: stop.label.charAt(0) + stop.label.slice(1).toLowerCase(), time: stop.timeDisplay, address: stop.address })
    }
  }

  const inspirationLinks = [form.inspiration_link_1, form.inspiration_link_2, form.inspiration_link_3, form.inspiration_link_4, form.inspiration_link_5].filter(Boolean)

  return (
    <div className="min-h-screen bg-slate-50">
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

      {/* Content */}
      <div className="max-w-[66%] mx-auto py-6">

        {/* Header — Full Names */}
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-slate-900">{brideFull} & {groomFull}</h1>
          <p className="text-muted-foreground text-sm">{weddingDate}</p>
          {(coverageStart || coverageEnd) && (
            <p className="text-sm font-medium mt-1">Coverage: {coverageStart}{coverageEnd ? ` \u2013 ${coverageEnd}` : ''}</p>
          )}
        </div>

        {/* Contract Details Card */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider">CONTRACT DETAILS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {coverageStart && (
              <div className="flex justify-between">
                <span className="text-sm">Coverage Start:</span>
                <span className="text-sm font-medium">{coverageStart}</span>
              </div>
            )}
            {coverageEnd && (
              <div className="flex justify-between">
                <span className="text-sm">Coverage End:</span>
                <span className="text-sm font-medium">{coverageEnd}</span>
              </div>
            )}
            {totalHours && (
              <div className="flex justify-between">
                <span className="text-sm">Total:</span>
                <span className="text-sm font-medium">{totalHours}</span>
              </div>
            )}
            {couple.package_type && (
              <div className="flex justify-between">
                <span className="text-sm">Package:</span>
                <span className="text-sm font-medium">{formatPackage(couple.package_type)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Day Timeline Card */}
        {timelineEntries.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider">DAY TIMELINE</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {timelineEntries.map((entry, i) => (
                <div key={i}>
                  <div className="flex justify-between">
                    <span>{entry.label}</span>
                    <span className="font-medium">{entry.time}</span>
                  </div>
                  {entry.address && (
                    <div className="text-muted-foreground ml-4 text-xs">{entry.address}</div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Stops */}
        {stops.map((stop, index) => (
          <StopCard
            key={stop.label}
            number={CIRCLE_NUMBERS[index] || `${index + 1}`}
            {...stop}
          />
        ))}

        {/* Inspiration Links */}
        {inspirationLinks.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider">INSPIRATION</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {inspirationLinks.map((link: string, i: number) => (
                <a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full h-9 rounded-md border border-input bg-background hover:bg-muted text-sm font-medium transition-colors truncate px-3"
                >
                  {link}
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Emergency Contacts */}
        {(form.emergency_contact_1_name || form.emergency_contact_2_name || form.venue_contact_phone) && (
          <Card className="mt-6 border-red-200">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-red-600 flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4" />
                EMERGENCY
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              {form.emergency_contact_1_name && (
                <a
                  href={`tel:${(form.emergency_contact_1_phone || '').replace(/[^0-9+]/g, '')}`}
                  className="flex items-center justify-center w-full h-11 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors"
                >
                  {form.emergency_contact_1_name}{form.contact1_relationship ? ` (${form.contact1_relationship})` : ''} {form.emergency_contact_1_phone ? `\u2014 ${form.emergency_contact_1_phone}` : ''}
                </a>
              )}
              {form.emergency_contact_2_name && (
                <a
                  href={`tel:${(form.emergency_contact_2_phone || '').replace(/[^0-9+]/g, '')}`}
                  className="flex items-center justify-center w-full h-11 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors"
                >
                  {form.emergency_contact_2_name}{form.contact2_relationship ? ` (${form.contact2_relationship})` : ''} {form.emergency_contact_2_phone ? `\u2014 ${form.emergency_contact_2_phone}` : ''}
                </a>
              )}
              {form.venue_contact_phone && (
                <a
                  href={`tel:${form.venue_contact_phone.replace(/[^0-9+]/g, '')}`}
                  className="flex items-center justify-center w-full h-11 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors"
                >
                  {form.venue_contact_name || 'Venue'} ({form.venue_contact_phone})
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {(form.additional_notes || form.final_notes) && (
          <Card className="mt-4">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">NOTES</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 px-4 pb-4">
              {form.additional_notes && <p className="whitespace-pre-wrap">{form.additional_notes}</p>}
              {form.final_notes && <p className="whitespace-pre-wrap">{form.final_notes}</p>}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 mb-4">
          SIGS Photography — Wedding Day Form
        </p>
      </div>
    </div>
  )
}
