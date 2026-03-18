'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Camera, CheckCircle, ChevronRight, Loader2, Search } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Couple {
  id: string
  couple_name: string
  bride_first_name: string
  groom_first_name: string
  wedding_date: string
  reception_venue: string | null
  email: string
}

interface FormData {
  // Emergency Contacts
  emergency_contact_1_name: string
  emergency_contact_1_phone: string
  emergency_contact_2_name: string
  emergency_contact_2_phone: string
  // Groom Prep
  groom_start_time: string
  groom_finish_time: string
  groom_address: string
  groom_city: string
  groom_intersection: string
  groom_phone: string
  groom_directions: string
  // Bride Prep
  bride_start_time: string
  bride_finish_time: string
  bride_address: string
  bride_city: string
  bride_intersection: string
  bride_phone: string
  bride_directions: string
  // Ceremony
  ceremony_location_name: string
  ceremony_first_look: boolean
  ceremony_photo_arrival_time: string
  ceremony_start_time: string
  ceremony_finish_time: string
  ceremony_address: string
  ceremony_city: string
  ceremony_intersection: string
  ceremony_directions: string
  // Park/Photos
  park_name: string
  park_permit_obtained: boolean
  park_start_time: string
  park_finish_time: string
  park_address: string
  park_city: string
  park_intersection: string
  park_directions: string
  // Extra Location
  extra_location_name: string
  extra_start_time: string
  extra_finish_time: string
  extra_address: string
  extra_city: string
  extra_intersection: string
  extra_directions: string
  extra_location_notes: string
  // First Look Location
  first_look_location_name: string
  first_look_time: string
  first_look_address: string
  first_look_city: string
  // Reception
  reception_venue_name: string
  reception_start_time: string
  reception_finish_time: string
  reception_address: string
  reception_city: string
  reception_intersection: string
  reception_directions: string
  // Drive Times
  drive_time_groom_to_bride: string
  drive_time_bride_to_ceremony: string
  drive_time_ceremony_to_park: string
  drive_time_park_to_reception: string
  drive_time_bride_to_first_look: string
  drive_time_first_look_to_park: string
  drive_time_park_to_ceremony: string
  drive_time_ceremony_to_reception: string
  // Contract Info
  ceremony_begins_at: string
  hours_in_contract: string
  photo_video_end_time: string
  venue_arrival_time: string
  // Vendors
  vendor_wedding_planner: string
  vendor_wedding_planner_ig: string
  vendor_officiant: string
  vendor_officiant_ig: string
  vendor_makeup: string
  vendor_makeup_ig: string
  vendor_hair: string
  vendor_hair_ig: string
  vendor_floral: string
  vendor_floral_ig: string
  vendor_event_design: string
  vendor_event_design_ig: string
  vendor_dj_mc: string
  vendor_dj_mc_ig: string
  vendor_transportation: string
  vendor_transportation_ig: string
  // Venue Contact
  venue_contact_name: string
  venue_contact_phone: string
  venue_contact_email: string
  // Couple Social
  couple_instagram: string
  wedding_hashtag: string
  // Inspiration
  inspiration_link_1: string
  inspiration_link_2: string
  inspiration_link_3: string
  inspiration_link_4: string
  inspiration_link_5: string
  // First Look
  has_first_look: boolean | null
  park_same_as_first_look: boolean
  reception_same_as_first_look: boolean
  // General Info
  bridal_party_count: string
  parent_info: string
  honeymoon_details: string
  additional_notes: string
  final_notes: string
}

const EMPTY_FORM: FormData = {
  emergency_contact_1_name: '', emergency_contact_1_phone: '',
  emergency_contact_2_name: '', emergency_contact_2_phone: '',
  groom_start_time: '', groom_finish_time: '', groom_address: '', groom_city: '',
  groom_intersection: '', groom_phone: '', groom_directions: '',
  bride_start_time: '', bride_finish_time: '', bride_address: '', bride_city: '',
  bride_intersection: '', bride_phone: '', bride_directions: '',
  ceremony_location_name: '', ceremony_first_look: false, ceremony_photo_arrival_time: '',
  ceremony_start_time: '', ceremony_finish_time: '', ceremony_address: '', ceremony_city: '',
  ceremony_intersection: '', ceremony_directions: '',
  park_name: '', park_permit_obtained: false, park_start_time: '', park_finish_time: '',
  park_address: '', park_city: '', park_intersection: '', park_directions: '',
  extra_location_name: '', extra_start_time: '', extra_finish_time: '', extra_address: '',
  extra_city: '', extra_intersection: '', extra_directions: '', extra_location_notes: '',
  first_look_location_name: '', first_look_time: '', first_look_address: '', first_look_city: '',
  reception_venue_name: '', reception_start_time: '', reception_finish_time: '',
  reception_address: '', reception_city: '', reception_intersection: '', reception_directions: '',
  drive_time_groom_to_bride: '', drive_time_bride_to_ceremony: '',
  drive_time_ceremony_to_park: '', drive_time_park_to_reception: '',
  drive_time_bride_to_first_look: '', drive_time_first_look_to_park: '',
  drive_time_park_to_ceremony: '', drive_time_ceremony_to_reception: '',
  ceremony_begins_at: '', hours_in_contract: '', photo_video_end_time: '', venue_arrival_time: '',
  vendor_wedding_planner: '', vendor_wedding_planner_ig: '',
  vendor_officiant: '', vendor_officiant_ig: '',
  vendor_makeup: '', vendor_makeup_ig: '',
  vendor_hair: '', vendor_hair_ig: '',
  vendor_floral: '', vendor_floral_ig: '',
  vendor_event_design: '', vendor_event_design_ig: '',
  vendor_dj_mc: '', vendor_dj_mc_ig: '',
  vendor_transportation: '', vendor_transportation_ig: '',
  venue_contact_name: '', venue_contact_phone: '', venue_contact_email: '',
  couple_instagram: '', wedding_hashtag: '',
  inspiration_link_1: '', inspiration_link_2: '', inspiration_link_3: '',
  inspiration_link_4: '', inspiration_link_5: '',
  has_first_look: null,
  park_same_as_first_look: false, reception_same_as_first_look: false,
  bridal_party_count: '', parent_info: '', honeymoon_details: '', additional_notes: '',
  final_notes: '',
}

function formatWeddingDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return format(date, 'EEEE, MMMM d, yyyy')
}

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

// ─── Reusable UI pieces (defined outside component to prevent remounting) ────

function FormProgressBar({ step }: { step: number }) {
  const steps = ['Find Wedding', 'Confirm', 'Wedding Day Form', 'Done']
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {steps.map((label, i) => {
        const stepNum = i + 1
        const isActive = step === stepNum
        const isCompleted = step > stepNum
        return (
          <div key={label} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                isCompleted ? 'bg-teal-600 text-white' : isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {isCompleted ? <CheckCircle className="w-4 h-4" /> : stepNum}
              </div>
              <span className={`text-xs hidden sm:inline ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />}
          </div>
        )
      })}
    </div>
  )
}

function TextInput({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function PhoneInput({ label, value, onChange }: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <input
        type="tel"
        value={value}
        onChange={e => onChange(formatPhoneNumber(e.target.value))}
        placeholder="(416) 555-1234"
      />
    </div>
  )
}

function TimeRow({ label, startValue, finishValue, onStartChange, onFinishChange }: {
  label: string
  startValue: string
  finishValue: string
  onStartChange: (value: string) => void
  onFinishChange: (value: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          value={startValue}
          onChange={e => onStartChange(e.target.value)}
          placeholder="Start time (e.g. 10:00 AM)"
        />
        <input
          type="text"
          value={finishValue}
          onChange={e => onFinishChange(e.target.value)}
          placeholder="Finish time (e.g. 12:00 PM)"
        />
      </div>
    </div>
  )
}

function LocationFields({ form, updateField, prefix, showFirstLook, showPermit, showPhotoArrival }: {
  form: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  prefix: 'groom' | 'bride' | 'ceremony' | 'park' | 'extra' | 'reception'
  showFirstLook?: boolean
  showPermit?: boolean
  showPhotoArrival?: boolean
}) {
  const addressField = `${prefix}_address` as keyof FormData
  const cityField = `${prefix}_city` as keyof FormData
  const intersectionField = `${prefix}_intersection` as keyof FormData
  const directionsField = `${prefix}_directions` as keyof FormData

  return (
    <div className="space-y-3">
      {showFirstLook && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.ceremony_first_look}
            onChange={e => updateField('ceremony_first_look', e.target.checked)}
            className="w-4 h-4 accent-teal-600 rounded"
          />
          <span className="text-sm text-foreground">First Look (before ceremony)</span>
        </label>
      )}
      {showPermit && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.park_permit_obtained}
            onChange={e => updateField('park_permit_obtained', e.target.checked)}
            className="w-4 h-4 accent-teal-600 rounded"
          />
          <span className="text-sm text-foreground">Park Permit Obtained?</span>
        </label>
      )}
      {showPhotoArrival && (
        <div>
          <TextInput label="Photo/Video Arrival Time" value={form.ceremony_photo_arrival_time as string} onChange={v => updateField('ceremony_photo_arrival_time', v)} placeholder="e.g. 1:30 PM" />
          <p className="text-xs text-muted-foreground mt-1">⚠️ MUST ARRIVE 30 MIN before ceremony</p>
        </div>
      )}
      <TextInput label="Address" value={form[addressField] as string} onChange={v => updateField(addressField, v)} placeholder="Street address" />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="City" value={form[cityField] as string} onChange={v => updateField(cityField, v)} placeholder="City" />
        <TextInput label="Nearest Intersection" value={form[intersectionField] as string} onChange={v => updateField(intersectionField, v)} placeholder="Cross streets" />
      </div>
      <TextInput label="Directions / Notes" value={form[directionsField] as string} onChange={v => updateField(directionsField, v)} placeholder="Parking info, entrance, etc." />
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WeddingDayFormPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUpdate, setIsUpdate] = useState(false)

  // Step 1 — lookup
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [year, setYear] = useState('')
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')

  // Data
  const [couple, setCouple] = useState<Couple | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)

  const weddingDateStr = month && day && year ? `${year}-${month}-${day}` : ''

  // ─── Helpers ───────────────────────────────────────────────────────

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // ─── Step 1: Lookup ────────────────────────────────────────────────

  async function handleLookup() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/client/lookup-couple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wedding_date: weddingDateStr,
          first_name: firstName.trim(),
          email: email.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Something went wrong')
        return
      }
      setCouple(json.couple)
      setStep(2)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Step 2 → 3: Check existing form ──────────────────────────────

  async function handleContinueToForm() {
    if (!couple) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/client/wedding-day-form?couple_id=${couple.id}`)
      const json = await res.json()

      if (json.exists && json.data) {
        // Pre-fill form with existing data
        const d = json.data
        setForm({
          emergency_contact_1_name: d.emergency_contact_1_name || '',
          emergency_contact_1_phone: d.emergency_contact_1_phone || '',
          emergency_contact_2_name: d.emergency_contact_2_name || '',
          emergency_contact_2_phone: d.emergency_contact_2_phone || '',
          groom_start_time: d.groom_start_time || '',
          groom_finish_time: d.groom_finish_time || '',
          groom_address: d.groom_address || '',
          groom_city: d.groom_city || '',
          groom_intersection: d.groom_intersection || '',
          groom_phone: d.groom_phone || '',
          groom_directions: d.groom_directions || '',
          bride_start_time: d.bride_start_time || '',
          bride_finish_time: d.bride_finish_time || '',
          bride_address: d.bride_address || '',
          bride_city: d.bride_city || '',
          bride_intersection: d.bride_intersection || '',
          bride_phone: d.bride_phone || '',
          bride_directions: d.bride_directions || '',
          ceremony_location_name: d.ceremony_location_name || '',
          ceremony_first_look: d.ceremony_first_look ?? false,
          ceremony_photo_arrival_time: d.ceremony_photo_arrival_time || '',
          ceremony_start_time: d.ceremony_start_time || '',
          ceremony_finish_time: d.ceremony_finish_time || '',
          ceremony_address: d.ceremony_address || '',
          ceremony_city: d.ceremony_city || '',
          ceremony_intersection: d.ceremony_intersection || '',
          ceremony_directions: d.ceremony_directions || '',
          park_name: d.park_name || '',
          park_permit_obtained: d.park_permit_obtained ?? false,
          park_start_time: d.park_start_time || '',
          park_finish_time: d.park_finish_time || '',
          park_address: d.park_address || '',
          park_city: d.park_city || '',
          park_intersection: d.park_intersection || '',
          park_directions: d.park_directions || '',
          extra_location_name: d.extra_location_name || '',
          extra_start_time: d.extra_start_time || '',
          extra_finish_time: d.extra_finish_time || '',
          extra_address: d.extra_address || '',
          extra_city: d.extra_city || '',
          extra_intersection: d.extra_intersection || '',
          extra_directions: d.extra_directions || '',
          extra_location_notes: d.extra_location_notes || '',
          first_look_location_name: d.first_look_location_name || '',
          first_look_time: d.first_look_time || '',
          first_look_address: d.first_look_address || '',
          first_look_city: d.first_look_city || '',
          reception_venue_name: d.reception_venue_name || '',
          reception_start_time: d.reception_start_time || '',
          reception_finish_time: d.reception_finish_time || '',
          reception_address: d.reception_address || '',
          reception_city: d.reception_city || '',
          reception_intersection: d.reception_intersection || '',
          reception_directions: d.reception_directions || '',
          drive_time_groom_to_bride: d.drive_time_groom_to_bride?.toString() || '',
          drive_time_bride_to_ceremony: d.drive_time_bride_to_ceremony?.toString() || '',
          drive_time_ceremony_to_park: d.drive_time_ceremony_to_park?.toString() || '',
          drive_time_park_to_reception: d.drive_time_park_to_reception?.toString() || '',
          drive_time_bride_to_first_look: d.drive_time_bride_to_first_look?.toString() || '',
          drive_time_first_look_to_park: d.drive_time_first_look_to_park?.toString() || '',
          drive_time_park_to_ceremony: d.drive_time_park_to_ceremony?.toString() || '',
          drive_time_ceremony_to_reception: d.drive_time_ceremony_to_reception?.toString() || '',
          ceremony_begins_at: d.ceremony_begins_at || '',
          hours_in_contract: d.hours_in_contract?.toString() || '',
          photo_video_end_time: d.photo_video_end_time || '',
          venue_arrival_time: d.venue_arrival_time || '',
          vendor_wedding_planner: d.vendor_wedding_planner || '',
          vendor_wedding_planner_ig: d.vendor_wedding_planner_ig || '',
          vendor_officiant: d.vendor_officiant || '',
          vendor_officiant_ig: d.vendor_officiant_ig || '',
          vendor_makeup: d.vendor_makeup || '',
          vendor_makeup_ig: d.vendor_makeup_ig || '',
          vendor_hair: d.vendor_hair || '',
          vendor_hair_ig: d.vendor_hair_ig || '',
          vendor_floral: d.vendor_floral || '',
          vendor_floral_ig: d.vendor_floral_ig || '',
          vendor_event_design: d.vendor_event_design || '',
          vendor_event_design_ig: d.vendor_event_design_ig || '',
          vendor_dj_mc: d.vendor_dj_mc || '',
          vendor_dj_mc_ig: d.vendor_dj_mc_ig || '',
          vendor_transportation: d.vendor_transportation || '',
          vendor_transportation_ig: d.vendor_transportation_ig || '',
          venue_contact_name: d.venue_contact_name || '',
          venue_contact_phone: d.venue_contact_phone || '',
          venue_contact_email: d.venue_contact_email || '',
          couple_instagram: d.couple_instagram || '',
          wedding_hashtag: d.wedding_hashtag || '',
          inspiration_link_1: d.inspiration_link_1 || '',
          inspiration_link_2: d.inspiration_link_2 || '',
          inspiration_link_3: d.inspiration_link_3 || '',
          inspiration_link_4: d.inspiration_link_4 || '',
          inspiration_link_5: d.inspiration_link_5 || '',
          has_first_look: d.has_first_look ?? null,
          park_same_as_first_look: d.park_same_as_first_look ?? false,
          reception_same_as_first_look: d.reception_same_as_first_look ?? false,
          bridal_party_count: d.bridal_party_count?.toString() || '',
          parent_info: d.parent_info || '',
          honeymoon_details: d.honeymoon_details || '',
          additional_notes: d.additional_notes || '',
          final_notes: d.final_notes || '',
        })
        setIsUpdate(true)
      }

      setStep(3)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Step 3: Submit ────────────────────────────────────────────────

  async function handleSubmit() {
    if (!couple) return
    if (form.has_first_look === null) {
      setError('Please select whether you will have a First Look.')
      return
    }
    if (form.has_first_look && !form.first_look_location_name.trim()) {
      setError('First Look location is required.')
      return
    }
    if (form.has_first_look && !form.first_look_time) {
      setError('First Look time is required.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/client/wedding-day-form/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: couple.id,
          ...form,
          // Convert numeric strings to numbers
          drive_time_groom_to_bride: form.drive_time_groom_to_bride ? parseInt(form.drive_time_groom_to_bride) : null,
          drive_time_bride_to_ceremony: form.drive_time_bride_to_ceremony ? parseInt(form.drive_time_bride_to_ceremony) : null,
          drive_time_ceremony_to_park: form.drive_time_ceremony_to_park ? parseInt(form.drive_time_ceremony_to_park) : null,
          drive_time_park_to_reception: form.drive_time_park_to_reception ? parseInt(form.drive_time_park_to_reception) : null,
          hours_in_contract: form.hours_in_contract ? parseInt(form.hours_in_contract) : null,
          bridal_party_count: form.bridal_party_count ? parseInt(form.bridal_party_count) : null,
          drive_time_bride_to_first_look: form.drive_time_bride_to_first_look ? parseInt(form.drive_time_bride_to_first_look) : null,
          drive_time_first_look_to_park: form.drive_time_first_look_to_park ? parseInt(form.drive_time_first_look_to_park) : null,
          drive_time_park_to_ceremony: form.drive_time_park_to_ceremony ? parseInt(form.drive_time_park_to_ceremony) : null,
          drive_time_ceremony_to_reception: form.drive_time_ceremony_to_reception ? parseInt(form.drive_time_ceremony_to_reception) : null,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Something went wrong')
        return
      }
      setStep(4)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2">
          <Camera className="w-6 h-6 text-teal-600" />
          <span className="font-semibold text-lg">SIGS Photography</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <FormProgressBar step={step} />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* ═══ STEP 1: Couple Lookup ═══════════════════════════════════ */}
        {step === 1 && (
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <div className="text-center mb-6">
              <Search className="w-10 h-10 text-teal-600 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-foreground">Wedding Day Form</h1>
              <p className="text-muted-foreground mt-1">Enter your details to get started</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Wedding Date</label>
                <div className="grid grid-cols-3 gap-2">
                  <select value={month} onChange={e => {
                    const newMonth = e.target.value
                    setMonth(newMonth)
                    if (day && newMonth && year) {
                      const max = new Date(parseInt(year), parseInt(newMonth), 0).getDate()
                      if (parseInt(day) > max) setDay('')
                    }
                  }}>
                    <option value="">Month</option>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                  <select value={day} onChange={e => setDay(e.target.value)}>
                    <option value="">Day</option>
                    {[...Array(31)].map((_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{i + 1}</option>
                    ))}
                  </select>
                  <select value={year} onChange={e => {
                    const newYear = e.target.value
                    setYear(newYear)
                    if (day && month && newYear) {
                      const max = new Date(parseInt(newYear), parseInt(month), 0).getDate()
                      if (parseInt(day) > max) setDay('')
                    }
                  }}>
                    <option value="">Year</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">First Name (Bride or Groom)</label>
                <input type="text" placeholder="e.g. Sarah" value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email Address</label>
                <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <p className="text-sm text-muted-foreground">
                Can&apos;t log in? The email must match your contract.{' '}
                <a href="sms:4168318942" className="text-teal-600 underline">Text Marianna at 416-831-8942</a> if you have trouble.
              </p>

              <button
                onClick={handleLookup}
                disabled={loading || !weddingDateStr || !firstName || !email}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Find My Wedding
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Confirmation ═══════════════════════════════════ */}
        {step === 2 && couple && (
          <div className="bg-card rounded-xl border p-6 shadow-sm text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {couple.couple_name}
            </h1>
            <div className="space-y-1 text-muted-foreground mb-6">
              <p className="text-lg">{formatWeddingDate(couple.wedding_date)}</p>
              {couple.reception_venue && <p>{couple.reception_venue}</p>}
            </div>
            <button
              onClick={handleContinueToForm}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium py-3 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              Continue to Wedding Day Form
            </button>
          </div>
        )}

        {/* ═══ STEP 3: Form ═══════════════════════════════════════════ */}
        {step === 3 && couple && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-card rounded-xl border p-4 shadow-sm">
              <h1 className="text-xl font-bold text-foreground">{couple.couple_name}</h1>
              <p className="text-sm text-muted-foreground">
                {formatWeddingDate(couple.wedding_date)}
                {couple.reception_venue ? ` \u2022 ${couple.reception_venue}` : ''}
              </p>
            </div>

            {/* Update notice */}
            {isUpdate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
                You previously submitted this form. You can update it below.
              </div>
            )}

            {/* ── 1. Emergency Contacts ─────────────────────────────── */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <span>🚨</span> Emergency Contacts
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Contact 1 Name" value={form.emergency_contact_1_name} onChange={v => updateField('emergency_contact_1_name', v)} placeholder="Full name" />
                  <PhoneInput label="Contact 1 Phone" value={form.emergency_contact_1_phone} onChange={v => updateField('emergency_contact_1_phone', v)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Contact 2 Name" value={form.emergency_contact_2_name} onChange={v => updateField('emergency_contact_2_name', v)} placeholder="Full name" />
                  <PhoneInput label="Contact 2 Phone" value={form.emergency_contact_2_phone} onChange={v => updateField('emergency_contact_2_phone', v)} />
                </div>
              </div>
            </div>

            {/* ── 2. General Info ─────────────────────────────────────── */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <span>📝</span> General Info
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Bridal Party Count</label>
                  <input type="number" value={form.bridal_party_count} onChange={e => updateField('bridal_party_count', e.target.value)} placeholder="Total bridesmaids + groomsmen" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Parent Info</label>
                  <textarea
                    value={form.parent_info}
                    onChange={e => updateField('parent_info', e.target.value)}
                    placeholder="Names of parents, step-parents, or family members to note for formal photos..."
                    rows={3}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Honeymoon Details</label>
                  <textarea
                    value={form.honeymoon_details}
                    onChange={e => updateField('honeymoon_details', e.target.value)}
                    placeholder="Where are you going? When do you leave?"
                    rows={2}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Additional Notes</label>
                  <textarea
                    value={form.additional_notes}
                    onChange={e => updateField('additional_notes', e.target.value)}
                    placeholder="Anything else we should know about your wedding day..."
                    rows={3}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* ── 3. Vendors ──────────────────────────────────────────── */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <span>🤝</span> Vendors
              </h2>
              <p className="text-xs text-muted-foreground mb-3">Name and Instagram for each vendor</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Wedding Planner" value={form.vendor_wedding_planner} onChange={v => updateField('vendor_wedding_planner', v)} placeholder="Name" />
                  <TextInput label="Instagram (optional)" value={form.vendor_wedding_planner_ig} onChange={v => updateField('vendor_wedding_planner_ig', v)} placeholder="@username or URL" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Officiant" value={form.vendor_officiant} onChange={v => updateField('vendor_officiant', v)} placeholder="Name" />
                  <TextInput label="Instagram (optional)" value={form.vendor_officiant_ig} onChange={v => updateField('vendor_officiant_ig', v)} placeholder="@username or URL" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Makeup Artist" value={form.vendor_makeup} onChange={v => updateField('vendor_makeup', v)} placeholder="Name" />
                  <TextInput label="Instagram (optional)" value={form.vendor_makeup_ig} onChange={v => updateField('vendor_makeup_ig', v)} placeholder="@username or URL" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Hair Stylist" value={form.vendor_hair} onChange={v => updateField('vendor_hair', v)} placeholder="Name" />
                  <TextInput label="Instagram (optional)" value={form.vendor_hair_ig} onChange={v => updateField('vendor_hair_ig', v)} placeholder="@username or URL" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Floral" value={form.vendor_floral} onChange={v => updateField('vendor_floral', v)} placeholder="Name" />
                  <TextInput label="Instagram (optional)" value={form.vendor_floral_ig} onChange={v => updateField('vendor_floral_ig', v)} placeholder="@username or URL" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Event Design / Decor" value={form.vendor_event_design} onChange={v => updateField('vendor_event_design', v)} placeholder="Name" />
                  <TextInput label="Instagram (optional)" value={form.vendor_event_design_ig} onChange={v => updateField('vendor_event_design_ig', v)} placeholder="@username or URL" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="DJ / MC" value={form.vendor_dj_mc} onChange={v => updateField('vendor_dj_mc', v)} placeholder="Name" />
                  <TextInput label="Instagram (optional)" value={form.vendor_dj_mc_ig} onChange={v => updateField('vendor_dj_mc_ig', v)} placeholder="@username or URL" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Transportation" value={form.vendor_transportation} onChange={v => updateField('vendor_transportation', v)} placeholder="Name" />
                  <TextInput label="Instagram (optional)" value={form.vendor_transportation_ig} onChange={v => updateField('vendor_transportation_ig', v)} placeholder="@username or URL" />
                </div>

                {/* Venue Contact */}
                <div className="border-t pt-3 mt-3">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Venue Contact</h3>
                  <div className="space-y-3">
                    <TextInput label="Venue Contact Name" value={form.venue_contact_name} onChange={v => updateField('venue_contact_name', v)} placeholder="Coordinator name" />
                    <div className="grid grid-cols-2 gap-3">
                      <PhoneInput label="Venue Contact Phone" value={form.venue_contact_phone} onChange={v => updateField('venue_contact_phone', v)} />
                      <TextInput label="Venue Contact Email" value={form.venue_contact_email} onChange={v => updateField('venue_contact_email', v)} placeholder="email@venue.com" />
                    </div>
                  </div>
                </div>

                {/* Couple Social */}
                <div className="border-t pt-3 mt-3">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Your Social Media</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput label="Your Instagram" value={form.couple_instagram} onChange={v => updateField('couple_instagram', v)} placeholder="@username" />
                    <TextInput label="Wedding Hashtag" value={form.wedding_hashtag} onChange={v => updateField('wedding_hashtag', v)} placeholder="#SmithJonesWedding" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Photography Inspiration ──────────────────────────── */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <span>📌</span> Photography Inspiration
              </h2>
              <p className="text-sm text-muted-foreground mb-4">Share Pinterest boards or photos that inspire your wedding vision</p>
              <div className="space-y-3">
                <TextInput label="Pinterest Link 1" value={form.inspiration_link_1} onChange={v => updateField('inspiration_link_1', v)} placeholder="https://pinterest.com/..." />
                <TextInput label="Pinterest Link 2" value={form.inspiration_link_2} onChange={v => updateField('inspiration_link_2', v)} placeholder="https://pinterest.com/..." />
                <TextInput label="Pinterest Link 3" value={form.inspiration_link_3} onChange={v => updateField('inspiration_link_3', v)} placeholder="https://pinterest.com/..." />
                <TextInput label="Pinterest Link 4" value={form.inspiration_link_4} onChange={v => updateField('inspiration_link_4', v)} placeholder="https://pinterest.com/..." />
                <TextInput label="Pinterest Link 5" value={form.inspiration_link_5} onChange={v => updateField('inspiration_link_5', v)} placeholder="https://pinterest.com/..." />
              </div>
            </div>

            {/* ── Your Wedding Day header ───────────────────────────── */}
            <div className="border-t pt-6">
              <h2 className="text-2xl font-bold text-foreground text-center">📅 Your Wedding Day</h2>
            </div>

            {/* ── First Look Toggle ────────────────────────────────── */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-2">Will you have a First Look before the ceremony?</h2>
              <p className="text-sm text-muted-foreground mb-4">A First Look is when the couple sees each other privately before the ceremony for photos</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField('has_first_look', true)}
                  className={`py-3 px-4 rounded-lg font-medium text-sm border transition-colors ${
                    form.has_first_look === true
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-card text-foreground border-border hover:border-teal-400'
                  }`}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => updateField('has_first_look', false)}
                  className={`py-3 px-4 rounded-lg font-medium text-sm border transition-colors ${
                    form.has_first_look === false
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-card text-foreground border-border hover:border-teal-400'
                  }`}
                >
                  NO
                </button>
              </div>
            </div>

            {form.has_first_look !== null && (
              <>
                {/* ── Groom Prep ───────────────────────────────────────── */}
                <div className="bg-card rounded-xl border p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span>🤵</span> Groom Prep <span className="text-sm font-normal text-muted-foreground">(1hr minimum — 1hr 15min preferred)</span>
                  </h2>
                  <div className="space-y-3">
                    <TimeRow label="Time" startValue={form.groom_start_time} finishValue={form.groom_finish_time} onStartChange={v => updateField('groom_start_time', v)} onFinishChange={v => updateField('groom_finish_time', v)} />
                    <PhoneInput label="Phone (day-of contact)" value={form.groom_phone} onChange={v => updateField('groom_phone', v)} />
                    <LocationFields form={form} updateField={updateField} prefix="groom" />
                  </div>
                </div>

                {/* ── Bride Prep ───────────────────────────────────────── */}
                <div className="bg-card rounded-xl border p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span>👰</span> Bride Prep <span className="text-sm font-normal text-muted-foreground">(1hr 15min minimum preferred)</span>
                  </h2>
                  <div className="space-y-3">
                    <TimeRow label="Time" startValue={form.bride_start_time} finishValue={form.bride_finish_time} onStartChange={v => updateField('bride_start_time', v)} onFinishChange={v => updateField('bride_finish_time', v)} />
                    <PhoneInput label="Phone (day-of contact)" value={form.bride_phone} onChange={v => updateField('bride_phone', v)} />
                    <LocationFields form={form} updateField={updateField} prefix="bride" />
                  </div>
                </div>

                {/* ── First Look (YES only) ─────────────────────────────── */}
                {form.has_first_look && (
                  <div className="bg-card rounded-xl border p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <span>💑</span> First Look
                    </h2>
                    <div className="space-y-3">
                      <TextInput label="First Look Location" value={form.first_look_location_name} onChange={v => updateField('first_look_location_name', v)} placeholder="Location name" />
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">First Look Time <span className="text-red-500">*</span></label>
                        <select
                          value={form.first_look_time}
                          onChange={e => updateField('first_look_time', e.target.value)}
                          required
                        >
                          <option value="">Select a time</option>
                          {Array.from({ length: 33 }, (_, i) => {
                            const totalMin = 6 * 60 + i * 30
                            const h = Math.floor(totalMin / 60)
                            const m = totalMin % 60
                            const period = h >= 12 ? 'PM' : 'AM'
                            const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
                            const timeLabel = `${h12}:${m.toString().padStart(2, '0')} ${period}`
                            return <option key={timeLabel} value={timeLabel}>{timeLabel}</option>
                          })}
                        </select>
                      </div>
                      <TextInput label="Address" value={form.first_look_address} onChange={v => updateField('first_look_address', v)} placeholder="Street address" />
                      <TextInput label="City" value={form.first_look_city} onChange={v => updateField('first_look_city', v)} placeholder="City" />
                    </div>
                  </div>
                )}

                {/* ── Ceremony (NO path: before Park) ──────────────────── */}
                {!form.has_first_look && (
                  <div className="bg-card rounded-xl border p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <span>💒</span> Ceremony
                    </h2>
                    <div className="space-y-3">
                      <TextInput label="Venue / Location Name" value={form.ceremony_location_name} onChange={v => updateField('ceremony_location_name', v)} placeholder="Church, hall, etc." />
                      <TimeRow label="Time" startValue={form.ceremony_start_time} finishValue={form.ceremony_finish_time} onStartChange={v => updateField('ceremony_start_time', v)} onFinishChange={v => updateField('ceremony_finish_time', v)} />
                      <LocationFields form={form} updateField={updateField} prefix="ceremony" showPhotoArrival />
                    </div>
                  </div>
                )}

                {/* ── Park / Photos ────────────────────────────────────── */}
                <div className="bg-card rounded-xl border p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span>🌳</span> Park / Photos
                  </h2>
                  <div className="space-y-3">
                    {form.has_first_look && (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.park_same_as_first_look}
                          onChange={e => {
                            const checked = e.target.checked
                            if (checked) {
                              setForm(prev => ({
                                ...prev,
                                park_same_as_first_look: true,
                                park_name: prev.first_look_location_name,
                                park_address: prev.first_look_address,
                                park_city: prev.first_look_city,
                              }))
                            } else {
                              setForm(prev => ({
                                ...prev,
                                park_same_as_first_look: false,
                                park_name: '',
                                park_address: '',
                                park_city: '',
                              }))
                            }
                          }}
                          className="w-4 h-4 accent-teal-600 rounded"
                        />
                        <span className="text-sm text-foreground">Same as First Look location</span>
                      </label>
                    )}
                    <TextInput label="Park Name" value={form.park_name} onChange={v => updateField('park_name', v)} placeholder={form.park_same_as_first_look ? '' : 'Park or photo location name'} />
                    <TimeRow label="Time" startValue={form.park_start_time} finishValue={form.park_finish_time} onStartChange={v => updateField('park_start_time', v)} onFinishChange={v => updateField('park_finish_time', v)} />
                    <LocationFields form={form} updateField={updateField} prefix="park" showPermit />
                  </div>
                </div>

                {/* ── Extra Location (optional) ────────────────────────── */}
                <div className="bg-card rounded-xl border p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span>📍</span> Extra Location <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                  </h2>
                  <div className="space-y-3">
                    <TextInput label="Location Name" value={form.extra_location_name} onChange={v => updateField('extra_location_name', v)} placeholder="Additional stop name" />
                    <TimeRow label="Time" startValue={form.extra_start_time} finishValue={form.extra_finish_time} onStartChange={v => updateField('extra_start_time', v)} onFinishChange={v => updateField('extra_finish_time', v)} />
                    <LocationFields form={form} updateField={updateField} prefix="extra" />
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
                      <textarea
                        value={form.extra_location_notes}
                        onChange={e => updateField('extra_location_notes', e.target.value)}
                        placeholder="Any special instructions for this location?"
                        rows={2}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Ceremony (YES path: after Park/Extra) ────────────── */}
                {form.has_first_look && (
                  <div className="bg-card rounded-xl border p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <span>💒</span> Ceremony
                    </h2>
                    <div className="space-y-3">
                      <TextInput label="Venue / Location Name" value={form.ceremony_location_name} onChange={v => updateField('ceremony_location_name', v)} placeholder="Church, hall, etc." />
                      <TimeRow label="Time" startValue={form.ceremony_start_time} finishValue={form.ceremony_finish_time} onStartChange={v => updateField('ceremony_start_time', v)} onFinishChange={v => updateField('ceremony_finish_time', v)} />
                      <LocationFields form={form} updateField={updateField} prefix="ceremony" showPhotoArrival />
                    </div>
                  </div>
                )}

                {/* ── Reception ────────────────────────────────────────── */}
                <div className="bg-card rounded-xl border p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span>🥂</span> Reception
                  </h2>
                  <div className="space-y-3">
                    {form.has_first_look && (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.reception_same_as_first_look}
                          onChange={e => {
                            const checked = e.target.checked
                            if (checked) {
                              setForm(prev => ({
                                ...prev,
                                reception_same_as_first_look: true,
                                reception_venue_name: prev.first_look_location_name,
                                reception_address: prev.first_look_address,
                                reception_city: prev.first_look_city,
                              }))
                            } else {
                              setForm(prev => ({
                                ...prev,
                                reception_same_as_first_look: false,
                                reception_venue_name: '',
                                reception_address: '',
                                reception_city: '',
                              }))
                            }
                          }}
                          className="w-4 h-4 accent-teal-600 rounded"
                        />
                        <span className="text-sm text-foreground">Same as First Look location</span>
                      </label>
                    )}
                    <TextInput label="Venue Name" value={form.reception_venue_name} onChange={v => updateField('reception_venue_name', v)} placeholder={form.reception_same_as_first_look ? '' : 'Reception venue name'} />
                    <TimeRow label="Time" startValue={form.reception_start_time} finishValue={form.reception_finish_time} onStartChange={v => updateField('reception_start_time', v)} onFinishChange={v => updateField('reception_finish_time', v)} />
                    <LocationFields form={form} updateField={updateField} prefix="reception" />
                  </div>
                </div>

                {/* ── Drive Times ──────────────────────────────────────── */}
                <div className="bg-card rounded-xl border p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span>🚗</span> Estimated Drive Times
                  </h2>
                  <p className="text-xs text-muted-foreground mb-3">Approximate minutes between locations</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Groom to Bride</label>
                      <input type="number" value={form.drive_time_groom_to_bride} onChange={e => updateField('drive_time_groom_to_bride', e.target.value)} placeholder="min" />
                    </div>
                    {form.has_first_look ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Bride to First Look</label>
                          <input type="number" value={form.drive_time_bride_to_first_look} onChange={e => updateField('drive_time_bride_to_first_look', e.target.value)} placeholder="min" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">First Look to Park</label>
                          <input type="number" value={form.drive_time_first_look_to_park} onChange={e => updateField('drive_time_first_look_to_park', e.target.value)} placeholder="min" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Park to Ceremony</label>
                          <input type="number" value={form.drive_time_park_to_ceremony} onChange={e => updateField('drive_time_park_to_ceremony', e.target.value)} placeholder="min" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Ceremony to Reception</label>
                          <input type="number" value={form.drive_time_ceremony_to_reception} onChange={e => updateField('drive_time_ceremony_to_reception', e.target.value)} placeholder="min" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Bride to Ceremony</label>
                          <input type="number" value={form.drive_time_bride_to_ceremony} onChange={e => updateField('drive_time_bride_to_ceremony', e.target.value)} placeholder="min" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Ceremony to Park</label>
                          <input type="number" value={form.drive_time_ceremony_to_park} onChange={e => updateField('drive_time_ceremony_to_park', e.target.value)} placeholder="min" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Park to Reception</label>
                          <input type="number" value={form.drive_time_park_to_reception} onChange={e => updateField('drive_time_park_to_reception', e.target.value)} placeholder="min" />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Contract Details ─────────────────────────────────── */}
                <div className="bg-card rounded-xl border p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span>📋</span> Contract Details
                  </h2>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <TextInput label="Ceremony Begins At" value={form.ceremony_begins_at} onChange={v => updateField('ceremony_begins_at', v)} placeholder="e.g. 3:00 PM" />
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Hours in Contract</label>
                        <input type="number" value={form.hours_in_contract} onChange={e => updateField('hours_in_contract', e.target.value)} placeholder="e.g. 10" />
                      </div>
                      <TextInput label="Photo/Video End Time" value={form.photo_video_end_time} onChange={v => updateField('photo_video_end_time', v)} placeholder="e.g. 11:00 PM" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">MUST ARRIVE AT VENUE BY <span className="text-red-500">*</span></label>
                      <select
                        value={form.venue_arrival_time}
                        onChange={e => updateField('venue_arrival_time', e.target.value)}
                        required
                      >
                        <option value="">Select a time</option>
                        {Array.from({ length: 33 }, (_, i) => {
                          const totalMin = 6 * 60 + i * 30
                          const h = Math.floor(totalMin / 60)
                          const m = totalMin % 60
                          const period = h >= 12 ? 'PM' : 'AM'
                          const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
                          const timeLabel = `${h12}:${m.toString().padStart(2, '0')} ${period}`
                          return <option key={timeLabel} value={timeLabel}>{timeLabel}</option>
                        })}
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground">💡 If you need additional hours, please contact Marianna before the wedding day.</p>
                  </div>
                </div>

                {/* ── Anything Else? ────────────────────────────────────── */}
                <div className="bg-card rounded-xl border p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span>📝</span> Anything Else?
                  </h2>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Is there anything else you&apos;d like us to know?</label>
                    <textarea
                      value={form.final_notes}
                      onChange={e => updateField('final_notes', e.target.value)}
                      placeholder="Special requests, family dynamics, surprises you're planning, accessibility needs, or anything else that will help us capture your day perfectly..."
                      rows={6}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  {isUpdate ? 'Update Wedding Day Form' : 'Submit Wedding Day Form'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ═══ STEP 4: Confirmation ═══════════════════════════════════ */}
        {step === 4 && (
          <div className="bg-card rounded-xl border p-8 shadow-sm text-center">
            <CheckCircle className="w-16 h-16 text-teal-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Wedding Day Form {isUpdate ? 'Updated' : 'Submitted'}!
            </h1>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Thank you for completing your wedding day form. We now have all the details
              we need to plan your perfect day.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-left max-w-sm mx-auto">
              <h3 className="text-sm font-semibold text-foreground mb-2">What happens next?</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>1. Our team will review your wedding day details</li>
                <li>2. We&apos;ll confirm the timeline and logistics</li>
                <li>3. You&apos;ll hear from us if we have any questions</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
