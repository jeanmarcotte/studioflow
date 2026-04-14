'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowRight, Upload, Landmark, CreditCard, CheckCircle2, Circle, AlertCircle } from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────
interface Snapshot {
  account_id: string
  account_name: string
  balance_cad: number
  snapshot_date: string
}

interface PayrollMonth {
  month_num: number
  month_label: string
  is_paid: boolean
}

interface TeamMember {
  id: string
  first_name: string
  last_name: string | null
  pay_per_wedding: number
}

interface MemberPayment {
  team_member_id: string
  amount: number
}

interface ParsedPayment {
  team_member_name: string
  amount: number
  payment_date: string
  notes: string | null
}

interface UploadResult {
  inserted: number
  skipped: number
}

const HST_TARGET = 7000

function determineFiscalYear(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const month = d.getMonth() // 0-indexed
  const year = d.getFullYear()
  // FY starts May 1: May-Dec = current year start, Jan-Apr = previous year start
  if (month >= 4) return `${year}-${year + 1}`
  return `${year - 1}-${year}`
}

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
const fmtDate = (d: string) => {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

// ── Main Component ──────────────────────────────────────────────
export default function AccountLedgerPage() {
  const [loading, setLoading] = useState(true)
  const [fiscalYear, setFiscalYear] = useState('2025-2026')

  // Snapshots
  const [tdBusiness, setTdBusiness] = useState<Snapshot | null>(null)
  const [rbcVisa, setRbcVisa] = useState<Snapshot | null>(null)

  // Tax mini-ledgers
  const [payroll, setPayroll] = useState<PayrollMonth[]>([])
  const [hstTotal, setHstTotal] = useState(0)
  const [bizTaxStatus, setBizTaxStatus] = useState('')

  // Member payables
  const [members, setMembers] = useState<TeamMember[]>([])
  const [payments, setPayments] = useState<MemberPayment[]>([])
  const [weddingCounts, setWeddingCounts] = useState<Record<string, number>>({})

  // CSV uploader
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)

    // Fetch snapshots via API route (server-side Ops Dashboard access)
    const snapshotRes = fetch('/api/finance/snapshots').then(r => r.json()).catch(() => ({}))

    // Fetch tax mini-ledgers
    const payrollRes = supabase
      .from('sigs_payroll')
      .select('month_num, month_label, is_paid')
      .eq('fiscal_year', fiscalYear)
      .order('month_num')

    const hstRes = supabase
      .from('sigs_hst')
      .select('deposit_amount')
      .eq('fiscal_year', fiscalYear)

    const bizTaxRes = supabase
      .from('sigs_business_tax')
      .select('amount_due, amount_paid, is_paid')
      .eq('fiscal_year', fiscalYear)
      .limit(1)

    // Fetch member payables
    const membersRes = supabase
      .from('team_members')
      .select('id, first_name, last_name, pay_per_wedding')
      .eq('is_active', true)
      .not('first_name', 'in', '("Jean","Marianna")')

    const paymentsRes = supabase
      .from('sigs_member_payments')
      .select('team_member_id, amount')
      .eq('fiscal_year', fiscalYear)

    // Fetch wedding counts from staff_assignments
    const assignmentsRes = supabase
      .from('staff_assignments')
      .select('team_member_id, couple_id, couples!inner(wedding_date)')
      .not('team_member_id', 'is', null)

    const [snapshots, payrollData, hstData, bizTaxData, membersData, paymentsData, assignmentsData] = await Promise.all([
      snapshotRes,
      payrollRes,
      hstRes,
      bizTaxRes,
      membersRes,
      paymentsRes,
      assignmentsRes,
    ])

    // Snapshots
    setTdBusiness(snapshots.tdBusiness ?? null)
    setRbcVisa(snapshots.rbcVisa ?? null)

    // Payroll
    setPayroll(payrollData.data || [])

    // HST
    const hstSum = hstData.data?.reduce((sum: number, h: any) => sum + Number(h.deposit_amount), 0) ?? 0
    setHstTotal(hstSum)

    // Business tax status
    const tax = bizTaxData.data?.[0]
    if (!tax) setBizTaxStatus('No record')
    else if (tax.is_paid) setBizTaxStatus('Paid')
    else if (tax.amount_due != null) setBizTaxStatus(`Due: ${fmt(tax.amount_due)}`)
    else setBizTaxStatus('Waiting for assessment')

    // Members
    setMembers(membersData.data || [])
    setPayments(paymentsData.data || [])

    // Count weddings per member in fiscal year
    const counts: Record<string, number> = {}
    if (assignmentsData.data) {
      for (const a of assignmentsData.data) {
        const wd = (a.couples as any)?.wedding_date
        if (wd && determineFiscalYear(wd) === fiscalYear) {
          counts[a.team_member_id] = (counts[a.team_member_id] || 0) + 1
        }
      }
    }
    setWeddingCounts(counts)

    setLoading(false)
  }, [fiscalYear])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── CSV Upload handlers ───────────────────────────────────────
  const parseCSV = (text: string): ParsedPayment[] => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      return {
        team_member_name: values[0],
        amount: parseFloat(values[1]),
        payment_date: values[2],
        notes: values[3] || null,
      }
    }).filter(p => p.team_member_name && !isNaN(p.amount) && p.payment_date)
  }

  const findMemberId = (name: string): string | undefined => {
    const parts = name.split(' ')
    const first = parts[0]
    const last = parts.slice(1).join(' ')
    return members.find(m =>
      m.first_name.toLowerCase() === first.toLowerCase() &&
      (m.last_name || '').toLowerCase() === last.toLowerCase()
    )?.id
  }

  const uploadPayments = async (parsed: ParsedPayment[]) => {
    const toInsert = parsed
      .map(p => ({
        team_member_id: findMemberId(p.team_member_name),
        amount: p.amount,
        payment_date: p.payment_date,
        fiscal_year: determineFiscalYear(p.payment_date),
        notes: p.notes,
      }))
      .filter((p): p is typeof p & { team_member_id: string } => !!p.team_member_id)

    if (toInsert.length > 0) {
      await supabase.from('sigs_member_payments').insert(toInsert)
    }

    return { inserted: toInsert.length, skipped: parsed.length - toInsert.length }
  }

  const handleFile = async (file: File) => {
    setUploading(true)
    setUploadResult(null)
    const text = await file.text()
    const parsed = parseCSV(text)
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

  // ── Computed: Member payables ─────────────────────────────────
  const memberRows = members.map(m => {
    const weddings = weddingCounts[m.id] || 0
    const owed = weddings * m.pay_per_wedding
    const paid = payments
      .filter(p => p.team_member_id === m.id)
      .reduce((sum, p) => sum + Number(p.amount), 0)
    return {
      id: m.id,
      name: `${m.first_name} ${m.last_name || ''}`.trim(),
      rate: m.pay_per_wedding,
      weddings,
      owed,
      paid,
      balance: owed - paid,
    }
  }).sort((a, b) => b.balance - a.balance)

  const totalOwed = memberRows.reduce((s, r) => s + r.owed, 0)
  const totalPaid = memberRows.reduce((s, r) => s + r.paid, 0)
  const totalBalance = memberRows.reduce((s, r) => s + r.balance, 0)

  // ── Payroll mini-ledger computed ──────────────────────────────
  const payrollPaidCount = payroll.filter(p => p.is_paid).length

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
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">SIGS Finance — Account Ledger</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Financial overview and team payments</p>
      </div>

      {/* ══════ ACCOUNT SNAPSHOTS ══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <Landmark className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">TD Business</p>
                <p className="text-lg sm:text-xl font-bold font-mono text-foreground">
                  {tdBusiness ? fmt(Number(tdBusiness.balance_cad)) : '—'}
                </p>
                {tdBusiness && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground">as of {fmtDate(tdBusiness.snapshot_date)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2">
                <CreditCard className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">RBC Visa</p>
                <p className="text-lg sm:text-xl font-bold font-mono text-foreground">
                  {rbcVisa ? fmt(Number(rbcVisa.balance_cad)) : '—'}
                </p>
                {rbcVisa && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground">as of {fmtDate(rbcVisa.snapshot_date)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ══════ QUICK LINKS ══════ */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Link href="/admin/finance/income" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium">
              <ArrowRight className="h-4 w-4" /> Income
            </Link>
            <Link href="/admin/finance/expenses" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium">
              <ArrowRight className="h-4 w-4" /> Expenses
            </Link>
            <Link href="/admin/finance/tax" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium">
              <ArrowRight className="h-4 w-4" /> Business Tax
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ══════ TAX STATUS MINI-LEDGERS ══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Status</CardTitle>
          <CardDescription>Payroll, HST, and Business Tax — {fiscalYear}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payroll */}
          <div>
            <p className="text-xs sm:text-sm font-semibold mb-2">Payroll {fiscalYear}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm">
              {payroll.map(p => (
                <span key={p.month_num} className="inline-flex items-center gap-1">
                  <span className="text-muted-foreground">{p.month_label.split(' ')[0].slice(0, 3)}</span>
                  {p.is_paid
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    : <Circle className="h-3.5 w-3.5 text-gray-300" />
                  }
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{payrollPaidCount}/{payroll.length} paid</p>
          </div>

          <hr className="border-border" />

          {/* HST */}
          <div>
            <p className="text-xs sm:text-sm font-semibold mb-1">HST {fiscalYear}</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((hstTotal / HST_TARGET) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs sm:text-sm font-mono whitespace-nowrap">{fmt(hstTotal)} / {fmt(HST_TARGET)}</span>
            </div>
          </div>

          <hr className="border-border" />

          {/* Business Tax */}
          <div className="flex items-center gap-2">
            <p className="text-xs sm:text-sm font-semibold">Business Tax {fiscalYear}:</p>
            <span className={`text-xs sm:text-sm ${
              bizTaxStatus === 'Paid' ? 'text-green-600 font-semibold'
                : bizTaxStatus.startsWith('Due') ? 'text-amber-600 font-semibold'
                  : 'text-muted-foreground'
            }`}>
              {bizTaxStatus}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ══════ MEMBER PAYABLES ══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Member Payables</CardTitle>
          <CardDescription>Team payment tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="2025-2026" onValueChange={(v) => setFiscalYear(String(v))}>
            <TabsList>
              <TabsTrigger value="2025-2026">2025-2026</TabsTrigger>
              <TabsTrigger value="2026-2027">2026-2027</TabsTrigger>
            </TabsList>
            <TabsContent value={fiscalYear}>
              {memberRows.length > 0 ? (
                <>
                  <div className="rounded-md border mt-3 overflow-x-auto">
                    <Table className="text-xs sm:text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8 text-center">#</TableHead>
                          <TableHead className="min-w-[80px]">Name</TableHead>
                          <TableHead className="min-w-[70px]">Rate</TableHead>
                          <TableHead className="min-w-[70px]">Weddings</TableHead>
                          <TableHead className="min-w-[80px]">Owed</TableHead>
                          <TableHead className="min-w-[80px]">Paid</TableHead>
                          <TableHead className="min-w-[80px]">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberRows.map((row, i) => (
                          <TableRow key={row.id}>
                            <TableCell className="w-8 text-center text-gray-500">{i + 1}</TableCell>
                            <TableCell className="font-medium whitespace-nowrap">{row.name}</TableCell>
                            <TableCell className="font-mono">{fmt(row.rate)}</TableCell>
                            <TableCell className="text-center">{row.weddings}</TableCell>
                            <TableCell className="font-mono">{fmt(row.owed)}</TableCell>
                            <TableCell className="font-mono text-green-600">{fmt(row.paid)}</TableCell>
                            <TableCell className={`font-mono font-semibold ${row.balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                              {fmt(row.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-3 flex flex-col sm:flex-row gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <span>Total Owed: <strong className="text-foreground">{fmt(totalOwed)}</strong></span>
                    <span>Total Paid: <strong className="text-green-600">{fmt(totalPaid)}</strong></span>
                    <span>Balance: <strong className={totalBalance > 0 ? 'text-amber-600' : 'text-green-600'}>{fmt(totalBalance)}</strong></span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-4">No team members found.</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ══════ CSV UPLOADER ══════ */}
      <Card>
        <CardHeader>
          <CardTitle>CSV Uploader: Member Payables</CardTitle>
          <CardDescription>Format: team_member_name, amount, payment_date, notes</CardDescription>
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
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
            </div>
          )}

          {uploadResult && (
            <p className="mt-3 text-sm text-green-600">
              {uploadResult.inserted} new, {uploadResult.skipped} skipped
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
