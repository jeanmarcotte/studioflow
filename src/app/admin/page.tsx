'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Camera, Clock, X, Video, ClipboardList, DollarSign, BookOpen, Pencil, Phone } from 'lucide-react'
import { format, differenceInDays, parseISO, addDays } from 'date-fns'
import { formatWeddingDate, formatDateCompact, formatDate, formatCurrency } from '@/lib/formatters'
import * as d3 from 'd3'
import WeekAhead from '@/components/dashboard/WeekAhead'
import ProductionFloor from '@/components/dashboard/ProductionFloor'
import TheBusiness from '@/components/dashboard/TheBusiness'

interface Couple {
  id: string
  couple_name: string
  bride_name: string | null
  groom_name: string | null
  wedding_date: string | null
  wedding_year: number | null
  ceremony_venue: string | null
  package_type: string | null
  coverage_hours: number | null
  photographer: string | null
  status: string | null
  engagement_status: string | null
  engagement_date: string | null
  contract_total: number | null
  total_paid: number | null
  balance_owing: number | null
  form_submitted: boolean | null
  album_status: string | null
}

interface PhotoJobRow {
  id: string
  couple_id: string
  status: string
  couples?: { couple_name: string } | null
}

interface VideoJobRow {
  id: string
  couple_id: string
  status: string
  couples?: { couple_name: string } | null
}

interface EditingJobRow {
  id: string
  couple_id: string
  job_type: string
  category: string | null
  description: string | null
  vendor: string | null
  status: string
  photos_taken: number | null
  edited_so_far: number | null
  couples?: { couple_name: string; wedding_date: string | null } | null
}

interface InstallmentRow {
  id: string
  contract_id: string
  installment_number: number
  due_description: string
  amount: number
  due_date: string | null
  paid: boolean | null
  contracts?: { couples?: { couple_name: string } | null } | null
}

interface CurrentlyEditingJob {
  id: string
  couple_name: string
  job_type: string
  photos_taken: number
  edited_so_far: number
  status: string
}

interface EngMilestone {
  couple_id: string
  m06_eng_session_shot: boolean | null
  m06_declined: boolean | null
}

interface EngAppointment {
  id: string
  couple_id: string
  appointment_date: string
  start_time: string | null
  location: string | null
  status: string
  couples?: { bride_first_name: string | null; groom_first_name: string | null } | null
}

interface YearRingData {
  year: number
  total: number
  completed: number
}

function RadialRings({ data }: { data: YearRingData[] }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const size = 300
    const center = size / 2

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${size} ${size}`)

    const g = svg.append('g').attr('transform', `translate(${center},${center})`)

    const ringWidth = 22
    const gap = 8
    const rings = [
      { ...data[0], radius: center - 20 },
      { ...data[1], radius: center - 20 - ringWidth - gap },
      { ...data[2], radius: center - 20 - (ringWidth + gap) * 2 },
    ]

    const colors = ['#14b8a6', '#0ea5e9', '#8b5cf6']

    rings.forEach((ring, i) => {
      const pct = ring.total > 0 ? ring.completed / ring.total : 0

      g.append('circle')
        .attr('r', ring.radius)
        .attr('fill', 'none')
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', ringWidth)

      if (pct > 0) {
        const arc = d3.arc<unknown>()
          .innerRadius(ring.radius - ringWidth / 2)
          .outerRadius(ring.radius + ringWidth / 2)
          .startAngle(0)
          .endAngle(pct * 2 * Math.PI)
          .cornerRadius(ringWidth / 2)

        g.append('path')
          .attr('d', arc(null as unknown as d3.DefaultArcObject))
          .attr('fill', colors[i])
      }

      g.append('text')
        .attr('x', 0)
        .attr('y', -ring.radius)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', colors[i])
        .text(ring.year)
    })

    const totalAll = data.reduce((s, d) => s + d.total, 0)
    const completedAll = data.reduce((s, d) => s + d.completed, 0)

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.3em')
      .attr('font-size', '28px')
      .attr('font-weight', '700')
      .attr('fill', 'currentColor')
      .text(completedAll)

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .attr('font-size', '11px')
      .attr('fill', '#6b7280')
      .text(`of ${totalAll} completed`)
  }, [data])

  return <svg ref={svgRef} className="w-full max-w-[300px] mx-auto" />
}

// Dashboard box component
interface DashboardBox {
  key: string
  title: string
  icon: React.ElementType
  count: number
  color: string
  iconColor: string
  details: { label: string; sub?: string }[]
}

function DashboardBoxCard({ box, onClick }: { box: DashboardBox; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border bg-card p-4 text-left hover:border-primary hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`rounded-lg p-2 ${box.color}`}>
          <box.icon className={`h-4 w-4 ${box.iconColor}`} />
        </div>
        <span className="text-2xl font-bold">{box.count}</span>
      </div>
      <div className="text-sm font-medium">{box.title}</div>
    </button>
  )
}

export default function AdminDashboardPage() {
  const [couples, setCouples] = useState<Couple[]>([])
  const [photoJobs, setPhotoJobs] = useState<PhotoJobRow[]>([])
  const [videoJobs, setVideoJobs] = useState<VideoJobRow[]>([])
  const [installments, setInstallments] = useState<InstallmentRow[]>([])
  const [editingJobs, setEditingJobs] = useState<EditingJobRow[]>([])
  const [formCoupleIds, setFormCoupleIds] = useState<Set<string>>(new Set())
  const [engMilestones, setEngMilestones] = useState<EngMilestone[]>([])
  const [engAppointments, setEngAppointments] = useState<EngAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [modalYear, setModalYear] = useState<number | null>(null)
  const [expandedBox, setExpandedBox] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      const todayDate = new Date().toISOString().split('T')[0]
      const [couplesRes, photoRes, videoRes, installRes, editingRes, formsRes, milestonesRes, appointmentsRes] = await Promise.all([
        supabase.from('couples').select('*').order('wedding_date', { ascending: true }),
        supabase.from('editing_queue').select('id, couple_id, status, couples(couple_name)'),
        supabase.from('video_jobs').select('id, couple_id, status, couples(couple_name, wedding_date)'),
        supabase.from('contract_installments').select('id, contract_id, installment_number, due_description, amount, due_date, paid, contracts(couples(couple_name))'),
        supabase.from('jobs').select('id, couple_id, job_type, category, description, vendor, status, photos_taken, edited_so_far, couples(couple_name, wedding_date)'),
        supabase.from('wedding_day_forms').select('couple_id'),
        supabase.from('couple_milestones').select('couple_id, m06_eng_session_shot, m06_declined'),
        supabase.from('couple_appointments').select('id, couple_id, appointment_date, start_time, location, status, couples(bride_first_name, groom_first_name)').eq('appointment_type', 'engagement_shoot').eq('status', 'scheduled').gte('appointment_date', todayDate).order('appointment_date', { ascending: true }),
      ])

      if (couplesRes.data) setCouples(couplesRes.data)
      if (photoRes.data) setPhotoJobs(photoRes.data as unknown as PhotoJobRow[])
      if (videoRes.data) setVideoJobs(videoRes.data as unknown as VideoJobRow[])
      if (installRes.data) setInstallments(installRes.data as unknown as InstallmentRow[])
      if (editingRes.data) setEditingJobs(editingRes.data as unknown as EditingJobRow[])
      if (formsRes.data) setFormCoupleIds(new Set(formsRes.data.map((f: { couple_id: string }) => f.couple_id)))
      if (milestonesRes.data) setEngMilestones(milestonesRes.data as EngMilestone[])
      if (appointmentsRes.data) setEngAppointments(appointmentsRes.data as unknown as EngAppointment[])
      setLoading(false)
    }
    fetchAll()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const currentYear = today.getFullYear()
  const in30days = format(addDays(today, 30), 'yyyy-MM-dd')
  const in60days = format(addDays(today, 60), 'yyyy-MM-dd')

  // Year card data — order: 2026, 2027, 2025
  const yearCardOrder = [2026, 2027, 2025]
  const yearCardsMap = new Map<number, { year: number; count: number; completedCount: number; sub: string }>()

  for (const year of [2025, 2026, 2027]) {
    const yearCouples = couples.filter(c => c.wedding_year === year && c.status === 'booked')
    const completedCount = yearCouples.filter(c => {
      if (!c.wedding_date) return false
      return parseISO(c.wedding_date) < today
    }).length

    let sub: string
    if (year < currentYear) {
      sub = 'Season Complete \u2713'
    } else if (year === currentYear) {
      sub = `${completedCount} of ${yearCouples.length} completed`
    } else {
      sub = 'Booking now'
    }

    yearCardsMap.set(year, { year, count: yearCouples.length, completedCount, sub })
  }

  const yearCards = yearCardOrder.map(y => yearCardsMap.get(y)!)

  // D3 ring data (keep original order for rings: 2025 outer, 2026 middle, 2027 inner)
  const ringData: YearRingData[] = [2025, 2026, 2027].map(y => {
    const c = yearCardsMap.get(y)!
    return { year: c.year, total: c.count, completed: c.completedCount }
  })

  const thisYearCouples = couples.filter(c => c.wedding_year === currentYear)

  // Month data with per-wedding completion segments
  const monthsData = Array.from({ length: 12 }, (_, i) => {
    const monthCouples = thisYearCouples
      .filter(c => {
        if (!c.wedding_date) return false
        return parseISO(c.wedding_date).getMonth() === i
      })
      .sort((a, b) => (a.wedding_date || '').localeCompare(b.wedding_date || ''))

    const segments = monthCouples.map(c => ({
      id: c.id,
      completed: c.wedding_date ? parseISO(c.wedding_date) < today : false,
    }))

    return {
      month: format(new Date(currentYear, i, 1), 'MMM'),
      count: monthCouples.length,
      segments,
    }
  })
  const maxMonthCount = Math.max(...monthsData.map(m => m.count), 1)

  // Upcoming weddings (all future booked)
  const upcoming = couples
    .filter(c => {
      if (!c.wedding_date || c.status !== 'booked') return false
      return differenceInDays(parseISO(c.wedding_date), today) >= 0
    })
    .sort((a, b) => a.wedding_date!.localeCompare(b.wedding_date!))

  // Recent weddings (past 30 days, still "booked")
  const recentlyPast = couples
    .filter(c => {
      if (!c.wedding_date) return false
      const wDate = parseISO(c.wedding_date)
      const daysSince = differenceInDays(today, wDate)
      return daysSince >= 0 && daysSince <= 30 && c.status === 'booked'
    })
    .sort((a, b) => b.wedding_date!.localeCompare(a.wedding_date!))

  // Modal data
  const modalCouples = modalYear
    ? couples
        .filter(c => c.wedding_year === modalYear && c.status === 'booked')
        .sort((a, b) => (a.wedding_date || '').localeCompare(b.wedding_date || ''))
    : []

  // Footer data
  const nextWedding = upcoming[0] || null
  const nextWeddingDate = nextWedding?.wedding_date ? parseISO(nextWedding.wedding_date) : null
  const daysUntilNext = nextWeddingDate ? differenceInDays(nextWeddingDate, today) : null
  const remainingThisYear = upcoming.filter(c => c.wedding_year === currentYear).length

  // === 7 DASHBOARD BOXES ===

  // BOX 1: Currently Editing — jobs in progress from jobs table
  const JOB_TYPE_LABELS: Record<string, string> = {
    eng_proofs: 'Engagement Proofs', wed_proofs: 'Wedding Proofs',
    PARENT_BOOK: 'Parent Book', parent_album: 'Parent Album',
    bg_album: 'B&G Album', eng_album: 'Engagement Album',
  }
  const currentlyEditing: CurrentlyEditingJob[] = editingJobs
    .filter(j => j.status === 'in_progress' || j.status === 'not_started')
    .map(j => ({
      id: j.id,
      couple_name: j.couples?.couple_name || 'Unknown',
      job_type: j.job_type,
      photos_taken: Number(j.photos_taken) || 0,
      edited_so_far: Number(j.edited_so_far) || 0,
      status: j.status,
    }))
    .sort((a, b) => a.couple_name.localeCompare(b.couple_name))

  // BOX 2: Video In Production — exclude completed statuses
  const VIDEO_COMPLETE_STATUSES = ['complete', 'Completed', 'Picked Up', 'Cancelled']
  const videosInProd = videoJobs.filter(j => !VIDEO_COMPLETE_STATUSES.includes(j.status))

  // BOX 3: Missing Wedding Forms
  const missingForms = couples.filter(c => {
    if (!c.wedding_date || c.status !== 'booked') return false
    return !formCoupleIds.has(c.id) && c.wedding_date >= todayStr && c.wedding_date <= in60days
  })

  // BOX 4: Deposits Due (next 30 days, unpaid)
  const depositsDue = installments.filter(i => {
    if (!i.due_date) return false
    return i.due_date <= in30days && i.due_date >= todayStr && !i.paid
  })

  // BOX 5: Albums In Progress (from production_jobs)
  const ALBUM_TYPES = ['parent_album', 'bg_album', 'eng_album']
  const ALBUM_TYPE_LABELS: Record<string, string> = {
    parent_album: 'Parent Album', bg_album: 'B&G Album', eng_album: 'Engagement Album',
  }
  const ALBUM_STATUS_LABELS: Record<string, string> = {
    in_progress: 'In Progress', waiting_approval: 'Waiting Approval',
    ready_to_reedit: 'Ready to Re-edit', reediting: 'Re-editing',
    at_lab: 'At Lab', on_hold: 'On Hold', ready_to_order: 'Ready to Order',
  }
  const albumsInProgress = editingJobs.filter(j =>
    ALBUM_TYPES.includes(j.job_type) && j.status !== 'completed' && j.status !== 'not_started'
  )

  const dashboardBoxes: DashboardBox[] = [
    {
      key: 'currently_editing',
      title: 'Currently Editing',
      icon: Pencil,
      count: currentlyEditing.length,
      color: 'bg-amber-50',
      iconColor: 'text-amber-600',
      details: currentlyEditing.map(j => ({
        label: `${j.couple_name} — ${JOB_TYPE_LABELS[j.job_type] || j.job_type.replace(/_/g, ' ')}`,
        sub: j.photos_taken > 0 ? `${j.edited_so_far}/${j.photos_taken} edited` : j.status === 'not_started' ? 'Not started' : 'In progress',
      })),
    },
    {
      key: 'video_prod',
      title: 'Video In Production',
      icon: Video,
      count: videosInProd.length,
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
      details: videosInProd.map(j => ({
        label: j.couples?.couple_name || 'Unknown',
        sub: j.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      })),
    },
    {
      key: 'missing_forms',
      title: 'Missing Wedding Forms',
      icon: ClipboardList,
      count: missingForms.length,
      color: 'bg-red-50',
      iconColor: 'text-red-600',
      details: missingForms.map(c => ({
        label: c.couple_name,
        sub: c.wedding_date ? formatDateCompact(c.wedding_date).replace(/, \d{4}$/, '') : 'TBD',
      })),
    },
    {
      key: 'deposits',
      title: 'Deposits Due',
      icon: DollarSign,
      count: depositsDue.length,
      color: 'bg-green-50',
      iconColor: 'text-green-600',
      details: depositsDue.map(i => {
        const coupleName = (i.contracts as any)?.couples?.couple_name || 'Unknown'
        return {
          label: `${coupleName} — ${i.due_description || `Installment #${i.installment_number}`}`,
          sub: i.due_date ? `${formatCurrency(i.amount)} — ${formatDateCompact(i.due_date).replace(/, \d{4}$/, '')}` : formatCurrency(i.amount),
        }
      }),
    },
    {
      key: 'albums',
      title: 'Albums In Progress',
      icon: BookOpen,
      count: albumsInProgress.length,
      color: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      details: albumsInProgress.map(j => ({
        label: `${j.couples?.couple_name || 'Unknown'} — ${ALBUM_TYPE_LABELS[j.job_type] || j.job_type}${j.description ? ` (${j.description})` : ''}`,
        sub: `${j.vendor ? j.vendor.toUpperCase() : '—'} · ${ALBUM_STATUS_LABELS[j.status] || j.status}`,
      })),
    },
  ]

  const expandedBoxData = expandedBox ? dashboardBoxes.find(b => b.key === expandedBox) : null

  // === ENGAGEMENT PIPELINE ===
  const msMap = new Map(engMilestones.map(m => [m.couple_id, m]))
  const bookedCouples = couples.filter(c => c.status === 'booked')

  const engShotCount = engMilestones.filter(m => m.m06_eng_session_shot === true).length
  const engDeclinedCount = engMilestones.filter(m => m.m06_declined === true).length
  const engPendingCouples = bookedCouples.filter(c => {
    const m = msMap.get(c.id)
    return !(m?.m06_eng_session_shot === true) && !(m?.m06_declined === true)
  })
  const engPendingCount = engPendingCouples.length

  // Upcoming shoots (already filtered by query: engagement_shoot, scheduled, >= today)
  const upcomingShoots = engAppointments

  // Needs Follow-Up: pending couples with NO scheduled engagement/PLW appointment
  const scheduledCoupleIds = new Set(engAppointments.map(a => a.couple_id))
  const needsFollowUp = engPendingCouples
    .filter(c => !scheduledCoupleIds.has(c.id))
    .sort((a, b) => (a.wedding_date ?? '').localeCompare(b.wedding_date ?? ''))

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">SIGS Photography — {formatDate(today)}</p>
      </div>

      {/* Needs Attention — Wedding Passed, Still Booked */}
      {recentlyPast.length > 0 && (
        <div className="rounded-lg border-l-4 border-orange-500 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-orange-500 text-xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-800 text-sm uppercase tracking-wide">
                Needs Attention — Wedding Passed, Still "Booked"
              </h3>
              <p className="text-orange-700 text-xs mt-1">
                These couples had their wedding but status was not updated. Update each couple's status to "completed".
              </p>
              <div className="mt-3 space-y-2">
                {recentlyPast.map((couple) => {
                  const wDate = parseISO(couple.wedding_date!)
                  const dateStr = `${format(wDate, 'EEE').toUpperCase()} ${format(wDate, 'MMM d, yyyy')}`
                  return (
                    <div key={couple.id} className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-orange-200">
                      <div>
                        <span className="font-medium text-sm text-gray-900">{couple.couple_name}</span>
                        <span className="text-xs text-orange-600 ml-2">Wedding was {dateStr}</span>
                      </div>
                      <a href={`/admin/couples/${couple.id}`} className="text-xs font-medium text-orange-700 hover:underline">
                        Update →
                      </a>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {dashboardBoxes.map((box) => (
          <DashboardBoxCard key={box.key} box={box} onClick={() => setExpandedBox(box.key)} />
        ))}
      </div>

      {/* Engagement Pipeline */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📸</span>
          <h2 className="font-semibold text-gray-900">Engagement Pipeline</h2>
        </div>
        <div className="space-y-4">
          {/* Summary badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
              {engShotCount} Shot
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
              {engPendingCount} Pending
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
              {engDeclinedCount} Declined
            </span>
          </div>

          {/* Upcoming Shoots */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">Upcoming Shoots</h4>
            {upcomingShoots.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No shoots scheduled</p>
            ) : (
              <div className="space-y-1">
                {upcomingShoots.map(a => {
                  const d = parseISO(a.appointment_date)
                  const dow = format(d, 'EEE').toUpperCase()
                  const dateStr = format(d, 'MMM d')
                  const bride = (a.couples as any)?.bride_first_name || ''
                  const groom = (a.couples as any)?.groom_first_name || ''
                  const names = [bride, groom].filter(Boolean).join(' & ')
                  const time = a.start_time ? a.start_time.slice(0, 5) : ''
                  return (
                    <div key={a.id} className="flex items-center gap-2 text-sm py-1">
                      <span className="font-medium text-gray-700 w-28">{dow} {dateStr}</span>
                      <span className="text-gray-900">{names}</span>
                      {(a.location || time) && (
                        <span className="text-gray-400 text-xs">{[a.location, time].filter(Boolean).join(' · ')}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Needs Follow-Up */}
          {needsFollowUp.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">
                Needs Follow-Up ({needsFollowUp.length})
              </h4>
              <div className="space-y-0">
                {needsFollowUp.map(c => {
                  const wDate = c.wedding_date ? parseISO(c.wedding_date) : null
                  const dateStr = wDate ? `${format(wDate, 'EEE').toUpperCase()} ${format(wDate, 'MMM d, yyyy')}` : 'TBD'
                  const name = [c.bride_name, c.groom_name].filter(Boolean).join(' & ') || c.couple_name
                  return (
                    <div key={c.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                      <div>
                        <span className="font-medium text-gray-900">{name}</span>
                        <span className="text-xs text-gray-400 ml-2">{dateStr}</span>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {(c as any).email && <div>{(c as any).email}</div>}
                        <div>{(c as any).phone || '—'}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* The Week Ahead — 14-day calendar */}
      <WeekAhead />

      {/* Three-column layout: Upcoming | D3 Rings | Season Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Weddings */}
        <div className="rounded-xl border bg-card">
          <div className="p-5 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Upcoming Weddings
            </h2>
          </div>
          <div className="divide-y overflow-y-auto" style={{ maxHeight: '400px' }}>
            {upcoming.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">No upcoming weddings.</div>
            ) : (
              upcoming.map((couple) => {
                const wDate = parseISO(couple.wedding_date!)
                const daysUntil = differenceInDays(wDate, today)
                return (
                  <div key={couple.id} className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                    <div className="font-medium text-sm truncate">
                      {couple.couple_name} — {formatDateCompact(wDate).replace(/, \d{4}$/, '')}
                    </div>
                    <div className={`text-xs flex-shrink-0 ml-4 ${daysUntil <= 7 ? 'text-red-600 font-semibold' : daysUntil <= 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* D3 Radial Rings */}
        <div className="rounded-xl border bg-card">
          <div className="p-5 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              Season Progress
            </h2>
          </div>
          <div className="p-5 flex items-center justify-center">
            <RadialRings data={ringData} />
          </div>
          <div className="px-5 pb-4 flex justify-center gap-4">
            {[
              { year: 2025, color: 'bg-teal-500' },
              { year: 2026, color: 'bg-sky-500' },
              { year: 2027, color: 'bg-violet-500' },
            ].map(l => (
              <div key={l.year} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                <span className="text-xs text-muted-foreground">{l.year}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Season Overview — Segmented month bars (teal fill) */}
        <div className="rounded-xl border bg-card">
          <div className="p-5 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Camera className="h-4 w-4 text-purple-600" />
              {currentYear} Season Overview
            </h2>
          </div>
          <div className="p-5 space-y-2">
            {monthsData.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-8">{m.month}</span>
                <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                  {m.count > 0 && (
                    <div
                      className="h-full flex rounded-full overflow-hidden"
                      style={{ width: `${Math.max((m.count / maxMonthCount) * 100, 12)}%` }}
                    >
                      {m.segments.map((seg, idx) => (
                        <div
                          key={seg.id}
                          className={`h-full ${seg.completed ? 'bg-muted-foreground/30' : 'bg-teal-500'} ${idx < m.segments.length - 1 ? 'border-r border-background' : ''}`}
                          style={{ flex: 1 }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {m.count > 0 && (
                  <span className="text-[10px] text-muted-foreground w-4 text-right">{m.count}</span>
                )}
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span className="text-[10px] text-muted-foreground">Upcoming</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                <span className="text-[10px] text-muted-foreground">Completed</span>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* The Production Floor */}
      <ProductionFloor />

      {/* The Business */}
      <TheBusiness />

      {/* Year Cards — 2026, 2027, 2025 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {yearCards.map((card) => (
          <button
            key={card.year}
            onClick={() => setModalYear(card.year)}
            className="rounded-xl border bg-card p-5 text-left hover:border-primary hover:shadow-md transition-all cursor-pointer"
          >
            <div className="text-sm font-medium text-muted-foreground mb-1">{card.year}</div>
            <div className="text-2xl font-bold">{card.count} Weddings</div>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pb-4">
        {nextWedding && nextWeddingDate ? (
          <span>
            {remainingThisYear} weddings remaining in {currentYear} | Next: {nextWedding.couple_name} — {formatDateCompact(nextWeddingDate).replace(/, \d{4}$/, '')} ({daysUntilNext === 0 ? 'TODAY' : daysUntilNext === 1 ? '1 day' : `${daysUntilNext} days`})
          </span>
        ) : (
          <span>No upcoming weddings scheduled</span>
        )}
      </div>

      {/* Year Modal */}
      {modalYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModalYear(null)}>
          <div className="bg-card rounded-xl border shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="font-semibold text-lg">{modalYear} Weddings</h2>
              <button onClick={() => setModalYear(null)} className="rounded-lg p-1 hover:bg-accent transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="divide-y overflow-y-auto">
              {modalCouples.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">No booked weddings for {modalYear}.</div>
              ) : (
                modalCouples.map((couple) => {
                  const wDate = couple.wedding_date ? parseISO(couple.wedding_date) : null
                  const isPast = wDate ? wDate <= today : false
                  return (
                    <div key={couple.id} className="p-4 flex items-center justify-between">
                      <div className="font-medium text-sm truncate">{couple.couple_name}</div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <span className="text-sm text-muted-foreground">
                          {wDate ? formatDateCompact(wDate).replace(/, \d{4}$/, '') : 'TBD'}
                        </span>
                        <span className={`text-xs rounded-full px-2 py-0.5 ${isPast ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isPast ? 'Completed' : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Box Detail Modal */}
      {expandedBoxData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setExpandedBox(null)}>
          <div className="bg-card rounded-xl border shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className={`rounded-lg p-2 ${expandedBoxData.color}`}>
                  <expandedBoxData.icon className={`h-4 w-4 ${expandedBoxData.iconColor}`} />
                </div>
                <h2 className="font-semibold">{expandedBoxData.title}</h2>
              </div>
              <button onClick={() => setExpandedBox(null)} className="rounded-lg p-1 hover:bg-accent transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="divide-y overflow-y-auto">
              {expandedBoxData.details.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">None right now.</div>
              ) : (
                expandedBoxData.details.map((d, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div className="font-medium text-sm">{d.label}</div>
                    {d.sub && <span className="text-xs text-muted-foreground flex-shrink-0 ml-4">{d.sub}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
