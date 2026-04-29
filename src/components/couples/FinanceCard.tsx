'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/coupleFormatters'

function fmtSigned(n: number): string {
  if (n < 0) return `-${formatCurrency(Math.abs(n))}`
  return formatCurrency(n)
}

interface FinanceLine {
  label: string
  invoiced: number
  received: number
  balance: number
}

interface Payment {
  id: string
  payment_date: string
  amount: number
  method: string
  from_name: string
  payment_type: string
  label: string
}

interface Installment {
  id: string
  installment_number: number
  due_description: string
  amount: number
  due_date: string
  paid?: boolean
}

interface FinanceCardProps {
  lines: FinanceLine[]
  totalInvoiced: number
  totalReceived: number
  balanceDue: number
  coupleId: string
  payments: Payment[]
  contractInstallments: Installment[]
  extrasInstallments: Installment[]
  hasExtrasOrder: boolean
  contractId?: string | null
  hasClientExtras?: boolean
}

export function FinanceCard({
  lines,
  totalInvoiced,
  totalReceived,
  balanceDue,
  coupleId,
  payments,
  contractInstallments,
  extrasInstallments,
  hasExtrasOrder,
  contractId,
  hasClientExtras
}: FinanceCardProps) {
  const [paymentsOpen, setPaymentsOpen] = useState(false)
  const [contractInstallmentsOpen, setContractInstallmentsOpen] = useState(false)
  const [extrasInstallmentsOpen, setExtrasInstallmentsOpen] = useState(false)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Finance</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table Header */}
        <div className="hidden md:grid grid-cols-4 text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b">
          <div></div>
          <div className="text-right">Invoiced</div>
          <div className="text-right">Received</div>
          <div className="text-right">Balance</div>
        </div>

        {/* Desktop Lines */}
        {lines.map((line) => {
          const linkHref =
            line.label === 'C1 Contract' && contractId ? `/admin/contracts/${contractId}/view` :
            line.label === 'C2 Frames & Albums' && hasExtrasOrder ? `/admin/albums/${coupleId}/view` :
            line.label === 'C3 Extras' && hasClientExtras ? `/admin/extras/${coupleId}/view` :
            null

          return (
          <div key={line.label} className="hidden md:grid grid-cols-4 py-3 text-sm border-b">
            <div>
              {linkHref ? (
                <Link href={linkHref} className="text-blue-600 hover:underline">{line.label}</Link>
              ) : (
                <span className="text-gray-900">{line.label}</span>
              )}
            </div>
            <div className="text-right text-gray-900 tabular-nums">{formatCurrency(line.invoiced)}</div>
            <div className="text-right text-gray-900 tabular-nums">{formatCurrency(line.received)}</div>
            <div className={`text-right font-medium tabular-nums ${line.balance > 0 ? 'text-red-600' : line.balance < 0 ? 'text-teal-600' : 'text-gray-500'}`}>
              {fmtSigned(line.balance)}
            </div>
          </div>
          )
        })}

        {/* Mobile Lines — stacked cards */}
        <div className="md:hidden space-y-3 py-2">
          {lines.map((line) => {
            const linkHref =
              line.label === 'C1 Contract' && contractId ? `/admin/contracts/${contractId}/view` :
              line.label === 'C2 Frames & Albums' && hasExtrasOrder ? `/admin/albums/${coupleId}/view` :
              line.label === 'C3 Extras' && hasClientExtras ? `/admin/extras/${coupleId}/view` :
              null

            return (
            <div key={line.label} className="border-b pb-3">
              <div className="font-medium text-sm mb-2">
                {linkHref ? (
                  <Link href={linkHref} className="text-blue-600 hover:underline">{line.label}</Link>
                ) : (
                  <span className="text-gray-900">{line.label}</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-500 uppercase block">Invoiced</span>
                  <span className="text-gray-900 text-sm tabular-nums">{formatCurrency(line.invoiced)}</span>
                </div>
                <div>
                  <span className="text-gray-500 uppercase block">Received</span>
                  <span className="text-gray-900 text-sm tabular-nums">{formatCurrency(line.received)}</span>
                </div>
                <div>
                  <span className="text-gray-500 uppercase block">Balance</span>
                  <span className={`text-sm font-medium tabular-nums ${line.balance > 0 ? 'text-red-600' : line.balance < 0 ? 'text-teal-600' : 'text-gray-500'}`}>
                    {fmtSigned(line.balance)}
                  </span>
                </div>
              </div>
            </div>
            )
          })}
        </div>

        {/* Totals */}
        <div className="pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total invoiced</span>
            <span className="text-gray-900 tabular-nums">{formatCurrency(totalInvoiced)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total received</span>
            <span className="text-gray-900 tabular-nums">{formatCurrency(totalReceived)}</span>
          </div>
          <div className="flex justify-between text-base font-medium pt-2 border-t">
            <span className="text-gray-900">Balance due</span>
            <span className="text-gray-900 tabular-nums">{formatCurrency(balanceDue)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t flex-wrap justify-start">
          {/* View Payments Popup */}
          <Dialog open={paymentsOpen} onOpenChange={setPaymentsOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              View payments
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Payment History</DialogTitle>
              </DialogHeader>
              {payments.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No payments recorded</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">From</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Method</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="p-3 text-sm text-gray-900 whitespace-nowrap">
                            {new Date(p.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="p-3 text-sm text-gray-900">{p.from_name || '—'}</td>
                          <td className="p-3 text-sm text-gray-600">{p.method || '—'}</td>
                          <td className="p-3 text-sm">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {p.payment_type || '—'}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-right font-semibold text-gray-900 tabular-nums">{formatCurrency(Number(p.amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-gray-50">
                        <td colSpan={4} className="p-3 text-sm font-semibold text-gray-700">Total Received</td>
                        <td className="p-3 text-right font-bold text-gray-900 tabular-nums">
                          {formatCurrency(payments.reduce((sum, p) => sum + Number(p.amount), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Original Installments (C1) */}
          <Dialog open={contractInstallmentsOpen} onOpenChange={setContractInstallmentsOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              Original Installments
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Original Installments (C1 Contract)</DialogTitle>
              </DialogHeader>
              {contractInstallments.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No installments scheduled</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-center p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">#</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                        <th className="text-center p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {contractInstallments.map((inst) => (
                        <tr key={inst.id} className="hover:bg-gray-50">
                          <td className="p-3 text-sm text-center text-gray-500">{inst.installment_number}</td>
                          <td className="p-3 text-sm text-gray-900">{inst.due_description}</td>
                          <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                            {inst.due_date ? new Date(inst.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                          <td className="p-3 text-sm text-right font-semibold text-gray-900 tabular-nums">{formatCurrency(Number(inst.amount))}</td>
                          <td className="p-3 text-center">
                            {inst.paid ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Paid</span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* C2 Installments */}
          <Dialog open={extrasInstallmentsOpen} onOpenChange={setExtrasInstallmentsOpen}>
            <DialogTrigger render={
              <Button
                variant="outline"
                size="sm"
                disabled={!hasExtrasOrder}
                className={!hasExtrasOrder ? 'opacity-50 cursor-not-allowed' : ''}
              />
            }>
              C2 Installments
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>C2 Installments (Frames & Albums)</DialogTitle>
              </DialogHeader>
              {extrasInstallments.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No C2 installments scheduled</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-center p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">#</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                        <th className="text-center p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {extrasInstallments.map((inst) => (
                        <tr key={inst.id} className="hover:bg-gray-50">
                          <td className="p-3 text-sm text-center text-gray-500">{inst.installment_number}</td>
                          <td className="p-3 text-sm text-gray-900">{inst.due_description}</td>
                          <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                            {inst.due_date ? new Date(inst.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                          <td className="p-3 text-sm text-right font-semibold text-gray-900 tabular-nums">{formatCurrency(Number(inst.amount))}</td>
                          <td className="p-3 text-center">
                            {inst.paid ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Paid</span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Reconcile Link */}
          <a
            href={`/admin/finance/reconciliation?couple=${coupleId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
          >
            Reconcile <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
