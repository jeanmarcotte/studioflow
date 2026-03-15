'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Camera, Clock, X } from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'

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

    return { year, count: yearCouples.length, sub }
  })

  const thisYearCouples = couples.filter(c => c.wedding_year === currentYear)

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

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Season Overview */}
        <div className="rounded-xl border bg-card">
          <div className="p-5 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Camera className="h-4 w-4 text-purple-600" />
              {currentYear} Season Overview
            </h2>
          </div>
          <div className="p-5 space-y-4">
            {(() => {
              const months = Array.from({ length: 12 }, (_, i) => {
                const monthCouples = thisYearCouples.filter(c => {
                  if (!c.wedding_date) return false
                  return parseISO(c.wedding_date).getMonth() === i
                })
                return { month: format(new Date(currentYear, i, 1), 'MMM'), count: monthCouples.length }
              })
              const maxCount = Math.max(...months.map(m => m.count), 1)

              return (
                <div className="space-y-2">
                  {months.map((m) => (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-8">{m.month}</span>
                      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                        {m.count > 0 && (
                          <div
                            className="h-full bg-primary rounded-full flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${Math.max((m.count / maxCount) * 100, 12)}%` }}
                          >
                            <span className="text-[10px] font-bold text-primary-foreground">{m.count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
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

      {/* All Couples Count */}
      <div className="text-center text-sm text-muted-foreground pb-4">
        {couples.length} total couples in database
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
