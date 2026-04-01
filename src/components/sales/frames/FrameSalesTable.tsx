'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import ItemIcons from './ItemIcons'

export interface FrameSaleRow {
  id: string
  coupleName: string
  coupleId: string
  weddingDate: string | null
  orderDate: string | null
  saleAmount: number
  status: string | null
  collageSize: string | null
  albumQty: number | null
  signingBook: boolean | null
  weddingFrameSize: string | null
  engPortraitSize: string | null
  hasDigital: boolean
  downpayment: number
}

type SortField = 'coupleName' | 'weddingDate' | 'saleAmount' | 'orderDate'
type SortDir = 'asc' | 'desc'

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function statusBadge(status: string | null) {
  switch (status) {
    case 'signed':
      return <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium">Signed</span>
    case 'paid':
      return <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium">Paid</span>
    case 'completed':
      return <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-medium">Completed</span>
    case 'pending':
      return <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-medium">Pending</span>
    case 'active':
      return <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-medium">Active</span>
    case 'confirmed':
      return <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium">Confirmed</span>
    default:
      return <span className="text-muted-foreground">\u2014</span>
  }
}

// ── Active Pipeline Table ─────────────────────────────────────────────────

export function ActivePipelineTable({ rows }: { rows: FrameSaleRow[] }) {
  if (rows.length === 0) return null

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <span className="text-amber-500">\u26A1</span> Active Pipeline ({rows.length})
      </h2>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 font-medium w-8 text-left">#</th>
                <th className="p-3 font-medium text-left">Couple</th>
                <th className="p-3 font-medium text-left">Wedding Date</th>
                <th className="p-3 font-medium text-right">Quoted Amount</th>
                <th className="p-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => (
                <tr key={r.id} className="hover:bg-accent/50 transition-colors bg-amber-50/30">
                  <td className="p-3 text-muted-foreground text-left">{i + 1}</td>
                  <td className="p-3 font-medium text-left">
                    <Link href={`/admin/couples/${r.coupleId}`} className="hover:underline text-foreground">
                      {r.coupleName}
                    </Link>
                  </td>
                  <td className="p-3 text-left whitespace-nowrap">{fmtDate(r.weddingDate)}</td>
                  <td className="p-3 font-medium text-right">
                    {r.saleAmount > 0 ? fmtMoney(r.saleAmount) : '\u2014'}
                  </td>
                  <td className="p-3 text-center">{statusBadge(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Completed Sales Table ─────────────────────────────────────────────────

export function CompletedSalesTable({ rows }: { rows: FrameSaleRow[] }) {
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'weddingDate', dir: 'asc' })

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'coupleName':
          cmp = a.coupleName.localeCompare(b.coupleName); break
        case 'weddingDate':
          cmp = (a.weddingDate || '').localeCompare(b.weddingDate || ''); break
        case 'saleAmount':
          cmp = a.saleAmount - b.saleAmount; break
        case 'orderDate':
          cmp = (a.orderDate || '').localeCompare(b.orderDate || ''); break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort])

  const handleSort = (field: SortField) => {
    setSort(prev => prev.field === field
      ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: 'asc' }
    )
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
    return sort.dir === 'asc'
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

  const totalRevenue = rows.reduce((s, r) => s + r.saleAmount, 0)

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <span className="text-green-600">\u2713</span> Completed Sales ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completed frame sales yet.</p>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 800 }}>
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 font-medium w-8 text-left">#</th>
                  <th className="p-3 font-medium text-left">
                    <button onClick={() => handleSort('coupleName')} className="group flex items-center gap-1 hover:text-foreground">
                      Couple <SortIcon field="coupleName" />
                    </button>
                  </th>
                  <th className="p-3 font-medium text-left">
                    <button onClick={() => handleSort('weddingDate')} className="group flex items-center gap-1 hover:text-foreground">
                      Wedding Date <SortIcon field="weddingDate" />
                    </button>
                  </th>
                  <th className="p-3 font-medium text-left">Package</th>
                  <th className="p-3 font-medium text-left">
                    <button onClick={() => handleSort('orderDate')} className="group flex items-center gap-1 hover:text-foreground">
                      Appt Date <SortIcon field="orderDate" />
                    </button>
                  </th>
                  <th className="p-3 font-medium text-right">
                    <button onClick={() => handleSort('saleAmount')} className="group flex items-center gap-1 justify-end hover:text-foreground">
                      Sale $ <SortIcon field="saleAmount" />
                    </button>
                  </th>
                  <th className="p-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map((r, i) => (
                  <tr key={r.id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-3 text-muted-foreground text-left">{i + 1}</td>
                    <td className="p-3 font-medium text-left">
                      <Link href={`/admin/couples/${r.coupleId}`} className="hover:underline text-foreground">
                        {r.coupleName}
                      </Link>
                    </td>
                    <td className="p-3 text-left whitespace-nowrap">{fmtDate(r.weddingDate)}</td>
                    <td className="p-3 text-left">
                      <ItemIcons
                        collageSize={r.collageSize}
                        albumQty={r.albumQty}
                        signingBook={r.signingBook}
                        weddingFrameSize={r.weddingFrameSize}
                        engPortraitSize={r.engPortraitSize}
                        hasDigital={r.hasDigital}
                      />
                    </td>
                    <td className="p-3 text-left whitespace-nowrap">{fmtDate(r.orderDate)}</td>
                    <td className="p-3 font-medium text-right">
                      {r.saleAmount > 0 ? <span className="text-green-600">{fmtMoney(r.saleAmount)}</span> : '\u2014'}
                    </td>
                    <td className="p-3 text-center">{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="p-3" colSpan={5}>Total</td>
                  <td className="p-3 text-green-600 text-right">{fmtMoney(totalRevenue)}</td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
