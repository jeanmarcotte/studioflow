import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function checkPin(request: NextRequest): boolean {
  const pin = request.headers.get('x-admin-pin')
  return pin === '3991'
}

export async function POST(request: NextRequest) {
  if (!checkPin(request)) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const body = await request.json()
  const { image, action, ballot, show_id } = body

  // Action: "save" = save ballot to Supabase
  if (action === 'save') {
    if (!ballot) {
      return NextResponse.json({ error: 'No ballot data' }, { status: 400 })
    }
    const supabase = getServiceClient()
    const { error } = await supabase
      .from('ballots')
      .insert([{
        bride_first_name: ballot.bride_first_name,
        bride_last_name: ballot.bride_last_name || null,
        groom_first_name: ballot.groom_first_name || null,
        groom_last_name: ballot.groom_last_name || null,
        wedding_date: ballot.wedding_date || null,
        cell_phone: ballot.cell_phone,
        email: ballot.email || null,
        venue_name: ballot.venue_name || null,
        guest_count: ballot.guest_count || null,
        has_photographer: ballot.has_photographer ?? false,
        has_videographer: ballot.has_videographer ?? false,
        has_venue: (() => {
          const v = (ballot.venue_name || '').trim().toLowerCase()
          const meaningless = ['', 'na', 'n/a', 'none', 'no', '-', 'tbd', 'unknown', 'not sure', 'not sure yet', '?', '??', '???', 'house']
          return !meaningless.includes(v)
        })(),
        entry_method: 'scan',
        status: 'new',
        show_id: show_id || null,
      }])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // Action: "scan" - process image with Claude Vision
  if (!image) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  try {
    let mediaType = 'image/jpeg'
    if (image.startsWith('data:')) {
      const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,/)
      if (match) mediaType = match[1]
    }
    const base64Data = image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `Extract the following fields from this SIGS Photography bridal show ballot/entry form. Return ONLY valid JSON with these exact keys:

{
  "bride_first_name": "",
  "bride_last_name": "",
  "groom_first_name": "",
  "groom_last_name": "",
  "wedding_date": "",
  "cell_phone": "",
  "email": "",
  "venue_name": "",
  "guest_count": null,
  "has_photographer": false,
  "has_videographer": false,
  "has_venue": false
}

Rules:
- wedding_date should be YYYY-MM-DD format if you can determine it, otherwise best guess
- cell_phone should include area code, formatted as (XXX) XXX-XXXX
- email should be the email address if present on the form
- guest_count should be a number or null if not provided
- has_photographer, has_videographer, has_venue are booleans based on yes/no checkboxes or answers
- If a field is unclear or missing, use empty string "" for text fields, null for numbers, false for booleans
- Return ONLY the JSON object, no markdown, no explanation`,
            },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Claude API error:', response.status, errBody)
      return NextResponse.json(
        { error: `AI processing failed (${response.status}): ${errBody.slice(0, 200)}` },
        { status: 500 }
      )
    }

    const result = await response.json()
    const textContent = result.content?.find((c: { type: string }) => c.type === 'text')?.text || ''

    let extracted
    try {
      const jsonStr = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      extracted = JSON.parse(jsonStr)
    } catch {
      console.error('Failed to parse Claude response:', textContent)
      return NextResponse.json({ error: 'Could not parse AI response', raw: textContent }, { status: 422 })
    }

    return NextResponse.json(extracted)
  } catch (err) {
    console.error('Scan error:', err)
    return NextResponse.json({ error: `Processing failed: ${err}` }, { status: 500 })
  }
}
