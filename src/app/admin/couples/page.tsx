'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, Search, Filter, ChevronUp, ChevronDown, Calendar, Camera, Frame, FileText, Package } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import PdfImporter from '@/components/admin/PdfImporter'
import ExtrasImporter from '@/components/admin/ExtrasImporter'

interface Couple {
  id: string
  couple_name: string
  wedding_date: string | null
  wedding_year: number | null
  package_type: string | null
  reception_venue: string | null
  contract_price: number | null
  balance_owing: number | null
  status: string | null
  ceremony_venue: string | null
  contract_total: number | null
  frame_sale_status: string | null
  frames_total: number
  extras_total: number
  payments_count: number
}

type SortField = 'couple_name' | 'wedding_date' | 'balance_owing' | 'package_type' | 'reception_venue' | 'contract_price' | 'frames_total' | 'extras_total' | 'payments_count'
type SortDir = 'asc' | 'desc'

const YEARS = [2027, 2026, 2025]
const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'booked', label: 'Booked' },
  { value: 'completed', label: 'Completed' },
]

function formatPackage(pkg: string | null): string {
  if (!pkg) return '—'
  if (pkg === 'photo_only') return 'Photo Only'
  if (pkg === 'photo_video') return 'Photo + Video'
  return pkg
}

function statusBadge(status: string | null) {
  if (!status) return null
  if (status === 'booked')
    return <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">Booked</span>
  if (status === 'completed')
    return <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">Completed</span>
  return <span className="text-xs text-muted-foreground">{status}</span>
}

export default function CouplesPage() {
  const router = useRouter()
  const [couples, setCouples] = useState<Couple[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [packageFilter, setPackageFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('wedding_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeImporter, setActiveImporter] = useState<'none' | 'contract' | 'extras'>('none')

  useEffect(() => {
    const fetchCouples = async () => {
      const [couplesRes, framesRes, extrasRes, paymentsRes] = await Promise.all([
        supabase
          .from('couples')
          .select('id, couple_name, wedding_date, wedding_year, package_type, frame_sale_status, balance_owing, status, ceremony_venue, contract_total, contracts(reception_venue, total)')
          .order('wedding_date', { ascending: true }),
        supabase
          .from('extras_orders')
          .select('couple_id, total'),
        supabase
          .from('client_extras')
          .select('couple_id, total'),
        supabase
          .from('payments')
          .select('couple_id'),
      ])

      // Sum frames by couple
      const framesSums: Record<string, number> = {}
      if (framesRes.data) {
        for (const row of framesRes.data) {
          framesSums[row.couple_id] = (framesSums[row.couple_id] || 0) + (Number(row.total) || 0)
        }
      }

      // Sum extras by couple
      const extrasSums: Record<string, number> = {}
      if (extrasRes.data) {
        for (const row of extrasRes.data) {
          extrasSums[row.couple_id] = (extrasSums[row.couple_id] || 0) + (Number(row.total) || 0)
        }
      }

      // Count payments by couple
      const paymentsCounts: Record<string, number> = {}
      if (paymentsRes.data) {
        for (const row of paymentsRes.data) {
          paymentsCounts[row.couple_id] = (paymentsCounts[row.couple_id] || 0) + 1
        }
      }

      if (!couplesRes.error && couplesRes.data) {
        setCouples(couplesRes.data.map((row: any) => {
          const contract = Array.isArray(row.contracts) ? row.contracts[0] : row.contracts
          return {
            ...row,
            reception_venue: contract?.reception_venue || null,
            contract_price: contract?.total != null ? Number(contract.total) : null,
            frames_total: framesSums[row.id] || 0,
            extras_total: extrasSums[row.id] || 0,
            payments_count: paymentsCounts[row.id] || 0,
          }
        }))
      }
      setLoading(false)
    }
    fetchCouples()
  }, [refreshKey])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let result = [...couples]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.couple_name.toLowerCase().includes(q) ||
        c.ceremony_venue?.toLowerCase().includes(q) ||
        c.reception_venue?.toLowerCase().includes(q)
      )
    }

    // Year filter
    if (yearFilter !== 'all') {
      result = result.filter(c => c.wedding_year === yearFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter)
    }

    // Package filter
    if (packageFilter !== 'all') {
      result = result.filter(c => c.package_type === packageFilter)
    }

    // Sort
    const yearPriority = (date: string | null) => {
      if (!date) return 99
      const year = new Date(date).getFullYear()
      if (year === 2026) return 1
      if (year === 2027) return 2
      if (year === 2028) return 3
      if (year === 2025) return 4
      return 5
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'couple_name':
          cmp = a.couple_name.localeCompare(b.couple_name)
          break
        case 'wedding_date': {
          const yp = yearPriority(a.wedding_date) - yearPriority(b.wedding_date)
          cmp = yp !== 0 ? yp : (a.wedding_date || '').localeCompare(b.wedding_date || '')
          break
        }
        case 'balance_owing':
          cmp = (Number(a.balance_owing) || 0) - (Number(b.balance_owing) || 0)
          break
        case 'package_type':
          cmp = (a.package_type || '').localeCompare(b.package_type || '')
          break
        case 'reception_venue':
          cmp = (a.reception_venue || '').localeCompare(b.reception_venue || '')
          break
        case 'contract_price':
          cmp = (Number(a.contract_price) || 0) - (Number(b.contract_price) || 0)
          break
        case 'frames_total':
          cmp = a.frames_total - b.frames_total
          break
        case 'extras_total':
          cmp = a.extras_total - b.extras_total
          break
        case 'payments_count':
          cmp = a.payments_count - b.payments_count
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [couples, search, yearFilter, statusFilter, packageFilter, sortField, sortDir])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

  // Stats computed from loaded data
  const stats = useMemo(() => {
    const byYear = { 2025: 0, 2026: 0, 2027: 0 }
    const byPackage = { photo_only: 0, photo_video: 0 }
    const byFrame = { bought: 0, pending: 0, noSale: 0 }

    couples.forEach(c => {
      const year = c.wedding_date ? new Date(c.wedding_date).getFullYear() : null
      if (year && year in byYear) byYear[year as keyof typeof byYear]++
      if (c.package_type === 'photo_only') byPackage.photo_only++
      else if (c.package_type === 'photo_video') byPackage.photo_video++
      const fs = c.frame_sale_status?.toUpperCase()
      if (fs === 'BOUGHT') byFrame.bought++
      else if (fs === 'NO FRAME SALE') byFrame.noSale++
      else byFrame.pending++
    })

    return { byYear, byPackage, byFrame }
  }, [couples])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Couples</h1>
          <p className="text-muted-foreground">{couples.length} couples in database</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveImporter(v => v === 'contract' ? 'none' : 'contract')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeImporter === 'contract'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            New Couple Contract
          </button>
          <button
            onClick={() => setActiveImporter(v => v === 'extras' ? 'none' : 'extras')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeImporter === 'extras'
                ? 'bg-teal-600 text-white'
                : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
            }`}
          >
            <Package className="h-4 w-4" />
            Frames & Albums Invoice
          </button>
        </div>
      </div>

      {/* Importers — toggled by header buttons */}
      {activeImporter === 'contract' && (
        <PdfImporter
          defaultOpen
          onImportComplete={() => { setRefreshKey(k => k + 1); setActiveImporter('none') }}
        />
      )}
      {activeImporter === 'extras' && (
        <ExtrasImporter
          defaultOpen
          onImportComplete={() => { setRefreshKey(k => k + 1); setActiveImporter('none') }}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Weddings by Year */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-blue-500" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Weddings by Year</h3>
          </div>
          <div className="space-y-1.5">
            {([2025, 2026, 2027] as const).map(yr => (
              <div
                key={yr}
                onClick={() => setYearFilter(yearFilter === yr ? 'all' : yr)}
                className={`flex items-center justify-between rounded px-2 py-0.5 -mx-2 cursor-pointer transition-colors ${yearFilter === yr ? 'bg-blue-100 text-blue-800' : 'hover:bg-muted'}`}
              >
                <span className="text-sm">{yr}</span>
                <span className="text-sm font-semibold">{stats.byYear[yr]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Package Type */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Package Type</h3>
          </div>
          <div className="space-y-1.5">
            <div
              onClick={() => setPackageFilter(packageFilter === 'photo_only' ? 'all' : 'photo_only')}
              className={`flex items-center justify-between rounded px-2 py-0.5 -mx-2 cursor-pointer transition-colors ${packageFilter === 'photo_only' ? 'bg-emerald-100 text-emerald-800' : 'hover:bg-muted'}`}
            >
              <span className="text-sm">Photo Only</span>
              <span className="text-sm font-semibold">{stats.byPackage.photo_only}</span>
            </div>
            <div
              onClick={() => setPackageFilter(packageFilter === 'photo_video' ? 'all' : 'photo_video')}
              className={`flex items-center justify-between rounded px-2 py-0.5 -mx-2 cursor-pointer transition-colors ${packageFilter === 'photo_video' ? 'bg-emerald-100 text-emerald-800' : 'hover:bg-muted'}`}
            >
              <span className="text-sm">Photo + Video</span>
              <span className="text-sm font-semibold">{stats.byPackage.photo_video}</span>
            </div>
          </div>
        </div>

        {/* Frame Sales */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Frame className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Frame Sales</h3>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bought</span>
              <span className="text-sm font-semibold text-green-600">{stats.byFrame.bought}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending</span>
              <span className="text-sm font-semibold text-amber-600">{stats.byFrame.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">No Sale</span>
              <span className="text-sm font-semibold text-gray-500">{stats.byFrame.noSale}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 !w-full"
          />
        </div>

        {/* Year filter */}
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

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="!w-auto"
        >
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Package filter */}
        <select
          value={packageFilter}
          onChange={(e) => setPackageFilter(e.target.value)}
          className="!w-auto"
        >
          <option value="all">All Packages</option>
          <option value="photo_only">Photo Only</option>
          <option value="photo_video">Photo + Video</option>
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filtered.length} of {couples.length} couples
        {yearFilter !== 'all' && ` — ${yearFilter}`}
        {statusFilter !== 'all' && ` — ${statusFilter}`}
        {packageFilter !== 'all' && ` — ${formatPackage(packageFilter)}`}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: 1100 }}>
            <colgroup>
              <col style={{ width: '16%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '11%' }} />
            </colgroup>
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 font-medium" style={{ textAlign: 'left' }}>
                  <button onClick={() => handleSort('couple_name')} className="group flex items-center gap-1 hover:text-foreground">
                    Couple <SortIcon field="couple_name" />
                  </button>
                </th>
                <th className="p-3 font-medium" style={{ textAlign: 'left' }}>
                  <button onClick={() => handleSort('wedding_date')} className="group flex items-center gap-1 hover:text-foreground" style={{ whiteSpace: 'nowrap' }}>
                    Date <SortIcon field="wedding_date" />
                  </button>
                </th>
                <th className="p-3 font-medium" style={{ textAlign: 'center' }}>Status</th>
                <th className="p-3 font-medium" style={{ textAlign: 'left' }}>
                  <button onClick={() => handleSort('package_type')} className="group flex items-center gap-1 hover:text-foreground">
                    Package <SortIcon field="package_type" />
                  </button>
                </th>
                <th className="p-3 font-medium" style={{ textAlign: 'left' }}>
                  <button onClick={() => handleSort('reception_venue')} className="group flex items-center gap-1 hover:text-foreground">
                    Venue <SortIcon field="reception_venue" />
                  </button>
                </th>
                <th className="p-3 font-medium" style={{ textAlign: 'right' }}>
                  <button onClick={() => handleSort('contract_price')} className="group flex items-center gap-1 justify-end hover:text-foreground">
                    Contract <SortIcon field="contract_price" />
                  </button>
                </th>
                <th className="p-3 font-medium" style={{ textAlign: 'right' }}>
                  <button onClick={() => handleSort('frames_total')} className="group flex items-center gap-1 justify-end hover:text-foreground">
                    Frames <SortIcon field="frames_total" />
                  </button>
                </th>
                <th className="p-3 font-medium" style={{ textAlign: 'right' }}>
                  <button onClick={() => handleSort('extras_total')} className="group flex items-center gap-1 justify-end hover:text-foreground">
                    Extras <SortIcon field="extras_total" />
                  </button>
                </th>
                <th className="p-3 font-medium" style={{ textAlign: 'center' }}>
                  <button onClick={() => handleSort('payments_count')} className="group flex items-center gap-1 justify-center hover:text-foreground">
                    Pmts <SortIcon field="payments_count" />
                  </button>
                </th>
                <th className="p-3 font-medium" style={{ textAlign: 'right' }}>
                  <button onClick={() => handleSort('balance_owing')} className="group flex items-center gap-1 justify-end hover:text-foreground">
                    Balance <SortIcon field="balance_owing" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-muted-foreground" style={{ textAlign: 'center' }}>
                    No couples found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((couple) => {
                  const bal = Number(couple.balance_owing) || 0
                  return (
                    <tr
                      key={couple.id}
                      onClick={() => router.push(`/admin/couples/${couple.id}`)}
                      className="hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <td className="p-3 truncate" title={couple.couple_name} style={{ textAlign: 'left' }}>
                        <span className="font-medium">{couple.couple_name}</span>
                      </td>
                      <td className="p-3" style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                        {couple.wedding_date
                          ? format(parseISO(couple.wedding_date), 'MMM d, yyyy')
                          : <span className="text-muted-foreground/40">—</span>
                        }
                      </td>
                      <td className="p-3" style={{ textAlign: 'center' }}>
                        {statusBadge(couple.status)}
                      </td>
                      <td className="p-3 text-muted-foreground truncate" style={{ textAlign: 'left' }}>
                        {formatPackage(couple.package_type)}
                      </td>
                      <td className="p-3 text-muted-foreground truncate" title={couple.reception_venue || undefined} style={{ textAlign: 'left' }}>
                        {couple.reception_venue || <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="p-3 text-muted-foreground" style={{ textAlign: 'right' }}>
                        {couple.contract_price ? `$${Math.round(Number(couple.contract_price)).toLocaleString()}` : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="p-3 text-muted-foreground" style={{ textAlign: 'right' }}>
                        {couple.frames_total > 0 ? `$${Math.round(couple.frames_total).toLocaleString()}` : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="p-3 text-muted-foreground" style={{ textAlign: 'right' }}>
                        {couple.extras_total > 0 ? `$${Math.round(couple.extras_total).toLocaleString()}` : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="p-3 text-muted-foreground" style={{ textAlign: 'center' }}>
                        {couple.payments_count > 0 ? couple.payments_count : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="p-3 font-semibold" style={{ textAlign: 'right' }}>
                        {bal > 0 ? (
                          <span className="text-red-600">${Math.round(bal).toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground/50 font-normal">$0</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
