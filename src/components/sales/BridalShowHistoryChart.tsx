'use client'

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
  appts: {
    label: 'Appointments',
    color: 'var(--chart-1)',
  },
  booked: {
    label: 'Booked',
    color: 'var(--chart-2)',
  },
  failed: {
    label: 'Failed',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig

export function BridalShowHistoryChart({ seasons }: Props) {
  if (!seasons.length) return null

  // Group by year — new customers only, no frame data
  const yearMap = seasons.reduce((acc, s) => {
    const yr = String(s.year)
    if (!acc[yr]) {
      acc[yr] = { year: yr, appts: 0, booked: 0, failed: 0, pending: 0, revenue: 0, convSum: 0, convCount: 0 }
    }
    acc[yr].appts   += Number(s.appts ?? 0)
    acc[yr].booked  += Number(s.booked ?? 0)
    acc[yr].failed  += Number(s.failed ?? 0)
    acc[yr].pending += Number(s.pending ?? 0)
    acc[yr].revenue += Number(s.new_cust_revenue ?? 0)
    if (s.conversion_rate !== null) {
      acc[yr].convSum   += Number(s.conversion_rate)
      acc[yr].convCount += 1
    }
    return acc
  }, {} as Record<string, { year: string; appts: number; booked: number; failed: number; pending: number; revenue: number; convSum: number; convCount: number }>)

  const chartData = Object.values(yearMap).map((y) => ({
    year: y.year,
    appts:      y.appts,
    booked:     y.booked,
    failed:     y.failed,
    revenue:    Math.round(y.revenue),
    conversion: y.convCount > 0 ? Math.round((y.convSum / y.convCount) * 10) / 10 : null,
  }))

  // Footer stats
  const best = chartData.reduce((a, b) => a.booked > b.booked ? a : b)
  const totalBooked = chartData.reduce((sum, y) => sum + y.booked, 0)
  const totalRevenue = chartData.reduce((sum, y) => sum + y.revenue, 0)

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>New customer appointments by year</CardTitle>
        <CardDescription>
          Appointments · Booked · Failed — new clients only, all bridal shows combined
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dashed"
                  formatter={(value, name) => {
                    if (name === 'appts')  return [value, 'Appointments']
                    if (name === 'booked') return [value, 'Booked']
                    if (name === 'failed') return [value, 'Failed']
                    return [value, name]
                  }}
                />
              }
            />
            <Bar dataKey="appts"  fill="var(--color-appts)"  radius={4} />
            <Bar dataKey="booked" fill="var(--color-booked)" radius={4} />
            <Bar dataKey="failed" fill="var(--color-failed)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Best year: {best.year} — {best.booked} bookings · ${Math.round(best.revenue / 1000)}k revenue
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          {totalBooked} total bookings · ${Math.round(totalRevenue / 1000)}k total revenue · 2026 season in progress
        </div>
        <a href="/admin/sales/show-results" className="text-xs text-teal-600 hover:underline mt-1">
          Full show analysis →
        </a>
      </CardFooter>
    </Card>
  )
}
