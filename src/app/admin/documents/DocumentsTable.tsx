'use client'

import { useMemo, useState } from 'react'
import {
  ColumnDef,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
} from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/ui/data-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Eye, Printer, Mail } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { CoupleDocRow } from './page'

function formatWeddingDateWithDow(date: string): string {
  if (!date) return '\u2014'
  try {
    const parsed = parseISO(date)
    const dow = format(parsed, 'EEE').toUpperCase()
    const rest = format(parsed, 'MMM d, yyyy')
    return `${dow} ${rest}`
  } catch {
    return '\u2014'
  }
}

const statusColors: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-700',
  quoted: 'bg-yellow-100 text-yellow-700',
  booked: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
}

function DocIcon({ href, title }: { href: string; title: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="text-blue-600 hover:text-blue-800 cursor-pointer"
    >
      📄
    </a>
  )
}

function StatusCheck({ exists }: { exists: boolean }) {
  return exists
    ? <span className="text-green-600 font-medium">✓</span>
    : <span className="text-gray-300">—</span>
}

function ActionsCell({ row }: { row: CoupleDocRow }) {
  const hasC1 = row.contract_ids.length > 0
  const hasC2 = row.extras_order_ids.length > 0
  const hasC3 = row.has_extras
  const hasEmail = !!row.email
  const coupleName = `${row.bride_first_name} %26 ${row.groom_first_name}`

  const noActions = !hasC1 && !hasC2 && !hasC3
  if (noActions) return <span className="text-gray-300">—</span>

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* View section */}
        <DropdownMenuLabel>View</DropdownMenuLabel>
        {hasC1 && (
          <DropdownMenuItem onClick={() => window.open(`/admin/contracts/${row.contract_ids[0]}/view`, '_blank')}>
            <Eye className="h-4 w-4 mr-2" /> View C1 Contract
          </DropdownMenuItem>
        )}
        {hasC2 && (
          <DropdownMenuItem onClick={() => window.open(`/admin/albums/${row.extras_order_ids[0]}/view`, '_blank')}>
            <Eye className="h-4 w-4 mr-2" /> View C2 Frames & Albums
          </DropdownMenuItem>
        )}
        {hasC3 && (
          <DropdownMenuItem onClick={() => window.open(`/admin/extras/${row.id}/view`, '_blank')}>
            <Eye className="h-4 w-4 mr-2" /> View C3 Extras
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Print section */}
        <DropdownMenuLabel>Print</DropdownMenuLabel>
        {hasC1 && (
          <DropdownMenuItem onClick={() => window.open(`/admin/contracts/${row.contract_ids[0]}/view?print=true`, '_blank')}>
            <Printer className="h-4 w-4 mr-2" /> Print C1 Contract
          </DropdownMenuItem>
        )}
        {hasC2 && (
          <DropdownMenuItem onClick={() => window.open(`/admin/albums/${row.extras_order_ids[0]}/view?print=true`, '_blank')}>
            <Printer className="h-4 w-4 mr-2" /> Print C2 Frames & Albums
          </DropdownMenuItem>
        )}
        {hasC3 && (
          <DropdownMenuItem onClick={() => window.open(`/admin/extras/${row.id}/view?print=true`, '_blank')}>
            <Printer className="h-4 w-4 mr-2" /> Print C3 Extras
          </DropdownMenuItem>
        )}

        {/* Email section */}
        {hasEmail && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Email</DropdownMenuLabel>
            {hasC1 && (
              <DropdownMenuItem onClick={() => window.open(`mailto:${row.email}?subject=SIGS Photography — Contract — ${coupleName}`)}>
                <Mail className="h-4 w-4 mr-2" /> Email C1 to Couple
              </DropdownMenuItem>
            )}
            {hasC2 && (
              <DropdownMenuItem onClick={() => window.open(`mailto:${row.email}?subject=SIGS Photography — Frames %26 Albums — ${coupleName}`)}>
                <Mail className="h-4 w-4 mr-2" /> Email C2 to Couple
              </DropdownMenuItem>
            )}
            {hasC3 && (
              <DropdownMenuItem onClick={() => window.open(`mailto:${row.email}?subject=SIGS Photography — Extras — ${coupleName}`)}>
                <Mail className="h-4 w-4 mr-2" /> Email C3 to Couple
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface DocumentsTableProps {
  data: CoupleDocRow[]
}

export function DocumentsTable({ data }: DocumentsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [yearFilter, setYearFilter] = useState('2026')
  const [nameSearch, setNameSearch] = useState('')

  // Filter data by year + name
  const filteredData = useMemo(() => {
    let result = data

    if (yearFilter !== 'all') {
      result = result.filter(r => {
        if (!r.wedding_date) return false
        try {
          return parseISO(r.wedding_date).getFullYear() === parseInt(yearFilter)
        } catch {
          return false
        }
      })
    }

    if (nameSearch.trim()) {
      const q = nameSearch.trim().toLowerCase()
      result = result.filter(r =>
        r.bride_first_name.toLowerCase().includes(q) ||
        r.groom_first_name.toLowerCase().includes(q)
      )
    }

    return result
  }, [data, yearFilter, nameSearch])

  // Metrics
  const metrics = useMemo(() => ({
    total: filteredData.length,
    c1: filteredData.filter(r => r.contract_ids.length > 0).length,
    c2: filteredData.filter(r => r.extras_order_ids.length > 0).length,
    c3: filteredData.filter(r => r.has_extras).length,
  }), [filteredData])

  const columns: ColumnDef<CoupleDocRow>[] = useMemo(() => [
    {
      id: 'rowNumber',
      header: '#',
      cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span>,
      enableSorting: false,
    },
    {
      id: 'couple',
      accessorFn: (row) => row.bride_first_name,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => (
        <span className="font-medium whitespace-nowrap">
          {row.original.bride_first_name} & {row.original.groom_first_name}
        </span>
      ),
    },
    {
      id: 'weddingDate',
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{formatWeddingDateWithDow(row.original.wedding_date)}</span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const s = row.original.status
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s] || 'bg-gray-100 text-gray-700'}`}>
            {s}
          </span>
        )
      },
    },
    {
      id: 'c1',
      header: 'C1',
      cell: ({ row }) => {
        const ids = row.original.contract_ids
        if (ids.length === 0) return <span className="text-gray-300">—</span>
        return (
          <span className="flex gap-1">
            {ids.map(id => <DocIcon key={id} href={`/admin/contracts/${id}/view`} title="View C1 Contract" />)}
          </span>
        )
      },
      enableSorting: false,
    },
    {
      id: 'c2',
      header: 'C2',
      cell: ({ row }) => {
        const ids = row.original.extras_order_ids
        if (ids.length === 0) return <span className="text-gray-300">—</span>
        return (
          <span className="flex gap-1">
            {ids.map(id => <DocIcon key={id} href={`/admin/albums/${id}/view`} title="View C2 Frames & Albums" />)}
          </span>
        )
      },
      enableSorting: false,
    },
    {
      id: 'c3',
      header: 'C3',
      cell: ({ row }) => {
        if (!row.original.has_extras) return <span className="text-gray-300">—</span>
        return <DocIcon href={`/admin/extras/${row.original.id}/view`} title="View C3 Extras" />
      },
      enableSorting: false,
    },
    {
      id: 'qt',
      header: 'QT',
      cell: ({ row }) => <StatusCheck exists={row.original.has_quote} />,
      enableSorting: false,
    },
    {
      id: 'wdf',
      header: 'WDF',
      cell: ({ row }) => <StatusCheck exists={row.original.has_wedding_day_form} />,
      enableSorting: false,
    },
    {
      id: 'pof',
      header: 'POF',
      cell: ({ row }) => <StatusCheck exists={row.original.has_photo_order} />,
      enableSorting: false,
    },
    {
      id: 'vof',
      header: 'VOF',
      cell: ({ row }) => <StatusCheck exists={row.original.has_video_order} />,
      enableSorting: false,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <ActionsCell row={row.original} />,
      enableSorting: false,
    },
  ], [])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex items-center gap-4">
        <Select value={yearFilter} onValueChange={(v) => { if (v) setYearFilter(v) }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            <SelectItem value="2028">2028</SelectItem>
            <SelectItem value="2027">2027</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search by name..."
          value={nameSearch}
          onChange={(e) => setNameSearch(e.target.value)}
          className="max-w-xs"
        />

        <span className="text-sm text-muted-foreground ml-auto">
          Showing {filteredData.length} of {data.length} couples
        </span>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Couples', value: metrics.total },
          { label: 'Contracts (C1)', value: metrics.c1 },
          { label: 'Frames (C2)', value: metrics.c2 },
          { label: 'Extras (C3)', value: metrics.c3 },
        ].map(m => (
          <div key={m.label} className="bg-white border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold">{m.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No couples found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
