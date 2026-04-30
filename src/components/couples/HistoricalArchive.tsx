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
import { supabase } from '@/lib/supabase'
import { formatWeddingDate } from '@/lib/formatters'
import { YearSelector, type YearValue } from './YearSelector'
import { HistoricalCoupleSheet } from './HistoricalCoupleSheet'
import {
  companyFor,
  type Company,
  type HistoricalCouple,
} from './historicalArchiveTypes'

interface RowShape extends HistoricalCouple {
  rowNum: number
  company: Company
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

const columnHelper = createColumnHelper<RowShape>()

function buildColumns(onRowClick: (c: HistoricalCouple) => void) {
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

function YearGroup({
  year,
  rows,
  defaultExpanded,
  onRowClick,
}: {
  year: number
  rows: RowShape[]
  defaultExpanded: boolean
  onRowClick: (c: HistoricalCouple) => void
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [sorting, setSorting] = useState<SortingState>([])

  const sigsCount = useMemo(() => rows.filter(r => r.company === 'SIGS').length, [rows])
  const excellenceCount = useMemo(() => rows.filter(r => r.company === 'Excellence').length, [rows])

  const columns = useMemo(() => buildColumns(onRowClick), [onRowClick])

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
        onClick={() => setExpanded(v => !v)}
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

export function HistoricalArchive() {
  const [isOpen, setIsOpen] = useState(false)
  const [couples, setCouples] = useState<HistoricalCouple[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [yearFilter, setYearFilter] = useState<YearValue>('all')
  const [selected, setSelected] = useState<HistoricalCouple | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const tableRef = useRef<HTMLDivElement | null>(null)

  // Lazy-fetch on first expand
  useEffect(() => {
    if (!isOpen || loaded) return
    setLoading(true)
    ;(async () => {
      const { data, error } = await supabase
        .from('historical_couple_profiles')
        .select(
          'id, couple_id, bride_first_name, bride_last_name, groom_first_name, groom_last_name, bride_email, groom_email, phone_1, phone_2, wedding_date, wedding_year, ceremony_venue, park_name, reception_venue, glacier_archived, data_confidence',
        )
        .order('wedding_year', { ascending: false })
        .order('wedding_date', { ascending: false })
      if (!error) {
        setCouples((data ?? []) as HistoricalCouple[])
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

  // Years available from data, sorted desc
  const years = useMemo(() => {
    const set = new Set<number>()
    for (const c of couples) {
      if (c.wedding_year != null) set.add(c.wedding_year)
    }
    return Array.from(set).sort((a, b) => b - a)
  }, [couples])

  const enriched: RowShape[] = useMemo(
    () =>
      couples.map((c, i) => ({
        ...c,
        rowNum: i + 1,
        company: companyFor(c),
      })),
    [couples],
  )

  const filtered = useMemo(() => {
    let result = enriched
    if (yearFilter !== 'all') {
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
  }, [enriched, yearFilter, debouncedSearch])

  const totalCount = filtered.length
  const sigsCount = useMemo(() => filtered.filter(r => r.company === 'SIGS').length, [filtered])
  const excellenceCount = useMemo(
    () => filtered.filter(r => r.company === 'Excellence').length,
    [filtered],
  )

  const yearGroups = useMemo(() => {
    const groups = new Map<number, RowShape[]>()
    const undated: RowShape[] = []
    for (const r of filtered) {
      if (r.wedding_year == null) {
        undated.push(r)
      } else {
        const arr = groups.get(r.wedding_year) ?? []
        arr.push(r)
        groups.set(r.wedding_year, arr)
      }
    }
    // Renumber per group
    const sorted = Array.from(groups.entries()).sort(([a], [b]) => b - a)
    const renumberedGroups = sorted.map(([year, rows]) => {
      const renum = rows.map((r, i) => ({ ...r, rowNum: i + 1 }))
      return [year, renum] as const
    })
    const undatedRenum = undated.map((r, i) => ({ ...r, rowNum: i + 1 }))
    return { groups: renumberedGroups, undated: undatedRenum }
  }, [filtered])

  const handleYearChange = (v: YearValue) => {
    setYearFilter(v)
    // Smooth scroll to the table
    requestAnimationFrame(() => {
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleRowClick = (c: HistoricalCouple) => {
    setSelected(c)
    setSheetOpen(true)
  }

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
          {loaded && couples.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({couples.length} couple{couples.length !== 1 ? 's' : ''})
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

                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{totalCount}</span>{' '}
                  couple{totalCount !== 1 ? 's' : ''}
                  {' · '}
                  <span className="font-medium text-teal-700">SIGS: {sigsCount}</span>
                  {' · '}
                  <span className="font-medium text-green-700">Excellence: {excellenceCount}</span>
                </p>
              </div>

              {/* Table */}
              <div ref={tableRef}>
                {totalCount === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No historical couples match your filters.
                  </div>
                ) : (
                  <>
                    {yearGroups.groups.map(([year, rows]) => (
                      <YearGroup
                        key={`${yearFilter}-${year}`}
                        year={year}
                        rows={rows}
                        defaultExpanded={true}
                        onRowClick={handleRowClick}
                      />
                    ))}
                    {yearGroups.undated.length > 0 && (
                      <div className="px-4 py-2 text-xs text-muted-foreground">
                        {yearGroups.undated.length} undated couple
                        {yearGroups.undated.length !== 1 ? 's' : ''} hidden (no wedding_year)
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
