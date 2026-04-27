'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Plus, X, Send, Check } from 'lucide-react'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })

// ─── Field helpers ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, name, value, onChange, type = 'text', placeholder }: {
  label: string; name: string; value: string; onChange: (name: string, val: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
      />
    </div>
  )
}

function TextArea({ label, name, value, onChange, rows = 3 }: {
  label: string; name: string; value: string; onChange: (name: string, val: string) => void; rows?: number
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-y"
      />
    </div>
  )
}

function LocationFields({ prefix, form, onChange, showPostal = true }: {
  prefix: string; form: any; onChange: (name: string, val: string) => void; showPostal?: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Time" name={`${prefix}_start_time`} value={form[`${prefix}_start_time`]} onChange={onChange} type="time" />
        <Field label="End Time" name={`${prefix}_finish_time`} value={form[`${prefix}_finish_time`]} onChange={onChange} type="time" />
      </div>
      <Field label="Address" name={`${prefix}_address`} value={form[`${prefix}_address`]} onChange={onChange} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="City" name={`${prefix}_city`} value={form[`${prefix}_city`]} onChange={onChange} />
        {showPostal && <Field label="Postal Code" name={`${prefix}_postal_code`} value={form[`${prefix}_postal_code`]} onChange={onChange} />}
      </div>
      <Field label="Phone" name={`${prefix}_phone`} value={form[`${prefix}_phone`]} onChange={onChange} type="tel" />
    </div>
  )
}

function VendorRow({ label, nameKey, igKey, form, onChange }: {
  label: string; nameKey: string; igKey?: string; form: any; onChange: (name: string, val: string) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Field label={label} name={nameKey} value={form[nameKey]} onChange={onChange} placeholder="Name" />
      {igKey && <Field label="Instagram" name={igKey} value={form[igKey]} onChange={onChange} placeholder="@handle" />}
    </div>
  )
}

// ─── Form fields to persist ──────────────────────────────────────────────────

const FORM_FIELDS = [
  'groom_start_time', 'groom_finish_time', 'groom_address', 'groom_city', 'groom_postal_code', 'groom_phone', 'groom_directions',
  'bride_start_time', 'bride_finish_time', 'bride_address', 'bride_city', 'bride_postal_code', 'bride_phone', 'bride_directions',
  'has_first_look', 'first_look_location_name', 'first_look_time', 'first_look_address', 'first_look_city',
  'ceremony_location_name', 'ceremony_start_time', 'ceremony_finish_time', 'ceremony_address', 'ceremony_city', 'ceremony_postal_code', 'ceremony_photo_arrival_time',
  'reception_venue_name', 'reception_start_time', 'reception_finish_time', 'reception_address', 'reception_city', 'reception_postal_code',
  'park_name', 'park_start_time', 'park_finish_time', 'park_address', 'park_city', 'park_postal_code',
  'extra_location_name', 'extra_start_time', 'extra_finish_time', 'extra_address', 'extra_city', 'extra_postal_code', 'extra_location_notes',
  'photo_video_end_time', 'bridal_party_count',
  'vendor_wedding_planner', 'vendor_wedding_planner_instagram', 'vendor_officiant', 'vendor_officiant_instagram',
  'vendor_dj_mc', 'vendor_dj_mc_instagram', 'vendor_makeup', 'vendor_makeup_instagram',
  'vendor_hair', 'vendor_hair_instagram', 'vendor_floral', 'vendor_floral_instagram',
  'vendor_event_design', 'vendor_event_design_instagram', 'vendor_transportation', 'vendor_transportation_instagram',
  'venue_contact_name', 'venue_contact_phone', 'couple_instagram', 'wedding_hashtag',
  'inspiration_link_1', 'inspiration_link_2', 'inspiration_link_3', 'inspiration_link_4', 'inspiration_link_5',
  'additional_notes', 'final_notes',
  'emergency_contact_1_name', 'emergency_contact_1_phone', 'contact1_relationship',
  'emergency_contact_2_name', 'emergency_contact_2_phone', 'contact2_relationship',
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WeddingDayPlannerPage() {
  const params = useParams()
  const slug = params.slug as string

  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [form, setForm] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null)
  const [showPark, setShowPark] = useState(false)
  const [showExtra, setShowExtra] = useState(false)
  const dirty = useRef(false)

  // Load data
  useEffect(() => {
    async function load() {
      const { data: couples } = await supabase.from('couples').select('id').eq('portal_slug', slug).limit(1)
      const cId = couples?.[0]?.id
      if (!cId) { setLoading(false); return }
      setCoupleId(cId)

      const { data: forms } = await supabase.from('wedding_day_forms').select('*').eq('couple_id', cId).limit(1)
      if (forms?.[0]) {
        setForm(forms[0])
        if (forms[0].park_name || forms[0].park_address) setShowPark(true)
        if (forms[0].extra_location_name || forms[0].extra_address) setShowExtra(true)
        setLastSubmitted(forms[0].updated_at)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  const handleChange = useCallback((name: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [name]: value }))
    dirty.current = true
    setSaved(false)
  }, [])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!coupleId) return
    const interval = setInterval(async () => {
      if (!dirty.current) return
      dirty.current = false
      setSaving(true)
      const payload: any = { couple_id: coupleId }
      for (const key of FORM_FIELDS) {
        if (form[key] !== undefined) payload[key] = form[key]
      }
      payload.has_first_look = form.has_first_look === true || form.has_first_look === 'true'
      payload.bridal_party_count = form.bridal_party_count ? parseInt(form.bridal_party_count) || null : null

      await supabase.from('wedding_day_forms').upsert(payload, { onConflict: 'couple_id' })
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }, 30000)
    return () => clearInterval(interval)
  }, [coupleId, form])

  const handleSubmit = async () => {
    if (!coupleId) return
    setSubmitting(true)

    // Save first
    const payload: any = { couple_id: coupleId }
    for (const key of FORM_FIELDS) {
      if (form[key] !== undefined) payload[key] = form[key]
    }
    payload.has_first_look = form.has_first_look === true || form.has_first_look === 'true'
    payload.bridal_party_count = form.bridal_party_count ? parseInt(form.bridal_party_count) || null : null
    await supabase.from('wedding_day_forms').upsert(payload, { onConflict: 'couple_id' })

    // Send email
    const res = await fetch('/api/portal/submit-wedding-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coupleId }),
    })
    const data = await res.json()

    if (data.success) {
      toast.success('Form sent to Marianna!')
      setLastSubmitted(data.submittedAt || new Date().toISOString())
      dirty.current = false
    } else {
      toast.error('Failed to send. Please try again.')
    }
    setSubmitting(false)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>
  if (!coupleId) return <div className="text-center py-20 text-gray-500">Portal not found</div>

  const hasFirstLook = form.has_first_look === true || form.has_first_look === 'true'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className={`${playfair.className} text-2xl`}>Wedding Day Planner</h2>
        <p className="text-gray-500 text-sm mt-1">Build your perfect day — changes auto-save every 30 seconds</p>
        {(saving || saved) && (
          <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
            {saving ? 'Saving...' : <><Check className="h-3 w-3 text-teal-500" /> Saved</>}
          </p>
        )}
      </div>

      {/* Two-column on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

        {/* Left column — Schedule */}
        <div className="md:col-span-3 space-y-4">
          <Section title="Notes for Jean & Marianna">
            <TextArea label="Anything we should know?" name="additional_notes" value={form.additional_notes} onChange={handleChange} />
          </Section>

          <Section title="Groom Prep">
            <LocationFields prefix="groom" form={form} onChange={handleChange} />
          </Section>

          <Section title="Bride Prep">
            <LocationFields prefix="bride" form={form} onChange={handleChange} />
          </Section>

          <Section title="First Look?">
            <button
              onClick={() => handleChange('has_first_look', hasFirstLook ? '' : 'true')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${hasFirstLook ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {hasFirstLook ? 'Yes' : 'No'}
            </button>
            {hasFirstLook && (
              <div className="space-y-3 mt-4">
                <Field label="Location Name" name="first_look_location_name" value={form.first_look_location_name} onChange={handleChange} />
                <Field label="Time" name="first_look_time" value={form.first_look_time} onChange={handleChange} type="time" />
                <Field label="Address" name="first_look_address" value={form.first_look_address} onChange={handleChange} />
                <Field label="City" name="first_look_city" value={form.first_look_city} onChange={handleChange} />
              </div>
            )}
          </Section>

          <Section title="Ceremony">
            <div className="space-y-3">
              <Field label="Venue Name" name="ceremony_location_name" value={form.ceremony_location_name} onChange={handleChange} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Photographer Arrives" name="ceremony_photo_arrival_time" value={form.ceremony_photo_arrival_time} onChange={handleChange} type="time" />
                <Field label="Ceremony Starts" name="ceremony_start_time" value={form.ceremony_start_time} onChange={handleChange} type="time" />
              </div>
              <Field label="Address" name="ceremony_address" value={form.ceremony_address} onChange={handleChange} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" name="ceremony_city" value={form.ceremony_city} onChange={handleChange} />
                <Field label="Postal Code" name="ceremony_postal_code" value={form.ceremony_postal_code} onChange={handleChange} />
              </div>
            </div>
          </Section>

          <Section title="Reception">
            <div className="space-y-3">
              <Field label="Venue Name" name="reception_venue_name" value={form.reception_venue_name} onChange={handleChange} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Time" name="reception_start_time" value={form.reception_start_time} onChange={handleChange} type="time" />
                <Field label="Party Ends" name="reception_finish_time" value={form.reception_finish_time} onChange={handleChange} type="time" />
              </div>
              <Field label="Address" name="reception_address" value={form.reception_address} onChange={handleChange} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" name="reception_city" value={form.reception_city} onChange={handleChange} />
                <Field label="Postal Code" name="reception_postal_code" value={form.reception_postal_code} onChange={handleChange} />
              </div>
            </div>
          </Section>

          {/* Optional sections */}
          {!showPark && (
            <button onClick={() => setShowPark(true)} className="flex items-center gap-2 text-sm text-teal-600 font-medium hover:text-teal-700">
              <Plus className="h-4 w-4" /> Add Park / Photo Location
            </button>
          )}
          {showPark && (
            <Section title="Park / Photo Location">
              <button onClick={() => { setShowPark(false); ['park_name','park_start_time','park_finish_time','park_address','park_city','park_postal_code'].forEach(k => handleChange(k, '')) }} className="float-right text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
              <div className="space-y-3">
                <Field label="Location Name" name="park_name" value={form.park_name} onChange={handleChange} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start Time" name="park_start_time" value={form.park_start_time} onChange={handleChange} type="time" />
                  <Field label="End Time" name="park_finish_time" value={form.park_finish_time} onChange={handleChange} type="time" />
                </div>
                <Field label="Address" name="park_address" value={form.park_address} onChange={handleChange} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City" name="park_city" value={form.park_city} onChange={handleChange} />
                  <Field label="Postal Code" name="park_postal_code" value={form.park_postal_code} onChange={handleChange} />
                </div>
              </div>
            </Section>
          )}

          {!showExtra && (
            <button onClick={() => setShowExtra(true)} className="flex items-center gap-2 text-sm text-teal-600 font-medium hover:text-teal-700">
              <Plus className="h-4 w-4" /> Add Extra Location
            </button>
          )}
          {showExtra && (
            <Section title="Extra Location">
              <button onClick={() => { setShowExtra(false); ['extra_location_name','extra_start_time','extra_finish_time','extra_address','extra_city','extra_postal_code','extra_location_notes'].forEach(k => handleChange(k, '')) }} className="float-right text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
              <div className="space-y-3">
                <Field label="Location Name" name="extra_location_name" value={form.extra_location_name} onChange={handleChange} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start Time" name="extra_start_time" value={form.extra_start_time} onChange={handleChange} type="time" />
                  <Field label="End Time" name="extra_finish_time" value={form.extra_finish_time} onChange={handleChange} type="time" />
                </div>
                <Field label="Address" name="extra_address" value={form.extra_address} onChange={handleChange} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City" name="extra_city" value={form.extra_city} onChange={handleChange} />
                  <Field label="Postal Code" name="extra_postal_code" value={form.extra_postal_code} onChange={handleChange} />
                </div>
                <TextArea label="Notes" name="extra_location_notes" value={form.extra_location_notes} onChange={handleChange} rows={2} />
              </div>
            </Section>
          )}

          <Section title="SIGS Coverage">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Coverage Ends" name="photo_video_end_time" value={form.photo_video_end_time} onChange={handleChange} type="time" />
              <Field label="Bridal Party Size" name="bridal_party_count" value={form.bridal_party_count} onChange={handleChange} type="number" />
            </div>
          </Section>
        </div>

        {/* Right column — Vendors + Inspiration + Final Notes */}
        <div className="md:col-span-2 space-y-4">
          <Section title="Wedding Inspiration">
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => (
                <Field key={i} label={`Link ${i}`} name={`inspiration_link_${i}`} value={form[`inspiration_link_${i}`]} onChange={handleChange} type="url" placeholder="https://..." />
              ))}
            </div>
          </Section>

          <Section title="Emergency Contacts">
            <div className="space-y-3">
              <Field label="Contact 1 Name" name="emergency_contact_1_name" value={form.emergency_contact_1_name} onChange={handleChange} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Phone" name="emergency_contact_1_phone" value={form.emergency_contact_1_phone} onChange={handleChange} type="tel" />
                <Field label="Relationship" name="contact1_relationship" value={form.contact1_relationship} onChange={handleChange} />
              </div>
              <Field label="Contact 2 Name" name="emergency_contact_2_name" value={form.emergency_contact_2_name} onChange={handleChange} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Phone" name="emergency_contact_2_phone" value={form.emergency_contact_2_phone} onChange={handleChange} type="tel" />
                <Field label="Relationship" name="contact2_relationship" value={form.contact2_relationship} onChange={handleChange} />
              </div>
            </div>
          </Section>

          <Section title="Vendors">
            <div className="space-y-3">
              <VendorRow label="Planner" nameKey="vendor_wedding_planner" igKey="vendor_wedding_planner_instagram" form={form} onChange={handleChange} />
              <VendorRow label="Officiant" nameKey="vendor_officiant" igKey="vendor_officiant_instagram" form={form} onChange={handleChange} />
              <VendorRow label="DJ / MC" nameKey="vendor_dj_mc" igKey="vendor_dj_mc_instagram" form={form} onChange={handleChange} />
              <VendorRow label="Makeup" nameKey="vendor_makeup" igKey="vendor_makeup_instagram" form={form} onChange={handleChange} />
              <VendorRow label="Hair" nameKey="vendor_hair" igKey="vendor_hair_instagram" form={form} onChange={handleChange} />
              <VendorRow label="Floral" nameKey="vendor_floral" igKey="vendor_floral_instagram" form={form} onChange={handleChange} />
              <VendorRow label="Event Design" nameKey="vendor_event_design" igKey="vendor_event_design_instagram" form={form} onChange={handleChange} />
              <VendorRow label="Transportation" nameKey="vendor_transportation" igKey="vendor_transportation_instagram" form={form} onChange={handleChange} />
              <hr className="border-gray-200" />
              <Field label="Venue Contact Name" name="venue_contact_name" value={form.venue_contact_name} onChange={handleChange} />
              <Field label="Venue Contact Phone" name="venue_contact_phone" value={form.venue_contact_phone} onChange={handleChange} type="tel" />
            </div>
          </Section>

          <Section title="Social">
            <div className="space-y-3">
              <Field label="Couple Instagram" name="couple_instagram" value={form.couple_instagram} onChange={handleChange} placeholder="@handle" />
              <Field label="Wedding Hashtag" name="wedding_hashtag" value={form.wedding_hashtag} onChange={handleChange} placeholder="#YourHashtag" />
            </div>
          </Section>

          <Section title="Final Notes">
            <TextArea label="Anything else?" name="final_notes" value={form.final_notes} onChange={handleChange} />
          </Section>
        </div>
      </div>

      {/* Submit */}
      <div className="text-center py-6">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-teal-600 text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 transition-colors"
        >
          <Send className="h-5 w-5" />
          {submitting ? 'Sending...' : 'Send Final Form to Marianna'}
        </button>
        {lastSubmitted && (
          <p className="text-xs text-gray-400 mt-2">
            Last submitted: {new Date(lastSubmitted).toLocaleString('en-US', { timeZone: 'America/Toronto', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">You can edit and re-submit anytime</p>
      </div>
    </div>
  )
}
