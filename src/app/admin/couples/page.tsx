'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, ChevronUp, ChevronDown, Calendar, Camera, FileText, Package, Copy, Check } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import PdfImporter from '@/components/admin/PdfImporter'
import ExtrasImporter from '@/components/admin/ExtrasImporter'

interface Couple {
  id: string
  couple_name: string
  wedding_date: string | null
  wedding_year: number | null
  package_type: string | null
  balance_owing: number | null
  status: string | null
  reception_venue: string | null
  contract_total: number | null
  email: string | null
  bride_phone: string | null
  has_wedding_form: boolean
}

type SortField = 'couple_name' | 'wedding_date' | 'balance_owing' | 'package_type'
type SortDir = 'asc' | 'desc'

const YEARS = [2026, 2027, 2025, 2024]
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

export default function CouplesPage() {
  const router = useRouter()
  const [couples, setCouples] = useState<Couple[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('wedding_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeImporter, setActiveImporter] = useState<'none' | 'contract' | 'extras'>('none')

  useEffect(() => {
    const fetchCouples = async () => {
      // Fetch couples
      const { data, error } = await supabase
        .from('couples')
        .select('id, couple_name, wedding_date, wedding_year, package_type, balance_owing, status, reception_venue, contract_total, email, bride_phone')
        .order('wedding_date', { ascending: true })

      if (error || !data) {
        setLoading(false)
        return
      }

      // Fetch which couples have wedding day forms
      const { data: formData } = await supabase
        .from('wedding_day_forms')
        .select('couple_id')

      const formCoupleIds = new Set((formData || []).map(f => f.couple_id))

      setCouples(data.map(c => ({
        ...c,
        has_wedding_form: formCoupleIds.has(c.id),
      })))
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
        c.reception_venue?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
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
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [couples, search, yearFilter, statusFilter, sortField, sortDir])

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

    couples.forEach(c => {
      const year = c.wedding_date ? new Date(c.wedding_date).getFullYear() : null
      if (year && year in byYear) byYear[year as keyof typeof byYear]++
      if (c.package_type === 'photo_only') byPackage.photo_only++
      else if (c.package_type === 'photo_video') byPackage.photo_video++
    })

    return { byYear, byPackage }
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Weddings by Year */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-blue-500" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Weddings by Year</h3>
          </div>
          <div className="space-y-1.5">
            {([2025, 2026, 2027] as const).map(yr => (
              <div key={yr} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{yr}</span>
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
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Photo Only</span>
              <span className="text-sm font-semibold">{stats.byPackage.photo_only}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Photo + Video</span>
              <span className="text-sm font-semibold">{stats.byPackage.photo_video}</span>
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
            placeholder="Search by name, venue, email..."
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
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filtered.length} of {couples.length} couples
        {yearFilter !== 'all' && ` — ${yearFilter}`}
        {statusFilter !== 'all' && ` — ${statusFilter}`}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">
                  <button onClick={() => handleSort('couple_name')} className="group flex items-center gap-1 hover:text-foreground">
                    Name <SortIcon field="couple_name" />
                  </button>
                </th>
                <th className="text-left p-3 font-medium">
                  <button onClick={() => handleSort('wedding_date')} className="group flex items-center gap-1 hover:text-foreground">
                    Wedding Date <SortIcon field="wedding_date" />
                  </button>
                </th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Venue</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">
                  <button onClick={() => handleSort('package_type')} className="group flex items-center gap-1 hover:text-foreground">
                    Package <SortIcon field="package_type" />
                  </button>
                </th>
                <th className="text-left p-3 font-medium hidden xl:table-cell">Email</th>
                <th className="text-left p-3 font-medium hidden xl:table-cell">Phone</th>
                <th className="text-right p-3 font-medium">
                  <button onClick={() => handleSort('balance_owing')} className="group flex items-center gap-1 justify-end hover:text-foreground">
                    Balance <SortIcon field="balance_owing" />
                  </button>
                </th>
                <th className="text-center p-3 font-medium w-12">Form</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
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
                      <td className="p-3">
                        <div className="font-medium">{couple.couple_name}</div>
                        <div className="text-xs text-muted-foreground md:hidden">
                          {couple.wedding_date ? format(parseISO(couple.wedding_date), 'EEE, MMM d, yyyy') : 'TBD'}
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        {couple.wedding_date
                          ? format(parseISO(couple.wedding_date), 'EEE, MMM d, yyyy')
                          : <span className="text-muted-foreground">TBD</span>
                        }
                      </td>
                      <td className="p-3 hidden lg:table-cell text-muted-foreground">
                        {couple.reception_venue || '—'}
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        {couple.package_type === 'photo_video' ? (
                          <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-xs font-medium">Photo + Video</span>
                        ) : couple.package_type === 'photo_only' ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">Photo Only</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 hidden xl:table-cell">
                        {couple.email ? (
                          <div className="flex items-center">
                            <span className="text-xs text-muted-foreground truncate max-w-[180px]">{couple.email}</span>
                            <CopyButton text={couple.email} />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 hidden xl:table-cell">
                        {couple.bride_phone ? (
                          <div className="flex items-center">
                            <span className="text-xs text-muted-foreground">{couple.bride_phone}</span>
                            <CopyButton text={couple.bride_phone} />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right align-middle">
                        {bal > 0 ? (
                          <span className="font-semibold text-red-600">${bal.toLocaleString()}</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">PAID</span>
                        )}
                      </td>
                      <td className="p-3 text-center align-middle">
                        {couple.has_wedding_form ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`/api/wedding-form-pdf/${couple.id}`, '_blank')
                            }}
                            className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 transition-colors"
                            title="Download Wedding Day Form"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
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
