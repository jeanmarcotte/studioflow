'use client'

import { useMemo, useState } from 'react'
import {
  ColumnDef,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
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
import { MoreVertical, FileText, Check, Minus, Eye, Printer, Mail } from 'lucide-react'
import { parseISO, format } from 'date-fns'
import type { CoupleDocRow } from './page'

function formatWeddingDateWithDow(date: string): string {
  if (!date) return '—'
  try {
    const parsed = parseISO(date)
    const dow = format(parsed, 'EEE').toUpperCase()
    const rest = format(parsed, 'MMM d, yyyy')
    return `${dow} ${rest}`
  } catch {
    return '—'
  }
}

const statusColors: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-700',
  quoted: 'bg-yellow-100 text-yellow-700',
  booked: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
}

function DocLink({ href, title }: { href: string; title: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={title} className="text-blue-600 hover:text-blue-800">
      <FileText size={16} />
    </a>
  )
}

function DocStatus({ ids, baseUrl, title }: { ids: string[]; baseUrl: string; title: string }) {
  if (ids.length === 0) return <Minus size={16} className="text-gray-300 mx-auto" />
  return (
    <span className="flex gap-1 justify-center">
      {ids.map(id => <DocLink key={id} href={`${baseUrl}/${id}`} title={title} />)}
    </span>
  )
}

function BoolDoc({ exists }: { exists: boolean }) {
  return exists
    ? <Check size={16} className="text-green-600 mx-auto" />
    : <Minus size={16} className="text-gray-300 mx-auto" />
}

function ActionsCell({ row }: { row: CoupleDocRow }) {
  const hasC1 = row.contract_ids.length > 0
  const hasC2 = row.extras_order_ids.length > 0
  const hasC3 = row.has_extras
  const hasWdf = row.wdf_ids.length > 0
  const hasPof = row.pof_ids.length > 0
  const hasVof = row.vof_ids.length > 0
  const hasEmail = !!row.email
  const coupleName = `${row.bride_first_name} %26 ${row.groom_first_name}`

  const noActions = !hasC1 && !hasC2 && !hasC3 && !hasWdf && !hasPof && !hasVof
  if (noActions) return <Minus size={16} className="text-gray-300" />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent">
        <MoreVertical size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>View</DropdownMenuLabel>
        {hasC1 && (
          <DropdownMenuItem onClick={() => window.open(`/admin/contracts/${row.contract_ids[0]}/view`, '_blank')}>
            <Eye className="h-4 w-4 mr-2" /> Contract
          </DropdownMenuItem>
        )}
        {hasC2 && (
          <DropdownMenuItem onClick={() => window.open(`/admin/albums/${row.extras_order_ids[0]}/view`, '_blank')}>
            <Eye className="h-4 w-4 mr-2" /> Frames & Albums
          </DropdownMenuItem>
        )}
        {hasC3 && (
          <DropdownMenuItem onClick={() => window.open(`/admin/extras/${row.id}/view`, '_blank')}>
            <Eye className="h-4 w-4 mr-2" /> Extras
          </DropdownMenuItem>
        )}
        {hasWdf && (
          <DropdownMenuItem onClick={() => window.open(`/admin/documents/wedding-day-form/${row.wdf_ids[0]}`, '_blank')}>
            <Eye className="h-4 w-4 mr-2" /> Day Form
          </DropdownMenuItem>
        )}
        {hasPof && (
          <DropdownMenuItem onClick={() => window.open(`/admin/documents/photo-order/${row.pof_ids[0]}`, '_blank')}>
            <Eye className="h-4 w-4 mr-2" /> Photo Order
          </DropdownMenuItem>
        )}
        {hasVof && (
          <DropdownMenuItem onClick={() => window.open(`/admin/documents/video-order/${row.vof_ids[0]}`, '_blank')}>
            <Eye className="h-4 w-4 mr-2" /> Video Order
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Print</DropdownMenuLabel>
        {hasC1 && (
          <DropdownMenuItem onClick={() => window.open(`/admin/contracts/${row.contract_ids[0]}/view?print=true`, '_blank')}>
            <Printer className="h-4 w-4 mr-2" /> Contract
          </DropdownMenuItem>
        )}
        {hasC2 && (
          <DropdownMenuItem onClick={() => window.open(`/admin/albums/${row.extras_order_ids[0]}/view?print=true`, '_blank')}>
            <Printer className="h-4 w-4 mr-2" /> Frames & Albums
          </DropdownMenuItem>
        )}
        {hasC3 && (
          <DropdownMenuItem onClick={() => window.open(`/admin/extras/${row.id}/view?print=true`, '_blank')}>
            <Printer className="h-4 w-4 mr-2" /> Extras
          </DropdownMenuItem>
        )}
        {hasWdf && (
          <DropdownMenuItem onClick={() => window.open(`/admin/documents/wedding-day-form/${row.wdf_ids[0]}?print=true`, '_blank')}>
            <Printer className="h-4 w-4 mr-2" /> Day Form
          </DropdownMenuItem>
        )}
        {hasPof && (
          <DropdownMenuItem onClick={() => window.open(`/admin/documents/photo-order/${row.pof_ids[0]}?print=true`, '_blank')}>
            <Printer className="h-4 w-4 mr-2" /> Photo Order
          </DropdownMenuItem>
        )}
        {hasVof && (
          <DropdownMenuItem onClick={() => window.open(`/admin/documents/video-order/${row.vof_ids[0]}?print=true`, '_blank')}>
            <Printer className="h-4 w-4 mr-2" /> Video Order
          </DropdownMenuItem>
        )}

        {hasEmail && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Email</DropdownMenuLabel>
            {hasC1 && (
              <DropdownMenuItem onClick={() => window.open(`mailto:${row.email}?subject=SIGS Photography — Contract — ${coupleName}`)}>
                <Mail className="h-4 w-4 mr-2" /> Contract
              </DropdownMenuItem>
            )}
            {hasC2 && (
              <DropdownMenuItem onClick={() => window.open(`mailto:${row.email}?subject=SIGS Photography — Frames %26 Albums — ${coupleName}`)}>
                <Mail className="h-4 w-4 mr-2" /> Frames & Albums
              </DropdownMenuItem>
            )}
            {hasC3 && (
              <DropdownMenuItem onClick={() => window.open(`mailto:${row.email}?subject=SIGS Photography — Extras — ${coupleName}`)}>
                <Mail className="h-4 w-4 mr-2" /> Extras
              </DropdownMenuItem>
            )}
            {hasWdf && (
              <DropdownMenuItem onClick={() => window.open(`mailto:${row.email}?subject=SIGS Photography — Day Form — ${coupleName}`)}>
                <Mail className="h-4 w-4 mr-2" /> Day Form
              </DropdownMenuItem>
            )}
            {hasPof && (
              <DropdownMenuItem onClick={() => window.open(`mailto:${row.email}?subject=SIGS Photography — Photo Order — ${coupleName}`)}>
                <Mail className="h-4 w-4 mr-2" /> Photo Order
              </DropdownMenuItem>
            )}
            {hasVof && (
              <DropdownMenuItem onClick={() => window.open(`mailto:${row.email}?subject=SIGS Photography — Video Order — ${coupleName}`)}>
                <Mail className="h-4 w-4 mr-2" /> Video Order
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
  const [sorting, setSorting] = useState<SortingState>([{ id: 'weddingDate', desc: false }])
  const [yearFilter, setYearFilter] = useState('all')
  const [nameSearch, setNameSearch] = useState('')

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

  const columns: ColumnDef<CoupleDocRow>[] = useMemo(() => [
    {
      id: 'rowNumber',
      header: '#',
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.index + 1}</span>,
      enableSorting: false,
      size: 40,
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
        <span className="whitespace-nowrap text-sm">{formatWeddingDateWithDow(row.original.wedding_date)}</span>
      ),
      size: 160,
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
      size: 100,
    },
    {
      id: 'contract',
      header: 'Contract',
      cell: ({ row }) => <DocStatus ids={row.original.contract_ids} baseUrl="/admin/contracts" title="View Contract" />,
      enableSorting: false,
      size: 50,
    },
    {
      id: 'frames',
      header: 'Frames',
      cell: ({ row }) => <DocStatus ids={row.original.extras_order_ids} baseUrl="/admin/albums" title="View Frames & Albums" />,
      enableSorting: false,
      size: 50,
    },
    {
      id: 'extras',
      header: 'Extras',
      cell: ({ row }) => {
        if (!row.original.has_extras) return <Minus size={16} className="text-gray-300 mx-auto" />
        return <DocLink href={`/admin/extras/${row.original.id}/view`} title="View Extras" />
      },
      enableSorting: false,
      size: 50,
    },
    {
      id: 'dayForm',
      header: 'Day Form',
      cell: ({ row }) => <DocStatus ids={row.original.wdf_ids} baseUrl="/admin/documents/wedding-day-form" title="View Day Form" />,
      enableSorting: false,
      size: 50,
    },
    {
      id: 'photoOrder',
      header: 'Photo Order',
      cell: ({ row }) => <DocStatus ids={row.original.pof_ids} baseUrl="/admin/documents/photo-order" title="View Photo Order" />,
      enableSorting: false,
      size: 50,
    },
    {
      id: 'videoOrder',
      header: 'Video Order',
      cell: ({ row }) => <DocStatus ids={row.original.vof_ids} baseUrl="/admin/documents/video-order" title="View Video Order" />,
      enableSorting: false,
      size: 50,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <ActionsCell row={row.original} />,
      enableSorting: false,
      size: 40,
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

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 bg-gray-50 z-10">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="text-center text-xs"
                    style={{ width: header.column.getSize() !== 150 ? header.column.getSize() : undefined }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row, i) => (
                <TableRow key={row.id} className={`${i % 2 === 1 ? 'bg-gray-50' : ''} h-9`}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="py-1.5 px-2 text-center">
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
