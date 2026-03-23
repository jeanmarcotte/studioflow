'use client';

import { T, card, sectionLabel, fieldLabel, pillBase, badge, fmt } from './designTokens';

/* ── sub-components ─────────────────────────────────────── */

interface CardProps {
  label: string;
  amount: number;
  bg?: string;
  labelColor?: string;
  amountColor?: string;
  borderColor?: string;
}

function MetricCard({ label, amount, bg = T.cardBg, labelColor, amountColor = T.text, borderColor = T.border }: CardProps) {
  return (
    <div style={{
      flex: '1 1 0', minWidth: '130px',
      padding: '1rem 1.25rem', borderRadius: '10px',
      border: `1px solid ${borderColor}`, background: bg,
    }}>
      <div style={{ ...fieldLabel, color: labelColor, marginBottom: '0.375rem' }}>{label}</div>
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
    <div style={card}>
      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={sectionLabel}>Financial Summary</div>
        {isPaid ? (
          <span style={{
            ...pillBase,
            backgroundColor: badge.success.bg, color: badge.success.fg,
            border: `1px solid ${badge.success.bd}`,
          }}>
            Paid in Full
          </span>
        ) : (
          <span style={{
            ...pillBase,
            backgroundColor: badge.warning.bg, color: badge.warning.fg,
            border: `1px solid ${badge.warning.bd}`,
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
          bg={T.successBg}
          borderColor={T.successBorder}
          labelColor={T.successText}
          amountColor={T.successText}
        />
        <MetricCard
          label="Balance"
          amount={balance}
          bg={isPaid ? T.successBg : T.warningBg}
          borderColor={isPaid ? T.successBorder : T.warningBorder}
          labelColor={isPaid ? T.successText : T.warningText}
          amountColor={isPaid ? T.successText : T.warningText}
        />
      </div>
    </div>
  );
}
