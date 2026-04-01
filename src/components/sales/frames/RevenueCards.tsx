'use client'

import { TrendingUp, TrendingDown, DollarSign, BarChart3, Target, Sparkles } from 'lucide-react'

interface RevenueCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sublabel: string
  yoyLabel: string | null
  yoyPositive: boolean | null
}

function RevenueCard({ icon, label, value, sublabel, yoyLabel, yoyPositive }: RevenueCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-1">
        {icon}
        {label}
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-sm text-muted-foreground">{sublabel}</div>
      {yoyLabel && (
        <div className={`text-xs font-medium flex items-center gap-1 mt-1 ${yoyPositive ? 'text-green-600' : 'text-red-500'}`}>
          {yoyPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {yoyLabel}
        </div>
      )}
    </div>
  )
}

interface RevenueDashboardProps {
  revenue: number
  prevRevenue: number
  soldCount: number
  totalCouples: number
  prevSoldCount: number
  prevTotalCouples: number
  avgSale: number
  prevAvgSale: number
  fiveByFiveConvWith: number
  fiveByFiveConvWithout: number
  fiveByFiveHasData: boolean
  year: number
}

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function yoyPct(current: number, prev: number): { label: string; positive: boolean } | null {
  if (prev === 0) return null
  const pct = Math.round(((current - prev) / prev) * 100)
  const sign = pct >= 0 ? '+' : ''
  return { label: `${sign}${pct}% vs prev year`, positive: pct >= 0 }
}

export default function RevenueDashboard({
  revenue, prevRevenue, soldCount, totalCouples, prevSoldCount, prevTotalCouples,
  avgSale, prevAvgSale, fiveByFiveConvWith, fiveByFiveConvWithout, fiveByFiveHasData, year,
}: RevenueDashboardProps) {
  const convRate = totalCouples > 0 ? Math.round((soldCount / totalCouples) * 100) : 0
  const prevConvRate = prevTotalCouples > 0 ? Math.round((prevSoldCount / prevTotalCouples) * 100) : 0

  const revenueYoy = yoyPct(revenue, prevRevenue)
  const convYoy = prevConvRate > 0 ? yoyPct(convRate, prevConvRate) : null
  const avgYoy = yoyPct(avgSale, prevAvgSale)

  const fiveByFiveDiff = fiveByFiveHasData ? (fiveByFiveConvWith - fiveByFiveConvWithout) : 0
  const fiveByFiveLabel = fiveByFiveHasData
    ? `${fiveByFiveDiff >= 0 ? '+' : ''}${fiveByFiveDiff}% conv with 5×5s`
    : null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <RevenueCard
        icon={<DollarSign className="h-4 w-4" />}
        label="Revenue"
        value={fmtMoney(revenue)}
        sublabel={`${year} YTD`}
        yoyLabel={revenueYoy?.label ?? null}
        yoyPositive={revenueYoy?.positive ?? null}
      />
      <RevenueCard
        icon={<BarChart3 className="h-4 w-4" />}
        label="Conversion"
        value={`${convRate}%`}
        sublabel={`${soldCount} of ${totalCouples} couples sold`}
        yoyLabel={convYoy?.label ?? null}
        yoyPositive={convYoy?.positive ?? null}
      />
      <RevenueCard
        icon={<Target className="h-4 w-4" />}
        label="Avg Sale"
        value={fmtMoney(avgSale)}
        sublabel="per couple"
        yoyLabel={avgYoy?.label ?? null}
        yoyPositive={avgYoy?.positive ?? null}
      />
      <RevenueCard
        icon={<Sparkles className="h-4 w-4" />}
        label="5×5 ROI"
        value={fiveByFiveHasData ? `${fiveByFiveConvWith}% conv` : 'N/A'}
        sublabel={fiveByFiveHasData ? 'with 5×5s' : 'Not enough data'}
        yoyLabel={fiveByFiveLabel}
        yoyPositive={fiveByFiveDiff >= 0}
      />
    </div>
  )
}
