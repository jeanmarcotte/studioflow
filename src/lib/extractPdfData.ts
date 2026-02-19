// react-pdf wraps pdfjs-dist and handles worker config; loaded dynamically for SSR safety

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
  const { pdfjs } = await import('react-pdf')
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const allLines: TextLine[] = []

  console.log(`[PDF Extract] ${file.name}: ${doc.numPages} page(s)`)

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()

    console.log(`[PDF Extract] Page ${pageNum}: ${content.items.length} raw items`)

    const items: TextItem[] = content.items
      .filter((item: any) => typeof item.str === 'string' && item.str.trim())
      .map((item: any) => ({
        str: item.str,
        x: item.transform ? item.transform[4] : 0,
        y: item.transform ? item.transform[5] : 0,
        width: item.width || 0,
      }))

    console.log(`[PDF Extract] Page ${pageNum}: ${items.length} text items after filtering`)
    if (items.length > 0) {
      console.log(`[PDF Extract] First 5 items:`, items.slice(0, 5).map(i => `"${i.str}" (x:${i.x.toFixed(1)}, y:${i.y.toFixed(1)}, w:${i.width.toFixed(1)})`))
    }

    // Group by Y coordinate (2.0 unit tolerance for slight vertical offsets)
    const lineMap = new Map<number, TextItem[]>()
    for (const item of items) {
      let foundY: number | null = null
      for (const existingY of Array.from(lineMap.keys())) {
        if (Math.abs(existingY - item.y) < 2.0) {
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

      // Detect two-column layout: if there's a gap > 30 units between items
      let splitIdx = -1
      let maxGap = 30 // minimum gap to consider as column split
      for (let i = 1; i < lineItems.length; i++) {
        const prevEnd = lineItems[i - 1].x + Math.max(lineItems[i - 1].width, 1)
        const gap = lineItems[i].x - prevEnd
        if (gap > maxGap) {
          maxGap = gap
          splitIdx = i
        }
      }

      if (splitIdx > 0) {
        const leftItems = lineItems.slice(0, splitIdx)
        const rightItems = lineItems.slice(splitIdx)
        const leftText = leftItems.map(i => i.str).join('').trim()
        const rightText = rightItems.map(i => i.str).join('').trim()
        allLines.push({
          y,
          items: lineItems,
          text: leftText + ' ||| ' + rightText,
        })
      } else {
        // Join without extra spaces — pdfjs items often already include spacing
        const text = lineItems.map(i => i.str).join('').trim()
        allLines.push({ y, items: lineItems, text })
      }
    }
  }

  console.log(`[PDF Extract] Total lines extracted: ${allLines.length}`)
  if (allLines.length > 0) {
    console.log(`[PDF Extract] All lines:`)
    allLines.forEach((l, i) => console.log(`  [${i}] "${l.text}"`))
  }

  return allLines
}

// ============================================================
// PARSER
// ============================================================

type Section = 'HEADER' | 'COUPLE_INFO' | 'WEDDING_DETAILS' | 'PACKAGE' | 'TIMELINE' | 'PRICING' | 'PAYMENT' | 'CLOSING'

const SECTION_KEYWORDS: Array<{ keyword: string; section: Section }> = [
  { keyword: 'COUPLE INFORMATION', section: 'COUPLE_INFO' },
  { keyword: 'WEDDING DETAILS', section: 'WEDDING_DETAILS' },
  { keyword: 'YOUR PACKAGE', section: 'PACKAGE' },
  { keyword: 'WEDDING DAY TIMELINE', section: 'TIMELINE' },
  { keyword: 'PRICING SUMMARY', section: 'PRICING' },
  { keyword: 'PAYMENT SCHEDULE', section: 'PAYMENT' },
]

function detectSection(lineText: string): Section | null {
  const upper = lineText.toUpperCase().replace(/\s+/g, ' ').trim()
  for (const { keyword, section } of SECTION_KEYWORDS) {
    if (upper.includes(keyword)) {
      return section
    }
  }
  return null
}

function parseMoney(str: string): number | null {
  const match = str.match(/\$?([\d,]+\.?\d*)/)
  if (!match) return null
  return parseFloat(match[1].replace(/,/g, ''))
}

function parseWeddingDate(dateStr: string): { iso: string | null; display: string; year: number | null } {
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
  // Handle cases where colon may be separate or attached: "Bride: Jane" or "Bride : Jane" or "Bride:Jane"
  const regex = new RegExp(`${label}\\s*:?\\s*[:.]?\\s*(.+)`, 'i')
  const match = text.match(regex)
  if (!match) return ''
  // Clean up the captured value
  let val = match[1].trim()
  // Remove leading colon/dot if label regex didn't consume it
  val = val.replace(/^[:.]\s*/, '')
  return val
}

function extractNameParts(text: string, label: string): { first: string; last: string } {
  // Try multiple patterns for "Bride: FirstName LastName"
  // Pattern 1: "Bride: First Last" (colon attached)
  // Pattern 2: "Bride : First Last" (colon separated)
  // Pattern 3: "Bride:First Last" (no space after colon)
  const patterns = [
    new RegExp(`${label}\\s*:\\s*(.+)`, 'i'),
    new RegExp(`${label}\\s+(.+)`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const fullName = match[1].trim()
      // Remove any leading colon or punctuation
      const cleaned = fullName.replace(/^[:.]\s*/, '').trim()
      if (cleaned) {
        const parts = cleaned.split(/\s+/)
        return { first: parts[0] || '', last: parts.slice(1).join(' ') }
      }
    }
  }
  return { first: '', last: '' }
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
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error(`[PDF Extract] FAILED to read ${file.name}:`, e)
    warnings.push(`Failed to read PDF: ${msg}`)
    return result
  }

  if (lines.length === 0) {
    console.warn(`[PDF Extract] ${file.name}: No text lines extracted`)
    warnings.push('PDF appears to be empty or image-based')
    return result
  }

  // Check if this looks like a SIGS PDF
  const allText = lines.map(l => l.text).join(' ')
  if (!allText.toUpperCase().includes('SIGS')) {
    console.warn(`[PDF Extract] ${file.name}: No 'SIGS' found in text`)
    warnings.push('This does not appear to be a SIGS Photography quote PDF')
    return result
  }

  console.log(`[PDF Parse] ${file.name}: Detected as SIGS PDF, parsing sections...`)

  // State machine: walk through lines, detect sections
  let currentSection: Section = 'HEADER'
  const sectionLines: Record<Section, string[]> = {
    HEADER: [], COUPLE_INFO: [], WEDDING_DETAILS: [], PACKAGE: [],
    TIMELINE: [], PRICING: [], PAYMENT: [], CLOSING: [],
  }

  for (const line of lines) {
    const detected = detectSection(line.text)
    if (detected) {
      currentSection = detected
      console.log(`[PDF Parse] Section: ${currentSection} (from: "${line.text}")`)
      continue // don't add the section header line itself to content
    }
    sectionLines[currentSection].push(line.text)
  }

  // Log section contents
  for (const [section, slines] of Object.entries(sectionLines)) {
    if (slines.length > 0) {
      console.log(`[PDF Parse] ${section} (${slines.length} lines):`, slines)
    }
  }

  // ── Parse COUPLE_INFO ──────────────────────────────────────
  for (const text of sectionLines.COUPLE_INFO) {
    if (text.includes('|||')) {
      const parts = text.split('|||').map(s => s.trim())
      const left = parts[0] || ''
      const right = parts[1] || ''

      // Check for Bride/Groom names
      if (left.match(/bride/i) || right.match(/groom/i)) {
        const bride = extractNameParts(left, 'Bride')
        const groom = extractNameParts(right, 'Groom')
        if (bride.first) { result.brideFirstName = bride.first; result.brideLastName = bride.last }
        if (groom.first) { result.groomFirstName = groom.first; result.groomLastName = groom.last }
      }
      // Email lines (contain @)
      else if (left.includes('@') || right.includes('@')) {
        if (left.includes('@')) result.brideEmail = left
        if (right.includes('@')) result.groomEmail = right
      }
      // Phone lines
      else if (left.match(/\d{3}[-.\s)]\d{3}/)) {
        result.bridePhone = left
        result.groomPhone = right
      }
    } else {
      // Single-column lines
      if (text.match(/bride/i)) {
        const bride = extractNameParts(text, 'Bride')
        if (bride.first) { result.brideFirstName = bride.first; result.brideLastName = bride.last }
      }
      if (text.match(/groom/i)) {
        const groom = extractNameParts(text, 'Groom')
        if (groom.first) { result.groomFirstName = groom.first; result.groomLastName = groom.last }
      }
      if (text.includes('@') && !text.match(/bride|groom/i)) {
        if (!result.brideEmail) result.brideEmail = text.trim()
        else if (!result.groomEmail) result.groomEmail = text.trim()
      }
    }
  }

  // ── Parse WEDDING_DETAILS ──────────────────────────────────
  for (const text of sectionLines.WEDDING_DETAILS) {
    // Date - try label:value first, then scan for date pattern anywhere
    if (text.match(/date/i)) {
      const dateVal = extractLabelValue(text, 'Date')
      if (dateVal) {
        const parsed = parseWeddingDate(dateVal)
        result.weddingDate = parsed.iso
        result.weddingDateDisplay = parsed.display
        result.weddingYear = parsed.year
      }
    }
    // Also scan for date pattern in any line (fallback)
    if (!result.weddingDate) {
      const datePattern = text.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/)
      if (datePattern) {
        const parsed = parseWeddingDate(datePattern[0])
        if (parsed.iso) {
          result.weddingDate = parsed.iso
          result.weddingDateDisplay = parsed.display
          result.weddingYear = parsed.year
        }
      }
    }

    if (text.match(/ceremony/i)) {
      const ceremony = extractLabelValue(text, 'Ceremony')
      if (ceremony) result.ceremonyVenue = ceremony
    }

    if (text.match(/reception/i)) {
      const reception = extractLabelValue(text, 'Reception')
      if (reception) result.receptionVenue = reception
    }

    if (text.match(/details/i)) {
      const details = extractLabelValue(text, 'Details')
      if (details) {
        const guestMatch = details.match(/(\d+)\s*Guests/i)
        if (guestMatch) result.guestCount = parseInt(guestMatch[1])
        const partyMatch = details.match(/(\d+)\s*Bridal Party/i)
        if (partyMatch) result.bridalPartyCount = parseInt(partyMatch[1])
      }
    }
  }

  // ── Parse PACKAGE ──────────────────────────────────────────
  for (const text of sectionLines.PACKAGE) {
    const upper = text.toUpperCase()
    if (upper.includes('PHOTO ONLY')) {
      result.packageType = 'photo_only'
    } else if (upper.includes('PHOTO AND VIDEO') || upper.includes('PHOTO+VIDEO') || upper.includes('PHOTO & VIDEO')) {
      result.packageType = 'photo_video'
    }

    // Package name — X hours (the em dash may render as different characters)
    const hoursMatch = text.match(/(.+?)\s*[—–\-]\s*(\d+)\s*hours/i)
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
    // TOTAL line — must have TOTAL but not SUBTOTAL or HST
    if (upper.includes('TOTAL') && !upper.includes('SUB') && !upper.includes('HST')) {
      const money = parseMoney(text)
      if (money) result.total = money
    }
    if (upper.includes('DISCOUNT')) {
      result.discount = parseMoney(text)
    }
  }

  // ── Construct couple name ──────────────────────────────────
  const brideName = result.brideFirstName || ''
  const groomFull = [result.groomFirstName, result.groomLastName].filter(Boolean).join(' ')
  if (brideName && groomFull) {
    result.coupleName = `${brideName} & ${groomFull}`
  } else if (brideName) {
    result.coupleName = brideName
  } else if (groomFull) {
    result.coupleName = groomFull
  }
  // coupleName stays empty if nothing was extracted — importer will block this

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

  console.log(`[PDF Parse] ${file.name}: Result —`, {
    coupleName: result.coupleName,
    weddingDate: result.weddingDate,
    packageType: result.packageType,
    total: result.total,
    confidence: result.confidence,
    warnings,
  })

  return result
}
