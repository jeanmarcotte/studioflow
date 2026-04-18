import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface FinanceLine {
  label: string
  invoiced: number
  received: number
  balance: number
}

interface FinanceCardProps {
  lines: FinanceLine[]
  totalInvoiced: number
  totalReceived: number
  balanceDue: number
  coupleId: string
}

export function FinanceCard({ lines, totalInvoiced, totalReceived, balanceDue, coupleId }: FinanceCardProps) {
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
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Link href={`/admin/finance/payments?couple=${coupleId}`} className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            View payments
          </Link>
          <Link href={`/admin/finance/installments?couple=${coupleId}`} className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            View installments
          </Link>
          <Link href={`/admin/finance/reconcile?couple=${coupleId}`} className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 ml-auto">
            Reconcile ↗
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
