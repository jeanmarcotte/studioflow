'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronDown } from 'lucide-react'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] })

const GOLD = '#C4A265'
const CHARCOAL = '#1E2330'
const DARK_BORDER = '#333847'
const SUCCESS = '#34D399'
const WARNING = '#FBBF24'
const DANGER = '#F87171'
const MUTED = '#8B8FA3'
const BG = '#F8F7F4'
const WHITE = '#FFFFFF'

interface CoupleRow {
  id: string
  couple_name: string
  wedding_date: string | null
  wedding_year: number | null
  phase: string
  c1: number
  c2: number
  c2_status: string | null
  c3: number
  total: number
}

const PHASE_OPTIONS = [
  { value: 'all', label: 'All Phases' },
  { value: 'new_client', label: 'New Client' },
  { value: 'pre_engagement', label: 'Pre-Engagement' },
  { value: 'post_engagement', label: 'Post-Engagement' },
  { value: 'pre_wedding', label: 'Pre-Wedding' },
  { value: 'post_wedding', label: 'Post-Wedding' },
  { value: 'post_production', label: 'Post-Production' },
  { value: 'completed', label: 'Completed' },
]

interface ProductBreakdown {
  item_type: string
  count: number
  revenue: number
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '$0'
  return n % 1 === 0
    ? `$${n.toLocaleString('en-CA')}`
    : `$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function RevenuePerClientDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [coupleRows, setCoupleRows] = useState<CoupleRow[]>([])
  const [productData, setProductData] = useState<ProductBreakdown[]>([])
  const [yearFilter, setYearFilter] = useState<string>('2026')
  const [phaseFilter, setPhaseFilter] = useState<string>('all')

  // C2 conversion metrics
  const [c2Eligible, setC2Eligible] = useState(0)
  const [c2Signed, setC2Signed] = useState(0)
  const [c2AvgSale, setC2AvgSale] = useState(0)

  // C3 add-on metrics
  const [c3Eligible, setC3Eligible] = useState(0)
  const [c3WithAddons, setC3WithAddons] = useState(0)
  const [c3AvgAmount, setC3AvgAmount] = useState(0)

  useEffect(() => {
    async function fetchData() {
      const [couplesRes, contractsRes, extrasOrdersRes, c3LineItemsRes, milestonesRes] = await Promise.all([
        supabase
          .from('couples')
          .select('id, bride_first_name, groom_first_name, wedding_date, wedding_year, phase, is_cancelled')
          .eq('is_cancelled', false),
        supabase
          .from('contracts')
          .select('couple_id, total'),
        supabase
          .from('extras_orders')
          .select('couple_id, extras_sale_amount, status'),
        supabase
          .from('c3_line_items')
          .select('couple_id, product_code, quantity, total, invoice_date, product_catalog(item_name, category)'),
        supabase
          .from('couple_milestones')
          .select('couple_id, m06_eng_session_shot, m11_frame_sale_complete, m19_wedding_day'),
      ])

      const couples = couplesRes.data ?? []
      const contracts = contractsRes.data ?? []
      const extrasOrders = extrasOrdersRes.data ?? []
      const c3LineItems = c3LineItemsRes.data ?? []
      const milestones = milestonesRes.data ?? []

      // Build lookup maps
      const contractMap = new Map<string, number>()
      for (const c of contracts) {
        if (c.couple_id && c.total) contractMap.set(c.couple_id, Number(c.total) || 0)
      }

      const c2Map = new Map<string, { amount: number; status: string }>()
      for (const o of extrasOrders) {
        if (o.couple_id && (o.status === 'signed' || o.status === 'completed')) {
          const existing = c2Map.get(o.couple_id)
          const amt = Number(o.extras_sale_amount) || 0
          if (!existing || amt > existing.amount) {
            c2Map.set(o.couple_id, { amount: amt, status: o.status })
          }
        } else if (o.couple_id && o.status === 'declined' && !c2Map.has(o.couple_id)) {
          c2Map.set(o.couple_id, { amount: 0, status: 'declined' })
        }
      }

      const c3Map = new Map<string, number>()
      for (const e of c3LineItems) {
        const amt = Number(e.total) || 0
        c3Map.set(e.couple_id, (c3Map.get(e.couple_id) ?? 0) + amt)
      }

      // Build couple rows
      const rows: CoupleRow[] = couples.map((c: any) => {
        const c1 = contractMap.get(c.id) ?? 0
        const c2Entry = c2Map.get(c.id)
        const c2 = c2Entry?.amount ?? 0
        const c3 = c3Map.get(c.id) ?? 0
        return {
          id: c.id,
          couple_name: `${c.bride_first_name} & ${c.groom_first_name}`,
          wedding_date: c.wedding_date,
          wedding_year: c.wedding_year,
          phase: c.phase || 'new_client',
          c1,
          c2,
          c2_status: c2Entry?.status ?? null,
          c3,
          total: c1 + c2 + c3,
        }
      })

      setCoupleRows(rows)

      // Product breakdown from c3_line_items (group by catalog item_name, fall back to product_code)
      const productAgg = new Map<string, { count: number; revenue: number }>()
      for (const e of c3LineItems as any[]) {
        const key = e.product_catalog?.item_name || e.product_code || 'Other'
        const existing = productAgg.get(key) ?? { count: 0, revenue: 0 }
        existing.count += Number(e.quantity) || 1
        existing.revenue += Number(e.total) || 0
        productAgg.set(key, existing)
      }
      const products = Array.from(productAgg.entries())
        .map(([item_type, data]) => ({ item_type, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
      setProductData(products)

      // C2 conversion: couples with m06 (engagement shot) → how many have signed C2
      const milestoneMap = new Map<string, any>()
      for (const m of milestones) milestoneMap.set(m.couple_id, m)

      const m06Couples = couples.filter((c: any) => {
        const m = milestoneMap.get(c.id)
        return m?.m06_eng_session_shot === true
      })
      const m06Signed = m06Couples.filter((c: any) => {
        const entry = c2Map.get(c.id)
        return entry?.status === 'signed' || entry?.status === 'completed'
      })
      const signedAmounts = m06Signed.map((c: any) => c2Map.get(c.id)?.amount ?? 0).filter((a: number) => a > 0)

      setC2Eligible(m06Couples.length)
      setC2Signed(m06Signed.length)
      setC2AvgSale(signedAmounts.length > 0 ? signedAmounts.reduce((s: number, a: number) => s + a, 0) / signedAmounts.length : 0)

      // C3 add-on: couples with wedding done or C2 signed → how many have c3_line_items
      const c3EligibleCouples = couples.filter((c: any) => {
        const m = milestoneMap.get(c.id)
        const hasC2 = c2Map.has(c.id) && (c2Map.get(c.id)?.status === 'signed' || c2Map.get(c.id)?.status === 'completed')
        return m?.m19_wedding_day === true || hasC2
      })
      const c3WithAddonsCouples = c3EligibleCouples.filter((c: any) => c3Map.has(c.id) && (c3Map.get(c.id) ?? 0) > 0)
      const c3Amounts = c3WithAddonsCouples.map((c: any) => c3Map.get(c.id) ?? 0)

      setC3Eligible(c3EligibleCouples.length)
      setC3WithAddons(c3WithAddonsCouples.length)
      setC3AvgAmount(c3Amounts.length > 0 ? c3Amounts.reduce((s: number, a: number) => s + a, 0) / c3Amounts.length : 0)

      setLoading(false)
    }
    fetchData()
  }, [])

  // Filtered rows by year + phase
  const filteredRows = useMemo(() => {
    let result = coupleRows
    if (yearFilter !== 'all') {
      const yr = parseInt(yearFilter)
      result = result.filter((r) => r.wedding_year === yr)
    }
    if (phaseFilter !== 'all') {
      result = result.filter((r) => r.phase === phaseFilter)
    }
    return result
  }, [coupleRows, yearFilter, phaseFilter])

  // Scorecard metrics
  const totalC2 = useMemo(() => filteredRows.reduce((s, r) => s + r.c2, 0), [filteredRows])
  const c2Sales = useMemo(() => filteredRows.filter((r) => r.c2 > 0), [filteredRows])
  const avgC2 = c2Sales.length > 0 ? totalC2 / c2Sales.length : 0
  const totalC3 = useMemo(() => filteredRows.reduce((s, r) => s + r.c3, 0), [filteredRows])
  const totalAll = useMemo(() => filteredRows.reduce((s, r) => s + r.total, 0), [filteredRows])
  const avgPerCouple = filteredRows.length > 0 ? totalAll / filteredRows.length : 0

  // Product chart data
  const chartData = useMemo(() => {
    return productData.map((p) => ({
      name: p.item_type,
      revenue: Math.round(p.revenue),
      count: p.count,
    }))
  }, [productData])

  // Table columns
  const columns: ColumnDef<CoupleRow>[] = useMemo(() => [
    {
      accessorKey: 'couple_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/admin/couples/${row.original.id}`)}
          className="text-left font-medium hover:underline"
          style={{ color: '#1A1A1A' }}
        >
          {row.original.couple_name}
        </button>
      ),
    },
    {
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding" />,
      cell: ({ row }) => {
        const d = row.original.wedding_date
        if (!d) return <span style={{ color: MUTED }}>—</span>
        const date = new Date(d)
        return <span className="text-sm whitespace-nowrap">{date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      },
    },
    {
      accessorKey: 'c1',
      header: ({ column }) => <DataTableColumnHeader column={column} title="C1 Contract" />,
      cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.c1 > 0 ? fmt(row.original.c1) : <span style={{ color: MUTED }}>—</span>}</span>,
    },
    {
      accessorKey: 'c2',
      header: ({ column }) => <DataTableColumnHeader column={column} title="C2 Frames" />,
      cell: ({ row }) => {
        const { c2, c2_status } = row.original
        if (c2_status === 'declined') return <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>Declined</span>
        if (c2 > 0) return <span className="text-sm tabular-nums font-medium" style={{ color: SUCCESS }}>{fmt(c2)}</span>
        return <span style={{ color: MUTED, fontSize: 13 }}>No sale</span>
      },
    },
    {
      accessorKey: 'c3',
      header: ({ column }) => <DataTableColumnHeader column={column} title="C3 Extras" />,
      cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.c3 > 0 ? fmt(row.original.c3) : <span style={{ color: MUTED }}>—</span>}</span>,
    },
    {
      accessorKey: 'total',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Revenue" />,
      cell: ({ row }) => <span className="text-sm font-bold tabular-nums" style={{ color: row.original.total > 0 ? GOLD : MUTED }}>{fmt(row.original.total)}</span>,
    },
  ], [router])

  // Sort by total descending
  const sortedRows = useMemo(() => [...filteredRows].sort((a, b) => b.total - a.total), [filteredRows])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: BG }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${GOLD} transparent ${GOLD} ${GOLD}` }} />
      </div>
    )
  }

  return (
    <div className={dmSans.className} style={{ backgroundColor: BG, minHeight: '100vh', color: '#1A1A1A' }}>
      {/* Header */}
      <div style={{ padding: '32px 40px 24px' }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className={playfair.className} style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
              Revenue Per Client
            </h1>
            <p style={{ fontSize: 14, color: MUTED, letterSpacing: '0.01em' }}>
              Contract + Frames & Albums + Extras
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={phaseFilter}
                onChange={(e) => setPhaseFilter(e.target.value)}
                className="appearance-none rounded-xl px-5 py-2.5 pr-10 text-sm font-medium outline-none cursor-pointer"
                style={{ backgroundColor: CHARCOAL, color: WHITE, border: `1px solid ${DARK_BORDER}`, minWidth: 160 }}
              >
                {PHASE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: GOLD }} />
            </div>
            <div className="relative">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="appearance-none rounded-xl px-5 py-2.5 pr-10 text-sm font-medium outline-none cursor-pointer"
                style={{ backgroundColor: CHARCOAL, color: WHITE, border: `1px solid ${DARK_BORDER}`, minWidth: 140 }}
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="all">All Years</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: GOLD }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 40px 40px' }}>
        {/* Section 1: Scorecard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <ScoreCard label="Total C2 Revenue" value={fmt(totalC2)} sub={`${c2Sales.length} sales`} />
          <ScoreCard label="Avg C2 Sale" value={fmt(Math.round(avgC2))} sub="signed deals only" />
          <ScoreCard label="Total C3 Revenue" value={fmt(Math.round(totalC3))} sub={`${filteredRows.filter((r) => r.c3 > 0).length} couples`} />
          <ScoreCard label="Avg Revenue / Couple" value={fmt(Math.round(avgPerCouple))} sub={`${filteredRows.length} couples`} highlight />
        </div>

        {/* Section 2: Per-Couple Revenue Table */}
        <div className="rounded-2xl overflow-hidden mb-8" style={{ backgroundColor: WHITE, border: '1px solid #E8E5DF' }}>
          <div className="px-8 py-6">
            <h2 className="text-sm uppercase tracking-wider font-semibold" style={{ color: MUTED, letterSpacing: '0.1em' }}>
              Per-Couple Revenue
            </h2>
          </div>
          <div className="px-4 pb-4">
            <DataTable
              columns={columns}
              data={sortedRows}
              showPagination={sortedRows.length > 25}
              emptyMessage="No couples found"
            />
          </div>
        </div>

        {/* Section 3: Product Breakdown */}
        {chartData.length > 0 && (
          <div className="rounded-2xl p-8 mb-8" style={{ backgroundColor: WHITE, border: '1px solid #E8E5DF' }}>
            <h2 className="text-sm uppercase tracking-wider font-semibold mb-6" style={{ color: MUTED, letterSpacing: '0.1em' }}>
              C3 Product Breakdown
            </h2>
            <div style={{ width: '100%', height: Math.max(200, chartData.length * 52) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DF" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: MUTED }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: '#1A1A1A' }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip
                    contentStyle={{ backgroundColor: CHARCOAL, border: 'none', borderRadius: 12, color: WHITE, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
                    formatter={(value: any, name: any) => {
                      if (name === 'Revenue') return [`$${Number(value).toLocaleString()}`, name]
                      return [value, name]
                    }}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill={GOLD} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend table below chart */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #F3F1EC' }}>
              <div className="grid grid-cols-3 gap-2">
                {productData.map((p) => (
                  <div key={p.item_type} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: '#FAFAF5' }}>
                    <span className="text-sm font-medium">{p.item_type}</span>
                    <span className="text-sm tabular-nums" style={{ color: MUTED }}>
                      {p.count} sale{p.count !== 1 ? 's' : ''} &middot; {fmt(Math.round(p.revenue))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Conversion Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* C2 Conversion */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: CHARCOAL, color: WHITE }}>
            <p className="text-xs uppercase tracking-wider mb-4 font-medium" style={{ color: MUTED, letterSpacing: '0.12em' }}>C2 Frame Sale Conversion</p>
            <div className="flex items-end gap-6 mb-4">
              <div>
                <p style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, color: c2Eligible > 0 && (c2Signed / c2Eligible) >= 0.5 ? SUCCESS : c2Eligible > 0 && (c2Signed / c2Eligible) >= 0.3 ? WARNING : DANGER }}>
                  {c2Eligible > 0 ? `${Math.round((c2Signed / c2Eligible) * 100)}%` : '—'}
                </p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>conversion rate</p>
              </div>
              <div>
                <p className="text-lg font-bold">{c2Signed} <span className="text-sm font-normal" style={{ color: MUTED }}>of {c2Eligible}</span></p>
                <p className="text-xs" style={{ color: MUTED }}>engagement couples signed</p>
              </div>
            </div>
            {c2Eligible > 0 && (
              <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: DARK_BORDER }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (c2Signed / c2Eligible) * 100)}%`, backgroundColor: GOLD }} />
              </div>
            )}
            <p className="text-sm" style={{ color: MUTED }}>
              Avg signed sale: <span className="font-semibold" style={{ color: GOLD }}>{fmt(Math.round(c2AvgSale))}</span>
            </p>
          </div>

          {/* C3 Add-on Rate */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: CHARCOAL, color: WHITE }}>
            <p className="text-xs uppercase tracking-wider mb-4 font-medium" style={{ color: MUTED, letterSpacing: '0.12em' }}>C3 Add-on Rate</p>
            <div className="flex items-end gap-6 mb-4">
              <div>
                <p style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, color: c3Eligible > 0 && (c3WithAddons / c3Eligible) >= 0.4 ? SUCCESS : c3Eligible > 0 && (c3WithAddons / c3Eligible) >= 0.2 ? WARNING : DANGER }}>
                  {c3Eligible > 0 ? `${Math.round((c3WithAddons / c3Eligible) * 100)}%` : '—'}
                </p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>add-on rate</p>
              </div>
              <div>
                <p className="text-lg font-bold">{c3WithAddons} <span className="text-sm font-normal" style={{ color: MUTED }}>of {c3Eligible}</span></p>
                <p className="text-xs" style={{ color: MUTED }}>eligible couples bought extras</p>
              </div>
            </div>
            {c3Eligible > 0 && (
              <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: DARK_BORDER }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (c3WithAddons / c3Eligible) * 100)}%`, backgroundColor: GOLD }} />
              </div>
            )}
            <p className="text-sm" style={{ color: MUTED }}>
              Avg add-on amount: <span className="font-semibold" style={{ color: GOLD }}>{fmt(Math.round(c3AvgAmount))}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreCard({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: CHARCOAL, color: WHITE }}>
      <p className="text-xs uppercase tracking-wider mb-3 font-medium" style={{ color: MUTED, letterSpacing: '0.12em' }}>{label}</p>
      <p style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: highlight ? GOLD : WHITE }}>{value}</p>
      <p className="mt-2 text-xs" style={{ color: MUTED }}>{sub}</p>
    </div>
  )
}
