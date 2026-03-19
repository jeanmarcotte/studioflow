'use client';

import { format, parseISO } from 'date-fns';

export interface Payment {
  id: string;
  payment_date: string;
  amount: string;
  from_name: string;
  method: string;
}

export interface Installment {
  id: string;
  installment_number: number;
  due_description: string;
  amount: string;
  due_date: string | null;
}

export interface ExtrasOrder {
  id: string;
  order_date: string;
  order_type: string;
  items: Record<string, string>;
  total: string;
  status: string;
  notes: string | null;
}

export interface FinancialLedgerProps {
  contractTotal: number;
  extrasTotal: number;
  totalPaid: number;
  balance: number;
  payments: Payment[];
  installments: Installment[];
  extrasOrders: ExtrasOrder[];
  contractSignedDate: string | null;
}

export function FinancialLedger({
  contractTotal,
  extrasTotal,
  totalPaid,
  balance,
  payments,
  installments,
  extrasOrders,
  contractSignedDate,
}: FinancialLedgerProps) {
  const grandTotal = contractTotal + extrasTotal;
  const isPaid = balance <= 0.05;

  // Separate extras by type
  const framesAlbums = extrasOrders.find(e => e.order_type === 'frames_albums');
  const postWedding = extrasOrders.find(e => e.order_type === 'post_wedding_extras');
  const framesTotal = framesAlbums ? parseFloat(framesAlbums.total) : 0;
  const postTotal = postWedding ? parseFloat(postWedding.total) : 0;

  // Sort payments by date and calculate running totals
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
  );

  let runningTotal = 0;
  const paymentsWithRunning = sortedPayments.map(p => {
    runningTotal += parseFloat(p.amount);
    return { ...p, runningTotal };
  });

  // Group payments by payer
  const payerTotals: Record<string, { count: number; total: number }> = {};
  payments.forEach(p => {
    const name = p.from_name || 'Unknown';
    if (!payerTotals[name]) {
      payerTotals[name] = { count: 0, total: 0 };
    }
    payerTotals[name].count++;
    payerTotals[name].total += parseFloat(p.amount);
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="text-sm font-bold">💰 Financial Ledger</h3>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${
          isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {isPaid ? 'PAID IN FULL' : `${balance.toLocaleString()} OWING`}
        </span>
      </div>

      <div className="p-5">
        {/* Part 1: Summary Cards */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <div className="text-xs font-semibold text-slate-500 uppercase">Contract</div>
            <div className="text-lg font-bold font-mono mt-1">${contractTotal.toLocaleString()}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <div className="text-xs font-semibold text-slate-500 uppercase">Extras Sale</div>
            <div className="text-lg font-bold font-mono mt-1">${framesTotal.toLocaleString()}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <div className="text-xs font-semibold text-slate-500 uppercase">Post-Wedding</div>
            <div className="text-lg font-bold font-mono mt-1">${postTotal.toLocaleString()}</div>
          </div>
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center">
            <div className="text-xs font-semibold text-teal-600 uppercase">Grand Total</div>
            <div className="text-lg font-bold font-mono mt-1 text-teal-700">${grandTotal.toLocaleString()}</div>
          </div>
          <div className={`rounded-lg p-4 text-center ${isPaid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className={`text-xs font-semibold uppercase ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
              {isPaid ? 'Total Paid' : 'Balance'}
            </div>
            <div className={`text-lg font-bold font-mono mt-1 ${isPaid ? 'text-green-700' : 'text-red-700'}`}>
              ${isPaid ? totalPaid.toLocaleString() : balance.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Part 2: Charges Table */}
        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Part 1: Charges</h4>
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase w-24">Date</th>
              <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Description</th>
              <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-3 font-mono text-slate-600">
                {contractSignedDate ? format(parseISO(contractSignedDate), 'MMM d, yyyy') : '—'}
              </td>
              <td className="py-3">
                <span className="font-semibold">Wedding Contract</span>
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">CONTRACT</span>
              </td>
              <td className="py-3 text-right font-mono">${contractTotal.toLocaleString()}</td>
            </tr>
            {framesAlbums && (
              <tr className="border-b border-slate-100">
                <td className="py-3 font-mono text-slate-600">
                  {format(parseISO(framesAlbums.order_date), 'MMM d, yyyy')}
                </td>
                <td className="py-3">
                  <span className="font-semibold">Extras Sale — Frames & Albums</span>
                  <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">EXTRAS</span>
                </td>
                <td className="py-3 text-right font-mono">${framesTotal.toLocaleString()}</td>
              </tr>
            )}
            {postWedding && (
              <tr className="border-b border-slate-100">
                <td className="py-3 font-mono text-slate-600">
                  {format(parseISO(postWedding.order_date), 'MMM d, yyyy')}
                </td>
                <td className="py-3">
                  <span className="font-semibold">Post-Wedding Extras</span>
                  <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">POST</span>
                </td>
                <td className="py-3 text-right font-mono">${postTotal.toLocaleString()}</td>
              </tr>
            )}
            <tr className="bg-slate-900 text-white">
              <td className="py-3 pl-3 rounded-l-lg"></td>
              <td className="py-3 font-semibold">TOTAL CHARGES</td>
              <td className="py-3 text-right font-mono font-bold pr-3 rounded-r-lg">${grandTotal.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        {/* Part 3: Payment History */}
        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
          Part 2: Payment History ({payments.length} payments)
        </h4>
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase w-24">Date</th>
              <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase w-32">From</th>
              <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Method</th>
              <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase w-24">Amount</th>
              <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase w-28">Running</th>
            </tr>
          </thead>
          <tbody>
            {paymentsWithRunning.map((payment) => (
              <tr key={payment.id} className="border-b border-slate-100">
                <td className="py-2 font-mono text-slate-600">
                  {format(parseISO(payment.payment_date), 'MMM d, yyyy')}
                </td>
                <td className="py-2 truncate max-w-[120px]" title={payment.from_name}>
                  {payment.from_name?.split(' ')[0] || 'Unknown'}
                </td>
                <td className="py-2 text-slate-500 capitalize">{payment.method}</td>
                <td className="py-2 text-right font-mono text-green-600">
                  ${parseFloat(payment.amount).toLocaleString()}
                </td>
                <td className="py-2 text-right font-mono">
                  ${payment.runningTotal.toLocaleString()}
                </td>
              </tr>
            ))}
            {payments.length > 0 && (
              <tr className="bg-slate-900 text-white">
                <td className="py-3 pl-3 rounded-l-lg"></td>
                <td className="py-3"></td>
                <td className="py-3 font-semibold">TOTAL PAID</td>
                <td className="py-3 text-right font-mono font-bold">${totalPaid.toLocaleString()}</td>
                <td className="py-3 pr-3 rounded-r-lg"></td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Part 4: By Payer */}
        {Object.keys(payerTotals).length > 0 && (
          <>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Part 3: Payments by Payer</h4>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.entries(payerTotals).map(([name, data]) => (
                <div key={name} className="bg-slate-50 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{name}</div>
                    <div className="text-xs text-slate-500">
                      {data.count} payment{data.count !== 1 ? 's' : ''} · {Math.round((data.total / totalPaid) * 100)}%
                    </div>
                  </div>
                  <div className="font-mono text-lg font-bold text-green-600">
                    ${data.total.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Reconciliation */}
        <div className={`p-4 rounded-lg text-center font-semibold ${
          isPaid ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        }`}>
          {isPaid
            ? `✓ Account PAID IN FULL${balance > 0 ? ` — ${balance.toFixed(2)} rounding waived` : ''}`
            : `⚠️ BALANCE OWING: ${balance.toLocaleString()}`
          }
        </div>
      </div>
    </div>
  );
}
