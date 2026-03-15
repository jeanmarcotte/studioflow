'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Camera, Clock, X } from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'
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
      { ...data[0], radius: center - 20 },                          // 2025 outer
      { ...data[1], radius: center - 20 - ringWidth - gap },        // 2026 middle
      { ...data[2], radius: center - 20 - (ringWidth + gap) * 2 },  // 2027 inner
    ]

    const colors = ['#14b8a6', '#0ea5e9', '#8b5cf6']

    rings.forEach((ring, i) => {
      const pct = ring.total > 0 ? ring.completed / ring.total : 0

      // Background track
      g.append('circle')
        .attr('r', ring.radius)
        .attr('fill', 'none')
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', ringWidth)

      // Completed arc
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

      // Year label
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

    // Center text
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

export default function AdminDashboardPage() {
  const [couples, setCouples] = useState<Couple[]>([])
  const [loading, setLoading] = useState(true)
  const [modalYear, setModalYear] = useState<number | null>(null)

  useEffect(() => {
    const fetchCouples = async () => {
      const { data, error } = await supabase
        .from('couples')
        .select('*')
        .order('wedding_date', { ascending: true })

      if (!error && data) {
        setCouples(data)
      }
      setLoading(false)
    }
    fetchCouples()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const today = new Date()
  const currentYear = today.getFullYear()

  // Year card data
  const yearCards = [2025, 2026, 2027].map(year => {
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

    return { year, count: yearCouples.length, completedCount, sub }
  })

  // D3 ring data
  const ringData: YearRingData[] = yearCards.map(c => ({
    year: c.year,
    total: c.count,
    completed: c.completedCount,
  }))

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
      const wDate = parseISO(c.wedding_date)
      return differenceInDays(wDate, today) >= 0
    })
    .sort((a, b) => a.wedding_date!.localeCompare(b.wedding_date!))

  // Recent weddings (past 30 days, not yet completed status)
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

  // Footer: next upcoming wedding
  const nextWedding = upcoming[0] || null
  const nextWeddingDate = nextWedding?.wedding_date ? parseISO(nextWedding.wedding_date) : null
  const daysUntilNext = nextWeddingDate ? differenceInDays(nextWeddingDate, today) : null

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">SIGS Photography — {format(today, 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Year Cards */}
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
                      {couple.couple_name} — {format(wDate, 'MMM d')}
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

        {/* Season Overview — Segmented month bars */}
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
                          className={`h-full ${seg.completed ? 'bg-muted-foreground/30' : 'bg-primary'} ${idx < m.segments.length - 1 ? 'border-r border-background' : ''}`}
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
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
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
                    Wedding was {format(parseISO(couple.wedding_date!), 'MMM d, yyyy')}
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

      {/* Footer — Next wedding countdown */}
      <div className="text-center text-sm text-muted-foreground pb-4 space-y-0.5">
        {nextWedding && nextWeddingDate ? (
          <>
            <div>Next: {nextWedding.couple_name} — {format(nextWeddingDate, 'MMM d')}</div>
            <div className="text-xs">
              {daysUntilNext === 0
                ? 'Wedding is TODAY'
                : daysUntilNext === 1
                ? '1 day until next wedding'
                : `${daysUntilNext} days until next wedding`}
            </div>
          </>
        ) : (
          <div>No upcoming weddings scheduled</div>
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
                          {wDate ? format(wDate, 'MMM d') : 'TBD'}
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
    </div>
  )
}
