'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { differenceInDays, parseISO } from 'date-fns'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import { ProductionPageHeader, ProductionPills, ProductionSidebar } from '@/components/shared'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'

interface WeddingFormCouple {
  couple_id: string
  couple_name: string
  wedding_date: string | null
  form_id: string | null
  form_submitted_at: string | null
}

export default function WeddingDayFormsPage() {
  const router = useRouter()
  const [couples, setCouples] = useState<WeddingFormCouple[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchData() {
      // Fetch booked 2026 couples
      const { data: couplesData } = await supabase
        .from('couples')
        .select('id, couple_name, wedding_date')
        .eq('status', 'booked')
        .gte('wedding_date', '2026-01-01')
        .order('wedding_date', { ascending: true })

      // Fetch submitted forms
      const { data: formsData } = await supabase
        .from('wedding_day_forms')
        .select('id, couple_id, created_at')

      const formsMap = new Map<string, { id: string; created_at: string }>()
      if (formsData) {
        for (const f of formsData) {
          formsMap.set(f.couple_id, { id: f.id, created_at: f.created_at })
        }
      }

      const merged: WeddingFormCouple[] = (couplesData ?? []).map((c) => {
        const form = formsMap.get(c.id) ?? null
        return {
          couple_id: c.id,
          couple_name: c.couple_name ?? '',
          wedding_date: c.wedding_date ?? null,
          form_id: form ? form.id : null,
          form_submitted_at: form ? form.created_at : null,
        }
      })

      setCouples(merged)
      setLoading(false)
    }
    fetchData()
  }, [])

  const toggleLane = (key: string) => {
    setCollapsedLanes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const search = searchValue.toLowerCase()

  const submitted = couples.filter(
    (c) => c.form_id !== null && (!search || c.couple_name.toLowerCase().includes(search))
  )
  const missing = couples.filter(
    (c) => c.form_id === null && (!search || c.couple_name.toLowerCase().includes(search))
  )

  const submittedCount = couples.filter((c) => c.form_id !== null).length
  const missingCount = couples.filter((c) => c.form_id === null).length
  const totalCount = couples.length

  const today = new Date()

  // Columns for submitted forms
  const submittedColumns: ColumnDef<WeddingFormCouple>[] = [
    {
      accessorKey: 'couple_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/admin/couples/${row.original.couple_id}`)}
          className="text-blue-600 hover:underline font-medium text-left"
        >
          {row.original.couple_name}
        </button>
      ),
    },
    {
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      cell: ({ row }) => {
        const d = row.original.wedding_date
        if (!d) return <span className="text-muted-foreground">—</span>
        return (
          <span>
            {new Date(d + 'T00:00:00').toLocaleDateString('en-CA', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )
      },
    },
    {
      accessorKey: 'form_submitted_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Form Submitted" />,
      cell: ({ row }) => {
        const d = row.original.form_submitted_at
        if (!d) return <span className="text-muted-foreground">—</span>
        return (
          <span>
            {new Date(d).toLocaleDateString('en-CA', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )
      },
    },
  ]

  // Columns for missing forms
  const missingColumns: ColumnDef<WeddingFormCouple>[] = [
    {
      accessorKey: 'couple_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/admin/couples/${row.original.couple_id}`)}
          className="text-blue-600 hover:underline font-medium text-left"
        >
          {row.original.couple_name}
        </button>
      ),
    },
    {
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      cell: ({ row }) => {
        const d = row.original.wedding_date
        if (!d) return <span className="text-muted-foreground">—</span>
        return (
          <span>
            {new Date(d + 'T00:00:00').toLocaleDateString('en-CA', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )
      },
    },
    {
      id: 'days_until_wedding',
      accessorFn: (row) => {
        if (!row.wedding_date) return Infinity
        return differenceInDays(parseISO(row.wedding_date), today)
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Days Until Wedding" />,
      cell: ({ row }) => {
        const d = row.original.wedding_date
        if (!d) return <span className="text-muted-foreground">—</span>
        const days = differenceInDays(parseISO(d), today)
        if (days < 0) return <span className="text-muted-foreground text-sm">Past</span>
        if (days === 0) return <span className="text-red-600 font-semibold">Today</span>
        if (days <= 14)
          return <span className="text-red-600 font-semibold">{days} days</span>
        if (days <= 30)
          return <span className="text-amber-600 font-medium">{days} days</span>
        return <span>{days} days</span>
      },
    },
  ]

  return (
    <div className="space-y-0">
      <ProductionPageHeader
        title="Wedding Day Forms"
        subtitle="2026 season — client submissions"
        reportHref="/admin/production/report"
        actionLabel="+ Send Reminder"
        actionDisabled={true}
      />
      {/* TODO WO-321: Link Send Reminder once email feature is built */}

      <ProductionPills
        pills={[
          { label: 'Submitted', count: submittedCount, color: 'green' },
          { label: 'Missing', count: missingCount, color: 'red' },
          { label: 'Total 2026', count: totalCount, color: 'default' },
        ]}
      />

      <div className="flex">
        <div className="flex-1 overflow-y-auto p-6 border-r border-border">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search couples..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full max-w-sm pl-9 pr-4 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
          ) : (
            <>
              {/* Submitted Forms Section */}
              <div id="section-submitted" className="mb-6">
                <button
                  onClick={() => toggleLane('submitted')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 rounded-lg mb-3 hover:bg-secondary/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {collapsedLanes.has('submitted') ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-sm">Submitted Forms</span>
                    <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-green-100 text-green-700">
                      {submittedCount}
                    </span>
                  </div>
                </button>
                {!collapsedLanes.has('submitted') && (
                  <DataTable
                    columns={submittedColumns}
                    data={submitted}
                    showPagination={submitted.length > 20}
                    pageSize={20}
                    emptyMessage="No submitted forms."
                  />
                )}
              </div>

              {/* Missing Forms Section */}
              <div id="section-missing" className="mb-6">
                <button
                  onClick={() => toggleLane('missing')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 rounded-lg mb-3 hover:bg-secondary/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {collapsedLanes.has('missing') ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-sm">Missing Forms</span>
                    <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-red-100 text-red-700">
                      {missingCount}
                    </span>
                  </div>
                </button>
                {!collapsedLanes.has('missing') && (
                  <DataTable
                    columns={missingColumns}
                    data={missing}
                    showPagination={missing.length > 20}
                    pageSize={20}
                    emptyMessage="No missing forms — all couples have submitted!"
                  />
                )}
              </div>
            </>
          )}
        </div>

        <ProductionSidebar
          boxes={[
            { label: 'TOTAL COUPLES', value: totalCount, scrollToId: 'section-missing', color: 'default' },
            { label: 'SUBMITTED', value: submittedCount, scrollToId: 'section-submitted', color: 'green' },
            { label: 'MISSING', value: missingCount, scrollToId: 'section-missing', color: 'red' },
            {
              label: 'COMPLETION',
              value: `${totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0}%`,
              scrollToId: 'section-submitted',
              color: 'teal',
            },
          ]}
        />
      </div>
    </div>
  )
}
