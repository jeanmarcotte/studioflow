import jsPDF from 'jspdf'

// ============================================================
// TYPES
// ============================================================

export interface ContractPdfData {
  brideFirstName: string
  brideLastName: string
  groomFirstName: string
  groomLastName: string
  brideEmail?: string
  bridePhone?: string
  groomEmail?: string
  groomPhone?: string

  weddingDate: string           // YYYY-MM-DD
  weddingDateDisplay: string    // "Oct 24, 2026"
  ceremonyVenue?: string
  receptionVenue?: string

  packageName: string           // "Exclusively Photography"
  packageHours: number
  packageFeatures?: string[]

  pricing: {
    subtotal: number
    discount: number
    hst: number
    total: number
  }

  installments: Array<{
    label: string
    amount: number
    dueDate?: string
  }>
}

// ============================================================
// HELPERS (duplicated from generateQuotePdf.ts to keep standalone)
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

function fmt(amount: number, forceDecimals = false): string {
  const decimals = forceDecimals || amount % 1 !== 0 ? 2 : 0
  return '$' + Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: 2 })
}

const COLORS = {
  dark: [41, 37, 36] as [number, number, number],
  body: [87, 83, 78] as [number, number, number],
  muted: [120, 113, 108] as [number, number, number],
  border: [214, 211, 209] as [number, number, number],
  bgLight: [245, 245, 244] as [number, number, number],
  green: [16, 185, 129] as [number, number, number],
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
// TERMS & CONDITIONS
// ============================================================

function getTermsAndConditions(coupleName: string, weddingDate: string, currentDate: string): string {
  return `TERMS AND CONDITIONS

This Wedding Photography Agreement ("Agreement") is entered into as of ${currentDate} between SIGS Photography Ltd. ("Photographer") and ${coupleName} ("Client") for wedding photography services on ${weddingDate}.

1. SERVICES AND COVERAGE

1.1 The Photographer agrees to provide wedding photography services as outlined in this Agreement for the wedding event of the Client on the date specified above.

1.2 The number of hours of coverage shall be as specified in the Package Summary section of this Agreement. Coverage begins at the time mutually agreed upon and continues for the contracted number of hours.

1.3 The Photographer will use professional judgment to capture the wedding day. While every effort will be made to photograph specific requested shots, the Photographer cannot guarantee any specific photograph will be captured due to the unpredictable nature of wedding events.

1.4 The Photographer reserves the right to use an assistant or second photographer as deemed necessary to fulfill the obligations of this Agreement.

2. PAYMENT TERMS

2.1 Payment shall be made according to the Payment Schedule outlined in this Agreement. The initial deposit is due upon signing of this Agreement to secure the date.

2.2 All payments are to be made by e-transfer to info@sigsphoto.ca unless otherwise arranged in writing.

2.3 If any payment is more than fourteen (14) days past due, the Photographer reserves the right to suspend services until payment is received in full, or to terminate this Agreement.

2.4 The deposit is non-refundable. It serves to reserve the date and compensate the Photographer for turning away other potential clients for that date.

3. CANCELLATION AND RESCHEDULING

3.1 If the Client cancels more than ninety (90) days before the wedding date, the deposit is forfeited but no additional fees apply.

3.2 If the Client cancels within ninety (90) days of the wedding date, the Client is responsible for fifty percent (50%) of the total contract amount.

3.3 If the Client cancels within thirty (30) days of the wedding date, the Client is responsible for the full contract amount.

3.4 Rescheduling is permitted one (1) time at no additional charge, subject to the Photographer's availability, provided the request is made at least sixty (60) days before the original wedding date. The rescheduled date must fall within twelve (12) months of the original date.

3.5 If the Photographer must cancel due to illness, injury, or other emergency beyond reasonable control, the Photographer will make every effort to secure a qualified replacement photographer. If no replacement can be found, a full refund of all payments will be issued.

4. IMAGE DELIVERY AND RIGHTS

4.1 Edited photographs will be delivered via online gallery within eight (8) to twelve (12) weeks following the wedding date. A preview gallery of select images may be provided within two (2) weeks.

4.2 The Photographer retains copyright to all images produced under this Agreement, in accordance with the Canadian Copyright Act. The Client is granted a personal, non-exclusive, non-transferable license to use the images for personal purposes including printing, sharing on social media, and display.

4.3 The Client may not sell, license, or commercially exploit any photographs without written permission from the Photographer.

4.4 The Photographer reserves the right to use any photographs for portfolio, website, social media, advertising, contest submissions, and other promotional purposes. The Client may request in writing that specific images not be used publicly, and the Photographer will honour such requests.

5. ALBUMS AND PRINTS

5.1 If albums or prints are included in the selected package, the Client will receive a design proof for approval before production begins.

5.2 The Client is entitled to two (2) rounds of revisions on album design. Additional revisions may incur a fee of $50 per round.

5.3 Album and print production typically takes six (6) to ten (10) weeks from design approval. Timelines may vary based on supplier availability.

6. LIABILITY AND LIMITATIONS

6.1 The Photographer carries professional liability insurance and will exercise due care in the performance of services.

6.2 In the unlikely event of equipment failure, theft, or loss of images due to circumstances beyond the Photographer's control, the Photographer's liability shall be limited to a refund of the fees paid under this Agreement.

6.3 The Photographer is not responsible for compromised photographs due to uncooperative subjects, interference by other photographers or videographers, or limitations of the venue (lighting, space, restrictions imposed by the venue or officiant).

6.4 The Photographer shall not be liable for any indirect, incidental, or consequential damages.

7. CLIENT COOPERATION

7.1 The Client agrees to provide a detailed timeline of the wedding day at least two (2) weeks prior to the event.

7.2 The Client agrees to inform the Photographer of any venue restrictions, photography limitations, or special requirements in advance.

7.3 The Client agrees to designate a point of contact for the wedding day who can assist the Photographer with group photo organization and timing.

8. FORCE MAJEURE

8.1 Neither party shall be liable for failure to perform due to circumstances beyond reasonable control, including but not limited to natural disasters, extreme weather, pandemic restrictions, government orders, or acts of God.

8.2 In such events, both parties will work together in good faith to reschedule services or arrange a mutually acceptable resolution.

9. DISPUTE RESOLUTION

9.1 Any disputes arising from this Agreement shall first be addressed through good-faith negotiation between the parties.

9.2 If negotiation fails, disputes shall be submitted to mediation in the Province of Ontario before any legal proceedings are initiated.

9.3 This Agreement shall be governed by and construed in accordance with the laws of the Province of Ontario and the laws of Canada applicable therein.

10. ENTIRE AGREEMENT

10.1 This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, and agreements.

10.2 Any amendments to this Agreement must be made in writing and signed by both parties.

10.3 If any provision of this Agreement is found to be unenforceable, the remaining provisions shall continue in full force and effect.`
}

// ============================================================
// MAIN CONTRACT PDF FUNCTION
// ============================================================

export async function generateContractPdf(data: ContractPdfData): Promise<void> {
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
  doc.text('Wedding Photography Agreement', pageWidth / 2, y, { align: 'center' })
  y += 6
  drawHRule(doc, y, margin, rightEdge)
  y += 8

  // ── 3. Couple Information ────────────────────────────────
  drawSectionHeader(doc, 'Client Information', margin, y, contentWidth)
  y += 8

  const coupleName = [
    [data.brideFirstName, data.brideLastName].filter(Boolean).join(' '),
    [data.groomFirstName, data.groomLastName].filter(Boolean).join(' '),
  ].filter(Boolean).join(' & ')

  drawLabelValue(doc, 'Couple', coupleName, margin, y)
  y += 6

  const colRight = margin + 90
  if (data.brideEmail || data.groomEmail) {
    if (data.brideEmail) drawLabelValue(doc, 'Email', data.brideEmail, margin, y)
    if (data.groomEmail) drawLabelValue(doc, 'Email', data.groomEmail, colRight, y)
    y += 6
  }
  if (data.bridePhone || data.groomPhone) {
    if (data.bridePhone) drawLabelValue(doc, 'Phone', data.bridePhone, margin, y)
    if (data.groomPhone) drawLabelValue(doc, 'Phone', data.groomPhone, colRight, y)
    y += 6
  }
  y += 2

  // ── 4. Wedding Details ───────────────────────────────────
  drawSectionHeader(doc, 'Wedding Details', margin, y, contentWidth)
  y += 8

  drawLabelValue(doc, 'Date', formatDate(data.weddingDate), margin, y)
  y += 6
  if (data.ceremonyVenue) { drawLabelValue(doc, 'Ceremony', data.ceremonyVenue, margin, y); y += 6 }
  if (data.receptionVenue) { drawLabelValue(doc, 'Reception', data.receptionVenue, margin, y); y += 6 }

  y += 2
  drawHRule(doc, y, margin, rightEdge)
  y += 6

  // ── 5. Package ───────────────────────────────────────────
  drawSectionHeader(doc, 'Package Summary', margin, y, contentWidth)
  y += 8

  // Package badge
  const badgeText = 'PHOTO ONLY'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  const badgeW = doc.getTextWidth(badgeText) + 8
  doc.setFillColor(...COLORS.green)
  doc.roundedRect(margin, y - 4, badgeW, 6.5, 1, 1, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(badgeText, margin + 4, y + 0.5)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.dark)
  doc.text(`${data.packageName} — ${data.packageHours} hours`, margin, y)
  y += 7

  // Features
  if (data.packageFeatures && data.packageFeatures.length > 0) {
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
  }

  y += 2
  drawHRule(doc, y, margin, rightEdge)
  y += 6

  // ── 6. Pricing Summary ───────────────────────────────────
  checkPageBreak(40)
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

  // Subtotal
  drawPriceLine(`${data.packageName} (${data.packageHours}hr)`, data.pricing.subtotal)
  y += 5.5

  // Discount
  if (data.pricing.discount > 0) {
    drawPriceLine('Discount', data.pricing.discount, { color: 'green', negative: true })
    y += 5.5
  }

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

  // ── 7. Payment Schedule ──────────────────────────────────
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

  // ── 8. Terms & Conditions (pages 3+) ─────────────────────
  doc.addPage()
  y = 20

  const todayStr = formatDate(new Date().toISOString().split('T')[0])
  const weddingDateStr = formatDate(data.weddingDate)
  const tcText = getTermsAndConditions(coupleName, weddingDateStr, todayStr)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.body)

  const lines = doc.splitTextToSize(tcText, contentWidth)
  const lineHeight = 3.2

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string

    // Check if this is a section header (numbered clause titles)
    const isMainHeader = line === 'TERMS AND CONDITIONS'
    const isClauseHeader = /^\d+\.\s[A-Z]/.test(line)

    if (isMainHeader) {
      checkPageBreak(10)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...COLORS.dark)
      doc.text(line, pageWidth / 2, y, { align: 'center' })
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...COLORS.body)
      continue
    }

    if (isClauseHeader) {
      checkPageBreak(8)
      y += 2
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...COLORS.dark)
      doc.text(line, margin, y)
      y += lineHeight + 1
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...COLORS.body)
      continue
    }

    // Regular line
    checkPageBreak(lineHeight + 1)
    doc.text(line, margin, y)
    y += lineHeight
  }

  // ── 9. Signature Block ───────────────────────────────────
  checkPageBreak(60)
  y += 10
  drawHRule(doc, y, margin, rightEdge)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.dark)
  doc.text('ACCEPTANCE AND SIGNATURES', margin, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.body)
  doc.text('By signing below, both parties agree to the terms and conditions outlined in this Agreement.', margin, y)
  y += 12

  // Client signature
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.dark)
  doc.text('CLIENT', margin, y)
  y += 8

  doc.setDrawColor(...COLORS.dark)
  doc.setLineWidth(0.3)
  doc.line(margin, y, margin + 80, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.muted)
  doc.text('Signature', margin, y + 4)

  doc.line(margin + 95, y, rightEdge, y)
  doc.text('Date', margin + 95, y + 4)
  y += 10

  doc.setDrawColor(...COLORS.dark)
  doc.line(margin, y, margin + 80, y)
  doc.text('Print Name', margin, y + 4)
  y += 14

  // Photographer signature
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.dark)
  doc.text('PHOTOGRAPHER — SIGS Photography Ltd.', margin, y)
  y += 8

  doc.setDrawColor(...COLORS.dark)
  doc.line(margin, y, margin + 80, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.muted)
  doc.text('Signature', margin, y + 4)

  doc.line(margin + 95, y, rightEdge, y)
  doc.text('Date', margin + 95, y + 4)
  y += 10

  doc.setDrawColor(...COLORS.dark)
  doc.line(margin, y, margin + 80, y)
  doc.text('Print Name', margin, y + 4)
  y += 14

  // ── 10. Footer on last page ──────────────────────────────
  checkPageBreak(25)

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
    title: `SIGS Photography Contract - ${data.brideFirstName} & ${data.groomFirstName}`,
    subject: 'Wedding Photography Agreement',
    author: 'SIGS Photography Ltd.',
    creator: 'StudioFlow Contract Generator',
  })

  const bride = data.brideFirstName || 'Client'
  const groom = data.groomFirstName || ''
  const namePart = groom ? `${bride}_${groom}` : bride
  const dateStamp = new Date().toISOString().split('T')[0]
  doc.save(`SIGS_Contract_${namePart}_${dateStamp}.pdf`)
}
