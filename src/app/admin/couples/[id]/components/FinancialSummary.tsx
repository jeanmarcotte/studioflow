'use client';

/* ── design tokens (match ClientCard) ───────────────────── */

const T = {
  text: '#1e293b',
  muted: '#94a3b8',
  border: '#e2e8f0',
} as const;

const fmt = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

/* ── sub-components ─────────────────────────────────────── */

interface CardProps {
  label: string;
  amount: number;
  bg?: string;
  labelColor?: string;
  amountColor?: string;
  borderColor?: string;
}

function MetricCard({ label, amount, bg = '#fff', labelColor = T.muted, amountColor = T.text, borderColor = T.border }: CardProps) {
  return (
    <div style={{
      flex: '1 1 0', minWidth: '130px',
      padding: '1rem 1.25rem', borderRadius: '10px',
      border: `1px solid ${borderColor}`, background: bg,
    }}>
      <div style={{
        fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.03em',
        textTransform: 'uppercase', color: labelColor, marginBottom: '0.375rem',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '1.125rem', fontWeight: 600, color: amountColor,
        textAlign: 'right', fontVariantNumeric: 'tabular-nums',
      }}>
        {fmt.format(amount)}
      </div>
    </div>
  );
}

/* ── main component ─────────────────────────────────────── */

export interface FinancialSummaryProps {
  contractTotal: number;
  framesTotal: number;
  extrasTotal: number;
  totalPaid: number;
}

export function FinancialSummary({ contractTotal, framesTotal, extrasTotal, totalPaid }: FinancialSummaryProps) {
  const grandTotal = contractTotal + framesTotal + extrasTotal;
  const balance = grandTotal - totalPaid;
  const isPaid = balance <= 0.05;

  return (
    <div style={{
      background: '#fff', border: `1px solid ${T.border}`, borderRadius: '16px',
      padding: '1.5rem 1.75rem', marginBottom: '1.25rem',
    }}>
      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{
          fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: T.muted,
        }}>
          Financial Summary
        </div>
        {isPaid ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '0.1875rem 0.625rem',
            borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 500,
            backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
          }}>
            Paid in Full
          </span>
        ) : (
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '0.1875rem 0.625rem',
            borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 500,
            backgroundColor: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa',
          }}>
            {fmt.format(balance)} owing
          </span>
        )}
      </div>

      {/* ── Metric cards ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <MetricCard label="Contract" amount={contractTotal} />
        <MetricCard label="Frames & Albums" amount={framesTotal} />
        <MetricCard label="Extras" amount={extrasTotal} />
        <MetricCard
          label="Grand Total"
          amount={grandTotal}
          bg="#f0fdf4"
          borderColor="#bbf7d0"
          labelColor="#166534"
          amountColor="#166534"
        />
        <MetricCard
          label="Balance"
          amount={balance}
          bg={isPaid ? '#f0fdf4' : '#fff7ed'}
          borderColor={isPaid ? '#bbf7d0' : '#fed7aa'}
          labelColor={isPaid ? '#166534' : '#9a3412'}
          amountColor={isPaid ? '#166534' : '#9a3412'}
        />
      </div>
    </div>
  );
}
