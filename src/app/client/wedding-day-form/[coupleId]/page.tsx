import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { Camera, Clock, MapPin, Phone, User, Heart, Music, Flower2, Car, Instagram, Link, MessageSquare, Users, Plane, FileText } from 'lucide-react'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface PageProps {
  params: { coupleId: string }
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

function LocationBlock({ name, address, city, intersection, startTime, finishTime, directions, extras }: {
  name?: string | null
  address?: string | null
  city?: string | null
  intersection?: string | null
  startTime?: string | null
  finishTime?: string | null
  directions?: string | null
  extras?: React.ReactNode
}) {
  const hasContent = name || address || city || startTime || finishTime || directions
  if (!hasContent) return null
  return (
    <div className="space-y-1">
      {name && <p className="font-medium text-gray-900">{name}</p>}
      <FieldGrid>
        <Field label="Address" value={address} />
        <Field label="City" value={city} />
        <Field label="Nearest Intersection" value={intersection} />
        <Field label="Start Time" value={startTime} />
        <Field label="Finish Time" value={finishTime} />
      </FieldGrid>
      <Field label="Directions / Notes" value={directions} />
      {extras}
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

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function WeddingDayFormViewPage({ params }: PageProps) {
  const { coupleId } = params
  const supabase = getServiceClient()

  const [{ data: form, error: formError }, { data: couple, error: coupleError }] = await Promise.all([
    supabase.from('wedding_day_forms').select('*').eq('couple_id', coupleId).single(),
    supabase.from('couples').select('couple_name, wedding_date, reception_venue').eq('id', coupleId).single(),
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
    ? format(new Date(couple.wedding_date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{coupleName}</h1>
              {weddingDate && <p className="text-sm text-gray-500 mt-0.5">{weddingDate}</p>}
            </div>
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

        {/* Contract Info */}
        <Section title="Contract Info" icon={FileText}>
          <FieldGrid>
            <Field label="Ceremony Begins At" value={form.ceremony_begins_at} />
            <Field label="Hours in Contract" value={form.hours_in_contract} />
            <Field label="Photo/Video End Time" value={form.photo_video_end_time} />
            <Field label="Venue Arrival Time" value={form.venue_arrival_time} />
          </FieldGrid>
        </Section>

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
            intersection={form.groom_intersection}
            startTime={form.groom_start_time}
            finishTime={form.groom_finish_time}
            directions={form.groom_directions}
            extras={<Field label="Contact Phone" value={form.groom_phone} />}
          />
        </Section>

        {/* Bride Prep */}
        <Section title="Bride Prep" icon={User}>
          <LocationBlock
            address={form.bride_address}
            city={form.bride_city}
            intersection={form.bride_intersection}
            startTime={form.bride_start_time}
            finishTime={form.bride_finish_time}
            directions={form.bride_directions}
            extras={<Field label="Contact Phone" value={form.bride_phone} />}
          />
        </Section>

        {/* First Look */}
        {form.has_first_look && (
          <Section title="First Look" icon={Heart}>
            <LocationBlock
              name={form.first_look_location_name}
              address={form.first_look_address}
              city={form.first_look_city}
              startTime={form.first_look_time}
            />
          </Section>
        )}

        {/* Ceremony */}
        <Section title="Ceremony" icon={Heart}>
          <LocationBlock
            name={form.ceremony_location_name}
            address={form.ceremony_address}
            city={form.ceremony_city}
            intersection={form.ceremony_intersection}
            startTime={form.ceremony_start_time}
            finishTime={form.ceremony_finish_time}
            directions={form.ceremony_directions}
            extras={
              <>
                <Field label="Photo Arrival Time" value={form.ceremony_photo_arrival_time} />
                <Field label="First Look at Ceremony" value={form.ceremony_first_look} />
              </>
            }
          />
        </Section>

        {/* Park / Photos */}
        <Section title="Park / Photos" icon={MapPin}>
          <LocationBlock
            name={form.park_name}
            address={form.park_address}
            city={form.park_city}
            intersection={form.park_intersection}
            startTime={form.park_start_time}
            finishTime={form.park_finish_time}
            directions={form.park_directions}
            extras={<Field label="Park Permit Obtained" value={form.park_permit_obtained} />}
          />
        </Section>

        {/* Extra Location */}
        {form.extra_location_name && (
          <Section title="Extra Location" icon={MapPin}>
            <LocationBlock
              name={form.extra_location_name}
              address={form.extra_address}
              city={form.extra_city}
              intersection={form.extra_intersection}
              startTime={form.extra_start_time}
              finishTime={form.extra_finish_time}
              directions={form.extra_directions}
              extras={<Field label="Notes" value={form.extra_location_notes} />}
            />
          </Section>
        )}

        {/* Reception */}
        <Section title="Reception" icon={Music}>
          <LocationBlock
            name={form.reception_venue_name}
            address={form.reception_address}
            city={form.reception_city}
            intersection={form.reception_intersection}
            startTime={form.reception_start_time}
            finishTime={form.reception_finish_time}
            directions={form.reception_directions}
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
