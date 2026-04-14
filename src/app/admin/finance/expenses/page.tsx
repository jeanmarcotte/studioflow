'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { LedgerHeader } from '@/components/finance/ledger-header'
import { LedgerDivider } from '@/components/finance/ledger-divider'
import { CurrencyCell } from '@/components/finance/currency-cell'
import { FinanceDataTable } from '@/components/finance/finance-data-table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Info } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'

// ── Types ───────────────────────────────────────────────────────
interface Expense {
  id: string
  account_id: string
  transaction_date: string
  description: string
  amount_cad: number
  account_label: string
}

// ── Helpers ─────────────────────────────────────────────────────
function getFiscalYearRange(fy: string): [string, string] {
  const [startYear] = fy.split('-').map(Number)
  return [`${startYear}-05-01`, `${startYear + 1}-04-30`]
}

const getAccountLabel = (id: string) => id === 'td-business-2147' ? 'TD Business' : id === 'rbc-visa' ? 'RBC Visa' : id

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)

// ── Main Component ──────────────────────────────────────────────
export default function ExpenseLedger() {
  const [loading, setLoading] = useState(true)
  const [allExpenses, setAllExpenses] = useState<Expense[]>([])
  const [fiscalYear, setFiscalYear] = useState('2025-2026')
  const [accountTab, setAccountTab] = useState('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [fyStart, fyEnd] = getFiscalYearRange(fiscalYear)
    const res = await fetch(`/api/finance/expenses?fyStart=${fyStart}&fyEnd=${fyEnd}`)
    const json = await res.json()
    const expenses = (json.expenses ?? []).map((e: any) => ({
      ...e,
      account_label: getAccountLabel(e.account_id),
    }))
    setAllExpenses(expenses)
    setLoading(false)
  }, [fiscalYear])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => {
    if (accountTab === 'td-business') return allExpenses.filter(e => e.account_id === 'td-business-2147')
    if (accountTab === 'rbc-visa') return allExpenses.filter(e => e.account_id === 'rbc-visa')
    return allExpenses
  }, [allExpenses, accountTab])

  const totalExpenses = filtered.reduce((sum, e) => sum + Math.abs(Number(e.amount_cad)), 0)

  const columns: ColumnDef<Expense>[] = useMemo(() => [
    {
      accessorKey: 'transaction_date',
      header: 'Date',
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground whitespace-nowrap">{row.original.transaction_date}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => <span className="max-w-[300px] truncate block">{row.original.description}</span>,
    },
    {
      accessorKey: 'amount_cad',
      header: 'Amount',
      cell: ({ row }) => <CurrencyCell amount={Number(row.original.amount_cad)} className="block text-right" />,
    },
    {
      accessorKey: 'account_label',
      header: 'Account',
      cell: ({ row }) => (
        <span className={`text-xs font-medium whitespace-nowrap ${
          row.original.account_id === 'td-business-2147' ? 'text-green-500' : 'text-purple-500'
        }`}>
          {row.original.account_label}
        </span>
      ),
    },
  ], [])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="w-full px-3 py-4 sm:px-6 sm:py-6">
      <LedgerHeader title="Expense Ledger" fiscalYear={fiscalYear} />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-6">
        <Tabs defaultValue="all" onValueChange={(v) => setAccountTab(String(v))}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="td-business">TD Business</TabsTrigger>
            <TabsTrigger value="rbc-visa">RBC Visa</TabsTrigger>
          </TabsList>
        </Tabs>

        <select
          value={fiscalYear}
          onChange={e => setFiscalYear(e.target.value)}
          className="h-9 rounded-sm border border-border bg-background px-3 text-sm"
        >
          <option value="2025-2026">2025-2026</option>
          <option value="2026-2027">2026-2027</option>
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border rounded-sm mb-6 overflow-hidden">
        <div className="bg-background p-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">Total Expenses</p>
          <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-red-500">{fmt(totalExpenses)}</span>
        </div>
        <div className="bg-background p-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">Transactions</p>
          <span className="text-lg sm:text-xl font-bold font-mono tabular-nums">{filtered.length}</span>
        </div>
      </div>

      {/* Table */}
      <FinanceDataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Search by description..."
      />

      {/* Info Banner */}
      <div className="mt-8 p-4 bg-muted/30 border border-border rounded-sm flex items-center gap-2">
        <Info className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">
          Expenses are uploaded via{' '}
          <a href="https://dashboard.jeanmarcotte.com/dashboard/finance/accounts" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            Ops Dashboard
          </a>
        </span>
      </div>
    </div>
  )
}
