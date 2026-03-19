'use client';

export interface FooterSummaryProps {
  contractTotal: number;
  extrasTotal: number;
  grandTotal: number;
  totalPaid: number;
  balance: number;
}

export function FooterSummary({ contractTotal, extrasTotal, grandTotal, totalPaid, balance }: FooterSummaryProps) {
  return (
    <div className="bg-slate-900 text-white rounded-xl p-4 mt-4 flex justify-between flex-wrap gap-3">
      <span>📄 Contract: ${contractTotal.toLocaleString()}</span>
      <span>🛒 Extras: ${extrasTotal.toLocaleString()}</span>
      <span>💰 Total: ${grandTotal.toLocaleString()}</span>
      <span className="text-green-400">✅ Paid: ${totalPaid.toLocaleString()}</span>
      <span className={balance > 0 ? 'text-red-400' : ''}>
        {balance > 0 ? '⚠️' : '✓'} Balance: ${balance.toLocaleString()}
      </span>
    </div>
  );
}
