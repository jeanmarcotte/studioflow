'use client'

import { Card } from '@/components/ui/card'
import { Nunito } from 'next/font/google'

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

interface StatsCardsProps {
  total: number
  active: number
  booked: number
  conversionRate: number
  avgRevenue: number
}

const stats = (p: StatsCardsProps) => [
  { label: 'Total Leads', value: p.total.toLocaleString(), color: 'text-foreground' },
  { label: 'Active', value: p.active.toLocaleString(), color: 'text-blue-600' },
  { label: 'Booked', value: p.booked.toLocaleString(), color: 'text-green-600' },
  { label: 'Conv %', value: `${p.conversionRate.toFixed(1)}%`, color: 'text-[#0d4f4f]' },
  { label: 'Avg Revenue', value: `$${p.avgRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: 'text-[#0d4f4f]' },
]

export function StatsCards(props: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats(props).map(s => (
        <Card key={s.label} className="p-4 bg-white">
          <div className={`${nunito.className} text-2xl font-bold ${s.color}`}>{s.value}</div>
          <div className={`${nunito.className} text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1`}>{s.label}</div>
        </Card>
      ))}
    </div>
  )
}
