'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Calendar, Camera, DollarSign, Clock, Heart } from 'lucide-react'
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

  // Stats
  const thisYearCouples = couples.filter(c => c.wedding_year === currentYear)
  const bookedThisYear = thisYearCouples.filter(c => c.status === 'booked')
  const completedThisYear = thisYearCouples.filter(c => c.status === 'completed')
  const nextYearCouples = couples.filter(c => c.wedding_year === currentYear + 1)

  // Upcoming weddings (next 90 days)
  const upcoming = couples
    .filter(c => {
      if (!c.wedding_date || c.status === 'completed') return false
      const wDate = parseISO(c.wedding_date)
      const daysUntil = differenceInDays(wDate, today)
      return daysUntil >= 0 && daysUntil <= 90
    })
    .sort((a, b) => a.wedding_date!.localeCompare(b.wedding_date!))

  // Revenue
  const totalContracted = thisYearCouples.reduce((sum, c) => sum + (Number(c.contract_total) || 0), 0)
  const totalPaid = thisYearCouples.reduce((sum, c) => sum + (Number(c.total_paid) || 0), 0)
  const totalOwing = thisYearCouples.reduce((sum, c) => sum + (Number(c.balance_owing) || 0), 0)

  // Recent weddings (past 30 days, not yet completed status)
  const recentlyPast = couples
    .filter(c => {
      if (!c.wedding_date) return false
      const wDate = parseISO(c.wedding_date)
      const daysSince = differenceInDays(today, wDate)
      return daysSince >= 0 && daysSince <= 30 && c.status === 'booked'
    })
    .sort((a, b) => b.wedding_date!.localeCompare(a.wedding_date!))

  const statCards = [
    {
      label: `${currentYear} Weddings`,
      value: thisYearCouples.length,
      sub: `${bookedThisYear.length} booked, ${completedThisYear.length} done`,
      icon: Calendar,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: `${currentYear + 1} Booked`,
      value: nextYearCouples.length,
      sub: 'weddings ahead',
      icon: Heart,
      color: 'text-pink-600 bg-pink-50',
    },
    {
      label: 'Upcoming (90 days)',
      value: upcoming.length,
      sub: upcoming[0] ? `Next: ${upcoming[0].couple_name}` : 'None scheduled',
      icon: Clock,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: `${currentYear} Revenue`,
      value: totalContracted > 0 ? `$${(totalContracted / 1000).toFixed(0)}k` : '$0',
      sub: totalOwing > 0 ? `$${totalOwing.toLocaleString()} outstanding` : 'All collected',
      icon: DollarSign,
      color: 'text-green-600 bg-green-50',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">SIGS Photography — {format(today, 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
              <div className={`rounded-lg p-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
          </div>
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
          <div className="divide-y">
            {upcoming.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">No weddings in the next 90 days.</div>
            ) : (
              upcoming.slice(0, 8).map((couple) => {
                const wDate = parseISO(couple.wedding_date!)
                const daysUntil = differenceInDays(wDate, today)
                return (
                  <div key={couple.id} className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{couple.couple_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {couple.ceremony_venue || 'Venue TBD'}
                        {couple.photographer && ` — ${couple.photographer}`}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-sm font-medium">{format(wDate, 'MMM d')}</div>
                      <div className={`text-xs ${daysUntil <= 7 ? 'text-red-600 font-semibold' : daysUntil <= 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                      </div>
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
            {/* Month breakdown */}
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
    </div>
  )
}
