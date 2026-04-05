'use client'

import { Card } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface ChaseEffectivenessChartProps {
  data: { touch: string; booked: number }[]
}

export function ChaseEffectivenessChart({ data }: ChaseEffectivenessChartProps) {
  if (data.length === 0) {
    return (
      <Card className="p-6 bg-white">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Chase Effectiveness</h3>
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No booking data yet</div>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-white">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Chase Effectiveness</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis dataKey="touch" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 13 }}
            formatter={(value: any) => [value, 'Booked']}
          />
          <Bar dataKey="booked" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
