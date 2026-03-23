'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronUp, ChevronDown, ChevronRight, DollarSign, Clock, XCircle, CheckCircle, AlertCircle, Flame } from 'lucide-react'
import { format, parseISO } from 'date-fns'

// ── Interfaces ──────────────────────────────────────────────────────────────

interface MilestoneRow {
  couple_id: string
  m06_eng_session_shot: boolean
  m06_declined: boolean
  m10_frame_sale_quote: boolean
  m11_sale_results_pdf: boolean
  m11_no_sale: boolean
}

interface ExtrasOrder {
  couple_id: string
  total: number | null
  status: string | null
  items: any[] | null
  album_qty: number | null
  album_cover: string | null
  collage_size: string | null
  collage_type: string | null
  collage_frame_color: string | null
  signing_book: boolean | null
  wedding_frame_size: string | null
  wedding_frame_style: string | null
  eng_portrait_size: string | null
  extras_sale_amount: number | null
}

interface ClientExtra {
  couple_id: string
  item_type: string
  total: number | null
}

interface CoupleRow {
  id: string
  couple_name: string
  wedding_date: string | null
  wedding_year: number | null
  package_type: string | null
  eng_pipeline: string
  extras_order: ExtrasOrder | null
  hires_total: number
  client_extras_total: number
  client_extras_items: string[]
}

type SortField = 'couple_name' | 'wedding_date' | 'sale_amount' | 'package_type'
type SortDir = 'asc' | 'desc'

// ── Pipeline Logic ──────────────────────────────────────────────────────────

function computeEngPipeline(m: MilestoneRow | undefined): string {
  if (!m) return 'pending'
  if (m.m06_declined) return 'declined'
  if (!m.m06_eng_session_shot) return 'pending'
  if (!m.m10_frame_sale_quote) return 'shot'
  if (m.m11_no_sale) return 'no_sale'
  if (m.m11_sale_results_pdf) return 'sold'
  return 'quoted'
}

function engBadge(state: string) {
  switch (state) {
    case 'pending':
      return <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-medium">Pending</span>
    case 'declined':
      return <span className="inline-flex items-center rounded-full bg-red-50 text-red-600 px-2 py-0.5 text-xs font-medium">Declined</span>
    case 'shot':
      return <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 text-xs font-medium">Shot</span>
    case 'quoted':
      return <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-600 px-2 py-0.5 text-xs font-medium">Quoted</span>
    case 'no_sale':
      return <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-400 px-2 py-0.5 text-xs font-medium line-through">No Sale</span>
    case 'sold':
      return <span className="inline-flex items-center rounded-full bg-green-50 text-green-600 px-2 py-0.5 text-xs font-medium">Sold</span>
    default:
      return null
  }
}

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

function formatPackage(pkg: string | null): string {
  if (!pkg) return '\u2014'
  if (pkg === 'photo_only') return 'Photo Only'
  if (pkg === 'photo_video') return 'Photo + Video'
  return pkg
}

// Extract detail from extras_order — use individual columns first, fallback to items JSONB
function getCollageDisplay(o: ExtrasOrder | null): string {
  if (!o) return '\u2014'
  if (o.collage_size) {
    const parts = [o.collage_size]
    if (o.collage_type) parts.push(o.collage_type)
    if (o.collage_frame_color) parts.push(o.collage_frame_color)
    return parts.join(' ')
  }
  // Fallback: search items JSONB
  if (o.items) {
    const item = o.items.find((i: any) => /collage/i.test(i.name || i.description || ''))
    if (item) return item.description || item.name || '\u2014'
  }
  return '\u2014'
}

function getSignBookDisplay(o: ExtrasOrder | null): string {
  if (!o) return '\u2014'
  if (o.signing_book === true) return '\u2713'
  if (o.signing_book === false) return '\u2014'
  // Fallback: search items JSONB
  if (o.items) {
    const item = o.items.find((i: any) => /sign/i.test(i.name || i.description || ''))
    if (item) return '\u2713'
  }
  return '\u2014'
}

function getAlbumDisplay(o: ExtrasOrder | null): string {
  if (!o) return '\u2014'
  if (o.album_qty && o.album_qty > 0) {
    const parts = [`${o.album_qty}`]
    if (o.album_cover) parts.push(o.album_cover)
    return parts.join(' ')
  }
  if (o.items) {
    const item = o.items.find((i: any) => /album/i.test(i.name || i.description || ''))
    if (item) return item.description || item.name || '\u2014'
  }
  return '\u2014'
}

function getWedFrameDisplay(o: ExtrasOrder | null): string {
  if (!o) return '\u2014'
  if (o.wedding_frame_size) {
    const parts = [o.wedding_frame_size]
    if (o.wedding_frame_style) parts.push(o.wedding_frame_style)
    return parts.join(' ')
  }
  if (o.items) {
    const item = o.items.find((i: any) => /frame|portrait/i.test(i.name || i.description || ''))
    if (item) return item.description || item.name || '\u2014'
  }
  return '\u2014'
}

function getSaleAmount(o: ExtrasOrder | null): number {
  if (!o) return 0
  return o.extras_sale_amount || o.total || 0
}

// ── Collapsible Section ─────────────────────────────────────────────────────

function CollapsibleSection({ title, defaultOpen = true, count, children }: {
  title: string
  defaultOpen?: boolean
  count: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full text-left mb-3"
      >
        <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">({count})</span>
      </button>
      {open && children}
    </div>
  )
}

// ── Sort helpers ────────────────────────────────────────────────────────────

const YEARS = [2027, 2026, 2025]

// ── Main Component ──────────────────────────────────────────────────────────

export default function FramesAlbumsPage() {
  const [couples, setCouples] = useState<CoupleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')

  // Sort state per section
  const [soldSort, setSoldSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'wedding_date', dir: 'asc' })

  useEffect(() => {
    const fetchData = async () => {
      const [couplesRes, extrasRes, clientExtrasRes, milestonesRes] = await Promise.all([
        supabase
          .from('couples')
          .select('id, couple_name, wedding_date, wedding_year, package_type')
          .gte('wedding_date', '2025-01-01')
          .order('wedding_date', { ascending: true }),
        supabase
          .from('extras_orders')
          .select('*'),
        supabase
          .from('client_extras')
          .select('couple_id, item_type, total'),
        supabase
          .from('couple_milestones')
          .select('couple_id, m06_eng_session_shot, m06_declined, m10_frame_sale_quote, m11_sale_results_pdf, m11_no_sale'),
      ])

      // Index milestones
      const milestonesMap: Record<string, MilestoneRow> = {}
      if (milestonesRes.data) {
        for (const row of milestonesRes.data as MilestoneRow[]) {
          milestonesMap[row.couple_id] = row
        }
      }

      // Index extras_orders by couple_id (take first)
      const extrasMap: Record<string, ExtrasOrder> = {}
      if (extrasRes.data) {
        for (const row of extrasRes.data as ExtrasOrder[]) {
          if (!extrasMap[row.couple_id]) {
            extrasMap[row.couple_id] = row
          }
        }
      }

      // Index client_extras by couple_id
      const hiresMap: Record<string, number> = {}
      const clientExtrasTotalMap: Record<string, number> = {}
      const clientExtrasItemsMap: Record<string, string[]> = {}
      if (clientExtrasRes.data) {
        for (const row of clientExtrasRes.data as ClientExtra[]) {
          // Hi-res total
          if (row.item_type === 'Hi Res Files') {
            hiresMap[row.couple_id] = (hiresMap[row.couple_id] || 0) + (Number(row.total) || 0)
          }
          // All extras total
          clientExtrasTotalMap[row.couple_id] = (clientExtrasTotalMap[row.couple_id] || 0) + (Number(row.total) || 0)
          // Unique item types
          if (!clientExtrasItemsMap[row.couple_id]) clientExtrasItemsMap[row.couple_id] = []
          if (!clientExtrasItemsMap[row.couple_id].includes(row.item_type)) {
            clientExtrasItemsMap[row.couple_id].push(row.item_type)
          }
        }
      }

      if (!couplesRes.error && couplesRes.data) {
        setCouples(couplesRes.data.map((c: any) => ({
          id: c.id,
          couple_name: c.couple_name,
          wedding_date: c.wedding_date,
          wedding_year: c.wedding_year,
          package_type: c.package_type,
          eng_pipeline: computeEngPipeline(milestonesMap[c.id]),
          extras_order: extrasMap[c.id] || null,
          hires_total: hiresMap[c.id] || 0,
          client_extras_total: clientExtrasTotalMap[c.id] || 0,
          client_extras_items: clientExtrasItemsMap[c.id] || [],
        })))
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  // Apply year filter
  const filtered = useMemo(() => {
    if (yearFilter === 'all') return couples
    return couples.filter(c => c.wedding_year === yearFilter)
  }, [couples, yearFilter])

  // Pipeline groups
  const quoted = useMemo(() => filtered.filter(c => c.eng_pipeline === 'quoted'), [filtered])
  const pending = useMemo(() => filtered.filter(c => c.eng_pipeline === 'pending').sort((a, b) => (a.wedding_date || '').localeCompare(b.wedding_date || '')), [filtered])
  const shot = useMemo(() => filtered.filter(c => c.eng_pipeline === 'shot'), [filtered])
  const sold = useMemo(() => filtered.filter(c => c.eng_pipeline === 'sold' && c.extras_order && getSaleAmount(c.extras_order) > 0), [filtered])
  const declined = useMemo(() => filtered.filter(c => c.eng_pipeline === 'declined' || c.eng_pipeline === 'no_sale'), [filtered])
  const extrasOnly = useMemo(() => filtered.filter(c => c.eng_pipeline === 'sold' && (!c.extras_order || getSaleAmount(c.extras_order) === 0) && c.client_extras_total > 0), [filtered])

  // Stats
  const stats = useMemo(() => {
    const allSold = filtered.filter(c => c.eng_pipeline === 'sold')
    const allQuoted = filtered.filter(c => c.eng_pipeline === 'quoted')
    const allPending = filtered.filter(c => c.eng_pipeline === 'pending')
    const allDeclined = filtered.filter(c => c.eng_pipeline === 'declined')
    const allNoSale = filtered.filter(c => c.eng_pipeline === 'no_sale')
    const revenue = filtered.reduce((sum, c) => {
      if (c.extras_order && c.extras_order.status !== 'pending') {
        return sum + getSaleAmount(c.extras_order)
      }
      return sum
    }, 0)
    return {
      sold: allSold.length,
      quoted: allQuoted.length,
      pending: allPending.length,
      declined: allDeclined.length,
      noSale: allNoSale.length,
      revenue,
    }
  }, [filtered])

  // Sorted sold list
  const sortedSold = useMemo(() => {
    return [...sold].sort((a, b) => {
      let cmp = 0
      switch (soldSort.field) {
        case 'couple_name':
          cmp = a.couple_name.localeCompare(b.couple_name)
          break
        case 'wedding_date':
          cmp = (a.wedding_date || '').localeCompare(b.wedding_date || '')
          break
        case 'sale_amount':
          cmp = getSaleAmount(a.extras_order) - getSaleAmount(b.extras_order)
          break
        case 'package_type':
          cmp = (a.package_type || '').localeCompare(b.package_type || '')
          break
      }
      return soldSort.dir === 'asc' ? cmp : -cmp
    })
  }, [sold, soldSort])

  const handleSoldSort = (field: SortField) => {
    setSoldSort(prev => prev.field === field
      ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: 'asc' }
    )
  }

  const SoldSortIcon = ({ field }: { field: SortField }) => {
    if (soldSort.field !== field) return <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
    return soldSort.dir === 'asc'
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

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
          <h1 className="text-2xl font-bold">Frames & Albums</h1>
          <p className="text-muted-foreground">Engagement-to-sale pipeline tracking</p>
        </div>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="!w-auto"
        >
          <option value="all">All Years</option>
          {YEARS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
            <CheckCircle className="h-4 w-4" />
            Sold
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.sold}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-amber-600 text-sm mb-1">
            <AlertCircle className="h-4 w-4" />
            Quoted
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.quoted}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Clock className="h-4 w-4" />
            Pending
          </div>
          <div className="text-2xl font-bold">{stats.pending}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
            <XCircle className="h-4 w-4" />
            Declined
          </div>
          <div className="text-2xl font-bold text-red-600">{stats.declined}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <XCircle className="h-4 w-4" />
            No Sale
          </div>
          <div className="text-2xl font-bold text-gray-400">{stats.noSale}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
            <DollarSign className="h-4 w-4" />
            Revenue
          </div>
          <div className="text-2xl font-bold text-blue-600">{fmtMoney(stats.revenue)}</div>
        </div>
      </div>

      {/* Section 1: Active Pipeline */}
      {quoted.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" />
            Active Pipeline
          </h2>
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 font-medium w-8" style={{ textAlign: 'left' }}>#</th>
                  <th className="p-3 font-medium" style={{ textAlign: 'left' }}>Couple</th>
                  <th className="p-3 font-medium" style={{ textAlign: 'left' }}>Wedding Date</th>
                  <th className="p-3 font-medium" style={{ textAlign: 'left' }}>Package</th>
                  <th className="p-3 font-medium" style={{ textAlign: 'right' }}>Quoted Amount</th>
                  <th className="p-3 font-medium" style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {quoted.map((c, i) => (
                  <tr key={c.id} className="hover:bg-accent/50 transition-colors bg-amber-50/50">
                    <td className="p-3 text-muted-foreground" style={{ textAlign: 'left' }}>{i + 1}</td>
                    <td className="p-3 font-medium" style={{ textAlign: 'left' }}>{c.couple_name}</td>
                    <td className="p-3" style={{ textAlign: 'left' }}>{fmtDate(c.wedding_date)}</td>
                    <td className="p-3 text-muted-foreground" style={{ textAlign: 'left' }}>{formatPackage(c.package_type)}</td>
                    <td className="p-3 font-medium" style={{ textAlign: 'right' }}>
                      {getSaleAmount(c.extras_order) > 0 ? fmtMoney(getSaleAmount(c.extras_order)) : '\u2014'}
                    </td>
                    <td className="p-3" style={{ textAlign: 'center' }}>
                      {c.extras_order?.status === 'pending' ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-medium">Pending</span>
                      ) : c.extras_order?.status ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium capitalize">{c.extras_order.status}</span>
                      ) : (
                        <span className="text-muted-foreground">\u2014</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Upcoming — Engagement Not Yet Shot */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Upcoming \u2014 Engagement Not Yet Shot ({pending.length})</h2>
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 font-medium w-8" style={{ textAlign: 'left' }}>#</th>
                  <th className="p-3 font-medium" style={{ textAlign: 'left' }}>Couple</th>
                  <th className="p-3 font-medium" style={{ textAlign: 'left' }}>Wedding Date</th>
                  <th className="p-3 font-medium" style={{ textAlign: 'left' }}>Package</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pending.map((c, i) => (
                  <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-3 text-muted-foreground" style={{ textAlign: 'left' }}>{i + 1}</td>
                    <td className="p-3 font-medium" style={{ textAlign: 'left' }}>{c.couple_name}</td>
                    <td className="p-3" style={{ textAlign: 'left' }}>{fmtDate(c.wedding_date)}</td>
                    <td className="p-3 text-muted-foreground" style={{ textAlign: 'left' }}>{formatPackage(c.package_type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Completed Sales */}
      <CollapsibleSection title="Completed Sales" defaultOpen count={sold.length}>
        {sold.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed frame sales yet.</p>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 900 }}>
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 font-medium" style={{ textAlign: 'left' }}>
                      <button onClick={() => handleSoldSort('couple_name')} className="w-full group flex items-center gap-1 hover:text-foreground">
                        Couple <SoldSortIcon field="couple_name" />
                      </button>
                    </th>
                    <th className="p-3 font-medium" style={{ textAlign: 'left' }}>
                      <button onClick={() => handleSoldSort('wedding_date')} className="w-full group flex items-center gap-1 hover:text-foreground">
                        Wedding Date <SoldSortIcon field="wedding_date" />
                      </button>
                    </th>
                    <th className="p-3 font-medium" style={{ textAlign: 'right' }}>
                      <button onClick={() => handleSoldSort('sale_amount')} className="w-full group flex items-center gap-1 justify-end hover:text-foreground">
                        Sale $ <SoldSortIcon field="sale_amount" />
                      </button>
                    </th>
                    <th className="p-3 font-medium" style={{ textAlign: 'left' }}>Collage</th>
                    <th className="p-3 font-medium" style={{ textAlign: 'center' }}>Sign Book</th>
                    <th className="p-3 font-medium" style={{ textAlign: 'left' }}>Album</th>
                    <th className="p-3 font-medium" style={{ textAlign: 'left' }}>Wed Frame</th>
                    <th className="p-3 font-medium" style={{ textAlign: 'right' }}>Hi-Res</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedSold.map((c) => {
                    const amt = getSaleAmount(c.extras_order)
                    return (
                      <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                        <td className="p-3 font-medium" style={{ textAlign: 'left' }}>{c.couple_name}</td>
                        <td className="p-3" style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>{fmtDate(c.wedding_date)}</td>
                        <td className="p-3 font-medium" style={{ textAlign: 'right' }}>
                          {amt > 0 ? <span className="text-green-600">{fmtMoney(amt)}</span> : '\u2014'}
                        </td>
                        <td className="p-3 text-muted-foreground" style={{ textAlign: 'left' }}>{getCollageDisplay(c.extras_order)}</td>
                        <td className="p-3" style={{ textAlign: 'center' }}>
                          {getSignBookDisplay(c.extras_order) === '\u2713'
                            ? <span className="text-green-600">{'\u2713'}</span>
                            : <span className="text-muted-foreground">\u2014</span>
                          }
                        </td>
                        <td className="p-3 text-muted-foreground" style={{ textAlign: 'left' }}>{getAlbumDisplay(c.extras_order)}</td>
                        <td className="p-3 text-muted-foreground" style={{ textAlign: 'left' }}>{getWedFrameDisplay(c.extras_order)}</td>
                        <td className="p-3" style={{ textAlign: 'right' }}>
                          {c.hires_total > 0 ? fmtMoney(c.hires_total) : <span className="text-muted-foreground">\u2014</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-semibold">
                    <td className="p-3" style={{ textAlign: 'left' }}>Total</td>
                    <td className="p-3"></td>
                    <td className="p-3 text-green-600" style={{ textAlign: 'right' }}>
                      {fmtMoney(sold.reduce((sum, c) => sum + getSaleAmount(c.extras_order), 0))}
                    </td>
                    <td className="p-3" colSpan={4}></td>
                    <td className="p-3" style={{ textAlign: 'right' }}>
                      {sold.reduce((sum, c) => sum + c.hires_total, 0) > 0
                        ? fmtMoney(sold.reduce((sum, c) => sum + c.hires_total, 0))
                        : ''
                      }
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Section 4: Declined & No Sale */}
      <CollapsibleSection title="Declined & No Sale" defaultOpen={false} count={declined.length}>
        {declined.length === 0 ? (
          <p className="text-sm text-muted-foreground">None.</p>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 font-medium" style={{ textAlign: 'left' }}>Couple</th>
                  <th className="p-3 font-medium" style={{ textAlign: 'left' }}>Wedding Date</th>
                  <th className="p-3 font-medium" style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {declined.map((c) => (
                  <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-3 font-medium" style={{ textAlign: 'left' }}>{c.couple_name}</td>
                    <td className="p-3" style={{ textAlign: 'left' }}>{fmtDate(c.wedding_date)}</td>
                    <td className="p-3" style={{ textAlign: 'center' }}>{engBadge(c.eng_pipeline)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      {/* Section 5: Sold — Extras Only */}
      {extrasOnly.length > 0 && (
        <CollapsibleSection title="Sold \u2014 Extras Only (No Frames Package)" defaultOpen={false} count={extrasOnly.length}>
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 font-medium" style={{ textAlign: 'left' }}>Couple</th>
                  <th className="p-3 font-medium" style={{ textAlign: 'left' }}>Wedding Date</th>
                  <th className="p-3 font-medium" style={{ textAlign: 'right' }}>Extras $</th>
                  <th className="p-3 font-medium" style={{ textAlign: 'left' }}>Items</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {extrasOnly.map((c) => (
                  <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-3 font-medium" style={{ textAlign: 'left' }}>{c.couple_name}</td>
                    <td className="p-3" style={{ textAlign: 'left' }}>{fmtDate(c.wedding_date)}</td>
                    <td className="p-3 font-medium" style={{ textAlign: 'right' }}>{fmtMoney(c.client_extras_total)}</td>
                    <td className="p-3 text-muted-foreground" style={{ textAlign: 'left' }}>{c.client_extras_items.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}
