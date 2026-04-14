'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { Loader2, Upload, DollarSign, Hash, TrendingUp } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'

// ── Types ───────────────────────────────────────────────────────
interface Payment {
  id: string
  couple_id: string | null
  amount: number
  payment_date: string
  method: string | null
  from_name: string | null
  couples: { id: string; couple_name: string } | null
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
  // Handle formats like "Apr 12 2026" or "04/12/2026" or "2026-04-12"
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }
  return dateStr
}

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
const fmtDate = (d: string) => {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}
const fmtDateShort = (d: string) => {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

// ── Main Component ──────────────────────────────────────────────
export default function IncomePage() {
  const [fiscalYear, setFiscalYear] = useState('2025-2026')
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [methodFilter, setMethodFilter] = useState<string | null>(null)

  // CSV uploader state
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

    const normalized = (data || []).map((p: any) => ({
      ...p,
      couples: Array.isArray(p.couples) ? p.couples[0] ?? null : p.couples,
    }))
    setPayments(normalized)
    setLoading(false)
  }, [fiscalYear])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Computed ──────────────────────────────────────────────────
  const methods = useMemo(() => {
    const set = new Set(payments.map(p => p.method).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [payments])

  const filtered = useMemo(() => {
    let result = payments
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      result = result.filter(p => {
        const coupleName = p.couples?.couple_name || ''
        const fromName = p.from_name || ''
        return coupleName.toLowerCase().includes(q) || fromName.toLowerCase().includes(q)
      })
    }
    if (methodFilter) {
      result = result.filter(p => p.method === methodFilter)
    }
    return result
  }, [payments, searchTerm, methodFilter])

  const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const avgPayment = payments.length > 0 ? totalIncome / payments.length : 0

  // ── Table columns ─────────────────────────────────────────────
  const columns: ColumnDef<Payment>[] = useMemo(() => [
    {
      accessorKey: 'payment_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground font-mono text-xs sm:text-sm">
          {row.original.payment_date ? fmtDateShort(row.original.payment_date) : '—'}
        </span>
      ),
    },
    {
      id: 'couple_name',
      accessorFn: (row) => row.couples?.couple_name || row.from_name || 'Unknown',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Client" />,
      cell: ({ row }) => row.original.couples ? (
        <Link
          href={`/admin/couples/${row.original.couples.id}`}
          className="text-primary hover:text-primary/80 font-medium hover:underline whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.couples.couple_name}
        </Link>
      ) : (
        <span className="text-muted-foreground whitespace-nowrap">{row.original.from_name || 'Unknown'}</span>
      ),
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-green-600 whitespace-nowrap" style={{ textAlign: 'right', display: 'block' }}>
          {fmt(Number(row.original.amount))}
        </span>
      ),
    },
    {
      accessorKey: 'method',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Method" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground capitalize text-xs sm:text-sm">{row.original.method || '—'}</span>
      ),
    },
    {
      accessorKey: 'from_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="From" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">{row.original.from_name || '—'}</span>
      ),
    },
  ], [])

  // ── CSV Upload ────────────────────────────────────────────────
  const parseEtransferCSV = (text: string): ParsedPayment[] => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      return {
        payment_date: parseTDDate(values[0]),
        description: values[1] || '',
        amount: parseFloat((values[2] || '0').replace(/[^0-9.-]/g, '')),
      }
    }).filter(p => p.amount > 0 && p.payment_date)
  }

  const matchToCouple = async (description: string) => {
    const nameMatch = description.match(/From:\s*(.+)/i)
    if (!nameMatch) return null

    const name = nameMatch[1].toLowerCase().trim()

    const { data: couples } = await supabase
      .from('couples')
      .select('id, couple_name')

    return couples?.find(c => {
      const parts = c.couple_name.toLowerCase().split('&').map((s: string) => s.trim())
      return parts.some((part: string) => {
        const firstName = part.split(' ')[0]
        return firstName && name.includes(firstName)
      })
    }) ?? null
  }

  const isDuplicate = async (payment: ParsedPayment) => {
    const { data } = await supabase
      .from('payments')
      .select('id')
      .eq('payment_date', payment.payment_date)
      .eq('amount', payment.amount)
      .limit(1)

    return data && data.length > 0
  }

  const uploadPayments = async (parsed: ParsedPayment[]) => {
    let inserted = 0
    let dupes = 0

    for (const payment of parsed) {
      if (await isDuplicate(payment)) {
        dupes++
        continue
      }

      const couple = await matchToCouple(payment.description)

      await supabase.from('payments').insert({
        couple_id: couple?.id ?? null,
        amount: payment.amount,
        payment_date: payment.payment_date,
        method: 'e-transfer',
        from_name: couple ? null : payment.description,
      })

      inserted++
    }

    return { inserted, dupes }
  }

  const handleFile = async (file: File) => {
    setUploading(true)
    setUploadResult(null)
    const text = await file.text()
    const parsed = parseEtransferCSV(text)
    const result = await uploadPayments(parsed)
    setUploadResult(result)
    setUploading(false)
    fetchData()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) handleFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

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
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">SIGS Finance — Income</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">All client payments</p>
      </div>

      {/* ══════ SUMMARY ══════ */}
      <Card>
        <CardContent className="pt-4">
          <Tabs defaultValue="2025-2026" onValueChange={(v) => setFiscalYear(String(v))}>
            <TabsList>
              <TabsTrigger value="2025-2026">2025-2026</TabsTrigger>
              <TabsTrigger value="2026-2027">2026-2027</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <DollarSign className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold">Total Income</p>
                <p className="text-lg sm:text-xl font-bold font-mono text-green-600">{fmt(totalIncome)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Hash className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold">Payments</p>
                <p className="text-lg sm:text-xl font-bold font-mono text-blue-600">{payments.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-teal-50 border border-teal-200">
              <TrendingUp className="h-5 w-5 text-teal-600 shrink-0" />
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold">Average</p>
                <p className="text-lg sm:text-xl font-bold font-mono text-teal-600">{fmt(avgPayment)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══════ INCOME TABLE ══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Income Table</CardTitle>
          <CardDescription>{filtered.length} payment{filtered.length !== 1 ? 's' : ''} shown</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
            <Input
              placeholder="Search by client name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="sm:w-64"
            />
            <select
              value={methodFilter || ''}
              onChange={e => setMethodFilter(e.target.value || null)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All methods</option>
              {methods.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={filtered}
              emptyMessage="No payments found"
            />
          </div>
        </CardContent>
      </Card>

      {/* ══════ CSV UPLOADER ══════ */}
      <Card>
        <CardHeader>
          <CardTitle>CSV Uploader: SIGS E-transfers</CardTitle>
          <CardDescription>Format: Date, Description, Amount, Balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs sm:text-sm text-muted-foreground mb-3">Drag & drop CSV file here</p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
                Browse Files
              </span>
            </label>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Processing...
            </div>
          )}

          {uploadResult && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-green-700 dark:text-green-300 text-sm">
                {uploadResult.inserted} new, {uploadResult.dupes} duplicates skipped
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
