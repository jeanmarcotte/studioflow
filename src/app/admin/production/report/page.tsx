'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Printer, Mail, Loader2 } from 'lucide-react'
import { Playfair_Display, Nunito } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

// ── Types ────────────────────────────────────────────────────────

interface PhotoJob {
  id: string
  couple_id: string
  job_type: string
  category: string
  photos_taken: number | null
  edited_so_far: number | null
  total_proofs: number | null
  vendor: string | null
  status: string
  due_date: string | null
  at_lab_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  completed_date: string | null
  couples?: { couple_name: string; wedding_date: string | null } | null
}

interface VideoJob {
  id: string
  couple_id: string
  job_type: string
  status: string
  section: string
  assigned_to: string | null
  ceremony_done: boolean
  reception_done: boolean
  park_done: boolean
  prereception_done: boolean
  groom_done: boolean
  bride_done: boolean
  proxies_run: boolean
  video_form: boolean
  completed_date: string | null
  order_date: string | null
  updated_at: string
  created_at: string
  couples?: { couple_name: string; id: string; wedding_date: string | null } | null
}

interface WaitingOrderCouple {
  id: string
  couple_name: string
  wedding_date: string | null
}

// ── Helpers ──────────────────────────────────────────────────────

function formatJobType(type: string): string {
  const map: Record<string, string> = {
    wedding_proofs: 'Wedding Proofs', WED_PROOFS: 'Wedding Proofs',
    eng_proofs: 'Engagement Proofs', ENG_PROOFS: 'Engagement Proofs',
    WED_PACKAGE: 'Wedding Package', WED_ALBUM: 'Wedding Album',
    WED_FRAMES: 'Wedding Prints', WED_CANVAS: 'Wedding Canvas',
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
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function formatVendor(vendor: string | null): string {
  if (!vendor) return '\u2014'
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
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
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

function isProofsJob(jobType: string): boolean {
  return jobType.toLowerCase().includes('proofs')
}

function countSegments(job: VideoJob): number {
  let c = 0
  if (job.ceremony_done) c++
  if (job.reception_done) c++
  if (job.park_done) c++
  if (job.prereception_done) c++
  if (job.groom_done) c++
  if (job.bride_done) c++
  return c
}

// ── Config ──────────────────────────────────────────────────────

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
  WED_FRAMES: 'Wedding Prints',
  WED_PORTRAIT: 'Wedding Portrait', WED_PORTRAITS: 'Wedding Portrait',
  TYC: 'Thank You Cards', tyc: 'Thank You Cards',
}

const SEGMENT_FIELDS = [
  { field: 'ceremony_done' as const, label: 'Cer' },
  { field: 'reception_done' as const, label: 'Rec' },
  { field: 'park_done' as const, label: 'Park' },
  { field: 'prereception_done' as const, label: 'Pre' },
  { field: 'groom_done' as const, label: 'Grm' },
  { field: 'bride_done' as const, label: 'Brd' },
]

const STATUS_PILL: Record<string, { bg: string; text: string; label: string }> = {
  in_progress: { bg: '#dbeafe', text: '#1e40af', label: 'In Progress' },
  waiting_for_bride: { bg: '#fef3c7', text: '#92400e', label: 'Waiting for Bride' },
  waiting_on_recap: { bg: '#f3e8ff', text: '#3b0764', label: 'Waiting on Recap' },
}

// ── Color Palette ────────────────────────────────────────────────

const C = {
  teal: 'var(--primary, #0d4f4f)',
  tealLight: '#0d9488',
  cream: 'var(--background, #faf8f5)',
  white: 'var(--background, #ffffff)',
  border: 'var(--border, #e7e1d8)',
  textPrimary: 'var(--foreground, #1c1917)',
  textSecondary: 'var(--foreground, #44403c)',
  textMuted: 'var(--muted-foreground, #78716c)',
  textSubtle: 'var(--muted-foreground, #a8a29e)',
  rowAlt: 'var(--muted, #fafaf9)',
  summaryLight: 'var(--muted, #f5f5f4)',
  summaryMed: 'var(--muted, #f0f0ef)',
  amber: '#92400e',
  amberBg: '#fef3c7',
  amberBorder: '#fde68a',
  red: '#dc2626',
  redBold: '#b91c1c',
}

// ══════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════

export default function ProductionReportPage() {
  const [allPhotoJobs, setAllPhotoJobs] = useState<PhotoJob[]>([])
  const [videoJobs, setVideoJobs] = useState<VideoJob[]>([])
  const [waitingOrderCouples, setWaitingOrderCouples] = useState<WaitingOrderCouple[]>([])
  const [loading, setLoading] = useState(true)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  const sendTestEmail = async () => {
    setEmailStatus('sending')
    try {
      const res = await fetch('/api/admin/reports/send-production-report', { method: 'POST' })
      if (res.ok) setEmailStatus('sent')
      else setEmailStatus('failed')
    } catch {
      setEmailStatus('failed')
    }
    setTimeout(() => setEmailStatus('idle'), 3000)
  }

  // ── Fetch ─────────────────────────────────────────────────────

  useEffect(() => {
    const fetchAll = async () => {
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

      if (!allPhotosRes.error && allPhotosRes.data) {
        setAllPhotoJobs((allPhotosRes.data as any[]).map(j => ({ ...j, couples: coupleMap.get(j.couple_id) || null })) as PhotoJob[])
      }
      if (!waitingRes.error && waitingRes.data) {
        setWaitingOrderCouples(waitingRes.data as unknown as WaitingOrderCouple[])
      }
      if (!videoRes.error && videoRes.data) {
        setVideoJobs(videoRes.data as VideoJob[])
      }
      setLoading(false)
    }
    fetchAll()
  }, [])

  // ── Computed ────────────────────────────────────────────────────

  const timestamp = useMemo(() => {
    const now = new Date()
    const d = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Toronto' })
    const t = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' })
    return `${d} at ${t}`
  }, [])

  // Photo data
  const activePhotoJobs = useMemo(() => allPhotoJobs.filter(j => !['completed', 'picked_up'].includes(j.status)), [allPhotoJobs])
  const inProgressPhotoJobs = useMemo(() => activePhotoJobs.filter(j => j.status === 'in_progress'), [activePhotoJobs])
  const atLabCount = useMemo(() => activePhotoJobs.filter(j => j.status === 'at_lab').length, [activePhotoJobs])

  const asapTotals = useMemo(() => {
    const pt = inProgressPhotoJobs.reduce((s, j) => s + (j.photos_taken || 0), 0)
    const esf = inProgressPhotoJobs.reduce((s, j) => s + (j.edited_so_far || 0), 0)
    const tp = inProgressPhotoJobs.reduce((s, j) => s + (j.total_proofs || 0), 0)
    const remaining = tp > 0 ? tp - esf : pt - esf
    const deleted = safeDeleted(pt, tp)
    return { pt, esf, tp, remaining, deleted }
  }, [inProgressPhotoJobs])

  const cemeteryTotals = useMemo(() => {
    const cemProofs = allPhotoJobs.filter(j => ['completed', 'picked_up'].includes(j.status) && isProofsJob(j.job_type))
    const pt = cemProofs.reduce((s, j) => s + (j.photos_taken || 0), 0)
    const esf = cemProofs.reduce((s, j) => s + (j.edited_so_far || 0), 0)
    const tp = cemProofs.reduce((s, j) => s + (j.total_proofs || 0), 0)
    const remaining = tp > 0 ? tp - esf : pt - esf
    const deleted = safeDeleted(pt, tp)
    return { pt, esf, tp, remaining, deleted }
  }, [allPhotoJobs])

  const ytdTotals = useMemo(() => {
    const proofsAll = allPhotoJobs.filter(j => isProofsJob(j.job_type))
    const pt = proofsAll.reduce((s, j) => s + (j.photos_taken || 0), 0)
    const esf = proofsAll.reduce((s, j) => s + (j.edited_so_far || 0), 0)
    const tp = proofsAll.reduce((s, j) => s + (j.total_proofs || 0), 0)
    const remaining = tp > 0 ? tp - esf : pt - esf
    const deleted = safeDeleted(pt, tp)
    return { pt, esf, tp, remaining, deleted }
  }, [allPhotoJobs])

  const photoDeliverables = useMemo(() => {
    const delivStatusGroups = ['completed', 'picked_up', 'at_lab', 'at_studio', 'ready_to_reedit', 'reediting']
    const map: Record<string, { done: number; at_lab: number; at_studio: number; re_edit: number; total: number }> = {}
    for (const job of allPhotoJobs) {
      if (!delivStatusGroups.includes(job.status)) continue
      const label = DELIVERABLE_MAP[job.job_type] || formatJobType(job.job_type)
      if (!map[label]) map[label] = { done: 0, at_lab: 0, at_studio: 0, re_edit: 0, total: 0 }
      if (['completed', 'picked_up'].includes(job.status)) map[label].done++
      else if (job.status === 'at_lab') map[label].at_lab++
      else if (job.status === 'at_studio') map[label].at_studio++
      else map[label].re_edit++
      map[label].total++
    }
    return Object.entries(map).filter(([, c]) => c.total > 0)
  }, [allPhotoJobs])

  // Video data
  const videoEditing = useMemo(() =>
    videoJobs.filter(j => ['in_progress', 'waiting_for_bride', 'waiting_on_recap'].includes(j.status)),
  [videoJobs])

  const videoNotStarted = useMemo(() =>
    [...videoJobs.filter(j => j.status === 'not_started')].sort((a, b) =>
      (a.couples?.wedding_date || '').localeCompare(b.couples?.wedding_date || '')),
  [videoJobs])

  const videoCompleted2026 = useMemo(() =>
    videoJobs.filter(j => j.completed_date && j.completed_date >= '2026-01-01')
      .sort((a, b) => (b.completed_date || '').localeCompare(a.completed_date || '')),
  [videoJobs])

  const videoSegmentStats = useMemo(() => {
    const done = videoEditing.reduce((s, j) => s + countSegments(j), 0)
    const total = videoEditing.length * 6
    return { done, total }
  }, [videoEditing])

  const videoTypeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    videoCompleted2026.forEach(j => { counts[j.job_type] = (counts[j.job_type] || 0) + 1 })
    const order = ['FULL', 'RECAP']
    return Object.entries(counts)
      .sort(([a], [b]) => {
        const ai = order.indexOf(a), bi = order.indexOf(b)
        if (ai >= 0 && bi >= 0) return ai - bi
        if (ai >= 0) return -1
        if (bi >= 0) return 1
        return a.localeCompare(b)
      })
      .map(([type, count]) => ({
        label: (type === 'ENG_SLIDESHOW' ? 'SLIDESHOW' : type.replace(/_/g, ' ')).toUpperCase(),
        count,
      }))
  }, [videoCompleted2026])

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: C.teal }} />
      </div>
    )
  }

  const pctDel = (del: number, pt: number) => del > 0 && pt > 0 ? ((del / pt) * 100).toFixed(1) + '%' : '\u2014'
  const pctComp = (esf: number, pt: number) => pt > 0 ? ((esf / pt) * 100).toFixed(1) + '%' : '\u2014'

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════

  return (
    <>
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          @page { margin: 0.5in; size: letter; }
          table, .card-grid { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }
          .page-section { page-break-inside: avoid; }
        }
      `}</style>

      <div className={`${nunito.className} min-h-screen`} style={{ background: C.cream }}>

        {/* ════════════════════════════════════════════════════════
            PAGE 1: EXECUTIVE SUMMARY
            ════════════════════════════════════════════════════════ */}
        <div className="max-w-[900px] mx-auto px-8 pt-10 pb-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-12">
            <div>
              <h1
                className={`${playfair.className} tracking-tight leading-tight`}
                style={{ fontSize: '28px', color: C.teal }}
              >
                SIGS Photography
              </h1>
              <p className="mt-1.5" style={{ fontSize: '16px', color: C.textMuted }}>
                Production Status Report
              </p>
            </div>
            <div className="text-right">
              <p className="mb-4" style={{ fontSize: '13px', color: C.textSubtle }}>{timestamp}</p>
              <div className="flex items-center gap-2.5 no-print">
                <button
                  onClick={sendTestEmail}
                  disabled={emailStatus === 'sending'}
                  className="flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-all hover:bg-background/80"
                  style={{ borderColor: C.border, color: C.textSecondary }}
                >
                  {emailStatus === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {emailStatus === 'sent' ? 'Sent!' : emailStatus === 'failed' ? 'Failed' : 'Send Test Email'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                  style={{ background: C.teal }}
                >
                  <Printer className="h-4 w-4" />
                  Print Report
                </button>
              </div>
            </div>
          </div>

          {/* ── Section 1: At a Glance ─────────────────────────── */}
          <h2 className={`${playfair.className} mb-6`} style={{ fontSize: '20px', color: C.teal }}>
            At a Glance
          </h2>

          <div className="grid grid-cols-3 gap-4 mb-12 card-grid">
            <MetricCard
              label="Photos Remaining"
              value={asapTotals.remaining.toLocaleString()}
              sublabel={`${asapTotals.esf.toLocaleString()} of ${(asapTotals.tp || asapTotals.pt).toLocaleString()} edited`}
              valueColor={C.teal}
              progress={asapTotals.pt > 0 ? Math.round((asapTotals.esf / (asapTotals.tp || asapTotals.pt)) * 100) : 0}
            />
            <MetricCard
              label="Awaiting Photo Order"
              value={waitingOrderCouples.length.toString()}
              sublabel="couples waiting"
              valueColor={waitingOrderCouples.length > 3 ? C.amber : C.teal}
            />
            <MetricCard
              label="At Lab"
              value={atLabCount.toString()}
              sublabel="orders being printed"
              valueColor={C.teal}
            />
            <MetricCard
              label="Videos In Production"
              value={videoEditing.length.toString()}
              sublabel={`${videoEditing.filter(j => j.status === 'in_progress').length} active \u00B7 ${videoEditing.filter(j => j.status !== 'in_progress').length} waiting`}
              valueColor={C.teal}
            />
            <MetricCard
              label="Video Backlog"
              value={videoNotStarted.length.toString()}
              sublabel={videoNotStarted.length > 0 && videoNotStarted[0].couples?.wedding_date
                ? `oldest: ${daysSince(videoNotStarted[0].couples.wedding_date)} days`
                : 'no jobs waiting'}
              valueColor={videoNotStarted.length > 3 ? C.amber : C.teal}
            />
            <MetricCard
              label="Segments Progress"
              value={`${videoSegmentStats.done}/${videoSegmentStats.total}`}
              sublabel="segments complete"
              valueColor={C.teal}
              progress={videoSegmentStats.total > 0 ? Math.round((videoSegmentStats.done / videoSegmentStats.total) * 100) : 0}
            />
          </div>

          {/* ── Section 2: 2026 Velocity ───────────────────────── */}
          <h2 className={`${playfair.className} mb-6`} style={{ fontSize: '20px', color: C.teal }}>
            2026 Velocity
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-12 card-grid">
            <div className="rounded-xl p-6" style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(13,79,79,0.06)' }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: C.textMuted }}>
                Photo Editing 2026
              </div>
              <div className="font-bold tabular-nums leading-none mb-1.5" style={{ fontSize: '28px', color: C.teal }}>
                {ytdTotals.esf.toLocaleString()}
                <span className="font-normal ml-2" style={{ fontSize: '13px', color: C.textSubtle }}>of {ytdTotals.pt.toLocaleString()} photos</span>
              </div>
              <div className="text-[13px] mb-4" style={{ color: C.textMuted }}>
                {ytdTotals.pt > 0 ? ((ytdTotals.esf / ytdTotals.pt) * 100).toFixed(1) : 0}% complete (proofs only)
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: C.border }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ background: C.tealLight, width: `${ytdTotals.pt > 0 ? Math.round((ytdTotals.esf / ytdTotals.pt) * 100) : 0}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl p-6" style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(13,79,79,0.06)' }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: C.textMuted }}>
                Video Editing 2026
              </div>
              <div className="font-bold tabular-nums leading-none mb-1.5" style={{ fontSize: '28px', color: C.teal }}>
                {videoCompleted2026.length}
                <span className="font-normal ml-2" style={{ fontSize: '13px', color: C.textSubtle }}>videos edited</span>
              </div>
              <div className="text-[13px]" style={{ color: C.textMuted }}>
                {videoTypeBreakdown.map((b, i) => (
                  <span key={b.label}>{i > 0 ? ' \u00B7 ' : ''}{b.count} {b.label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Section 3: Attention Required ──────────────────── */}
          {waitingOrderCouples.length > 0 && (
            <div className="page-section">
              <h2 className={`${playfair.className} mb-6`} style={{ fontSize: '20px', color: C.teal }}>
                Attention Required
              </h2>
              <div className="rounded-xl overflow-hidden" style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(13,79,79,0.06)' }}>
                <div
                  className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wider"
                  style={{ background: C.amberBg, color: C.amber, borderBottom: `1px solid ${C.amberBorder}` }}
                >
                  Couples Awaiting Photo Order
                </div>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ background: 'rgba(13,79,79,0.03)' }}>
                      <TH align="left">Couple</TH>
                      <TH align="left">Wedding Date</TH>
                      <TH align="right">Days Since</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {waitingOrderCouples.map(couple => {
                      const days = daysSince(couple.wedding_date)
                      const color = days > 180 ? C.redBold : days > 90 ? C.red : C.textMuted
                      const bold = days > 180
                      return (
                        <tr key={couple.id} style={{ borderBottom: '1px solid var(--border, #f3f0ed)' }}>
                          <td className="px-5 py-2.5" style={{ color, fontWeight: bold ? 700 : 400 }}>{couple.couple_name}</td>
                          <td className="px-5 py-2.5" style={{ color: C.textSubtle }}>{formatDate(couple.wedding_date)}</td>
                          <td className="text-right px-5 py-2.5 font-semibold" style={{ color }}>{days} days</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
            PAGE 2: PHOTO PRODUCTION DETAIL
            ════════════════════════════════════════════════════════ */}
        <div className="print-break max-w-[900px] mx-auto px-8 pt-10 pb-8">
          <h2 className={`${playfair.className} mb-8`} style={{ fontSize: '22px', color: C.teal }}>
            Photo Production
          </h2>

          {/* Currently Editing */}
          <div className="rounded-xl overflow-hidden mb-8 page-section" style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(13,79,79,0.06)' }}>
            <div
              className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider"
              style={{ background: 'rgba(13,79,79,0.04)', color: C.teal, borderBottom: `1px solid ${C.border}` }}
            >
              Currently Editing ({inProgressPhotoJobs.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" style={{ minWidth: '860px' }}>
                <thead>
                  <tr style={{ background: 'rgba(13,79,79,0.02)' }}>
                    <TH align="left" px="px-4">Couple</TH>
                    <TH align="left" px="px-3">Job</TH>
                    <TH align="right" px="px-3">Taken</TH>
                    <TH align="right" px="px-3">Edited</TH>
                    <TH align="right" px="px-3">Remain</TH>
                    <TH align="right" px="px-3">Del</TH>
                    <TH align="right" px="px-3">Proofs</TH>
                    <TH align="right" px="px-3">%Del</TH>
                    <TH align="right" px="px-3">%Done</TH>
                  </tr>
                </thead>
                <tbody>
                  {inProgressPhotoJobs.map((job, i) => {
                    const pt = job.photos_taken || 0
                    const esf = job.edited_so_far || 0
                    const tp = job.total_proofs || 0
                    const remaining = tp > 0 ? tp - esf : pt - esf
                    const deleted = safeDeleted(pt, tp)
                    return (
                      <tr key={job.id} style={{ borderBottom: '1px solid var(--border, #f3f0ed)', background: i % 2 === 1 ? C.rowAlt : C.white }}>
                        <td className="px-4 py-2.5">
                          <div className="font-semibold" style={{ color: C.textPrimary }}>{job.couples?.couple_name || 'Unknown'}</div>
                          {job.couples?.wedding_date && <div className="text-[11px]" style={{ color: C.textSubtle }}>{formatDate(job.couples.wedding_date)}</div>}
                        </td>
                        <td className="px-3 py-2.5" style={{ color: C.textMuted }}>{formatJobType(job.job_type)}</td>
                        <td className="text-right px-3 py-2.5 tabular-nums">{pt.toLocaleString()}</td>
                        <td className="text-right px-3 py-2.5 tabular-nums">{esf.toLocaleString()}</td>
                        <td className="text-right px-3 py-2.5 tabular-nums" style={{ color: C.textMuted }}>{remaining.toLocaleString()}</td>
                        <td className="text-right px-3 py-2.5 tabular-nums" style={{ color: C.textMuted }}>{deleted > 0 ? deleted.toLocaleString() : '\u2014'}</td>
                        <td className="text-right px-3 py-2.5 tabular-nums">{tp.toLocaleString()}</td>
                        <td className="text-right px-3 py-2.5 tabular-nums" style={{ color: C.textMuted }}>{pctDel(deleted, pt)}</td>
                        <td className="text-right px-3 py-2.5 tabular-nums" style={{ color: C.textMuted }}>{pctComp(esf, pt)}</td>
                      </tr>
                    )
                  })}
                  {inProgressPhotoJobs.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center" style={{ color: C.textSubtle }}>No jobs currently being edited</td></tr>
                  )}
                  <SummaryRow label="Currently Due ASAP" totals={asapTotals} bg={C.summaryLight} textColor={C.textSecondary} />
                  <SummaryRow label="Completed 2026" totals={cemeteryTotals} bg={C.summaryMed} textColor={C.textMuted} />
                  <tr style={{ background: C.teal, fontSize: '14px' }} className="text-primary-foreground font-bold">
                    <td className="px-4 py-3 font-bold">Year to Date</td>
                    <td></td>
                    <td className="text-right px-3 py-3 tabular-nums">{ytdTotals.pt.toLocaleString()}</td>
                    <td className="text-right px-3 py-3 tabular-nums">{ytdTotals.esf.toLocaleString()}</td>
                    <td className="text-right px-3 py-3 tabular-nums">{ytdTotals.remaining.toLocaleString()}</td>
                    <td className="text-right px-3 py-3 tabular-nums">{ytdTotals.deleted > 0 ? ytdTotals.deleted.toLocaleString() : '\u2014'}</td>
                    <td className="text-right px-3 py-3 tabular-nums">{ytdTotals.tp.toLocaleString()}</td>
                    <td className="text-right px-3 py-3 tabular-nums">{pctDel(ytdTotals.deleted, ytdTotals.pt)}</td>
                    <td className="text-right px-3 py-3 tabular-nums">{pctComp(ytdTotals.esf, ytdTotals.pt)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Photo Pipeline */}
          {PHOTO_PIPELINE.map(section => {
            const sectionJobs = activePhotoJobs.filter(j => j.status === section.status)
            if (sectionJobs.length === 0) return null
            return (
              <div key={section.status} className="rounded-xl overflow-hidden mb-6 page-section" style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(13,79,79,0.06)' }}>
                <div
                  className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider"
                  style={{ background: 'rgba(13,79,79,0.04)', color: C.teal, borderBottom: `1px solid ${C.border}` }}
                >
                  {section.label} ({sectionJobs.length})
                </div>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ background: 'rgba(13,79,79,0.02)' }}>
                      <TH align="left">Couple</TH>
                      <TH align="left" px="px-4">Wedding Date</TH>
                      <TH align="left" px="px-4">Job</TH>
                      <TH align="right" px="px-4">Photos</TH>
                      <TH align="left" px="px-4">Vendor</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionJobs.map(job => (
                      <tr key={job.id} style={{ borderBottom: '1px solid var(--border, #f3f0ed)' }}>
                        <td className="px-5 py-2.5 font-semibold" style={{ color: C.textPrimary }}>{job.couples?.couple_name || 'Unknown'}</td>
                        <td className="px-4 py-2.5" style={{ color: C.textSubtle }}>{formatDate(job.couples?.wedding_date ?? null)}</td>
                        <td className="px-4 py-2.5" style={{ color: C.textMuted }}>{formatJobType(job.job_type)}</td>
                        <td className="text-right px-4 py-2.5 tabular-nums" style={{ color: C.textMuted }}>{job.photos_taken ?? '\u2014'}</td>
                        <td className="px-4 py-2.5" style={{ color: C.textMuted }}>{formatVendor(job.vendor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>

        {/* ════════════════════════════════════════════════════════
            PAGE 3: VIDEO PRODUCTION DETAIL
            ════════════════════════════════════════════════════════ */}
        <div className="print-break max-w-[900px] mx-auto px-8 pt-10 pb-16">
          <h2 className={`${playfair.className} mb-8`} style={{ fontSize: '22px', color: C.teal }}>
            Video Production
          </h2>

          {/* Video Currently Editing — Cards */}
          {videoEditing.length > 0 && (
            <div className="mb-8 page-section">
              <div className="text-[12px] font-semibold uppercase tracking-wider mb-4" style={{ color: C.textMuted }}>
                Currently Editing ({videoEditing.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 card-grid">
                {videoEditing.map(job => {
                  const segsDone = countSegments(job)
                  const weddingDate = job.couples?.wedding_date
                  const daysW = weddingDate ? daysSince(weddingDate) : 0
                  const pill = STATUS_PILL[job.status] || { bg: '#f3f4f6', text: '#374151', label: job.status }
                  const daysColor = daysW > 90 ? C.red : daysW > 60 ? '#d97706' : C.textPrimary

                  return (
                    <div key={job.id} className="rounded-xl p-5" style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(13,79,79,0.06)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-bold tabular-nums leading-none" style={{ fontSize: '26px', color: daysColor }}>{daysW}</div>
                          <div className="text-[11px] mt-0.5" style={{ color: C.textSubtle }}>days since wedding</div>
                        </div>
                        <span className="text-[11px] font-bold rounded-full px-2.5 py-1" style={{ background: pill.bg, color: pill.text }}>
                          {pill.label}
                        </span>
                      </div>
                      <div className="font-semibold text-[14px] mb-0.5" style={{ color: C.textPrimary }}>{job.couples?.couple_name || 'Unknown'}</div>
                      <div className="text-[12px] mb-3" style={{ color: C.textMuted }}>{formatVideoJobType(job.job_type)}</div>
                      <div className="flex items-center gap-1.5 mb-1">
                        {SEGMENT_FIELDS.map(seg => (
                          <div
                            key={seg.field}
                            className="w-4 h-4 rounded-full"
                            style={{ background: job[seg.field] ? C.tealLight : '#e5e7eb' }}
                            title={seg.label}
                          />
                        ))}
                      </div>
                      <div className="text-[11px] font-medium mb-2.5" style={{ color: segsDone === 6 ? C.tealLight : C.textSubtle }}>
                        {segsDone}/6 segments
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                          style={{
                            background: job.proxies_run ? 'rgba(13,148,136,0.15)' : 'rgba(0,0,0,0.05)',
                            color: job.proxies_run ? C.tealLight : C.textSubtle,
                          }}
                          title={job.proxies_run ? 'Proxies run' : 'Proxies pending'}
                        >
                          P
                        </span>
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                          style={{
                            background: job.video_form ? 'rgba(13,148,136,0.15)' : 'rgba(0,0,0,0.05)',
                            color: job.video_form ? C.tealLight : C.textSubtle,
                          }}
                          title={job.video_form ? 'Form received' : 'Form pending'}
                        >
                          F
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Video Metric Tiles */}
          <div className="grid grid-cols-3 gap-4 mb-8 card-grid">
            <div className="rounded-xl p-5" style={{ background: 'var(--muted, #f9fafb)', border: `1px solid ${C.border}` }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: C.textMuted }}>In Production</div>
              <div className="font-bold tabular-nums leading-none mb-2" style={{ fontSize: '24px', color: C.textPrimary }}>
                {videoSegmentStats.done}/{videoSegmentStats.total}
              </div>
              <div className="text-[11px] mb-1" style={{ color: C.textSubtle }}>segments complete</div>
              <div className="text-[10px] mb-2" style={{ color: C.textSubtle }}>Each wedding video has 6 parts: ceremony, reception, park, prep, groom &amp; bride</div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border, #e5e7eb)' }}>
                <div className="h-full rounded-full" style={{ background: C.tealLight, width: `${videoSegmentStats.total > 0 ? Math.round((videoSegmentStats.done / videoSegmentStats.total) * 100) : 0}%` }} />
              </div>
            </div>
            <div className="rounded-xl p-5" style={{ background: 'var(--muted, #f9fafb)', border: `1px solid ${C.border}` }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: C.textMuted }}>Incoming Work</div>
              <div className="font-bold tabular-nums leading-none mb-2" style={{ fontSize: '24px', color: '#d97706' }}>
                {waitingOrderCouples.length}
              </div>
              <div className="text-[11px]" style={{ color: C.textMuted }}>couples awaiting photo order</div>
              <div className="text-[11px]" style={{ color: C.textSubtle }}>{videoNotStarted.length} not-started jobs</div>
            </div>
            <div className="rounded-xl p-5" style={{ background: 'var(--muted, #f9fafb)', border: `1px solid ${C.border}` }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: C.textMuted }}>2026 Velocity</div>
              <div className="font-bold tabular-nums leading-none mb-2" style={{ fontSize: '24px', color: C.tealLight }}>
                {videoCompleted2026.length}
              </div>
              <div className="text-[11px]" style={{ color: C.textMuted }}>
                {videoTypeBreakdown.map((b, i) => (
                  <span key={b.label}>{i > 0 ? ' \u00B7 ' : ''}{b.count} {b.label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Video Not Started */}
          {videoNotStarted.length > 0 && (
            <div className="rounded-xl overflow-hidden mb-8 page-section" style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(13,79,79,0.06)' }}>
              <div
                className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider"
                style={{ background: 'rgba(13,79,79,0.04)', color: C.teal, borderBottom: `1px solid ${C.border}` }}
              >
                Not Started ({videoNotStarted.length})
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ background: 'rgba(13,79,79,0.02)' }}>
                    <TH align="left">Couple</TH>
                    <TH align="left" px="px-4">Wedding Date</TH>
                    <TH align="left" px="px-4">Type</TH>
                    <TH align="left" px="px-4">Assigned</TH>
                    <TH align="center" px="px-4">Proxies</TH>
                  </tr>
                </thead>
                <tbody>
                  {videoNotStarted.map(job => (
                    <tr key={job.id} style={{ borderBottom: '1px solid var(--border, #f3f0ed)' }}>
                      <td className="px-5 py-2.5 font-semibold" style={{ color: C.textPrimary }}>{job.couples?.couple_name || 'Unknown'}</td>
                      <td className="px-4 py-2.5" style={{ color: C.textSubtle }}>{formatDate(job.couples?.wedding_date ?? null)}</td>
                      <td className="px-4 py-2.5" style={{ color: C.textMuted }}>{formatVideoJobType(job.job_type)}</td>
                      <td className="px-4 py-2.5" style={{ color: C.textMuted }}>{job.assigned_to || '\u2014'}</td>
                      <td className="text-center px-4 py-2.5">{job.proxies_run ? '\u2705' : '\u25CB'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Video Completed in 2026 */}
          {videoCompleted2026.length > 0 && (
            <div className="rounded-xl overflow-hidden mb-8 page-section" style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(13,79,79,0.06)' }}>
              <div
                className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider"
                style={{ background: 'rgba(13,79,79,0.04)', color: C.teal, borderBottom: `1px solid ${C.border}` }}
              >
                Videos Completed in 2026 ({videoCompleted2026.length})
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ background: 'rgba(13,79,79,0.02)' }}>
                    <TH align="left">Couple</TH>
                    <TH align="left" px="px-4">Wedding Date</TH>
                    <TH align="left" px="px-4">Type</TH>
                    <TH align="left" px="px-4">Completed</TH>
                    <TH align="left" px="px-4">Assigned</TH>
                  </tr>
                </thead>
                <tbody>
                  {videoCompleted2026.map(job => (
                    <tr key={job.id} style={{ borderBottom: '1px solid var(--border, #f3f0ed)' }}>
                      <td className="px-5 py-2.5 font-semibold" style={{ color: C.textPrimary }}>{job.couples?.couple_name || 'Unknown'}</td>
                      <td className="px-4 py-2.5" style={{ color: C.textSubtle }}>{formatDate(job.couples?.wedding_date ?? null)}</td>
                      <td className="px-4 py-2.5" style={{ color: C.textMuted }}>{formatVideoJobType(job.job_type)}</td>
                      <td className="px-4 py-2.5" style={{ color: C.tealLight }}>{formatDate(job.completed_date)}</td>
                      <td className="px-4 py-2.5" style={{ color: C.textMuted }}>{job.assigned_to || '\u2014'}</td>
                    </tr>
                  ))}
                  <tr style={{ background: C.summaryLight, borderTop: `2px solid ${C.border}` }}>
                    <td className="px-5 py-3 font-bold text-[12px] uppercase tracking-wider" style={{ color: C.textMuted }}>
                      {videoCompleted2026.length} completed
                    </td>
                    <td colSpan={2}></td>
                    <td className="px-4 py-3 text-[12px] font-medium" colSpan={2} style={{ color: C.textMuted }}>
                      {videoTypeBreakdown.map((b, i) => (
                        <span key={b.label}>{i > 0 ? ' \u00B7 ' : ''}{b.count} {b.label}</span>
                      ))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-8" style={{ borderTop: `1px solid ${C.border}` }}>
            <p className="text-[11px]" style={{ color: C.textSubtle }}>
              Generated by StudioFlow &bull; SIGS Photography
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Table Header Component ───────────────────────────────────────

function TH({ children, align = 'left', px = 'px-5' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center'; px?: string }) {
  return (
    <th
      className={`text-${align} ${px} py-2.5 text-[11px] font-semibold uppercase tracking-wider`}
      style={{ color: 'var(--primary, #0d4f4f)' }}
    >
      {children}
    </th>
  )
}

// ── Metric Card Component ────────────────────────────────────────

function MetricCard({ label, value, sublabel, valueColor, progress }: {
  label: string
  value: string
  sublabel: string
  valueColor: string
  progress?: number
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--background, #ffffff)', border: '1px solid var(--border, #e7e1d8)', boxShadow: '0 1px 3px rgba(13,79,79,0.06)' }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground, #78716c)' }}>
        {label}
      </div>
      <div className="font-bold tabular-nums leading-none mb-1.5" style={{ fontSize: '28px', color: valueColor }}>
        {value}
      </div>
      <div className="text-[12px] mb-2" style={{ color: 'var(--muted-foreground, #a8a29e)' }}>{sublabel}</div>
      {progress !== undefined && (
        <div className="h-1.5 rounded-full overflow-hidden mt-1" style={{ background: 'var(--border, #e7e1d8)' }}>
          <div className="h-full rounded-full transition-all" style={{ background: '#0d9488', width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}

// ── Summary Row Component ────────────────────────────────────────

function SummaryRow({ label, totals, bg, textColor }: {
  label: string
  totals: { pt: number; esf: number; tp: number; remaining: number; deleted: number }
  bg: string
  textColor: string
}) {
  const pctD = totals.deleted > 0 && totals.pt > 0 ? ((totals.deleted / totals.pt) * 100).toFixed(1) + '%' : '\u2014'
  const pctC = totals.pt > 0 ? ((totals.esf / totals.pt) * 100).toFixed(1) + '%' : '\u2014'
  return (
    <tr style={{ background: bg, borderTop: '2px solid var(--border, #e7e1d8)' }}>
      <td className="px-4 py-2.5 font-bold text-[13px]" style={{ color: textColor }}>{label}</td>
      <td></td>
      <td className="text-right px-3 py-2.5 font-semibold tabular-nums" style={{ color: textColor }}>{totals.pt.toLocaleString()}</td>
      <td className="text-right px-3 py-2.5 font-semibold tabular-nums" style={{ color: textColor }}>{totals.esf.toLocaleString()}</td>
      <td className="text-right px-3 py-2.5 font-semibold tabular-nums" style={{ color: textColor }}>{totals.remaining.toLocaleString()}</td>
      <td className="text-right px-3 py-2.5 font-semibold tabular-nums" style={{ color: textColor }}>{totals.deleted > 0 ? totals.deleted.toLocaleString() : '\u2014'}</td>
      <td className="text-right px-3 py-2.5 font-semibold tabular-nums" style={{ color: textColor }}>{totals.tp.toLocaleString()}</td>
      <td className="text-right px-3 py-2.5 font-semibold tabular-nums" style={{ color: textColor }}>{pctD}</td>
      <td className="text-right px-3 py-2.5 font-semibold tabular-nums" style={{ color: textColor }}>{pctC}</td>
    </tr>
  )
}
