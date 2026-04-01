'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Download, Plus } from 'lucide-react'
import RevenueDashboard from '@/components/sales/frames/RevenueCards'
import Pipeline from '@/components/sales/frames/Pipeline'
import ActionAlerts from '@/components/sales/frames/ActionAlerts'
import { ActivePipelineTable, CompletedSalesTable, type FrameSaleRow } from '@/components/sales/frames/FrameSalesTable'

// ── Types ────────────────────────────────────────────────────────────────────

interface MilestoneRow {
  couple_id: string
  m06_eng_session_shot: boolean
  m06_eng_session_date: string | null
  m06_declined: boolean
  m10_frame_sale_quote: boolean
  m11_sale_results_pdf: boolean
  m11_no_sale: boolean
}

interface ExtrasOrder {
  id: string
  couple_id: string
  total: number | null
  extras_sale_amount: number | null
  status: string | null
  order_date: string | null
  order_type: string | null
  printed_5x5: boolean | null
  items: any
  album_qty: number | null
  collage_size: string | null
  wedding_frame_size: string | null
  eng_portrait_size: string | null
  signing_book: boolean | null
  downpayment: number | null
}

interface CoupleRaw {
  id: string
  couple_name: string
  wedding_date: string | null
  wedding_year: number | null
  status: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const YEARS = [2027, 2026, 2025]

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function daysBetween(dateStr: string | null, now: Date): number {
  if (!dateStr) return 0
  const d = new Date(dateStr + 'T12:00:00')
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function getSaleAmount(eo: ExtrasOrder | null): number {
  if (!eo) return 0
  return Number(eo.extras_sale_amount) || Number(eo.total) || 0
}

function safeItems(items: any): any[] {
  if (!items) return []
  if (Array.isArray(items)) return items
  if (typeof items === 'string') {
    try { const p = JSON.parse(items); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

function hasDigitalFiles(eo: ExtrasOrder | null): boolean {
  if (!eo) return false
  const items = safeItems(eo.items)
  return items.some((i: any) => /digital|hi.?res/i.test(i.name || i.description || ''))
}

// ── Pipeline stage for a couple ──────────────────────────────────────────────

type PipelineStage = 'not_quoted' | 'quoted' | 'sold' | 'delivered' | 'no_sale'

function computeStage(eo: ExtrasOrder | null, milestone: MilestoneRow | undefined): PipelineStage {
  if (!eo) return 'not_quoted'
  const st = eo.status
  if (st === 'completed') return 'delivered'
  if (st === 'signed' || st === 'paid' || st === 'confirmed') return 'sold'
  if (st === 'declined' || st === 'no_sale') return 'no_sale'
  if (st === 'pending' || st === 'active') return 'quoted'
  // Fallback: use milestones
  if (milestone?.m11_no_sale) return 'no_sale'
  if (milestone?.m11_sale_results_pdf) return 'sold'
  if (milestone?.m10_frame_sale_quote) return 'quoted'
  return 'not_quoted'
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function FrameSalesCommandCenter() {
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState<number>(2026)
  const [pipelineFilter, setPipelineFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [fiveByFiveFilter, setFiveByFiveFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Raw data
  const [couples, setCouples] = useState<CoupleRaw[]>([])
  const [extrasOrders, setExtrasOrders] = useState<ExtrasOrder[]>([])
  const [milestones, setMilestones] = useState<MilestoneRow[]>([])

  // Previous year data for YoY
  const [prevCouples, setPrevCouples] = useState<CoupleRaw[]>([])
  const [prevExtrasOrders, setPrevExtrasOrders] = useState<ExtrasOrder[]>([])

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (year: number) => {
    setLoading(true)
    try {
      const prevYear = year - 1

      const [couplesRes, extrasRes, milestonesRes, prevCouplesRes, prevExtrasRes] = await Promise.all([
        supabase.from('couples').select('id, couple_name, wedding_date, wedding_year, status')
          .eq('wedding_year', year).order('wedding_date', { ascending: true }),
        supabase.from('extras_orders').select('id, couple_id, total, extras_sale_amount, status, order_date, order_type, printed_5x5, items, album_qty, collage_size, wedding_frame_size, eng_portrait_size, signing_book, downpayment'),
        supabase.from('couple_milestones').select('couple_id, m06_eng_session_shot, m06_eng_session_date, m06_declined, m10_frame_sale_quote, m11_sale_results_pdf, m11_no_sale'),
        supabase.from('couples').select('id, couple_name, wedding_date, wedding_year, status')
          .eq('wedding_year', prevYear),
        supabase.from('extras_orders').select('id, couple_id, total, extras_sale_amount, status, order_date, order_type, printed_5x5, items, album_qty, collage_size, wedding_frame_size, eng_portrait_size, signing_book, downpayment'),
      ])

      setCouples(couplesRes.data || [])
      setExtrasOrders(extrasRes.data || [])
      setMilestones(milestonesRes.data || [])
      setPrevCouples(prevCouplesRes.data || [])
      setPrevExtrasOrders(prevExtrasRes.data || [])
    } catch (err) {
      console.error('[FrameSalesCommandCenter] fetch error:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData(yearFilter) }, [yearFilter, fetchData])

  // ── Index maps ─────────────────────────────────────────────────────────────

  const milestonesMap = useMemo(() => {
    const m: Record<string, MilestoneRow> = {}
    for (const row of milestones) m[row.couple_id] = row
    return m
  }, [milestones])

  // Extras orders keyed by couple_id (filter to frames/frames_albums types, or take first)
  const extrasMap = useMemo(() => {
    const m: Record<string, ExtrasOrder> = {}
    for (const row of extrasOrders) {
      if (row.order_type && !['frames', 'frames_albums'].includes(row.order_type)) continue
      if (!m[row.couple_id]) m[row.couple_id] = row
    }
    // Second pass: include any order if couple has none yet
    for (const row of extrasOrders) {
      if (!m[row.couple_id]) m[row.couple_id] = row
    }
    return m
  }, [extrasOrders])

  const prevExtrasMap = useMemo(() => {
    const m: Record<string, ExtrasOrder> = {}
    for (const row of prevExtrasOrders) {
      if (!m[row.couple_id]) m[row.couple_id] = row
    }
    return m
  }, [prevExtrasOrders])

  // ── Current year couple IDs (for filtering extras to year) ─────────────────

  const coupleIds = useMemo(() => new Set(couples.map(c => c.id)), [couples])
  const prevCoupleIds = useMemo(() => new Set(prevCouples.map(c => c.id)), [prevCouples])

  // ── Enriched couple data ───────────────────────────────────────────────────

  const enrichedCouples = useMemo(() => {
    return couples.map(c => {
      const eo = extrasMap[c.id] || null
      const stage = computeStage(eo, milestonesMap[c.id])
      return { ...c, eo, stage, milestone: milestonesMap[c.id] }
    })
  }, [couples, extrasMap, milestonesMap])

  // ── Pipeline counts & amounts ──────────────────────────────────────────────

  const pipelineStages = useMemo(() => {
    const stages: Record<PipelineStage, { count: number; amount: number }> = {
      not_quoted: { count: 0, amount: 0 },
      quoted: { count: 0, amount: 0 },
      sold: { count: 0, amount: 0 },
      delivered: { count: 0, amount: 0 },
      no_sale: { count: 0, amount: 0 },
    }
    for (const c of enrichedCouples) {
      stages[c.stage].count++
      stages[c.stage].amount += getSaleAmount(c.eo)
    }
    return [
      { key: 'not_quoted', label: 'Not Quoted', ...stages.not_quoted, amountLabel: 'potential' },
      { key: 'quoted', label: 'Quoted', ...stages.quoted, amountLabel: 'pending' },
      { key: 'sold', label: 'Sold', ...stages.sold, amountLabel: 'won' },
      { key: 'delivered', label: 'Delivered', ...stages.delivered, amountLabel: 'done' },
      { key: 'no_sale', label: 'No Sale', ...stages.no_sale, amountLabel: 'lost' },
    ]
  }, [enrichedCouples])

  // ── Revenue dashboard metrics ──────────────────────────────────────────────

  const metrics = useMemo(() => {
    const soldStatuses = ['signed', 'paid', 'completed', 'confirmed']

    // Current year
    const soldOrders = extrasOrders.filter(eo => coupleIds.has(eo.couple_id) && soldStatuses.includes(eo.status || ''))
    const revenue = soldOrders.reduce((s, eo) => s + getSaleAmount(eo), 0)
    const soldCount = soldOrders.length
    const totalCouples = couples.length
    const avgSale = soldCount > 0 ? Math.round(revenue / soldCount) : 0

    // Previous year
    const prevSoldOrders = prevExtrasOrders.filter(eo => prevCoupleIds.has(eo.couple_id) && soldStatuses.includes(eo.status || ''))
    const prevRevenue = prevSoldOrders.reduce((s, eo) => s + getSaleAmount(eo), 0)
    const prevSoldCount = prevSoldOrders.length
    const prevTotalCouples = prevCouples.length
    const prevAvgSale = prevSoldCount > 0 ? Math.round(prevRevenue / prevSoldCount) : 0

    // 5x5 ROI — compare conversion of couples with printed_5x5=true vs false
    const withFiveByFive = extrasOrders.filter(eo => coupleIds.has(eo.couple_id) && eo.printed_5x5 === true)
    const withoutFiveByFive = extrasOrders.filter(eo => coupleIds.has(eo.couple_id) && eo.printed_5x5 === false)
    const convWith = withFiveByFive.length > 0
      ? Math.round((withFiveByFive.filter(eo => soldStatuses.includes(eo.status || '')).length / withFiveByFive.length) * 100)
      : 0
    const convWithout = withoutFiveByFive.length > 0
      ? Math.round((withoutFiveByFive.filter(eo => soldStatuses.includes(eo.status || '')).length / withoutFiveByFive.length) * 100)
      : 0
    const hasData = withFiveByFive.length >= 5 && withoutFiveByFive.length >= 5

    return {
      revenue, prevRevenue, soldCount, totalCouples, prevSoldCount, prevTotalCouples,
      avgSale, prevAvgSale, convWith, convWithout, hasData,
    }
  }, [extrasOrders, prevExtrasOrders, couples, prevCouples, coupleIds, prevCoupleIds])

  // ── Action alerts ──────────────────────────────────────────────────────────

  const alerts = useMemo(() => {
    const now = new Date()
    const urgent: { coupleId: string; coupleName: string; detail: string; daysWaiting: number }[] = []
    const followUp: typeof urgent = []
    const ready: typeof urgent = []

    for (const c of enrichedCouples) {
      const ms = c.milestone
      const eo = c.eo

      // Urgent: shot but not quoted (30+ days)
      if (ms?.m06_eng_session_shot && !ms.m10_frame_sale_quote && !eo) {
        const days = daysBetween(ms.m06_eng_session_date, now)
        if (days >= 30) {
          urgent.push({ coupleId: c.id, coupleName: c.couple_name, detail: `${days} days since engagement shot`, daysWaiting: days })
        }
      }

      // Follow up: quoted 14+ days ago, still pending/active
      if (eo && (eo.status === 'pending' || eo.status === 'active') && eo.order_date) {
        const days = daysBetween(eo.order_date, now)
        if (days >= 14) {
          followUp.push({ coupleId: c.id, coupleName: c.couple_name, detail: `Quoted ${days} days ago`, daysWaiting: days })
        }
      }

      // Ready: signed with deposit
      if (eo && eo.status === 'signed' && eo.downpayment && Number(eo.downpayment) > 0) {
        ready.push({
          coupleId: c.id,
          coupleName: c.couple_name,
          detail: `${fmtMoney(Number(eo.downpayment))} deposit${c.wedding_date ? `, wedding ${c.wedding_date}` : ''}`,
          daysWaiting: 0,
        })
      }
    }

    urgent.sort((a, b) => b.daysWaiting - a.daysWaiting)
    followUp.sort((a, b) => b.daysWaiting - a.daysWaiting)
    return { urgent, followUp, ready }
  }, [enrichedCouples])

  // ── Filtered rows for tables ───────────────────────────────────────────────

  const filteredCouples = useMemo(() => {
    let list = enrichedCouples

    // Pipeline stage filter (from clicking pipeline)
    if (pipelineFilter) {
      list = list.filter(c => c.stage === pipelineFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter(c => c.eo?.status === statusFilter)
    }

    // 5x5 filter
    if (fiveByFiveFilter === 'yes') {
      list = list.filter(c => c.eo?.printed_5x5 === true)
    } else if (fiveByFiveFilter === 'no') {
      list = list.filter(c => c.eo?.printed_5x5 === false)
    } else if (fiveByFiveFilter === 'unknown') {
      list = list.filter(c => c.eo?.printed_5x5 == null)
    }

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      list = list.filter(c => c.couple_name.toLowerCase().includes(term))
    }

    return list
  }, [enrichedCouples, pipelineFilter, statusFilter, fiveByFiveFilter, searchTerm])

  // Convert to table rows
  const toRow = (c: typeof enrichedCouples[0]): FrameSaleRow => ({
    id: c.eo?.id || c.id,
    coupleName: c.couple_name,
    coupleId: c.id,
    weddingDate: c.wedding_date,
    orderDate: c.eo?.order_date || null,
    saleAmount: getSaleAmount(c.eo),
    status: c.eo?.status || null,
    collageSize: c.eo?.collage_size || null,
    albumQty: c.eo?.album_qty || null,
    signingBook: c.eo?.signing_book || null,
    weddingFrameSize: c.eo?.wedding_frame_size || null,
    engPortraitSize: c.eo?.eng_portrait_size || null,
    hasDigital: hasDigitalFiles(c.eo),
    downpayment: Number(c.eo?.downpayment) || 0,
  })

  const activePipelineRows = useMemo(
    () => filteredCouples.filter(c => c.stage === 'quoted').map(toRow),
    [filteredCouples]
  )

  const completedRows = useMemo(
    () => filteredCouples.filter(c => c.stage === 'sold' || c.stage === 'delivered').map(toRow),
    [filteredCouples]
  )

  // ── CSV Export ─────────────────────────────────────────────────────────────

  const handleExportCsv = () => {
    const rows = filteredCouples.map(c => ({
      Couple: c.couple_name,
      'Wedding Date': c.wedding_date || '',
      Stage: c.stage,
      Status: c.eo?.status || '',
      'Sale Amount': getSaleAmount(c.eo),
      '5x5 Printed': c.eo?.printed_5x5 == null ? 'Unknown' : c.eo.printed_5x5 ? 'Yes' : 'No',
      'Order Date': c.eo?.order_date || '',
    }))
    const headers = Object.keys(rows[0] || {})
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const val = String((r as any)[h])
        return val.includes(',') ? `"${val}"` : val
      }).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `frame-sales-${yearFilter}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Year comparison ────────────────────────────────────────────────────────

  const prevYear = yearFilter - 1
  const prevConvRate = metrics.prevTotalCouples > 0 ? Math.round((metrics.prevSoldCount / metrics.prevTotalCouples) * 100) : 0
  const currConvRate = metrics.totalCouples > 0 ? Math.round((metrics.soldCount / metrics.totalCouples) * 100) : 0

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Frame & Album Sales</h1>
          <p className="text-muted-foreground">Your engagement upsell command center</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(Number(e.target.value))
              setPipelineFilter(null)
            }}
            className="!w-auto"
          >
            {YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            disabled
            title="Coming soon"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed opacity-60"
          >
            <Plus className="h-4 w-4" /> Create Quote
          </button>
        </div>
      </div>

      {/* Revenue Dashboard */}
      <RevenueDashboard
        revenue={metrics.revenue}
        prevRevenue={metrics.prevRevenue}
        soldCount={metrics.soldCount}
        totalCouples={metrics.totalCouples}
        prevSoldCount={metrics.prevSoldCount}
        prevTotalCouples={metrics.prevTotalCouples}
        avgSale={metrics.avgSale}
        prevAvgSale={metrics.prevAvgSale}
        fiveByFiveConvWith={metrics.convWith}
        fiveByFiveConvWithout={metrics.convWithout}
        fiveByFiveHasData={metrics.hasData}
        year={yearFilter}
      />

      {/* Pipeline View */}
      <Pipeline
        stages={pipelineStages}
        activeStage={pipelineFilter}
        onStageClick={setPipelineFilter}
      />

      {/* Action Alerts */}
      <ActionAlerts
        urgent={alerts.urgent}
        followUp={alerts.followUp}
        ready={alerts.ready}
      />

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={pipelineFilter || 'all'}
          onChange={e => setPipelineFilter(e.target.value === 'all' ? null : e.target.value)}
          className="!w-auto text-sm"
        >
          <option value="all">Stage: All</option>
          <option value="not_quoted">Not Quoted</option>
          <option value="quoted">Quoted</option>
          <option value="sold">Sold</option>
          <option value="delivered">Delivered</option>
          <option value="no_sale">No Sale</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="!w-auto text-sm"
        >
          <option value="all">Status: All</option>
          <option value="signed">Signed</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={fiveByFiveFilter}
          onChange={e => setFiveByFiveFilter(e.target.value)}
          className="!w-auto text-sm"
        >
          <option value="all">5\u00d75 Printed: All</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="unknown">Unknown</option>
        </select>
        <input
          type="text"
          placeholder="Search couple..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="text-sm px-3 py-1.5 border rounded-lg bg-background w-48"
        />
        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-accent/50 text-sm font-medium transition-colors ml-auto"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Active Pipeline Table */}
      {(!pipelineFilter || pipelineFilter === 'quoted') && (
        <ActivePipelineTable rows={activePipelineRows} />
      )}

      {/* Completed Sales Table */}
      {(!pipelineFilter || pipelineFilter === 'sold' || pipelineFilter === 'delivered') && (
        <CompletedSalesTable rows={completedRows} />
      )}

      {/* Year Comparison Footer */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <span>\uD83D\uDCCA</span> {yearFilter} vs {prevYear}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground mb-1">Revenue</div>
            <div className="font-semibold">{fmtMoney(metrics.revenue)} <span className="text-muted-foreground font-normal">vs {fmtMoney(metrics.prevRevenue)}</span></div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Sold</div>
            <div className="font-semibold">{metrics.soldCount} <span className="text-muted-foreground font-normal">vs {metrics.prevSoldCount} couples</span></div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Avg Sale</div>
            <div className="font-semibold">{fmtMoney(metrics.avgSale)} <span className="text-muted-foreground font-normal">vs {fmtMoney(metrics.prevAvgSale)}</span></div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Conversion</div>
            <div className="font-semibold">{currConvRate}% <span className="text-muted-foreground font-normal">vs {prevConvRate}%</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
