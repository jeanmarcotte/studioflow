'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { LedgerHeader } from '@/components/finance/ledger-header'
import { LedgerDivider } from '@/components/finance/ledger-divider'
import { CurrencyCell } from '@/components/finance/currency-cell'
import { FinanceDataTable } from '@/components/finance/finance-data-table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, ArrowRight, Upload } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'

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

interface MemberRow {
  name: string
  rate: number
  weddings: number
  owed: number
  paid: number
  balance: number
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

// ── Helpers ─────────────────────────────────────────────────────
function getFiscalYearRange(fy: string): [string, string] {
  const [startYear] = fy.split('-').map(Number)
  return [`${startYear}-05-01`, `${startYear + 1}-04-30`]
}

function getFiscalYearLabel(fy: string): string {
  const [s, e] = fy.split('-').map(Number)
  return `${fy} (May 1, ${s} — April 30, ${e})`
}

function determineFiscalYear(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const month = d.getMonth()
  const year = d.getFullYear()
  if (month >= 4) return `${year}-${year + 1}`
  return `${year - 1}-${year}`
}

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)

// ── Main Component ──────────────────────────────────────────────
export default function FinanceCommandCenter() {
  const [loading, setLoading] = useState(true)
  const [fiscalYear, setFiscalYear] = useState('2025-2026')

  // Snapshots & expenses
  const [tdBusiness, setTdBusiness] = useState<Snapshot | null>(null)
  const [rbcVisa, setRbcVisa] = useState<Snapshot | null>(null)
  const [ytdRevenue, setYtdRevenue] = useState(0)
  const [ytdExpenses, setYtdExpenses] = useState(0)

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
    const [fyStart, fyEnd] = getFiscalYearRange(fiscalYear)

    const [snapshotRes, revenueRes, payrollRes, hstRes, bizTaxRes, membersRes, paymentsRes, assignmentsRes] = await Promise.all([
      fetch(`/api/finance/snapshots?fyStart=${fyStart}&fyEnd=${fyEnd}`).then(r => r.json()).catch(() => ({})),
      supabase.from('payments').select('amount').gte('payment_date', fyStart).lte('payment_date', fyEnd),
      supabase.from('sigs_payroll').select('month_num, month_label, is_paid').eq('fiscal_year', fiscalYear).order('month_num'),
      supabase.from('sigs_hst').select('deposit_amount').eq('fiscal_year', fiscalYear),
      supabase.from('sigs_business_tax').select('amount_due, amount_paid, is_paid').eq('fiscal_year', fiscalYear).limit(1),
      supabase.from('team_members').select('id, first_name, last_name, pay_per_wedding').eq('is_active', true).not('first_name', 'in', '("Jean","Marianna")'),
      supabase.from('sigs_member_payments').select('team_member_id, amount').eq('fiscal_year', fiscalYear),
      supabase.from('wedding_assignments').select('photo_1, photo_2, video_1, couples(wedding_date)').not('couples', 'is', null),
    ])

    // Snapshots & YTD
    setTdBusiness(snapshotRes.tdBusiness ?? null)
    setRbcVisa(snapshotRes.rbcVisa ?? null)
    setYtdExpenses(snapshotRes.ytdExpenses ?? 0)
    setYtdRevenue(revenueRes.data?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) ?? 0)

    // Tax
    setPayroll(payrollRes.data ?? [])
    setHstTotal(hstRes.data?.reduce((sum: number, h: any) => sum + Number(h.deposit_amount), 0) ?? 0)
    const tax = bizTaxRes.data?.[0]
    if (!tax) setBizTaxStatus('No record')
    else if (tax.is_paid) setBizTaxStatus('Paid')
    else if (tax.amount_due != null) setBizTaxStatus(`Due: ${fmt(tax.amount_due)}`)
    else setBizTaxStatus('Awaiting assessment')

    // Members
    setMembers(membersRes.data ?? [])
    setPayments(paymentsRes.data ?? [])

    // Wedding counts by first_name
    const counts: Record<string, number> = {}
    if (assignmentsRes.data) {
      for (const a of assignmentsRes.data as any[]) {
        const wd = a.couples?.wedding_date
        if (!wd || determineFiscalYear(wd) !== fiscalYear) continue
        for (const role of ['photo_1', 'photo_2', 'video_1'] as const) {
          const name = a[role]
          if (name) counts[name] = (counts[name] ?? 0) + 1
        }
      }
    }
    setWeddingCounts(counts)
    setLoading(false)
  }, [fiscalYear])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Computed ──────────────────────────────────────────────────
  const netPosition = ytdRevenue + ytdExpenses // ytdExpenses is already negative
  const netOperating = (tdBusiness ? Number(tdBusiness.balance_cad) : 0) + (rbcVisa ? Number(rbcVisa.balance_cad) : 0)
  const payrollPaidCount = payroll.filter(p => p.is_paid).length

  const memberRows: MemberRow[] = useMemo(() => {
    return members.map(m => {
      const weddings = weddingCounts[m.first_name] ?? 0
      const owed = weddings * m.pay_per_wedding
      const paid = payments.filter(p => p.team_member_id === m.id).reduce((sum, p) => sum + Number(p.amount), 0)
      return { name: `${m.first_name} ${m.last_name ?? ''}`.trim(), rate: m.pay_per_wedding, weddings, owed, paid, balance: owed - paid }
    }).sort((a, b) => b.balance - a.balance)
  }, [members, weddingCounts, payments])

  const memberColumns: ColumnDef<MemberRow>[] = useMemo(() => [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium whitespace-nowrap">{row.original.name}</span> },
    { accessorKey: 'rate', header: 'Rate', cell: ({ row }) => <span className="font-mono tabular-nums text-right block">{fmt(row.original.rate)}</span> },
    { accessorKey: 'weddings', header: 'Weddings', cell: ({ row }) => <span className="text-center block">{row.original.weddings}</span> },
    { accessorKey: 'owed', header: 'Owed', cell: ({ row }) => <span className="font-mono tabular-nums text-right block">{fmt(row.original.owed)}</span> },
    { accessorKey: 'paid', header: 'Paid', cell: ({ row }) => <span className="font-mono tabular-nums text-right block text-green-500">{fmt(row.original.paid)}</span> },
    { accessorKey: 'balance', header: 'Balance', cell: ({ row }) => <CurrencyCell amount={row.original.balance} className="block text-right font-semibold" /> },
  ], [])

  const totalOwed = memberRows.reduce((s, r) => s + r.owed, 0)
  const totalPaid = memberRows.reduce((s, r) => s + r.paid, 0)
  const totalBalance = memberRows.reduce((s, r) => s + r.balance, 0)

  // ── CSV Upload ────────────────────────────────────────────────
  const findMemberId = (name: string): string | undefined => {
    const parts = name.split(' ')
    const first = parts[0]
    const last = parts.slice(1).join(' ')
    return members.find(m =>
      m.first_name.toLowerCase() === first.toLowerCase() &&
      (m.last_name ?? '').toLowerCase() === last.toLowerCase()
    )?.id
  }

  const handleFile = async (file: File) => {
    setUploading(true)
    setUploadResult(null)
    const text = await file.text()
    const lines = text.trim().split('\n')
    if (lines.length < 2) { setUploading(false); return }

    const parsed: ParsedPayment[] = lines.slice(1).map(line => {
      const v = line.split(',').map(s => s.trim())
      return { team_member_name: v[0], amount: parseFloat(v[1]), payment_date: v[2], notes: v[3] || null }
    }).filter(p => p.team_member_name && !isNaN(p.amount) && p.payment_date)

    const toInsert = parsed
      .map(p => ({ team_member_id: findMemberId(p.team_member_name), amount: p.amount, payment_date: p.payment_date, fiscal_year: determineFiscalYear(p.payment_date), notes: p.notes }))
      .filter((p): p is typeof p & { team_member_id: string } => !!p.team_member_id)

    if (toInsert.length > 0) {
      await supabase.from('sigs_member_payments').insert(toInsert)
    }
    setUploadResult({ inserted: toInsert.length, skipped: parsed.length - toInsert.length })
    setUploading(false)
    fetchData()
  }

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.csv')) handleFile(f) }
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f) }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="w-full px-3 py-4 sm:px-6 sm:py-6">
      <LedgerHeader
        title="Financial Command Center"
        subtitle={getFiscalYearLabel(fiscalYear)}
      />

      {/* Fiscal Year Tabs */}
      <Tabs defaultValue="2025-2026" onValueChange={(v) => setFiscalYear(String(v))}>
        <TabsList>
          <TabsTrigger value="2025-2026">2025-2026</TabsTrigger>
          <TabsTrigger value="2026-2027">2026-2027</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ══════ YTD SUMMARY ══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border border-border rounded-sm mt-6 overflow-hidden">
        <div className="bg-background p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">YTD Revenue</p>
          <CurrencyCell amount={ytdRevenue} className="text-lg sm:text-xl font-bold block" />
        </div>
        <div className="bg-background p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">YTD Expenses</p>
          <CurrencyCell amount={ytdExpenses} className="text-lg sm:text-xl font-bold block" />
        </div>
        <div className="bg-background p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">Net Position</p>
          <CurrencyCell amount={netPosition} className="text-lg sm:text-xl font-bold block" />
        </div>
      </div>

      {/* ══════ OPERATING ACCOUNTS ══════ */}
      <LedgerDivider label="Operating Accounts" />

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-baseline">
          <span>TD Business Chequing (2147)</span>
          <div className="flex items-baseline gap-4">
            <CurrencyCell amount={tdBusiness ? Number(tdBusiness.balance_cad) : 0} className="font-bold" />
            {tdBusiness && <span className="text-xs text-muted-foreground">as of {tdBusiness.snapshot_date}</span>}
          </div>
        </div>
        <div className="flex justify-between items-baseline">
          <span>RBC Visa Business (6006)</span>
          <div className="flex items-baseline gap-4">
            <CurrencyCell amount={rbcVisa ? Number(rbcVisa.balance_cad) : 0} className="font-bold" />
            {rbcVisa && <span className="text-xs text-muted-foreground">as of {rbcVisa.snapshot_date}</span>}
          </div>
        </div>
        <div className="h-px bg-border my-2" />
        <div className="flex justify-between items-baseline font-semibold">
          <span>Net Operating Position</span>
          <CurrencyCell amount={netOperating} className="font-bold" />
        </div>
      </div>

      {/* ══════ GOVERNMENT OBLIGATIONS ══════ */}
      <LedgerDivider label="Government Obligations" />

      <div className="space-y-3 text-sm">
        {/* Payroll */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <span className="sm:w-44 font-medium">Payroll Remittances</span>
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 bg-muted rounded-sm h-2.5 max-w-[200px]">
              <div className="bg-green-500 h-2.5 rounded-sm transition-all" style={{ width: `${payroll.length > 0 ? (payrollPaidCount / payroll.length) * 100 : 0}%` }} />
            </div>
            <span className="font-mono tabular-nums text-xs whitespace-nowrap">
              {fmt(payroll.filter(p => p.is_paid).reduce((s, p) => s + 450, 0))} / {fmt(payroll.length * 450)}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{payrollPaidCount}/{payroll.length} paid</span>
          </div>
        </div>

        {/* HST */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <span className="sm:w-44 font-medium">HST Instalments</span>
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 bg-muted rounded-sm h-2.5 max-w-[200px]">
              <div className="bg-green-500 h-2.5 rounded-sm transition-all" style={{ width: `${Math.min((hstTotal / 7000) * 100, 100)}%` }} />
            </div>
            <span className="font-mono tabular-nums text-xs whitespace-nowrap">{fmt(hstTotal)} / {fmt(7000)}</span>
          </div>
        </div>

        {/* Business Tax */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <span className="sm:w-44 font-medium">Corporate Tax</span>
          <span className="text-muted-foreground text-xs">{bizTaxStatus}</span>
        </div>
      </div>

      {/* ══════ TEAM PAYABLES ══════ */}
      <LedgerDivider label={`Team Payables (FY ${fiscalYear})`} />

      <FinanceDataTable
        columns={memberColumns}
        data={memberRows}
        showSearch={false}
        showPagination={false}
        defaultPageSize={100}
      />

      <div className="mt-3 flex flex-col sm:flex-row gap-1 sm:gap-6 text-xs text-muted-foreground border-t border-border pt-3">
        <span>Total Owed: <strong className="font-mono tabular-nums text-foreground">{fmt(totalOwed)}</strong></span>
        <span>Total Paid: <strong className="font-mono tabular-nums text-green-500">{fmt(totalPaid)}</strong></span>
        <span>Balance: <CurrencyCell amount={totalBalance} className="font-semibold" /></span>
      </div>

      {/* ══════ CSV UPLOAD ══════ */}
      <LedgerDivider label="CSV Upload — Member Payments" />

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        className={`border border-dashed rounded-sm p-4 sm:p-6 text-center transition-colors ${
          dragOver ? 'border-foreground/50 bg-muted/50' : 'border-border'
        }`}
      >
        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-xs text-muted-foreground mb-2">team_member_name, amount, payment_date, notes</p>
        <label className="cursor-pointer">
          <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
          <span className="inline-flex items-center rounded-sm border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
            Choose File
          </span>
        </label>
      </div>

      {uploading && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Processing...</p>}
      {uploadResult && <p className="text-xs text-green-500 mt-2">{uploadResult.inserted} new, {uploadResult.skipped} skipped</p>}

      {/* ══════ NAVIGATION ══════ */}
      <LedgerDivider />

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <Link href="/admin/finance/income" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight className="h-3.5 w-3.5" /> View Income Ledger
        </Link>
        <Link href="/admin/finance/expenses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight className="h-3.5 w-3.5" /> View Expense Ledger
        </Link>
        <Link href="/admin/finance/tax" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight className="h-3.5 w-3.5" /> Tax Details
        </Link>
      </div>
    </div>
  )
}
