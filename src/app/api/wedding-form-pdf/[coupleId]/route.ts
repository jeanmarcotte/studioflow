import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { formatTime, buildScheduleRows, calculateHoursValidation } from '@/lib/time-utils'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── PDF Constants ───────────────────────────────────────────────────────────

const PAGE_W = 210 // A4 width mm
const PAGE_H = 297
const MARGIN = 16
const CONTENT_W = PAGE_W - MARGIN * 2
const COL_W = CONTENT_W / 3
const BOTTOM_LIMIT = PAGE_H - 24 // Stop 24mm from bottom for footer + margin
const FOOTER_Y = PAGE_H - 12

function stripEmojis(text: string): string {
  return text
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/[\u2600-\u27BF]/g, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/\u200D/g, '')
    .replace(/\u20E3/g, '')
    .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function val(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return stripEmojis(String(v))
}

// ─── PDF Builder ─────────────────────────────────────────────────────────────

class PdfBuilder {
  doc: jsPDF
  y: number
  pageNum: number
  coupleName: string
  weddingDate: string

  constructor(coupleName: string, weddingDate: string) {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    this.y = MARGIN
    this.pageNum = 1
    this.coupleName = coupleName
    this.weddingDate = weddingDate
  }

  newPage() {
    this.addFooter()
    this.doc.addPage()
    this.pageNum++
    this.y = MARGIN
  }

  checkPage(needed: number) {
    if (this.y + needed > BOTTOM_LIMIT) {
      this.newPage()
    }
  }

  addFooter() {
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(7)
    this.doc.setTextColor(180, 180, 180)
    this.doc.text(`${this.coupleName}  |  ${this.weddingDate}`, MARGIN, FOOTER_Y)
    this.doc.text(`Page ${this.pageNum}`, PAGE_W - MARGIN, FOOTER_Y, { align: 'right' })
    // Thin line above footer
    this.doc.setDrawColor(220, 220, 220)
    this.doc.setLineWidth(0.2)
    this.doc.line(MARGIN, FOOTER_Y - 4, PAGE_W - MARGIN, FOOTER_Y - 4)
  }

  // ── Section header with teal accent bar ──
  header(text: string) {
    this.checkPage(22) // header + at least one row
    this.doc.setFillColor(13, 79, 79) // SIGS teal
    this.doc.rect(MARGIN, this.y, 3, 8, 'F')
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(10)
    this.doc.setTextColor(13, 79, 79)
    this.doc.text(text.toUpperCase(), MARGIN + 6, this.y + 5.5)
    // Subtle underline
    this.doc.setDrawColor(220, 225, 230)
    this.doc.setLineWidth(0.2)
    this.doc.line(MARGIN, this.y + 9, MARGIN + CONTENT_W, this.y + 9)
    this.y += 13
  }

  field(label: string, value: string | number | boolean | null | undefined, col?: number) {
    const v = val(value)
    if (!v) return
    const x = MARGIN + (col ?? 0) * COL_W
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(6.5)
    this.doc.setTextColor(140, 140, 140)
    this.doc.text(label.toUpperCase(), x, this.y)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(9)
    this.doc.setTextColor(30, 30, 30)
    this.doc.text(v, x, this.y + 4)
  }

  fieldRow(fields: [string, string | number | boolean | null | undefined][]) {
    const hasValue = fields.some(([, v]) => val(v) !== '')
    if (!hasValue) return
    this.checkPage(11)
    fields.forEach(([label, value], i) => this.field(label, value, i))
    this.y += 10
  }

  textBlock(label: string, value: string | null | undefined) {
    if (!value) return
    const safeValue = stripEmojis(value)
    if (!safeValue) return
    this.doc.setFontSize(9)
    const lines = this.doc.splitTextToSize(safeValue, CONTENT_W)
    const needed = 8 + lines.length * 4.2
    this.checkPage(needed)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(6.5)
    this.doc.setTextColor(140, 140, 140)
    this.doc.text(label.toUpperCase(), MARGIN, this.y)
    this.y += 4
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(9)
    this.doc.setTextColor(30, 30, 30)
    for (const line of lines) {
      this.checkPage(5)
      this.doc.text(stripEmojis(line), MARGIN, this.y)
      this.y += 4.2
    }
    this.y += 2
  }

  gap(mm = 4) {
    this.y += mm
  }

  vendorRow(label: string, name: string | null | undefined, instagram: string | null | undefined) {
    const n = val(name)
    if (!n || n === 'NA' || n === 'N/A') return
    this.checkPage(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(6.5)
    this.doc.setTextColor(140, 140, 140)
    this.doc.text(label.toUpperCase(), MARGIN, this.y)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(9)
    this.doc.setTextColor(30, 30, 30)
    this.doc.text(n, MARGIN, this.y + 4)
    if (instagram) {
      const safeIg = stripEmojis(instagram)
      this.doc.setFontSize(8)
      this.doc.setTextColor(13, 79, 79)
      this.doc.text(safeIg, MARGIN + COL_W * 2, this.y + 4)
    }
    this.y += 10
  }

  locationBlock(data: {
    name?: string | null
    address?: string | null
    city?: string | null
    intersection?: string | null
    startTime?: string | null
    finishTime?: string | null
    directions?: string | null
    phone?: string | null
    extras?: [string, string | number | boolean | null | undefined][]
  }) {
    // Estimate height: name(6) + address row(10) + time row(10) + directions(~16) + extras
    let estimated = 0
    if (data.name) estimated += 7
    if (data.address || data.city || data.intersection) estimated += 11
    if (data.startTime || data.finishTime || data.phone) estimated += 11
    if (data.directions) estimated += 18
    if (data.extras) estimated += data.extras.length * 11
    this.checkPage(Math.min(estimated, 50)) // Check for section, cap at 50mm

    if (data.name) {
      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(9)
      this.doc.setTextColor(30, 30, 30)
      this.doc.text(stripEmojis(data.name), MARGIN, this.y)
      this.y += 6
    }
    this.fieldRow([['Address', data.address], ['City', data.city], ['Nearest Intersection', data.intersection]])
    this.fieldRow([['Start Time', data.startTime], ['Finish Time', data.finishTime], ['Contact Phone', data.phone]])
    this.textBlock('Directions / Notes', data.directions ?? undefined)
    if (data.extras) {
      for (const [label, value] of data.extras) {
        this.fieldRow([[label, value]])
      }
    }
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(request: Request, { params }: { params: Promise<{ coupleId: string }> }) {
  const { coupleId } = await params
  const supabase = getServiceClient()

  const [{ data: form, error: formError }, { data: couple }, { data: contract }] = await Promise.all([
    supabase.from('wedding_day_forms').select('*').eq('couple_id', coupleId).single(),
    supabase.from('couples').select('couple_name, wedding_date, package_type, bride_first_name, groom_first_name').eq('id', coupleId).single(),
    supabase.from('contracts').select('start_time, end_time').eq('couple_id', coupleId).single(),
  ])

  if (!form || formError) {
    return NextResponse.json({ error: 'No wedding day form found for this couple' }, { status: 404 })
  }

  const coupleName = stripEmojis(couple?.couple_name ?? 'Unknown Couple')
  const packageType = couple?.package_type ?? null
  const weddingDate = couple?.wedding_date
    ? format(new Date(couple.wedding_date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')
    : ''

  const pdf = new PdfBuilder(coupleName, weddingDate)

  // ─── Cover Header ────────────────────────────────────────────────────────────
  // SIGS branding
  pdf.doc.setFillColor(13, 79, 79)
  pdf.doc.rect(0, 0, PAGE_W, 2, 'F') // thin teal bar at top

  pdf.y = MARGIN + 4
  pdf.doc.setFont('helvetica', 'bold')
  pdf.doc.setFontSize(7)
  pdf.doc.setTextColor(13, 79, 79)
  pdf.doc.text('SIGS PHOTOGRAPHY', MARGIN, pdf.y)
  pdf.doc.setFont('helvetica', 'normal')
  pdf.doc.setFontSize(7)
  pdf.doc.setTextColor(160, 160, 160)
  pdf.doc.text('WEDDING DAY FORM', PAGE_W - MARGIN, pdf.y, { align: 'right' })
  pdf.y += 8

  // Couple name large
  pdf.doc.setFont('helvetica', 'bold')
  pdf.doc.setFontSize(20)
  pdf.doc.setTextColor(30, 30, 30)
  pdf.doc.text(coupleName, MARGIN, pdf.y)
  pdf.y += 7

  // Date + city
  if (weddingDate) {
    pdf.doc.setFont('helvetica', 'normal')
    pdf.doc.setFontSize(10)
    pdf.doc.setTextColor(100, 100, 100)
    const cityText = stripEmojis(form.reception_city || form.ceremony_city || form.bride_city || '')
    const dateLine = cityText ? `${weddingDate}  |  ${cityText}` : weddingDate
    pdf.doc.text(dateLine, MARGIN, pdf.y)
    pdf.y += 5
  }

  // Separator
  pdf.y += 2
  pdf.doc.setDrawColor(13, 79, 79)
  pdf.doc.setLineWidth(0.5)
  pdf.doc.line(MARGIN, pdf.y, MARGIN + CONTENT_W, pdf.y)
  pdf.y += 6

  // ─── Hours validation ──────────────────────────────────────────────────────
  const { contracted, contractStartFmt, contractEndFmt, actualHours, earliestFmt, latestFmt, startsBeforeBy, endsAfterBy } = calculateHoursValidation(form, contract)

  const isPhotoOnly = packageType === 'photo_only'
  const packageLabel = isPhotoOnly ? 'PHOTO ONLY' : 'PHOTO & VIDEO'

  // ─── CONTRACT BOX ──────────────────────────────────────────────────────────
  if (contracted || packageType) {
    // Calculate box height
    let boxLines = 0
    if (contractStartFmt) boxLines++
    if (contractEndFmt) boxLines++
    if (contracted) boxLines++
    if (packageType) boxLines++
    const boxH = 10 + boxLines * 5.5

    pdf.checkPage(boxH + 4)
    pdf.doc.setFillColor(243, 246, 249)
    pdf.doc.roundedRect(MARGIN, pdf.y, CONTENT_W, boxH, 1.5, 1.5, 'F')
    pdf.doc.setDrawColor(13, 79, 79)
    pdf.doc.setLineWidth(0.4)
    pdf.doc.line(MARGIN, pdf.y, MARGIN, pdf.y + boxH) // left accent

    let by = pdf.y + 6
    pdf.doc.setFont('helvetica', 'bold')
    pdf.doc.setFontSize(8)
    pdf.doc.setTextColor(13, 79, 79)
    pdf.doc.text('CONTRACT DETAILS', MARGIN + 5, by)
    by += 5

    pdf.doc.setFont('helvetica', 'normal')
    pdf.doc.setFontSize(8.5)
    pdf.doc.setTextColor(50, 50, 50)
    if (contractStartFmt) { pdf.doc.text(`Coverage Start:  ${contractStartFmt}`, MARGIN + 5, by); by += 5.5 }
    if (contractEndFmt) { pdf.doc.text(`Coverage End:  ${contractEndFmt}`, MARGIN + 5, by); by += 5.5 }
    if (contracted) {
      pdf.doc.setFont('helvetica', 'bold')
      pdf.doc.text(`Total:  ${contracted} hours`, MARGIN + 5, by)
      pdf.doc.setFont('helvetica', 'normal')
      by += 5.5
    }
    if (packageType) { pdf.doc.text(`Package:  ${packageLabel}`, MARGIN + 5, by); by += 5.5 }

    pdf.y += boxH + 5
  }

  // ─── SCHEDULE TIMELINE ─────────────────────────────────────────────────────
  pdf.header("Day Timeline")

  const timelineRow = (label: string, time: string | null, location?: string | null) => {
    if (!time) return
    const safeLabel = stripEmojis(label)
    const safeTime = stripEmojis(time)
    const safeLoc = location ? stripEmojis(location) : null
    pdf.checkPage(safeLoc ? 11 : 8)
    // Teal dot
    pdf.doc.setFillColor(13, 79, 79)
    pdf.doc.circle(MARGIN + 2, pdf.y + 1, 1, 'F')
    // Vertical connector line
    pdf.doc.setDrawColor(200, 210, 210)
    pdf.doc.setLineWidth(0.2)
    pdf.doc.line(MARGIN + 2, pdf.y + 2.5, MARGIN + 2, pdf.y + (safeLoc ? 10 : 7))
    // Label + time
    pdf.doc.setFont('helvetica', 'bold')
    pdf.doc.setFontSize(8.5)
    pdf.doc.setTextColor(30, 30, 30)
    pdf.doc.text(safeLabel, MARGIN + 6, pdf.y + 2)
    const labelW = pdf.doc.getTextWidth(safeLabel)
    pdf.doc.setFont('helvetica', 'normal')
    pdf.doc.setFontSize(8.5)
    pdf.doc.setTextColor(80, 80, 80)
    pdf.doc.text(safeTime, MARGIN + 6 + labelW + 3, pdf.y + 2)
    if (safeLoc) {
      pdf.doc.setFontSize(7)
      pdf.doc.setTextColor(140, 140, 140)
      pdf.doc.text(safeLoc, MARGIN + 6, pdf.y + 6)
      pdf.y += 10
    } else {
      pdf.y += 7
    }
  }

  const scheduleRows = buildScheduleRows(form, packageType)
  for (const row of scheduleRows) {
    timelineRow(row.event, row.time || null, row.location || null)
  }
  pdf.gap(3)

  // ─── SCHEDULE ALERTS ───────────────────────────────────────────────────────
  const hasWarnings = startsBeforeBy !== null || endsAfterBy !== null
  if (hasWarnings || (contracted && actualHours !== null)) {
    const warningLines = (startsBeforeBy !== null ? 1 : 0) + (endsAfterBy !== null ? 1 : 0)
    const alertH = hasWarnings ? 8 + warningLines * 5.5 : 12
    pdf.checkPage(alertH + 2)

    if (hasWarnings) {
      pdf.doc.setFillColor(254, 242, 242)
      pdf.doc.setDrawColor(239, 68, 68)
    } else {
      pdf.doc.setFillColor(240, 253, 244)
      pdf.doc.setDrawColor(34, 197, 94)
    }
    pdf.doc.setLineWidth(0.3)
    pdf.doc.roundedRect(MARGIN, pdf.y, CONTENT_W, alertH, 1.5, 1.5, 'FD')

    let ay = pdf.y + 5.5
    if (startsBeforeBy !== null) {
      const delta = startsBeforeBy >= 60
        ? `${Math.round(startsBeforeBy / 60 * 10) / 10} hrs`
        : `${startsBeforeBy} min`
      pdf.doc.setFont('helvetica', 'bold')
      pdf.doc.setFontSize(7.5)
      pdf.doc.setTextColor(185, 28, 28)
      pdf.doc.text(`Starts at ${earliestFmt} - ${delta} BEFORE contract (${contractStartFmt})`, MARGIN + 4, ay)
      ay += 5.5
    }
    if (endsAfterBy !== null) {
      const delta = endsAfterBy >= 60
        ? `${Math.round(endsAfterBy / 60 * 10) / 10} hrs`
        : `${endsAfterBy} min`
      pdf.doc.setFont('helvetica', 'bold')
      pdf.doc.setFontSize(7.5)
      pdf.doc.setTextColor(185, 28, 28)
      pdf.doc.text(`Ends at ${latestFmt} - ${delta} AFTER contract (${contractEndFmt})`, MARGIN + 4, ay)
      ay += 5.5
    }
    if (!hasWarnings && contracted && actualHours !== null) {
      pdf.doc.setFont('helvetica', 'bold')
      pdf.doc.setFontSize(7.5)
      pdf.doc.setTextColor(21, 128, 61)
      pdf.doc.text('Schedule fits within contracted hours', MARGIN + 4, ay)
    }
    pdf.y += alertH + 4
  }

  // ─── EMERGENCY CONTACTS ────────────────────────────────────────────────────
  pdf.header('Emergency Contacts')
  pdf.fieldRow([['Contact 1', form.emergency_contact_1_name], ['Phone', form.emergency_contact_1_phone], ['Relationship', form.contact1_relationship]])
  pdf.fieldRow([['Contact 2', form.emergency_contact_2_name], ['Phone', form.emergency_contact_2_phone], ['Relationship', form.contact2_relationship]])

  // ─── GROOM PREP ────────────────────────────────────────────────────────────
  pdf.header('Groom Prep')
  pdf.locationBlock({
    address: form.groom_address, city: form.groom_city, intersection: form.groom_intersection,
    startTime: formatTime(form.groom_start_time, 'prep'), finishTime: formatTime(form.groom_finish_time, 'prep'),
    phone: form.groom_phone, directions: form.groom_directions,
  })

  // ─── BRIDE PREP ────────────────────────────────────────────────────────────
  pdf.header('Bride Prep')
  pdf.locationBlock({
    address: form.bride_address, city: form.bride_city, intersection: form.bride_intersection,
    startTime: formatTime(form.bride_start_time, 'prep'), finishTime: formatTime(form.bride_finish_time, 'prep'),
    phone: form.bride_phone, directions: form.bride_directions,
  })

  // ─── FIRST LOOK ────────────────────────────────────────────────────────────
  if (form.has_first_look) {
    pdf.header('First Look')
    pdf.locationBlock({
      name: form.first_look_location_name, address: form.first_look_address, city: form.first_look_city,
      startTime: formatTime(form.first_look_time, 'ceremony'),
    })
  }

  // ─── CEREMONY ──────────────────────────────────────────────────────────────
  pdf.header('Ceremony')
  pdf.locationBlock({
    name: form.ceremony_location_name, address: form.ceremony_address, city: form.ceremony_city,
    intersection: form.ceremony_intersection, startTime: formatTime(form.ceremony_start_time, 'ceremony'),
    finishTime: formatTime(form.ceremony_finish_time, 'ceremony'), directions: form.ceremony_directions,
    extras: [
      ['Photo Arrival Time', formatTime(form.ceremony_photo_arrival_time, 'ceremony')],
      ['First Look at Ceremony', form.ceremony_first_look],
    ],
  })

  // ─── PARK / PHOTOS ─────────────────────────────────────────────────────────
  pdf.header('Park / Photos')
  pdf.locationBlock({
    name: form.park_name, address: form.park_address, city: form.park_city,
    intersection: form.park_intersection, startTime: formatTime(form.park_start_time, 'photos'),
    finishTime: formatTime(form.park_finish_time, 'photos'), directions: form.park_directions,
    extras: [['Park Permit Obtained', form.park_permit_obtained]],
  })

  // ─── EXTRA LOCATION ────────────────────────────────────────────────────────
  if (form.extra_location_name) {
    pdf.header('Extra Location')
    pdf.locationBlock({
      name: form.extra_location_name, address: form.extra_address, city: form.extra_city,
      intersection: form.extra_intersection, startTime: formatTime(form.extra_start_time, 'photos'),
      finishTime: formatTime(form.extra_finish_time, 'photos'), directions: form.extra_directions,
    })
    pdf.textBlock('Notes', form.extra_location_notes)
  }

  // ─── RECEPTION ─────────────────────────────────────────────────────────────
  pdf.header('Reception')
  pdf.locationBlock({
    name: form.reception_venue_name, address: form.reception_address, city: form.reception_city,
    intersection: form.reception_intersection, startTime: formatTime(form.reception_start_time, 'reception'),
    finishTime: formatTime(form.reception_finish_time, 'reception_end'), directions: form.reception_directions,
  })

  // ─── DRIVE TIMES ───────────────────────────────────────────────────────────
  const hasDriveTimes = form.drive_time_groom_to_bride || form.drive_time_bride_to_ceremony ||
    form.drive_time_ceremony_to_park || form.drive_time_park_to_reception ||
    form.drive_time_bride_to_first_look || form.drive_time_first_look_to_park ||
    form.drive_time_park_to_ceremony || form.drive_time_ceremony_to_reception
  if (hasDriveTimes) {
    pdf.header('Drive Times')
    if (form.has_first_look) {
      pdf.fieldRow([
        ['Groom to Bride', form.drive_time_groom_to_bride ? `${form.drive_time_groom_to_bride} min` : null],
        ['Bride to First Look', form.drive_time_bride_to_first_look ? `${form.drive_time_bride_to_first_look} min` : null],
        ['First Look to Park', form.drive_time_first_look_to_park ? `${form.drive_time_first_look_to_park} min` : null],
      ])
      pdf.fieldRow([
        ['Park to Ceremony', form.drive_time_park_to_ceremony ? `${form.drive_time_park_to_ceremony} min` : null],
        ['Ceremony to Reception', form.drive_time_ceremony_to_reception ? `${form.drive_time_ceremony_to_reception} min` : null],
      ])
    } else {
      pdf.fieldRow([
        ['Groom to Bride', form.drive_time_groom_to_bride ? `${form.drive_time_groom_to_bride} min` : null],
        ['Bride to Ceremony', form.drive_time_bride_to_ceremony ? `${form.drive_time_bride_to_ceremony} min` : null],
        ['Ceremony to Park', form.drive_time_ceremony_to_park ? `${form.drive_time_ceremony_to_park} min` : null],
      ])
      pdf.fieldRow([
        ['Park to Reception', form.drive_time_park_to_reception ? `${form.drive_time_park_to_reception} min` : null],
      ])
    }
  }

  // ─── VENDORS ───────────────────────────────────────────────────────────────
  pdf.header('Vendors')
  pdf.vendorRow('Wedding Planner', form.vendor_wedding_planner, form.vendor_wedding_planner_instagram)
  pdf.vendorRow('Officiant', form.vendor_officiant, form.vendor_officiant_instagram)
  pdf.vendorRow('Makeup', form.vendor_makeup, form.vendor_makeup_instagram)
  pdf.vendorRow('Hair', form.vendor_hair, form.vendor_hair_instagram)
  pdf.vendorRow('Floral', form.vendor_floral, form.vendor_floral_instagram)
  pdf.vendorRow('Event Design', form.vendor_event_design, form.vendor_event_design_instagram)
  pdf.vendorRow('DJ / MC', form.vendor_dj_mc, form.vendor_dj_mc_instagram)
  pdf.vendorRow('Transportation', form.vendor_transportation, form.vendor_transportation_instagram)

  // ─── VENUE CONTACT ─────────────────────────────────────────────────────────
  if (form.venue_contact_name || form.venue_contact_phone || form.venue_contact_email) {
    pdf.header('Venue Contact')
    pdf.fieldRow([['Name', form.venue_contact_name], ['Phone', form.venue_contact_phone], ['Email', form.venue_contact_email]])
  }

  // ─── COUPLE SOCIAL ─────────────────────────────────────────────────────────
  if (form.couple_instagram || form.wedding_hashtag) {
    pdf.header('Couple Social')
    pdf.fieldRow([['Instagram', form.couple_instagram], ['Wedding Hashtag', form.wedding_hashtag]])
  }

  // ─── INSPIRATION ───────────────────────────────────────────────────────────
  const links = [form.inspiration_link_1, form.inspiration_link_2, form.inspiration_link_3, form.inspiration_link_4, form.inspiration_link_5].filter(Boolean)
  if (links.length > 0) {
    pdf.header('Inspiration')
    for (const link of links) {
      pdf.checkPage(6)
      pdf.doc.setFont('helvetica', 'normal')
      pdf.doc.setFontSize(8)
      pdf.doc.setTextColor(13, 79, 79)
      pdf.doc.text(stripEmojis(link!), MARGIN, pdf.y)
      pdf.y += 5
    }
    pdf.gap(2)
  }

  // ─── GENERAL INFO ──────────────────────────────────────────────────────────
  pdf.header('General Info')
  pdf.fieldRow([['Bridal Party Count', form.bridal_party_count]])
  pdf.textBlock('Parent Info', form.parent_info)
  pdf.textBlock('Honeymoon Details', form.honeymoon_details)

  // ─── NOTES ─────────────────────────────────────────────────────────────────
  if (form.additional_notes || form.final_notes) {
    pdf.header('Notes')
    pdf.textBlock('Additional Notes', form.additional_notes)
    pdf.textBlock('Final Notes', form.final_notes)
  }

  // ─── Final footer + generate ───────────────────────────────────────────────
  pdf.addFooter()

  const buffer = Buffer.from(pdf.doc.output('arraybuffer'))

  // Filename: BrideName_GroomName Month Day Year - Wedding Day Info Form.pdf
  const brideName = stripEmojis(couple?.bride_first_name || 'Bride')
  const groomName = stripEmojis(couple?.groom_first_name || 'Groom')
  let filename = `${brideName}_${groomName}`
  if (couple?.wedding_date) {
    const d = new Date(couple.wedding_date + 'T12:00:00')
    const month = d.toLocaleString('en-US', { month: 'long' })
    const day = d.getDate()
    const year = d.getFullYear()
    filename += ` ${month} ${day} ${year}`
  }
  filename += ' - Wedding Day Info Form.pdf'

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
