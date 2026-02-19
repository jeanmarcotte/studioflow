import { NextRequest, NextResponse } from 'next/server'
import type { ExtractedPdfData } from '@/lib/extractPdfData'

// ============================================================
// PARSER HELPERS
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
    if (upper.includes(keyword)) return section
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
  return { iso: `${year}-${monthNum}-${day}`, display: dateStr.trim(), year }
}

function extractLabelValue(text: string, label: string): string {
  const regex = new RegExp(`${label}\\s*:?\\s*[:.]?\\s*(.+)`, 'i')
  const match = text.match(regex)
  if (!match) return ''
  return match[1].trim().replace(/^[:.]\s*/, '')
}

function extractNameParts(text: string, label: string): { first: string; last: string } {
  const patterns = [
    new RegExp(`${label}\\s*:\\s*(.+)`, 'i'),
    new RegExp(`${label}\\s+(.+)`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const cleaned = match[1].trim().replace(/^[:.]\s*/, '').trim()
      if (cleaned) {
        const parts = cleaned.split(/\s+/)
        return { first: parts[0] || '', last: parts.slice(1).join(' ') }
      }
    }
  }
  return { first: '', last: '' }
}

// ============================================================
// MAIN PARSER (works with plain text lines from pdf-parse)
// ============================================================

function parseExtractedText(lines: string[], fileName: string): ExtractedPdfData {
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

  const allText = lines.join(' ')
  if (!allText.toUpperCase().includes('SIGS')) {
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
    const detected = detectSection(line)
    if (detected) {
      currentSection = detected
      continue
    }
    if (line.trim()) {
      sectionLines[currentSection].push(line.trim())
    }
  }

  // Log sections for debugging
  for (const [section, slines] of Object.entries(sectionLines)) {
    if (slines.length > 0) {
      console.log(`[PDF API] ${section} (${slines.length} lines):`, slines)
    }
  }

  // ── Parse COUPLE_INFO ──────────────────────────────────────
  // pdf-parse returns each column item on its own line, so bride/groom
  // names appear as separate lines rather than side-by-side columns
  for (const text of sectionLines.COUPLE_INFO) {
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
    if (text.match(/\d{3}[-.\s)]\d{3}/) && !text.match(/bride|groom/i)) {
      if (!result.bridePhone) result.bridePhone = text.trim()
      else if (!result.groomPhone) result.groomPhone = text.trim()
    }
  }

  // ── Parse WEDDING_DETAILS ──────────────────────────────────
  for (const text of sectionLines.WEDDING_DETAILS) {
    if (text.match(/date/i)) {
      const dateVal = extractLabelValue(text, 'Date')
      if (dateVal) {
        const parsed = parseWeddingDate(dateVal)
        result.weddingDate = parsed.iso
        result.weddingDateDisplay = parsed.display
        result.weddingYear = parsed.year
      }
    }
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

  console.log(`[PDF API] Result:`, {
    coupleName: result.coupleName,
    weddingDate: result.weddingDate,
    packageType: result.packageType,
    total: result.total,
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

    console.log(`[PDF API] ${file.name}: ${parsed.numpages} page(s), ${parsed.text.length} chars extracted`)

    // Split into lines and filter empty
    const lines = parsed.text.split('\n').filter((l: string) => l.trim())
    console.log(`[PDF API] ${file.name}: ${lines.length} non-empty lines`)
    lines.forEach((l: string, i: number) => console.log(`  [${i}] "${l}"`))

    const result = parseExtractedText(lines, file.name)

    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    const stack = e instanceof Error ? e.stack : ''
    console.error('[PDF API] Error:', msg)
    console.error('[PDF API] Stack:', stack)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
