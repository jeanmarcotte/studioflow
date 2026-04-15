'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Payment {
  id: string;
  payment_date: string;
  amount: string | number;
  from_name?: string | null;
  phase?: string | null;
  method?: string | null;
  notes?: string | null;
}

interface Installment {
  id: string;
  installment_number: number;
  due_description: string;
  due_date: string | null;
  amount: string | number;
}

interface FinanceSectionProps {
  couple: any;
  payments: Payment[];
  installments: Installment[];
}

const n = (v: string | number | null | undefined): number => parseFloat(String(v || '0')) || 0;

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
}

export function FinanceSection({ couple, payments, installments }: FinanceSectionProps) {
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [installmentsOpen, setInstallmentsOpen] = useState(false);

  // C1 liability
  const c1Liability = n(couple.c1_amount) || n(couple.contract_total);

  // C2 liability
  const c2Liability = n(couple.c2_amount);

  // C3 liability
  const c3Liability = n(couple.c3_amount) || n(couple.extras_total);

  // Payments by phase
  const c1Paid = payments.filter(p => p.phase === 'C1').reduce((sum, p) => sum + n(p.amount), 0);
  const c2Paid = payments.filter(p => p.phase === 'C2').reduce((sum, p) => sum + n(p.amount), 0);
  const c3Paid = payments.filter(p => p.phase === 'C3').reduce((sum, p) => sum + n(p.amount), 0);

  // If no phase assigned, default to C1
  const unassignedPaid = payments.filter(p => !p.phase).reduce((sum, p) => sum + n(p.amount), 0);
  const totalC1Paid = c1Paid + unassignedPaid;

  // Balances
  const c1Balance = c1Liability - totalC1Paid;
  const c2Balance = c2Liability - c2Paid;
  const c3Balance = c3Liability - c3Paid;

  // Project totals
  const projectLiability = c1Liability + c2Liability + c3Liability;
  const projectPaid = totalC1Paid + c2Paid + c3Paid;
  const projectBalance = projectLiability - projectPaid;

  // Sorted payments for dialog (DESC)
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );

  // Sorted installments for dialog (ASC)
  const sortedInstallments = [...installments].sort(
    (a, b) => a.installment_number - b.installment_number
  );

  // Determine if installment is paid by matching against payments
  const paidInstallmentCount = payments.filter(p => !p.phase || p.phase === 'C1').length;

  const balanceColor = (balance: number) =>
    balance <= 0 ? 'text-green-600' : 'text-red-600';

  const rows = [
    { label: 'C1 Contract', liability: c1Liability, paid: totalC1Paid, balance: c1Balance },
    { label: 'C2 Album', liability: c2Liability, paid: c2Paid, balance: c2Balance },
    { label: 'C3 Extras', liability: c3Liability, paid: c3Paid, balance: c3Balance },
  ];

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Finance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]"></TableHead>
              <TableHead className="text-right">Liability</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(row.liability)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(row.paid)}</TableCell>
                <TableCell className={`text-right tabular-nums font-medium ${balanceColor(row.balance)}`}>
                  {fmt(row.balance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="font-semibold">
              <TableCell>PROJECT</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(projectLiability)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(projectPaid)}</TableCell>
              <TableCell className={`text-right tabular-nums ${balanceColor(projectBalance)}`}>
                {fmt(projectBalance)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>

        <div className="flex gap-2 mt-4">
          {/* View Payments Dialog */}
          <Dialog open={paymentsOpen} onOpenChange={setPaymentsOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              View Payments
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Payments ({payments.length})</DialogTitle>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{fmtDate(p.payment_date)}</TableCell>
                      <TableCell>{p.from_name || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(n(p.amount))}</TableCell>
                      <TableCell>
                        {p.phase ? (
                          <Badge variant="secondary">{p.phase}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.method || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {sortedPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        No payments recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DialogContent>
          </Dialog>

          {/* View Installments Dialog */}
          <Dialog open={installmentsOpen} onOpenChange={setInstallmentsOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              View Installments
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Installments ({installments.length})</DialogTitle>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInstallments.map((inst, idx) => {
                    const isPaid = idx < paidInstallmentCount;
                    return (
                      <TableRow key={inst.id}>
                        <TableCell>{inst.installment_number}</TableCell>
                        <TableCell>{inst.due_description}</TableCell>
                        <TableCell>{fmtDate(inst.due_date)}</TableCell>
                        <TableCell>
                          {isPaid ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">PAID</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">PENDING</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(n(inst.amount))}</TableCell>
                      </TableRow>
                    );
                  })}
                  {sortedInstallments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        No installments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
