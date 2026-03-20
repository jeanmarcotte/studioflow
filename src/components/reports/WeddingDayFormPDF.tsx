import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// ── Types ────────────────────────────────────────────────────────

interface WeddingDayFormData {
  // Emergency Contacts
  emergency_contact_1_name: string | null
  emergency_contact_1_phone: string | null
  emergency_contact_2_name: string | null
  emergency_contact_2_phone: string | null
  // Groom Prep
  groom_start_time: string | null
  groom_finish_time: string | null
  groom_address: string | null
  groom_city: string | null
  groom_intersection: string | null
  groom_phone: string | null
  groom_directions: string | null
  // Bride Prep
  bride_start_time: string | null
  bride_finish_time: string | null
  bride_address: string | null
  bride_city: string | null
  bride_intersection: string | null
  bride_phone: string | null
  bride_directions: string | null
  // Ceremony
  ceremony_location_name: string | null
  ceremony_first_look: boolean
  ceremony_photo_arrival_time: string | null
  ceremony_start_time: string | null
  ceremony_finish_time: string | null
  ceremony_address: string | null
  ceremony_city: string | null
  ceremony_intersection: string | null
  ceremony_directions: string | null
  // Park/Photos
  park_name: string | null
  park_permit_obtained: boolean
  park_start_time: string | null
  park_finish_time: string | null
  park_address: string | null
  park_city: string | null
  park_intersection: string | null
  park_directions: string | null
  // Extra Location
  extra_location_name: string | null
  extra_start_time: string | null
  extra_finish_time: string | null
  extra_address: string | null
  extra_city: string | null
  extra_intersection: string | null
  extra_directions: string | null
  extra_location_notes: string | null
  // First Look
  has_first_look: boolean | null
  first_look_location_name: string | null
  first_look_time: string | null
  first_look_address: string | null
  first_look_city: string | null
  park_same_as_first_look: boolean
  reception_same_as_first_look: boolean
  // Reception
  reception_venue_name: string | null
  reception_start_time: string | null
  reception_finish_time: string | null
  reception_address: string | null
  reception_city: string | null
  reception_intersection: string | null
  reception_directions: string | null
  // Drive Times
  drive_time_groom_to_bride: number | null
  drive_time_bride_to_ceremony: number | null
  drive_time_ceremony_to_park: number | null
  drive_time_park_to_reception: number | null
  drive_time_bride_to_first_look: number | null
  drive_time_first_look_to_park: number | null
  drive_time_park_to_ceremony: number | null
  drive_time_ceremony_to_reception: number | null
  // Contract Info
  ceremony_begins_at: string | null
  hours_in_contract: number | null
  photo_video_end_time: string | null
  venue_arrival_time: string | null
  // Vendors
  vendor_wedding_planner: string | null
  vendor_wedding_planner_instagram: string | null
  vendor_officiant: string | null
  vendor_officiant_instagram: string | null
  vendor_makeup: string | null
  vendor_makeup_instagram: string | null
  vendor_hair: string | null
  vendor_hair_instagram: string | null
  vendor_floral: string | null
  vendor_floral_instagram: string | null
  vendor_event_design: string | null
  vendor_event_design_instagram: string | null
  vendor_dj_mc: string | null
  vendor_dj_mc_instagram: string | null
  vendor_transportation: string | null
  vendor_transportation_instagram: string | null
  // Venue Contact
  venue_contact_name: string | null
  venue_contact_phone: string | null
  venue_contact_email: string | null
  // Couple Social
  couple_instagram: string | null
  wedding_hashtag: string | null
  // Inspiration
  inspiration_link_1: string | null
  inspiration_link_2: string | null
  inspiration_link_3: string | null
  inspiration_link_4: string | null
  inspiration_link_5: string | null
  // General Info
  bridal_party_count: number | null
  parent_info: string | null
  honeymoon_details: string | null
  additional_notes: string | null
  final_notes: string | null
  // Timestamps
  created_at: string | null
}

interface CoupleData {
  couple_name: string
  bride_first_name: string | null
  groom_first_name: string | null
  wedding_date: string | null
}

interface AssignmentData {
  photo_1: string | null
  photo_2: string | null
  video_1: string | null
}

interface WeddingDayFormPDFProps {
  form: WeddingDayFormData
  couple: CoupleData
  assignment: AssignmentData | null
}

// ── Styles ───────────────────────────────────────────────────────

const BLUE = '#1e40af'
const GREEN = '#059669'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: '#1a1a1a',
  },
  // Header
  headerBar: {
    backgroundColor: BLUE,
    padding: 20,
    marginBottom: 20,
    marginTop: -40,
    marginHorizontal: -40,
  },
  logoText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 3,
  },
  reportTitle: {
    fontFamily: 'Helvetica',
    fontSize: 12,
    color: '#bfdbfe',
    marginTop: 4,
  },
  weddingDate: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#93c5fd',
    marginTop: 2,
  },
  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginBottom: 6,
    marginTop: 14,
    backgroundColor: BLUE,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#ffffff',
  },
  greenSection: {
    backgroundColor: GREEN,
  },
  // Info rows
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
  },
  infoLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#6b7280',
    width: '30%',
  },
  infoValue: {
    fontSize: 9,
    color: '#1a1a1a',
    width: '70%',
  },
  // Timeline table
  timelineRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
  },
  timelineRowAlt: {
    backgroundColor: '#f8fafc',
  },
  timelineEvent: { width: '22%', fontFamily: 'Helvetica-Bold', fontSize: 8 },
  timelineTime: { width: '18%', fontSize: 8 },
  timelineVenue: { width: '30%', fontSize: 8 },
  timelineCity: { width: '15%', fontSize: 8 },
  timelineNotes: { width: '15%', fontSize: 7, color: '#6b7280' },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d4d4d4',
    paddingBottom: 3,
    paddingHorizontal: 6,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  // Drive times
  driveRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  driveLabel: { width: '70%', fontSize: 8, color: '#374151' },
  driveValue: { width: '30%', fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  // Vendors table
  vendorRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
  },
  vendorRowAlt: { backgroundColor: '#f8fafc' },
  vendorType: { width: '25%', fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#6b7280' },
  vendorName: { width: '40%', fontSize: 8 },
  vendorInsta: { width: '35%', fontSize: 8, color: '#6b7280' },
  // Notes box
  notesBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 4,
    padding: 12,
    marginTop: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  notesTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#dc2626',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    color: '#1a1a1a',
    lineHeight: 1.5,
  },
  // Two-column layout
  twoCol: {
    flexDirection: 'row',
    gap: 20,
  },
  col: {
    flex: 1,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#d4d4d4',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: '#a3a3a3',
  },
})

// ── Helpers ──────────────────────────────────────────────────────

function fmt(val: string | null | undefined): string {
  return val || '—'
}

function fmtTime(val: string | null | undefined): string {
  if (!val) return '—'
  // Handle "HH:MM" or "HH:MM:SS" format
  const parts = val.split(':')
  if (parts.length < 2) return val
  const h = parseInt(parts[0])
  const m = parts[1]
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m} ${ampm}`
}

function fmtDrive(minutes: number | null): string {
  if (!minutes) return '—'
  return `${minutes} min`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function formatSubmitDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ── Component ────────────────────────────────────────────────────

export default function WeddingDayFormPDF({ form, couple, assignment }: WeddingDayFormPDFProps) {
  const timelineEvents = [
    {
      event: 'Groom Prep',
      time: `${fmtTime(form.groom_start_time)} – ${fmtTime(form.groom_finish_time)}`,
      venue: fmt(form.groom_address),
      city: fmt(form.groom_city),
      notes: form.groom_directions,
    },
    {
      event: 'Bride Prep',
      time: `${fmtTime(form.bride_start_time)} – ${fmtTime(form.bride_finish_time)}`,
      venue: fmt(form.bride_address),
      city: fmt(form.bride_city),
      notes: form.bride_directions,
    },
    ...(form.has_first_look ? [{
      event: 'First Look',
      time: fmtTime(form.first_look_time),
      venue: fmt(form.first_look_address || form.first_look_location_name),
      city: fmt(form.first_look_city),
      notes: null as string | null,
    }] : []),
    {
      event: 'Ceremony',
      time: `${fmtTime(form.ceremony_start_time)} – ${fmtTime(form.ceremony_finish_time)}`,
      venue: fmt(form.ceremony_location_name || form.ceremony_address),
      city: fmt(form.ceremony_city),
      notes: form.ceremony_directions,
    },
    ...(form.park_name ? [{
      event: 'Park / Portraits',
      time: `${fmtTime(form.park_start_time)} – ${fmtTime(form.park_finish_time)}`,
      venue: fmt(form.park_name),
      city: fmt(form.park_city),
      notes: form.park_permit_obtained ? 'Permit obtained' : null as string | null,
    }] : []),
    ...(form.extra_location_name ? [{
      event: 'Extra Location',
      time: `${fmtTime(form.extra_start_time)} – ${fmtTime(form.extra_finish_time)}`,
      venue: fmt(form.extra_location_name),
      city: fmt(form.extra_city),
      notes: form.extra_location_notes,
    }] : []),
    {
      event: 'Reception',
      time: `${fmtTime(form.reception_start_time)} – ${fmtTime(form.reception_finish_time)}`,
      venue: fmt(form.reception_venue_name || form.reception_address),
      city: fmt(form.reception_city),
      notes: form.reception_directions,
    },
  ]

  const driveSegments = [
    { label: 'Groom Prep → Bride Prep', value: form.drive_time_groom_to_bride },
    ...(form.has_first_look ? [
      { label: 'Bride Prep → First Look', value: form.drive_time_bride_to_first_look },
      { label: 'First Look → Park', value: form.drive_time_first_look_to_park },
      { label: 'Park → Ceremony', value: form.drive_time_park_to_ceremony },
    ] : [
      { label: 'Bride Prep → Ceremony', value: form.drive_time_bride_to_ceremony },
      { label: 'Ceremony → Park', value: form.drive_time_ceremony_to_park },
    ]),
    ...(form.has_first_look
      ? [{ label: 'Ceremony → Reception', value: form.drive_time_ceremony_to_reception }]
      : [{ label: 'Park → Reception', value: form.drive_time_park_to_reception }]
    ),
  ].filter(d => d.value)

  const vendors = [
    { type: 'Wedding Planner', name: form.vendor_wedding_planner, insta: form.vendor_wedding_planner_instagram },
    { type: 'Officiant', name: form.vendor_officiant, insta: form.vendor_officiant_instagram },
    { type: 'Makeup', name: form.vendor_makeup, insta: form.vendor_makeup_instagram },
    { type: 'Hair', name: form.vendor_hair, insta: form.vendor_hair_instagram },
    { type: 'Floral', name: form.vendor_floral, insta: form.vendor_floral_instagram },
    { type: 'Event Design', name: form.vendor_event_design, insta: form.vendor_event_design_instagram },
    { type: 'DJ / MC', name: form.vendor_dj_mc, insta: form.vendor_dj_mc_instagram },
    { type: 'Transportation', name: form.vendor_transportation, insta: form.vendor_transportation_instagram },
  ].filter(v => v.name)

  const inspirationLinks = [
    form.inspiration_link_1,
    form.inspiration_link_2,
    form.inspiration_link_3,
    form.inspiration_link_4,
    form.inspiration_link_5,
  ].filter(Boolean)

  const hasNotes = form.additional_notes || form.final_notes

  return (
    <Document>
      {/* ── Page 1: Timeline & Logistics ─── */}
      <Page size="A4" style={s.page}>
        <View style={s.headerBar}>
          <Text style={s.logoText}>SIGS PHOTOGRAPHY</Text>
          <Text style={s.reportTitle}>{couple.couple_name} — Wedding Day Form</Text>
          <Text style={s.weddingDate}>{formatDate(couple.wedding_date)}</Text>
        </View>

        {/* Crew & Emergency */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Crew</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Photographer 1</Text>
              <Text style={s.infoValue}>{fmt(assignment?.photo_1)}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Photographer 2</Text>
              <Text style={s.infoValue}>{fmt(assignment?.photo_2)}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Videographer</Text>
              <Text style={s.infoValue}>{fmt(assignment?.video_1)}</Text>
            </View>
          </View>
          <View style={s.col}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Emergency Contacts</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>{fmt(form.emergency_contact_1_name)}</Text>
              <Text style={s.infoValue}>{fmt(form.emergency_contact_1_phone)}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>{fmt(form.emergency_contact_2_name)}</Text>
              <Text style={s.infoValue}>{fmt(form.emergency_contact_2_phone)}</Text>
            </View>
          </View>
        </View>

        {/* Contract Info */}
        <View style={[s.sectionHeader, s.greenSection]}>
          <Text style={s.sectionTitle}>Contract Info</Text>
        </View>
        <View style={s.twoCol}>
          <View style={s.col}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Ceremony Begins</Text>
              <Text style={s.infoValue}>{fmtTime(form.ceremony_begins_at)}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Hours in Contract</Text>
              <Text style={s.infoValue}>{form.hours_in_contract ? `${form.hours_in_contract} hrs` : '—'}</Text>
            </View>
          </View>
          <View style={s.col}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Photo/Video Ends</Text>
              <Text style={s.infoValue}>{fmtTime(form.photo_video_end_time)}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Venue Arrival</Text>
              <Text style={s.infoValue}>{fmtTime(form.venue_arrival_time)}</Text>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Timeline</Text>
        </View>
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderCell, s.timelineEvent]}>Event</Text>
          <Text style={[s.tableHeaderCell, s.timelineTime]}>Time</Text>
          <Text style={[s.tableHeaderCell, s.timelineVenue]}>Venue / Address</Text>
          <Text style={[s.tableHeaderCell, s.timelineCity]}>City</Text>
          <Text style={[s.tableHeaderCell, s.timelineNotes]}>Notes</Text>
        </View>
        {timelineEvents.map((ev, i) => (
          <View key={i} style={[s.timelineRow, i % 2 === 1 ? s.timelineRowAlt : {}]}>
            <Text style={s.timelineEvent}>{ev.event}</Text>
            <Text style={s.timelineTime}>{ev.time}</Text>
            <Text style={s.timelineVenue}>{ev.venue}</Text>
            <Text style={s.timelineCity}>{ev.city}</Text>
            <Text style={s.timelineNotes}>{fmt(ev.notes)}</Text>
          </View>
        ))}

        {/* Drive Times */}
        {driveSegments.length > 0 && (
          <View>
            <View style={[s.sectionHeader, s.greenSection]}>
              <Text style={s.sectionTitle}>Drive Times</Text>
            </View>
            {driveSegments.map((seg, i) => (
              <View key={i} style={s.driveRow}>
                <Text style={s.driveLabel}>{seg.label}</Text>
                <Text style={s.driveValue}>{fmtDrive(seg.value)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Location Details */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Location Details</Text>
        </View>
        {form.groom_intersection && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Groom Prep Intersection</Text>
            <Text style={s.infoValue}>{form.groom_intersection}{form.groom_phone ? ` • ${form.groom_phone}` : ''}</Text>
          </View>
        )}
        {form.bride_intersection && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Bride Prep Intersection</Text>
            <Text style={s.infoValue}>{form.bride_intersection}{form.bride_phone ? ` • ${form.bride_phone}` : ''}</Text>
          </View>
        )}
        {form.ceremony_intersection && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Ceremony Intersection</Text>
            <Text style={s.infoValue}>{form.ceremony_intersection}</Text>
          </View>
        )}
        {form.park_intersection && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Park Intersection</Text>
            <Text style={s.infoValue}>{form.park_intersection}</Text>
          </View>
        )}
        {form.extra_intersection && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Extra Location Intersection</Text>
            <Text style={s.infoValue}>{form.extra_intersection}</Text>
          </View>
        )}
        {form.reception_intersection && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Reception Intersection</Text>
            <Text style={s.infoValue}>{form.reception_intersection}</Text>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>SIGS Photography • Wedding Day Form</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* ── Page 2: Vendors & Notes ─── */}
      <Page size="A4" style={s.page}>
        <View style={s.headerBar}>
          <Text style={s.logoText}>SIGS PHOTOGRAPHY</Text>
          <Text style={s.reportTitle}>{couple.couple_name} — Vendors & Notes</Text>
        </View>

        {/* Vendors */}
        {vendors.length > 0 && (
          <View>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Vendors</Text>
            </View>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, s.vendorType]}>Type</Text>
              <Text style={[s.tableHeaderCell, s.vendorName]}>Name</Text>
              <Text style={[s.tableHeaderCell, s.vendorInsta]}>Instagram</Text>
            </View>
            {vendors.map((v, i) => (
              <View key={i} style={[s.vendorRow, i % 2 === 1 ? s.vendorRowAlt : {}]}>
                <Text style={s.vendorType}>{v.type}</Text>
                <Text style={s.vendorName}>{fmt(v.name)}</Text>
                <Text style={s.vendorInsta}>{fmt(v.insta)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Venue Contact */}
        {(form.venue_contact_name || form.venue_contact_phone || form.venue_contact_email) && (
          <View>
            <View style={[s.sectionHeader, s.greenSection]}>
              <Text style={s.sectionTitle}>Venue Contact</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Name</Text>
              <Text style={s.infoValue}>{fmt(form.venue_contact_name)}</Text>
            </View>
            {form.venue_contact_phone && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Phone</Text>
                <Text style={s.infoValue}>{form.venue_contact_phone}</Text>
              </View>
            )}
            {form.venue_contact_email && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Email</Text>
                <Text style={s.infoValue}>{form.venue_contact_email}</Text>
              </View>
            )}
          </View>
        )}

        {/* Couple Details */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Couple Details</Text>
        </View>
        {form.bridal_party_count != null && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Bridal Party Count</Text>
            <Text style={s.infoValue}>{form.bridal_party_count}</Text>
          </View>
        )}
        {form.parent_info && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Parent Info</Text>
            <Text style={s.infoValue}>{form.parent_info}</Text>
          </View>
        )}
        {form.honeymoon_details && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Honeymoon</Text>
            <Text style={s.infoValue}>{form.honeymoon_details}</Text>
          </View>
        )}
        {form.couple_instagram && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Instagram</Text>
            <Text style={s.infoValue}>{form.couple_instagram}</Text>
          </View>
        )}
        {form.wedding_hashtag && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Hashtag</Text>
            <Text style={s.infoValue}>{form.wedding_hashtag}</Text>
          </View>
        )}

        {/* Inspiration Links */}
        {inspirationLinks.length > 0 && (
          <View>
            <View style={[s.sectionHeader, s.greenSection]}>
              <Text style={s.sectionTitle}>Inspiration Links</Text>
            </View>
            {inspirationLinks.map((link, i) => (
              <View key={i} style={s.infoRow}>
                <Text style={s.infoLabel}>Link {i + 1}</Text>
                <Text style={s.infoValue}>{link}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Important Notes from Bride */}
        {hasNotes && (
          <View style={s.notesBox}>
            <Text style={s.notesTitle}>IMPORTANT NOTES FROM BRIDE</Text>
            {form.additional_notes && (
              <Text style={s.notesText}>{form.additional_notes}</Text>
            )}
            {form.additional_notes && form.final_notes && (
              <Text style={{ marginTop: 8 }}> </Text>
            )}
            {form.final_notes && (
              <Text style={s.notesText}>{form.final_notes}</Text>
            )}
          </View>
        )}

        {/* Submission timestamp */}
        {form.created_at && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 8, color: '#9ca3af', textAlign: 'center' }}>
              Form submitted on {formatSubmitDate(form.created_at)}
            </Text>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>SIGS Photography • Wedding Day Form</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
