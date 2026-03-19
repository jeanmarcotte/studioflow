'use client';

export interface FooterSummaryProps {
  contractTotal: number;
  extrasTotal: number;
  grandTotal: number;
  totalPaid: number;
  balance: number;
}

export function FooterSummary({
  contractTotal,
  extrasTotal,
  grandTotal,
  totalPaid,
  balance,
}: FooterSummaryProps) {
  const isPaid = balance <= 0.05;

  return (
    <div className="bg-slate-900 text-white rounded-xl p-4 mt-4 flex justify-between items-center flex-wrap gap-4">
      <div className="flex items-center gap-2">
        <span className="text-slate-400">📄 Contract:</span>
        <span className="font-mono font-semibold">${contractTotal.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-400">🛒 Extras:</span>
        <span className="font-mono font-semibold">${extrasTotal.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-400">💰 Total:</span>
        <span className="font-mono font-semibold">${grandTotal.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-green-400">✅ Paid:</span>
        <span className="font-mono font-semibold text-green-400">${totalPaid.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={isPaid ? 'text-green-400' : 'text-red-400'}>
          {isPaid ? '✓' : '⚠️'} Balance:
        </span>
        <span className={`font-mono font-semibold ${isPaid ? 'text-green-400' : 'text-red-400'}`}>
          ${balance.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
