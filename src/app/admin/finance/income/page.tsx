'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { LedgerHeader } from '@/components/finance/ledger-header'
import { LedgerDivider } from '@/components/finance/ledger-divider'
import { CurrencyCell } from '@/components/finance/currency-cell'
import { FinanceDataTable } from '@/components/finance/finance-data-table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Upload } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'

// ── Types ───────────────────────────────────────────────────────
interface Payment {
  id: string
  couple_id: string | null
  amount: number
  payment_date: string
  method: string | null
  from_name: string | null
  client_name: string
}

interface ParsedPayment {
  payment_date: string
  description: string
  amount: number
}

interface UploadResult {
  inserted: number
  dupes: number
}

// ── Helpers ─────────────────────────────────────────────────────
function getFiscalYearRange(fy: string): [string, string] {
  const [startYear] = fy.split('-').map(Number)
  return [`${startYear}-05-01`, `${startYear + 1}-04-30`]
}

function parseTDDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return dateStr
}

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)

// ── Main Component ──────────────────────────────────────────────
export default function IncomeLedger() {
  const [fiscalYear, setFiscalYear] = useState('2025-2026')
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])

  // CSV uploader
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [fyStart, fyEnd] = getFiscalYearRange(fiscalYear)

    const { data } = await supabase
      .from('payments')
      .select('id, couple_id, amount, payment_date, method, from_name, couples(id, couple_name)')
      .gte('payment_date', fyStart)
      .lte('payment_date', fyEnd)
      .order('payment_date', { ascending: false })

    const normalized = (data ?? []).map((p: any) => {
      const couple = Array.isArray(p.couples) ? p.couples[0] : p.couples
      return {
        id: p.id,
        couple_id: couple?.id ?? p.couple_id,
        amount: p.amount,
        payment_date: p.payment_date,
        method: p.method,
        from_name: p.from_name,
        client_name: couple?.couple_name ?? p.from_name ?? 'Unknown',
      }
    })
    setPayments(normalized)
    setLoading(false)
  }, [fiscalYear])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Computed ──────────────────────────────────────────────────
  const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const avgPayment = payments.length > 0 ? totalIncome / payments.length : 0

  // ── Table columns ─────────────────────────────────────────────
  const columns: ColumnDef<Payment>[] = useMemo(() => [
    {
      accessorKey: 'payment_date',
      header: 'Date',
      cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground whitespace-nowrap">{row.original.payment_date}</span>,
    },
    {
      accessorKey: 'client_name',
      header: 'Client',
      cell: ({ row }) => row.original.couple_id ? (
        <Link href={`/admin/couples/${row.original.couple_id}`} className="hover:underline whitespace-nowrap">{row.original.client_name}</Link>
      ) : (
        <span className="text-muted-foreground whitespace-nowrap">{row.original.client_name}</span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => <CurrencyCell amount={Number(row.original.amount)} className="block text-right" />,
    },
    {
      accessorKey: 'method',
      header: 'Method',
      cell: ({ row }) => <span className="capitalize text-muted-foreground">{row.original.method ?? '—'}</span>,
    },
  ], [])

  // ── CSV Upload ────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setUploading(true)
    setUploadResult(null)
    const text = await file.text()
    const lines = text.trim().split('\n')
    if (lines.length < 2) { setUploading(false); return }

    const parsed: ParsedPayment[] = lines.slice(1).map(line => {
      const v = line.split(',').map(s => s.trim())
      return { payment_date: parseTDDate(v[0]), description: v[1] ?? '', amount: parseFloat((v[2] ?? '0').replace(/[^0-9.-]/g, '')) }
    }).filter(p => p.amount > 0 && p.payment_date)

    // Match to couples
    const { data: couples } = await supabase.from('couples').select('id, couple_name')

    let inserted = 0
    let dupes = 0

    for (const payment of parsed) {
      // Duplicate check
      const { data: existing } = await supabase.from('payments').select('id').eq('payment_date', payment.payment_date).eq('amount', payment.amount).limit(1)
      if (existing && existing.length > 0) { dupes++; continue }

      // Match couple
      const nameMatch = payment.description.match(/From:\s*(.+)/i)
      const name = nameMatch?.[1]?.toLowerCase().trim() ?? ''
      const matched = couples?.find(c => {
        const parts = c.couple_name.toLowerCase().split('&').map((s: string) => s.trim())
        return parts.some((part: string) => { const fn = part.split(' ')[0]; return fn && name.includes(fn) })
      })

      await supabase.from('payments').insert({
        couple_id: matched?.id ?? null,
        amount: payment.amount,
        payment_date: payment.payment_date,
        method: 'e-transfer',
        from_name: matched ? null : payment.description,
      })
      inserted++
    }

    setUploadResult({ inserted, dupes })
    setUploading(false)
    fetchData()
  }

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.csv')) handleFile(f) }
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f) }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="w-full px-3 py-4 sm:px-6 sm:py-6">
      <LedgerHeader title="Income Ledger" fiscalYear={fiscalYear} />

      <Tabs defaultValue="2025-2026" onValueChange={(v) => setFiscalYear(String(v))}>
        <TabsList>
          <TabsTrigger value="2025-2026">2025-2026</TabsTrigger>
          <TabsTrigger value="2026-2027">2026-2027</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border border-border rounded-sm mt-6 mb-6 overflow-hidden">
        <div className="bg-background p-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">Total Income</p>
          <CurrencyCell amount={totalIncome} className="text-lg sm:text-xl font-bold block" />
        </div>
        <div className="bg-background p-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">Transactions</p>
          <span className="text-lg sm:text-xl font-bold font-mono tabular-nums">{payments.length}</span>
        </div>
        <div className="bg-background p-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">Average Payment</p>
          <CurrencyCell amount={avgPayment} className="text-lg sm:text-xl font-bold block" />
        </div>
      </div>

      {/* Table */}
      <FinanceDataTable
        columns={columns}
        data={payments}
        searchPlaceholder="Search by client name..."
      />

      {/* CSV Upload */}
      <LedgerDivider label="CSV Upload" />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          className={`border border-dashed rounded-sm p-4 text-center flex-1 transition-colors ${dragOver ? 'border-foreground/50 bg-muted/50' : 'border-border'}`}
        >
          <label className="cursor-pointer">
            <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
            <span className="text-xs text-muted-foreground">Drop CSV or <span className="underline">choose file</span></span>
          </label>
        </div>
        {uploading && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Processing...</p>}
        {uploadResult && <p className="text-xs text-green-500">{uploadResult.inserted} new, {uploadResult.dupes} dupes</p>}
      </div>
    </div>
  )
}
