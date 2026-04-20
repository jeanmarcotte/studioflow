'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/formatters'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, Star } from 'lucide-react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface SalesMeeting {
  id: number
  bride_name: string
  groom_name: string | null
  appt_date: string | null
  wedding_date: string | null
  quoted_amount: number | null
  status: string | null
  lead_source: string | null
}

interface ExtrasOrder {
  id: number
  couple_id: string
  order_date: string | null
  extras_sale_amount: number | null
  status: string | null
  couple_name?: string
  bride_first_name?: string | null
  groom_first_name?: string | null
  wedding_date?: string | null
}

interface ClientExtra {
  id: number
  couple_id: string
  item_type: string | null
  total: number | null
  invoice_date: string | null
  status: string | null
}

function getDaysPending(dateStr: string | null): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function daysBadgeClass(days: number): string {
  if (days >= 15) return 'bg-red-100 text-red-700 font-semibold'
  if (days >= 8) return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

function getYear(dateStr: string | null): number | null {
  if (!dateStr) return null
  return new Date(dateStr).getFullYear()
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const ITEM_TYPE_COLORS: Record<string, string> = {
  'Raw Video': '#f59e0b',
  'Print': '#3b82f6',
  'Hi Res Files': '#10b981',
  'Hours': '#8b5cf6',
  'Parent Album': '#ec4899',
  'Additional Person': '#6366f1',
}

export default function SalesReportPage() {
  const [meetings, setMeetings] = useState<SalesMeeting[]>([])
  const [extras, setExtras] = useState<ExtrasOrder[]>([])
  const [clientExtras, setClientExtras] = useState<ClientExtra[]>([])
  const [loading, setLoading] = useState(true)
  const [showCosts, setShowCosts] = useState<Record<string, number>>({})

  // Load show costs from localStorage
  useEffect(() => {
    const stored: Record<string, number> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('sigs_show_cost_')) {
        stored[key.replace('sigs_show_cost_', '')] = Number(localStorage.getItem(key)) || 0
      }
    }
    setShowCosts(stored)
  }, [])

  useEffect(() => {
    async function fetchData() {
      const [meetingsRes, extrasRes, clientExtrasRes] = await Promise.all([
        supabase.from('sales_meetings').select('id, bride_name, groom_name, appt_date, wedding_date, quoted_amount, status, lead_source').order('appt_date', { ascending: false }),
        supabase.from('extras_orders').select('id, couple_id, order_date, extras_sale_amount, status, couples(couple_name, bride_first_name, groom_first_name, wedding_date)').order('order_date', { ascending: false }),
        supabase.from('client_extras').select('id, couple_id, item_type, total, invoice_date, status').not('invoice_date', 'is', null).order('invoice_date', { ascending: false }),
      ])

      setMeetings(meetingsRes.data || [])
      setExtras((extrasRes.data || []).map((o: any) => ({
        ...o,
        couple_name: o.couples?.couple_name || 'Unknown',
        bride_first_name: o.couples?.bride_first_name || null,
        groom_first_name: o.couples?.groom_first_name || null,
        wedding_date: o.couples?.wedding_date || null,
      })))
      setClientExtras(clientExtrasRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  // ── DERIVED DATA ──

  const now = new Date()
  const timestamp = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' at ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  // C1 current year
  const currentYear = now.getFullYear()
  const c1CurrentYear = useMemo(() => meetings.filter(m => getYear(m.appt_date) === currentYear), [meetings, currentYear])
  const c1Booked = useMemo(() => c1CurrentYear.filter(m => m.status === 'Booked'), [c1CurrentYear])
  const c1Failed = useMemo(() => c1CurrentYear.filter(m => m.status === 'Failed'), [c1CurrentYear])
  const c1Pending = useMemo(() => meetings.filter(m => m.status === 'Pending'), [meetings])
  const c1RevenueBooked = useMemo(() => c1Booked.reduce((s, m) => s + (Number(m.quoted_amount) || 0), 0), [c1Booked])
  const c1Conversion = c1Booked.length + c1Failed.length > 0 ? Math.round((c1Booked.length / (c1Booked.length + c1Failed.length)) * 100) : 0
  const c1AvgDeal = c1Booked.length > 0 ? Math.round(c1RevenueBooked / c1Booked.length) : 0

  // C2 pending
  const c2Pending = useMemo(() => extras.filter(o => o.status === 'pending'), [extras])
  const c2Declined = useMemo(() => extras.filter(o => o.status === 'declined').sort((a, b) => {
    if (!a.wedding_date) return 1
    if (!b.wedding_date) return -1
    return new Date(a.wedding_date).getTime() - new Date(b.wedding_date).getTime()
  }), [extras])

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const months: { month: string; meetings: number; booked: number }[] = []
    for (let i = 0; i < 12; i++) {
      const m = c1CurrentYear.filter(mtg => {
        const d = mtg.appt_date ? new Date(mtg.appt_date).getMonth() : -1
        return d === i
      })
      if (m.length > 0 || i <= now.getMonth()) {
        months.push({
          month: MONTH_NAMES[i],
          meetings: m.length,
          booked: m.filter(mtg => mtg.status === 'Booked').length,
        })
      }
    }
    return months
  }, [c1CurrentYear, now])

  // Lead source data
  const leadSourceData = useMemo(() => {
    const sources = new Map<string, { appts: number; booked: number; failed: number; revenue: number }>()
    c1CurrentYear.forEach(m => {
      const src = m.lead_source || 'Unknown'
      const cur = sources.get(src) || { appts: 0, booked: 0, failed: 0, revenue: 0 }
      cur.appts++
      if (m.status === 'Booked') { cur.booked++; cur.revenue += Number(m.quoted_amount) || 0 }
      if (m.status === 'Failed') cur.failed++
      sources.set(src, cur)
    })
    return Array.from(sources.entries())
      .map(([name, data]) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), ...data }))
      .sort((a, b) => b.booked - a.booked)
  }, [c1CurrentYear])

  const leadTotals = useMemo(() => leadSourceData.reduce((t, r) => ({
    appts: t.appts + r.appts, booked: t.booked + r.booked, failed: t.failed + r.failed, revenue: t.revenue + r.revenue,
  }), { appts: 0, booked: 0, failed: 0, revenue: 0 }), [leadSourceData])

  // C2 year-over-year
  const c2ByYear = useMemo(() => {
    const excludeStatuses = ['declined', 'no_sale']
    const years = new Map<number, { couples: Set<string>; revenue: number; signed: number }>()
    extras.forEach(o => {
      const yr = getYear(o.order_date)
      if (!yr) return
      if (excludeStatuses.includes(o.status || '')) return
      const cur = years.get(yr) || { couples: new Set<string>(), revenue: 0, signed: 0 }
      cur.couples.add(o.couple_id)
      cur.revenue += Number(o.extras_sale_amount) || 0
      if (o.status === 'signed') cur.signed++
      years.set(yr, cur)
    })
    return Array.from(years.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, data]) => ({ year, couples: data.couples.size, revenue: data.revenue, signed: data.signed }))
  }, [extras])

  // C3 year-over-year by item type
  const c3ByYear = useMemo(() => {
    const years = new Map<number, Map<string, number>>()
    const allTypes = new Set<string>()
    clientExtras.forEach(e => {
      const yr = getYear(e.invoice_date)
      if (!yr) return
      const type = e.item_type || 'Other'
      allTypes.add(type)
      const yearMap = years.get(yr) || new Map<string, number>()
      yearMap.set(type, (yearMap.get(type) || 0) + (Number(e.total) || 0))
      years.set(yr, yearMap)
    })
    return {
      data: Array.from(years.entries())
        .sort(([a], [b]) => a - b)
        .map(([year, typeMap]) => {
          const row: any = { year: String(year) }
          allTypes.forEach(t => { row[t] = typeMap.get(t) || 0 })
          return row
        }),
      types: Array.from(allTypes),
    }
  }, [clientExtras])

  // C3 growth story
  const c3Growth = useMemo(() => {
    const byYear = new Map<number, { revenue: number; couples: Set<string> }>()
    clientExtras.forEach(e => {
      const yr = getYear(e.invoice_date)
      if (!yr) return
      const cur = byYear.get(yr) || { revenue: 0, couples: new Set<string>() }
      cur.revenue += Number(e.total) || 0
      cur.couples.add(e.couple_id)
      byYear.set(yr, cur)
    })
    const prev = byYear.get(currentYear - 1)
    const curr = byYear.get(currentYear)
    return {
      prevRevenue: prev?.revenue || 0,
      prevCouples: prev?.couples.size || 0,
      currRevenue: curr?.revenue || 0,
      currCouples: curr?.couples.size || 0,
      multiplier: prev?.revenue && prev.revenue > 0 ? Math.round((curr?.revenue || 0) / prev.revenue) : 0,
    }
  }, [clientExtras, currentYear])

  // C3 item type breakdown (current year)
  const c3ItemBreakdown = useMemo(() => {
    const items = new Map<string, { count: number; revenue: number }>()
    clientExtras.filter(e => getYear(e.invoice_date) === currentYear).forEach(e => {
      const type = e.item_type || 'Other'
      const cur = items.get(type) || { count: 0, revenue: 0 }
      cur.count++
      cur.revenue += Number(e.total) || 0
      items.set(type, cur)
    })
    return Array.from(items.entries())
      .map(([type, data]) => ({ type, ...data, avg: data.count > 0 ? Math.round(data.revenue / data.count) : 0 }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [clientExtras, currentYear])

  const updateShowCost = (slug: string, value: number) => {
    localStorage.setItem(`sigs_show_cost_${slug}`, String(value))
    setShowCosts(prev => ({ ...prev, [slug]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const bestSourceIdx = leadSourceData.length > 0 ? leadSourceData.reduce((best, r, i) => r.revenue > leadSourceData[best].revenue ? i : best, 0) : -1

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* SECTION 0 — HEADER */}
      <div>
        <Link href="/admin/sales/quotes" className="text-teal-600 hover:underline text-sm flex items-center gap-1 mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Quotes
        </Link>
        <h1 className="text-2xl font-bold">Sales Report</h1>
        <p className="text-sm text-muted-foreground">As of {timestamp}</p>
      </div>

      {/* SECTION 1 — PENDING DEALS */}
      {(c1Pending.length > 0 || c2Pending.length > 0) && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Pending Deals</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {c1Pending.length > 0 && (
              <motion.div
                animate={{ scale: [1, 1.015, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="border-2 border-amber-400 bg-amber-50 rounded-xl p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <h3 className="font-bold text-amber-900">C1 — Pending Quotes</h3>
                </div>
                <div className="space-y-2">
                  {c1Pending.map(m => {
                    const days = getDaysPending(m.appt_date)
                    const couple = m.groom_name ? `${m.bride_name} & ${m.groom_name}` : m.bride_name
                    return (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-amber-900">{couple}</span>
                          {m.wedding_date && <span className="text-amber-700 ml-2">({new Date(m.wedding_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {m.quoted_amount ? <span className="text-amber-800">{formatCurrency(m.quoted_amount)}</span> : null}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${daysBadgeClass(days)}`}>{days}d</span>
                          {days >= 15 && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">CALL TODAY</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {c2Pending.length > 0 && (
              <motion.div
                animate={{ scale: [1, 1.015, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="border-2 border-amber-400 bg-amber-50 rounded-xl p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <h3 className="font-bold text-amber-900">C2 — Pending Frames & Albums</h3>
                </div>
                <div className="space-y-2">
                  {c2Pending.map(o => {
                    const days = getDaysPending(o.order_date)
                    return (
                      <div key={o.id} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-amber-900">{o.couple_name}</span>
                        <div className="flex items-center gap-2">
                          {o.extras_sale_amount ? <span className="text-amber-800">{formatCurrency(o.extras_sale_amount)}</span> : null}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${daysBadgeClass(days)}`}>{days}d</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2 — C1 SEASON SNAPSHOT */}
      <div>
        <h2 className="text-lg font-semibold mb-4">New Couple Quotes (Sales Meetings) — {currentYear}</h2>

        {/* 2a — KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Meetings', value: String(c1CurrentYear.length) },
            { label: 'Booked', value: String(c1Booked.length) },
            { label: 'Failed', value: String(c1Failed.length) },
            { label: 'Conversion', value: `${c1Conversion}%` },
            { label: 'Revenue Booked', value: formatCurrency(c1RevenueBooked) },
            { label: 'Avg Deal', value: formatCurrency(c1AvgDeal) },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* 2b — Monthly Performance Bar Chart */}
        <div className="bg-white border rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Monthly Performance</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="meetings" fill="#9ca3af" name="Meetings" />
              <Bar dataKey="booked" fill="#22c55e" name="Booked" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 2c — Lead Source ROI Table */}
        <div className="bg-white border rounded-xl overflow-hidden mb-6">
          <h3 className="text-sm font-medium text-muted-foreground p-4 pb-2">Lead Source ROI</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Source</th>
                  <th className="text-right p-3 font-medium">Appts</th>
                  <th className="text-right p-3 font-medium">Booked</th>
                  <th className="text-right p-3 font-medium">Failed</th>
                  <th className="text-right p-3 font-medium">Conv %</th>
                  <th className="text-right p-3 font-medium">Show Cost</th>
                  <th className="text-right p-3 font-medium">Cost/Lead</th>
                  <th className="text-right p-3 font-medium">Cost/Sale</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leadSourceData.map(row => {
                  const cost = showCosts[row.slug] || 0
                  const conv = row.booked + row.failed > 0 ? Math.round((row.booked / (row.booked + row.failed)) * 100) : 0
                  return (
                    <tr key={row.name} className="hover:bg-accent/50 transition-colors">
                      <td className="p-3 font-medium">{row.name}</td>
                      <td className="p-3 text-right">{row.appts}</td>
                      <td className="p-3 text-right">{row.booked}</td>
                      <td className="p-3 text-right">{row.failed}</td>
                      <td className="p-3 text-right">{conv}%</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-muted-foreground">$</span>
                          <input
                            type="number"
                            value={cost || ''}
                            onChange={e => updateShowCost(row.slug, Number(e.target.value) || 0)}
                            className="w-20 text-right border rounded px-1 py-0.5 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </td>
                      <td className="p-3 text-right">{cost > 0 ? formatCurrency(Math.round(cost / row.appts)) : '—'}</td>
                      <td className="p-3 text-right">{cost > 0 && row.booked > 0 ? formatCurrency(Math.round(cost / row.booked)) : '—'}</td>
                    </tr>
                  )
                })}
                <tr className="bg-muted/30 font-semibold border-t-2">
                  <td className="p-3">TOTALS</td>
                  <td className="p-3 text-right">{leadTotals.appts}</td>
                  <td className="p-3 text-right">{leadTotals.booked}</td>
                  <td className="p-3 text-right">{leadTotals.failed}</td>
                  <td className="p-3 text-right">{leadTotals.booked + leadTotals.failed > 0 ? Math.round((leadTotals.booked / (leadTotals.booked + leadTotals.failed)) * 100) : 0}%</td>
                  <td className="p-3 text-right">{formatCurrency(Object.values(showCosts).reduce((s, v) => s + v, 0))}</td>
                  <td className="p-3 text-right">—</td>
                  <td className="p-3 text-right">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3 — C2 FRAMES & ALBUMS YOY */}
      <div>
        <h2 className="text-lg font-semibold mb-4">C2 Frames & Albums — Year over Year</h2>

        {/* 3a — Year stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {c2ByYear.map(yr => (
            <div key={yr.year} className="bg-white border rounded-xl p-4">
              <div className="text-sm text-muted-foreground mb-2">
                {yr.year}{yr.year === currentYear ? ' (in progress)' : ''}
              </div>
              <div className="text-2xl font-bold">{formatCurrency(yr.revenue)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {yr.couples} couple{yr.couples !== 1 ? 's' : ''} · {yr.signed} signed
              </div>
            </div>
          ))}
        </div>

        {/* 3b — Grouped Bar Chart */}
        <div className="bg-white border rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">C2 Revenue & Couples by Year</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={c2ByYear.map(yr => ({ year: String(yr.year), couples: yr.couples, revenue: Math.round(yr.revenue / 1000) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip formatter={(value: any, name: any) => name === 'revenue' ? `$${value}k` : value} />
              <Legend />
              <Bar dataKey="couples" fill="#3b82f6" name="Couples" />
              <Bar dataKey="revenue" fill="#22c55e" name="Revenue ($k)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* C2 — WHO SAID NO */}
      {c2Declined.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">C2 — Who Said No</h2>
          <p className="text-sm text-muted-foreground mb-4">Couples who declined frame & album orders</p>
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Couple</th>
                  <th className="text-left p-3 font-medium">Wedding Date</th>
                  <th className="text-left p-3 font-medium">Year</th>
                  <th className="text-left p-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {c2Declined.map(o => {
                  const weddingDate = o.wedding_date ? new Date(o.wedding_date) : null
                  const daysUntilWedding = weddingDate ? Math.floor((weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
                  const isSoon = daysUntilWedding !== null && daysUntilWedding > 0 && daysUntilWedding <= 90
                  const coupleName = o.bride_first_name && o.groom_first_name
                    ? `${o.bride_first_name} & ${o.groom_first_name}`
                    : o.couple_name || 'Unknown'
                  const year = weddingDate ? weddingDate.getFullYear() : '—'
                  return (
                    <tr key={o.id} className={isSoon ? 'bg-amber-50' : 'hover:bg-accent/50 transition-colors'}>
                      <td className="p-3 font-medium">{coupleName}</td>
                      <td className="p-3">{weddingDate ? weddingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                      <td className="p-3">{year}</td>
                      <td className="p-3">{isSoon ? <span className="text-amber-700 font-medium">Wedding soon — re-engage?</span> : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 4 — C3 MARIANNA'S EXTRAS */}
      <div>
        <h2 className="text-lg font-semibold mb-4">C3 Marianna's Extras — Growth Story</h2>

        {/* 4a — Growth Callout Banner */}
        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-3">
            <Star className="h-6 w-6 text-amber-500" />
            <div>
              <div className="text-lg font-bold text-amber-900">
                Marianna's Extras: {formatCurrency(c3Growth.prevRevenue)} in {currentYear - 1} → {formatCurrency(c3Growth.currRevenue)} in {currentYear}
              </div>
              <div className="text-sm text-amber-700">
                {c3Growth.prevCouples} couple{c3Growth.prevCouples !== 1 ? 's' : ''} → {c3Growth.currCouples} couple{c3Growth.currCouples !== 1 ? 's' : ''}
                {c3Growth.multiplier > 1 && <> · {c3Growth.multiplier}× revenue growth</>}
              </div>
            </div>
          </div>
        </div>

        {/* 4b — Stacked Bar Chart */}
        <div className="bg-white border rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Revenue by Item Type & Year</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={c3ByYear.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
              <Legend />
              {c3ByYear.types.map(type => (
                <Bar key={type} dataKey={type} stackId="a" fill={ITEM_TYPE_COLORS[type] || '#94a3b8'} name={type} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 4c — Item Type Breakdown Table */}
        <div className="bg-white border rounded-xl overflow-hidden mb-6">
          <h3 className="text-sm font-medium text-muted-foreground p-4 pb-2">{currentYear} Item Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Item Type</th>
                  <th className="text-right p-3 font-medium">Count</th>
                  <th className="text-right p-3 font-medium">Revenue</th>
                  <th className="text-right p-3 font-medium">Avg/Item</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {c3ItemBreakdown.map(item => (
                  <tr key={item.type} className="hover:bg-accent/50 transition-colors">
                    <td className="p-3 font-medium">{item.type}</td>
                    <td className="p-3 text-right">{item.count}</td>
                    <td className="p-3 text-right">{formatCurrency(item.revenue)}</td>
                    <td className="p-3 text-right">{formatCurrency(item.avg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 5 — LEAD SOURCE ROI DETAIL */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Lead Source ROI Detail</h2>
        <p className="text-sm text-muted-foreground mb-4">Which shows generate the best return? Update show costs below to calculate ROI.</p>

        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Source</th>
                  <th className="text-right p-3 font-medium">Leads</th>
                  <th className="text-right p-3 font-medium">Booked</th>
                  <th className="text-right p-3 font-medium">Revenue</th>
                  <th className="text-right p-3 font-medium">Show Cost</th>
                  <th className="text-right p-3 font-medium">Rev/Lead</th>
                  <th className="text-right p-3 font-medium">Cost/Lead</th>
                  <th className="text-right p-3 font-medium">Cost/Sale</th>
                  <th className="text-right p-3 font-medium">Break-Even</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leadSourceData.map((row, idx) => {
                  const cost = showCosts[row.slug] || 0
                  const isHighest = idx === bestSourceIdx
                  const isZeroBookings = row.booked === 0
                  const breakEven = cost > 0 && c1AvgDeal > 0 ? Math.ceil(cost / c1AvgDeal) : null
                  return (
                    <tr
                      key={row.name}
                      className={`transition-colors ${isHighest ? 'bg-green-50' : isZeroBookings ? 'bg-red-50' : 'hover:bg-accent/50'}`}
                    >
                      <td className="p-3 font-medium">{row.name}</td>
                      <td className="p-3 text-right">{row.appts}</td>
                      <td className="p-3 text-right">{row.booked}</td>
                      <td className="p-3 text-right">{formatCurrency(row.revenue)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-muted-foreground">$</span>
                          <input
                            type="number"
                            value={cost || ''}
                            onChange={e => updateShowCost(row.slug, Number(e.target.value) || 0)}
                            className="w-20 text-right border rounded px-1 py-0.5 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </td>
                      <td className="p-3 text-right">{row.appts > 0 ? formatCurrency(Math.round(row.revenue / row.appts)) : '—'}</td>
                      <td className="p-3 text-right">{cost > 0 ? formatCurrency(Math.round(cost / row.appts)) : '—'}</td>
                      <td className="p-3 text-right">{cost > 0 && row.booked > 0 ? formatCurrency(Math.round(cost / row.booked)) : '—'}</td>
                      <td className="p-3 text-right">{breakEven !== null ? `${breakEven} booking${breakEven !== 1 ? 's' : ''}` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
