'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

interface SeasonData {
  season_name: string
  year: number
  season: 'fall' | 'winter'
  appts: number
  booked: number
  failed: number
  pending: number
  new_cust_revenue: number
  conversion_rate: number | null
}

interface Props {
  seasons: SeasonData[]
}

const chartConfig = {
  booked: {
    label: 'Booked',
    color: 'var(--chart-2)',
  },
  failed: {
    label: 'Failed',
    color: 'var(--chart-5)',
  },
  appts: {
    label: 'Appointments',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

export function BridalShowHistoryChart({ seasons }: Props) {
  if (!seasons.length) return null

  // Show each season individually, oldest to newest, PLUS a Fall 2026 placeholder
  const chartData = useMemo(() => [
    ...seasons
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return a.season === 'fall' ? -1 : 1
      })
      .map((s) => ({
        label: `${s.season === 'winter' ? 'Win' : 'Fall'} '${String(s.year).slice(2)}`,
        fullLabel: s.season_name,
        season: s.season,
        year: s.year,
        appts: Number(s.appts ?? 0),
        booked: Number(s.booked ?? 0),
        failed: Number(s.failed ?? 0),
        pending: Number(s.pending ?? 0),
        revenue: Math.round(Number(s.new_cust_revenue ?? 0)),
        conversion: s.conversion_rate !== null ? Math.round(Number(s.conversion_rate) * 10) / 10 : null,
        placeholder: false,
      })),
    {
      label: "Fall '26",
      fullLabel: 'Fall 2026',
      season: 'fall' as const,
      year: 2026,
      appts: 0,
      booked: 0,
      failed: 0,
      pending: 0,
      revenue: 0,
      conversion: null,
      placeholder: true,
    },
  ], [seasons])

  // Winter seasons for comparison table
  const winterSeasons = useMemo(() =>
    seasons.filter(s => s.season === 'winter').sort((a, b) => a.year - b.year),
    [seasons]
  )
  const currentWinter = winterSeasons[winterSeasons.length - 1]

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>New customer appointments by season</CardTitle>
        <CardDescription>
          Winter (Jan–Aug) vs Fall (Sep–Dec) — booked and failed by season
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex">
          {/* Chart (left) */}
          <div className="flex-1 min-w-0">
            {/* Season legend */}
            <div className="flex gap-4 mb-2 text-xs flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-blue-400"></span>
                <span className="text-muted-foreground">Winter (Jan–Aug)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-teal-600"></span>
                <span className="text-muted-foreground">Fall (Sep–Dec)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-sm bg-amber-400"></span>
                <span className="text-muted-foreground">= failed (fall)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-sm bg-blue-200"></span>
                <span className="text-muted-foreground">= failed (winter)</span>
              </span>
              <span className="flex items-center gap-1.5 ml-2">
                <span className="inline-block w-3 h-3 rounded-sm border border-dashed border-gray-300 bg-gray-100"></span>
                <span className="text-muted-foreground">Fall '26 upcoming</span>
              </span>
            </div>

            <ChartContainer config={chartConfig} className="h-[220px]">
              <BarChart accessibilityLayer data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  tickMargin={8}
                  axisLine={false}
                  tick={(props: any) => {
                    const { x, y, payload } = props
                    const entry = chartData.find(d => d.label === payload.value)
                    const isWinter = entry?.season === 'winter'
                    const isPlaceholder = entry?.placeholder
                    return (
                      <text
                        x={x}
                        y={y + 10}
                        textAnchor="middle"
                        fontSize={11}
                        fill={isPlaceholder ? '#9ca3af' : isWinter ? '#3b82f6' : '#f59e0b'}
                        fontWeight={500}
                      >
                        {payload.value}
                      </text>
                    )
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="dashed"
                      formatter={(value: any, name: string, props: any) => {
                        if (props.payload?.placeholder) return ['-', name]
                        if (name === 'appts')  return [value, 'Appointments']
                        if (name === 'booked') return [value, 'Booked']
                        if (name === 'failed') return [value, 'Failed']
                        return [value, name]
                      }}
                      labelFormatter={(label: string, payload: any[]) => {
                        const entry = payload?.[0]?.payload
                        return entry?.fullLabel ?? label
                      }}
                    />
                  }
                />
                <Bar
                  dataKey="appts"
                  fill="var(--color-appts)"
                  radius={[4, 4, 0, 0]}
                  opacity={0.35}
                />
                <Bar
                  dataKey="booked"
                  radius={[4, 4, 0, 0]}
                  fill="var(--color-booked)"
                  shape={(props: any) => {
                    const entry = chartData[props.index]
                    if (entry?.placeholder) {
                      return (
                        <rect
                          x={props.x}
                          y={props.y}
                          width={props.width}
                          height={Math.max(props.height, 2)}
                          fill="#e5e7eb"
                          stroke="#d1d5db"
                          strokeDasharray="4 2"
                          strokeWidth={1}
                          rx={4}
                        />
                      )
                    }
                    const fill = entry?.season === 'winter' ? '#3b82f6' : '#0d9488'
                    return <rect x={props.x} y={props.y} width={props.width} height={props.height} fill={fill} rx={4} />
                  }}
                />
                <Bar
                  dataKey="failed"
                  radius={[4, 4, 0, 0]}
                  fill="var(--color-failed)"
                  shape={(props: any) => {
                    const entry = chartData[props.index]
                    if (entry?.placeholder) return <rect x={props.x} y={props.y} width={0} height={0} />
                    const fill = entry?.season === 'winter' ? '#93c5fd' : '#f59e0b'
                    return <rect x={props.x} y={props.y} width={props.width} height={props.height} fill={fill} rx={4} />
                  }}
                />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Winter comparison table (right) */}
          <div className="w-[280px] shrink-0 flex flex-col gap-3 pl-4 border-l border-border">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Winter seasons compared
              </p>
              <p className="text-xs text-muted-foreground">Jan – Aug each year</p>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-1.5 font-medium text-muted-foreground">Season</th>
                  <th className="text-center pb-1.5 font-medium text-muted-foreground">Appts</th>
                  <th className="text-center pb-1.5 font-medium text-muted-foreground">Booked</th>
                  <th className="text-center pb-1.5 font-medium text-muted-foreground">Conv%</th>
                  <th className="text-right pb-1.5 font-medium text-muted-foreground">Rev</th>
                </tr>
              </thead>
              <tbody>
                {winterSeasons.map((s) => {
                  const isCurrent = s.year === currentWinter?.year
                  const conv = s.conversion_rate !== null ? `${Number(s.conversion_rate).toFixed(1)}%` : '—'
                  const rev = `$${Math.round(Number(s.new_cust_revenue ?? 0) / 1000)}k`
                  const convNum = Number(s.conversion_rate ?? 0)
                  return (
                    <tr
                      key={s.year}
                      className={`border-b border-border/50 ${isCurrent ? 'bg-red-50' : ''}`}
                    >
                      <td className={`py-2 font-medium ${isCurrent ? 'text-red-700' : ''}`}>
                        Win '{String(s.year).slice(2)}
                        {isCurrent ? ' ★' : ''}
                      </td>
                      <td className="py-2 text-center">{s.appts}</td>
                      <td className={`py-2 text-center font-semibold ${isCurrent ? 'text-red-600' : 'text-teal-700'}`}>
                        {s.booked}
                      </td>
                      <td className={`py-2 text-center ${convNum < 50 && s.conversion_rate !== null ? 'text-red-500 font-semibold' : ''}`}>
                        {conv}
                      </td>
                      <td className="py-2 text-right">{rev}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Red flag summary */}
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-xs font-semibold text-red-700 mb-1">Winter 2026 vs Winter 2025</p>
              <div className="flex flex-col gap-1 text-xs text-red-600">
                {(() => {
                  const w25 = winterSeasons.find(s => s.year === 2025)
                  const w26 = winterSeasons.find(s => s.year === 2026)
                  if (!w25 || !w26) return null
                  const apptDiff = Number(w26.appts) - Number(w25.appts)
                  const bookedDiff = Number(w26.booked) - Number(w25.booked)
                  const revDiff = Number(w26.new_cust_revenue) - Number(w25.new_cust_revenue)
                  return (
                    <>
                      <span>Appts: {apptDiff > 0 ? '+' : ''}{apptDiff} ({w26.appts} vs {w25.appts})</span>
                      <span>Booked: {bookedDiff > 0 ? '+' : ''}{bookedDiff} ({w26.booked} vs {w25.booked})</span>
                      <span>Revenue: ${Math.round(revDiff / 1000)}k ({w26.appts > 0 ? 'season open' : ''})</span>
                      <span className="font-semibold mt-1">4 pending — April 26 expo next</span>
                    </>
                  )
                })()}
              </div>
            </div>

            <a href="/admin/sales/show-results" className="text-xs text-teal-600 hover:underline">
              Full show analysis →
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
