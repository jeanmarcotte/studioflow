'use client'

import { Card } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface LeadsBySourceChartProps {
  data: { name: string; leads: number }[]
}

const COLORS = ['#0d4f4f', '#14b8a6', '#0f766e', '#2dd4bf', '#115e59', '#5eead4', '#134e4a', '#99f6e4']

export function LeadsBySourceChart({ data }: LeadsBySourceChartProps) {
  if (data.length === 0) {
    return (
      <Card className="p-6 bg-white">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Lead Volume by Source</h3>
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No source data available</div>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-white">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Lead Volume by Source</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 60, left: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 13 }}
            formatter={(value: any) => [value, 'Leads']}
          />
          <Bar dataKey="leads" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
