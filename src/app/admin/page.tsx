'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Camera, Clock, X, Video, ClipboardList, DollarSign, BookOpen, Pencil } from 'lucide-react'
import { format, differenceInDays, parseISO, addDays } from 'date-fns'
import { formatWeddingDate, formatDateCompact, formatDate, formatCurrency } from '@/lib/formatters'
import * as d3 from 'd3'

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
  const [loading, setLoading] = useState(true)
  const [modalYear, setModalYear] = useState<number | null>(null)
  const [expandedBox, setExpandedBox] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      const [couplesRes, photoRes, videoRes, installRes, editingRes] = await Promise.all([
        supabase.from('couples').select('*').order('wedding_date', { ascending: true }),
        supabase.from('editing_queue').select('id, couple_id, status, couples(couple_name)'),
        supabase.from('video_jobs').select('id, couple_id, status, couples(couple_name, wedding_date)'),
        supabase.from('contract_installments').select('id, contract_id, installment_number, due_description, amount, due_date, paid, contracts(couples(couple_name))'),
        supabase.from('jobs').select('id, couple_id, job_type, category, description, vendor, status, photos_taken, edited_so_far, couples(couple_name, wedding_date)'),
      ])

      if (couplesRes.data) setCouples(couplesRes.data)
      if (photoRes.data) setPhotoJobs(photoRes.data as unknown as PhotoJobRow[])
      if (videoRes.data) setVideoJobs(videoRes.data as unknown as VideoJobRow[])
      if (installRes.data) setInstallments(installRes.data as unknown as InstallmentRow[])
      if (editingRes.data) setEditingJobs(editingRes.data as unknown as EditingJobRow[])
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
    return c.form_submitted === false && c.wedding_date >= todayStr && c.wedding_date <= in60days
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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">SIGS Photography — {formatDate(today)}</p>
      </div>

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

      {/* Dashboard Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {dashboardBoxes.map((box) => (
          <DashboardBoxCard key={box.key} box={box} onClick={() => setExpandedBox(box.key)} />
        ))}
      </div>

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

      {/* Needs Attention */}
      {recentlyPast.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50">
          <div className="p-5 border-b border-amber-200">
            <h2 className="font-semibold flex items-center gap-2 text-amber-800">
              <Clock className="h-4 w-4" />
              Needs Attention — Wedding Passed, Still &quot;Booked&quot;
            </h2>
          </div>
          <div className="divide-y divide-amber-200">
            {recentlyPast.map((couple) => (
              <div key={couple.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{couple.couple_name}</div>
                  <div className="text-xs text-amber-700">
                    Wedding was {formatDateCompact(couple.wedding_date!)}
                  </div>
                </div>
                <span className="text-xs bg-amber-200 text-amber-800 rounded-full px-2 py-0.5">
                  Needs update
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
