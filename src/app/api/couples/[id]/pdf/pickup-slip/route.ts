import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BLACK = rgb(0, 0, 0)
const GRAY = rgb(0.4, 0.4, 0.4)
const LIGHT_GRAY = rgb(0.8, 0.8, 0.8)

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { items } = await req.json() as { items: string[] }

  const [{ data: couple }, { data: contract }] = await Promise.all([
    supabase.from('couples').select('*').eq('id', id).single(),
    supabase.from('contracts').select('reception_venue').eq('couple_id', id).single(),
  ])

  if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

  const bride = [couple.bride_first_name, couple.bride_last_name].filter(Boolean).join(' ')
  const groom = [couple.groom_first_name, couple.groom_last_name].filter(Boolean).join(' ')
  const weddingDate = couple.wedding_date
    ? new Date(couple.wedding_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'TBD'
  const venue = contract?.reception_venue || ''
  const phone = couple.phone || ''
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)

  const page = doc.addPage([595.28, 841.89]) // A4
  const M = 50
  const W = 595.28 - M * 2
  let y = 790

  // ── Header ────────────────────────────────────────────
  page.drawText('SIGS Photography', { x: M, y, size: 18, font: bold, color: BLACK })

  // Right-aligned "CLIENT PICKUP SLIP"
  const slipTitle = 'CLIENT PICKUP SLIP'
  const slipW = bold.widthOfTextAtSize(slipTitle, 12)
  page.drawText(slipTitle, { x: M + W - slipW, y: y + 4, size: 12, font: bold, color: BLACK })
  y -= 16

  // Right-aligned date
  const dateW = font.widthOfTextAtSize(today, 9)
  page.drawText(today, { x: M + W - dateW, y, size: 9, font, color: GRAY })
  y -= 20

  // Divider
  page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 1, color: BLACK })
  y -= 24

  // ── Client info fields ────────────────────────────────
  const drawInfoField = (label: string, value: string) => {
    page.drawText(label, { x: M, y, size: 9, font: bold, color: BLACK })
    page.drawText(value, { x: M + 110, y, size: 10, font, color: BLACK })
    y -= 22
  }

  drawInfoField('CLIENT:', `${bride} & ${groom}`)
  drawInfoField('WEDDING DATE:', weddingDate)
  drawInfoField('VENUE:', venue)
  drawInfoField('PHONE:', phone)

  y -= 8

  // ── Items table ───────────────────────────────────────
  page.drawText('ITEMS FOR PICKUP', { x: M, y, size: 11, font: bold, color: BLACK })
  y -= 20

  // Column headers
  const colQty = M
  const colDesc = M + 40
  const colRecv = M + W - 60
  page.drawText('QTY', { x: colQty, y, size: 8, font: bold, color: GRAY })
  page.drawText('DESCRIPTION', { x: colDesc, y, size: 8, font: bold, color: GRAY })
  page.drawText('RECEIVED', { x: colRecv, y, size: 8, font: bold, color: GRAY })
  y -= 6
  page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 0.5, color: LIGHT_GRAY })
  y -= 18

  // Item rows
  const validItems = (items || []).filter(i => i.trim())
  for (const item of validItems) {
    page.drawText('1', { x: colQty + 8, y, size: 10, font, color: BLACK })
    page.drawText(item, { x: colDesc, y, size: 10, font, color: BLACK })

    // Checkbox
    const boxSize = 12
    const boxX = colRecv + 16
    const boxY = y - 2
    page.drawRectangle({ x: boxX, y: boxY, width: boxSize, height: boxSize, borderColor: BLACK, borderWidth: 0.75 })

    y -= 10
    page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 0.25, color: LIGHT_GRAY })
    y -= 16
  }

  // ── Instruction ───────────────────────────────────────
  y -= 12
  page.drawText('Please leave a copy of this slip in the studio tray before leaving. Thank you.', {
    x: M, y, size: 9, font: italic, color: GRAY,
  })

  // ── Footer ────────────────────────────────────────────
  y = 40
  const footerText = 'SIGS Photography \u2022 info@sigsphoto.ca \u2022 sigsphoto.ca'
  const footerW = font.widthOfTextAtSize(footerText, 8)
  page.drawText(footerText, { x: (595.28 - footerW) / 2, y, size: 8, font, color: GRAY })

  const pdfBytes = await doc.save()
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Pickup_Slip_${bride}_${groom}.pdf"`,
    },
  })
}
