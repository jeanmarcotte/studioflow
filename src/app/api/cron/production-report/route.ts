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
    BEST_PRINT: 'Best Canvas Print',
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

function safeDeleted(esf: number, tp: number): number {
  return (esf > 0 && tp > 0 && esf >= tp) ? esf - tp : 0
}

function pctStr(deleted: number, esf: number): string {
  return deleted > 0 && esf > 0 ? ((deleted / esf) * 100).toFixed(1) + '%' : '&mdash;'
}

function pctComp(esf: number, pt: number): string {
  return pt > 0 ? ((esf / pt) * 100).toFixed(1) + '%' : '0.0%'
}

const SEGMENT_FIELDS = ['ceremony_done', 'reception_done', 'park_done', 'groom_done', 'bride_done', 'prereception_done'] as const

const PHOTO_PIPELINE = [
  { status: 'waiting_approval', label: 'Waiting for Bride', color: '#d97706' },
  { status: 'ready_to_reedit', label: 'Ready to Re-edit', color: '#ea580c' },
  { status: 'reediting', label: 'Re-editing', color: '#e11d48' },
  { status: 'at_lab', label: 'At Lab', color: '#4f46e5' },
  { status: 'at_studio', label: 'At Studio', color: '#7c3aed' },
  { status: 'on_hold', label: 'On Hold', color: '#6b7280' },
  { status: 'ready_to_order', label: 'Ready to Order', color: '#d97706' },
]

// ── Route ────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Auth check
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getServiceClient()
    const today = new Date().toISOString().split('T')[0]

    const [activePhotoRes, couplesRes, completedPhotoRes, waitingRes, videoRes, photosRes] = await Promise.all([
      supabase.from('jobs').select('*').neq('status', 'completed').neq('status', 'picked_up').order('created_at', { ascending: false }),
      supabase.from('couples').select('id, couple_name, wedding_date'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).in('status', ['completed', 'picked_up']),
      supabase.from('couples')
        .select('id, couple_name, wedding_date, couple_milestones!inner(m24_photo_order_in)')
        .lt('wedding_date', today).eq('couple_milestones.m24_photo_order_in', false)
        .order('wedding_date', { ascending: true }),
      supabase.from('video_jobs').select('*, couples(id, couple_name, wedding_date)').order('sort_order', { ascending: true, nullsFirst: false }),
      supabase.from('jobs').select('edited_so_far, photos_taken, total_proofs'),
    ])

    // Build couple lookup
    const coupleMap = new Map<string, { couple_name: string; wedding_date: string | null }>()
    if (couplesRes.data) {
      couplesRes.data.forEach((c: any) => coupleMap.set(c.id, { couple_name: c.couple_name, wedding_date: c.wedding_date }))
    }

    const photoJobs = ((activePhotoRes.data || []) as any[]).map(j => ({
      ...j,
      couples: coupleMap.get(j.couple_id) || null,
    }))
    const videoJobs = (videoRes.data || []) as any[]
    const photoCompletedCount = completedPhotoRes.count ?? 0
    const waitingCouples = (waitingRes.data || []) as any[]

    // YTD photo stats
    const ytdEdited = (photosRes.data || []).reduce((s: number, r: any) => s + (r.edited_so_far || 0), 0)
    const ytdTaken = (photosRes.data || []).reduce((s: number, r: any) => s + (r.photos_taken || 0), 0)
    const ytdProofs = (photosRes.data || []).reduce((s: number, r: any) => s + (r.total_proofs || 0), 0)
    const photosPercent = ytdTaken > 0 ? Math.round((ytdEdited / ytdTaken) * 100) : 0

    // Video groupings
    const vidInProgress = videoJobs.filter((v: any) => v.status === 'in_progress')
    const vidNotStarted = videoJobs.filter((v: any) => v.status === 'not_started')
    const vidWaitingRecap = videoJobs.filter((v: any) => v.status === 'waiting_on_recap')
    const vidComplete = videoJobs.filter((v: any) => v.status === 'complete')
    const vidActive = videoJobs.filter((v: any) => v.status !== 'complete' && v.status !== 'archived')

    // Photo groupings
    const inProgressPhoto = photoJobs.filter((j: any) => j.status === 'in_progress')

    // ASAP totals
    const asapPt = inProgressPhoto.reduce((s: number, j: any) => s + (j.photos_taken || 0), 0)
    const asapEsf = inProgressPhoto.reduce((s: number, j: any) => s + (j.edited_so_far || 0), 0)
    const asapTp = inProgressPhoto.reduce((s: number, j: any) => s + (j.total_proofs || 0), 0)
    const asapDel = safeDeleted(asapEsf, asapTp)
    const ytdDel = safeDeleted(ytdEdited, ytdProofs)

    // Timestamp
    const now = new Date()
    const dateFormatted = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Toronto' })
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' })
    const timestamp = `${dateFormatted} at ${timeFormatted}`

    // ── Build HTML email ──────────────────────────────────────────

    const th = 'style="text-align:left;padding:8px 10px;font-size:11px;font-weight:700;color:#0d4f4f;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;"'
    const thR = 'style="text-align:right;padding:8px 10px;font-size:11px;font-weight:700;color:#0d4f4f;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;"'
    const td = 'style="padding:8px 10px;font-size:13px;border-bottom:1px solid #f3f4f6;"'
    const tdR = 'style="padding:8px 10px;font-size:13px;border-bottom:1px solid #f3f4f6;text-align:right;"'
    const tdGray = 'style="padding:8px 10px;font-size:13px;border-bottom:1px solid #f3f4f6;color:#6b7280;"'
    const tdGrayR = 'style="padding:8px 10px;font-size:13px;border-bottom:1px solid #f3f4f6;color:#6b7280;text-align:right;"'

    // Currently Editing rows
    let editingRows = ''
    for (const job of inProgressPhoto) {
      const pt = job.photos_taken || 0
      const esf = job.edited_so_far || 0
      const tp = job.total_proofs || 0
      const del = safeDeleted(esf, tp)
      editingRows += `<tr>
        <td ${td}><strong>${job.couples?.couple_name || 'Unknown'}</strong>${job.couples?.wedding_date ? `<br><span style="font-size:11px;color:#9ca3af;">${fmtDate(job.couples.wedding_date)}</span>` : ''}</td>
        <td ${tdGray}>${formatJobType(job.job_type)}</td>
        <td ${tdR}>${pt.toLocaleString()}</td>
        <td ${tdR}>${esf.toLocaleString()}</td>
        <td ${tdGrayR}>${(pt - esf).toLocaleString()}</td>
        <td ${tdGrayR}>${del > 0 ? del.toLocaleString() : '&mdash;'}</td>
        <td ${tdR}>${tp.toLocaleString()}</td>
        <td ${tdGrayR}>${pctStr(del, esf)}</td>
        <td ${tdGrayR}>${pctComp(esf, pt)}</td>
      </tr>`
    }

    // Pipeline sections
    let pipelineHtml = ''
    for (const section of PHOTO_PIPELINE) {
      const sectionJobs = photoJobs.filter((j: any) => j.status === section.status)
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
          <div style="background:${section.color};color:white;padding:8px 14px;border-radius:6px 6px 0 0;font-size:13px;font-weight:700;">${section.label} (${sectionJobs.length})</div>
          <table style="width:100%;border-collapse:collapse;background:white;">
            <tr style="background:#f9fafb;">
              <th ${th} style="width:30%">Couple</th><th ${th}>Date</th><th ${th}>Job</th><th ${thR}>Photos</th><th ${th}>Vendor</th>
            </tr>
            ${rows}
          </table>
        </div>`
    }

    // Follow-up
    let followUpHtml = ''
    if (waitingCouples.length > 0) {
      let rows = ''
      for (const c of waitingCouples) {
        const days = daysSince(c.wedding_date)
        const style = days > 180 ? 'color:#b91c1c;font-weight:700;' : days > 90 ? 'color:#d97706;' : ''
        rows += `<tr>
          <td ${td} style="${style}">${c.couple_name}</td>
          <td ${tdGray}>${fmtDate(c.wedding_date)}</td>
          <td ${tdR} style="${style}font-weight:600;">${days}</td>
        </tr>`
      }
      followUpHtml = `
        <div style="margin-top:20px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;overflow:hidden;">
          <div style="background:#fef3c7;padding:10px 14px;border-bottom:1px solid #fde68a;font-size:13px;font-weight:700;color:#92400e;">&#9888;&#65039; Follow-Up Required &mdash; Awaiting Photo Order</div>
          <table style="width:100%;border-collapse:collapse;">
            <tr><th ${th} style="color:#92400e;width:40%">Couple</th><th ${th} style="color:#92400e">Date</th><th ${thR} style="color:#92400e">Days</th></tr>
            ${rows}
          </table>
        </div>`
    }

    // Video In Progress rows
    let vidInProgressHtml = ''
    if (vidInProgress.length > 0) {
      let rows = ''
      for (const vj of vidInProgress) {
        const doneCount = SEGMENT_FIELDS.filter(f => vj[f]).length
        const segs = SEGMENT_FIELDS.map(f => vj[f] ? '&#9989;' : '&#9675;').join(' ')
        rows += `<tr>
          <td ${td}><strong>${vj.couples?.couple_name || 'Unknown'}</strong></td>
          <td ${tdGray}>${fmtDate(vj.couples?.wedding_date ?? null)}</td>
          <td ${tdGray}>${formatVideoJobType(vj.job_type)}</td>
          <td ${tdGray}>${vj.assigned_to || '&mdash;'}</td>
          <td ${td} style="text-align:center;"><strong>${doneCount}/6</strong> ${segs}</td>
          <td ${td} style="text-align:center;">${vj.proxies_run ? '&#9989;' : '&#9675;'}</td>
          <td ${td} style="text-align:center;">${vj.video_form ? '&#9989;' : '&#9675;'}</td>
        </tr>`
      }
      vidInProgressHtml = `
        <div style="margin-bottom:16px;">
          <div style="background:#2563eb;color:white;padding:8px 14px;border-radius:6px 6px 0 0;font-size:13px;font-weight:700;">In Progress (${vidInProgress.length})</div>
          <table style="width:100%;border-collapse:collapse;background:white;">
            <tr style="background:#f9fafb;">
              <th ${th}>Couple</th><th ${th}>Date</th><th ${th}>Type</th><th ${th}>Assigned</th><th ${th} style="text-align:center">Segments</th><th ${th} style="text-align:center">Proxies</th><th ${th} style="text-align:center">Form</th>
            </tr>
            ${rows}
          </table>
        </div>`
    }

    // Video Not Started rows
    let vidNotStartedHtml = ''
    if (vidNotStarted.length > 0) {
      const sorted = [...vidNotStarted].sort((a: any, b: any) => (a.couples?.wedding_date || '').localeCompare(b.couples?.wedding_date || ''))
      let rows = ''
      for (const vj of sorted) {
        rows += `<tr>
          <td ${td}><strong>${vj.couples?.couple_name || 'Unknown'}</strong></td>
          <td ${tdGray}>${fmtDate(vj.couples?.wedding_date ?? null)}</td>
          <td ${tdGray}>${formatVideoJobType(vj.job_type)}</td>
          <td ${tdGray}>${vj.assigned_to || '&mdash;'}</td>
          <td ${td} style="text-align:center;">${vj.proxies_run ? '&#9989;' : '&#9675;'}</td>
        </tr>`
      }
      vidNotStartedHtml = `
        <div style="margin-bottom:16px;">
          <div style="background:#4b5563;color:white;padding:8px 14px;border-radius:6px 6px 0 0;font-size:13px;font-weight:700;">Not Started (${vidNotStarted.length})</div>
          <table style="width:100%;border-collapse:collapse;background:white;">
            <tr style="background:#f9fafb;"><th ${th}>Couple</th><th ${th}>Date</th><th ${th}>Type</th><th ${th}>Assigned</th><th ${th} style="text-align:center">Proxies</th></tr>
            ${rows}
          </table>
        </div>`
    }

    // Video Waiting on Recap
    let vidWaitingHtml = ''
    if (vidWaitingRecap.length > 0) {
      let rows = ''
      for (const vj of vidWaitingRecap) {
        rows += `<tr>
          <td ${td}><strong>${vj.couples?.couple_name || 'Unknown'}</strong></td>
          <td ${tdGray}>${fmtDate(vj.couples?.wedding_date ?? null)}</td>
          <td ${tdGray}>${vj.assigned_to || '&mdash;'}</td>
        </tr>`
      }
      vidWaitingHtml = `
        <div style="margin-bottom:16px;">
          <div style="background:#f59e0b;color:white;padding:8px 14px;border-radius:6px 6px 0 0;font-size:13px;font-weight:700;">Waiting on Recap (${vidWaitingRecap.length})</div>
          <table style="width:100%;border-collapse:collapse;background:white;"><tr style="background:#f9fafb;"><th ${th}>Couple</th><th ${th}>Date</th><th ${th}>Assigned</th></tr>${rows}</table>
        </div>`
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f3f0;font-family:Georgia,'Trebuchet MS',Verdana,sans-serif;">
<div style="max-width:700px;margin:0 auto;background:#ffffff;">

  <!-- Header -->
  <div style="background:#0d4f4f;color:white;padding:28px 24px;">
    <h1 style="margin:0;font-size:24px;font-family:Georgia,serif;letter-spacing:1px;">SIGS Photography</h1>
    <p style="margin:4px 0 0;font-size:15px;color:#a3d4d4;">Production Status Report</p>
    <p style="margin:4px 0 0;font-size:12px;color:#7ab8b8;">${timestamp}</p>
  </div>

  <div style="padding:24px;">

    <!-- Executive Summary -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="width:25%;padding:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#111;">${photoJobs.length}</div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Photo Active</div>
          <div style="font-size:11px;color:#9ca3af;">${photoCompletedCount} completed</div>
        </td>
        <td style="width:4px;"></td>
        <td style="width:25%;padding:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#111;">${vidActive.length}</div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Video Active</div>
          <div style="font-size:11px;color:#9ca3af;">${vidComplete.length} completed</div>
        </td>
        <td style="width:4px;"></td>
        <td style="width:25%;padding:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#111;">${photosPercent}%</div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Photos Edited</div>
          <div style="font-size:11px;color:#9ca3af;">${ytdEdited.toLocaleString()} of ${ytdTaken.toLocaleString()}</div>
        </td>
        <td style="width:4px;"></td>
        <td style="width:25%;padding:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;text-align:center;">
          <div style="font-size:16px;font-weight:700;color:#111;">${vidInProgress.length} / ${vidNotStarted.length} / ${vidComplete.length}</div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Video Progress</div>
          <div style="font-size:11px;color:#9ca3af;">IP / NS / Done</div>
        </td>
      </tr>
    </table>

    <!-- PHOTO SECTION -->
    <div style="background:#0d4f4f;color:white;padding:10px 16px;border-radius:6px;margin-bottom:16px;font-size:16px;font-weight:700;font-family:Georgia,serif;">
      &#128247; Photo Production
    </div>

    <!-- Currently Editing -->
    <div style="margin-bottom:20px;">
      <div style="background:#f0f9ff;padding:8px 14px;border-bottom:2px solid #0d4f4f;font-size:13px;font-weight:700;color:#0d4f4f;">Currently Editing (${inProgressPhoto.length})</div>
      <table style="width:100%;border-collapse:collapse;background:white;">
        <tr style="background:#f9fafb;">
          <th ${th}>Couple</th><th ${th}>Job</th><th ${thR}>Taken</th><th ${thR}>Edited</th><th ${thR}>Remain</th><th ${thR}>Del</th><th ${thR}>Proofs</th><th ${thR}>%Del</th><th ${thR}>%Done</th>
        </tr>
        ${editingRows}
        <!-- ASAP -->
        <tr style="background:#f3f4f6;font-weight:700;">
          <td ${td}><strong>Currently Due ASAP</strong></td><td ${td}></td>
          <td ${tdR}><strong>${asapPt.toLocaleString()}</strong></td><td ${tdR}><strong>${asapEsf.toLocaleString()}</strong></td>
          <td ${tdR}><strong>${(asapPt - asapEsf).toLocaleString()}</strong></td>
          <td ${tdR}><strong>${asapDel > 0 ? asapDel.toLocaleString() : '&mdash;'}</strong></td>
          <td ${tdR}><strong>${asapTp.toLocaleString()}</strong></td>
          <td ${tdR}><strong>${pctStr(asapDel, asapEsf)}</strong></td>
          <td ${tdR}><strong>${pctComp(asapEsf, asapPt)}</strong></td>
        </tr>
        <!-- YTD -->
        <tr style="background:#dc2626;color:white;font-weight:700;font-size:14px;">
          <td style="padding:10px;border:none;"><strong>Year to Date</strong></td><td style="padding:10px;border:none;"></td>
          <td style="padding:10px;border:none;text-align:right;"><strong>${ytdTaken.toLocaleString()}</strong></td>
          <td style="padding:10px;border:none;text-align:right;"><strong>${ytdEdited.toLocaleString()}</strong></td>
          <td style="padding:10px;border:none;text-align:right;"><strong>${(ytdTaken - ytdEdited).toLocaleString()}</strong></td>
          <td style="padding:10px;border:none;text-align:right;"><strong>${ytdDel > 0 ? ytdDel.toLocaleString() : '&mdash;'}</strong></td>
          <td style="padding:10px;border:none;text-align:right;"><strong>${ytdProofs.toLocaleString()}</strong></td>
          <td style="padding:10px;border:none;text-align:right;"><strong>${pctStr(ytdDel, ytdEdited)}</strong></td>
          <td style="padding:10px;border:none;text-align:right;"><strong>${pctComp(ytdEdited, ytdTaken)}</strong></td>
        </tr>
      </table>
    </div>

    ${pipelineHtml}
    ${followUpHtml}

    <!-- VIDEO SECTION -->
    <div style="background:#0d4f4f;color:white;padding:10px 16px;border-radius:6px;margin:28px 0 16px;font-size:16px;font-weight:700;font-family:Georgia,serif;">
      &#127916; Video Production
    </div>

    <!-- Video Summary -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td style="width:25%;padding:10px;background:#ecfdf5;border:1px solid #d1fae5;border-radius:6px;text-align:center;font-weight:700;font-size:20px;color:#059669;">${vidComplete.length}<br><span style="font-size:11px;color:#6b7280;font-weight:600;">COMPLETE</span></td>
        <td style="width:4px;"></td>
        <td style="width:25%;padding:10px;background:#eff6ff;border:1px solid #dbeafe;border-radius:6px;text-align:center;font-weight:700;font-size:20px;color:#2563eb;">${vidInProgress.length}<br><span style="font-size:11px;color:#6b7280;font-weight:600;">IN PROGRESS</span></td>
        <td style="width:4px;"></td>
        <td style="width:25%;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;text-align:center;font-weight:700;font-size:20px;color:#4b5563;">${vidNotStarted.length}<br><span style="font-size:11px;color:#6b7280;font-weight:600;">NOT STARTED</span></td>
        <td style="width:4px;"></td>
        <td style="width:25%;padding:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;text-align:center;font-weight:700;font-size:20px;color:#d97706;">${vidWaitingRecap.length}<br><span style="font-size:11px;color:#6b7280;font-weight:600;">WAITING RECAP</span></td>
      </tr>
    </table>

    ${vidInProgressHtml}
    ${vidNotStartedHtml}
    ${vidWaitingHtml}

    ${vidComplete.length > 0 ? `<div style="background:#ecfdf5;border:1px solid #d1fae5;border-radius:6px;padding:12px;text-align:center;font-size:13px;font-weight:600;color:#065f46;">&#9989; ${vidComplete.length} video${vidComplete.length !== 1 ? 's' : ''} completed</div>` : ''}

    <!-- Footer -->
    <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="font-size:11px;color:#9ca3af;margin:0;">Generated by StudioFlow &bull; SIGS Photography</p>
      <p style="font-size:11px;color:#9ca3af;margin:4px 0 0;">
        <a href="https://studioflow-zeta.vercel.app/admin/production/report" style="color:#0d4f4f;text-decoration:none;">View Full Report &rarr;</a>
      </p>
    </div>

  </div>
</div>
</body>
</html>`

    // ── Send email ────────────────────────────────────────────────

    const resend = getResend()
    const subjectDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Toronto' })
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'SIGS Photography <noreply@sigsphoto.ca>',
      to: ['jeanmarcotte@gmail.com', 'mariannakogan@gmail.com'],
      subject: `SIGS Production Report — ${subjectDate}`,
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
