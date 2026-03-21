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

// ─── PDF Helpers ──────────────────────────────────────────────────────────────

const PAGE_W = 210 // A4 width mm
const MARGIN = 18
const CONTENT_W = PAGE_W - MARGIN * 2
const COL_W = CONTENT_W / 3

function val(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

class PdfBuilder {
  doc: jsPDF
  y: number

  constructor() {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    this.y = MARGIN
  }

  checkPage(needed: number) {
    if (this.y + needed > 280) {
      this.doc.addPage()
      this.y = MARGIN
    }
  }

  header(text: string) {
    this.checkPage(14)
    this.doc.setFillColor(245, 247, 250)
    this.doc.roundedRect(MARGIN, this.y, CONTENT_W, 10, 2, 2, 'F')
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(11)
    this.doc.setTextColor(30, 41, 59)
    this.doc.text(text, MARGIN + 4, this.y + 7)
    this.y += 14
  }

  field(label: string, value: string | number | boolean | null | undefined, col?: number) {
    const v = val(value)
    if (!v) return
    this.checkPage(12)
    const x = MARGIN + (col ?? 0) * COL_W
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(7)
    this.doc.setTextColor(107, 114, 128)
    this.doc.text(label.toUpperCase(), x, this.y)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(9.5)
    this.doc.setTextColor(17, 24, 39)
    this.doc.text(v, x, this.y + 4)
  }

  fieldRow(fields: [string, string | number | boolean | null | undefined][]) {
    const hasValue = fields.some(([, v]) => val(v) !== '')
    if (!hasValue) return
    this.checkPage(12)
    fields.forEach(([label, value], i) => this.field(label, value, i))
    this.y += 10
  }

  textBlock(label: string, value: string | null | undefined) {
    if (!value) return
    this.checkPage(16)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(7)
    this.doc.setTextColor(107, 114, 128)
    this.doc.text(label.toUpperCase(), MARGIN, this.y)
    this.y += 4
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(9)
    this.doc.setTextColor(17, 24, 39)
    const lines = this.doc.splitTextToSize(value, CONTENT_W)
    for (const line of lines) {
      this.checkPage(5)
      this.doc.text(line, MARGIN, this.y)
      this.y += 4.2
    }
    this.y += 3
  }

  gap(mm = 4) {
    this.y += mm
  }

  vendorRow(label: string, name: string | null | undefined, instagram: string | null | undefined) {
    const n = val(name)
    if (!n || n === 'NA' || n === 'N/A') return
    this.checkPage(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(7)
    this.doc.setTextColor(107, 114, 128)
    this.doc.text(label.toUpperCase(), MARGIN, this.y)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(9.5)
    this.doc.setTextColor(17, 24, 39)
    this.doc.text(n, MARGIN, this.y + 4)
    if (instagram) {
      this.doc.setFontSize(8)
      this.doc.setTextColor(190, 24, 93)
      this.doc.text(instagram, MARGIN + COL_W * 2, this.y + 4)
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
    if (data.name) {
      this.checkPage(8)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(9.5)
      this.doc.setTextColor(17, 24, 39)
      this.doc.text(data.name, MARGIN, this.y)
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

export async function GET(request: Request, { params }: { params: { coupleId: string } }) {
  const { coupleId } = params
  const supabase = getServiceClient()

  const [{ data: form, error: formError }, { data: couple }] = await Promise.all([
    supabase.from('wedding_day_forms').select('*').eq('couple_id', coupleId).single(),
    supabase.from('couples').select('couple_name, wedding_date, package_type').eq('id', coupleId).single(),
  ])

  if (!form || formError) {
    return NextResponse.json({ error: 'No wedding day form found for this couple' }, { status: 404 })
  }

  const coupleName = couple?.couple_name ?? 'Unknown Couple'
  const packageType = couple?.package_type ?? null
  const weddingDate = couple?.wedding_date
    ? format(new Date(couple.wedding_date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')
    : ''

  const pdf = new PdfBuilder()

  // ─── Title ──────────────────────────────────────────────────────────────────
  pdf.doc.setFont('helvetica', 'bold')
  pdf.doc.setFontSize(8)
  pdf.doc.setTextColor(107, 114, 128)
  pdf.doc.text('SIGS PHOTOGRAPHY', MARGIN, pdf.y)
  pdf.y += 6
  pdf.doc.setFontSize(18)
  pdf.doc.setTextColor(17, 24, 39)
  pdf.doc.text(coupleName, MARGIN, pdf.y)
  pdf.y += 6
  if (weddingDate) {
    pdf.doc.setFont('helvetica', 'normal')
    pdf.doc.setFontSize(10)
    pdf.doc.setTextColor(107, 114, 128)
    pdf.doc.text(weddingDate, MARGIN, pdf.y)
    pdf.y += 4
  }
  const weddingCity = (form.reception_city || form.ceremony_city || form.bride_city || '').trim()
  if (weddingCity) {
    pdf.doc.setFont('helvetica', 'normal')
    pdf.doc.setFontSize(9)
    pdf.doc.setTextColor(156, 163, 175)
    pdf.doc.text(`📍 ${weddingCity}`, MARGIN, pdf.y)
    pdf.y += 5
  }
  pdf.doc.setFont('helvetica', 'normal')
  pdf.doc.setFontSize(8)
  pdf.doc.setTextColor(156, 163, 175)
  pdf.doc.text('Wedding Day Form', MARGIN, pdf.y)
  pdf.y += 8

  // Separator
  pdf.doc.setDrawColor(229, 231, 235)
  pdf.doc.setLineWidth(0.3)
  pdf.doc.line(MARGIN, pdf.y, MARGIN + CONTENT_W, pdf.y)
  pdf.y += 6

  // ─── Quick Overview — Day at a Glance ───────────────────────────────────────
  pdf.header('Quick Overview — Day at a Glance')

  // Package type banner
  if (packageType) {
    const isPhotoOnly = packageType === 'photo_only'
    pdf.checkPage(12)
    if (isPhotoOnly) {
      pdf.doc.setFillColor(245, 158, 11) // amber
      pdf.doc.setTextColor(0, 0, 0)
    } else {
      pdf.doc.setFillColor(30, 58, 95) // navy
      pdf.doc.setTextColor(255, 255, 255)
    }
    pdf.doc.roundedRect(MARGIN, pdf.y, CONTENT_W, 9, 2, 2, 'F')
    pdf.doc.setFont('helvetica', 'bold')
    pdf.doc.setFontSize(11)
    const bannerText = isPhotoOnly ? 'PHOTO ONLY' : 'PHOTO & VIDEO'
    const textW = pdf.doc.getTextWidth(bannerText)
    pdf.doc.text(bannerText, MARGIN + (CONTENT_W - textW) / 2, pdf.y + 6.5)
    pdf.y += 13
  }

  // Helper to build timeline row in the PDF
  const timelineRow = (label: string, time: string | null, location?: string | null) => {
    if (!time) return
    pdf.checkPage(10)
    // Dot
    pdf.doc.setFillColor(96, 165, 250)
    pdf.doc.circle(MARGIN + 2, pdf.y + 1, 1.2, 'F')
    // Label + time
    pdf.doc.setFont('helvetica', 'bold')
    pdf.doc.setFontSize(9)
    pdf.doc.setTextColor(17, 24, 39)
    pdf.doc.text(label, MARGIN + 7, pdf.y + 2)
    const labelW = pdf.doc.getTextWidth(label)
    pdf.doc.setFont('helvetica', 'normal')
    pdf.doc.setFontSize(9)
    pdf.doc.setTextColor(75, 85, 99)
    pdf.doc.text(time, MARGIN + 7 + labelW + 3, pdf.y + 2)
    // Location
    if (location) {
      pdf.doc.setFontSize(7.5)
      pdf.doc.setTextColor(156, 163, 175)
      pdf.doc.text(location, MARGIN + 7, pdf.y + 6.5)
      pdf.y += 10
    } else {
      pdf.y += 7
    }
  }

  const scheduleRows = buildScheduleRows(form, packageType)
  for (const row of scheduleRows) {
    timelineRow(row.event, row.time || null, row.location || null)
  }

  // Hours validation
  const { contracted, actualHours, earliestFmt, latestFmt, exceedsBy } = calculateHoursValidation(form)
  if (contracted || actualHours !== null) {
    pdf.checkPage(10)
    const parts: string[] = []
    if (contracted) parts.push(`Contracted: ${contracted} hours`)
    if (actualHours !== null) parts.push(`Actual: ${earliestFmt} \u2192 ${latestFmt} (${actualHours} hours)`)
    pdf.doc.setFont('helvetica', 'normal')
    pdf.doc.setFontSize(8)
    pdf.doc.setTextColor(107, 114, 128)
    pdf.doc.text(parts.join(' | '), MARGIN + 7, pdf.y + 2)
    pdf.y += 6
    if (exceedsBy !== null) {
      pdf.doc.setFont('helvetica', 'bold')
      pdf.doc.setFontSize(8)
      pdf.doc.setTextColor(220, 38, 38)
      pdf.doc.text(`Day exceeds contract by ${exceedsBy} hour${exceedsBy !== 1 ? 's' : ''}`, MARGIN + 7, pdf.y + 2)
      pdf.y += 6
    }
  }
  pdf.gap(2)

  // ─── Emergency Contacts ─────────────────────────────────────────────────────
  pdf.header('Emergency Contacts')
  pdf.fieldRow([['Contact 1', form.emergency_contact_1_name], ['Phone', form.emergency_contact_1_phone]])
  pdf.fieldRow([['Contact 2', form.emergency_contact_2_name], ['Phone', form.emergency_contact_2_phone]])

  // ─── Groom Prep ─────────────────────────────────────────────────────────────
  pdf.header('Groom Prep')
  pdf.locationBlock({
    address: form.groom_address, city: form.groom_city, intersection: form.groom_intersection,
    startTime: formatTime(form.groom_start_time, 'prep'), finishTime: formatTime(form.groom_finish_time, 'prep'),
    phone: form.groom_phone, directions: form.groom_directions,
  })

  // ─── Bride Prep ─────────────────────────────────────────────────────────────
  pdf.header('Bride Prep')
  pdf.locationBlock({
    address: form.bride_address, city: form.bride_city, intersection: form.bride_intersection,
    startTime: formatTime(form.bride_start_time, 'prep'), finishTime: formatTime(form.bride_finish_time, 'prep'),
    phone: form.bride_phone, directions: form.bride_directions,
  })

  // ─── First Look ─────────────────────────────────────────────────────────────
  if (form.has_first_look) {
    pdf.header('First Look')
    pdf.locationBlock({
      name: form.first_look_location_name, address: form.first_look_address, city: form.first_look_city,
      startTime: formatTime(form.first_look_time, 'ceremony'),
    })
  }

  // ─── Ceremony ───────────────────────────────────────────────────────────────
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

  // ─── Park / Photos ──────────────────────────────────────────────────────────
  pdf.header('Park / Photos')
  pdf.locationBlock({
    name: form.park_name, address: form.park_address, city: form.park_city,
    intersection: form.park_intersection, startTime: formatTime(form.park_start_time, 'photos'),
    finishTime: formatTime(form.park_finish_time, 'photos'), directions: form.park_directions,
    extras: [['Park Permit Obtained', form.park_permit_obtained]],
  })

  // ─── Extra Location ─────────────────────────────────────────────────────────
  if (form.extra_location_name) {
    pdf.header('Extra Location')
    pdf.locationBlock({
      name: form.extra_location_name, address: form.extra_address, city: form.extra_city,
      intersection: form.extra_intersection, startTime: formatTime(form.extra_start_time, 'photos'),
      finishTime: formatTime(form.extra_finish_time, 'photos'), directions: form.extra_directions,
    })
    pdf.textBlock('Notes', form.extra_location_notes)
  }

  // ─── Reception ──────────────────────────────────────────────────────────────
  pdf.header('Reception')
  pdf.locationBlock({
    name: form.reception_venue_name, address: form.reception_address, city: form.reception_city,
    intersection: form.reception_intersection, startTime: formatTime(form.reception_start_time, 'reception'),
    finishTime: formatTime(form.reception_finish_time, 'reception_end'), directions: form.reception_directions,
  })

  // ─── Drive Times ────────────────────────────────────────────────────────────
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

  // ─── Vendors ────────────────────────────────────────────────────────────────
  pdf.header('Vendors')
  pdf.vendorRow('Wedding Planner', form.vendor_wedding_planner, form.vendor_wedding_planner_instagram)
  pdf.vendorRow('Officiant', form.vendor_officiant, form.vendor_officiant_instagram)
  pdf.vendorRow('Makeup', form.vendor_makeup, form.vendor_makeup_instagram)
  pdf.vendorRow('Hair', form.vendor_hair, form.vendor_hair_instagram)
  pdf.vendorRow('Floral', form.vendor_floral, form.vendor_floral_instagram)
  pdf.vendorRow('Event Design', form.vendor_event_design, form.vendor_event_design_instagram)
  pdf.vendorRow('DJ / MC', form.vendor_dj_mc, form.vendor_dj_mc_instagram)
  pdf.vendorRow('Transportation', form.vendor_transportation, form.vendor_transportation_instagram)

  // ─── Venue Contact ──────────────────────────────────────────────────────────
  if (form.venue_contact_name || form.venue_contact_phone || form.venue_contact_email) {
    pdf.header('Venue Contact')
    pdf.fieldRow([['Name', form.venue_contact_name], ['Phone', form.venue_contact_phone], ['Email', form.venue_contact_email]])
  }

  // ─── Couple Social ──────────────────────────────────────────────────────────
  if (form.couple_instagram || form.wedding_hashtag) {
    pdf.header('Couple Social')
    pdf.fieldRow([['Instagram', form.couple_instagram], ['Wedding Hashtag', form.wedding_hashtag]])
  }

  // ─── Inspiration ────────────────────────────────────────────────────────────
  const links = [form.inspiration_link_1, form.inspiration_link_2, form.inspiration_link_3, form.inspiration_link_4, form.inspiration_link_5].filter(Boolean)
  if (links.length > 0) {
    pdf.header('Inspiration')
    for (const link of links) {
      pdf.checkPage(6)
      pdf.doc.setFont('helvetica', 'normal')
      pdf.doc.setFontSize(8)
      pdf.doc.setTextColor(37, 99, 235)
      pdf.doc.text(link!, MARGIN, pdf.y)
      pdf.y += 5
    }
    pdf.gap(2)
  }

  // ─── General Info ───────────────────────────────────────────────────────────
  pdf.header('General Info')
  pdf.fieldRow([['Bridal Party Count', form.bridal_party_count]])
  pdf.textBlock('Parent Info', form.parent_info)
  pdf.textBlock('Honeymoon Details', form.honeymoon_details)

  // ─── Notes ──────────────────────────────────────────────────────────────────
  if (form.additional_notes || form.final_notes) {
    pdf.header('Notes')
    pdf.textBlock('Additional Notes', form.additional_notes)
    pdf.textBlock('Final Notes', form.final_notes)
  }

  // ─── Generate ───────────────────────────────────────────────────────────────
  const buffer = Buffer.from(pdf.doc.output('arraybuffer'))
  const safeName = coupleName.replace(/[^a-zA-Z0-9&\s-]/g, '').replace(/\s+/g, '-')

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Wedding-Day-Form-${safeName}.pdf"`,
    },
  })
}
