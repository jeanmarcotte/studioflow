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

  const [{ data: couple }, { data: orders }] = await Promise.all([
    supabase.from('couples').select('*').eq('id', id).single(),
    supabase.from('extras_orders').select('*').eq('couple_id', id).order('created_at', { ascending: true }),
  ])

  if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

  const bride = [couple.bride_first_name, couple.bride_last_name].filter(Boolean).join(' ')
  const groom = [couple.groom_first_name, couple.groom_last_name].filter(Boolean).join(' ')

  const ctx = await createPdfContext()
  drawHeader(ctx, 'EXTRAS & ADD-ONS', `${bride} & ${groom} \u2014 ${formatDate(couple.wedding_date)}`)

  if (!orders || orders.length === 0) {
    drawGap(ctx, 10)
    drawText(ctx, 'No extras have been purchased yet.', { size: 10, color: rgb(0.4, 0.4, 0.4) })
  } else {
    let grandTotal = 0
    for (const order of orders) {
      checkNewPage(ctx)
      drawGap(ctx, 4)
      if (order.order_date) drawText(ctx, `Order Date: ${formatDate(order.order_date)}`, { size: 9, indent: 8 })
      if (order.order_type) drawText(ctx, `Type: ${order.order_type.replace(/_/g, ' ')}`, { size: 9, indent: 8 })

      // Items
      if (order.items) {
        const itemsObj = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
        if (Array.isArray(itemsObj)) {
          for (const item of itemsObj) {
            const desc = item.description || item.name || JSON.stringify(item)
            drawText(ctx, `  - ${desc}`, { size: 9, indent: 12 })
          }
        } else if (typeof itemsObj === 'object') {
          for (const [key, val] of Object.entries(itemsObj)) {
            drawText(ctx, `  - ${key}: ${val}`, { size: 9, indent: 12 })
          }
        }
      }

      // Detail fields
      const details: string[] = []
      if (order.album_qty) details.push(`Album: ${order.album_qty}x ${order.album_cover || ''}`)
      if (order.collage_size) details.push(`Collage: ${order.collage_size} ${order.collage_frame_color || ''}`)
      if (order.wedding_frame_size) details.push(`Frame: ${order.wedding_frame_size} ${order.wedding_frame_style || ''}`)
      if (order.signing_book) details.push('Signing Book: Yes')
      for (const d of details) {
        drawText(ctx, `  ${d}`, { size: 9, indent: 8 })
      }

      const amount = parseFloat(order.extras_sale_amount || '0')
      drawText(ctx, `Total: ${formatCurrency(amount)}`, { size: 9, bold: true, indent: 8 })
      if (order.status) drawText(ctx, `Status: ${order.status}`, { size: 9, indent: 8 })
      drawGap(ctx, 4)
      drawLine(ctx)
      grandTotal += amount
    }

    drawGap(ctx, 4)
    drawText(ctx, `TOTAL EXTRAS: ${formatCurrency(grandTotal)}`, { size: 11, bold: true })
  }

  drawFooter(ctx, `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`)

  const pdfBytes = await ctx.doc.save()
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Extras_${bride}_${groom}.pdf"`,
    },
  })
}
