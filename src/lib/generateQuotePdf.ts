import jsPDF from 'jspdf'

// ============================================================
// TYPES
// ============================================================

export interface QuotePdfData {
  brideFirstName: string
  brideLastName: string
  groomFirstName: string
  groomLastName: string
  brideEmail: string
  bridePhone: string
  groomEmail: string
  groomPhone: string

  weddingDate: string
  ceremonyVenue: string
  receptionVenue: string
  guestCount?: number
  bridalPartyCount?: number
  flowerGirl?: number
  ringBearer?: number

  selectedPackage: string
  packageName: string
  packageHours: number
  packageFeatures: string[]

  extraPhotographer: boolean
  extraHours: number
  engagementLocation: string
  engagementLocationLabel: string
  albumType: string
  albumSize: string
  acrylicCover: boolean
  parentAlbumQty: number
  firstLook: boolean

  pricing: {
    basePrice: number
    extraPhotographerPrice: number
    extraHoursPrice: number
    albumPrice: number
    acrylicCoverPrice: number
    parentAlbumsPrice: number
    locationFee: number
    printsPrice: number
    subtotal: number
    discount: number
    hst: number
    total: number
  }

  freeParentAlbums: boolean
  freePrints: boolean
  printsTotal: number
  printOrders: {[key: string]: number}

  timeline: Array<{
    name: string
    startTime: string
    endTime: string
    driveTime?: string
  }>

  installments: Array<{
    label: string
    amount: number
  }>

  discountType: string
  discountAmount?: number
  discount2Amount?: number
}

// ============================================================
// HELPERS
// ============================================================

async function loadLogoBase64(): Promise<string> {
  const response = await fetch('/images/sigslogo.png')
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function subtractMinutes(timeStr: string, mins: number): string | null {
  // Parse "3:00 PM" style times
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null
  let hours = parseInt(match[1])
  const minutes = parseInt(match[2])
  const period = match[3].toUpperCase()
  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  let total = hours * 60 + minutes - mins
  if (total < 0) total += 24 * 60
  const h = Math.floor(total / 60)
  const m = total % 60
  const dispH = h === 0 ? 12 : h > 12 ? h - 12 : h
  const dispP = h >= 12 ? 'PM' : 'AM'
  return `${dispH}:${m.toString().padStart(2, '0')} ${dispP}`
}

function fmt(amount: number, forceDecimals = false): string {
  const decimals = forceDecimals || amount % 1 !== 0 ? 2 : 0
  return '$' + Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: 2 })
}

// ============================================================
// DRAWING HELPERS
// ============================================================

const COLORS = {
  dark: [41, 37, 36] as [number, number, number],       // stone-800
  body: [87, 83, 78] as [number, number, number],        // stone-600
  muted: [120, 113, 108] as [number, number, number],    // stone-500
  border: [214, 211, 209] as [number, number, number],   // stone-300
  bgLight: [245, 245, 244] as [number, number, number],  // stone-100
  green: [16, 185, 129] as [number, number, number],     // emerald-500
}

function drawSectionHeader(doc: jsPDF, title: string, x: number, y: number, width: number) {
  doc.setFillColor(...COLORS.bgLight)
  doc.rect(x, y - 4.5, width, 7.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.dark)
  doc.text(title.toUpperCase(), x + 3, y + 0.5)
}

function drawLabelValue(doc: jsPDF, label: string, value: string, x: number, y: number) {
  if (!value) return
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.muted)
  const labelText = `${label}: `
  doc.text(labelText, x, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.dark)
  doc.text(value, x + doc.getTextWidth(labelText), y)
}

function drawHRule(doc: jsPDF, y: number, margin: number, rightEdge: number) {
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(margin, y, rightEdge, y)
}

// ============================================================
// MAIN PDF FUNCTION
// ============================================================

export async function generateQuotePdf(data: QuotePdfData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  const rightEdge = pageWidth - margin
  let y = 15

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 20) {
      doc.addPage()
      y = 20
    }
  }

  // ── 1. Logo ──────────────────────────────────────────────
  let logoBase64: string | null = null
  try {
    logoBase64 = await loadLogoBase64()
  } catch { /* logo optional */ }

  if (logoBase64) {
    const logoSize = 28
    doc.addImage(logoBase64, 'JPEG', (pageWidth - logoSize) / 2, y, logoSize, logoSize)
    y += logoSize + 4
  }

  // ── 2. Title ─────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...COLORS.dark)
  doc.text('SIGS Photography', pageWidth / 2, y, { align: 'center' })
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.body)
  doc.text('Wedding Photography Proposal', pageWidth / 2, y, { align: 'center' })
  y += 6
  drawHRule(doc, y, margin, rightEdge)
  y += 8

  // ── 3. Couple Information ────────────────────────────────
  drawSectionHeader(doc, 'Couple Information', margin, y, contentWidth)
  y += 8

  const colRight = margin + 90
  // Names
  drawLabelValue(doc, 'Bride', `${data.brideFirstName} ${data.brideLastName}`.trim(), margin, y)
  drawLabelValue(doc, 'Groom', `${data.groomFirstName} ${data.groomLastName}`.trim(), colRight, y)
  y += 5.5
  // Emails
  if (data.brideEmail || data.groomEmail) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...COLORS.muted)
    if (data.brideEmail) doc.text(data.brideEmail, margin, y)
    if (data.groomEmail) doc.text(data.groomEmail, colRight, y)
    y += 4.5
  }
  // Phones
  if (data.bridePhone || data.groomPhone) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...COLORS.muted)
    if (data.bridePhone) doc.text(data.bridePhone, margin, y)
    if (data.groomPhone) doc.text(data.groomPhone, colRight, y)
    y += 4.5
  }
  y += 4

  // ── 4. Wedding Details ───────────────────────────────────
  drawSectionHeader(doc, 'Wedding Details', margin, y, contentWidth)
  y += 8

  drawLabelValue(doc, 'Date', formatDate(data.weddingDate), margin, y)
  y += 6
  if (data.ceremonyVenue) { drawLabelValue(doc, 'Ceremony', data.ceremonyVenue, margin, y); y += 6 }
  if (data.receptionVenue) { drawLabelValue(doc, 'Reception', data.receptionVenue, margin, y); y += 6 }

  const detailParts: string[] = []
  if (data.guestCount) detailParts.push(`${data.guestCount} Guests`)
  if (data.bridalPartyCount) detailParts.push(`${data.bridalPartyCount} Bridal Party`)
  detailParts.push(`${data.flowerGirl ?? 0} Flower Girl`)
  detailParts.push(`${data.ringBearer ?? 0} Ring Bearer`)
  if (data.firstLook) detailParts.push('First Look')
  drawLabelValue(doc, 'Details', detailParts.join('  |  '), margin, y)
  y += 6

  if (data.engagementLocationLabel) {
    drawLabelValue(doc, 'Engagement Session', data.engagementLocationLabel, margin, y)
    y += 6
  }

  y += 2
  drawHRule(doc, y, margin, rightEdge)
  y += 6

  // ── 5. Package ───────────────────────────────────────────
  checkPageBreak(50)
  drawSectionHeader(doc, 'Your Package', margin, y, contentWidth)
  y += 8

  // Package type badge
  const isPhotoOnly = data.selectedPackage === 'exclusively_photo'
  const badgeText = isPhotoOnly ? 'PHOTO ONLY' : 'PHOTO AND VIDEO'
  const badgeColor: [number, number, number] = isPhotoOnly ? [16, 185, 129] : [59, 130, 246]
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  const badgeW = doc.getTextWidth(badgeText) + 8
  doc.setFillColor(...badgeColor)
  doc.roundedRect(margin, y - 4, badgeW, 6.5, 1, 1, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(badgeText, margin + 4, y + 0.5)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.dark)
  doc.text(`${data.packageName} — ${data.packageHours} hours`, margin, y)
  y += 7

  // Features in 2 columns
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...COLORS.body)
  const midCol = margin + contentWidth / 2
  const half = Math.ceil(data.packageFeatures.length / 2)
  for (let i = 0; i < half; i++) {
    checkPageBreak(5)
    const left = data.packageFeatures[i]
    const right = data.packageFeatures[i + half]
    if (left) doc.text(`• ${left}`, margin + 2, y)
    if (right) doc.text(`• ${right}`, midCol, y)
    y += 4
  }

  // Add-ons
  const addOns: string[] = []
  if (data.extraPhotographer) addOns.push('Extra Photographer')
  if (data.extraHours > 0) addOns.push(`${data.extraHours} Extra Hour${data.extraHours > 1 ? 's' : ''}`)
  if (addOns.length > 0) {
    y += 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.dark)
    doc.text('Add-ons: ', margin + 2, y)
    const addOnsLabelW = doc.getTextWidth('Add-ons: ')
    doc.setFont('helvetica', 'normal')
    doc.text(addOns.join(', '), margin + 2 + addOnsLabelW, y)
    y += 5
  }

  // Albums
  if (data.albumType !== 'none') {
    const albumLabel = `${data.albumType === 'premium' ? 'Premium' : 'Standard'} Album (${data.albumSize === '10x8' ? '10"×8"' : '14"×11"'})${data.acrylicCover ? ' + Acrylic Cover' : ''}`
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Album: ', margin + 2, y)
    const albumLabelW = doc.getTextWidth('Album: ')
    doc.setFont('helvetica', 'normal')
    doc.text(albumLabel, margin + 2 + albumLabelW, y)
    y += 5
  }

  if (data.parentAlbumQty > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Parent Albums: ', margin + 2, y)
    const parentAlbumsLabelW = doc.getTextWidth('Parent Albums: ')
    doc.setFont('helvetica', 'normal')
    const parentLabel = `${data.parentAlbumQty}${data.freeParentAlbums ? ' (complimentary)' : ''}`
    doc.text(parentLabel, margin + 2 + parentAlbumsLabelW, y)
    y += 5
  }

  // Prints
  const printEntries = Object.entries(data.printOrders || {}).filter(([, qty]) => qty > 0)
  if (printEntries.length > 0) {
    const SIZE_LABELS: {[key: string]: string} = {
      '5x7': '5×7', '8x10': '8×10', '11x14': '11×14',
      '16x20': '16×20', '20x24': '20×24', '24x30': '24×30',
    }
    const printParts = printEntries.map(([size, qty]) => `${qty}× ${SIZE_LABELS[size] || size}`)
    const printDesc = printParts.join(', ') + (data.freePrints ? ' (included)' : '')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Prints: ', margin + 2, y)
    const printsLabelW = doc.getTextWidth('Prints: ')
    doc.setFont('helvetica', 'normal')
    doc.text(printDesc, margin + 2 + printsLabelW, y)
    y += 5
  }

  y += 2
  drawHRule(doc, y, margin, rightEdge)
  y += 6

  // ── 6. Timeline ──────────────────────────────────────────
  const hasTimeline = data.timeline.some(t => t.startTime || t.endTime)
  if (hasTimeline) {
    checkPageBreak(10 + data.timeline.length * 6)
    drawSectionHeader(doc, 'Wedding Day Timeline', margin, y, contentWidth)
    y += 5
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.muted)
    doc.text('(approximate, not confirmed)', margin + 3, y)
    y += 5

    doc.setFontSize(8)
    data.timeline.forEach(entry => {
      if (!entry.startTime && !entry.endTime) return

      // Insert 30-min arrival buffer before Ceremony
      if (entry.name === 'Ceremony' && entry.startTime) {
        const arrivalTime = subtractMinutes(entry.startTime, 30)
        if (arrivalTime) {
          checkPageBreak(7)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8)
          doc.setTextColor(...COLORS.muted)
          doc.text('SIGS team must arrive at ceremony', margin + 2, y)
          doc.setFont('helvetica', 'normal')
          doc.text(arrivalTime, margin + 55, y)
          y += 6
        }
      }

      checkPageBreak(7)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...COLORS.dark)
      doc.text(entry.name, margin + 2, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLORS.body)
      doc.text(`${entry.startTime || '?'} — ${entry.endTime || '?'}`, margin + 55, y)
      if (entry.driveTime) {
        doc.setFontSize(7)
        doc.setTextColor(...COLORS.muted)
        doc.text(`drive: ${entry.driveTime}`, margin + 110, y)
        doc.setFontSize(8)
      }
      y += 6
    })

    y += 2
    drawHRule(doc, y, margin, rightEdge)
    y += 6
  }

  // ── 7. Pricing Summary ───────────────────────────────────
  checkPageBreak(60)
  drawSectionHeader(doc, 'Pricing Summary', margin, y, contentWidth)
  y += 8

  const drawPriceLine = (label: string, amount: number, opts?: { bold?: boolean, color?: 'green' | 'muted', negative?: boolean }) => {
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal')
    doc.setFontSize(9)
    if (opts?.color === 'green') doc.setTextColor(...COLORS.green)
    else if (opts?.color === 'muted') doc.setTextColor(...COLORS.muted)
    else doc.setTextColor(...COLORS.dark)
    doc.text(label, margin + 5, y)
    const prefix = opts?.negative ? '-' : ''
    doc.text(prefix + fmt(amount, true), rightEdge, y, { align: 'right' })
  }

  // Line items
  const lines: Array<{ label: string; amount: number; show: boolean }> = [
    { label: `${data.packageName} (${data.packageHours}hr)`, amount: data.pricing.basePrice, show: true },
    { label: 'Extra Photographer', amount: data.pricing.extraPhotographerPrice, show: data.pricing.extraPhotographerPrice > 0 },
    { label: `Extra Hours (${data.extraHours})`, amount: data.pricing.extraHoursPrice, show: data.pricing.extraHoursPrice > 0 },
    { label: `Wedding Album (${data.albumSize === '10x8' ? '10"×8"' : '14"×11"'} ${data.albumType})`, amount: data.pricing.albumPrice, show: data.pricing.albumPrice > 0 },
    { label: 'Acrylic Cover', amount: data.pricing.acrylicCoverPrice, show: data.pricing.acrylicCoverPrice > 0 },
    { label: `Parent Albums (${data.parentAlbumQty})`, amount: data.pricing.parentAlbumsPrice, show: data.pricing.parentAlbumsPrice > 0 },
    { label: "Bride's Choice Location", amount: data.pricing.locationFee, show: data.pricing.locationFee > 0 },
    { label: 'Prints & Thank You Cards', amount: data.pricing.printsPrice, show: data.pricing.printsPrice > 0 },
  ]

  lines.filter(l => l.show).forEach(line => {
    checkPageBreak(6)
    drawPriceLine(line.label, line.amount)
    y += 5.5
  })

  // Free inclusions
  if (data.freeParentAlbums && data.parentAlbumQty > 0) {
    drawPriceLine(`Parent Albums (${data.parentAlbumQty}) — complimentary`, 0, { color: 'green' })
    y += 5.5
  }
  if (data.freePrints && data.printsTotal > 0) {
    drawPriceLine('Prints & Cards — complimentary', 0, { color: 'green' })
    y += 5.5
  }

  // Subtotal separator
  doc.setDrawColor(...COLORS.border)
  doc.line(margin + 5, y, rightEdge, y)
  y += 5

  // Discount
  if (data.pricing.discount > 0) {
    let discountLabel = 'Discount'
    if (data.discountType === 'percent' && data.discountAmount) {
      discountLabel = `Discount (${data.discountAmount}% off package)`
    }
    drawPriceLine(discountLabel, data.pricing.discount, { color: 'green', negative: true })
    y += 5.5
  }

  // Subtotal after discount
  drawPriceLine('Subtotal', data.pricing.subtotal)
  y += 5.5

  // HST
  drawPriceLine('HST (13%)', data.pricing.hst, { color: 'muted' })
  y += 5.5

  // Total separator
  doc.setDrawColor(...COLORS.dark)
  doc.setLineWidth(0.5)
  doc.line(margin + 5, y, rightEdge, y)
  y += 5.5
  doc.setLineWidth(0.3)

  // Total
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...COLORS.dark)
  doc.text('TOTAL', margin + 5, y)
  doc.setTextColor(...COLORS.green)
  doc.text(fmt(data.pricing.total, true), rightEdge, y, { align: 'right' })
  y += 10

  // ── 8. Installment Schedule ──────────────────────────────
  if (data.installments.length > 0) {
    checkPageBreak(20 + data.installments.length * 8)
    drawHRule(doc, y, margin, rightEdge)
    y += 6
    drawSectionHeader(doc, 'Payment Schedule', margin, y, contentWidth)
    y += 8

    const col1W = 12
    const col3W = 35
    const col2W = contentWidth - col1W - col3W
    const rowH = 7.5

    // Header row
    doc.setFillColor(...COLORS.bgLight)
    doc.rect(margin, y, contentWidth, rowH, 'F')
    doc.setDrawColor(...COLORS.border)
    doc.rect(margin, y, contentWidth, rowH, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.dark)
    doc.text('#', margin + 3, y + 5)
    doc.text('Description', margin + col1W + 3, y + 5)
    doc.text('Amount', margin + col1W + col2W + col3W - 3, y + 5, { align: 'right' })
    y += rowH

    // Data rows
    doc.setFont('helvetica', 'normal')
    data.installments.forEach((inst, i) => {
      checkPageBreak(rowH + 2)
      doc.setDrawColor(...COLORS.border)
      doc.rect(margin, y, contentWidth, rowH, 'S')
      doc.setTextColor(...COLORS.body)
      doc.setFontSize(8)
      doc.text(`${i + 1}`, margin + 3, y + 5)
      doc.text(inst.label, margin + col1W + 3, y + 5)
      doc.text(fmt(inst.amount, true), margin + col1W + col2W + col3W - 3, y + 5, { align: 'right' })
      y += rowH
    })

    // Total row
    const instTotal = data.installments.reduce((sum, inst) => sum + inst.amount, 0)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.dark)
    doc.text(`Total: ${fmt(instTotal, true)}`, rightEdge, y + 5, { align: 'right' })
    y += 10
  }

  // ── 9. Closing Paragraph ─────────────────────────────────
  checkPageBreak(45)
  drawHRule(doc, y, margin, rightEdge)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.body)

  const closingText = "We like to keep things easy and pressure-free. If you're ready to move forward, just shoot a text to Marianna at 416-831-8942 to let her know. We'll do a quick happy dance on this end, then send a DocuSign agreement your way. Once you've reviewed and signed, the system will automatically email you a PDF copy for your records. You can send the e-transfer to info@sigsphoto.ca to get everything finalized!"

  const splitClosing = doc.splitTextToSize(closingText, contentWidth - 10)
  doc.text(splitClosing, margin + 5, y)
  y += splitClosing.length * 4.5 + 10

  // ── 10. Footer ───────────────────────────────────────────
  checkPageBreak(30)

  if (logoBase64) {
    const smallLogo = 15
    doc.addImage(logoBase64, 'JPEG', (pageWidth - smallLogo) / 2, y, smallLogo, smallLogo)
    y += smallLogo + 3
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.dark)
  doc.text('SIGS Photography Ltd.', pageWidth / 2, y, { align: 'center' })
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.muted)
  doc.text('265 Rimrock Rd, Unit 2A, Toronto, ON M3J 3A6', pageWidth / 2, y, { align: 'center' })
  y += 3.5
  doc.text('416-831-8942  |  info@sigsphoto.ca', pageWidth / 2, y, { align: 'center' })

  // ── 11. Document Properties & Save ───────────────────────
  doc.setProperties({
    title: `SIGS Photography Quote - ${data.brideFirstName} & ${data.groomFirstName}`,
    subject: 'Wedding Photography Proposal',
    author: 'SIGS Photography Ltd.',
    creator: 'StudioFlow Quote Builder',
  })

  const bride = data.brideFirstName || 'Bride'
  const groom = data.groomFirstName || 'Groom'
  const dateStamp = new Date().toISOString().split('T')[0]
  doc.save(`SIGS_Quote_${bride}_${groom}_${dateStamp}.pdf`)
}
