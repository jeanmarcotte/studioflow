'use client'

import { Card } from '@/components/ui/card'

interface FunnelStage {
  stage: string
  count: number
}

interface ConversionFunnelProps {
  data: FunnelStage[]
}

const STAGE_COLORS = ['#0d4f4f', '#0f766e', '#14b8a6', '#2dd4bf', '#22c55e']

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  const max = data[0]?.count || 1

  if (data.length === 0) {
    return (
      <Card className="p-6 bg-white">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Conversion Funnel</h3>
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No funnel data</div>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-white">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Conversion Funnel</h3>
      <div className="space-y-2">
        {data.map((stage, i) => {
          const widthPct = Math.max(20, (stage.count / max) * 100)
          const pct = max > 0 ? ((stage.count / max) * 100).toFixed(0) : '0'
          return (
            <div key={stage.stage} className="flex items-center gap-3">
              <div className="w-20 text-xs font-medium text-muted-foreground text-right shrink-0">{stage.stage}</div>
              <div className="flex-1 relative h-10">
                <div
                  className="h-full rounded-lg flex items-center px-3 transition-all"
                  style={{ width: `${widthPct}%`, backgroundColor: STAGE_COLORS[i] || '#6b7280' }}
                >
                  <span className="text-white text-sm font-bold">{stage.count}</span>
                </div>
              </div>
              <div className="w-10 text-xs text-muted-foreground text-right shrink-0">{pct}%</div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
