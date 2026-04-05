'use client'

import { Card } from '@/components/ui/card'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface LossReasonChartProps {
  data: { reason: string; count: number }[]
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#6b7280', '#3b82f6', '#8b5cf6']

const REASON_LABELS: Record<string, string> = {
  booked_competitor: 'Booked someone else',
  too_expensive: 'Too expensive',
  date_unavailable: 'Date unavailable',
  plans_changed: 'Plans changed',
  no_response: 'No response',
  other: 'Other',
}

export function LossReasonChart({ data }: LossReasonChartProps) {
  const labeled = data.map(d => ({
    ...d,
    reason: REASON_LABELS[d.reason] || d.reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
  }))

  if (labeled.length === 0) {
    return (
      <Card className="p-6 bg-white">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Loss Reasons</h3>
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No lost leads yet</div>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-white">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Loss Reasons</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={labeled}
            dataKey="count"
            nameKey="reason"
            cx="50%"
            cy="50%"
            outerRadius={75}
            label={({ name, value }: any) => `${name} (${value})`}
            labelLine={false}
          >
            {labeled.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  )
}
