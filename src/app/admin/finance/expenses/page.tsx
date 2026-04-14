'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Info, DollarSign, Hash, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────
interface Expense {
  id: string
  account_id: string
  transaction_date: string
  description: string
  amount_cad: number
}

// ── Helpers ─────────────────────────────────────────────────────
function getFiscalYearRange(fy: string): [string, string] {
  const [startYear] = fy.split('-').map(Number)
  return [`${startYear}-05-01`, `${startYear + 1}-04-30`]
}

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
const fmtDate = (d: string) => {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

const getAccountLabel = (account_id: string) => {
  switch (account_id) {
    case 'td-business-2147': return 'TD Business'
    case 'rbc-visa': return 'RBC Visa'
    default: return account_id
  }
}

const PAGE_SIZE = 50

// ── Main Component ──────────────────────────────────────────────
export default function ExpensesPage() {
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [fiscalYear, setFiscalYear] = useState('2025-2026')
  const [accountTab, setAccountTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [fyStart, fyEnd] = getFiscalYearRange(fiscalYear)

    const res = await fetch(`/api/finance/expenses?fyStart=${fyStart}&fyEnd=${fyEnd}`)
    const json = await res.json()
    setExpenses(json.expenses || [])
    setPage(1)
    setLoading(false)
  }, [fiscalYear])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Filtering ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = expenses

    // Account filter
    if (accountTab === 'td-business') {
      result = result.filter(e => e.account_id === 'td-business-2147')
    } else if (accountTab === 'rbc-visa') {
      result = result.filter(e => e.account_id === 'rbc-visa')
    }

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      result = result.filter(e => e.description.toLowerCase().includes(q))
    }

    return result
  }, [expenses, accountTab, searchTerm])

  // ── Pagination ────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Summary ───────────────────────────────────────────────────
  const totalExpenses = filtered.reduce((sum, e) => sum + Math.abs(Number(e.amount_cad)), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="w-full px-3 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">SIGS Finance — Expenses</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Business expenses from TD Business and RBC Visa</p>
      </div>

      {/* ══════ ACCOUNT TABS ══════ */}
      <Tabs defaultValue="all" onValueChange={(v) => { setAccountTab(String(v)); setPage(1) }}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="td-business">TD Business</TabsTrigger>
          <TabsTrigger value="rbc-visa">RBC Visa</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ══════ SUMMARY ══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
          <DollarSign className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold">Total Expenses</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-red-600">{fmt(totalExpenses)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <Hash className="h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold">Transactions</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-blue-600">{filtered.length}</p>
          </div>
        </div>
      </div>

      {/* ══════ FILTERS ══════ */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <select
          value={fiscalYear}
          onChange={e => setFiscalYear(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="2025-2026">2025-2026</option>
          <option value="2026-2027">2026-2027</option>
        </select>
        <Input
          placeholder="Search by description..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
          className="sm:w-64"
        />
      </div>

      {/* ══════ EXPENSES TABLE ══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>
            Showing {paginated.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table className="text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-center">#</TableHead>
                  <TableHead className="min-w-[70px]">Date</TableHead>
                  <TableHead className="min-w-[180px]">Description</TableHead>
                  <TableHead className="min-w-[90px] text-right">Amount</TableHead>
                  <TableHead className="min-w-[90px]">Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length > 0 ? (
                  paginated.map((e, i) => (
                    <TableRow key={e.id}>
                      <TableCell className="w-8 text-center text-gray-500">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground font-mono">{fmtDate(e.transaction_date)}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{e.description}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-red-600 whitespace-nowrap">
                        {fmt(Number(e.amount_cad))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={`text-xs sm:text-sm font-medium ${
                          e.account_id === 'td-business-2147'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-purple-600 dark:text-purple-400'
                        }`}>
                          {getAccountLabel(e.account_id)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No expenses found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════ INFO BANNER ══════ */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2">
        <Info className="h-4 w-4 text-blue-500 shrink-0" />
        <span className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
          Expenses are uploaded via{' '}
          <a
            href="https://dashboard.jeanmarcotte.com/dashboard/finance/accounts"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Ops Dashboard
          </a>
        </span>
      </div>
    </div>
  )
}
