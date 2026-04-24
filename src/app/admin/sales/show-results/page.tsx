'use client'

import { useEffect, useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/formatters'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header'
import {
  ProductionPageHeader,
  ProductionPills,
  ProductionSidebar,
} from '@/components/shared'

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface ShowResult {
  id: string
  season_id: string
  show_name: string
  show_code: string
  appts: number
  booked: number
  failed: number
  pending: number
  show_cost: number | null
  cost_per_lead: number | null
  cost_per_sale: number | null
  notes: string | null
}

interface Season {
  id: string
  season_name: string
  period: string
  year: number
  season: string
  appts: number
  booked: number
  failed: number
  pending: number
  new_cust_revenue: number | null
  frame_revenue: number | null
  total_show_cost: number | null
  cost_per_lead: number | null
  cost_per_sale: number | null
  conversion_rate: number | null
  goal_bookings: number | null
  notes: string | null
  bridal_show_results: ShowResult[]
}

// ─── Column definitions ───────────────────────────────────────────────────────

const showResultColumns: ColumnDef<ShowResult>[] = [
  {
    accessorKey: 'show_name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Show Name" />,
    cell: ({ row }) => <span className="font-medium">{row.original.show_name}</span>,
  },
  {
    accessorKey: 'show_code',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Show Code" />,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">{row.original.show_code}</span>
    ),
  },
  {
    accessorKey: 'appts',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Appts" />,
    cell: ({ row }) => row.original.appts,
  },
  {
    accessorKey: 'booked',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Booked" />,
    cell: ({ row }) => (
      <span className="font-medium text-green-700">{row.original.booked}</span>
    ),
  },
  {
    id: 'conv_pct',
    accessorFn: (row) =>
      row.appts > 0 ? Math.round((row.booked / row.appts) * 100) : 0,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Conv%" />,
    cell: ({ row }) => {
      const appts = row.original.appts
      const booked = row.original.booked
      if (appts === 0) return '—'
      const pct = Math.round((booked / appts) * 100)
      return <span>{pct}%</span>
    },
  },
  {
    accessorKey: 'show_cost',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cost" />,
    cell: ({ row }) =>
      row.original.show_cost != null ? formatCurrency(row.original.show_cost) : '—',
  },
  {
    accessorKey: 'cost_per_lead',
    header: ({ column }) => <DataTableColumnHeader column={column} title="$/Lead" />,
    cell: ({ row }) =>
      row.original.cost_per_lead != null ? formatCurrency(row.original.cost_per_lead) : '—',
  },
  {
    accessorKey: 'cost_per_sale',
    header: ({ column }) => <DataTableColumnHeader column={column} title="$/Sale" />,
    cell: ({ row }) =>
      row.original.cost_per_sale != null ? formatCurrency(row.original.cost_per_sale) : '—',
  },
  {
    accessorKey: 'notes',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Notes" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.notes || '—'}</span>
    ),
    enableSorting: false,
  },
]

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ShowResultsPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('bridal_show_seasons')
          .select('*, bridal_show_results(*)')
          .order('year', { ascending: false })

        if (error) throw error

        // Sort: year DESC, then fall before winter within same year
        const sorted = (data || []).sort((a: Season, b: Season) => {
          if (b.year !== a.year) return b.year - a.year
          // Within same year: fall (fall=0) before winter (winter=1)
          const order: Record<string, number> = { fall: 0, winter: 1 }
          return (order[a.season] ?? 99) - (order[b.season] ?? 99)
        })

        setSeasons(sorted)
      } catch (err) {
        console.error('[ShowResults] Failed to load:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleLane = (key: string) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ─── Computed values ────────────────────────────────────────────────────────

  const currentSeason = useMemo(() => seasons[0] ?? null, [seasons])

  const bestConvSeason = useMemo(() => {
    if (!seasons.length) return null
    return seasons.reduce((best, s) =>
      (s.conversion_rate ?? 0) > (best.conversion_rate ?? 0) ? s : best
    )
  }, [seasons])

  const bestRevSeason = useMemo(() => {
    if (!seasons.length) return null
    return seasons.reduce((best, s) =>
      (s.new_cust_revenue ?? 0) > (best.new_cust_revenue ?? 0) ? s : best
    )
  }, [seasons])

  const avgConversion = useMemo(() => {
    const withRate = seasons.filter(s => s.conversion_rate != null)
    if (!withRate.length) return 0
    const sum = withRate.reduce((acc, s) => acc + (s.conversion_rate ?? 0), 0)
    return Math.round(sum / withRate.length)
  }, [seasons])

  const totalAppts = useMemo(() => seasons.reduce((acc, s) => acc + (s.appts || 0), 0), [seasons])
  const totalBooked = useMemo(() => seasons.reduce((acc, s) => acc + (s.booked || 0), 0), [seasons])

  // Chart data: oldest first (left to right)
  const chartData = useMemo(() => [...seasons].reverse(), [seasons])

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // ─── Sidebar boxes ──────────────────────────────────────────────────────────

  const sidebarBoxes = [
    {
      label: 'TOTAL SEASONS',
      value: seasons.length,
      color: 'default' as const,
    },
    {
      label: 'BEST CONVERSION',
      value: bestConvSeason ? `${bestConvSeason.conversion_rate}%` : '—',
      color: 'green' as const,
    },
    {
      label: 'BEST REVENUE',
      value: bestRevSeason ? formatCurrency(bestRevSeason.new_cust_revenue) : '—',
      color: 'teal' as const,
    },
    {
      label: 'CURRENT SEASON',
      value: currentSeason ? `${currentSeason.booked}/${currentSeason.appts}` : '—',
      scrollToId: currentSeason ? `section-${currentSeason.id}` : undefined,
      color: 'blue' as const,
    },
    {
      label: 'AVG CONVERSION',
      value: `${avgConversion}%`,
      color: 'yellow' as const,
    },
    {
      label: 'GOAL 2026',
      value: currentSeason?.goal_bookings ?? '—',
      color: 'teal' as const,
    },
  ]

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-0">
      <ProductionPageHeader
        title="Bridal Show Results"
        subtitle="Historical performance across all shows"
      />

      {currentSeason && (
        <ProductionPills
          pills={[
            { label: 'Current: ' + currentSeason.season_name, count: currentSeason.booked, color: 'green' },
            { label: 'Pending', count: currentSeason.pending, color: 'yellow' },
            { label: 'All-Time Appts', count: totalAppts, color: 'default' },
            { label: 'All-Time Booked', count: totalBooked, color: 'blue' },
          ]}
        />
      )}

      <div className="flex">
        {/* ── Main Panel ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:border-r border-border">

          {/* Chart */}
          <div
            className="rounded-xl border bg-card p-6 mb-8"
            style={{ borderLeft: '4px solid #0d9488' }}
          >
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Revenue & Conversion by Season
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="season_name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="revenue"
                  tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="conversion"
                  orientation="right"
                  domain={[0, 100]}
                  tickFormatter={(value: number) => `${value}%`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: any, name: any) => {
                    if (name === 'New Customer Revenue') return [formatCurrency(value as number), name]
                    if (name === 'Frame Revenue') return [formatCurrency(value as number), name]
                    if (name === 'Conversion Rate') return [`${value}%`, name]
                    return [value, name]
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
                <Bar
                  yAxisId="revenue"
                  dataKey="new_cust_revenue"
                  name="New Customer Revenue"
                  stackId="rev"
                  fill="#0d9488"
                />
                <Bar
                  yAxisId="revenue"
                  dataKey="frame_revenue"
                  name="Frame Revenue"
                  stackId="rev"
                  fill="#3b82f6"
                />
                <Line
                  yAxisId="conversion"
                  type="monotone"
                  dataKey="conversion_rate"
                  name="Conversion Rate"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#f59e0b' }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Season cards */}
          {seasons.map(season => {
            const isCollapsed = collapsedLanes.has(season.id)
            const hasShows = season.bridal_show_results && season.bridal_show_results.length > 0
            const badgeColor = season.season === 'fall'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-blue-100 text-blue-700'
            const convPct = season.conversion_rate != null
              ? `${season.conversion_rate}%`
              : season.appts > 0
                ? `${Math.round((season.booked / season.appts) * 100)}%`
                : '—'

            return (
              <div key={season.id} id={`section-${season.id}`} className="mb-4">
                {/* Collapsible header */}
                <button
                  onClick={() => toggleLane(season.id)}
                  className="flex items-center gap-3 w-full py-3 hover:opacity-80 text-left"
                >
                  {isCollapsed
                    ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  }
                  <span className="font-bold text-sm">{season.season_name}</span>
                  <span className="text-xs text-muted-foreground">{season.period}</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}>
                    {season.season === 'fall' ? 'Fall' : 'Winter'}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto flex gap-4">
                    <span>{season.appts} appts</span>
                    <span className="text-green-700 font-semibold">{season.booked} booked</span>
                    <span>{convPct} conv</span>
                    {season.total_show_cost != null && (
                      <span>{formatCurrency(season.total_show_cost)} cost</span>
                    )}
                  </span>
                </button>

                {/* Expanded content */}
                {!isCollapsed && (
                  <div className="pl-7 pb-4">
                    {/* Season notes */}
                    {season.notes && (
                      <p className="text-sm text-muted-foreground mb-4 italic">{season.notes}</p>
                    )}

                    {/* Season summary row */}
                    <div className="flex gap-6 mb-4 text-sm">
                      {season.new_cust_revenue != null && (
                        <div>
                          <span className="text-muted-foreground">Revenue: </span>
                          <span className="font-medium">{formatCurrency(season.new_cust_revenue)}</span>
                        </div>
                      )}
                      {season.frame_revenue != null && (
                        <div>
                          <span className="text-muted-foreground">Frame Rev: </span>
                          <span className="font-medium">{formatCurrency(season.frame_revenue)}</span>
                        </div>
                      )}
                      {season.cost_per_lead != null && (
                        <div>
                          <span className="text-muted-foreground">$/Lead: </span>
                          <span className="font-medium">{formatCurrency(season.cost_per_lead)}</span>
                        </div>
                      )}
                      {season.cost_per_sale != null && (
                        <div>
                          <span className="text-muted-foreground">$/Sale: </span>
                          <span className="font-medium">{formatCurrency(season.cost_per_sale)}</span>
                        </div>
                      )}
                      {season.goal_bookings != null && (
                        <div>
                          <span className="text-muted-foreground">Goal: </span>
                          <span className="font-medium">{season.goal_bookings}</span>
                        </div>
                      )}
                    </div>

                    {/* Show-level DataTable */}
                    {hasShows ? (
                      <DataTable
                        columns={showResultColumns}
                        data={season.bridal_show_results}
                        showPagination={false}
                        emptyMessage="No show data"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Show-level data not available for this season.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Sidebar ── */}
        <ProductionSidebar boxes={sidebarBoxes} />
      </div>
    </div>
  )
}
