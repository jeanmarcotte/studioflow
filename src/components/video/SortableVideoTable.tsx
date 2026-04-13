'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { supabase } from '@/lib/supabase'

interface SortableRow {
  id: string
  sort_order: number | null
}

interface SortableVideoTableProps<TData extends SortableRow> {
  columns: ColumnDef<TData>[]
  data: TData[]
  onReorder: (reorderedData: TData[]) => void
  emptyMessage?: string
}

// ── Sortable Row ─────────────────────────────────────────────────

function SortableTableRow<TData extends SortableRow>({
  row,
  index,
  children,
}: {
  row: { original: TData }
  index: number
  children: React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.original.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      {/* Drag handle cell */}
      <TableCell className="text-muted-foreground text-center cursor-grab w-[30px] px-1" {...listeners}>
        <span className="text-base select-none">⠿</span>
      </TableCell>
      <TableCell className="w-8 text-center text-gray-500 text-sm">{index + 1}</TableCell>
      {children}
    </TableRow>
  )
}

// ── Main Component ───────────────────────────────────────────────

export function SortableVideoTable<TData extends SortableRow>({
  columns,
  data,
  onReorder,
  emptyMessage = 'No jobs in this lane',
}: SortableVideoTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  })

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = data.findIndex(job => job.id === active.id)
    const newIndex = data.findIndex(job => job.id === over.id)
    const newOrder = arrayMove(data, oldIndex, newIndex)

    // Optimistic update
    onReorder(newOrder)

    // Persist to database
    const updates = newOrder.map((job, index) => ({
      id: job.id,
      sort_order: index + 1,
    }))

    for (const update of updates) {
      await supabase
        .from('video_jobs')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={data.map(job => job.id)}
            strategy={verticalListSortingStrategy}
          >
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {/* Empty header for drag handle column */}
                    <TableHead style={{ width: 30 }} />
                    {/* Row number column */}
                    <TableHead className="w-8 text-center">#</TableHead>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} style={{ width: header.getSize() }}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row, index) => (
                    <SortableTableRow key={row.id} row={row} index={index}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </SortableTableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + 2}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
