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
import { HistoricalCoupleSheet } from './HistoricalCoupleSheet'
import {
  companyFor,
  type Company,
  type HistoricalCouple,
} from './historicalArchiveTypes'

const COUPLES_TABLE_MIN_YEAR = 2025

interface RowShape extends HistoricalCouple {
  rowNum: number
  company: Company
}

interface CouplesArchiveRow {
  id: string
  bride_first_name: string | null
  bride_last_name: string | null
  groom_first_name: string | null
  groom_last_name: string | null
  wedding_date: string | null
  wedding_year: number | null
  rowNum: number
}

const SEARCH_FIELDS: (keyof HistoricalCouple)[] = [
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

const COUPLES_SEARCH_FIELDS: (keyof CouplesArchiveRow)[] = [
  'bride_first_name',
  'bride_last_name',
  'groom_first_name',
  'groom_last_name',
]

function CompanyBadge({ company }: { company: Company }) {
  const cls =
    company === 'SIGS'
      ? 'bg-teal-100 text-teal-700'
      : company === 'Excellence'
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {company}
    </span>
  )
}

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

const columnHelper = createColumnHelper<RowShape>()
const couplesColumnHelper = createColumnHelper<CouplesArchiveRow>()

function buildHistoricalColumns() {
  return [
    columnHelper.accessor('rowNum', {
      header: '#',
      cell: info => <span className="text-muted-foreground">{info.getValue()}</span>,
      size: 40,
    }),
    columnHelper.accessor(row => row.bride_first_name ?? '', {
      id: 'bride',
      header: 'Bride',
      cell: info => {
        const r = info.row.original
        const name = [r.bride_first_name, r.bride_last_name].filter(Boolean).join(' ').trim()
        return name || <span className="text-muted-foreground/40">—</span>
      },
    }),
    columnHelper.accessor(row => row.groom_first_name ?? '', {
      id: 'groom',
      header: 'Groom',
      cell: info => {
        const r = info.row.original
        const name = [r.groom_first_name, r.groom_last_name].filter(Boolean).join(' ').trim()
        return name || <span className="text-muted-foreground/40">—</span>
      },
    }),
    columnHelper.accessor(row => row.wedding_date ?? '', {
      id: 'wedding_date',
      header: 'Wedding Date',
      cell: info => {
        const v = info.row.original.wedding_date
        if (!v) {
          const yr = info.row.original.wedding_year
          return yr ? <span className="text-muted-foreground">{yr}</span> : <span className="text-muted-foreground/40">—</span>
        }
        return formatWeddingDate(v)
      },
    }),
    columnHelper.accessor(row => row.ceremony_venue ?? '', {
      id: 'ceremony',
      header: 'Ceremony',
      cell: info => info.row.original.ceremony_venue || <span className="text-muted-foreground/40">—</span>,
    }),
    columnHelper.accessor(row => row.reception_venue ?? '', {
      id: 'reception',
      header: 'Reception',
      cell: info => info.row.original.reception_venue || <span className="text-muted-foreground/40">—</span>,
    }),
    columnHelper.accessor('company', {
      header: 'Company',
      cell: info => <CompanyBadge company={info.getValue()} />,
    }),
  ]
}

function buildCouplesColumns() {
  return [
    couplesColumnHelper.accessor('rowNum', {
      header: '#',
      cell: info => <span className="text-muted-foreground">{info.getValue()}</span>,
      size: 40,
    }),
    couplesColumnHelper.accessor(
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
              href={`/admin/couples/${r.id}`}
              className="text-blue-600 hover:underline font-medium"
            >
              {label}
            </Link>
          )
        },
      },
    ),
    couplesColumnHelper.accessor(row => row.wedding_date ?? '', {
      id: 'wedding_date',
      header: 'Wedding Date',
      cell: info => {
        const v = info.row.original.wedding_date
        if (!v) return <span className="text-muted-foreground/40">—</span>
        return formatWeddingDate(v)
      },
    }),
    couplesColumnHelper.display({
      id: 'archive_status',
      header: 'Archive Status',
      cell: () => <ArchiveStatusBadge verified={false} />,
    }),
  ]
}

function HistoricalYearGroup({
  year,
  rows,
  expanded,
  onToggle,
  onRowClick,
}: {
  year: number
  rows: RowShape[]
  expanded: boolean
  onToggle: (year: number) => void
  onRowClick: (c: HistoricalCouple) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([])

  const sigsCount = useMemo(() => rows.filter(r => r.company === 'SIGS').length, [rows])
  const excellenceCount = useMemo(() => rows.filter(r => r.company === 'Excellence').length, [rows])

  const columns = useMemo(() => buildHistoricalColumns(), [])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

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
      </button>
      {expanded && (
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
                  onClick={() => onRowClick(row.original)}
                  className={`cursor-pointer hover:bg-blue-50 transition-colors ${
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
      )}
    </div>
  )
}

function CouplesYearGroup({
  year,
  rows,
  expanded,
  onToggle,
}: {
  year: number
  rows: CouplesArchiveRow[]
  expanded: boolean
  onToggle: (year: number) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'wedding_date', desc: false },
  ])

  const columns = useMemo(() => buildCouplesColumns(), [])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

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
      </button>
      {expanded && (
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
      )}
    </div>
  )
}

export function HistoricalArchive() {
  const [isOpen, setIsOpen] = useState(true)
  const [historicalCouples, setHistoricalCouples] = useState<HistoricalCouple[]>([])
  const [couplesTableRows, setCouplesTableRows] = useState<CouplesArchiveRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [yearFilter, setYearFilter] = useState<YearValue>('all')
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set())
  const [selected, setSelected] = useState<HistoricalCouple | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
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
        const rows: CouplesArchiveRow[] = couplesRes.data.map((r: any, i: number) => ({
          id: r.id,
          bride_first_name: r.bride_first_name,
          bride_last_name: r.bride_last_name,
          groom_first_name: r.groom_first_name,
          groom_last_name: r.groom_last_name,
          wedding_date: r.wedding_date,
          wedding_year:
            r.wedding_year ??
            (r.wedding_date ? new Date(r.wedding_date + 'T12:00:00').getFullYear() : null),
          rowNum: i + 1,
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

  // Years available — combined from both data sources
  const years = useMemo(() => {
    const set = new Set<number>()
    for (const c of historicalCouples) {
      if (c.wedding_year != null && c.wedding_year < COUPLES_TABLE_MIN_YEAR) set.add(c.wedding_year)
    }
    for (const r of couplesTableRows) {
      if (r.wedding_year != null && r.wedding_year >= COUPLES_TABLE_MIN_YEAR) set.add(r.wedding_year)
    }
    return Array.from(set).sort((a, b) => b - a)
  }, [historicalCouples, couplesTableRows])

  const enrichedHistorical: RowShape[] = useMemo(
    () =>
      historicalCouples
        .filter(c => c.wedding_year == null || c.wedding_year < COUPLES_TABLE_MIN_YEAR)
        .map((c, i) => ({
          ...c,
          rowNum: i + 1,
          company: companyFor(c),
        })),
    [historicalCouples],
  )

  const filteredHistorical = useMemo(() => {
    let result = enrichedHistorical
    if (yearFilter !== 'all') {
      if (typeof yearFilter === 'number' && yearFilter >= COUPLES_TABLE_MIN_YEAR) {
        return []
      }
      result = result.filter(r => r.wedding_year === yearFilter)
    }
    if (debouncedSearch) {
      const qDigits = debouncedSearch.replace(/\D/g, '')
      result = result.filter(r => {
        for (const f of SEARCH_FIELDS) {
          const v = r[f]
          if (typeof v === 'string' && v.toLowerCase().includes(debouncedSearch)) return true
        }
        if (qDigits) {
          if (r.phone_1 && r.phone_1.replace(/\D/g, '').includes(qDigits)) return true
          if (r.phone_2 && r.phone_2.replace(/\D/g, '').includes(qDigits)) return true
        }
        return false
      })
    }
    return result
  }, [enrichedHistorical, yearFilter, debouncedSearch])

  const filteredCouples = useMemo(() => {
    let result = couplesTableRows
    if (yearFilter !== 'all') {
      if (typeof yearFilter === 'number' && yearFilter < COUPLES_TABLE_MIN_YEAR) {
        return []
      }
      result = result.filter(r => r.wedding_year === yearFilter)
    }
    if (debouncedSearch) {
      result = result.filter(r => {
        for (const f of COUPLES_SEARCH_FIELDS) {
          const v = r[f]
          if (typeof v === 'string' && v.toLowerCase().includes(debouncedSearch)) return true
        }
        return false
      })
    }
    return result
  }, [couplesTableRows, yearFilter, debouncedSearch])

  const totalHistorical = filteredHistorical.length
  const totalCouples = filteredCouples.length
  const totalCount = totalHistorical + totalCouples
  const sigsCount = useMemo(() => filteredHistorical.filter(r => r.company === 'SIGS').length, [filteredHistorical])
  const excellenceCount = useMemo(
    () => filteredHistorical.filter(r => r.company === 'Excellence').length,
    [filteredHistorical],
  )

  const historicalGroups = useMemo(() => {
    const groups = new Map<number, RowShape[]>()
    const undated: RowShape[] = []
    for (const r of filteredHistorical) {
      if (r.wedding_year == null) {
        undated.push(r)
      } else {
        const arr = groups.get(r.wedding_year) ?? []
        arr.push(r)
        groups.set(r.wedding_year, arr)
      }
    }
    const sorted = Array.from(groups.entries()).sort(([a], [b]) => b - a)
    const renumberedGroups = sorted.map(([year, rows]) => {
      const renum = rows.map((r, i) => ({ ...r, rowNum: i + 1 }))
      return [year, renum] as const
    })
    const undatedRenum = undated.map((r, i) => ({ ...r, rowNum: i + 1 }))
    return { groups: renumberedGroups, undated: undatedRenum }
  }, [filteredHistorical])

  const couplesGroups = useMemo(() => {
    const groups = new Map<number, CouplesArchiveRow[]>()
    for (const r of filteredCouples) {
      if (r.wedding_year == null) continue
      const arr = groups.get(r.wedding_year) ?? []
      arr.push(r)
      groups.set(r.wedding_year, arr)
    }
    const sorted = Array.from(groups.entries()).sort(([a], [b]) => b - a)
    return sorted.map(([year, rows]) => {
      const sortedRows = [...rows].sort((a, b) => {
        const da = a.wedding_date ?? ''
        const db = b.wedding_date ?? ''
        return da.localeCompare(db)
      })
      const renum = sortedRows.map((r, i) => ({ ...r, rowNum: i + 1 }))
      return [year, renum] as const
    })
  }, [filteredCouples])

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

  const hasSearch = debouncedSearch.length > 0

  const handleHistoricalRowClick = (c: HistoricalCouple) => {
    setSelected(c)
    setSheetOpen(true)
  }

  const showCouplesOnlySummary =
    typeof yearFilter === 'number' && yearFilter >= COUPLES_TABLE_MIN_YEAR

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

                {showCouplesOnlySummary ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{totalCouples}</span>{' '}
                    couple{totalCouples !== 1 ? 's' : ''}
                  </p>
                ) : (
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
                )}
              </div>

              {/* Table */}
              <div ref={tableRef}>
                {totalCount === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No historical couples match your filters.
                  </div>
                ) : (
                  <>
                    {couplesGroups.map(([year, rows]) => (
                      <CouplesYearGroup
                        key={`couples-${year}`}
                        year={year}
                        rows={rows}
                        expanded={hasSearch || expandedYears.has(year)}
                        onToggle={toggleYear}
                      />
                    ))}
                    {historicalGroups.groups.map(([year, rows]) => (
                      <HistoricalYearGroup
                        key={`historical-${year}`}
                        year={year}
                        rows={rows}
                        expanded={hasSearch || expandedYears.has(year)}
                        onToggle={toggleYear}
                        onRowClick={handleHistoricalRowClick}
                      />
                    ))}
                    {historicalGroups.undated.length > 0 && (
                      <div className="px-4 py-2 text-xs text-muted-foreground">
                        {historicalGroups.undated.length} undated couple
                        {historicalGroups.undated.length !== 1 ? 's' : ''} hidden (no wedding_year)
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <HistoricalCoupleSheet
        couple={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
