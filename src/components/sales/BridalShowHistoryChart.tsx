'use client'

import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

  // Analysis stats from seasons prop (exclude placeholder)
  const totalAppts = seasons.reduce((s, y) => s + Number(y.appts ?? 0), 0)
  const totalBooked = seasons.reduce((s, y) => s + Number(y.booked ?? 0), 0)
  const totalRevenue = seasons.reduce((s, y) => s + Number(y.new_cust_revenue ?? 0), 0)

  const bestSeason = seasons.reduce((a, b) => Number(a.new_cust_revenue) > Number(b.new_cust_revenue) ? a : b)
  const current = seasons[seasons.length - 1]

  const rev2024 = seasons.filter(s => s.year === 2024).reduce((s, y) => s + Number(y.new_cust_revenue ?? 0), 0)
  const rev2025 = seasons.filter(s => s.year === 2025).reduce((s, y) => s + Number(y.new_cust_revenue ?? 0), 0)
  const yoyRevenue = rev2024 > 0 ? Math.round(((rev2025 - rev2024) / rev2024) * 100) : null

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>New customer appointments by season</CardTitle>
        <CardDescription>
          Winter (Jan–Aug) vs Fall (Sep–Dec) — booked and failed by season
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Season legend */}
        <div className="flex gap-4 mb-2 text-xs">
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
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Best: {bestSeason.season_name} — ${Math.round(Number(bestSeason.new_cust_revenue) / 1000)}k revenue
          {yoyRevenue !== null && (
            <span className={yoyRevenue >= 0 ? 'text-green-600' : 'text-red-600'}>
              ({yoyRevenue >= 0 ? '+' : ''}{yoyRevenue}% YoY)
            </span>
          )}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          {totalBooked} total bookings · ${Math.round(totalRevenue / 1000)}k revenue · {totalAppts} appointments · {current?.season_name} in progress
        </div>
        <a href="/admin/sales/show-results" className="text-xs text-teal-600 hover:underline mt-1">
          Full show analysis →
        </a>
      </CardFooter>
    </Card>
  )
}
