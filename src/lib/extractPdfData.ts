// pdfjs-dist is loaded dynamically to avoid SSR issues (DOMMatrix not available in Node)

// ============================================================
// TYPES
// ============================================================

export interface ExtractedPdfData {
  fileName: string

  // Couple info
  brideFirstName: string
  brideLastName: string
  groomFirstName: string
  groomLastName: string
  brideEmail: string
  groomEmail: string
  bridePhone: string
  groomPhone: string

  // Wedding details
  weddingDate: string | null       // ISO date string
  weddingDateDisplay: string       // human-readable
  ceremonyVenue: string
  receptionVenue: string
  guestCount: number | null
  bridalPartyCount: number | null

  // Package
  packageType: 'photo_only' | 'photo_video' | null
  packageName: string
  coverageHours: number | null

  // Pricing
  subtotal: number | null
  discount: number | null
  hst: number | null
  total: number | null

  // Derived for couple record
  coupleName: string
  weddingYear: number | null

  // Quality indicators
  parseWarnings: string[]
  confidence: 'high' | 'medium' | 'low'
}

// ============================================================
// TEXT EXTRACTION
// ============================================================

interface TextItem {
  str: string
  x: number
  y: number
  width: number
}

interface TextLine {
  y: number
  items: TextItem[]
  text: string
}

async function extractTextFromPdf(file: File): Promise<TextLine[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const allLines: TextLine[] = []

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    const items: TextItem[] = content.items
      .filter((item: any) => item.str && item.str.trim())
      .map((item: any) => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
      }))

    // Group by Y coordinate (1.5 unit tolerance)
    const lineMap = new Map<number, TextItem[]>()
    for (const item of items) {
      let foundY: number | null = null
      for (const existingY of Array.from(lineMap.keys())) {
        if (Math.abs(existingY - item.y) < 1.5) {
          foundY = existingY
          break
        }
      }
      if (foundY !== null) {
        lineMap.get(foundY)!.push(item)
      } else {
        lineMap.set(item.y, [item])
      }
    }

    // Sort lines top to bottom (descending Y in PDF coords = top to bottom)
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a)
    for (const y of sortedYs) {
      const lineItems = lineMap.get(y)!.sort((a, b) => a.x - b.x)
      // Detect two-column layout: if there's a gap > 50 units between items
      const hasColumnGap = lineItems.some((item, i) => {
        if (i === 0) return false
        return item.x - (lineItems[i - 1].x + lineItems[i - 1].width) > 50
      })

      if (hasColumnGap) {
        // Split into left and right columns
        let splitIdx = 0
        let maxGap = 0
        for (let i = 1; i < lineItems.length; i++) {
          const gap = lineItems[i].x - (lineItems[i - 1].x + lineItems[i - 1].width)
          if (gap > maxGap) {
            maxGap = gap
            splitIdx = i
          }
        }
        const leftItems = lineItems.slice(0, splitIdx)
        const rightItems = lineItems.slice(splitIdx)
        const leftText = leftItems.map(i => i.str).join(' ').trim()
        const rightText = rightItems.map(i => i.str).join(' ').trim()
        // Store as single line with column separator
        allLines.push({
          y,
          items: lineItems,
          text: leftText + ' ||| ' + rightText,
        })
      } else {
        const text = lineItems.map(i => i.str).join(' ').trim()
        allLines.push({ y, items: lineItems, text })
      }
    }
  }

  return allLines
}

// ============================================================
// PARSER
// ============================================================

type Section = 'HEADER' | 'COUPLE_INFO' | 'WEDDING_DETAILS' | 'PACKAGE' | 'TIMELINE' | 'PRICING' | 'PAYMENT' | 'CLOSING'

const SECTION_MARKERS: Record<string, Section> = {
  'COUPLE INFORMATION': 'COUPLE_INFO',
  'WEDDING DETAILS': 'WEDDING_DETAILS',
  'YOUR PACKAGE': 'PACKAGE',
  'WEDDING DAY TIMELINE': 'TIMELINE',
  'PRICING SUMMARY': 'PRICING',
  'PAYMENT SCHEDULE': 'PAYMENT',
}

function parseMoney(str: string): number | null {
  const match = str.match(/\$?([\d,]+\.?\d*)/)
  if (!match) return null
  return parseFloat(match[1].replace(/,/g, ''))
}

function parseWeddingDate(dateStr: string): { iso: string | null; display: string; year: number | null } {
  // Handle formats like "February 16, 2026" or "March 8, 2025"
  const match = dateStr.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/)
  if (!match) return { iso: null, display: dateStr, year: null }

  const monthNames: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  }
  const monthNum = monthNames[match[1].toLowerCase()]
  if (!monthNum) return { iso: null, display: dateStr, year: parseInt(match[3]) }

  const day = match[2].padStart(2, '0')
  const year = parseInt(match[3])
  return {
    iso: `${year}-${monthNum}-${day}`,
    display: dateStr.trim(),
    year,
  }
}

function extractLabelValue(text: string, label: string): string {
  // Match "Label: Value" or "Label : Value"
  const regex = new RegExp(`${label}\\s*:\\s*(.+)`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : ''
}

export async function extractPdfData(file: File): Promise<ExtractedPdfData> {
  const warnings: string[] = []
  const result: ExtractedPdfData = {
    fileName: file.name,
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

  let lines: TextLine[]
  try {
    lines = await extractTextFromPdf(file)
  } catch (e) {
    warnings.push(`Failed to read PDF: ${e instanceof Error ? e.message : 'Unknown error'}`)
    return result
  }

  if (lines.length === 0) {
    warnings.push('PDF appears to be empty or image-based')
    return result
  }

  // Check if this looks like a SIGS PDF
  const allText = lines.map(l => l.text).join(' ')
  if (!allText.includes('SIGS Photography') && !allText.includes('SIGS')) {
    warnings.push('This does not appear to be a SIGS Photography quote PDF')
    return result
  }

  // State machine: walk through lines, detect sections
  let currentSection: Section = 'HEADER'
  const sectionLines: Record<Section, string[]> = {
    HEADER: [], COUPLE_INFO: [], WEDDING_DETAILS: [], PACKAGE: [],
    TIMELINE: [], PRICING: [], PAYMENT: [], CLOSING: [],
  }

  for (const line of lines) {
    const upper = line.text.toUpperCase().trim()

    // Check for section markers
    let matched = false
    for (const [marker, section] of Object.entries(SECTION_MARKERS)) {
      if (upper === marker || upper.startsWith(marker)) {
        currentSection = section
        matched = true
        break
      }
    }

    if (!matched) {
      sectionLines[currentSection].push(line.text)
    }
  }

  // ── Parse COUPLE_INFO ──────────────────────────────────────
  for (const text of sectionLines.COUPLE_INFO) {
    if (text.includes('|||')) {
      const [left, right] = text.split('|||').map(s => s.trim())

      // Bride: FirstName LastName ||| Groom: FirstName LastName
      const brideMatch = left.match(/Bride\s*:\s*(.+)/i)
      const groomMatch = right.match(/Groom\s*:\s*(.+)/i)
      if (brideMatch) {
        const parts = brideMatch[1].trim().split(/\s+/)
        result.brideFirstName = parts[0] || ''
        result.brideLastName = parts.slice(1).join(' ')
      }
      if (groomMatch) {
        const parts = groomMatch[1].trim().split(/\s+/)
        result.groomFirstName = parts[0] || ''
        result.groomLastName = parts.slice(1).join(' ')
      }

      // Email lines (contain @)
      if (left.includes('@') && !left.match(/Bride|Groom/i)) {
        result.brideEmail = left.trim()
        result.groomEmail = right.trim()
      }

      // Phone lines (contain digits with dashes/parens)
      if (left.match(/\d{3}/) && !left.includes('@') && !left.match(/Bride|Groom/i)) {
        result.bridePhone = left.trim()
        result.groomPhone = right.trim()
      }
    } else {
      // Single column fallback
      const brideMatch = text.match(/Bride\s*:\s*(.+)/i)
      const groomMatch = text.match(/Groom\s*:\s*(.+)/i)
      if (brideMatch) {
        const parts = brideMatch[1].trim().split(/\s+/)
        result.brideFirstName = parts[0] || ''
        result.brideLastName = parts.slice(1).join(' ')
      }
      if (groomMatch) {
        const parts = groomMatch[1].trim().split(/\s+/)
        result.groomFirstName = parts[0] || ''
        result.groomLastName = parts.slice(1).join(' ')
      }
      if (text.includes('@') && !text.match(/Bride|Groom/i)) {
        if (!result.brideEmail) result.brideEmail = text.trim()
        else if (!result.groomEmail) result.groomEmail = text.trim()
      }
    }
  }

  // ── Parse WEDDING_DETAILS ──────────────────────────────────
  for (const text of sectionLines.WEDDING_DETAILS) {
    const dateVal = extractLabelValue(text, 'Date')
    if (dateVal) {
      const parsed = parseWeddingDate(dateVal)
      result.weddingDate = parsed.iso
      result.weddingDateDisplay = parsed.display
      result.weddingYear = parsed.year
    }

    const ceremony = extractLabelValue(text, 'Ceremony')
    if (ceremony) result.ceremonyVenue = ceremony

    const reception = extractLabelValue(text, 'Reception')
    if (reception) result.receptionVenue = reception

    const details = extractLabelValue(text, 'Details')
    if (details) {
      const guestMatch = details.match(/(\d+)\s*Guests/i)
      if (guestMatch) result.guestCount = parseInt(guestMatch[1])
      const partyMatch = details.match(/(\d+)\s*Bridal Party/i)
      if (partyMatch) result.bridalPartyCount = parseInt(partyMatch[1])
    }
  }

  // ── Parse PACKAGE ──────────────────────────────────────────
  for (const text of sectionLines.PACKAGE) {
    const upper = text.toUpperCase()
    if (upper.includes('PHOTO ONLY')) {
      result.packageType = 'photo_only'
    } else if (upper.includes('PHOTO AND VIDEO')) {
      result.packageType = 'photo_video'
    }

    // Package name — X hours
    const hoursMatch = text.match(/(.+?)\s*—\s*(\d+)\s*hours/i)
    if (hoursMatch) {
      result.packageName = hoursMatch[1].trim()
      result.coverageHours = parseInt(hoursMatch[2])
    }
  }

  // ── Parse PRICING ──────────────────────────────────────────
  for (const text of sectionLines.PRICING) {
    const upper = text.toUpperCase()

    if (upper.includes('SUBTOTAL') && !upper.includes('DISCOUNT')) {
      result.subtotal = parseMoney(text)
    }
    if (upper.includes('HST')) {
      result.hst = parseMoney(text)
    }
    if (upper.includes('TOTAL') && !upper.includes('SUB') && !upper.includes('HST')) {
      result.total = parseMoney(text)
    }
    if (upper.includes('DISCOUNT')) {
      result.discount = parseMoney(text)
    }
  }

  // ── Construct couple name ──────────────────────────────────
  const brideName = result.brideFirstName || 'Unknown'
  const groomFull = [result.groomFirstName, result.groomLastName].filter(Boolean).join(' ') || 'Unknown'
  result.coupleName = `${brideName} & ${groomFull}`

  // ── Compute confidence ─────────────────────────────────────
  let score = 0
  if (result.brideFirstName) score++
  if (result.groomFirstName) score++
  if (result.weddingDate) score++
  if (result.packageType) score++
  if (result.total) score++
  if (result.ceremonyVenue) score++

  if (!result.brideFirstName && !result.groomFirstName) warnings.push('Could not extract couple names')
  if (!result.weddingDate) warnings.push('Could not extract wedding date')
  if (!result.packageType) warnings.push('Could not determine package type')
  if (!result.total) warnings.push('Could not extract total price')

  if (score >= 5) result.confidence = 'high'
  else if (score >= 3) result.confidence = 'medium'
  else result.confidence = 'low'

  return result
}
