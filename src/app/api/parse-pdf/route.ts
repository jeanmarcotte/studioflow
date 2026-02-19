import { NextRequest, NextResponse } from 'next/server'
import { extractText } from 'unpdf'
import Anthropic from '@anthropic-ai/sdk'
import type { ExtractedPdfData } from '@/lib/extractPdfData'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const EXTRACTION_PROMPT = `Extract the following fields from this SIGS Photography wedding contract/quote text and return as JSON:

- bride_first_name
- bride_last_name
- groom_first_name
- groom_last_name
- bride_email
- groom_email
- bride_phone
- groom_phone
- wedding_date (ISO format YYYY-MM-DD)
- wedding_date_display (human readable, e.g. "Saturday August 28, 2027")
- wedding_year (number)
- ceremony_venue
- reception_venue
- guest_count (number or null)
- bridal_party_count (number or null)
- package_type ("photo_only" or "photo_video")
- coverage_hours (number or null)
- subtotal (number or null)
- hst (number or null, the tax amount)
- total (number)
- couple_name (format: "BrideFirst & GroomFirst GroomLast")

If a field cannot be determined, use null for numbers and empty string for text fields.
Look for "Video Included" or "video" in Work Included to determine photo_video vs photo_only.
The contract uses underlines (___) as fill-in blanks — ignore the underlines and extract the actual values.

Return ONLY valid JSON, no explanation or markdown.`

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

    // Step 1: Extract raw text using unpdf (WASM-based, serverless-safe)
    const buffer = await file.arrayBuffer()
    const { text: pages } = await extractText(new Uint8Array(buffer))
    const rawText = (Array.isArray(pages) ? pages.join('\n') : String(pages)).trim()

    console.log(`[PDF API] ${file.name}: ${rawText.length} chars extracted`)

    if (!rawText) {
      return NextResponse.json({
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
        parseWarnings: ['PDF appears to be empty or image-based'],
        confidence: 'low',
      } satisfies ExtractedPdfData)
    }

    // Step 2: Send to Claude for structured extraction
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `${EXTRACTION_PROMPT}\n\nText:\n${rawText}`,
      }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log(`[PDF API] Claude response:`, responseText)

    // Step 3: Parse Claude's JSON response
    // Strip markdown code fences if present
    const jsonStr = responseText.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim()
    const extracted = JSON.parse(jsonStr)

    // Step 4: Map to ExtractedPdfData format
    const warnings: string[] = []

    const result: ExtractedPdfData = {
      fileName: file.name,
      brideFirstName: extracted.bride_first_name || '',
      brideLastName: extracted.bride_last_name || '',
      groomFirstName: extracted.groom_first_name || '',
      groomLastName: extracted.groom_last_name || '',
      brideEmail: extracted.bride_email || '',
      groomEmail: extracted.groom_email || '',
      bridePhone: extracted.bride_phone || '',
      groomPhone: extracted.groom_phone || '',
      weddingDate: extracted.wedding_date || null,
      weddingDateDisplay: extracted.wedding_date_display || '',
      weddingYear: extracted.wedding_year || null,
      ceremonyVenue: extracted.ceremony_venue || '',
      receptionVenue: extracted.reception_venue || '',
      guestCount: extracted.guest_count || null,
      bridalPartyCount: extracted.bridal_party_count || null,
      packageType: extracted.package_type || null,
      packageName: '',
      coverageHours: extracted.coverage_hours || null,
      subtotal: extracted.subtotal || null,
      discount: null,
      hst: extracted.hst || null,
      total: extracted.total || null,
      coupleName: extracted.couple_name || '',
      parseWarnings: warnings,
      confidence: 'low',
    }

    // Compute confidence
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

    console.log(`[PDF API] Final result:`, {
      coupleName: result.coupleName,
      weddingDate: result.weddingDate,
      packageType: result.packageType,
      total: result.total,
      confidence: result.confidence,
    })

    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[PDF API] Error:', msg)
    console.error('[PDF API] Stack:', e instanceof Error ? e.stack : '')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
