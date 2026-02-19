import { NextRequest, NextResponse } from 'next/server'
import type { ExtractedPdfData } from '@/lib/extractPdfData'

// ============================================================
// SIGS CONTRACT PDF PARSER
// ============================================================
// These PDFs follow a consistent fill-in-the-blank contract template:
//
// Page 1:
//   "Wedding Date:" → next non-blank line has "___DAY_ Month DDth, YYYY___"
//   "Bride's Name:" → "___FirstName LastName___"
//   "Email:" (after bride) → email address
//   "Cell:" (after bride) → phone
//   "Groom's Name:" → "___FirstName LastName___"
//   "Hours:" → "__Xam/pm___ to __Yam/pm___"
//
// Page 2:
//   "Subtotal ___$X___Tax ___$Y___  Total __$Z___"
//   "# of guests __N___  # of BP____N___  Flower Girl ___ Ring Boy ___"
//   "Ceremony Location ___NAME___Venue Name : __NAME___"
//
// The parser uses regex to extract values from the underline-delimited fields.
// ============================================================

function cleanUnderlines(str: string): string {
  return str.replace(/_+/g, '').trim()
}

function extractBetweenUnderlines(str: string): string {
  // Match content between underline groups: ___VALUE___
  const match = str.match(/_+([^_]+?)_+/)
  if (match) return match[1].trim()
  return ''
}

function parseMoney(str: string): number | null {
  const match = str.match(/\$\s*([\d,]+\.?\d*)/)
  if (!match) return null
  return parseFloat(match[1].replace(/,/g, ''))
}

function parseContractDate(dateStr: string): { iso: string | null; display: string; year: number | null } {
  // Matches: "SATURDAY_ August 28th, 2027" or "SUNDAY_ Aug 2nd, 2026" etc.
  const cleaned = cleanUnderlines(dateStr)

  // Try full month name first: "August 28th, 2027" or "Aug 28, 2027"
  const match = cleaned.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/)
  if (!match) return { iso: null, display: cleaned, year: null }

  const monthNames: Record<string, string> = {
    jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
    apr: '04', april: '04', may: '05', jun: '06', june: '06',
    jul: '07', july: '07', aug: '08', august: '08', sep: '09', september: '09',
    oct: '10', october: '10', nov: '11', november: '11', dec: '12', december: '12',
  }
  const monthNum = monthNames[match[1].toLowerCase()]
  if (!monthNum) return { iso: null, display: cleaned, year: parseInt(match[3]) }

  const day = match[2].padStart(2, '0')
  const year = parseInt(match[3])
  return { iso: `${year}-${monthNum}-${day}`, display: cleaned, year }
}

function parseContractText(lines: string[], fileName: string): ExtractedPdfData {
  const warnings: string[] = []
  const result: ExtractedPdfData = {
    fileName,
    brideFirstName: '', brideLastName: '',
    groomFirstName: '', groomLastName: '',
    brideEmail: '', groomEmail: '',
    bridePhone: '', groomPhone: '',
    weddingDate: null, weddingDateDisplay: '',
    ceremonyVenue: '', receptionVenue: '',
    guestCount: null, bridalPartyCount: null,
    packageType: null, packageName: '', coverageHours: null,
    subtotal: null, discount: null, hst: null, total: null,
    coupleName: '', weddingYear: null,
    parseWarnings: warnings,
    confidence: 'low',
  }

  if (lines.length === 0) {
    warnings.push('PDF appears to be empty or image-based')
    return result
  }

  const allText = lines.join(' ').toUpperCase()
  if (!allText.includes('SIGS')) {
    warnings.push('This does not appear to be a SIGS Photography PDF')
    return result
  }

  // Walk through all lines, matching known patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lineUp = line.toUpperCase()

    // ── Wedding / Event Date ──
    // Pattern: line says "Wedding Date:" or "Event Date:" then next non-blank line has the date
    if ((lineUp.includes('WEDDING DATE') || lineUp.includes('EVENT DATE')) && !result.weddingDate) {
      // Check this line and next few lines for a date
      for (let j = i; j < Math.min(i + 3, lines.length); j++) {
        const dateLine = cleanUnderlines(lines[j])
        const parsed = parseContractDate(dateLine)
        if (parsed.iso) {
          result.weddingDate = parsed.iso
          result.weddingDateDisplay = parsed.display
          result.weddingYear = parsed.year
          break
        }
      }
    }

    // ── Bride's Name ──
    if (lineUp.includes("BRIDE'S NAME") || lineUp.includes('BRIDE\u2019S NAME')) {
      const cleaned = cleanUnderlines(line.replace(/Bride[\u2019']?s\s*Name\s*:?\s*/i, ''))
      if (cleaned) {
        const parts = cleaned.split(/\s+/)
        result.brideFirstName = parts[0] || ''
        result.brideLastName = parts.slice(1).join(' ')
      }
      // If name got split across lines, check next line
      if (!result.brideFirstName && i + 1 < lines.length) {
        const nextCleaned = cleanUnderlines(lines[i + 1])
        if (nextCleaned && !nextCleaned.match(/address|email|cell|groom/i)) {
          const parts = nextCleaned.split(/\s+/)
          result.brideFirstName = parts[0] || ''
          result.brideLastName = parts.slice(1).join(' ')
        }
      }
    }

    // ── Groom's Name ──
    if (lineUp.includes("GROOM'S NAME") || lineUp.includes('GROOM\u2019S NAME')) {
      const cleaned = cleanUnderlines(line.replace(/Groom[\u2019']?s\s*Name\s*:?\s*/i, ''))
      if (cleaned) {
        const parts = cleaned.split(/\s+/)
        result.groomFirstName = parts[0] || ''
        result.groomLastName = parts.slice(1).join(' ')
      }
    }

    // ── Email (first one = bride, second = groom) ──
    // Clean underlines before matching to avoid "___email@domain.com___" issues
    const cleanedForEmail = line.replace(/_+/g, ' ').trim()
    const emailMatch = cleanedForEmail.match(/[\w.-]+@[\w.-]+\.\w+/)
    if (emailMatch) {
      const email = emailMatch[0]
      if (email !== 'info@sigsphoto.ca') {
        if (!result.brideEmail) result.brideEmail = email
        else if (!result.groomEmail) result.groomEmail = email
      }
    }

    // ── Cell phone (after email lines) ──
    if (lineUp.includes('CELL') && !lineUp.includes('CANCEL')) {
      const phoneMatch = line.match(/(\d{3}[-.\s)]\d{3}[-.\s]\d{4})/)
      if (phoneMatch) {
        if (!result.bridePhone) result.bridePhone = phoneMatch[1]
        else if (!result.groomPhone) result.groomPhone = phoneMatch[1]
      }
    }

    // ── Hours (coverage time) ──
    if (lineUp.includes('HOURS:') || lineUp.includes('HOURS :')) {
      const hoursMatch = line.match(/Hours\s*:\s*_*(\d{1,2}\s*(?:am|pm)?)\s*_*\s*to\s*_*(\d{1,2}\s*(?:am|pm)?)/i)
      if (hoursMatch) {
        const startH = parseInt(hoursMatch[1])
        const endH = parseInt(hoursMatch[2])
        // Rough coverage hours calculation
        const start = hoursMatch[1].toLowerCase().includes('pm') && startH !== 12 ? startH + 12 : startH
        const end = hoursMatch[2].toLowerCase().includes('pm') && endH !== 12 ? endH + 12 : endH
        if (end > start) {
          result.coverageHours = end - start
        }
      }
    }

    // ── Work Included (detect photo+video vs photo only) ──
    if (lineUp.includes('WORK INCLUDED')) {
      if (lineUp.includes('VIDEO') || line.match(/\d+\s*video/i)) {
        result.packageType = 'photo_video'
      } else {
        result.packageType = 'photo_only'
      }
    }
    // Also check "Video    Included" line
    if (lineUp.match(/^VIDEO\s+INCLUDED/)) {
      result.packageType = 'photo_video'
    }

    // ── Subtotal / Tax / Total (all on one line) ──
    if (lineUp.includes('SUBTOTAL') && lineUp.includes('TOTAL')) {
      // Clean underlines first so "$4200" isn't buried in "___$4200___"
      const cleanedLine = line.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim()
      const subtotalMatch = cleanedLine.match(/Subtotal\s*\$?([\d,]+\.?\d*)/i)
      // Match Total NOT preceded by "Sub" to avoid Subtotal matching
      const totalMatch = cleanedLine.match(/(?:^|[^b])Total\s*\$?([\d,]+\.?\d*)/i)
      const taxMatch = cleanedLine.match(/Tax\s*\$?([\d,]+\.?\d*)/i)

      if (subtotalMatch) result.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''))
      if (totalMatch) result.total = parseFloat(totalMatch[1].replace(/,/g, ''))
      if (taxMatch) result.hst = parseFloat(taxMatch[1].replace(/,/g, ''))
    }

    // ── Guests / Bridal Party / Flower Girl / Ring Boy ──
    if (lineUp.includes('# OF GUESTS') || lineUp.includes('#OF GUESTS')) {
      const guestMatch = line.match(/#\s*of\s*guests\s*_*(\d+)/i)
      if (guestMatch) result.guestCount = parseInt(guestMatch[1])

      const bpMatch = line.match(/#\s*of\s*BP\s*_*(\d+)/i)
      if (bpMatch) result.bridalPartyCount = parseInt(bpMatch[1])
    }

    // ── Ceremony Location / Venue Name ──
    if (lineUp.includes('CEREMONY LOCATION') || lineUp.includes('VENUE NAME')) {
      const ceremonyMatch = line.match(/Ceremony\s*Location\s*_*([^_]*[A-Za-z][^_]*?)_*\s*(?:Venue|$)/i)
      if (ceremonyMatch) {
        result.ceremonyVenue = ceremonyMatch[1].trim()
      }

      const venueMatch = line.match(/Venue\s*Name\s*:?\s*_*([^_]*[A-Za-z][^_]*?)_*\s*(?:DJ|Planner|$)/i)
      if (venueMatch) {
        result.receptionVenue = venueMatch[1].trim()
      }
    }
  }

  // ── Construct couple name ──
  const brideName = result.brideFirstName || ''
  const groomFull = [result.groomFirstName, result.groomLastName].filter(Boolean).join(' ')
  if (brideName && groomFull) {
    result.coupleName = `${brideName} & ${groomFull}`
  } else if (brideName) {
    result.coupleName = brideName
  } else if (groomFull) {
    result.coupleName = groomFull
  }

  // ── Compute confidence ──
  let score = 0
  if (result.brideFirstName) score++
  if (result.groomFirstName) score++
  if (result.weddingDate) score++
  if (result.packageType) score++
  if (result.total) score++
  if (result.ceremonyVenue || result.receptionVenue) score++

  if (!result.brideFirstName && !result.groomFirstName) warnings.push('Could not extract couple names')
  if (!result.weddingDate) warnings.push('Could not extract wedding date')
  if (!result.total) warnings.push('Could not extract total price')

  if (score >= 5) result.confidence = 'high'
  else if (score >= 3) result.confidence = 'medium'
  else result.confidence = 'low'

  console.log(`[PDF API] Result:`, {
    coupleName: result.coupleName,
    weddingDate: result.weddingDate,
    packageType: result.packageType,
    total: result.total,
    coverageHours: result.coverageHours,
    ceremonyVenue: result.ceremonyVenue,
    receptionVenue: result.receptionVenue,
    confidence: result.confidence,
    warnings,
  })

  return result
}

// ============================================================
// API ROUTE HANDLER
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    console.log(`[PDF API] Processing: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)

    const buffer = await file.arrayBuffer()

    // Use pdf-parse v1 (pure Node.js, no DOM dependencies)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ numpages: number; text: string }>
    const parsed = await pdfParse(Buffer.from(buffer))

    console.log(`[PDF API] ${file.name}: ${parsed.numpages} page(s), ${parsed.text.length} chars`)

    // Split into lines
    const lines = parsed.text.split('\n')
    const nonEmpty = lines.filter((l: string) => l.trim())
    console.log(`[PDF API] ${file.name}: ${nonEmpty.length} non-empty lines`)
    nonEmpty.forEach((l: string, i: number) => console.log(`  [${i}] "${l.trim()}"`))

    const result = parseContractText(nonEmpty, file.name)

    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    const stack = e instanceof Error ? e.stack : ''
    console.error('[PDF API] Error:', msg)
    console.error('[PDF API] Stack:', stack)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
