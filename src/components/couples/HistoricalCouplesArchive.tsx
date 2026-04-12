'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import historicalData from '@/data/historical_couples.json';

interface HistoricalCouple {
  bride: string;
  groom: string;
  wedding_date: string;
  year: number;
  company: 'SIGS' | 'Excellence';
  raw: string;
}

const columnHelper = createColumnHelper<HistoricalCouple>();

const columns = [
  columnHelper.display({
    id: 'index',
    header: '#',
    cell: (info) => info.row.index + 1,
    size: 50,
  }),
  columnHelper.accessor('bride', {
    header: 'Bride',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('groom', {
    header: 'Groom',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('wedding_date', {
    header: 'Wedding Date',
    cell: (info) => {
      const date = new Date(info.getValue());
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${days[date.getUTCDay()]} ${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
    },
  }),
  columnHelper.accessor('company', {
    header: 'Company',
    cell: (info) => {
      const company = info.getValue();
      const badgeClass = company === 'SIGS'
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-700';
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${badgeClass}`}>
          {company}
        </span>
      );
    },
  }),
];

export function HistoricalCouplesArchive() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const couples = historicalData.couples as HistoricalCouple[];

  // Get unique years sorted descending
  const years = useMemo(() => {
    const uniqueYears = Array.from(new Set(couples.map((c) => c.year)));
    return uniqueYears.sort((a, b) => b - a);
  }, [couples]);

  // Count by year
  const yearCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    couples.forEach((c) => {
      counts[c.year] = (counts[c.year] || 0) + 1;
    });
    return counts;
  }, [couples]);

  // Filter by selected year
  const filteredByYear = useMemo(() => {
    if (selectedYear === 'all') return couples;
    return couples.filter((c) => c.year === selectedYear);
  }, [couples, selectedYear]);

  const table = useReactTable({
    data: filteredByYear,
    columns,
    state: {
      globalFilter,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const bride = row.original.bride.toLowerCase();
      const groom = row.original.groom.toLowerCase();
      const date = row.original.wedding_date.toLowerCase();
      return bride.includes(search) || groom.includes(search) || date.includes(search);
    },
  });

  // Stats
  const sigsCount = couples.filter((c) => c.company === 'SIGS').length;
  const excellenceCount = couples.filter((c) => c.company === 'Excellence').length;

  return (
    <div className="mt-8 border rounded-lg bg-white">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          <h2 className="text-lg font-semibold">Historical Archive</h2>
          <span className="text-sm text-gray-500">({couples.length} couples, 2001-2027)</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="px-2 py-1 rounded bg-green-100 text-green-700">SIGS: {sigsCount}</span>
          <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">Excellence: {excellenceCount}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t">
          {/* Cutoff Banner */}
          <div className="px-4 py-2 bg-amber-50 border-b text-sm text-amber-800">
            📅 Excellence Photography ceased April 30, 2016. SIGS Photography: May 1, 2016 → present.
          </div>

          {/* Controls */}
          <div className="px-4 py-3 flex flex-wrap items-center gap-4 border-b bg-gray-50">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search bride, groom, or date..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Year Tabs */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSelectedYear('all')}
                className={`px-3 py-1 text-sm rounded ${
                  selectedYear === 'all'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All ({couples.length})
              </button>
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-3 py-1 text-sm rounded ${
                    selectedYear === year
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {year} ({yearCounts[year]})
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-2 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: ' ↑',
                            desc: ' ↓',
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, i) => (
                  <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t bg-gray-50 text-sm text-gray-600">
            Showing {table.getRowModel().rows.length} of {filteredByYear.length} couples
            {globalFilter && ` (filtered from ${filteredByYear.length})`}
          </div>
        </div>
      )}
    </div>
  );
}
