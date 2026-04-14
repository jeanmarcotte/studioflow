'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus } from 'lucide-react'

interface PayrollRow {
  id: string
  fiscal_year: string
  month_num: number
  month_label: string
  gross_payroll: number
  remittance_amount: number
  due_date: string
  is_paid: boolean
  paid_date: string | null
}

interface HstDeposit {
  id: string
  fiscal_year: string
  deposit_date: string
  deposit_amount: number
  confirmation_number: string | null
}

interface BusinessTaxRow {
  id: string
  fiscal_year: string
  amount_due: number | null
  amount_paid: number | null
  is_paid: boolean
  bill_received_date: string | null
  payment_date: string | null
}

const HST_TARGET = 7000

export default function BusinessTaxPage() {
  const [fiscalYear, setFiscalYear] = useState('2025-2026')
  const [loading, setLoading] = useState(true)

  // Payroll state
  const [payroll, setPayroll] = useState<PayrollRow[]>([])

  // HST state
  const [hstDeposits, setHstDeposits] = useState<HstDeposit[]>([])
  const [showAddHst, setShowAddHst] = useState(false)
  const [newHstDate, setNewHstDate] = useState('')
  const [newHstAmount, setNewHstAmount] = useState('')
  const [newHstConfirmation, setNewHstConfirmation] = useState('')

  // Business tax state
  const [businessTax, setBusinessTax] = useState<BusinessTaxRow | null>(null)
  const [taxAmountInput, setTaxAmountInput] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [payrollRes, hstRes, taxRes] = await Promise.all([
      supabase
        .from('sigs_payroll')
        .select('*')
        .eq('fiscal_year', fiscalYear)
        .order('month_num', { ascending: true }),
      supabase
        .from('sigs_hst')
        .select('*')
        .eq('fiscal_year', fiscalYear)
        .order('deposit_date', { ascending: true }),
      supabase
        .from('sigs_business_tax')
        .select('*')
        .eq('fiscal_year', fiscalYear)
        .limit(1),
    ])
    setPayroll(payrollRes.data || [])
    setHstDeposits(hstRes.data || [])
    const tax = taxRes.data?.[0] ?? null
    setBusinessTax(tax)
    setTaxAmountInput(tax?.amount_due != null ? String(tax.amount_due) : '')
    setLoading(false)
  }, [fiscalYear])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Payroll handlers ──────────────────────────────────────────
  const togglePaid = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    setPayroll(prev =>
      prev.map(p => p.id === id ? { ...p, is_paid: newStatus, paid_date: newStatus ? new Date().toISOString().split('T')[0] : null } : p)
    )
    await supabase
      .from('sigs_payroll')
      .update({
        is_paid: newStatus,
        paid_date: newStatus ? new Date().toISOString().split('T')[0] : null,
      })
      .eq('id', id)
  }

  // ── HST handlers ──────────────────────────────────────────────
  const addHstDeposit = async () => {
    if (!newHstDate || !newHstAmount) return
    const amount = parseFloat(newHstAmount)
    if (isNaN(amount) || amount <= 0) return

    await supabase.from('sigs_hst').insert({
      fiscal_year: fiscalYear,
      deposit_date: newHstDate,
      deposit_amount: amount,
      confirmation_number: newHstConfirmation || null,
    })

    setNewHstDate('')
    setNewHstAmount('')
    setNewHstConfirmation('')
    setShowAddHst(false)
    fetchData()
  }

  // ── Business Tax handlers ─────────────────────────────────────
  const updateAmountDue = async () => {
    const amount = parseFloat(taxAmountInput)
    if (isNaN(amount) || amount <= 0) return
    await supabase
      .from('sigs_business_tax')
      .update({
        amount_due: amount,
        bill_received_date: new Date().toISOString().split('T')[0],
      })
      .eq('fiscal_year', fiscalYear)
    fetchData()
  }

  const markTaxPaid = async () => {
    if (!businessTax?.amount_due) return
    await supabase
      .from('sigs_business_tax')
      .update({
        amount_paid: businessTax.amount_due,
        payment_date: new Date().toISOString().split('T')[0],
        is_paid: true,
      })
      .eq('fiscal_year', fiscalYear)
    fetchData()
  }

  // ── Computed values ───────────────────────────────────────────
  const payrollPaidCount = payroll.filter(p => p.is_paid).length
  const payrollTotalRemitted = payroll.filter(p => p.is_paid).reduce((sum, p) => sum + Number(p.remittance_amount), 0)
  const payrollTotalDue = payroll.reduce((sum, p) => sum + Number(p.remittance_amount), 0)

  const hstTotalDeposited = hstDeposits.reduce((sum, d) => sum + Number(d.deposit_amount), 0)
  const hstRemaining = HST_TARGET - hstTotalDeposited
  const hstProgress = Math.min((hstTotalDeposited / HST_TARGET) * 100, 100)

  const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
  const fmtDate = (d: string) => {
    const date = new Date(d + 'T00:00:00')
    return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  }

  const taxStatus = !businessTax
    ? 'No record'
    : businessTax.is_paid
      ? 'Paid'
      : businessTax.amount_due != null
        ? `Due: ${fmt(businessTax.amount_due)}`
        : 'Waiting for assessment'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Business Tax</h1>
        <p className="text-sm text-muted-foreground mt-1">Government remittances and tax tracking</p>
      </div>

      {/* ══════ PAYROLL REMITTANCES ══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Remittances</CardTitle>
          <CardDescription>Monthly CRA remittance tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="2025-2026" onValueChange={(v) => setFiscalYear(String(v))}>
            <TabsList>
              <TabsTrigger value="2025-2026">2025-2026</TabsTrigger>
              <TabsTrigger value="2026-2027">2026-2027</TabsTrigger>
            </TabsList>
            <TabsContent value="2025-2026">
              <PayrollTable payroll={payroll} fiscalYear="2025-2026" selectedFiscalYear={fiscalYear} togglePaid={togglePaid} fmt={fmt} fmtDate={fmtDate} />
            </TabsContent>
            <TabsContent value="2026-2027">
              <PayrollTable payroll={payroll} fiscalYear="2026-2027" selectedFiscalYear={fiscalYear} togglePaid={togglePaid} fmt={fmt} fmtDate={fmtDate} />
            </TabsContent>
          </Tabs>
          <div className="mt-3 text-sm text-muted-foreground">
            {payrollPaidCount}/{payroll.length} paid | Total remitted: {fmt(payrollTotalRemitted)} / {fmt(payrollTotalDue)}
          </div>
        </CardContent>
      </Card>

      {/* ══════ HST DEPOSITS ══════ */}
      <Card>
        <CardHeader>
          <CardTitle>HST Deposits</CardTitle>
          <CardDescription>Quarterly deposits toward annual target</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="flex items-center gap-4 mb-3 text-sm">
            <span>Target: <strong>{fmt(HST_TARGET)}</strong></span>
            <span>Deposited: <strong className="text-green-600">{fmt(hstTotalDeposited)}</strong></span>
            <span>Remaining: <strong className="text-amber-600">{fmt(hstRemaining > 0 ? hstRemaining : 0)}</strong></span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div
              className="bg-green-500 h-2.5 rounded-full transition-all"
              style={{ width: `${hstProgress}%` }}
            />
          </div>

          {/* Deposits table */}
          {hstDeposits.length > 0 ? (
            <div className="rounded-md border mb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 text-center">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Confirmation</TableHead>
                    <TableHead className="text-right">Running Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hstDeposits.map((d, i) => {
                    const running = hstDeposits.slice(0, i + 1).reduce((sum, x) => sum + Number(x.deposit_amount), 0)
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="w-8 text-center text-gray-500 text-sm">{i + 1}</TableCell>
                        <TableCell>{fmtDate(d.deposit_date)}</TableCell>
                        <TableCell className="font-mono">{fmt(Number(d.deposit_amount))}</TableCell>
                        <TableCell className="text-muted-foreground">{d.confirmation_number || '—'}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(running)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">No deposits recorded yet.</p>
          )}

          {/* Add deposit form */}
          {showAddHst ? (
            <div className="flex items-end gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="space-y-1">
                <label className="text-xs font-medium">Date</label>
                <Input type="date" value={newHstDate} onChange={e => setNewHstDate(e.target.value)} className="w-40" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Amount</label>
                <Input type="number" step="0.01" placeholder="1000" value={newHstAmount} onChange={e => setNewHstAmount(e.target.value)} className="w-32" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Confirmation #</label>
                <Input placeholder="Optional" value={newHstConfirmation} onChange={e => setNewHstConfirmation(e.target.value)} className="w-44" />
              </div>
              <Button size="sm" onClick={addHstDeposit}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddHst(false)}>Cancel</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowAddHst(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add HST Deposit
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ══════ BUSINESS TAX ══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Business Tax</CardTitle>
          <CardDescription>Annual corporate tax — {fiscalYear}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Amount Due */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium w-28">Amount Due:</span>
              {businessTax?.amount_due != null ? (
                <span className="font-mono font-semibold">{fmt(businessTax.amount_due)}</span>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter when bill received"
                    value={taxAmountInput}
                    onChange={e => setTaxAmountInput(e.target.value)}
                    className="w-48"
                  />
                  <Button size="sm" onClick={updateAmountDue}>Save</Button>
                </div>
              )}
            </div>

            {/* Amount Paid */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium w-28">Amount Paid:</span>
              <span className="font-mono">{fmt(Number(businessTax?.amount_paid || 0))}</span>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium w-28">Status:</span>
              <span className={
                businessTax?.is_paid
                  ? 'text-green-600 font-semibold'
                  : businessTax?.amount_due != null
                    ? 'text-amber-600 font-semibold'
                    : 'text-muted-foreground'
              }>
                {taxStatus}
              </span>
            </div>

            {/* Mark as Paid */}
            {businessTax && businessTax.amount_due != null && !businessTax.is_paid && (
              <Button size="sm" onClick={markTaxPaid}>Mark as Paid</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Payroll Table Sub-component ─────────────────────────────────
function PayrollTable({
  payroll,
  fiscalYear,
  selectedFiscalYear,
  togglePaid,
  fmt,
  fmtDate,
}: {
  payroll: PayrollRow[]
  fiscalYear: string
  selectedFiscalYear: string
  togglePaid: (id: string, current: boolean) => void
  fmt: (n: number) => string
  fmtDate: (d: string) => string
}) {
  if (fiscalYear !== selectedFiscalYear) return null
  if (payroll.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No payroll records for this fiscal year.</p>
  }
  return (
    <div className="rounded-md border mt-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 text-center">#</TableHead>
            <TableHead>Month</TableHead>
            <TableHead>Gross Payroll</TableHead>
            <TableHead>Remittance</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Paid Date</TableHead>
            <TableHead className="w-10 text-center">✓</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payroll.map((row, i) => (
            <TableRow key={row.id} className={row.is_paid ? 'bg-green-50/50' : ''}>
              <TableCell className="w-8 text-center text-gray-500 text-sm">{i + 1}</TableCell>
              <TableCell className="font-medium">{row.month_label}</TableCell>
              <TableCell className="font-mono">{fmt(Number(row.gross_payroll))}</TableCell>
              <TableCell className="font-mono">{fmt(Number(row.remittance_amount))}</TableCell>
              <TableCell>{row.due_date ? fmtDate(row.due_date) : '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.paid_date ? fmtDate(row.paid_date) : ''}</TableCell>
              <TableCell className="w-10 text-center">
                <Checkbox
                  checked={row.is_paid}
                  onCheckedChange={() => togglePaid(row.id, row.is_paid)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
