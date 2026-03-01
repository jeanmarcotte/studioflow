import { NextRequest, NextResponse } from 'next/server'
import { extractText } from 'unpdf'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const EXTRACTION_PROMPT = `You are extracting structured data from a SIGS Photography wedding contract PDF. The PDF has 3-4 pages:
- Page 1: Couple info, wedding date/time, locations, engagement, deliverables (prints, albums, video, web)
- Page 2: Photographer name, installment schedule, subtotal/tax/total, appointment notes
- Page 3: Terms & conditions (IGNORE entirely)
- Page 4: Adobe Sign audit trail with signature date, email, IP address

PARSING RULES:
- Checkmarks (✓ or __✓__) mean true. Blank, unchecked, or n/a means false.
- Print quantities: patterns like "11x14__1___" or "11 x 14 ___1___" mean that print size has quantity 1. A blank or 0 means 0.
- Albums: "Parents (2) Size: __10x8__" means qty=2, size="10x8". Parse spreads, images, and cover type similarly.
- Video highlights: a number like "10" next to "highlights" means video_highlights=10.
- "Jean Marcotte is the photographer" means photographer="Jean Marcotte". Similar pattern for videographer.
- USB/Dropbox delivery is ALWAYS true.
- Installments: if a due description has a specific date like "December 1st 2024", convert to ISO date (2024-12-01). Event-based ones like "Engagement Photo session" get due_date=null.
- Signature info comes from the Adobe Sign audit trail on the last page. Extract signer name, email, signed timestamp, and IP address.
- Appointment notes are free-form text, usually at the bottom of page 2.
- For wedding_date, convert to ISO format (YYYY-MM-DD).
- For start_time and end_time, use the format found in the document (e.g. "2:00 PM").

Return ONLY valid JSON matching this exact structure (no explanation, no markdown fences):

{
  "couple": {
    "bride_first_name": "",
    "bride_last_name": "",
    "groom_first_name": "",
    "groom_last_name": "",
    "email": "",
    "phone": ""
  },
  "wedding": {
    "wedding_date": "",
    "start_time": "",
    "end_time": ""
  },
  "locations": {
    "loc_groom": false,
    "loc_bride": false,
    "loc_ceremony": false,
    "loc_park": false,
    "loc_reception": false
  },
  "engagement": {
    "engagement_session": false,
    "engagement_location": "",
    "engagement_notes": ""
  },
  "photos": {
    "usb_dropbox_delivery": true,
    "prints_postcard_thankyou": 0,
    "prints_5x7": 0,
    "prints_8x10": 0,
    "prints_11x14": 0,
    "prints_16x16": 0,
    "prints_16x20": 0,
    "prints_20x24": 0,
    "prints_24x30": 0,
    "prints_30x40": 0,
    "post_production": false,
    "drone_photography": false
  },
  "albums": {
    "parent_albums_qty": 0,
    "parent_albums_size": "",
    "parent_albums_spreads": 0,
    "parent_albums_images": 0,
    "parent_albums_cover": "",
    "bride_groom_album_qty": 0,
    "bride_groom_album_size": "",
    "bride_groom_album_spreads": 0,
    "bride_groom_album_images": 0,
    "bride_groom_album_cover": ""
  },
  "video": {
    "video_digital_titles": false,
    "video_after_effects": false,
    "video_baby_pictures": false,
    "video_dating_pictures": false,
    "video_honeymoon_pictures": false,
    "video_invitation": false,
    "video_music": false,
    "video_end_credits": false,
    "video_recap": false,
    "video_hd": false,
    "video_sd": false,
    "video_gopro": false,
    "video_drone": false,
    "video_led_lights": false,
    "video_proof": false,
    "video_usb": false,
    "video_single_camera": false,
    "video_multi_camera": false,
    "video_slideshow": false,
    "video_highlights": 0
  },
  "web": {
    "web_personal_page": false,
    "web_engagement_upload": 0,
    "web_wedding_upload": 0
  },
  "team": {
    "photographer": "",
    "videographer": ""
  },
  "financials": {
    "subtotal": 0,
    "tax": 0,
    "total": 0,
    "signed_date": ""
  },
  "installments": [
    {
      "installment_number": 1,
      "due_description": "",
      "amount": 0,
      "due_date": null
    }
  ],
  "signature": {
    "signer_name": "",
    "signer_email": "",
    "signed_at": "",
    "ip_address": ""
  },
  "appointment_notes": ""
}`

export interface ParsedContractData {
  couple: {
    bride_first_name: string
    bride_last_name: string
    groom_first_name: string
    groom_last_name: string
    email: string
    phone: string
  }
  wedding: {
    wedding_date: string
    start_time: string
    end_time: string
  }
  locations: {
    loc_groom: boolean
    loc_bride: boolean
    loc_ceremony: boolean
    loc_park: boolean
    loc_reception: boolean
  }
  engagement: {
    engagement_session: boolean
    engagement_location: string
    engagement_notes: string
  }
  photos: {
    usb_dropbox_delivery: boolean
    prints_postcard_thankyou: number
    prints_5x7: number
    prints_8x10: number
    prints_11x14: number
    prints_16x16: number
    prints_16x20: number
    prints_20x24: number
    prints_24x30: number
    prints_30x40: number
    post_production: boolean
    drone_photography: boolean
  }
  albums: {
    parent_albums_qty: number
    parent_albums_size: string
    parent_albums_spreads: number
    parent_albums_images: number
    parent_albums_cover: string
    bride_groom_album_qty: number
    bride_groom_album_size: string
    bride_groom_album_spreads: number
    bride_groom_album_images: number
    bride_groom_album_cover: string
  }
  video: {
    video_digital_titles: boolean
    video_after_effects: boolean
    video_baby_pictures: boolean
    video_dating_pictures: boolean
    video_honeymoon_pictures: boolean
    video_invitation: boolean
    video_music: boolean
    video_end_credits: boolean
    video_recap: boolean
    video_hd: boolean
    video_sd: boolean
    video_gopro: boolean
    video_drone: boolean
    video_led_lights: boolean
    video_proof: boolean
    video_usb: boolean
    video_single_camera: boolean
    video_multi_camera: boolean
    video_slideshow: boolean
    video_highlights: number
  }
  web: {
    web_personal_page: boolean
    web_engagement_upload: number
    web_wedding_upload: number
  }
  team: {
    photographer: string
    videographer: string
  }
  financials: {
    subtotal: number
    tax: number
    total: number
    signed_date: string
  }
  installments: Array<{
    installment_number: number
    due_description: string
    amount: number
    due_date: string | null
  }>
  signature: {
    signer_name: string
    signer_email: string
    signed_at: string
    ip_address: string
  }
  appointment_notes: string
  confidence: 'high' | 'medium' | 'low'
  parseWarnings: string[]
}

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

    console.log(`[Contract PDF API] Processing: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)

    // Step 1: Extract raw text using unpdf
    const buffer = await file.arrayBuffer()
    const { text: pages } = await extractText(new Uint8Array(buffer))
    const rawText = (Array.isArray(pages) ? pages.join('\n') : String(pages)).trim()

    console.log(`[Contract PDF API] ${file.name}: ${rawText.length} chars extracted`)

    if (!rawText) {
      return NextResponse.json({
        couple: { bride_first_name: '', bride_last_name: '', groom_first_name: '', groom_last_name: '', email: '', phone: '' },
        wedding: { wedding_date: '', start_time: '', end_time: '' },
        locations: { loc_groom: false, loc_bride: false, loc_ceremony: false, loc_park: false, loc_reception: false },
        engagement: { engagement_session: false, engagement_location: '', engagement_notes: '' },
        photos: { usb_dropbox_delivery: true, prints_postcard_thankyou: 0, prints_5x7: 0, prints_8x10: 0, prints_11x14: 0, prints_16x16: 0, prints_16x20: 0, prints_20x24: 0, prints_24x30: 0, prints_30x40: 0, post_production: false, drone_photography: false },
        albums: { parent_albums_qty: 0, parent_albums_size: '', parent_albums_spreads: 0, parent_albums_images: 0, parent_albums_cover: '', bride_groom_album_qty: 0, bride_groom_album_size: '', bride_groom_album_spreads: 0, bride_groom_album_images: 0, bride_groom_album_cover: '' },
        video: { video_digital_titles: false, video_after_effects: false, video_baby_pictures: false, video_dating_pictures: false, video_honeymoon_pictures: false, video_invitation: false, video_music: false, video_end_credits: false, video_recap: false, video_hd: false, video_sd: false, video_gopro: false, video_drone: false, video_led_lights: false, video_proof: false, video_usb: false, video_single_camera: false, video_multi_camera: false, video_slideshow: false, video_highlights: 0 },
        web: { web_personal_page: false, web_engagement_upload: 0, web_wedding_upload: 0 },
        team: { photographer: '', videographer: '' },
        financials: { subtotal: 0, tax: 0, total: 0, signed_date: '' },
        installments: [],
        signature: { signer_name: '', signer_email: '', signed_at: '', ip_address: '' },
        appointment_notes: '',
        confidence: 'low',
        parseWarnings: ['PDF appears to be empty or image-based'],
      } satisfies ParsedContractData)
    }

    // Step 2: Send to Claude for structured extraction
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `${EXTRACTION_PROMPT}\n\nContract text:\n${rawText}`,
      }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log(`[Contract PDF API] Claude response length: ${responseText.length} chars`)

    // Step 3: Parse Claude's JSON response
    const jsonStr = responseText.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim()
    const extracted = JSON.parse(jsonStr)

    // Step 4: Build result with confidence scoring
    const warnings: string[] = []
    let score = 0

    // Validate key fields
    if (extracted.couple?.bride_first_name && extracted.couple?.groom_first_name) score++
    else warnings.push('Could not extract couple names')

    if (extracted.wedding?.wedding_date) score++
    else warnings.push('Could not extract wedding date')

    if (extracted.financials?.total > 0) score++
    else warnings.push('Could not extract contract total')

    if (extracted.installments?.length > 0) score++
    else warnings.push('Could not extract installment schedule')

    if (extracted.signature?.signer_name) score++
    else warnings.push('Could not extract signature info')

    if (extracted.team?.photographer) score++

    const confidence = score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low'

    const result: ParsedContractData = {
      couple: {
        bride_first_name: extracted.couple?.bride_first_name || '',
        bride_last_name: extracted.couple?.bride_last_name || '',
        groom_first_name: extracted.couple?.groom_first_name || '',
        groom_last_name: extracted.couple?.groom_last_name || '',
        email: extracted.couple?.email || '',
        phone: extracted.couple?.phone || '',
      },
      wedding: {
        wedding_date: extracted.wedding?.wedding_date || '',
        start_time: extracted.wedding?.start_time || '',
        end_time: extracted.wedding?.end_time || '',
      },
      locations: {
        loc_groom: !!extracted.locations?.loc_groom,
        loc_bride: !!extracted.locations?.loc_bride,
        loc_ceremony: !!extracted.locations?.loc_ceremony,
        loc_park: !!extracted.locations?.loc_park,
        loc_reception: !!extracted.locations?.loc_reception,
      },
      engagement: {
        engagement_session: !!extracted.engagement?.engagement_session,
        engagement_location: extracted.engagement?.engagement_location || '',
        engagement_notes: extracted.engagement?.engagement_notes || '',
      },
      photos: {
        usb_dropbox_delivery: true,
        prints_postcard_thankyou: Number(extracted.photos?.prints_postcard_thankyou) || 0,
        prints_5x7: Number(extracted.photos?.prints_5x7) || 0,
        prints_8x10: Number(extracted.photos?.prints_8x10) || 0,
        prints_11x14: Number(extracted.photos?.prints_11x14) || 0,
        prints_16x16: Number(extracted.photos?.prints_16x16) || 0,
        prints_16x20: Number(extracted.photos?.prints_16x20) || 0,
        prints_20x24: Number(extracted.photos?.prints_20x24) || 0,
        prints_24x30: Number(extracted.photos?.prints_24x30) || 0,
        prints_30x40: Number(extracted.photos?.prints_30x40) || 0,
        post_production: !!extracted.photos?.post_production,
        drone_photography: !!extracted.photos?.drone_photography,
      },
      albums: {
        parent_albums_qty: Number(extracted.albums?.parent_albums_qty) || 0,
        parent_albums_size: extracted.albums?.parent_albums_size || '',
        parent_albums_spreads: Number(extracted.albums?.parent_albums_spreads) || 0,
        parent_albums_images: Number(extracted.albums?.parent_albums_images) || 0,
        parent_albums_cover: extracted.albums?.parent_albums_cover || '',
        bride_groom_album_qty: Number(extracted.albums?.bride_groom_album_qty) || 0,
        bride_groom_album_size: extracted.albums?.bride_groom_album_size || '',
        bride_groom_album_spreads: Number(extracted.albums?.bride_groom_album_spreads) || 0,
        bride_groom_album_images: Number(extracted.albums?.bride_groom_album_images) || 0,
        bride_groom_album_cover: extracted.albums?.bride_groom_album_cover || '',
      },
      video: {
        video_digital_titles: !!extracted.video?.video_digital_titles,
        video_after_effects: !!extracted.video?.video_after_effects,
        video_baby_pictures: !!extracted.video?.video_baby_pictures,
        video_dating_pictures: !!extracted.video?.video_dating_pictures,
        video_honeymoon_pictures: !!extracted.video?.video_honeymoon_pictures,
        video_invitation: !!extracted.video?.video_invitation,
        video_music: !!extracted.video?.video_music,
        video_end_credits: !!extracted.video?.video_end_credits,
        video_recap: !!extracted.video?.video_recap,
        video_hd: !!extracted.video?.video_hd,
        video_sd: !!extracted.video?.video_sd,
        video_gopro: !!extracted.video?.video_gopro,
        video_drone: !!extracted.video?.video_drone,
        video_led_lights: !!extracted.video?.video_led_lights,
        video_proof: !!extracted.video?.video_proof,
        video_usb: !!extracted.video?.video_usb,
        video_single_camera: !!extracted.video?.video_single_camera,
        video_multi_camera: !!extracted.video?.video_multi_camera,
        video_slideshow: !!extracted.video?.video_slideshow,
        video_highlights: Number(extracted.video?.video_highlights) || 0,
      },
      web: {
        web_personal_page: !!extracted.web?.web_personal_page,
        web_engagement_upload: Number(extracted.web?.web_engagement_upload) || 0,
        web_wedding_upload: Number(extracted.web?.web_wedding_upload) || 0,
      },
      team: {
        photographer: extracted.team?.photographer || '',
        videographer: extracted.team?.videographer || '',
      },
      financials: {
        subtotal: Number(extracted.financials?.subtotal) || 0,
        tax: Number(extracted.financials?.tax) || 0,
        total: Number(extracted.financials?.total) || 0,
        signed_date: extracted.financials?.signed_date || '',
      },
      installments: Array.isArray(extracted.installments)
        ? extracted.installments.map((inst: any, i: number) => ({
            installment_number: inst.installment_number || i + 1,
            due_description: inst.due_description || '',
            amount: Number(inst.amount) || 0,
            due_date: inst.due_date || null,
          }))
        : [],
      signature: {
        signer_name: extracted.signature?.signer_name || '',
        signer_email: extracted.signature?.signer_email || '',
        signed_at: extracted.signature?.signed_at || '',
        ip_address: extracted.signature?.ip_address || '',
      },
      appointment_notes: extracted.appointment_notes || '',
      confidence,
      parseWarnings: warnings,
    }

    console.log(`[Contract PDF API] Result:`, {
      couple: `${result.couple.bride_first_name} & ${result.couple.groom_first_name}`,
      total: result.financials.total,
      installments: result.installments.length,
      confidence: result.confidence,
    })

    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[Contract PDF API] Error:', msg)
    console.error('[Contract PDF API] Stack:', e instanceof Error ? e.stack : '')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
