import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib'
import * as fs from 'fs'
import * as path from 'path'

const BLACK = rgb(0, 0, 0)
const GRAY = rgb(0.4, 0.4, 0.4)
const LIGHT_GRAY = rgb(0.75, 0.75, 0.75)

export interface PdfContext {
  doc: PDFDocument
  page: PDFPage
  font: PDFFont
  bold: PDFFont
  y: number
  margin: number
  width: number
}

export async function createPdfContext(): Promise<PdfContext> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([595.28, 841.89]) // A4
  return { doc, page, font, bold, y: 800, margin: 50, width: 595.28 - 100 }
}

export function drawText(ctx: PdfContext, text: string, opts?: { size?: number; bold?: boolean; color?: typeof BLACK; indent?: number }) {
  const size = opts?.size ?? 10
  const f = opts?.bold ? ctx.bold : ctx.font
  const color = opts?.color ?? BLACK
  const x = ctx.margin + (opts?.indent ?? 0)
  ctx.page.drawText(text, { x, y: ctx.y, size, font: f, color })
  ctx.y -= size + 4
}

export function drawLine(ctx: PdfContext) {
  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.y },
    end: { x: ctx.margin + ctx.width, y: ctx.y },
    thickness: 0.5,
    color: LIGHT_GRAY,
  })
  ctx.y -= 12
}

export function drawGap(ctx: PdfContext, gap = 10) {
  ctx.y -= gap
}

export function checkNewPage(ctx: PdfContext, needed = 60) {
  if (ctx.y < needed) {
    ctx.page = ctx.doc.addPage([595.28, 841.89])
    ctx.y = 800
  }
}

export function drawHeader(ctx: PdfContext, title: string, subtitle?: string) {
  drawText(ctx, 'SIGS Photography', { size: 16, bold: true })
  drawGap(ctx, 6)
  drawText(ctx, title, { size: 13, bold: true })
  if (subtitle) {
    drawText(ctx, subtitle, { size: 10, color: GRAY })
  }
  drawGap(ctx, 4)
  drawLine(ctx)
}

export function drawSectionTitle(ctx: PdfContext, title: string) {
  drawGap(ctx, 4)
  drawText(ctx, title, { size: 11, bold: true })
  drawGap(ctx, 2)
}

export function drawField(ctx: PdfContext, label: string, value: string | null | undefined) {
  if (!value) return
  const text = `${label}: ${value}`
  drawText(ctx, text, { size: 9, indent: 8 })
}

export function drawFooter(ctx: PdfContext, text: string) {
  drawGap(ctx, 8)
  drawLine(ctx)
  drawText(ctx, text, { size: 8, color: GRAY })
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'TBD'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  return `${h > 12 ? h - 12 : h || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export function formatCurrency(val: string | number | null | undefined): string {
  const n = parseFloat(String(val || '0'))
  return `$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
