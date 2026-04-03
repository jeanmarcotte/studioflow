import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { Camera, Clock, MapPin, Phone, User, Heart, Music, Flower2, Car, Instagram, Link, MessageSquare, Users, Plane, FileText, Download, ExternalLink, AlertTriangle } from 'lucide-react'
import { formatTime, parseTimeToMinutes, parseEndTimeToMinutes, buildScheduleRows, calculateHoursValidation } from '@/lib/time-utils'
import { formatWeddingDate } from '@/lib/formatters'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface PageProps {
  params: { coupleId: string }
}

// ─── Helper: Google Maps URL ────────────────────────────────────────────────

function mapsUrl(parts: (string | null | undefined)[]): string | null {
  const query = parts.filter(Boolean).join(', ').trim()
  if (!query) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

// ─── Helper Components ──────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
  return (
    <div className="py-2">
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{display}</dd>
    </div>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6">{children}</div>
}

function MapsLink({ href }: { href: string | null }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
    >
      <MapPin className="w-3.5 h-3.5" />
      Open in Google Maps
      <ExternalLink className="w-3 h-3" />
    </a>
  )
}

function LocationBlock({ name, address, city, postalCode, intersection, startTime, finishTime, directions, extras, mapsQuery }: {
  name?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  intersection?: string | null
  startTime?: string | null
  finishTime?: string | null
  directions?: string | null
  extras?: React.ReactNode
  mapsQuery?: (string | null | undefined)[]
}) {
  const hasContent = name || address || city || startTime || finishTime || directions
  if (!hasContent) return null
  const mapHref = mapsQuery ? mapsUrl(mapsQuery) : mapsUrl([address, city])
  const cityDisplay = [city, postalCode].filter(Boolean).join(' ')
  return (
    <div className="space-y-1">
      {name && <p className="font-medium text-gray-900">{name}</p>}
      <FieldGrid>
        <Field label="Address" value={address} />
        <Field label="City" value={cityDisplay || null} />
        <Field label="Nearest Intersection" value={intersection} />
        <Field label="Start Time" value={startTime} />
        <Field label="Finish Time" value={finishTime} />
      </FieldGrid>
      {directions && <Field label="Directions / Notes" value={directions} />}
      {extras}
      <MapsLink href={mapHref} />
    </div>
  )
}

function VendorRow({ name, instagram, label }: { name?: string | null; instagram?: string | null; label: string }) {
  if (!name || name === 'NA' || name === 'N/A') return null
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
        <dd className="mt-0.5 text-sm text-gray-900">{name}</dd>
      </div>
      {instagram && (
        <span className="text-xs text-pink-600 flex items-center gap-1 mt-1">
          <Instagram className="w-3 h-3" /> {instagram}
        </span>
      )}
    </div>
  )
}

// ─── Call Sheet Row ─────────────────────────────────────────────────────────

function CallSheetRow({ time, event, location, mapHref, odd }: {
  time: string
  event: string
  location?: string | null
  mapHref?: string | null
  odd: boolean
}) {
  return (
    <div className={`grid grid-cols-[1fr] sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,2.5fr)] gap-x-4 gap-y-0.5 px-4 py-2.5 ${odd ? 'bg-gray-50/60' : ''}`}>
      <div className="text-sm text-gray-700 font-mono tabular-nums">{time}</div>
      <div className="text-sm font-medium text-gray-900">{event}</div>
      <div className="text-sm">
        {location && mapHref ? (
          <a href={mapHref} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
            {location}
          </a>
        ) : location ? (
          <span className="text-gray-500">{location}</span>
        ) : null}
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function WeddingDayFormViewPage({ params }: PageProps) {
  const { coupleId } = params
  const supabase = getServiceClient()

  const [{ data: form, error: formError }, { data: couple, error: coupleError }, { data: contract }] = await Promise.all([
    supabase.from('wedding_day_forms').select('*').eq('couple_id', coupleId).single(),
    supabase.from('couples').select('couple_name, wedding_date, package_type, contracts(reception_venue)').eq('id', coupleId).single(),
    supabase.from('contracts').select('start_time, end_time').eq('couple_id', coupleId).single(),
  ])

  // ─── No Form Found ─────────────────────────────────────────────────────────
  if (!form || formError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">No Wedding Day Form</h1>
          <p className="text-sm text-gray-500">
            {couple ? `${couple.couple_name} has` : 'This couple has'} not submitted a wedding day form yet.
          </p>
        </div>
      </div>
    )
  }

  const coupleName = couple?.couple_name ?? 'Unknown Couple'
  const weddingDate = couple?.wedding_date
    ? formatWeddingDate(couple.wedding_date)
    : null
  const packageType = couple?.package_type ?? null

  // Derive city from reception, ceremony, or bride prep
  const weddingCity = (form.reception_city || form.ceremony_city || form.bride_city || '').trim()

  // ─── Build call-sheet rows and hours validation using shared utils ────────
  const scheduleRows = buildScheduleRows(form, packageType)
  const rows = scheduleRows.map(r => ({
    ...r,
    location: r.location || null,
    mapHref: null as string | null, // will be set per-row below
  }))
  // Add Maps links for location rows
  const mapsQueries: Record<string, (string | null | undefined)[]> = {
    'Groom Prep': [form.groom_address, form.groom_city],
    'Bride Prep': [form.bride_address, form.bride_city],
    'First Look': [form.first_look_address, form.first_look_city, form.first_look_location_name],
    'Ceremony': [form.ceremony_address, form.ceremony_city, form.ceremony_location_name],
    'Photos': [form.park_address, form.park_city, form.park_name],
    'Reception': [form.reception_address, form.reception_city, form.reception_venue_name],
  }
  for (const row of rows) {
    if (mapsQueries[row.event]) {
      row.mapHref = mapsUrl(mapsQueries[row.event])
    }
  }

  const { contracted, contractStartFmt, contractEndFmt, actualHours, earliestFmt, latestFmt, exceedsBy, startsBeforeBy, endsAfterBy } = calculateHoursValidation(form, contract)

  // ─── Package badge ────────────────────────────────────────────────────────
  const isPhotoOnly = packageType === 'photo_only'
  const packageLabel = isPhotoOnly ? 'PHOTO ONLY' : 'PHOTO & VIDEO'
  const packageEmoji = isPhotoOnly ? '\u{1F4F7}' : '\u{1F4F7}\u{1F3A5}'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <Camera className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{coupleName}</h1>
                {weddingDate && <p className="text-sm text-gray-500 mt-0.5">{weddingDate}</p>}
                {weddingCity && (
                  <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {weddingCity}
                  </p>
                )}
              </div>
            </div>
            <a
              href={`/api/wedding-form-pdf/${coupleId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </a>
          </div>
          {form.updated_at && (
            <p className="text-xs text-gray-400 mt-4">
              Form submitted {format(new Date(form.updated_at), 'MMM d, yyyy \'at\' h:mm a')}
            </p>
          )}
        </div>
      </div>

      {/* ─── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Section A: CONTRACT ────────────────────────────────────────── */}
        {(contracted || packageType) && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden border-l-4" style={{ borderLeftColor: '#1e3a5f' }}>
            <div className="px-5 py-3 flex items-center gap-3" style={{ backgroundColor: '#1e3a5f' }}>
              <span className="text-white text-lg">📋</span>
              <h2 className="text-base font-bold text-white tracking-wide">CONTRACT</h2>
            </div>
            <div className="px-5 py-4 space-y-2">
              {contracted && (
                <p className="text-sm text-gray-900">
                  <span className="font-semibold">Coverage:</span>{' '}
                  {contractStartFmt && contractEndFmt
                    ? `${contractStartFmt} → ${contractEndFmt} (${contracted} hours)`
                    : `${contracted} hours`}
                </p>
              )}
              {packageType && (
                <p className="text-sm text-gray-900">
                  <span className="font-semibold">Package:</span>{' '}
                  {packageEmoji} {packageLabel}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Section B: BRIDE'S SCHEDULE ──────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1e3a5f' }}>
              <Clock className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">BRIDE&apos;S SCHEDULE</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="hidden sm:grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,2.5fr)] gap-x-4 px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <div>Time</div>
              <div>Event</div>
              <div>Location</div>
            </div>
            {rows.map((row, i) => (
              <CallSheetRow key={i} time={row.time} event={row.event} location={row.location} mapHref={row.mapHref} odd={i % 2 === 0} />
            ))}
          </div>
        </div>

        {/* ── Section C: SCHEDULE ALERTS ───────────────────────────────────── */}
        {(startsBeforeBy !== null || endsAfterBy !== null || (contracted && actualHours !== null)) && (
          <div className={`rounded-xl border overflow-hidden ${
            startsBeforeBy !== null || endsAfterBy !== null
              ? 'bg-red-50 border-red-200'
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="px-5 py-3 space-y-2">
              {startsBeforeBy !== null && (
                <p className="text-sm font-semibold text-red-700">
                  ⚠️ Day starts at {earliestFmt} — {startsBeforeBy >= 60
                    ? `${Math.round(startsBeforeBy / 60 * 10) / 10} hour${Math.round(startsBeforeBy / 60 * 10) / 10 !== 1 ? 's' : ''}`
                    : `${startsBeforeBy} minutes`} BEFORE contract start ({contractStartFmt})
                </p>
              )}
              {endsAfterBy !== null && (
                <p className="text-sm font-semibold text-red-700">
                  ⚠️ Day ends at {latestFmt} — {endsAfterBy >= 60
                    ? `${Math.round(endsAfterBy / 60 * 10) / 10} hour${Math.round(endsAfterBy / 60 * 10) / 10 !== 1 ? 's' : ''}`
                    : `${endsAfterBy} minutes`} AFTER contract end ({contractEndFmt})
                </p>
              )}
              {startsBeforeBy === null && endsAfterBy === null && contracted && actualHours !== null && (
                <p className="text-sm font-semibold text-green-700">
                  ✅ Schedule fits within contracted hours
                </p>
              )}
            </div>
          </div>
        )}

        {/* Emergency Contacts */}
        <Section title="Emergency Contacts" icon={Phone}>
          <FieldGrid>
            <Field label="Contact 1" value={form.emergency_contact_1_name} />
            <Field label="Phone" value={form.emergency_contact_1_phone} />
          </FieldGrid>
          <FieldGrid>
            <Field label="Contact 2" value={form.emergency_contact_2_name} />
            <Field label="Phone" value={form.emergency_contact_2_phone} />
          </FieldGrid>
        </Section>

        {/* Groom Prep */}
        <Section title="Groom Prep" icon={User}>
          <LocationBlock
            address={form.groom_address}
            city={form.groom_city}
            postalCode={form.groom_postal_code}
            intersection={form.groom_intersection}
            startTime={formatTime(form.groom_start_time, 'prep')}
            finishTime={formatTime(form.groom_finish_time, 'prep')}
            directions={form.groom_directions}
            extras={<Field label="Contact Phone" value={form.groom_phone} />}
            mapsQuery={[form.groom_address, form.groom_city]}
          />
        </Section>

        {/* Bride Prep */}
        <Section title="Bride Prep" icon={User}>
          <LocationBlock
            address={form.bride_address}
            city={form.bride_city}
            postalCode={form.bride_postal_code}
            intersection={form.bride_intersection}
            startTime={formatTime(form.bride_start_time, 'prep')}
            finishTime={formatTime(form.bride_finish_time, 'prep')}
            directions={form.bride_directions}
            extras={<Field label="Contact Phone" value={form.bride_phone} />}
            mapsQuery={[form.bride_address, form.bride_city]}
          />
        </Section>

        {/* First Look */}
        {form.has_first_look && (
          <Section title="First Look" icon={Heart}>
            <LocationBlock
              name={form.first_look_location_name}
              address={form.first_look_address}
              city={form.first_look_city}
              startTime={formatTime(form.first_look_time, 'ceremony')}
              mapsQuery={[form.first_look_address, form.first_look_city, form.first_look_location_name]}
            />
          </Section>
        )}

        {/* Ceremony */}
        <Section title="Ceremony" icon={Heart}>
          <LocationBlock
            name={form.ceremony_location_name}
            address={form.ceremony_address}
            city={form.ceremony_city}
            postalCode={form.ceremony_postal_code}
            intersection={form.ceremony_intersection}
            startTime={formatTime(form.ceremony_start_time, 'ceremony')}
            finishTime={formatTime(form.ceremony_finish_time, 'ceremony')}
            directions={form.ceremony_directions}
            extras={
              <>
                <Field label="Photo Arrival Time" value={formatTime(form.ceremony_photo_arrival_time, 'ceremony')} />
                <Field label="First Look at Ceremony" value={form.ceremony_first_look} />
              </>
            }
            mapsQuery={[form.ceremony_address, form.ceremony_city, form.ceremony_location_name]}
          />
        </Section>

        {/* Park / Photos */}
        <Section title="Park / Photos" icon={MapPin}>
          <LocationBlock
            name={form.park_name}
            address={form.park_address}
            city={form.park_city}
            postalCode={form.park_postal_code}
            intersection={form.park_intersection}
            startTime={formatTime(form.park_start_time, 'photos')}
            finishTime={formatTime(form.park_finish_time, 'photos')}
            directions={form.park_directions}
            extras={<Field label="Park Permit Obtained" value={form.park_permit_obtained} />}
            mapsQuery={[form.park_address, form.park_city, form.park_name]}
          />
        </Section>

        {/* Extra Location */}
        {form.extra_location_name && (
          <Section title="Extra Location" icon={MapPin}>
            <LocationBlock
              name={form.extra_location_name}
              address={form.extra_address}
              city={form.extra_city}
              postalCode={form.extra_postal_code}
              intersection={form.extra_intersection}
              startTime={formatTime(form.extra_start_time, 'photos')}
              finishTime={formatTime(form.extra_finish_time, 'photos')}
              directions={form.extra_directions}
              extras={<Field label="Notes" value={form.extra_location_notes} />}
              mapsQuery={[form.extra_address, form.extra_city, form.extra_location_name]}
            />
          </Section>
        )}

        {/* Reception */}
        <Section title="Reception" icon={Music}>
          <LocationBlock
            name={form.reception_venue_name}
            address={form.reception_address}
            city={form.reception_city}
            postalCode={form.reception_postal_code}
            intersection={form.reception_intersection}
            startTime={formatTime(form.reception_start_time, 'reception')}
            finishTime={formatTime(form.reception_finish_time, 'reception_end')}
            directions={form.reception_directions}
            mapsQuery={[form.reception_address, form.reception_city, form.reception_venue_name]}
          />
        </Section>

        {/* Drive Times */}
        {(form.drive_time_groom_to_bride || form.drive_time_bride_to_ceremony || form.drive_time_ceremony_to_park || form.drive_time_park_to_reception || form.drive_time_bride_to_first_look || form.drive_time_first_look_to_park || form.drive_time_park_to_ceremony || form.drive_time_ceremony_to_reception) && (
          <Section title="Drive Times" icon={Car}>
            <FieldGrid>
              {form.has_first_look ? (
                <>
                  <Field label="Groom to Bride" value={form.drive_time_groom_to_bride ? `${form.drive_time_groom_to_bride} min` : null} />
                  <Field label="Bride to First Look" value={form.drive_time_bride_to_first_look ? `${form.drive_time_bride_to_first_look} min` : null} />
                  <Field label="First Look to Park" value={form.drive_time_first_look_to_park ? `${form.drive_time_first_look_to_park} min` : null} />
                  <Field label="Park to Ceremony" value={form.drive_time_park_to_ceremony ? `${form.drive_time_park_to_ceremony} min` : null} />
                  <Field label="Ceremony to Reception" value={form.drive_time_ceremony_to_reception ? `${form.drive_time_ceremony_to_reception} min` : null} />
                </>
              ) : (
                <>
                  <Field label="Groom to Bride" value={form.drive_time_groom_to_bride ? `${form.drive_time_groom_to_bride} min` : null} />
                  <Field label="Bride to Ceremony" value={form.drive_time_bride_to_ceremony ? `${form.drive_time_bride_to_ceremony} min` : null} />
                  <Field label="Ceremony to Park" value={form.drive_time_ceremony_to_park ? `${form.drive_time_ceremony_to_park} min` : null} />
                  <Field label="Park to Reception" value={form.drive_time_park_to_reception ? `${form.drive_time_park_to_reception} min` : null} />
                </>
              )}
            </FieldGrid>
          </Section>
        )}

        {/* Vendors */}
        <Section title="Vendors" icon={Flower2}>
          <VendorRow label="Wedding Planner" name={form.vendor_wedding_planner} instagram={form.vendor_wedding_planner_instagram} />
          <VendorRow label="Officiant" name={form.vendor_officiant} instagram={form.vendor_officiant_instagram} />
          <VendorRow label="Makeup" name={form.vendor_makeup} instagram={form.vendor_makeup_instagram} />
          <VendorRow label="Hair" name={form.vendor_hair} instagram={form.vendor_hair_instagram} />
          <VendorRow label="Floral" name={form.vendor_floral} instagram={form.vendor_floral_instagram} />
          <VendorRow label="Event Design" name={form.vendor_event_design} instagram={form.vendor_event_design_instagram} />
          <VendorRow label="DJ / MC" name={form.vendor_dj_mc} instagram={form.vendor_dj_mc_instagram} />
          <VendorRow label="Transportation" name={form.vendor_transportation} instagram={form.vendor_transportation_instagram} />
        </Section>

        {/* Venue Contact */}
        {(form.venue_contact_name || form.venue_contact_phone || form.venue_contact_email) && (
          <Section title="Venue Contact" icon={Phone}>
            <FieldGrid>
              <Field label="Name" value={form.venue_contact_name} />
              <Field label="Phone" value={form.venue_contact_phone} />
              <Field label="Email" value={form.venue_contact_email} />
            </FieldGrid>
          </Section>
        )}

        {/* Couple Social */}
        {(form.couple_instagram || form.wedding_hashtag) && (
          <Section title="Couple Social" icon={Instagram}>
            <FieldGrid>
              <Field label="Instagram" value={form.couple_instagram} />
              <Field label="Wedding Hashtag" value={form.wedding_hashtag} />
            </FieldGrid>
          </Section>
        )}

        {/* Inspiration Links */}
        {(form.inspiration_link_1 || form.inspiration_link_2 || form.inspiration_link_3 || form.inspiration_link_4 || form.inspiration_link_5) && (
          <Section title="Inspiration" icon={Link}>
            <div className="space-y-2">
              {[form.inspiration_link_1, form.inspiration_link_2, form.inspiration_link_3, form.inspiration_link_4, form.inspiration_link_5]
                .filter(Boolean)
                .map((link: string, i: number) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-blue-600 hover:text-blue-800 hover:underline truncate"
                  >
                    {link}
                  </a>
                ))}
            </div>
          </Section>
        )}

        {/* General Info */}
        <Section title="General Info" icon={Users}>
          <FieldGrid>
            <Field label="Bridal Party Count" value={form.bridal_party_count} />
          </FieldGrid>
          <Field label="Parent Info" value={form.parent_info} />
          <Field label="Honeymoon Details" value={form.honeymoon_details} />
        </Section>

        {/* Additional Notes */}
        {(form.additional_notes || form.final_notes) && (
          <Section title="Notes" icon={MessageSquare}>
            <Field label="Additional Notes" value={form.additional_notes} />
            <Field label="Final Notes" value={form.final_notes} />
          </Section>
        )}

      </div>
    </div>
  )
}
