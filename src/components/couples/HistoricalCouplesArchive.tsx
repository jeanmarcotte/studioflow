'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MasterCouple {
  id: string;
  bride: string;
  groom: string;
  wedding_date: string;
  wedding_year: number;
  company: string;
}

const columnHelper = createColumnHelper<MasterCouple & { rowNum: number }>();

const columns = [
  columnHelper.accessor('rowNum', {
    header: '#',
    cell: (info) => info.getValue(),
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
      const val = info.getValue();
      if (!val) return '—';
      const date = new Date(val);
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
        : 'bg-blue-100 text-blue-700';
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${badgeClass}`}>
          {company}
        </span>
      );
    },
  }),
];

function YearGroup({ year, couples, company, defaultExpanded }: { year: number; couples: MasterCouple[]; company: string; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [sorting, setSorting] = useState<SortingState>([]);

  const numbered = useMemo(() => couples.map((c, i) => ({ ...c, rowNum: i + 1 })), [couples]);

  const table = useReactTable({
    data: numbered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-sm"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-semibold">{year}</span>
          <span className="text-gray-500">({couples.length} couple{couples.length !== 1 ? 's' : ''})</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${company === 'SIGS' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
          {company}
        </span>
      </button>
      {expanded && (
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
      )}
    </div>
  );
}

export function HistoricalCouplesArchive() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [couples, setCouples] = useState<MasterCouple[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isExpanded || couples.length > 0) return;
    setLoading(true);
    supabase
      .from('master_couples')
      .select('id, bride, groom, wedding_date, wedding_year, company')
      .order('wedding_year', { ascending: false })
      .order('wedding_date', { ascending: true })
      .then(({ data }) => {
        setCouples(data || []);
        setLoading(false);
      });
  }, [isExpanded, couples.length]);

  const sigsCount = useMemo(() => couples.filter((c) => c.company === 'SIGS').length, [couples]);
  const excellenceCount = useMemo(() => couples.filter((c) => c.company === 'Excellence').length, [couples]);

  const yearGroups = useMemo(() => {
    const groups = new Map<number, MasterCouple[]>();
    couples.forEach((c) => {
      const yr = c.wedding_year;
      if (!groups.has(yr)) groups.set(yr, []);
      groups.get(yr)!.push(c);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => b - a);
  }, [couples]);

  const yearRange = yearGroups.length > 0
    ? `${yearGroups[yearGroups.length - 1][0]}-${yearGroups[0][0]}`
    : '';

  return (
    <div className="mt-8 border rounded-lg bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          <h2 className="text-lg font-semibold">Historical Archive</h2>
          {couples.length > 0 && (
            <span className="text-sm text-gray-500">({couples.length} couples, {yearRange})</span>
          )}
        </div>
        {couples.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <span className="px-2 py-1 rounded bg-green-100 text-green-700">SIGS: {sigsCount}</span>
            <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">Excellence: {excellenceCount}</span>
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="border-t">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
            </div>
          ) : (
            yearGroups.map(([year, groupCouples]) => {
              const company = groupCouples[0]?.company || 'SIGS';
              return (
                <YearGroup
                  key={year}
                  year={year}
                  couples={groupCouples}
                  company={company}
                  defaultExpanded={year >= 2026}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
