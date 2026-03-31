import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  createPdfContext, drawHeader, drawSectionTitle, drawField, drawText,
  drawLine, drawGap, drawFooter, checkNewPage, formatDate, formatTime, formatCurrency,
} from '@/lib/pdf-helpers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [{ data: couple }, { data: contract }] = await Promise.all([
    supabase.from('couples').select('*').eq('id', id).single(),
    supabase.from('contracts').select('*').eq('couple_id', id).single(),
  ])

  if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

  const bride = [couple.bride_first_name, couple.bride_last_name].filter(Boolean).join(' ')
  const groom = [couple.groom_first_name, couple.groom_last_name].filter(Boolean).join(' ')
  const names = `${bride} & ${groom}`

  // Fetch appointment date from sales_meetings (matched by bride name)
  let apptDate: string | null = null
  if (bride) {
    const { data: sm } = await supabase
      .from('sales_meetings')
      .select('appt_date')
      .ilike('bride_name', `%${couple.bride_first_name}%`)
      .order('appt_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    apptDate = sm?.appt_date || null
  }

  const ctx = await createPdfContext()

  drawHeader(ctx, 'WEDDING CONTRACT', names)

  // Wedding info
  drawField(ctx, 'Wedding Date', `${contract?.day_of_week || ''} ${formatDate(couple.wedding_date)}`.trim())
  if (apptDate) drawField(ctx, 'Appointment Date', formatDate(apptDate))
  if (contract?.start_time && contract?.end_time) {
    drawField(ctx, 'Coverage', `${formatTime(contract.start_time)} to ${formatTime(contract.end_time)}`)
  }
  drawGap(ctx)

  // Contact
  drawSectionTitle(ctx, 'CONTACT')
  drawField(ctx, 'Email', couple.email)
  drawField(ctx, 'Phone', couple.phone)
  drawGap(ctx)

  // Venues
  drawSectionTitle(ctx, 'VENUES')
  drawField(ctx, 'Ceremony', contract?.ceremony_location)
  drawField(ctx, 'Reception', contract?.reception_venue)
  if (contract?.engagement_session) drawField(ctx, 'Engagement', contract?.engagement_location || 'TBD')
  if (contract?.num_guests) drawField(ctx, 'Guests', String(contract.num_guests))
  drawGap(ctx)

  // Coverage & Team
  drawSectionTitle(ctx, 'COVERAGE & TEAM')
  drawField(ctx, 'Photographers', String(contract?.num_photographers || 1))
  drawField(ctx, 'Videographers', String(contract?.num_videographers || 0))
  drawField(ctx, 'Drone', contract?.drone_photography ? 'Yes' : 'No')
  drawGap(ctx)

  // Inclusions
  checkNewPage(ctx)
  const inclusions: [boolean | undefined, string][] = [
    [contract?.engagement_session, 'Engagement Photo Session'],
    [contract?.post_production, 'Post Production'],
    [contract?.usb_dropbox_delivery, 'USB/Dropbox Delivery'],
    [contract?.video_hd, 'HD Video'],
    [contract?.video_recap, 'Video Recap'],
    [contract?.video_long_form, 'Long Form Video (up to 2hrs)'],
    [contract?.video_instagram_facebook, 'Instagram/Facebook Video'],
    [contract?.video_highlights, 'Highlight Clips'],
    [contract?.video_proof, 'Proof Video'],
    [contract?.video_drone, 'Drone Video'],
    [contract?.video_multi_camera, 'Multi-Camera'],
  ]
  const activeInclusions = inclusions.filter(([v]) => v)
  if (activeInclusions.length > 0) {
    drawSectionTitle(ctx, 'INCLUSIONS')
    for (const [, label] of activeInclusions) {
      drawText(ctx, `  \u2713 ${label}`, { size: 9, indent: 8 })
    }
    drawGap(ctx)
  }

  // Prints
  checkNewPage(ctx)
  const prints: [number | undefined, string][] = [
    [contract?.prints_5x7, '5x7'],
    [contract?.prints_8x10, '8x10'],
    [contract?.prints_11x14, '11x14'],
    [contract?.prints_16x20, '16x20'],
    [contract?.prints_24x30, '24x30'],
    [contract?.prints_postcard_thankyou, 'Postcards/Thank You Cards'],
  ]
  const activePrints = prints.filter(([v]) => v && v > 0)
  if (activePrints.length > 0) {
    drawSectionTitle(ctx, 'PRINTS')
    for (const [qty, label] of activePrints) {
      drawText(ctx, `  ${label}: ${qty}`, { size: 9, indent: 8 })
    }
    drawGap(ctx)
  }

  // Albums
  checkNewPage(ctx)
  const hasParentAlbums = (contract?.parent_albums_qty || 0) > 0
  const hasBgAlbum = (contract?.bride_groom_album_qty || 0) > 0
  if (hasParentAlbums || hasBgAlbum) {
    drawSectionTitle(ctx, 'ALBUMS')
    if (hasParentAlbums) {
      const parts = [`${contract.parent_albums_qty}x ${contract.parent_albums_size || ''}`]
      if (contract.parent_albums_spreads) parts.push(`${contract.parent_albums_spreads} spreads`)
      if (contract.parent_albums_images) parts.push(`${contract.parent_albums_images} images`)
      if (contract.parent_albums_cover) parts.push(`${contract.parent_albums_cover} cover`)
      drawText(ctx, `  Parent Albums: ${parts.join(', ')}`, { size: 9, indent: 8 })
    }
    if (hasBgAlbum) {
      drawText(ctx, `  B&G Album: ${contract.bride_groom_album_qty}`, { size: 9, indent: 8 })
    }
    drawGap(ctx)
  }

  // Financial
  checkNewPage(ctx)
  drawSectionTitle(ctx, 'FINANCIAL SUMMARY')
  drawField(ctx, 'Subtotal', formatCurrency(contract?.subtotal))
  drawField(ctx, 'HST', formatCurrency(contract?.tax))
  drawField(ctx, 'Total', formatCurrency(contract?.total))

  drawFooter(ctx, `Signed: ${contract?.signed_date ? formatDate(contract.signed_date) : 'Not yet signed'}`)

  const pdfBytes = await ctx.doc.save()
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Wedding_Contract_${bride}_${groom}.pdf"`,
    },
  })
}
