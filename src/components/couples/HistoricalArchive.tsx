'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatWeddingDate } from '@/lib/formatters'
import { YearSelector, type YearValue } from './YearSelector'
import {
  companyFor,
  type Company,
  type HistoricalCouple,
} from './historicalArchiveTypes'

const COUPLES_TABLE_MIN_YEAR = 2025

type ArchiveSource = 'couples' | 'historical'

interface UnifiedArchiveRow {
  id: string
  source: ArchiveSource
  bride_first_name: string | null
  bride_last_name: string | null
  groom_first_name: string | null
  groom_last_name: string | null
  bride_email: string | null
  groom_email: string | null
  phone_1: string | null
  phone_2: string | null
  ceremony_venue: string | null
  reception_venue: string | null
  park_name: string | null
  wedding_date: string | null
  wedding_year: number | null
  glacier_archived: boolean | null
  company: Company
  rowNum: number
}

const SEARCH_TEXT_FIELDS: (keyof UnifiedArchiveRow)[] = [
  'bride_first_name',
  'bride_last_name',
  'groom_first_name',
  'groom_last_name',
  'bride_email',
  'groom_email',
  'phone_1',
  'phone_2',
  'ceremony_venue',
  'reception_venue',
  'park_name',
]

function ArchiveStatusBadge({ verified }: { verified: boolean }) {
  const cls = verified
    ? 'bg-green-100 text-green-700'
    : 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {verified ? 'Verified' : 'Not Verified'}
    </span>
  )
}

function isVerified(row: UnifiedArchiveRow): boolean {
  if (row.source === 'historical') return row.glacier_archived === true
  return false
}

function detailHrefFor(row: UnifiedArchiveRow): string {
  return row.source === 'couples'
    ? `/admin/couples/${row.id}`
    : `/admin/archives/${row.id}`
}

const columnHelper = createColumnHelper<UnifiedArchiveRow>()

function buildColumns() {
  return [
    columnHelper.accessor('rowNum', {
      header: '#',
      cell: info => <span className="text-muted-foreground">{info.getValue()}</span>,
      size: 40,
    }),
    columnHelper.accessor(
      row => [row.bride_first_name, row.groom_first_name].filter(Boolean).join(' & '),
      {
        id: 'couple_name',
        header: 'Couple Name',
        cell: info => {
          const r = info.row.original
          const bride = r.bride_first_name || ''
          const groom = r.groom_first_name || ''
          const label = [bride, groom].filter(Boolean).join(' & ').trim()
          if (!label) {
            return <span className="text-muted-foreground/40">—</span>
          }
          return (
            <Link
              href={detailHrefFor(r)}
              className="text-blue-600 hover:underline font-medium"
            >
              {label}
            </Link>
          )
        },
      },
    ),
    columnHelper.accessor(row => row.wedding_date ?? '', {
      id: 'wedding_date',
      header: 'Wedding Date',
      cell: info => {
        const r = info.row.original
        if (r.wedding_date) return formatWeddingDate(r.wedding_date)
        if (r.wedding_year != null) {
          return <span className="text-muted-foreground">{r.wedding_year}</span>
        }
        return <span className="text-muted-foreground/40">—</span>
      },
      sortingFn: (a, b, columnId) => {
        const av = a.original.wedding_date
        const bv = b.original.wedding_date
        // Rows without a date sort to the end (regardless of asc/desc)
        if (!av && !bv) return 0
        if (!av) return 1
        if (!bv) return -1
        return av.localeCompare(bv)
      },
    }),
    columnHelper.display({
      id: 'archive_status',
      header: 'Archive Status',
      cell: info => <ArchiveStatusBadge verified={isVerified(info.row.original)} />,
    }),
  ]
}

function ArchiveTable({
  rows,
  initialSort,
}: {
  rows: UnifiedArchiveRow[]
  initialSort: SortingState
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSort)
  const columns = useMemo(() => buildColumns(), [])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => (
                <th
                  key={h.id}
                  className="px-4 py-2 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-200 select-none whitespace-nowrap"
                  onClick={h.column.getToggleSortingHandler()}
                >
                  <span className="flex items-center gap-1">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{ asc: ' ↑', desc: ' ↓' }[h.column.getIsSorted() as string] ?? null}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr
              key={row.id}
              className={`hover:bg-blue-50 transition-colors ${
                i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-2 align-top">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function YearGroup({
  year,
  rows,
  expanded,
  onToggle,
  showCompanyCounts,
}: {
  year: number
  rows: UnifiedArchiveRow[]
  expanded: boolean
  onToggle: (year: number) => void
  showCompanyCounts: boolean
}) {
  const sigsCount = useMemo(() => rows.filter(r => r.company === 'SIGS').length, [rows])
  const excellenceCount = useMemo(() => rows.filter(r => r.company === 'Excellence').length, [rows])

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => onToggle(year)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-sm"
      >
        <span className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-semibold">{year}</span>
          <span className="text-muted-foreground">
            ({rows.length} couple{rows.length !== 1 ? 's' : ''})
          </span>
        </span>
        {showCompanyCounts && (
          <span className="flex items-center gap-2">
            {sigsCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-teal-100 text-teal-700 px-2 py-0.5 text-xs font-medium">
                SIGS {sigsCount}
              </span>
            )}
            {excellenceCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
                Excellence {excellenceCount}
              </span>
            )}
          </span>
        )}
      </button>
      {expanded && (
        <ArchiveTable
          rows={rows}
          initialSort={[{ id: 'wedding_date', desc: false }]}
        />
      )}
    </div>
  )
}

export function HistoricalArchive() {
  const [isOpen, setIsOpen] = useState(true)
  const [historicalCouples, setHistoricalCouples] = useState<HistoricalCouple[]>([])
  const [couplesTableRows, setCouplesTableRows] = useState<UnifiedArchiveRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [yearFilter, setYearFilter] = useState<YearValue>('all')
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set())
  const tableRef = useRef<HTMLDivElement | null>(null)

  // Lazy-fetch on first expand
  useEffect(() => {
    if (!isOpen || loaded) return
    setLoading(true)
    ;(async () => {
      const [historicalRes, couplesRes] = await Promise.all([
        supabase
          .from('historical_couple_profiles')
          .select(
            'id, couple_id, bride_first_name, bride_last_name, groom_first_name, groom_last_name, bride_email, groom_email, phone_1, phone_2, wedding_date, wedding_year, ceremony_venue, park_name, reception_venue, glacier_archived, data_confidence',
          )
          .order('wedding_year', { ascending: false })
          .order('wedding_date', { ascending: false }),
        supabase
          .from('couples')
          .select(
            'id, bride_first_name, bride_last_name, groom_first_name, groom_last_name, wedding_date, wedding_year',
          )
          .gte('wedding_year', COUPLES_TABLE_MIN_YEAR)
          .order('wedding_date', { ascending: true }),
      ])

      if (!historicalRes.error) {
        setHistoricalCouples((historicalRes.data ?? []) as HistoricalCouple[])
      }
      if (!couplesRes.error && couplesRes.data) {
        const rows: UnifiedArchiveRow[] = couplesRes.data.map((r: any) => ({
          id: r.id,
          source: 'couples',
          bride_first_name: r.bride_first_name ?? null,
          bride_last_name: r.bride_last_name ?? null,
          groom_first_name: r.groom_first_name ?? null,
          groom_last_name: r.groom_last_name ?? null,
          bride_email: null,
          groom_email: null,
          phone_1: null,
          phone_2: null,
          ceremony_venue: null,
          reception_venue: null,
          park_name: null,
          wedding_date: r.wedding_date ?? null,
          wedding_year:
            r.wedding_year ??
            (r.wedding_date ? new Date(r.wedding_date + 'T12:00:00').getFullYear() : null),
          glacier_archived: null,
          company: 'SIGS',
          rowNum: 0,
        }))
        setCouplesTableRows(rows)
      }
      setLoading(false)
      setLoaded(true)
    })()
  }, [isOpen, loaded])

  // Debounce search input (200ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200)
    return () => clearTimeout(t)
  }, [search])

  const enrichedHistorical: UnifiedArchiveRow[] = useMemo(
    () =>
      historicalCouples
        .filter(c => c.wedding_year == null || c.wedding_year < COUPLES_TABLE_MIN_YEAR)
        .map(c => ({
          id: c.id,
          source: 'historical',
          bride_first_name: c.bride_first_name,
          bride_last_name: c.bride_last_name,
          groom_first_name: c.groom_first_name,
          groom_last_name: c.groom_last_name,
          bride_email: c.bride_email,
          groom_email: c.groom_email,
          phone_1: c.phone_1,
          phone_2: c.phone_2,
          ceremony_venue: c.ceremony_venue,
          reception_venue: c.reception_venue,
          park_name: c.park_name,
          wedding_date: c.wedding_date,
          wedding_year: c.wedding_year,
          glacier_archived: c.glacier_archived,
          company: companyFor(c),
          rowNum: 0,
        })),
    [historicalCouples],
  )

  // Years available — combined from both data sources
  const years = useMemo(() => {
    const set = new Set<number>()
    for (const c of enrichedHistorical) {
      if (c.wedding_year != null) set.add(c.wedding_year)
    }
    for (const r of couplesTableRows) {
      if (r.wedding_year != null) set.add(r.wedding_year)
    }
    return Array.from(set).sort((a, b) => b - a)
  }, [enrichedHistorical, couplesTableRows])

  function applySearch(rows: UnifiedArchiveRow[], query: string): UnifiedArchiveRow[] {
    if (!query) return rows
    const qDigits = query.replace(/\D/g, '')
    return rows.filter(r => {
      for (const f of SEARCH_TEXT_FIELDS) {
        const v = r[f]
        if (typeof v === 'string' && v.toLowerCase().includes(query)) return true
      }
      if (qDigits) {
        if (r.phone_1 && r.phone_1.replace(/\D/g, '').includes(qDigits)) return true
        if (r.phone_2 && r.phone_2.replace(/\D/g, '').includes(qDigits)) return true
      }
      return false
    })
  }

  // Filtered rows for year-specific view
  const filteredYearRows = useMemo(() => {
    if (yearFilter === 'all') return [] as UnifiedArchiveRow[]
    const isCouplesYear = typeof yearFilter === 'number' && yearFilter >= COUPLES_TABLE_MIN_YEAR
    const source = isCouplesYear ? couplesTableRows : enrichedHistorical
    const result = source.filter(r => r.wedding_year === yearFilter)
    const searched = applySearch(result, debouncedSearch)
    // Renumber, with rows having no wedding_date sorted to the end of group
    const sorted = [...searched].sort((a, b) => {
      const da = a.wedding_date ?? ''
      const db = b.wedding_date ?? ''
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return da.localeCompare(db)
    })
    return sorted.map((r, i) => ({ ...r, rowNum: i + 1 }))
  }, [yearFilter, couplesTableRows, enrichedHistorical, debouncedSearch])

  // Combined rows for ALL view
  const combinedAllRows = useMemo(() => {
    if (yearFilter !== 'all') return [] as UnifiedArchiveRow[]
    const combined = [...couplesTableRows, ...enrichedHistorical]
    const searched = applySearch(combined, debouncedSearch)
    const sorted = [...searched].sort((a, b) => {
      const da = a.wedding_date ?? ''
      const db = b.wedding_date ?? ''
      // Date desc; missing dates go last
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return db.localeCompare(da)
    })
    return sorted.map((r, i) => ({ ...r, rowNum: i + 1 }))
  }, [yearFilter, couplesTableRows, enrichedHistorical, debouncedSearch])

  const totalCount =
    yearFilter === 'all' ? combinedAllRows.length : filteredYearRows.length
  const sigsCount = useMemo(() => {
    const rows = yearFilter === 'all' ? combinedAllRows : filteredYearRows
    return rows.filter(r => r.source === 'historical' && r.company === 'SIGS').length
  }, [yearFilter, combinedAllRows, filteredYearRows])
  const excellenceCount = useMemo(() => {
    const rows = yearFilter === 'all' ? combinedAllRows : filteredYearRows
    return rows.filter(r => r.source === 'historical' && r.company === 'Excellence').length
  }, [yearFilter, combinedAllRows, filteredYearRows])

  const showCompanyCountsInSummary =
    yearFilter === 'all' ||
    (typeof yearFilter === 'number' && yearFilter < COUPLES_TABLE_MIN_YEAR)

  const handleYearChange = (v: YearValue) => {
    setYearFilter(v)
    if (typeof v === 'number') {
      setExpandedYears(prev => {
        const next = new Set(prev)
        next.add(v)
        return next
      })
    }
    requestAnimationFrame(() => {
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  const totalDataCount = historicalCouples.length + couplesTableRows.length

  return (
    <div className="mt-8 border rounded-lg bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
          <h2 className="text-lg font-semibold">Historical Archive</h2>
          {loaded && totalDataCount > 0 && (
            <span className="text-sm text-muted-foreground">
              ({totalDataCount} couple{totalDataCount !== 1 ? 's' : ''})
            </span>
          )}
        </span>
      </button>

      {isOpen && (
        <div className="border-t">
          {loading && !loaded ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
            </div>
          ) : (
            <>
              {/* Control Box */}
              <div className="p-4 border-b bg-gray-50 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filter by Year
                </h3>

                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search couples, venues, emails, phones…"
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm outline-none focus:border-ring transition-colors"
                />

                <YearSelector years={years} value={yearFilter} onChange={handleYearChange} />

                {showCompanyCountsInSummary ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{totalCount}</span>{' '}
                    couple{totalCount !== 1 ? 's' : ''}
                    {(sigsCount > 0 || excellenceCount > 0) && (
                      <>
                        {' · '}
                        <span className="font-medium text-teal-700">SIGS: {sigsCount}</span>
                        {' · '}
                        <span className="font-medium text-green-700">Excellence: {excellenceCount}</span>
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{totalCount}</span>{' '}
                    couple{totalCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Table */}
              <div ref={tableRef}>
                {totalCount === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No historical couples match your filters.
                  </div>
                ) : yearFilter === 'all' ? (
                  <ArchiveTable
                    rows={combinedAllRows}
                    initialSort={[{ id: 'wedding_date', desc: true }]}
                  />
                ) : (
                  <YearGroup
                    year={yearFilter as number}
                    rows={filteredYearRows}
                    expanded={expandedYears.has(yearFilter as number) || debouncedSearch.length > 0}
                    onToggle={toggleYear}
                    showCompanyCounts={(yearFilter as number) < COUPLES_TABLE_MIN_YEAR}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
