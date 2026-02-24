import { NextRequest, NextResponse } from 'next/server'
import { extractText } from 'unpdf'
import Anthropic from '@anthropic-ai/sdk'
import type { ExtractedExtrasData } from '@/lib/extractExtrasPdfData'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const EXTRACTION_PROMPT = `Extract the following from this SIGS Photography "Frames & Album" extras quote PDF and return as JSON:

- couple_name: The couple's names (e.g. "Amanda & Justin Kong")
- items: Array of objects, each with:
  - name: Item name (e.g. "Wedding Collage", "28x11 Digital Album", "Wedding Frame 24x30")
  - description: Item details (size, material, specs — e.g. "Leather with acrylic window, matt paper, 80 photos, 15 spreads")
  - price: Individual item price as number, or null if not listed separately
- inclusions: Array of strings for included services (e.g. "Engagement proof files via Dropbox", "Online proofing gallery", "Hi-res wedding files 16x24 300dpi")
- total: Total price as number (look for "Total", "Package Total", "Grand Total")
- remaining_balance: Remaining balance as number, or null if not listed
- payment_schedule: Array of objects with { milestone: string, amount: number }, or null if not listed. Look for payment milestones like "50% on booking", "50% before wedding"

Items are physical products like frames, albums, collages, portraits, digital files.
Inclusions are services or digital deliverables included in the package.
Do NOT include inclusions in the items array — they are separate.

If a field cannot be determined, use null for numbers and empty arrays for lists.
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

    console.log(`[Extras PDF API] Processing: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)

    // Step 1: Extract raw text using unpdf (WASM-based, serverless-safe)
    const buffer = await file.arrayBuffer()
    const { text: pages } = await extractText(new Uint8Array(buffer))
    const rawText = (Array.isArray(pages) ? pages.join('\n') : String(pages)).trim()

    console.log(`[Extras PDF API] ${file.name}: ${rawText.length} chars extracted`)

    if (!rawText) {
      return NextResponse.json({
        coupleName: '',
        items: [],
        inclusions: [],
        total: null,
        remainingBalance: null,
        paymentSchedule: null,
        parseWarnings: ['PDF appears to be empty or image-based'],
        confidence: 'low',
      } satisfies ExtractedExtrasData)
    }

    // Step 2: Send to Claude for structured extraction
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `${EXTRACTION_PROMPT}\n\nText:\n${rawText}`,
      }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log(`[Extras PDF API] Claude response:`, responseText)

    // Step 3: Parse Claude's JSON response
    const jsonStr = responseText.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim()
    const extracted = JSON.parse(jsonStr)

    // Step 4: Map to ExtractedExtrasData format
    const warnings: string[] = []

    const items = Array.isArray(extracted.items) ? extracted.items.map((item: any) => ({
      name: item.name || '',
      description: item.description || '',
      price: typeof item.price === 'number' ? item.price : null,
    })) : []

    const inclusions = Array.isArray(extracted.inclusions) ? extracted.inclusions.filter((s: any) => typeof s === 'string') : []

    const result: ExtractedExtrasData = {
      coupleName: extracted.couple_name || '',
      items,
      inclusions,
      total: typeof extracted.total === 'number' ? extracted.total : null,
      remainingBalance: typeof extracted.remaining_balance === 'number' ? extracted.remaining_balance : null,
      paymentSchedule: Array.isArray(extracted.payment_schedule) ? extracted.payment_schedule : null,
      parseWarnings: warnings,
      confidence: 'low',
    }

    // Compute confidence
    let score = 0
    if (result.coupleName) score++
    if (result.items.length > 0) score++
    if (result.items.length >= 3) score++
    if (result.total) score++
    if (result.inclusions.length > 0) score++

    if (!result.coupleName) warnings.push('Could not extract couple name')
    if (result.items.length === 0) warnings.push('Could not extract any items')
    if (!result.total) warnings.push('Could not extract total price')

    if (score >= 4) result.confidence = 'high'
    else if (score >= 2) result.confidence = 'medium'
    else result.confidence = 'low'

    console.log(`[Extras PDF API] Final result:`, {
      coupleName: result.coupleName,
      itemCount: result.items.length,
      total: result.total,
      confidence: result.confidence,
    })

    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[Extras PDF API] Error:', msg)
    console.error('[Extras PDF API] Stack:', e instanceof Error ? e.stack : '')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
