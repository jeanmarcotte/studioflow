import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

// ── Helpers ──────────────────────────────────────────────────────

function formatJobType(type: string): string {
  const map: Record<string, string> = {
    wedding_proofs: 'Wedding Proofs', WED_PROOFS: 'Wedding Proofs',
    eng_proofs: 'Engagement Proofs', ENG_PROOFS: 'Engagement Proofs',
    WED_PACKAGE: 'Wedding Package', WED_ALBUM: 'Wedding Album',
    WED_FRAMES: 'Wedding Frames', WED_CANVAS: 'Wedding Canvas',
    WED_PORTRAIT: 'Wedding Portrait', WED_PORTRAITS: 'Wedding Portrait',
    PARENT_BOOK: 'Parent Album', ENG_COLLAGE: 'Engagement Collage',
    bg_album: 'B&G Album', bg_portrait_canvas: 'B&G Portrait Canvas',
    bg_portrait_print: 'B&G Portrait Print',
    parent_album: 'Parent Album', parent_portrait_print: 'Parent Portrait Print',
    parent_portrait_canvas: 'Parent Portrait Canvas',
    BEST_PRINT: 'Best Canvas Print', TYC: 'Thank You Cards',
    tyc: 'Thank You Cards', hires_wedding: 'Hi-Res Wedding',
    eng_collage: 'Engagement Collage', eng_signing_book: 'Engagement Signing Book',
    eng_album: 'Engagement Album', eng_prints: 'Engagement Prints',
    hires_engagement: 'Hi-Res Engagement',
  }
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
}

function formatVendor(vendor: string | null): string {
  if (!vendor) return '&mdash;'
  const normalized = vendor.toLowerCase().replace(/-/g, '_')
  const map: Record<string, string> = {
    in_house: 'In-House', cci: 'CCI', uaf: 'UAF',
    best: 'Best Canvas', best_canvas: 'Best Canvas', custom: 'Custom',
  }
  return map[normalized] || map[vendor] || vendor
}

function formatVideoJobType(type: string): string {
  const map: Record<string, string> = {
    FULL: 'Full Wedding Video', RECAP: 'Recap Video', ENG_SLIDESHOW: 'Engagement Slideshow',
  }
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '&mdash;'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0
  const d = new Date(dateStr + 'T12:00:00')
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function safeDeleted(pt: number, tp: number): number {
  if (tp <= 0 || pt <= 0 || pt <= tp) return 0
  return pt - tp
}

function pctStr(deleted: number, pt: number): string {
  return deleted > 0 && pt > 0 ? ((deleted / pt) * 100).toFixed(1) + '%' : '&mdash;'
}

function pctComp(esf: number, pt: number): string {
  return pt > 0 ? ((esf / pt) * 100).toFixed(1) + '%' : '&mdash;'
}

function isProofsJob(jobType: string): boolean {
  return jobType.toLowerCase().includes('proofs')
}

function countSegments(job: any): number {
  let c = 0
  if (job.ceremony_done) c++
  if (job.reception_done) c++
  if (job.park_done) c++
  if (job.prereception_done) c++
  if (job.groom_done) c++
  if (job.bride_done) c++
  return c
}

const SEGMENT_FIELDS = ['ceremony_done', 'reception_done', 'park_done', 'prereception_done', 'groom_done', 'bride_done'] as const

const PHOTO_PIPELINE = [
  { status: 'ready_to_reedit', label: 'Ready to Re-edit' },
  { status: 'reediting', label: 'Re-editing' },
  { status: 'at_lab', label: 'At Lab' },
  { status: 'at_studio', label: 'At Studio' },
  { status: 'on_hold', label: 'On Hold' },
]

const DELIVERABLE_MAP: Record<string, string> = {
  wedding_proofs: 'Wedding Proofs', WED_PROOFS: 'Wedding Proofs',
  eng_proofs: 'Engagement Proofs', ENG_PROOFS: 'Engagement Proofs',
  WED_PACKAGE: 'Wedding Package',
  parent_album: 'Parent Album', PARENT_BOOK: 'Parent Album',
  WED_ALBUM: 'Wedding Album',
  bg_album: 'B&G Album',
  BEST_PRINT: 'Best Canvas Print',
  ENG_COLLAGE: 'Engagement Collage', eng_collage: 'Engagement Collage',
  WED_FRAMES: 'Wedding Frames',
  WED_PORTRAIT: 'Wedding Portrait', WED_PORTRAITS: 'Wedding Portrait',
  TYC: 'Thank You Cards', tyc: 'Thank You Cards',
}

// ── Build email HTML ─────────────────────────────────────────────

function buildEmailHtml(data: {
  allPhotoJobs: any[]
  videoJobs: any[]
  waitingCouples: any[]
  timestamp: string
}): string {
  const { allPhotoJobs, videoJobs, waitingCouples, timestamp } = data

  // Style constants
  const th = 'style="text-align:left;padding:8px 12px;font-size:11px;font-weight:700;color:#0d4f4f;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e7e1d8;"'
  const thR = 'style="text-align:right;padding:8px 12px;font-size:11px;font-weight:700;color:#0d4f4f;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e7e1d8;"'
  const thC = 'style="text-align:center;padding:8px 12px;font-size:11px;font-weight:700;color:#0d4f4f;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e7e1d8;"'
  const td = 'style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f3f0ed;"'
  const tdR = 'style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f3f0ed;text-align:right;"'
  const tdC = 'style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f3f0ed;text-align:center;"'
  const tdGray = 'style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f3f0ed;color:#78716c;"'
  const tdGrayR = 'style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f3f0ed;color:#78716c;text-align:right;"'

  // ── Photo computations ──────────────────────────────────────
  const activePhotoJobs = allPhotoJobs.filter((j: any) => !['completed', 'picked_up'].includes(j.status))
  const editingProofs = activePhotoJobs.filter((j: any) => j.status === 'in_progress')
  const atLabCount = activePhotoJobs.filter((j: any) => j.status === 'at_lab').length

  const asapPt = editingProofs.reduce((s: number, j: any) => s + (j.photos_taken || 0), 0)
  const asapEsf = editingProofs.reduce((s: number, j: any) => s + (j.edited_so_far || 0), 0)
  const asapTp = editingProofs.reduce((s: number, j: any) => s + (j.total_proofs || 0), 0)
  const asapDel = safeDeleted(asapPt, asapTp)
  const asapRemain = asapTp > 0 ? asapTp - asapEsf : asapPt - asapEsf

  const cemProofs = allPhotoJobs.filter((j: any) => ['completed', 'picked_up'].includes(j.status) && isProofsJob(j.job_type))
  const cemPt = cemProofs.reduce((s: number, j: any) => s + (j.photos_taken || 0), 0)
  const cemEsf = cemProofs.reduce((s: number, j: any) => s + (j.edited_so_far || 0), 0)
  const cemTp = cemProofs.reduce((s: number, j: any) => s + (j.total_proofs || 0), 0)
  const cemDel = safeDeleted(cemPt, cemTp)

  const proofsAll = allPhotoJobs.filter((j: any) => isProofsJob(j.job_type))
  const ytdPt = proofsAll.reduce((s: number, j: any) => s + (j.photos_taken || 0), 0)
  const ytdEsf = proofsAll.reduce((s: number, j: any) => s + (j.edited_so_far || 0), 0)
  const ytdTp = proofsAll.reduce((s: number, j: any) => s + (j.total_proofs || 0), 0)
  const ytdDel = safeDeleted(ytdPt, ytdTp)

  // Deliverables
  const delivStatusGroups = ['completed', 'picked_up', 'at_lab', 'at_studio', 'ready_to_reedit', 'reediting']
  const photoDelivMap: Record<string, { done: number; at_lab: number; at_studio: number; re_edit: number }> = {}
  for (const job of allPhotoJobs) {
    if (!delivStatusGroups.includes(job.status)) continue
    const label = DELIVERABLE_MAP[job.job_type] || formatJobType(job.job_type)
    if (!photoDelivMap[label]) photoDelivMap[label] = { done: 0, at_lab: 0, at_studio: 0, re_edit: 0 }
    if (job.status === 'completed' || job.status === 'picked_up') photoDelivMap[label].done++
    else if (job.status === 'at_lab') photoDelivMap[label].at_lab++
    else if (job.status === 'at_studio') photoDelivMap[label].at_studio++
    else photoDelivMap[label].re_edit++
  }
  const photoDeliverables = Object.entries(photoDelivMap).filter(([, c]) => c.done + c.at_lab + c.at_studio + c.re_edit > 0)

  // ── Video computations ──────────────────────────────────────
  const videoEditing = videoJobs.filter((v: any) => ['in_progress', 'waiting_for_bride', 'waiting_on_recap'].includes(v.status))
  const videoNotStarted = [...videoJobs.filter((v: any) => v.status === 'not_started')]
    .sort((a: any, b: any) => (a.couples?.wedding_date || '').localeCompare(b.couples?.wedding_date || ''))
  const videoCompleted2026 = videoJobs.filter((v: any) => v.completed_date && v.completed_date >= '2026-01-01')
    .sort((a: any, b: any) => (b.completed_date || '').localeCompare(a.completed_date || ''))

  const segsDone = videoEditing.reduce((s: number, v: any) => s + countSegments(v), 0)
  const segsTotal = videoEditing.length * 6

  // Video type breakdown
  const vidTypeCounts: Record<string, number> = {}
  videoCompleted2026.forEach((v: any) => { vidTypeCounts[v.job_type] = (vidTypeCounts[v.job_type] || 0) + 1 })
  const vidTypeOrder = ['FULL', 'RECAP']
  const vidBreakdown = Object.entries(vidTypeCounts)
    .sort(([a], [b]) => {
      const ai = vidTypeOrder.indexOf(a), bi = vidTypeOrder.indexOf(b)
      if (ai >= 0 && bi >= 0) return ai - bi
      if (ai >= 0) return -1
      if (bi >= 0) return 1
      return a.localeCompare(b)
    })
    .map(([type, count]) => `${count} ${(type === 'ENG_SLIDESHOW' ? 'SLIDESHOW' : type.replace(/_/g, ' ')).toUpperCase()}`)
    .join(' &middot; ')

  // ── Section 1: Executive Summary (At a Glance) ─────────────

  const metricCell = (label: string, value: string, sub: string, color: string) => `
    <td style="width:33%;padding:14px;background:#ffffff;border:1px solid #e7e1d8;border-radius:8px;">
      <div style="font-size:10px;font-weight:700;color:#78716c;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">${label}</div>
      <div style="font-size:26px;font-weight:700;color:${color};font-family:'Trebuchet MS',sans-serif;">${value}</div>
      <div style="font-size:11px;color:#a8a29e;margin-top:2px;">${sub}</div>
    </td>`

  const atAGlance = `
    <div style="margin-bottom:28px;">
      <div style="font-size:18px;font-weight:700;color:#0d4f4f;font-family:Georgia,serif;margin-bottom:14px;">At a Glance</div>
      <table style="width:100%;border-collapse:separate;border-spacing:8px;">
        <tr>
          ${metricCell('Photos Remaining', asapRemain.toLocaleString(), `${asapEsf.toLocaleString()} of ${(asapTp || asapPt).toLocaleString()} edited`, '#0d4f4f')}
          ${metricCell('Awaiting Photo Order', waitingCouples.length.toString(), 'couples waiting', waitingCouples.length > 3 ? '#92400e' : '#0d4f4f')}
          ${metricCell('At Lab', atLabCount.toString(), 'orders being printed', '#0d4f4f')}
        </tr>
        <tr>
          ${metricCell('Videos In Production', videoEditing.length.toString(), `${videoEditing.filter((v: any) => v.status === 'in_progress').length} active &middot; ${videoEditing.filter((v: any) => v.status !== 'in_progress').length} waiting`, '#0d4f4f')}
          ${metricCell('Video Backlog', videoNotStarted.length.toString(), videoNotStarted.length > 0 && videoNotStarted[0].couples?.wedding_date ? `oldest: ${daysSince(videoNotStarted[0].couples.wedding_date)} days` : 'no jobs waiting', videoNotStarted.length > 3 ? '#92400e' : '#0d4f4f')}
          ${metricCell('Segments Progress', `${segsDone}/${segsTotal}`, 'segments complete', '#0d4f4f')}
        </tr>
      </table>
    </div>`

  // 2026 Velocity
  const velocityHtml = `
    <div style="margin-bottom:28px;">
      <div style="font-size:18px;font-weight:700;color:#0d4f4f;font-family:Georgia,serif;margin-bottom:14px;">2026 Velocity</div>
      <table style="width:100%;border-collapse:separate;border-spacing:8px;">
        <tr>
          <td style="width:50%;padding:16px;background:#ffffff;border:1px solid #e7e1d8;border-radius:8px;">
            <div style="font-size:10px;font-weight:700;color:#78716c;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Photo Editing 2026</div>
            <div style="font-size:26px;font-weight:700;color:#0d4f4f;">${ytdEsf.toLocaleString()} <span style="font-size:12px;font-weight:400;color:#a8a29e;">of ${ytdPt.toLocaleString()} photos</span></div>
            <div style="font-size:12px;color:#78716c;margin-top:4px;">${ytdPt > 0 ? ((ytdEsf / ytdPt) * 100).toFixed(1) : 0}% complete (proofs only)</div>
            <div style="margin-top:10px;height:6px;background:#e7e1d8;border-radius:3px;overflow:hidden;">
              <div style="height:100%;background:#0d9488;border-radius:3px;width:${ytdPt > 0 ? Math.round((ytdEsf / ytdPt) * 100) : 0}%;"></div>
            </div>
          </td>
          <td style="width:50%;padding:16px;background:#ffffff;border:1px solid #e7e1d8;border-radius:8px;">
            <div style="font-size:10px;font-weight:700;color:#78716c;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Video Editing 2026</div>
            <div style="font-size:26px;font-weight:700;color:#0d4f4f;">${videoCompleted2026.length} <span style="font-size:12px;font-weight:400;color:#a8a29e;">videos edited</span></div>
            <div style="font-size:12px;color:#78716c;margin-top:4px;">${vidBreakdown || 'No videos completed yet'}</div>
          </td>
        </tr>
      </table>
    </div>`

  // Attention Required
  let attentionHtml = ''
  if (waitingCouples.length > 0) {
    let rows = ''
    for (const c of waitingCouples) {
      const days = daysSince(c.wedding_date)
      const style = days > 180 ? 'color:#b91c1c;font-weight:700;' : days > 90 ? 'color:#dc2626;' : 'color:#78716c;'
      rows += `<tr>
        <td ${td} style="${style}">${c.couple_name}</td>
        <td ${tdGray}>${fmtDate(c.wedding_date)}</td>
        <td ${tdR} style="${style}font-weight:600;">${days} days</td>
      </tr>`
    }
    attentionHtml = `
      <div style="margin-bottom:28px;">
        <div style="font-size:18px;font-weight:700;color:#0d4f4f;font-family:Georgia,serif;margin-bottom:14px;">Attention Required</div>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;overflow:hidden;">
          <div style="background:#fef3c7;padding:10px 14px;border-bottom:1px solid #fde68a;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">
            Couples Awaiting Photo Order
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <tr style="background:#fffdf7;"><th ${th} style="color:#92400e;">Couple</th><th ${th} style="color:#92400e;">Wedding Date</th><th ${thR} style="color:#92400e;">Days Since</th></tr>
            ${rows}
          </table>
        </div>
      </div>`
  }

  // ── Section 2: Photo Production Detail ──────────────────────

  let editingRows = ''
  for (const job of editingProofs) {
    const pt = job.photos_taken || 0
    const esf = job.edited_so_far || 0
    const tp = job.total_proofs || 0
    const del = safeDeleted(pt, tp)
    editingRows += `<tr>
      <td ${td}><strong>${job.couples?.couple_name || 'Unknown'}</strong>${job.couples?.wedding_date ? `<br><span style="font-size:11px;color:#a8a29e;">${fmtDate(job.couples.wedding_date)}</span>` : ''}</td>
      <td ${tdGray}>${formatJobType(job.job_type)}</td>
      <td ${tdR}>${pt.toLocaleString()}</td>
      <td ${tdR}>${esf.toLocaleString()}</td>
      <td ${tdGrayR}>${(tp > 0 ? tp - esf : pt - esf).toLocaleString()}</td>
      <td ${tdGrayR}>${del > 0 ? del.toLocaleString() : '&mdash;'}</td>
      <td ${tdR}>${tp.toLocaleString()}</td>
      <td ${tdGrayR}>${pctStr(del, pt)}</td>
      <td ${tdGrayR}>${pctComp(esf, pt)}</td>
    </tr>`
  }

  let photoDelivHtml = ''
  if (photoDeliverables.length > 0) {
    let rows = ''
    for (const [label, counts] of photoDeliverables) {
      rows += `<tr>
        <td ${td}><strong>${label}</strong></td>
        <td ${tdR}>${counts.done > 0 ? counts.done : '&mdash;'}</td>
        <td ${tdGrayR}>${counts.at_lab > 0 ? counts.at_lab : '&mdash;'}</td>
        <td ${tdGrayR}>${counts.at_studio > 0 ? counts.at_studio : '&mdash;'}</td>
        <td ${tdGrayR}>${counts.re_edit > 0 ? counts.re_edit : '&mdash;'}</td>
      </tr>`
    }
    photoDelivHtml = `
      <div style="margin-bottom:20px;">
        <div style="background:rgba(13,79,79,0.04);padding:10px 14px;border-bottom:1px solid #e7e1d8;font-size:12px;font-weight:700;color:#0d4f4f;text-transform:uppercase;letter-spacing:0.5px;">Photo Deliverables</div>
        <table style="width:100%;border-collapse:collapse;background:white;">
          <tr style="background:#fafaf9;"><th ${th}>Deliverable</th><th ${thR}>Done</th><th ${thR}>At Lab</th><th ${thR}>At Studio</th><th ${thR}>Re-edit</th></tr>
          ${rows}
        </table>
      </div>`
  }

  let pipelineHtml = ''
  for (const section of PHOTO_PIPELINE) {
    const sectionJobs = activePhotoJobs.filter((j: any) => j.status === section.status)
    if (sectionJobs.length === 0) continue
    let rows = ''
    for (const job of sectionJobs) {
      rows += `<tr>
        <td ${td}><strong>${job.couples?.couple_name || 'Unknown'}</strong></td>
        <td ${tdGray}>${fmtDate(job.couples?.wedding_date ?? null)}</td>
        <td ${tdGray}>${formatJobType(job.job_type)}</td>
        <td ${tdGrayR}>${job.photos_taken ?? '&mdash;'}</td>
        <td ${tdGray}>${formatVendor(job.vendor)}</td>
      </tr>`
    }
    pipelineHtml += `
      <div style="margin-bottom:16px;">
        <div style="background:rgba(13,79,79,0.04);padding:10px 14px;border-bottom:1px solid #e7e1d8;font-size:12px;font-weight:700;color:#0d4f4f;text-transform:uppercase;letter-spacing:0.5px;">${section.label} (${sectionJobs.length})</div>
        <table style="width:100%;border-collapse:collapse;background:white;">
          <tr style="background:#fafaf9;"><th ${th}>Couple</th><th ${th}>Date</th><th ${th}>Job</th><th ${thR}>Photos</th><th ${th}>Vendor</th></tr>
          ${rows}
        </table>
      </div>`
  }

  // ── Section 3: Video Production Detail ──────────────────────

  let videoEditingHtml = ''
  if (videoEditing.length > 0) {
    let rows = ''
    for (const vj of videoEditing) {
      const doneCount = countSegments(vj)
      const segs = SEGMENT_FIELDS.map(f => vj[f] ? '&#9679;' : '&#9675;').join(' ')
      const daysW = vj.couples?.wedding_date ? daysSince(vj.couples.wedding_date) : 0
      const daysStyle = daysW > 90 ? 'color:#dc2626;font-weight:700;' : daysW > 60 ? 'color:#d97706;font-weight:700;' : 'font-weight:700;'
      const statusLabel = vj.status === 'in_progress' ? 'In Progress' : vj.status === 'waiting_for_bride' ? 'Waiting for Bride' : vj.status === 'waiting_on_recap' ? 'Waiting on Recap' : vj.status
      rows += `<tr>
        <td ${td} style="${daysStyle}">${daysW}d</td>
        <td ${td}><strong>${vj.couples?.couple_name || 'Unknown'}</strong></td>
        <td ${tdGray}>${formatVideoJobType(vj.job_type)}</td>
        <td ${td} style="text-align:center;font-size:12px;"><strong>${doneCount}/6</strong> ${segs}</td>
        <td ${tdC}>${vj.proxies_run ? '&#9679;' : '&#9675;'}</td>
        <td ${tdC}>${vj.video_form ? '&#9679;' : '&#9675;'}</td>
        <td ${tdGray}>${statusLabel}</td>
      </tr>`
    }
    videoEditingHtml = `
      <div style="margin-bottom:20px;">
        <div style="background:rgba(13,79,79,0.04);padding:10px 14px;border-bottom:1px solid #e7e1d8;font-size:12px;font-weight:700;color:#0d4f4f;text-transform:uppercase;letter-spacing:0.5px;">Currently Editing (${videoEditing.length})</div>
        <table style="width:100%;border-collapse:collapse;background:white;">
          <tr style="background:#fafaf9;"><th ${th}>Days</th><th ${th}>Couple</th><th ${th}>Type</th><th ${thC}>Segments</th><th ${thC}>Prox</th><th ${thC}>Form</th><th ${th}>Status</th></tr>
          ${rows}
        </table>
      </div>`
  }

  // Video metric tiles
  const videoMetrics = `
    <table style="width:100%;border-collapse:separate;border-spacing:8px;margin-bottom:20px;">
      <tr>
        <td style="width:33%;padding:12px;background:#f9fafb;border:1px solid #e7e1d8;border-radius:6px;">
          <div style="font-size:10px;font-weight:700;color:#78716c;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">In Production</div>
          <div style="font-size:22px;font-weight:700;color:#1c1917;">${segsDone}/${segsTotal}</div>
          <div style="font-size:11px;color:#a8a29e;">segments complete</div>
        </td>
        <td style="width:33%;padding:12px;background:#f9fafb;border:1px solid #e7e1d8;border-radius:6px;">
          <div style="font-size:10px;font-weight:700;color:#78716c;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Incoming Work</div>
          <div style="font-size:22px;font-weight:700;color:#d97706;">${waitingCouples.length}</div>
          <div style="font-size:11px;color:#78716c;">couples awaiting order</div>
          <div style="font-size:11px;color:#a8a29e;">${videoNotStarted.length} not-started jobs</div>
        </td>
        <td style="width:33%;padding:12px;background:#f9fafb;border:1px solid #e7e1d8;border-radius:6px;">
          <div style="font-size:10px;font-weight:700;color:#78716c;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">2026 Velocity</div>
          <div style="font-size:22px;font-weight:700;color:#0d9488;">${videoCompleted2026.length}</div>
          <div style="font-size:11px;color:#78716c;">${vidBreakdown || 'No videos completed'}</div>
        </td>
      </tr>
    </table>`

  // Video Not Started
  let videoNotStartedHtml = ''
  if (videoNotStarted.length > 0) {
    let rows = ''
    for (const vj of videoNotStarted) {
      rows += `<tr>
        <td ${td}><strong>${vj.couples?.couple_name || 'Unknown'}</strong></td>
        <td ${tdGray}>${fmtDate(vj.couples?.wedding_date ?? null)}</td>
        <td ${tdGray}>${formatVideoJobType(vj.job_type)}</td>
        <td ${tdGray}>${vj.assigned_to || '&mdash;'}</td>
        <td ${tdC}>${vj.proxies_run ? '&#9679;' : '&#9675;'}</td>
      </tr>`
    }
    videoNotStartedHtml = `
      <div style="margin-bottom:20px;">
        <div style="background:rgba(13,79,79,0.04);padding:10px 14px;border-bottom:1px solid #e7e1d8;font-size:12px;font-weight:700;color:#0d4f4f;text-transform:uppercase;letter-spacing:0.5px;">Not Started (${videoNotStarted.length})</div>
        <table style="width:100%;border-collapse:collapse;background:white;">
          <tr style="background:#fafaf9;"><th ${th}>Couple</th><th ${th}>Date</th><th ${th}>Type</th><th ${th}>Assigned</th><th ${thC}>Proxies</th></tr>
          ${rows}
        </table>
      </div>`
  }

  // Video Completed 2026
  let videoCompleted2026Html = ''
  if (videoCompleted2026.length > 0) {
    let rows = ''
    for (const vj of videoCompleted2026) {
      rows += `<tr>
        <td ${td}><strong>${vj.couples?.couple_name || 'Unknown'}</strong></td>
        <td ${tdGray}>${fmtDate(vj.couples?.wedding_date ?? null)}</td>
        <td ${tdGray}>${formatVideoJobType(vj.job_type)}</td>
        <td ${td} style="color:#0d9488;">${fmtDate(vj.completed_date)}</td>
        <td ${tdGray}>${vj.assigned_to || '&mdash;'}</td>
      </tr>`
    }
    videoCompleted2026Html = `
      <div style="margin-bottom:20px;">
        <div style="background:rgba(13,79,79,0.04);padding:10px 14px;border-bottom:1px solid #e7e1d8;font-size:12px;font-weight:700;color:#0d4f4f;text-transform:uppercase;letter-spacing:0.5px;">Completed in 2026 (${videoCompleted2026.length})</div>
        <table style="width:100%;border-collapse:collapse;background:white;">
          <tr style="background:#fafaf9;"><th ${th}>Couple</th><th ${th}>Date</th><th ${th}>Type</th><th ${th}>Completed</th><th ${th}>Assigned</th></tr>
          ${rows}
          <tr style="background:#f5f5f4;border-top:2px solid #e7e1d8;">
            <td ${td} style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#78716c;">${videoCompleted2026.length} completed</td>
            <td ${td} colspan="2"></td>
            <td ${td} colspan="2" style="font-size:12px;color:#78716c;font-weight:600;">${vidBreakdown}</td>
          </tr>
        </table>
      </div>`
  }

  // ── Assemble full HTML ──────────────────────────────────────

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:Georgia,'Trebuchet MS',Verdana,sans-serif;">
<div style="max-width:700px;margin:0 auto;background:#ffffff;">

  <!-- Header -->
  <div style="background:#0d4f4f;color:white;padding:28px 24px;">
    <h1 style="margin:0;font-size:24px;font-family:Georgia,serif;letter-spacing:0.5px;">SIGS Photography</h1>
    <p style="margin:6px 0 0;font-size:15px;color:#a3d4d4;">Production Status Report</p>
    <p style="margin:4px 0 0;font-size:12px;color:#7ab8b8;">${timestamp}</p>
  </div>

  <div style="padding:24px;">

    <!-- PAGE 1: EXECUTIVE SUMMARY -->
    ${atAGlance}
    ${velocityHtml}
    ${attentionHtml}

    <!-- PAGE 2: PHOTO PRODUCTION -->
    <div style="background:#0d4f4f;color:white;padding:12px 16px;border-radius:6px;margin:8px 0 20px;font-size:17px;font-weight:700;font-family:Georgia,serif;">
      Photo Production
    </div>

    <div style="margin-bottom:20px;">
      <div style="background:rgba(13,79,79,0.04);padding:10px 14px;border-bottom:1px solid #e7e1d8;font-size:12px;font-weight:700;color:#0d4f4f;text-transform:uppercase;letter-spacing:0.5px;">Currently Editing (${editingProofs.length})</div>
      <table style="width:100%;border-collapse:collapse;background:white;">
        <tr style="background:#fafaf9;">
          <th ${th}>Couple</th><th ${th}>Job</th><th ${thR}>Taken</th><th ${thR}>Edited</th><th ${thR}>Remain</th><th ${thR}>Del</th><th ${thR}>Proofs</th><th ${thR}>%Del</th><th ${thR}>%Done</th>
        </tr>
        ${editingRows}
        <tr style="background:#f5f5f4;font-weight:700;">
          <td ${td}><strong>Currently Due ASAP</strong></td><td ${td}></td>
          <td ${tdR}><strong>${asapPt.toLocaleString()}</strong></td><td ${tdR}><strong>${asapEsf.toLocaleString()}</strong></td>
          <td ${tdR}><strong>${(asapTp > 0 ? asapTp - asapEsf : asapPt - asapEsf).toLocaleString()}</strong></td>
          <td ${tdR}><strong>${asapDel > 0 ? asapDel.toLocaleString() : '&mdash;'}</strong></td>
          <td ${tdR}><strong>${asapTp.toLocaleString()}</strong></td>
          <td ${tdR}><strong>${pctStr(asapDel, asapPt)}</strong></td>
          <td ${tdR}><strong>${pctComp(asapEsf, asapPt)}</strong></td>
        </tr>
        <tr style="background:#f0f0ef;font-weight:700;color:#78716c;">
          <td ${td}><strong>Completed 2026</strong></td><td ${td}></td>
          <td ${tdR}><strong>${cemPt.toLocaleString()}</strong></td><td ${tdR}><strong>${cemEsf.toLocaleString()}</strong></td>
          <td ${tdR}><strong>${(cemTp > 0 ? cemTp - cemEsf : cemPt - cemEsf).toLocaleString()}</strong></td>
          <td ${tdR}><strong>${cemDel > 0 ? cemDel.toLocaleString() : '&mdash;'}</strong></td>
          <td ${tdR}><strong>${cemTp.toLocaleString()}</strong></td>
          <td ${tdR}><strong>${pctStr(cemDel, cemPt)}</strong></td>
          <td ${tdR}><strong>${pctComp(cemEsf, cemPt)}</strong></td>
        </tr>
        <tr style="background:#0d4f4f;color:white;font-weight:700;font-size:14px;">
          <td style="padding:10px 12px;border:none;"><strong>Year to Date</strong></td><td style="padding:10px;border:none;"></td>
          <td style="padding:10px 12px;border:none;text-align:right;"><strong>${ytdPt.toLocaleString()}</strong></td>
          <td style="padding:10px 12px;border:none;text-align:right;"><strong>${ytdEsf.toLocaleString()}</strong></td>
          <td style="padding:10px 12px;border:none;text-align:right;"><strong>${(ytdTp > 0 ? ytdTp - ytdEsf : ytdPt - ytdEsf).toLocaleString()}</strong></td>
          <td style="padding:10px 12px;border:none;text-align:right;"><strong>${ytdDel > 0 ? ytdDel.toLocaleString() : '&mdash;'}</strong></td>
          <td style="padding:10px 12px;border:none;text-align:right;"><strong>${ytdTp.toLocaleString()}</strong></td>
          <td style="padding:10px 12px;border:none;text-align:right;"><strong>${pctStr(ytdDel, ytdPt)}</strong></td>
          <td style="padding:10px 12px;border:none;text-align:right;"><strong>${pctComp(ytdEsf, ytdPt)}</strong></td>
        </tr>
      </table>
    </div>

    ${photoDelivHtml}
    ${pipelineHtml}

    <!-- PAGE 3: VIDEO PRODUCTION -->
    <div style="background:#0d4f4f;color:white;padding:12px 16px;border-radius:6px;margin:28px 0 20px;font-size:17px;font-weight:700;font-family:Georgia,serif;">
      Video Production
    </div>

    ${videoEditingHtml}
    ${videoMetrics}
    ${videoNotStartedHtml}
    ${videoCompleted2026Html}

    <!-- Footer -->
    <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e7e1d8;text-align:center;">
      <p style="font-size:11px;color:#a8a29e;margin:0;">Generated by StudioFlow &bull; SIGS Photography</p>
      <p style="font-size:11px;color:#a8a29e;margin:4px 0 0;">
        <a href="https://studioflow-zeta.vercel.app/admin/production/report" style="color:#0d4f4f;text-decoration:none;">View Full Report &rarr;</a>
      </p>
    </div>

  </div>
</div>
</body>
</html>`
}

// ── Route ────────────────────────────────────────────────────────

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getServiceClient()
    const today = new Date().toISOString().split('T')[0]

    const [allPhotosRes, couplesRes, waitingRes, videoRes] = await Promise.all([
      supabase.from('jobs').select('*').order('created_at', { ascending: false }),
      supabase.from('couples').select('id, couple_name, wedding_date'),
      supabase.from('couples')
        .select('id, couple_name, wedding_date, couple_milestones!inner(m24_photo_order_in)')
        .lt('wedding_date', today).eq('couple_milestones.m24_photo_order_in', false)
        .order('wedding_date', { ascending: true }),
      supabase.from('video_jobs').select('*, couples(id, couple_name, wedding_date)')
        .order('sort_order', { ascending: true, nullsFirst: false }),
    ])

    const coupleMap = new Map<string, { couple_name: string; wedding_date: string | null }>()
    if (couplesRes.data) {
      couplesRes.data.forEach((c: any) => coupleMap.set(c.id, { couple_name: c.couple_name, wedding_date: c.wedding_date }))
    }

    const allPhotoJobs = ((allPhotosRes.data || []) as any[]).map(j => ({
      ...j, couples: coupleMap.get(j.couple_id) || null,
    }))
    const videoJobs = (videoRes.data || []) as any[]
    const waitingCouples = (waitingRes.data || []) as any[]

    const now = new Date()
    const dateFormatted = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Toronto' })
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' })
    const timestamp = `${dateFormatted} at ${timeFormatted}`

    const html = buildEmailHtml({ allPhotoJobs, videoJobs, waitingCouples, timestamp })

    const resend = getResend()
    const subjectDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Toronto' })
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'SIGS Photography <noreply@sigsphoto.ca>',
      to: ['jeanmarcotte@gmail.com', 'mariannakogan@gmail.com'],
      subject: `SIGS Production Report \u2014 ${subjectDate}`,
      html,
    })

    if (emailError) {
      console.error('[Production Report Cron] Resend error:', emailError)
      return NextResponse.json({ error: emailError.message }, { status: 500 })
    }

    console.log('[Production Report Cron] Email sent:', emailResult?.id)
    return NextResponse.json({ success: true, emailId: emailResult?.id })

  } catch (err) {
    console.error('[Production Report Cron] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
