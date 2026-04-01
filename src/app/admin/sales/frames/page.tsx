'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────

interface ExtrasOrder {
  id: string
  couple_id: string
  total: number | null
  extras_sale_amount: number | null
  status: string | null
  order_date: string | null
  order_type: string | null
}

interface CoupleRaw {
  id: string
  couple_name: string
  wedding_date: string | null
  wedding_year: number | null
  status: string | null
  package_type: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function getSaleAmount(eo: ExtrasOrder | null): number {
  if (!eo) return 0
  return Number(eo.extras_sale_amount) || Number(eo.total) || 0
}

function formatPackage(pkg: string | null): string {
  if (!pkg) return '—'
  if (pkg === 'photo_only') return 'Photo Only'
  if (pkg === 'photo_video') return 'Photo + Video'
  return pkg
}

const SOLD_STATUSES = ['signed', 'paid', 'completed']

// ── Status badges ────────────────────────────────────────────────────────────

function c2StatusBadge(status: string | null) {
  switch (status) {
    case 'pending': case 'active':
      return <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-medium">Pending</span>
    case 'signed':
      return <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium">Signed</span>
    case 'paid':
      return <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium">Paid</span>
    case 'confirmed':
      return <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium">Confirmed</span>
    case 'completed':
      return <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-medium">Completed</span>
    case 'declined': case 'no_sale':
      return <span className="inline-flex items-center rounded-full bg-red-100 text-red-600 px-2.5 py-0.5 text-xs font-medium">Declined</span>
    default:
      return <span className="text-muted-foreground">—</span>
  }
}

function c2ResultDisplay(eo: ExtrasOrder | null) {
  if (!eo) return <span className="text-muted-foreground">No Record</span>
  const amt = getSaleAmount(eo)
  const st = eo.status
  if (st === 'signed' || st === 'paid' || st === 'confirmed') {
    return <>{c2StatusBadge(st)}{amt > 0 && <span className="ml-2 text-green-600 font-medium">{fmtMoney(amt)}</span>}</>
  }
  if (st === 'completed') {
    return <>{c2StatusBadge(st)}{amt > 0 && <span className="ml-2 text-blue-600 font-medium">{fmtMoney(amt)}</span>}</>
  }
  if (st === 'declined' || st === 'no_sale') return c2StatusBadge(st)
  if (st === 'pending' || st === 'active') return c2StatusBadge(st)
  return <span className="text-muted-foreground">No Record</span>
}

// ── Sort helpers ─────────────────────────────────────────────────────────────

type SortField = 'couple_name' | 'wedding_date' | 'amount'
type SortDir = 'asc' | 'desc'

function useSortableTable(defaultField: SortField = 'wedding_date') {
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: defaultField, dir: 'asc' })
  const handleSort = (field: SortField) => {
    setSort(prev => prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' })
  }
  return { sort, handleSort }
}

function SortIcon({ field, sort }: { field: SortField; sort: { field: SortField; dir: SortDir } }) {
  if (sort.field !== field) return <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
  return sort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
}

function sortRows<T extends { couple_name: string; wedding_date: string | null; amount?: number }>(
  rows: T[], sort: { field: SortField; dir: SortDir }
): T[] {
  return [...rows].sort((a, b) => {
    let cmp = 0
    switch (sort.field) {
      case 'couple_name': cmp = a.couple_name.localeCompare(b.couple_name); break
      case 'wedding_date': cmp = (a.wedding_date || '').localeCompare(b.wedding_date || ''); break
      case 'amount': cmp = (a.amount || 0) - (b.amount || 0); break
    }
    return sort.dir === 'asc' ? cmp : -cmp
  })
}

// ── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({ title, count, defaultOpen = true, children }: {
  title: string; count: number; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 w-full text-left mb-3">
        <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">({count})</span>
      </button>
      {open && children}
    </div>
  )
}

// ── Sortable table header ────────────────────────────────────────────────────

function SortTh({ field, label, sort, onSort, align = 'left' }: {
  field: SortField; label: string; sort: { field: SortField; dir: SortDir }; onSort: (f: SortField) => void; align?: 'left' | 'right'
}) {
  return (
    <th className={`p-3 font-medium text-${align}`}>
      <button onClick={() => onSort(field)} className={`group flex items-center gap-1 hover:text-foreground ${align === 'right' ? 'justify-end w-full' : ''}`}>
        {label} <SortIcon field={field} sort={sort} />
      </button>
    </th>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function FrameSalesPage() {
  const [loading, setLoading] = useState(true)

  const [allCouples, setAllCouples] = useState<CoupleRaw[]>([])
  const [extrasOrders, setExtrasOrders] = useState<ExtrasOrder[]>([])

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [couplesRes, extrasRes] = await Promise.all([
        supabase.from('couples').select('id, couple_name, wedding_date, wedding_year, status, package_type')
          .in('wedding_year', [2025, 2026, 2027])
          .order('wedding_date', { ascending: true }),
        supabase.from('extras_orders').select('id, couple_id, total, extras_sale_amount, status, order_date, order_type')
          .in('order_type', ['frames', 'frames_albums']),
      ])

      setAllCouples(couplesRes.data || [])
      setExtrasOrders(extrasRes.data || [])
    } catch (err) {
      console.error('[FrameSalesPage] fetch error:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Index: extras_orders by couple_id ──────────────────────────────────────

  const extrasMap = useMemo(() => {
    const m: Record<string, ExtrasOrder> = {}
    for (const row of extrasOrders) {
      if (!m[row.couple_id]) m[row.couple_id] = row
    }
    return m
  }, [extrasOrders])

  // ── Year slices ────────────────────────────────────────────────────────────

  const couples2026 = useMemo(() => allCouples.filter(c => c.wedding_year === 2026), [allCouples])
  const couples2027 = useMemo(() => allCouples.filter(c => c.wedding_year === 2027 && c.status === 'booked'), [allCouples])
  const couples2025 = useMemo(() => allCouples.filter(c => c.wedding_year === 2025), [allCouples])

  // ── Table 1: 2026 C2 Pipeline (have extras_orders record) ─────────────────

  const pipeline2026 = useMemo(() => {
    return couples2026
      .filter(c => !!extrasMap[c.id])
      .map(c => {
        const eo = extrasMap[c.id]
        const amt = getSaleAmount(eo)
        return { ...c, eo, amount: amt, amountWithTax: Math.round(amt * 113) / 100 }
      })
  }, [couples2026, extrasMap])

  // ── Table 2: 2026 Not Yet Quoted (no extras_orders record) ────────────────

  const notQuoted2026 = useMemo(() => {
    return couples2026.filter(c => c.status === 'booked' && !extrasMap[c.id])
  }, [couples2026, extrasMap])

  // ── Table 4: 2025 Archive ─────────────────────────────────────────────────

  const archive2025 = useMemo(() => {
    return couples2025.map(c => {
      const eo = extrasMap[c.id] || null
      const amt = getSaleAmount(eo)
      return { ...c, eo, amount: amt, amountWithTax: Math.round(amt * 113) / 100 }
    })
  }, [couples2025, extrasMap])

  // ── Sidebar stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    // 2026
    const total2026 = couples2026.filter(c => c.status === 'booked').length
    const c2Quoted = pipeline2026.length
    const c2Signed = pipeline2026.filter(c => SOLD_STATUSES.includes(c.eo?.status || '')).length
    const c2SignedPct = c2Quoted > 0 ? Math.round((c2Signed / c2Quoted) * 100) : 0
    const c2Revenue = pipeline2026
      .filter(c => SOLD_STATUSES.includes(c.eo?.status || ''))
      .reduce((s, c) => s + c.amount, 0)
    const avgSale = c2Signed > 0 ? Math.round(c2Revenue / c2Signed) : 0

    // 2025
    const total2025 = couples2025.length
    const prev2025Pipeline = archive2025.filter(c => c.eo)
    const prevC2Quoted = prev2025Pipeline.length
    const prevC2Signed = prev2025Pipeline.filter(c => SOLD_STATUSES.includes(c.eo?.status || '')).length
    const prevConvRate = prevC2Quoted > 0 ? Math.round((prevC2Signed / prevC2Quoted) * 100) : 0
    const prevC2Revenue = prev2025Pipeline
      .filter(c => SOLD_STATUSES.includes(c.eo?.status || ''))
      .reduce((s, c) => s + c.amount, 0)
    const prevAvgSale = prevC2Signed > 0 ? Math.round(prevC2Revenue / prevC2Signed) : 0

    return {
      total2026, c2Quoted, c2Signed, c2SignedPct, c2Revenue, avgSale,
      prevC2Signed, prevConvRate, prevC2Revenue, prevAvgSale,
    }
  }, [couples2026, couples2025, pipeline2026, archive2025])

  // ── Sort state ─────────────────────────────────────────────────────────────

  const pipelineSort = useSortableTable('wedding_date')
  const notQuotedSort = useSortableTable('wedding_date')
  const upcomingSort = useSortableTable('wedding_date')
  const archiveSort = useSortableTable('wedding_date')

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Frame & Album Sales</h1>
        <p className="text-muted-foreground">C2 engagement upsell tracking</p>
      </div>

      {/* ── Top 9 Stat Boxes ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-9 gap-3 mb-8">
        {[
          { label: 'Total', value: String(stats.total2026), color: '' },
          { label: 'C2 Quoted', value: String(stats.c2Quoted), color: 'text-amber-600' },
          { label: 'C2 Signed', value: String(stats.c2Signed), color: 'text-green-600' },
          { label: 'Signed %', value: `${stats.c2SignedPct}%`, color: 'text-green-600' },
          { label: 'Not Quoted', value: String(notQuoted2026.length), color: 'text-gray-500' },
          { label: '2027', value: String(couples2027.length), color: 'text-gray-500' },
          { label: 'Revenue', value: fmtMoney(stats.c2Revenue), color: 'text-green-600' },
          { label: 'Avg Sale', value: fmtMoney(stats.avgSale), color: 'text-green-600' },
          { label: '2025 Archive', value: String(archive2025.length), color: '' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-card p-3 text-center">
            <div className="text-xs text-muted-foreground font-medium mb-1">{s.label}</div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Main + Sidebar */}
      <div className="flex">
        {/* Left — Tables */}
        <div className="flex-1 space-y-8 pr-6 border-r border-border min-w-0">

          {/* ── Table 1: 2026 C2 Pipeline ──────────────────────────────── */}
          <CollapsibleSection title="2026 C2 Pipeline" count={pipeline2026.length}>
            {pipeline2026.length === 0 ? (
              <p className="text-sm text-muted-foreground">No C2 quotes for 2026 yet.</p>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 font-medium text-left w-8">#</th>
                        <SortTh field="couple_name" label="Couple" sort={pipelineSort.sort} onSort={pipelineSort.handleSort} />
                        <SortTh field="wedding_date" label="Wedding Date" sort={pipelineSort.sort} onSort={pipelineSort.handleSort} />
                        <th className="p-3 font-medium text-center">C2 Status</th>
                        <SortTh field="amount" label="Amount" sort={pipelineSort.sort} onSort={pipelineSort.handleSort} align="right" />
                        <th className="p-3 font-medium text-right">With Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortRows(pipeline2026, pipelineSort.sort).map((c, i) => (
                        <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                          <td className="p-3 text-muted-foreground">{i + 1}</td>
                          <td className="p-3 font-medium">
                            <Link href={`/admin/couples/${c.id}`} className="hover:underline">{c.couple_name}</Link>
                          </td>
                          <td className="p-3 whitespace-nowrap">{fmtDate(c.wedding_date)}</td>
                          <td className="p-3 text-center">{c2StatusBadge(c.eo?.status)}</td>
                          <td className="p-3 font-medium text-right">
                            {c.amount > 0 ? fmtMoney(c.amount) : '—'}
                          </td>
                          <td className="p-3 font-medium text-right">
                            {c.amountWithTax > 0 ? <span className="text-green-600">{fmtMoney(c.amountWithTax)}</span> : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {pipeline2026.some(c => c.amount > 0) && (
                      <tfoot>
                        <tr className="border-t-2 bg-muted/30 font-semibold">
                          <td className="p-3" colSpan={4}>Total</td>
                          <td className="p-3 text-right">{fmtMoney(pipeline2026.reduce((s, c) => s + c.amount, 0))}</td>
                          <td className="p-3 text-green-600 text-right">{fmtMoney(pipeline2026.reduce((s, c) => s + c.amountWithTax, 0))}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </CollapsibleSection>

          {/* ── Table 2: 2026 Not Yet Quoted ────────────────────────────── */}
          <CollapsibleSection title="2026 Not Yet Quoted" count={notQuoted2026.length}>
            {notQuoted2026.length === 0 ? (
              <p className="text-sm text-muted-foreground">All 2026 couples have been quoted.</p>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 font-medium text-left w-8">#</th>
                        <SortTh field="couple_name" label="Couple" sort={notQuotedSort.sort} onSort={notQuotedSort.handleSort} />
                        <SortTh field="wedding_date" label="Wedding Date" sort={notQuotedSort.sort} onSort={notQuotedSort.handleSort} />
                        <th className="p-3 font-medium text-left">Package</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortRows(notQuoted2026, notQuotedSort.sort).map((c, i) => (
                        <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                          <td className="p-3 text-muted-foreground">{i + 1}</td>
                          <td className="p-3 font-medium">
                            <Link href={`/admin/couples/${c.id}`} className="hover:underline">{c.couple_name}</Link>
                          </td>
                          <td className="p-3 whitespace-nowrap">{fmtDate(c.wedding_date)}</td>
                          <td className="p-3 text-muted-foreground">{formatPackage(c.package_type)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CollapsibleSection>

          {/* ── Table 3: 2027 Upcoming ──────────────────────────────────── */}
          <CollapsibleSection title="2027 Upcoming" count={couples2027.length}>
            {couples2027.length === 0 ? (
              <p className="text-sm text-muted-foreground">No 2027 couples yet.</p>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 font-medium text-left w-8">#</th>
                        <SortTh field="couple_name" label="Couple" sort={upcomingSort.sort} onSort={upcomingSort.handleSort} />
                        <SortTh field="wedding_date" label="Wedding Date" sort={upcomingSort.sort} onSort={upcomingSort.handleSort} />
                        <th className="p-3 font-medium text-left">Package</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortRows(couples2027, upcomingSort.sort).map((c, i) => (
                        <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                          <td className="p-3 text-muted-foreground">{i + 1}</td>
                          <td className="p-3 font-medium">
                            <Link href={`/admin/couples/${c.id}`} className="hover:underline">{c.couple_name}</Link>
                          </td>
                          <td className="p-3 whitespace-nowrap">{fmtDate(c.wedding_date)}</td>
                          <td className="p-3 text-muted-foreground">{formatPackage(c.package_type)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CollapsibleSection>

          {/* ── Table 4: 2025 Archive ──────────────────────────────────── */}
          <CollapsibleSection title="2025 Archive" count={archive2025.length} defaultOpen={false}>
            {archive2025.length === 0 ? (
              <p className="text-sm text-muted-foreground">No 2025 couples.</p>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: 700 }}>
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 font-medium text-left w-8">#</th>
                        <SortTh field="couple_name" label="Couple" sort={archiveSort.sort} onSort={archiveSort.handleSort} />
                        <SortTh field="wedding_date" label="Wedding Date" sort={archiveSort.sort} onSort={archiveSort.handleSort} />
                        <th className="p-3 font-medium text-left">C2 Result</th>
                        <th className="p-3 font-medium text-right">Amount</th>
                        <SortTh field="amount" label="With Tax" sort={archiveSort.sort} onSort={archiveSort.handleSort} align="right" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortRows(archive2025, archiveSort.sort).map((c, i) => (
                        <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                          <td className="p-3 text-muted-foreground">{i + 1}</td>
                          <td className="p-3 font-medium">
                            <Link href={`/admin/couples/${c.id}`} className="hover:underline">{c.couple_name}</Link>
                          </td>
                          <td className="p-3 whitespace-nowrap">{fmtDate(c.wedding_date)}</td>
                          <td className="p-3">{c2ResultDisplay(c.eo)}</td>
                          <td className="p-3 text-right">{c.amount > 0 ? fmtMoney(c.amount) : '—'}</td>
                          <td className="p-3 font-medium text-right">
                            {c.amountWithTax > 0 ? <span className="text-green-600">{fmtMoney(c.amountWithTax)}</span> : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {archive2025.some(c => c.amount > 0) && (
                      <tfoot>
                        <tr className="border-t-2 bg-muted/30 font-semibold">
                          <td className="p-3" colSpan={4}>Total</td>
                          <td className="p-3 text-right">{fmtMoney(archive2025.reduce((s, c) => s + c.amount, 0))}</td>
                          <td className="p-3 text-green-600 text-right">{fmtMoney(archive2025.reduce((s, c) => s + c.amountWithTax, 0))}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </CollapsibleSection>

        </div>

        {/* ── Right Sidebar ─────────────────────────────────────────────── */}
        <aside className="w-72 shrink-0 p-6 hidden lg:block">
          <div className="space-y-6">

            {/* 2026 Stats */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">2026 Stats</h3>
              <div className="space-y-3">
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Total Couples</div>
                  <div className="text-2xl font-bold">{stats.total2026}</div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">C2 Quoted</div>
                  <div className="text-2xl font-bold text-amber-600">{stats.c2Quoted}</div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">C2 Signed</div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.c2Signed}
                    <span className="text-sm font-normal text-muted-foreground ml-1">({stats.c2SignedPct}%)</span>
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">C2 Revenue</div>
                  <div className="text-2xl font-bold text-green-600">{fmtMoney(stats.c2Revenue)}</div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Average Sale</div>
                  <div className="text-2xl font-bold">{fmtMoney(stats.avgSale)}</div>
                </div>
              </div>
            </div>

            {/* YoY Comparison */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">2026 vs 2025</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Conversion</span>
                  <span className="font-medium">
                    <span className={stats.c2SignedPct > stats.prevConvRate ? 'text-green-600' : stats.c2SignedPct < stats.prevConvRate ? 'text-red-500' : ''}>
                      {stats.c2SignedPct}%
                    </span>
                    <span className="text-muted-foreground font-normal"> vs {stats.prevConvRate}%</span>
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Avg Sale</span>
                  <span className="font-medium">
                    <span className={stats.avgSale > stats.prevAvgSale ? 'text-green-600' : stats.avgSale < stats.prevAvgSale ? 'text-red-500' : ''}>
                      {fmtMoney(stats.avgSale)}
                    </span>
                    <span className="text-muted-foreground font-normal"> vs {fmtMoney(stats.prevAvgSale)}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium">
                    <span className={stats.c2Revenue > stats.prevC2Revenue ? 'text-green-600' : stats.c2Revenue < stats.prevC2Revenue ? 'text-red-500' : ''}>
                      {fmtMoney(stats.c2Revenue)}
                    </span>
                    <span className="text-muted-foreground font-normal"> vs {fmtMoney(stats.prevC2Revenue)}</span>
                  </span>
                </div>
              </div>
            </div>

          </div>
        </aside>
      </div>
    </div>
  )
}
