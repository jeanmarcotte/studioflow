'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface SourceRow {
  source_id: string
  source_name: string
  source_cost: number
  lead_count: number
  booked_count: number
  total_revenue: number
}

interface SourcePerformanceTableProps {
  data: SourceRow[]
}

type SortKey = 'source_name' | 'lead_count' | 'booked_count' | 'conv' | 'total_revenue' | 'cpl' | 'roi'

export function SourcePerformanceTable({ data }: SourcePerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('lead_count')
  const [sortAsc, setSortAsc] = useState(false)

  const sorted = useMemo(() => {
    const rows = data.filter(r => r.lead_count > 0)
    return rows.sort((a, b) => {
      let aVal: number | string = 0
      let bVal: number | string = 0

      switch (sortKey) {
        case 'source_name': aVal = a.source_name; bVal = b.source_name; break
        case 'lead_count': aVal = a.lead_count; bVal = b.lead_count; break
        case 'booked_count': aVal = a.booked_count; bVal = b.booked_count; break
        case 'conv': aVal = a.lead_count > 0 ? a.booked_count / a.lead_count : 0; bVal = b.lead_count > 0 ? b.booked_count / b.lead_count : 0; break
        case 'total_revenue': aVal = a.total_revenue; bVal = b.total_revenue; break
        case 'cpl': aVal = a.lead_count > 0 ? a.source_cost / a.lead_count : 0; bVal = b.lead_count > 0 ? b.source_cost / b.lead_count : 0; break
        case 'roi': aVal = a.source_cost > 0 ? (a.total_revenue - a.source_cost) / a.source_cost : 0; bVal = b.source_cost > 0 ? (b.total_revenue - b.source_cost) / b.source_cost : 0; break
      }

      if (typeof aVal === 'string') return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })
  }, [data, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null
    return sortAsc ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />
  }

  if (data.length === 0) {
    return (
      <Card className="p-6 bg-white">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Source Performance</h3>
        <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">No source data</div>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-white overflow-x-auto">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Source Performance</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {[
              { key: 'source_name' as SortKey, label: 'Source', align: 'left' },
              { key: 'lead_count' as SortKey, label: 'Leads', align: 'right' },
              { key: 'booked_count' as SortKey, label: 'Booked', align: 'right' },
              { key: 'conv' as SortKey, label: 'Conv %', align: 'right' },
              { key: 'total_revenue' as SortKey, label: 'Revenue', align: 'right' },
              { key: 'cpl' as SortKey, label: 'CPL', align: 'right' },
              { key: 'roi' as SortKey, label: 'ROI', align: 'right' },
            ].map(col => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground ${col.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                {col.label}<SortIcon k={col.key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => {
            const conv = r.lead_count > 0 ? (r.booked_count / r.lead_count * 100) : 0
            const cpl = r.lead_count > 0 && r.source_cost > 0 ? r.source_cost / r.lead_count : 0
            const roi = r.source_cost > 0 ? ((r.total_revenue - r.source_cost) / r.source_cost * 100) : 0
            return (
              <tr key={r.source_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2.5 font-medium">{r.source_name}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.lead_count}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium text-green-600">{r.booked_count}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{conv.toFixed(1)}%</td>
                <td className="px-3 py-2.5 text-right tabular-nums">${r.total_revenue.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{cpl > 0 ? `$${cpl.toFixed(0)}` : '—'}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${roi > 0 ? 'text-green-600' : roi < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {r.source_cost > 0 ? `${roi > 0 ? '+' : ''}${roi.toFixed(0)}%` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}
