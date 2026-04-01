'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────

interface MilestoneRow {
  couple_id: string
  m06_eng_session_shot: boolean | null
  m06_declined: boolean | null
  m07_eng_photos_edited: boolean | null
  m08_eng_proofs_to_lab: boolean | null
  m09_eng_prints_picked_up: boolean | null
  m10_frame_sale_quote: boolean | null
  m11_sale_results_pdf: boolean | null
  m11_no_sale: boolean | null
  m12_eng_order_to_lab: boolean | null
  m13_eng_items_framed: boolean | null
  m14_eng_items_picked_up: boolean | null
}

interface ExtrasOrder {
  id: string
  couple_id: string
  total: number | null
  extras_sale_amount: number | null
  status: string | null
  order_date: string | null
  order_type: string | null
}

interface ClientExtra {
  couple_id: string
  id: string
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

// ── Engagement stage from milestones ─────────────────────────────────────────

function computeEngStage(m: MilestoneRow | undefined): string {
  if (!m || !m.m06_eng_session_shot) return 'Not Shot'
  if (m.m14_eng_items_picked_up) return 'Picked Up'
  if (m.m13_eng_items_framed) return 'Ready for Pickup'
  if (m.m12_eng_order_to_lab) return 'At Lab'
  if (m.m11_sale_results_pdf || m.m10_frame_sale_quote) return 'Pending Sale'
  if (m.m09_eng_prints_picked_up) return 'Pending Sale'
  if (m.m08_eng_proofs_to_lab) return 'At Lab'
  if (m.m07_eng_photos_edited) return 'Editing'
  return 'Editing'
}

function stageBadge(stage: string) {
  const styles: Record<string, string> = {
    'Editing': 'bg-blue-100 text-blue-700',
    'At Lab': 'bg-indigo-100 text-indigo-700',
    'Ready for Pickup': 'bg-teal-100 text-teal-700',
    'Pending Sale': 'bg-amber-100 text-amber-700',
    'Picked Up': 'bg-green-100 text-green-700',
    'Not Shot': 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[stage] || 'bg-gray-100 text-gray-600'}`}>
      {stage}
    </span>
  )
}

function c2StatusBadge(eo: ExtrasOrder | null) {
  if (!eo) return <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-500 px-2.5 py-0.5 text-xs font-medium">Not Quoted</span>
  const st = eo.status
  if (st === 'pending' || st === 'active')
    return <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-medium">Pending</span>
  if (st === 'signed' || st === 'paid' || st === 'confirmed')
    return <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium">Signed</span>
  if (st === 'completed')
    return <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-medium">Completed</span>
  if (st === 'declined' || st === 'no_sale')
    return <span className="inline-flex items-center rounded-full bg-red-100 text-red-600 px-2.5 py-0.5 text-xs font-medium">Declined</span>
  return <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-500 px-2.5 py-0.5 text-xs font-medium">{st}</span>
}

function c2ResultText(eo: ExtrasOrder | null): string {
  if (!eo) return 'No Record'
  const st = eo.status
  if (st === 'signed' || st === 'paid' || st === 'confirmed' || st === 'completed') {
    const amt = getSaleAmount(eo)
    return amt > 0 ? `Signed ${fmtMoney(amt)}` : 'Signed'
  }
  if (st === 'declined' || st === 'no_sale') return 'Declined'
  if (st === 'pending' || st === 'active') return 'Pending'
  return 'No Record'
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

// ── Sortable table header cell ───────────────────────────────────────────────

function SortTh({ field, label, sort, onSort, align = 'left' }: {
  field: SortField; label: string; sort: { field: SortField; dir: SortDir }; onSort: (f: SortField) => void; align?: 'left' | 'right' | 'center'
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

  // Raw data
  const [allCouples, setAllCouples] = useState<CoupleRaw[]>([])
  const [extrasOrders, setExtrasOrders] = useState<ExtrasOrder[]>([])
  const [milestones, setMilestones] = useState<MilestoneRow[]>([])
  const [clientExtras, setClientExtras] = useState<ClientExtra[]>([])

  // Previous year for YoY
  const [prevCouples, setPrevCouples] = useState<CoupleRaw[]>([])
  const [prevExtrasOrders, setPrevExtrasOrders] = useState<ExtrasOrder[]>([])

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [couplesRes, extrasRes, milestonesRes, clientExtrasRes, prevCouplesRes, prevExtrasRes] = await Promise.all([
        supabase.from('couples').select('id, couple_name, wedding_date, wedding_year, status, package_type')
          .in('wedding_year', [2025, 2026, 2027])
          .order('wedding_date', { ascending: true }),
        supabase.from('extras_orders').select('id, couple_id, total, extras_sale_amount, status, order_date, order_type'),
        supabase.from('couple_milestones').select('couple_id, m06_eng_session_shot, m06_declined, m07_eng_photos_edited, m08_eng_proofs_to_lab, m09_eng_prints_picked_up, m10_frame_sale_quote, m11_sale_results_pdf, m11_no_sale, m12_eng_order_to_lab, m13_eng_items_framed, m14_eng_items_picked_up'),
        supabase.from('client_extras').select('couple_id, id'),
        // Previous year data for YoY (2025)
        supabase.from('couples').select('id, couple_name, wedding_date, wedding_year, status, package_type')
          .eq('wedding_year', 2025),
        supabase.from('extras_orders').select('id, couple_id, total, extras_sale_amount, status, order_date, order_type'),
      ])

      setAllCouples(couplesRes.data || [])
      setExtrasOrders(extrasRes.data || [])
      setMilestones(milestonesRes.data || [])
      setClientExtras(clientExtrasRes.data || [])
      setPrevCouples(prevCouplesRes.data || [])
      setPrevExtrasOrders(prevExtrasRes.data || [])
    } catch (err) {
      console.error('[FrameSalesPage] fetch error:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Index maps ─────────────────────────────────────────────────────────────

  const milestonesMap = useMemo(() => {
    const m: Record<string, MilestoneRow> = {}
    for (const row of milestones) m[row.couple_id] = row
    return m
  }, [milestones])

  const extrasMap = useMemo(() => {
    const m: Record<string, ExtrasOrder> = {}
    // Prefer frames/frames_albums order_type
    for (const row of extrasOrders) {
      if (row.order_type && !['frames', 'frames_albums'].includes(row.order_type)) continue
      if (!m[row.couple_id]) m[row.couple_id] = row
    }
    for (const row of extrasOrders) {
      if (!m[row.couple_id]) m[row.couple_id] = row
    }
    return m
  }, [extrasOrders])

  const clientExtrasSet = useMemo(() => {
    const s = new Set<string>()
    for (const row of clientExtras) s.add(row.couple_id)
    return s
  }, [clientExtras])

  const prevExtrasMap = useMemo(() => {
    const m: Record<string, ExtrasOrder> = {}
    for (const row of prevExtrasOrders) {
      if (!m[row.couple_id]) m[row.couple_id] = row
    }
    return m
  }, [prevExtrasOrders])

  // ── 2026/2027 couples ──────────────────────────────────────────────────────

  const currentCouples = useMemo(() =>
    allCouples.filter(c => c.wedding_year === 2026 || c.wedding_year === 2027),
  [allCouples])

  const couples2025 = useMemo(() =>
    allCouples.filter(c => c.wedding_year === 2025),
  [allCouples])

  // ── Table 1: Active Pipeline ───────────────────────────────────────────────
  // Shot engagement, not fully complete, future wedding

  const today = new Date().toISOString().split('T')[0]

  const activePipeline = useMemo(() => {
    return currentCouples
      .filter(c => {
        const ms = milestonesMap[c.id]
        if (!ms?.m06_eng_session_shot) return false
        if (ms.m14_eng_items_picked_up) return false
        if (c.wedding_date && c.wedding_date < today) return false
        return true
      })
      .map(c => ({
        ...c,
        stage: computeEngStage(milestonesMap[c.id]),
        eo: extrasMap[c.id] || null,
        amount: getSaleAmount(extrasMap[c.id] || null),
      }))
  }, [currentCouples, milestonesMap, extrasMap, today])

  // ── Table 2: Completed ─────────────────────────────────────────────────────
  // Shot engagement AND items picked up

  const completed = useMemo(() => {
    return currentCouples
      .filter(c => {
        const ms = milestonesMap[c.id]
        return ms?.m06_eng_session_shot && ms?.m14_eng_items_picked_up
      })
      .map(c => {
        const eo = extrasMap[c.id] || null
        const amt = getSaleAmount(eo)
        const amtWithTax = Math.round(amt * 1.13)
        return { ...c, eo, amount: amt, amountWithTax: amtWithTax }
      })
  }, [currentCouples, milestonesMap, extrasMap])

  // ── Table 3: Upcoming Engagements (Not Yet Shot) ───────────────────────────

  const upcoming = useMemo(() => {
    return currentCouples
      .filter(c => {
        if (c.status !== 'booked') return false
        const ms = milestonesMap[c.id]
        if (ms?.m06_eng_session_shot) return false
        if (ms?.m06_declined) return false
        return true
      })
  }, [currentCouples, milestonesMap])

  // ── Table 4: Declined Engagement ───────────────────────────────────────────

  const declined = useMemo(() => {
    return currentCouples
      .filter(c => {
        const ms = milestonesMap[c.id]
        if (!ms?.m06_declined) return false
        if (c.wedding_date && c.wedding_date < today) return false
        return true
      })
      .map(c => ({ ...c, hasC3: clientExtrasSet.has(c.id) }))
  }, [currentCouples, milestonesMap, clientExtrasSet, today])

  // ── Table 5: 2025 Archive ─────────────────────────────────────────────────

  const archive2025 = useMemo(() => {
    return couples2025.map(c => {
      const ms = milestonesMap[c.id]
      const eo = extrasMap[c.id] || null
      const amt = getSaleAmount(eo)
      let engStatus = '—'
      if (ms?.m06_eng_session_shot) engStatus = '✅ Shot'
      else if (ms?.m06_declined) engStatus = '❌ Declined'
      return { ...c, ms, eo, engStatus, amount: amt, amountWithTax: Math.round(amt * 1.13) }
    })
  }, [couples2025, milestonesMap, extrasMap])

  // ── Sidebar stats ──────────────────────────────────────────────────────────

  const couples2026 = useMemo(() => allCouples.filter(c => c.wedding_year === 2026), [allCouples])

  const sidebarStats = useMemo(() => {
    const soldStatuses = ['signed', 'paid', 'completed', 'confirmed']
    const total2026 = couples2026.length
    const shotEng = couples2026.filter(c => milestonesMap[c.id]?.m06_eng_session_shot).length
    const c2Signed = couples2026.filter(c => {
      const eo = extrasMap[c.id]
      return eo && soldStatuses.includes(eo.status || '')
    }).length
    const c2Revenue = couples2026.reduce((sum, c) => {
      const eo = extrasMap[c.id]
      if (eo && soldStatuses.includes(eo.status || '')) return sum + getSaleAmount(eo)
      return sum
    }, 0)
    const avgSale = c2Signed > 0 ? Math.round(c2Revenue / c2Signed) : 0

    // Previous year (2025)
    const total2025 = prevCouples.length
    const prevShotEng = prevCouples.filter(c => milestonesMap[c.id]?.m06_eng_session_shot).length
    const prevC2Signed = prevCouples.filter(c => {
      const eo = prevExtrasMap[c.id]
      return eo && soldStatuses.includes(eo.status || '')
    }).length
    const prevC2Revenue = prevCouples.reduce((sum, c) => {
      const eo = prevExtrasMap[c.id]
      if (eo && soldStatuses.includes(eo.status || '')) return sum + getSaleAmount(eo)
      return sum
    }, 0)
    const prevAvgSale = prevC2Signed > 0 ? Math.round(prevC2Revenue / prevC2Signed) : 0
    const prevConvRate = total2025 > 0 ? Math.round((prevC2Signed / total2025) * 100) : 0
    const currConvRate = total2026 > 0 ? Math.round((c2Signed / total2026) * 100) : 0

    return {
      total2026, shotEng, c2Signed, c2Revenue, avgSale,
      total2025, prevC2Signed, prevC2Revenue, prevAvgSale, prevConvRate, currConvRate,
    }
  }, [couples2026, prevCouples, milestonesMap, extrasMap, prevExtrasMap])

  // ── Sort state for each table ──────────────────────────────────────────────

  const activePipelineSort = useSortableTable('wedding_date')
  const completedSort = useSortableTable('wedding_date')
  const upcomingSort = useSortableTable('wedding_date')
  const declinedSort = useSortableTable('wedding_date')
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
        <p className="text-muted-foreground">Engagement-to-sale pipeline tracking</p>
      </div>

      {/* Main + Sidebar layout */}
      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 space-y-8 pr-6 border-r border-border min-w-0">

          {/* ── Top Stat Boxes ─────────────────────────────────────────── */}
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-9 gap-3">
            {[
              { label: 'Total', value: String(sidebarStats.total2026), color: '' },
              { label: 'Shot', value: String(sidebarStats.shotEng), color: 'text-blue-600' },
              { label: 'Active', value: String(activePipeline.length), color: 'text-amber-600' },
              { label: 'Completed', value: String(completed.length), color: 'text-teal-600' },
              { label: 'Upcoming', value: String(upcoming.length), color: 'text-gray-500' },
              { label: 'Declined', value: String(declined.length), color: 'text-red-500' },
              { label: 'C2 Signed', value: String(sidebarStats.c2Signed), color: 'text-green-600' },
              { label: 'Revenue', value: fmtMoney(sidebarStats.c2Revenue), color: 'text-green-600' },
              { label: 'Avg Sale', value: fmtMoney(sidebarStats.avgSale), color: 'text-green-600' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border bg-card p-3 text-center">
                <div className="text-xs text-muted-foreground font-medium mb-1">{s.label}</div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* ── Table 1: Active Pipeline ───────────────────────────────── */}
          {activePipeline.length > 0 && (
            <CollapsibleSection title="Active Pipeline" count={activePipeline.length}>
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 font-medium text-left w-8">#</th>
                        <SortTh field="couple_name" label="Couple" sort={activePipelineSort.sort} onSort={activePipelineSort.handleSort} />
                        <SortTh field="wedding_date" label="Wedding Date" sort={activePipelineSort.sort} onSort={activePipelineSort.handleSort} />
                        <th className="p-3 font-medium text-center">Stage</th>
                        <th className="p-3 font-medium text-center">C2 Status</th>
                        <SortTh field="amount" label="Amount" sort={activePipelineSort.sort} onSort={activePipelineSort.handleSort} align="right" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortRows(activePipeline, activePipelineSort.sort).map((c, i) => (
                        <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                          <td className="p-3 text-muted-foreground">{i + 1}</td>
                          <td className="p-3 font-medium">
                            <Link href={`/admin/couples/${c.id}`} className="hover:underline">{c.couple_name}</Link>
                          </td>
                          <td className="p-3 whitespace-nowrap">{fmtDate(c.wedding_date)}</td>
                          <td className="p-3 text-center">{stageBadge(c.stage)}</td>
                          <td className="p-3 text-center">{c2StatusBadge(c.eo)}</td>
                          <td className="p-3 font-medium text-right">
                            {c.amount > 0 ? <span className="text-green-600">{fmtMoney(c.amount)}</span> : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* ── Table 2: Completed ─────────────────────────────────────── */}
          <CollapsibleSection title="Completed" count={completed.length}>
            {completed.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed engagement cycles yet.</p>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 font-medium text-left w-8">#</th>
                        <SortTh field="couple_name" label="Couple" sort={completedSort.sort} onSort={completedSort.handleSort} />
                        <SortTh field="wedding_date" label="Wedding Date" sort={completedSort.sort} onSort={completedSort.handleSort} />
                        <th className="p-3 font-medium text-left">C2 Result</th>
                        <SortTh field="amount" label="Amount + Tax" sort={completedSort.sort} onSort={completedSort.handleSort} align="right" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortRows(completed, completedSort.sort).map((c, i) => (
                        <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                          <td className="p-3 text-muted-foreground">{i + 1}</td>
                          <td className="p-3 font-medium">
                            <Link href={`/admin/couples/${c.id}`} className="hover:underline">{c.couple_name}</Link>
                          </td>
                          <td className="p-3 whitespace-nowrap">{fmtDate(c.wedding_date)}</td>
                          <td className="p-3">{c2StatusBadge(c.eo)}<span className="ml-2 text-muted-foreground">{c.amount > 0 ? fmtMoney(c.amount) : ''}</span></td>
                          <td className="p-3 font-medium text-right">
                            {c.amountWithTax > 0 ? <span className="text-green-600">{fmtMoney(c.amountWithTax)}</span> : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {completed.some(c => c.amount > 0) && (
                      <tfoot>
                        <tr className="border-t-2 bg-muted/30 font-semibold">
                          <td className="p-3" colSpan={4}>Total</td>
                          <td className="p-3 text-green-600 text-right">
                            {fmtMoney(completed.reduce((s, c) => s + c.amountWithTax, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </CollapsibleSection>

          {/* ── Table 3: Upcoming Engagements ──────────────────────────── */}
          {upcoming.length > 0 && (
            <CollapsibleSection title="Upcoming Engagements" count={upcoming.length}>
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
                      {sortRows(upcoming, upcomingSort.sort).map((c, i) => (
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
            </CollapsibleSection>
          )}

          {/* ── Table 4: Declined Engagement ───────────────────────────── */}
          {declined.length > 0 && (
            <CollapsibleSection title="Declined Engagement" count={declined.length} defaultOpen={false}>
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 font-medium text-left w-8">#</th>
                        <SortTh field="couple_name" label="Couple" sort={declinedSort.sort} onSort={declinedSort.handleSort} />
                        <SortTh field="wedding_date" label="Wedding Date" sort={declinedSort.sort} onSort={declinedSort.handleSort} />
                        <th className="p-3 font-medium text-center">C3 Purchased?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortRows(declined, declinedSort.sort).map((c, i) => (
                        <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                          <td className="p-3 text-muted-foreground">{i + 1}</td>
                          <td className="p-3 font-medium">
                            <Link href={`/admin/couples/${c.id}`} className="hover:underline">{c.couple_name}</Link>
                          </td>
                          <td className="p-3 whitespace-nowrap">{fmtDate(c.wedding_date)}</td>
                          <td className="p-3 text-center">
                            {c.hasC3
                              ? <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium">Yes</span>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* ── Table 5: 2025 Archive ──────────────────────────────────── */}
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
                        <th className="p-3 font-medium text-left">Engagement</th>
                        <th className="p-3 font-medium text-left">C2 Result</th>
                        <th className="p-3 font-medium text-right">Amount</th>
                        <SortTh field="amount" label="With Tax" sort={archiveSort.sort} onSort={archiveSort.handleSort} align="right" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortRows(archive2025.map(c => ({ ...c, amount: c.amount })), archiveSort.sort).map((c, i) => (
                        <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                          <td className="p-3 text-muted-foreground">{i + 1}</td>
                          <td className="p-3 font-medium">
                            <Link href={`/admin/couples/${c.id}`} className="hover:underline">{c.couple_name}</Link>
                          </td>
                          <td className="p-3 whitespace-nowrap">{fmtDate(c.wedding_date)}</td>
                          <td className="p-3">{c.engStatus}</td>
                          <td className="p-3">{c2StatusBadge(c.eo)} <span className="text-muted-foreground ml-1">{c2ResultText(c.eo)}</span></td>
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
                          <td className="p-3" colSpan={5}>Total</td>
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
        <aside className="w-[280px] shrink-0 p-6 hidden lg:block">
          <div className="space-y-6">

            {/* Stats Cards */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">2026 Stats</h3>
              <div className="space-y-3">
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Total Couples</div>
                  <div className="text-2xl font-bold">{sidebarStats.total2026}</div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Shot Engagement</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {sidebarStats.shotEng}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      ({sidebarStats.total2026 > 0 ? Math.round((sidebarStats.shotEng / sidebarStats.total2026) * 100) : 0}%)
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">C2 Signed</div>
                  <div className="text-2xl font-bold text-green-600">
                    {sidebarStats.c2Signed}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      ({sidebarStats.total2026 > 0 ? Math.round((sidebarStats.c2Signed / sidebarStats.total2026) * 100) : 0}%)
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">C2 Revenue</div>
                  <div className="text-2xl font-bold text-green-600">{fmtMoney(sidebarStats.c2Revenue)}</div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Average Sale</div>
                  <div className="text-2xl font-bold">{fmtMoney(sidebarStats.avgSale)}</div>
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
                    {sidebarStats.currConvRate}%
                    <span className="text-muted-foreground font-normal"> vs {sidebarStats.prevConvRate}%</span>
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Avg Sale</span>
                  <span className="font-medium">
                    {fmtMoney(sidebarStats.avgSale)}
                    <span className="text-muted-foreground font-normal"> vs {fmtMoney(sidebarStats.prevAvgSale)}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium">
                    {fmtMoney(sidebarStats.c2Revenue)}
                    <span className="text-muted-foreground font-normal"> vs {fmtMoney(sidebarStats.prevC2Revenue)}</span>
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
