'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Printer, Mail } from 'lucide-react'
import { Playfair_Display, Nunito } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] })
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
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function formatVendor(vendor: string | null): string {
  if (!vendor) return '—'
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
  if (!dateStr) return '—'
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

// ── Config ──────────────────────────────────────────────────────

const PHOTO_PIPELINE = [
  { status: 'waiting_approval', label: 'Waiting for Bride', color: '#d97706' },
  { status: 'ready_to_reedit', label: 'Ready to Re-edit', color: '#ea580c' },
  { status: 'reediting', label: 'Re-editing', color: '#e11d48' },
  { status: 'at_lab', label: 'At Lab', color: '#4f46e5' },
  { status: 'at_studio', label: 'At Studio', color: '#7c3aed' },
  { status: 'on_hold', label: 'On Hold', color: '#6b7280' },
  { status: 'ready_to_order', label: 'Ready to Order', color: '#d97706' },
]

const SEGMENT_FIELDS = [
  { field: 'ceremony_done', label: 'Cer' },
  { field: 'reception_done', label: 'Rec' },
  { field: 'park_done', label: 'Park' },
  { field: 'groom_done', label: 'Grm' },
  { field: 'bride_done', label: 'Brd' },
  { field: 'prereception_done', label: 'Pre' },
] as const

// Deliverable groupings — map job_types to display labels
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

// ══════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════

export default function ProductionReportPage() {
  const [allPhotoJobs, setAllPhotoJobs] = useState<PhotoJob[]>([])
  const [videoJobs, setVideoJobs] = useState<VideoJob[]>([])
  const [waitingOrderCouples, setWaitingOrderCouples] = useState<WaitingOrderCouple[]>([])
  const [loading, setLoading] = useState(true)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  // ── Send Test Email ─────────────────────────────────────────────
  const sendTestEmail = async () => {
    setEmailStatus('sending')
    try {
      const res = await fetch('/api/admin/reports/send-production-report', { method: 'POST' })
      if (res.ok) {
        setEmailStatus('sent')
      } else {
        setEmailStatus('failed')
      }
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
        const enriched = (allPhotosRes.data as any[]).map(j => ({ ...j, couples: coupleMap.get(j.couple_id) || null }))
        setAllPhotoJobs(enriched as PhotoJob[])
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

  // ── Executive Summary: 2025/2026 Season Split ─────────────────

  const photo2025 = useMemo(() => {
    const all = allPhotoJobs.filter(j => {
      const wd = j.couples?.wedding_date
      return wd && wd >= '2025-01-01' && wd < '2026-01-01'
    })
    const done = all.filter(j => ['completed', 'picked_up'].includes(j.status))
    return { total: all.length, completed: done.length, remaining: all.length - done.length }
  }, [allPhotoJobs])

  const photo2026 = useMemo(() => {
    const all = allPhotoJobs.filter(j => {
      const wd = j.couples?.wedding_date
      return wd && wd >= '2026-01-01'
    })
    const done = all.filter(j => ['completed', 'picked_up'].includes(j.status))
    return { total: all.length, completed: done.length, remaining: all.length - done.length }
  }, [allPhotoJobs])

  const video2025 = useMemo(() => {
    const all = videoJobs.filter(v => {
      const wd = v.couples?.wedding_date
      return wd && wd >= '2025-01-01' && wd < '2026-01-01'
    })
    const done = all.filter(v => v.status === 'complete')
    return { total: all.length, completed: done.length, remaining: all.length - done.length }
  }, [videoJobs])

  const video2026 = useMemo(() => {
    const all = videoJobs.filter(v => {
      const wd = v.couples?.wedding_date
      return wd && wd >= '2026-01-01'
    })
    const done = all.filter(v => v.status === 'complete')
    return { total: all.length, completed: done.length, remaining: all.length - done.length }
  }, [videoJobs])

  // ── Deliverables Produced (2026) ──────────────────────────────

  const photoDeliverables = useMemo(() => {
    const statusGroups = ['completed', 'picked_up', 'at_lab', 'at_studio', 'ready_to_reedit', 'reediting'] as const
    type StatusGroup = 'done' | 'at_lab' | 'at_studio' | 're_edit'

    const result: Record<string, Record<StatusGroup, number>> = {}

    for (const job of allPhotoJobs) {
      if (!statusGroups.includes(job.status as any)) continue
      const label = DELIVERABLE_MAP[job.job_type] || formatJobType(job.job_type)
      if (!result[label]) result[label] = { done: 0, at_lab: 0, at_studio: 0, re_edit: 0 }

      if (job.status === 'completed' || job.status === 'picked_up') result[label].done++
      else if (job.status === 'at_lab') result[label].at_lab++
      else if (job.status === 'at_studio') result[label].at_studio++
      else if (job.status === 'ready_to_reedit' || job.status === 'reediting') result[label].re_edit++
    }

    return Object.entries(result)
      .filter(([, counts]) => counts.done + counts.at_lab + counts.at_studio + counts.re_edit > 0)
      .sort((a, b) => (b[1].done + b[1].at_lab + b[1].at_studio + b[1].re_edit) - (a[1].done + a[1].at_lab + a[1].at_studio + a[1].re_edit))
  }, [allPhotoJobs])

  const videoDeliverables = useMemo(() => {
    return videoJobs
      .filter(v => v.status === 'complete')
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
  }, [videoJobs])

  const videoDeliverablesByType = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const v of videoDeliverables) {
      const label = formatVideoJobType(v.job_type)
      counts[label] = (counts[label] || 0) + 1
    }
    return counts
  }, [videoDeliverables])

  // ── Photo Production: Currently Editing (proofs only) ─────────

  const activePhotoJobs = useMemo(() =>
    allPhotoJobs.filter(j => !['completed', 'picked_up'].includes(j.status)),
  [allPhotoJobs])

  const editingProofs = useMemo(() =>
    activePhotoJobs.filter(j => j.status === 'in_progress' && isProofsJob(j.job_type)),
  [activePhotoJobs])

  const asapTotals = useMemo(() => {
    const pt = editingProofs.reduce((s, j) => s + (j.photos_taken || 0), 0)
    const esf = editingProofs.reduce((s, j) => s + (j.edited_so_far || 0), 0)
    const tp = editingProofs.reduce((s, j) => s + (j.total_proofs || 0), 0)
    const deleted = safeDeleted(pt, tp)
    return {
      pt, esf, tp, remaining: tp > 0 ? tp - esf : pt - esf, deleted,
      pctDeleted: deleted > 0 && pt > 0 ? ((deleted / pt) * 100).toFixed(1) : null,
      pctCompleted: pt > 0 ? ((esf / pt) * 100).toFixed(1) : null,
    }
  }, [editingProofs])

  const cemeteryProofsTotals = useMemo(() => {
    const proofs = allPhotoJobs.filter(j => ['completed', 'picked_up'].includes(j.status) && isProofsJob(j.job_type))
    const pt = proofs.reduce((s, j) => s + (j.photos_taken || 0), 0)
    const esf = proofs.reduce((s, j) => s + (j.edited_so_far || 0), 0)
    const tp = proofs.reduce((s, j) => s + (j.total_proofs || 0), 0)
    const deleted = safeDeleted(pt, tp)
    return {
      pt, esf, tp, remaining: tp > 0 ? tp - esf : pt - esf, deleted,
      pctDeleted: deleted > 0 && pt > 0 ? ((deleted / pt) * 100).toFixed(1) : null,
      pctCompleted: pt > 0 ? ((esf / pt) * 100).toFixed(1) : null,
    }
  }, [allPhotoJobs])

  const ytdTotals = useMemo(() => {
    const proofsJobs = allPhotoJobs.filter(j => isProofsJob(j.job_type))
    const pt = proofsJobs.reduce((s, j) => s + (j.photos_taken || 0), 0)
    const esf = proofsJobs.reduce((s, j) => s + (j.edited_so_far || 0), 0)
    const tp = proofsJobs.reduce((s, j) => s + (j.total_proofs || 0), 0)
    const deleted = safeDeleted(pt, tp)
    return {
      pt, esf, tp, remaining: tp > 0 ? tp - esf : pt - esf, deleted,
      pctDeleted: deleted > 0 && pt > 0 ? ((deleted / pt) * 100).toFixed(1) : null,
      pctCompleted: pt > 0 ? ((esf / pt) * 100).toFixed(1) : null,
    }
  }, [allPhotoJobs])

  // ── Video by Status ───────────────────────────────────────────

  const videoByStatus = useMemo(() => ({
    in_progress: videoJobs.filter(v => v.status === 'in_progress'),
    waiting_for_bride: videoJobs.filter(v => v.status === 'waiting_for_bride'),
    not_started: videoJobs.filter(v => v.status === 'not_started'),
    waiting_on_recap: videoJobs.filter(v => v.status === 'waiting_on_recap'),
    complete: videoJobs.filter(v => v.status === 'complete'),
    all_active: videoJobs.filter(v => v.status !== 'complete' && v.status !== 'archived'),
  }), [videoJobs])

  // ── Loading ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={`${nunito.className} flex items-center justify-center h-screen bg-[#faf8f5]`}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0d4f4f]" />
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className={`${nunito.className} min-h-screen bg-[#faf8f5] text-gray-900`}>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .report-page { background: white !important; padding: 0 !important; }
          .report-header { border-radius: 0 !important; margin: 0 !important; }
          section { break-inside: avoid; }
        }
      `}</style>

      {/* ═══ HEADER ═══ */}
      <header className="report-header bg-[#0d4f4f] text-white px-8 py-8 relative">
        <h1 className={`${playfair.className} text-3xl font-bold tracking-wide`}>SIGS Photography</h1>
        <p className="text-[#a3d4d4] text-lg mt-1">Production Status Report</p>
        <p className="text-[#7ab8b8] text-sm mt-1">{timestamp}</p>
        <div className="no-print absolute top-6 right-8 flex items-center gap-3">
          <button
            onClick={sendTestEmail}
            disabled={emailStatus === 'sending'}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              emailStatus === 'sent' ? 'bg-green-500/30 text-green-100' :
              emailStatus === 'failed' ? 'bg-red-500/30 text-red-100' :
              emailStatus === 'sending' ? 'bg-white/10 text-white/60 cursor-wait' :
              'bg-white/15 hover:bg-white/25'
            }`}
          >
            <Mail className="h-4 w-4" />
            {emailStatus === 'sending' ? 'Sending...' :
             emailStatus === 'sent' ? 'Email Sent!' :
             emailStatus === 'failed' ? 'Send Failed' :
             'Send Test Email'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      </header>

      <div className="report-page max-w-[1200px] mx-auto px-8 py-8">

        {/* ═══ EXECUTIVE SUMMARY ═══ */}
        <section className="mb-10">
          {/* 2025 Season */}
          <div className="mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">2025 Season</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📷</span>
                  <p className="text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Photo 2025</p>
                </div>
                <p className="text-2xl font-bold">{photo2025.total} <span className="text-sm font-normal text-gray-400">total jobs</span></p>
                <p className="text-sm text-gray-500 mt-1">{photo2025.completed} completed / picked up</p>
                {photo2025.remaining > 0 && (
                  <p className="text-sm font-semibold text-amber-600 mt-1">{photo2025.remaining} remaining in pipeline</p>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🎬</span>
                  <p className="text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Video 2025</p>
                </div>
                <p className="text-2xl font-bold">{video2025.total} <span className="text-sm font-normal text-gray-400">total jobs</span></p>
                <p className="text-sm text-gray-500 mt-1">{video2025.completed} completed</p>
                {video2025.remaining > 0 && (
                  <p className="text-sm font-semibold text-amber-600 mt-1">{video2025.remaining} remaining</p>
                )}
              </div>
            </div>
          </div>

          {/* 2026 Season */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">2026 Season</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📷</span>
                  <p className="text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Photo 2026</p>
                </div>
                <p className="text-2xl font-bold">{photo2026.total} <span className="text-sm font-normal text-gray-400">total jobs</span></p>
                <p className="text-sm text-gray-500 mt-1">{photo2026.completed} completed / picked up</p>
                {photo2026.remaining > 0 && (
                  <p className="text-sm font-semibold text-amber-600 mt-1">{photo2026.remaining} remaining in pipeline</p>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🎬</span>
                  <p className="text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Video 2026</p>
                </div>
                <p className="text-2xl font-bold">{video2026.total} <span className="text-sm font-normal text-gray-400">total jobs</span></p>
                <p className="text-sm text-gray-500 mt-1">{video2026.completed} completed</p>
                {video2026.remaining > 0 && (
                  <p className="text-sm font-semibold text-amber-600 mt-1">{video2026.remaining} remaining</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ DELIVERABLES PRODUCED ═══ */}
        <section className="mb-12">
          <div className="bg-[#0d4f4f] text-white rounded-lg px-5 py-3 mb-5 flex items-center gap-3">
            <span className="text-xl">📊</span>
            <h2 className={`${playfair.className} text-xl font-bold`}>Deliverables Produced</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Photo Deliverables */}
            {photoDeliverables.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-bold text-sm text-[#0d4f4f]">📷 Photo Deliverables</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0d4f4f]/5">
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Deliverable</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Done</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">At Lab</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">At Studio</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Re-edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {photoDeliverables.map(([label, counts], i) => (
                      <tr key={label} className={i % 2 === 1 ? 'bg-[#faf8f5]' : ''}>
                        <td className="px-3 py-2 font-medium">{label}</td>
                        <td className="px-3 py-2 text-right">{counts.done > 0 ? counts.done : '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-400">{counts.at_lab > 0 ? counts.at_lab : '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-400">{counts.at_studio > 0 ? counts.at_studio : '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-400">{counts.re_edit > 0 ? counts.re_edit : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Video Deliverables */}
            {videoDeliverables.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-bold text-sm text-[#0d4f4f]">
                    🎬 Video Deliverables
                    <span className="ml-2 font-normal text-gray-500">
                      {videoDeliverables.length} video{videoDeliverables.length !== 1 ? 's' : ''} completed
                      {Object.keys(videoDeliverablesByType).length > 0 && (
                        <> ({Object.entries(videoDeliverablesByType).map(([t, c]) => `${c} ${t}${c !== 1 ? 's' : ''}`).join(', ')})</>
                      )}
                    </span>
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0d4f4f]/5">
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Couple</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Type</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videoDeliverables.map((vj, i) => (
                      <tr key={vj.id} className={i % 2 === 1 ? 'bg-[#faf8f5]' : ''}>
                        <td className="px-3 py-2 font-medium">{vj.couples?.couple_name || 'Unknown'}</td>
                        <td className="px-3 py-2 text-gray-600">{formatVideoJobType(vj.job_type)}</td>
                        <td className="px-3 py-2 text-emerald-600 font-medium">Complete</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ═══ PHOTO PRODUCTION ═══ */}
        <section className="mb-12">
          <div className="bg-[#0d4f4f] text-white rounded-lg px-5 py-3 mb-5 flex items-center gap-3">
            <span className="text-xl">📷</span>
            <h2 className={`${playfair.className} text-xl font-bold`}>Photo Production</h2>
          </div>

          {/* Currently Editing Table (proofs only) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-sm text-[#0d4f4f]">Currently Editing <span className="ml-2 text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{editingProofs.length}</span></h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead>
                  <tr className="bg-[#0d4f4f]/5">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Couple</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Job</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Photos Taken</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Edited So Far</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Remaining</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Deleted</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">Total Proofs</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">% Deleted</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-[#0d4f4f] uppercase tracking-wide">% Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {editingProofs.map((job, i) => {
                    const pt = job.photos_taken || 0
                    const esf = job.edited_so_far || 0
                    const tp = job.total_proofs || 0
                    const remaining = tp > 0 ? tp - esf : pt - esf
                    const deleted = safeDeleted(pt, tp)
                    const pctDel = deleted > 0 && pt > 0 ? ((deleted / pt) * 100).toFixed(1) : null
                    const pctComp = pt > 0 ? ((esf / pt) * 100).toFixed(1) : null
                    return (
                      <tr key={job.id} className={i % 2 === 1 ? 'bg-[#faf8f5]' : ''}>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold">{job.couples?.couple_name || 'Unknown'}</div>
                          {job.couples?.wedding_date && <div className="text-xs text-gray-400">{formatDate(job.couples.wedding_date)}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">{formatJobType(job.job_type)}</td>
                        <td className="px-3 py-2.5 text-right">{pt.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right">{esf.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">{remaining.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">{deleted > 0 ? deleted.toLocaleString() : '—'}</td>
                        <td className="px-3 py-2.5 text-right">{tp.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">{pctDel !== null ? `${pctDel}%` : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">{pctComp !== null ? `${pctComp}%` : '—'}</td>
                      </tr>
                    )
                  })}
                  {editingProofs.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-400 italic">No proofs currently being edited</td></tr>
                  )}
                  {/* ASAP Summary */}
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                    <td className="px-3 py-2.5 font-bold">Currently Due ASAP</td>
                    <td></td>
                    <td className="px-3 py-2.5 text-right">{asapTotals.pt.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right">{asapTotals.esf.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right">{asapTotals.remaining.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right">{asapTotals.deleted > 0 ? asapTotals.deleted.toLocaleString() : '—'}</td>
                    <td className="px-3 py-2.5 text-right">{asapTotals.tp.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right">{asapTotals.pctDeleted !== null ? `${asapTotals.pctDeleted}%` : '—'}</td>
                    <td className="px-3 py-2.5 text-right">{asapTotals.pctCompleted !== null ? `${asapTotals.pctCompleted}%` : '—'}</td>
                  </tr>
                  {/* Cemetery Total */}
                  <tr className="bg-gray-200 border-t border-gray-300 font-semibold text-gray-600">
                    <td className="px-3 py-2.5 font-bold">Cemetery Total</td>
                    <td></td>
                    <td className="px-3 py-2.5 text-right">{cemeteryProofsTotals.pt.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right">{cemeteryProofsTotals.esf.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right">{cemeteryProofsTotals.remaining.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right">{cemeteryProofsTotals.deleted > 0 ? cemeteryProofsTotals.deleted.toLocaleString() : '—'}</td>
                    <td className="px-3 py-2.5 text-right">{cemeteryProofsTotals.tp.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right">{cemeteryProofsTotals.pctDeleted !== null ? `${cemeteryProofsTotals.pctDeleted}%` : '—'}</td>
                    <td className="px-3 py-2.5 text-right">{cemeteryProofsTotals.pctCompleted !== null ? `${cemeteryProofsTotals.pctCompleted}%` : '—'}</td>
                  </tr>
                  {/* YTD Summary */}
                  <tr className="bg-[#dc2626] text-white font-bold" style={{ fontSize: '15px' }}>
                    <td className="px-3 py-3 font-bold">Year to Date</td>
                    <td></td>
                    <td className="px-3 py-3 text-right">{ytdTotals.pt.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right">{ytdTotals.esf.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right">{ytdTotals.remaining.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right">{ytdTotals.deleted > 0 ? ytdTotals.deleted.toLocaleString() : '—'}</td>
                    <td className="px-3 py-3 text-right">{ytdTotals.tp.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right">{ytdTotals.pctDeleted !== null ? `${ytdTotals.pctDeleted}%` : '—'}</td>
                    <td className="px-3 py-3 text-right">{ytdTotals.pctCompleted !== null ? `${ytdTotals.pctCompleted}%` : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Photo Pipeline Sections */}
          {PHOTO_PIPELINE.map(section => {
            const sectionJobs = activePhotoJobs.filter(j => j.status === section.status)
            if (sectionJobs.length === 0) return null
            return (
              <div key={section.status} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
                <div className="px-5 py-2.5 flex items-center justify-between" style={{ backgroundColor: section.color }}>
                  <h3 className="font-bold text-sm text-white">{section.label}</h3>
                  <span className="text-xs text-white/80 font-semibold">{sectionJobs.length}</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-[30%]">Couple</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-[18%]">Wedding Date</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-[24%]">Job Type</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-[10%]">Photos</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-[18%]">Vendor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionJobs.map((job, i) => (
                      <tr key={job.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-[#faf8f5]' : ''}`}>
                        <td className="px-3 py-2.5 font-medium">{job.couples?.couple_name || 'Unknown'}</td>
                        <td className="px-3 py-2.5 text-gray-500">{formatDate(job.couples?.wedding_date ?? null)}</td>
                        <td className="px-3 py-2.5 text-gray-600">{formatJobType(job.job_type)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">{job.photos_taken ?? '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600">{formatVendor(job.vendor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}

          {/* Follow-Up Required */}
          {waitingOrderCouples.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 shadow-sm overflow-hidden mt-6">
              <div className="px-5 py-3 bg-amber-100 border-b border-amber-200">
                <h3 className="font-bold text-sm text-amber-900">⚠️ Follow-Up Required — Couples Awaiting Photo Order</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-100">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-amber-800 uppercase tracking-wide w-[40%]">Couple</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-amber-800 uppercase tracking-wide w-[40%]">Wedding Date</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-amber-800 uppercase tracking-wide w-[20%]">Days Since</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingOrderCouples.map((couple, i) => {
                    const days = daysSince(couple.wedding_date)
                    return (
                      <tr key={couple.id} className={`border-b border-amber-50 ${i % 2 === 1 ? 'bg-amber-50/50' : ''}`}>
                        <td className={`px-3 py-2.5 font-medium ${days > 180 ? 'text-red-700 font-bold' : ''}`}>{couple.couple_name}</td>
                        <td className="px-3 py-2.5 text-gray-600">{formatDate(couple.wedding_date)}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold ${days > 180 ? 'text-red-700 font-bold' : days > 90 ? 'text-amber-700' : 'text-gray-600'}`}>{days}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ═══ VIDEO PRODUCTION ═══ */}
        <section className="mb-12">
          <div className="bg-[#0d4f4f] text-white rounded-lg px-5 py-3 mb-5 flex items-center gap-3">
            <span className="text-xl">🎬</span>
            <h2 className={`${playfair.className} text-xl font-bold`}>Video Production</h2>
          </div>

          {/* Video Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-emerald-600">{videoByStatus.complete.length}</p>
              <p className="text-xs text-gray-500 font-semibold uppercase mt-1">Complete</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-500">{videoDeliverables.length}</p>
              <p className="text-xs text-gray-500 font-semibold uppercase mt-1">Edited</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-blue-600">{videoByStatus.in_progress.length}</p>
              <p className="text-xs text-gray-500 font-semibold uppercase mt-1">In Progress</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-purple-600">{videoByStatus.waiting_for_bride.length}</p>
              <p className="text-xs text-gray-500 font-semibold uppercase mt-1">Waiting for Bride</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-600">{videoByStatus.not_started.length}</p>
              <p className="text-xs text-gray-500 font-semibold uppercase mt-1">Not Started</p>
            </div>
          </div>

          {/* Video In Progress */}
          {videoByStatus.in_progress.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
              <div className="px-5 py-2.5 bg-blue-600 flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">In Progress</h3>
                <span className="text-xs text-white/80 font-semibold">{videoByStatus.in_progress.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Couple</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Wedding Date</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Segments</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proxies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videoByStatus.in_progress.map((vj, i) => {
                      const doneCount = SEGMENT_FIELDS.filter(s => (vj as any)[s.field]).length
                      return (
                        <tr key={vj.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-[#faf8f5]' : ''}`}>
                          <td className="px-3 py-2.5 font-medium">{vj.couples?.couple_name || 'Unknown'}</td>
                          <td className="px-3 py-2.5 text-gray-500">{formatDate(vj.couples?.wedding_date ?? null)}</td>
                          <td className="px-3 py-2.5 text-gray-600">{formatVideoJobType(vj.job_type)}</td>
                          <td className="px-3 py-2.5 text-gray-600">{vj.assigned_to || '—'}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="font-semibold">{doneCount}/6</span>
                            <span className="ml-2 text-xs">
                              {SEGMENT_FIELDS.map(s => (
                                <span key={s.field} title={s.label} className="mx-0.5">{(vj as any)[s.field] ? '✅' : '○'}</span>
                              ))}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">{vj.proxies_run ? '✅' : '○'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Video Waiting for Bride */}
          {videoByStatus.waiting_for_bride.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
              <div className="px-5 py-2.5 bg-purple-600 flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Waiting for Bride</h3>
                <span className="text-xs text-white/80 font-semibold">{videoByStatus.waiting_for_bride.length}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Couple</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Wedding Date</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {videoByStatus.waiting_for_bride.map((vj, i) => (
                    <tr key={vj.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-[#faf8f5]' : ''}`}>
                      <td className="px-3 py-2.5 font-medium">{vj.couples?.couple_name || 'Unknown'}</td>
                      <td className="px-3 py-2.5 text-gray-500">{formatDate(vj.couples?.wedding_date ?? null)}</td>
                      <td className="px-3 py-2.5 text-gray-600">{formatVideoJobType(vj.job_type)}</td>
                      <td className="px-3 py-2.5 text-gray-600">{vj.assigned_to || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Video Not Started */}
          {videoByStatus.not_started.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
              <div className="px-5 py-2.5 bg-gray-600 flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Not Started</h3>
                <span className="text-xs text-white/80 font-semibold">{videoByStatus.not_started.length}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Couple</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Wedding Date</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proxies</th>
                  </tr>
                </thead>
                <tbody>
                  {[...videoByStatus.not_started]
                    .sort((a, b) => (a.couples?.wedding_date || '').localeCompare(b.couples?.wedding_date || ''))
                    .map((vj, i) => (
                      <tr key={vj.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-[#faf8f5]' : ''}`}>
                        <td className="px-3 py-2.5 font-medium">{vj.couples?.couple_name || 'Unknown'}</td>
                        <td className="px-3 py-2.5 text-gray-500">{formatDate(vj.couples?.wedding_date ?? null)}</td>
                        <td className="px-3 py-2.5 text-gray-600">{formatVideoJobType(vj.job_type)}</td>
                        <td className="px-3 py-2.5 text-gray-600">{vj.assigned_to || '—'}</td>
                        <td className="px-3 py-2.5 text-center">{vj.proxies_run ? '✅' : '○'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Video Waiting on Recap */}
          {videoByStatus.waiting_on_recap.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
              <div className="px-5 py-2.5 bg-amber-500 flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Waiting on Recap</h3>
                <span className="text-xs text-white/80 font-semibold">{videoByStatus.waiting_on_recap.length}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Couple</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Wedding Date</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {videoByStatus.waiting_on_recap.map((vj, i) => (
                    <tr key={vj.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-[#faf8f5]' : ''}`}>
                      <td className="px-3 py-2.5 font-medium">{vj.couples?.couple_name || 'Unknown'}</td>
                      <td className="px-3 py-2.5 text-gray-500">{formatDate(vj.couples?.wedding_date ?? null)}</td>
                      <td className="px-3 py-2.5 text-gray-600">{vj.assigned_to || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer className="border-t border-gray-200 pt-4 flex justify-between text-xs text-gray-400">
          <p>Generated by StudioFlow &bull; SIGS Photography</p>
          <p>{timestamp}</p>
        </footer>
      </div>
    </div>
  )
}
