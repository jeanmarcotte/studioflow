'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ExternalLink } from 'lucide-react'

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
  source: 'contract' | 'extras'
}

interface FinanceCardProps {
  lines: FinanceLine[]
  totalInvoiced: number
  totalReceived: number
  balanceDue: number
  coupleId: string
  payments: Payment[]
  installments: Installment[]
}

export function FinanceCard({
  lines,
  totalInvoiced,
  totalReceived,
  balanceDue,
  coupleId,
  payments,
  installments
}: FinanceCardProps) {
  const [paymentsOpen, setPaymentsOpen] = useState(false)
  const [installmentsOpen, setInstallmentsOpen] = useState(false)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Finance</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Table Header */}
        <div className="grid grid-cols-4 text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b">
          <div></div>
          <div className="text-right">Invoiced</div>
          <div className="text-right">Received</div>
          <div className="text-right">Balance</div>
        </div>

        {/* Lines */}
        {lines.map((line) => (
          <div key={line.label} className="grid grid-cols-4 py-3 text-sm border-b">
            <div className="text-gray-900">{line.label}</div>
            <div className="text-right text-gray-900">${line.invoiced.toLocaleString()}</div>
            <div className="text-right text-gray-900">${line.received.toLocaleString()}</div>
            <div className={`text-right font-medium ${line.balance > 0 ? 'text-red-600' : line.balance < 0 ? 'text-teal-600' : 'text-gray-500'}`}>
              {line.balance < 0 ? `-$${Math.abs(line.balance).toLocaleString()}` : `$${line.balance.toLocaleString()}`}
            </div>
          </div>
        ))}

        {/* Totals */}
        <div className="pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total invoiced</span>
            <span className="text-gray-900">${totalInvoiced.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total received</span>
            <span className="text-gray-900">${totalReceived.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-base font-medium pt-2 border-t">
            <span className="text-gray-900">Balance due</span>
            <span className="text-gray-900">${balanceDue.toLocaleString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t flex-wrap">
          {/* View Payments Popup */}
          <Dialog open={paymentsOpen} onOpenChange={setPaymentsOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              View payments
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Payments</DialogTitle>
              </DialogHeader>
              {payments.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No payments recorded</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">From</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Method</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2">{new Date(p.payment_date).toLocaleDateString()}</td>
                        <td className="py-2">{p.from_name ?? '—'}</td>
                        <td className="py-2">{p.method ?? '—'}</td>
                        <td className="py-2">{p.payment_type ?? '—'}</td>
                        <td className="py-2 text-right font-medium">${Number(p.amount).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </DialogContent>
          </Dialog>

          {/* View Installments Popup */}
          <Dialog open={installmentsOpen} onOpenChange={setInstallmentsOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              View installments
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Installments</DialogTitle>
              </DialogHeader>
              {installments.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No installments scheduled</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Due Date</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((inst) => (
                      <tr key={inst.id} className="border-b last:border-0">
                        <td className="py-2">{inst.installment_number}</td>
                        <td className="py-2">{inst.due_description}</td>
                        <td className="py-2">{inst.due_date ? new Date(inst.due_date).toLocaleDateString() : '—'}</td>
                        <td className="py-2 capitalize">{inst.source}</td>
                        <td className="py-2 text-right font-medium">${Number(inst.amount).toLocaleString()}</td>
                        <td className="py-2 text-center">
                          {inst.paid ? (
                            <span className="text-green-600">Paid</span>
                          ) : (
                            <span className="text-yellow-600">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </DialogContent>
          </Dialog>

          {/* Reconcile Link - Opens in new tab */}
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
