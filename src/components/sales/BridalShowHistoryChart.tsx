'use client'

import { useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/formatters'

interface SeasonData {
  season_name: string
  year: number
  season: 'fall' | 'winter'
  appts: number
  booked: number
  failed: number
  new_cust_revenue: number
  frame_revenue: number
  conversion_rate: number | null
  total_show_cost: number | null
  cost_per_sale: number | null
}

interface BridalShowHistoryChartProps {
  seasons: SeasonData[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md text-sm">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">
            {p.dataKey === 'conversion_rate' ? `${p.value?.toFixed(1) ?? '—'}%` : formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function BridalShowHistoryChart({ seasons }: BridalShowHistoryChartProps) {
  const chartData = useMemo(() => {
    return [...seasons].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.season === 'fall' ? -1 : 1
    }).map(s => ({
      ...s,
      new_cust_revenue: Number(s.new_cust_revenue) || 0,
      frame_revenue: Number(s.frame_revenue) || 0,
      conversion_rate: s.conversion_rate != null ? Number(s.conversion_rate) : null,
    }))
  }, [seasons])

  const stats = useMemo(() => {
    if (!chartData.length) return null
    const bestRev = chartData.reduce((best, s) => s.new_cust_revenue > (best?.new_cust_revenue || 0) ? s : best, chartData[0])
    const withConv = chartData.filter(s => s.conversion_rate != null)
    const bestConv = withConv.length > 0 ? withConv.reduce((best, s) => (s.conversion_rate || 0) > (best.conversion_rate || 0) ? s : best, withConv[0]) : null
    const current = chartData[chartData.length - 1]
    const totalAppts = chartData.reduce((sum, s) => sum + s.appts, 0)
    return { bestRev, bestConv, current, totalAppts }
  }, [chartData])

  if (!chartData.length) return null

  return (
    <div className="mb-6 rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Sales season history</h3>
          <p className="text-xs text-gray-500">New client revenue + frame sales + conversion rate by season</p>
        </div>
        <a
          href="/admin/sales/show-results"
          className="text-xs text-teal-600 hover:underline"
        >
          Full show analysis →
        </a>
      </div>

      {stats && (
        <div className="mb-4 flex gap-3 flex-wrap">
          <div className="rounded-md bg-gray-50 px-3 py-1.5 text-xs">
            <span className="text-gray-500">Best season </span>
            <span className="font-medium text-gray-900">{stats.bestRev.season_name} — ${Math.round(stats.bestRev.new_cust_revenue / 1000)}k</span>
          </div>
          {stats.bestConv && (
            <div className="rounded-md bg-gray-50 px-3 py-1.5 text-xs">
              <span className="text-gray-500">Best conversion </span>
              <span className="font-medium text-gray-900">{stats.bestConv.season_name} — {stats.bestConv.conversion_rate?.toFixed(1)}%</span>
            </div>
          )}
          <div className="rounded-md bg-gray-50 px-3 py-1.5 text-xs">
            <span className="text-gray-500">Current </span>
            <span className="font-medium text-gray-900">{stats.current.season_name} — {stats.current.booked} booked</span>
          </div>
          <div className="rounded-md bg-gray-50 px-3 py-1.5 text-xs">
            <span className="text-gray-500">All-time </span>
            <span className="font-medium text-gray-900">{stats.totalAppts} appointments</span>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="season_name" tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="left"
            tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tickFormatter={(value: number) => `${value}%`}
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar yAxisId="left" dataKey="new_cust_revenue" stackId="revenue" fill="#0d9488" name="New clients" radius={[0, 0, 0, 0]} />
          <Bar yAxisId="left" dataKey="frame_revenue" stackId="revenue" fill="#3b82f6" name="Frames & albums" radius={[2, 2, 0, 0]} />
          <Line
            yAxisId="right"
            dataKey="conversion_rate"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', r: 4 }}
            name="Conversion %"
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-2 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-teal-600"></span>New clients
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-500"></span>Frames &amp; albums
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-1 bg-amber-400"></span>Conversion %
        </span>
      </div>
    </div>
  )
}
