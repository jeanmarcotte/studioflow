import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  createPdfContext, drawHeader, drawText, drawLine, drawGap, drawFooter,
  checkNewPage, formatDate, formatCurrency,
} from '@/lib/pdf-helpers'
import { rgb } from 'pdf-lib'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [{ data: couple }, { data: items }] = await Promise.all([
    supabase.from('couples').select('*').eq('id', id).single(),
    supabase
      .from('c3_line_items')
      .select('*, product_catalog(item_name, category)')
      .eq('couple_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

  const bride = [couple.bride_first_name, couple.bride_last_name].filter(Boolean).join(' ')
  const groom = [couple.groom_first_name, couple.groom_last_name].filter(Boolean).join(' ')

  const ctx = await createPdfContext()
  drawHeader(ctx, 'FRAMES & ALBUMS', `${bride} & ${groom} — ${formatDate(couple.wedding_date)}`)

  if (!items || items.length === 0) {
    drawGap(ctx, 10)
    drawText(ctx, 'No frames or albums have been purchased yet.', { size: 10, color: rgb(0.4, 0.4, 0.4) })
  } else {
    let grandTotal = 0
    for (const item of items as any[]) {
      checkNewPage(ctx)
      drawGap(ctx, 4)
      const itemName = item.product_catalog?.item_name || item.product_code || 'Item'
      const category = item.product_catalog?.category || ''
      drawText(ctx, `${itemName}${category ? ` — ${category}` : ''}`, { size: 10, bold: true })
      drawText(ctx, `Qty: ${item.quantity || 1}     Unit: ${formatCurrency(item.unit_price)}`, { size: 9, indent: 8 })
      drawText(ctx, `Subtotal: ${formatCurrency(item.subtotal)}   HST: ${formatCurrency(item.hst)}   Total: ${formatCurrency(item.total)}`, { size: 9, indent: 8 })
      if (item.product_code) drawText(ctx, `Code: ${item.product_code}`, { size: 9, indent: 8 })
      drawGap(ctx, 4)
      drawLine(ctx)
      grandTotal += parseFloat(item.total || '0')
    }

    drawGap(ctx, 4)
    drawText(ctx, `GRAND TOTAL: ${formatCurrency(grandTotal)}`, { size: 11, bold: true })
  }

  drawFooter(ctx, `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`)

  const pdfBytes = await ctx.doc.save()
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Frames_Albums_${bride}_${groom}.pdf"`,
    },
  })
}
