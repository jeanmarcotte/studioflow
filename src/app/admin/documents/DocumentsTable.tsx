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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MoreVertical, FileText, Check, Minus } from 'lucide-react'
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

function DocStatus({ ids, baseUrl, suffix = '', title }: { ids: string[]; baseUrl: string; suffix?: string; title: string }) {
  if (ids.length === 0) return <Minus size={16} className="text-gray-300 mx-auto" />
  return (
    <span className="flex gap-1 justify-center">
      {ids.map(id => <DocLink key={id} href={`${baseUrl}/${id}${suffix}`} title={title} />)}
    </span>
  )
}

function BoolDoc({ exists }: { exists: boolean }) {
  return exists
    ? <Check size={16} className="text-green-600 mx-auto" />
    : <Minus size={16} className="text-gray-300 mx-auto" />
}

function ActionsPopover({ couple }: { couple: CoupleDocRow }) {
  const links: { label: string; href: string; section: string }[] = []

  if (couple.contract_ids && couple.contract_ids.length > 0) {
    links.push({ label: 'View Contract', href: `/admin/contracts/${couple.contract_ids[0]}/view`, section: 'view' })
  }
  if (couple.extras_order_ids && couple.extras_order_ids.length > 0) {
    links.push({ label: 'View Frames', href: `/admin/albums/${couple.extras_order_ids[0]}/view`, section: 'view' })
  }
  if (couple.has_extras) {
    links.push({ label: 'View Extras', href: `/admin/extras/${couple.id}/view`, section: 'view' })
  }
  if (couple.wdf_ids && couple.wdf_ids.length > 0) {
    links.push({ label: 'View Day Form', href: `/admin/documents/wedding-day-form/${couple.wdf_ids[0]}`, section: 'view' })
  }
  if (couple.pof_ids && couple.pof_ids.length > 0) {
    links.push({ label: 'View Photo Order', href: `/admin/documents/photo-order/${couple.pof_ids[0]}`, section: 'view' })
  }
  if (couple.vof_ids && couple.vof_ids.length > 0) {
    links.push({ label: 'View Video Order', href: `/admin/documents/video-order/${couple.vof_ids[0]}`, section: 'view' })
  }

  if (couple.contract_ids && couple.contract_ids.length > 0) {
    links.push({ label: 'Print Contract', href: `/admin/contracts/${couple.contract_ids[0]}/view?print=true`, section: 'print' })
  }
  if (couple.extras_order_ids && couple.extras_order_ids.length > 0) {
    links.push({ label: 'Print Frames', href: `/admin/albums/${couple.extras_order_ids[0]}/view?print=true`, section: 'print' })
  }
  if (couple.has_extras) {
    links.push({ label: 'Print Extras', href: `/admin/extras/${couple.id}/view?print=true`, section: 'print' })
  }

  if (links.length === 0) return <span className="text-gray-300">—</span>

  const viewLinks = links.filter(l => l.section === 'view')
  const printLinks = links.filter(l => l.section === 'print')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="p-1 rounded hover:bg-gray-100">
          <MoreVertical size={16} className="text-gray-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1">
        {viewLinks.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 px-3 py-1.5">View</p>
            {viewLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-1.5 text-sm rounded hover:bg-gray-100 text-gray-700"
              >
                {link.label}
              </a>
            ))}
          </>
        )}
        {printLinks.length > 0 && (
          <>
            <div className="my-1 border-t" />
            <p className="text-xs font-semibold text-gray-400 px-3 py-1.5">Print</p>
            {printLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-1.5 text-sm rounded hover:bg-gray-100 text-gray-700"
              >
                {link.label}
              </a>
            ))}
          </>
        )}
      </PopoverContent>
    </Popover>
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" className="text-left" />,
      cell: ({ row }) => (
        <a href={`/admin/couples/${row.original.id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium whitespace-nowrap">
          {row.original.bride_first_name} & {row.original.groom_first_name}
        </a>
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
      accessorFn: (row) => row.contract_ids.length > 0 ? 1 : 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contract" />,
      cell: ({ row }) => <DocStatus ids={row.original.contract_ids} baseUrl="/admin/contracts" suffix="/view" title="View Contract" />,
      size: 50,
    },
    {
      id: 'frames',
      accessorFn: (row) => row.extras_order_ids.length > 0 ? 1 : 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Frames" />,
      cell: ({ row }) => <DocStatus ids={row.original.extras_order_ids} baseUrl="/admin/albums" suffix="/view" title="View Frames & Albums" />,
      size: 50,
    },
    {
      id: 'extras',
      accessorFn: (row) => row.has_extras ? 1 : 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Extras" />,
      cell: ({ row }) => {
        if (!row.original.has_extras) return <Minus size={16} className="text-gray-300 mx-auto" />
        return <DocLink href={`/admin/extras/${row.original.id}/view`} title="View Extras" />
      },
      size: 50,
    },
    {
      id: 'dayForm',
      accessorFn: (row) => row.wdf_ids.length > 0 ? 1 : 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Day Form" />,
      cell: ({ row }) => <DocStatus ids={row.original.wdf_ids} baseUrl="/admin/documents/wedding-day-form" title="View Day Form" />,
      size: 50,
    },
    {
      id: 'photoOrder',
      accessorFn: (row) => row.pof_ids.length > 0 ? 1 : 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Photo Order" />,
      cell: ({ row }) => <DocStatus ids={row.original.pof_ids} baseUrl="/admin/documents/photo-order" title="View Photo Order" />,
      size: 50,
    },
    {
      id: 'videoOrder',
      accessorFn: (row) => row.vof_ids.length > 0 ? 1 : 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Video Order" />,
      cell: ({ row }) => <DocStatus ids={row.original.vof_ids} baseUrl="/admin/documents/video-order" title="View Video Order" />,
      size: 50,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <ActionsPopover couple={row.original} />,
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
                    className={`text-xs ${header.id === 'couple' ? 'text-left' : 'text-center'}`}
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
                    <TableCell key={cell.id} className={`py-1.5 px-2 ${cell.column.id === 'couple' ? 'text-left' : 'text-center'}`}>
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
