'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronDown } from 'lucide-react'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] })

const GOLD = '#C4A265'
const GOLD_LIGHT = '#D4B87A'
const CHARCOAL = '#1E2330'
const DARK_CARD = '#252A38'
const DARK_BORDER = '#333847'
const SUCCESS = '#34D399'
const WARNING = '#FBBF24'
const DANGER = '#F87171'
const MUTED = '#8B8FA3'
const BG = '#F8F7F4'
const WHITE = '#FFFFFF'

interface Season {
  id: string
  season_name: string
  period: string
  year: number
  season: string
  appts: number
  booked: number
  failed: number
  pending: number
  new_cust_revenue: string
  frame_revenue: string
  total_show_cost: string | null
  cost_per_lead: string | null
  cost_per_sale: string | null
  conversion_rate: string | null
  goal_bookings: number | null
  notes: string | null
}

interface ShowResult {
  id: string
  season_id: string
  show_name: string
  show_code: string
  appts: number
  booked: number
  failed: number
  pending: number
  show_cost: string
  cost_per_lead: string | null
  cost_per_sale: string | null
}

function fmt(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '—'
  return num % 1 === 0
    ? `$${num.toLocaleString('en-CA')}`
    : `$${num.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function convColor(rate: number | null, thresholds: { green: number; yellow: number }): string {
  if (rate === null) return MUTED
  if (rate >= thresholds.green) return SUCCESS
  if (rate >= thresholds.yellow) return WARNING
  return DANGER
}

function costColor(cost: number | null): string {
  if (cost === null) return MUTED
  if (cost < 300) return SUCCESS
  if (cost <= 500) return WARNING
  return DANGER
}

export default function BookingPipelineDashboard() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [showResults, setShowResults] = useState<ShowResult[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [seasonsRes, showsRes] = await Promise.all([
        supabase
          .from('bridal_show_seasons')
          .select('*')
          .order('year', { ascending: false }),
        supabase
          .from('bridal_show_results')
          .select('*')
          .order('show_name'),
      ])

      const sortedSeasons = (seasonsRes.data ?? []).sort((a: Season, b: Season) => {
        if (b.year !== a.year) return b.year - a.year
        const order: Record<string, number> = { winter: 0, fall: 1 }
        return (order[a.season] ?? 2) - (order[b.season] ?? 2)
      })

      setSeasons(sortedSeasons)
      setShowResults(showsRes.data ?? [])
      if (sortedSeasons.length > 0) setSelectedSeasonId(sortedSeasons[0].id)
      setLoading(false)
    }
    fetchData()
  }, [])

  const selected = useMemo(() => seasons.find((s) => s.id === selectedSeasonId) ?? null, [seasons, selectedSeasonId])
  const seasonShows = useMemo(
    () => (showResults.filter((r) => r.season_id === selectedSeasonId) ?? [])
      .filter((r) => r.appts > 0)
      .sort((a, b) => {
        const rateA = a.appts > 0 ? (a.booked / a.appts) * 100 : 0
        const rateB = b.appts > 0 ? (b.booked / b.appts) * 100 : 0
        return rateB - rateA
      }),
    [showResults, selectedSeasonId]
  )

  // Chart data for season comparison
  const chartData = useMemo(() => {
    return [...seasons].reverse().map((s) => ({
      name: s.season_name.replace(' 20', ' \u2019'),
      leads: s.appts,
      booked: s.booked,
      revenue: Math.round(parseFloat(s.new_cust_revenue) / 1000),
      convRate: s.conversion_rate ? parseFloat(s.conversion_rate) : 0,
    }))
  }, [seasons])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: BG }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${GOLD} transparent ${GOLD} ${GOLD}` }} />
      </div>
    )
  }

  if (!selected) return null

  const showedUp = selected.appts - selected.pending
  const convRate = selected.conversion_rate ? parseFloat(selected.conversion_rate) : null

  return (
    <div className={dmSans.className} style={{ backgroundColor: BG, minHeight: '100vh', color: '#1A1A1A' }}>
      {/* Header */}
      <div style={{ padding: '32px 40px 24px' }}>
        <div className="flex items-start justify-between">
          <div>
            <h1
              className={playfair.className}
              style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}
            >
              Booking Pipeline
            </h1>
            <p style={{ fontSize: 14, color: MUTED, letterSpacing: '0.01em' }}>
              Lead Generation &rarr; Consultation &rarr; Contract
            </p>
          </div>
          <div className="relative">
            <select
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              className="appearance-none rounded-xl px-5 py-2.5 pr-10 text-sm font-medium outline-none cursor-pointer"
              style={{
                backgroundColor: CHARCOAL,
                color: WHITE,
                border: `1px solid ${DARK_BORDER}`,
                minWidth: 180,
              }}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.season_name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: GOLD }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '0 40px 40px' }}>
        {/* Section 1: Scorecard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Leads */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: CHARCOAL, color: WHITE }}>
            <p className="text-xs uppercase tracking-wider mb-3 font-medium" style={{ color: MUTED, letterSpacing: '0.12em' }}>Total Leads</p>
            <p style={{ fontSize: 42, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>{selected.appts}</p>
            <p className="mt-2 text-xs" style={{ color: MUTED }}>{selected.period}</p>
          </div>

          {/* Deals Closed */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: CHARCOAL, color: WHITE }}>
            <p className="text-xs uppercase tracking-wider mb-3 font-medium" style={{ color: MUTED, letterSpacing: '0.12em' }}>Deals Closed</p>
            <p style={{ fontSize: 42, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>{selected.booked}</p>
            {selected.goal_bookings && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: MUTED }}>{selected.booked} of {selected.goal_bookings} goal</span>
                  <span className="text-xs font-semibold" style={{ color: GOLD }}>{Math.round((selected.booked / selected.goal_bookings) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: DARK_BORDER }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (selected.booked / selected.goal_bookings) * 100)}%`,
                      backgroundColor: GOLD,
                    }}
                  />
                </div>
              </div>
            )}
            {!selected.goal_bookings && <p className="mt-2 text-xs" style={{ color: MUTED }}>{selected.period}</p>}
          </div>

          {/* Revenue */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: CHARCOAL, color: WHITE }}>
            <p className="text-xs uppercase tracking-wider mb-3 font-medium" style={{ color: MUTED, letterSpacing: '0.12em' }}>Revenue</p>
            <p style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: GOLD }}>
              {fmt(selected.new_cust_revenue)}
            </p>
            {selected.frame_revenue && parseFloat(selected.frame_revenue) > 0 && (
              <p className="mt-2 text-xs" style={{ color: MUTED }}>+ {fmt(selected.frame_revenue)} frame revenue</p>
            )}
          </div>

          {/* Conversion Rate */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: CHARCOAL, color: WHITE }}>
            <p className="text-xs uppercase tracking-wider mb-3 font-medium" style={{ color: MUTED, letterSpacing: '0.12em' }}>Conversion Rate</p>
            <p style={{ fontSize: 42, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: convColor(convRate, { green: 50, yellow: 30 }) }}>
              {convRate !== null ? `${convRate.toFixed(1)}%` : '—'}
            </p>
            {selected.total_show_cost && (
              <p className="mt-2 text-xs" style={{ color: MUTED }}>
                {fmt(selected.cost_per_sale)} per sale
              </p>
            )}
          </div>
        </div>

        {/* Section 2: Funnel */}
        <div className="rounded-2xl p-8 mb-8" style={{ backgroundColor: WHITE, border: '1px solid #E8E5DF' }}>
          <h2 className="text-sm uppercase tracking-wider font-semibold mb-6" style={{ color: MUTED, letterSpacing: '0.1em' }}>
            Pipeline Funnel
          </h2>
          <FunnelChart
            leads={selected.appts}
            showedUp={showedUp}
            booked={selected.booked}
            failed={selected.failed}
            pending={selected.pending}
          />
        </div>

        {/* Section 3: Source Effectiveness */}
        {seasonShows.length > 0 && (
          <div className="rounded-2xl overflow-hidden mb-8" style={{ backgroundColor: WHITE, border: '1px solid #E8E5DF' }}>
            <div className="px-8 py-6">
              <h2 className="text-sm uppercase tracking-wider font-semibold" style={{ color: MUTED, letterSpacing: '0.1em' }}>
                Source Effectiveness
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderTop: '1px solid #E8E5DF', borderBottom: '1px solid #E8E5DF' }}>
                    {['Show', 'Leads', 'Booked', 'Failed', 'Pending', 'Conv %', 'Cost', 'Cost/Lead', 'Cost/Sale'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs uppercase tracking-wider font-semibold"
                        style={{ color: MUTED, letterSpacing: '0.08em', textAlign: h === 'Show' ? 'left' : 'right' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seasonShows.map((show) => {
                    const rate = show.appts > 0 ? (show.booked / show.appts) * 100 : null
                    const cps = show.cost_per_sale ? parseFloat(show.cost_per_sale) : null
                    return (
                      <tr key={show.id} style={{ borderBottom: '1px solid #F3F1EC' }}>
                        <td className="px-4 py-3.5">
                          <div>
                            <span className="text-sm font-medium">{show.show_code}</span>
                            <span className="text-xs ml-2" style={{ color: MUTED }}>{show.show_name.replace(/ (Winter|Fall|Spring|Summer) \d{4}$/, '')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm tabular-nums" style={{ textAlign: 'right' }}>{show.appts}</td>
                        <td className="px-4 py-3.5 text-sm font-semibold tabular-nums" style={{ textAlign: 'right', color: show.booked > 0 ? SUCCESS : MUTED }}>{show.booked}</td>
                        <td className="px-4 py-3.5 text-sm tabular-nums" style={{ textAlign: 'right', color: show.failed > 0 ? DANGER : MUTED }}>{show.failed}</td>
                        <td className="px-4 py-3.5 text-sm tabular-nums" style={{ textAlign: 'right', color: show.pending > 0 ? WARNING : MUTED }}>{show.pending}</td>
                        <td className="px-4 py-3.5 text-sm font-semibold tabular-nums" style={{ textAlign: 'right', color: convColor(rate, { green: 60, yellow: 40 }) }}>
                          {rate !== null ? `${rate.toFixed(0)}%` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-sm tabular-nums" style={{ textAlign: 'right' }}>{fmt(show.show_cost)}</td>
                        <td className="px-4 py-3.5 text-sm tabular-nums" style={{ textAlign: 'right' }}>{show.cost_per_lead ? fmt(show.cost_per_lead) : '—'}</td>
                        <td className="px-4 py-3.5 text-sm font-semibold tabular-nums" style={{ textAlign: 'right', color: costColor(cps) }}>
                          {cps !== null ? fmt(cps) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {/* Totals row */}
                  <tr style={{ backgroundColor: '#FAFAF5', borderTop: '2px solid #E8E5DF' }}>
                    <td className="px-4 py-3.5 text-sm font-bold">TOTAL</td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums" style={{ textAlign: 'right' }}>{seasonShows.reduce((s, r) => s + r.appts, 0)}</td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums" style={{ textAlign: 'right' }}>{seasonShows.reduce((s, r) => s + r.booked, 0)}</td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums" style={{ textAlign: 'right' }}>{seasonShows.reduce((s, r) => s + r.failed, 0)}</td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums" style={{ textAlign: 'right' }}>{seasonShows.reduce((s, r) => s + r.pending, 0)}</td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums" style={{ textAlign: 'right', color: convColor(convRate, { green: 60, yellow: 40 }) }}>
                      {convRate !== null ? `${convRate.toFixed(0)}%` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums" style={{ textAlign: 'right' }}>{fmt(selected.total_show_cost)}</td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums" style={{ textAlign: 'right' }}>{fmt(selected.cost_per_lead)}</td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums" style={{ textAlign: 'right' }}>{fmt(selected.cost_per_sale)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 4: Season Comparison Chart */}
        <div className="rounded-2xl p-8" style={{ backgroundColor: WHITE, border: '1px solid #E8E5DF' }}>
          <h2 className="text-sm uppercase tracking-wider font-semibold mb-6" style={{ color: MUTED, letterSpacing: '0.1em' }}>
            Season over Season
          </h2>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DF" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: MUTED }}
                  axisLine={{ stroke: '#E8E5DF' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12, fill: MUTED }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12, fill: MUTED }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: CHARCOAL,
                    border: 'none',
                    borderRadius: 12,
                    color: WHITE,
                    fontSize: 13,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  }}
                  formatter={(value: any, name: any) => {
                    if (name === 'Revenue (K)') return [`$${value}K`, name]
                    if (name === 'Conv %') return [`${value}%`, name]
                    return [value, name]
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                />
                <Bar yAxisId="left" dataKey="leads" name="Leads" fill={MUTED} radius={[4, 4, 0, 0]} barSize={28} />
                <Bar yAxisId="left" dataKey="booked" name="Booked" fill={GOLD} radius={[4, 4, 0, 0]} barSize={28} />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue (K)" fill="#4A5568" radius={[4, 4, 0, 0]} barSize={28} />
                <Line yAxisId="right" type="monotone" dataKey="convRate" name="Conv %" stroke={SUCCESS} strokeWidth={2.5} dot={{ r: 4, fill: SUCCESS, strokeWidth: 0 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Notes */}
        {selected.notes && (
          <div className="mt-6 rounded-xl px-6 py-4" style={{ backgroundColor: '#FDF8EE', border: `1px solid ${GOLD}30` }}>
            <p className="text-sm" style={{ color: '#8B7340' }}>
              <span className="font-semibold">Note:</span> {selected.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Funnel Component ── */

function FunnelChart({ leads, showedUp, booked, failed, pending }: {
  leads: number
  showedUp: number
  booked: number
  failed: number
  pending: number
}) {
  const maxVal = Math.max(leads, 1)
  const stages = [
    { label: 'Leads', value: leads, color: MUTED, pct: null as string | null },
    { label: 'Showed Up', value: showedUp, color: '#6B7280', pct: leads > 0 ? `${Math.round((showedUp / leads) * 100)}%` : null },
    { label: 'Booked', value: booked, color: SUCCESS, pct: showedUp > 0 ? `${Math.round((booked / showedUp) * 100)}%` : null },
    { label: 'Failed', value: failed, color: DANGER, pct: showedUp > 0 ? `${Math.round((failed / showedUp) * 100)}%` : null },
    { label: 'Pending', value: pending, color: WARNING, pct: leads > 0 ? `${Math.round((pending / leads) * 100)}%` : null },
  ]

  return (
    <div className="space-y-4">
      {stages.map((stage, i) => (
        <div key={stage.label} className="flex items-center gap-4">
          <div style={{ width: 90, textAlign: 'right' }}>
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: MUTED, letterSpacing: '0.08em' }}>{stage.label}</p>
          </div>
          <div className="flex-1 relative">
            <div className="h-10 rounded-lg overflow-hidden" style={{ backgroundColor: '#F3F1EC' }}>
              <div
                className="h-full rounded-lg transition-all duration-700 ease-out flex items-center"
                style={{
                  width: `${Math.max(2, (stage.value / maxVal) * 100)}%`,
                  backgroundColor: stage.color,
                  minWidth: stage.value > 0 ? 40 : 0,
                }}
              >
                <span className="text-sm font-bold px-3" style={{ color: WHITE }}>{stage.value}</span>
              </div>
            </div>
          </div>
          <div style={{ width: 48, textAlign: 'right' }}>
            {stage.pct && (
              <span className="text-xs font-semibold" style={{ color: stage.color }}>{stage.pct}</span>
            )}
          </div>
        </div>
      ))}
      {/* Drop-off annotations */}
      <div className="flex items-center gap-6 mt-4 pt-4" style={{ borderTop: '1px solid #F3F1EC' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6B7280' }} />
          <span className="text-xs" style={{ color: MUTED }}>
            {leads > 0 ? Math.round(((leads - showedUp) / leads) * 100) : 0}% no-show rate
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SUCCESS }} />
          <span className="text-xs" style={{ color: MUTED }}>
            {showedUp > 0 ? Math.round((booked / showedUp) * 100) : 0}% close rate (of showed)
          </span>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: WARNING }} />
            <span className="text-xs" style={{ color: MUTED }}>
              {pending} still deciding
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
