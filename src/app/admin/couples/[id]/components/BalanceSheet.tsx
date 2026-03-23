'use client';

import { format } from 'date-fns';
import { T, card, sectionLabel, fieldLabel, pillBase, badge, fmt } from './designTokens';

/* ── sub-components ─────────────────────────────────────── */

function MethodBadge({ method }: { method: string | null }) {
  const label = method || 'Unknown';
  return (
    <span style={{ ...pillBase, backgroundColor: badge.default.bg, color: badge.default.fg, border: `1px solid ${badge.default.bd}` }}>
      {label}
    </span>
  );
}

const thStyle: React.CSSProperties = {
  ...fieldLabel,
  padding: '0.625rem 0.75rem',
  borderBottom: `1px solid ${T.border}`,
};

/* ── main component ─────────────────────────────────────── */

export interface BalanceSheetProps {
  payments: any[];
  contractInstallments: any[];
  contractTotal: number;
  framesTotal: number;
  extrasTotal: number;
}

export function BalanceSheet({ payments, contractInstallments, contractTotal, framesTotal, extrasTotal }: BalanceSheetProps) {
  const grandTotal = contractTotal + framesTotal + extrasTotal;
  const totalPaid = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0);
  const balance = grandTotal - totalPaid;
  const isPaid = balance <= 0.05;

  // Build running balance rows
  let running = grandTotal;
  const paymentRows = payments.map((p: any) => {
    const amt = parseFloat(p.amount || '0');
    running -= amt;
    return { ...p, parsedAmount: amt, runningBalance: running };
  });

  // Find unpaid installments using cumulative logic
  const unpaidInstallments = contractInstallments.filter((inst: any) => {
    const cumulative = contractInstallments
      .filter((i: any) => i.installment_number <= inst.installment_number)
      .reduce((sum: number, i: any) => sum + parseFloat(i.amount || '0'), 0);
    return totalPaid < cumulative - 0.05;
  });

  if (!payments.length && !unpaidInstallments.length) {
    return (
      <div style={{ ...card, marginTop: '0.5rem' }}>
        <div style={{ ...sectionLabel, marginBottom: '1rem' }}>
          Balance Sheet
        </div>
        <div style={{ fontSize: '0.875rem', color: T.textMuted, fontStyle: 'italic' }}>
          No payment history
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...card, overflow: 'hidden', marginTop: '0.5rem' }}>
      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={sectionLabel}>
          Balance Sheet
        </div>
        <div style={{ fontSize: '0.8125rem', color: T.textSecondary, marginTop: '0.5rem' }}>
          All payments and outstanding installments
        </div>
      </div>

      {/* ── Payments table ────────────────────────────────── */}
      {payments.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left' }}>Date</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Description</th>
              <th style={{ ...thStyle, width: '7rem', textAlign: 'right' }}>Amount</th>
              <th style={{ ...thStyle, width: '6rem', textAlign: 'center' }}>Method</th>
              <th style={{ ...thStyle, width: '7.5rem', textAlign: 'right' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {paymentRows.map((p: any, idx: number) => {
              const rowBg = idx % 2 === 1 ? T.rowAlt : 'transparent';
              const d = p.payment_date ? new Date(p.payment_date + 'T12:00:00') : null;
              return (
                <tr key={p.id || idx}>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: T.textSecondary, background: rowBg }}>
                    {d ? format(d, 'MMM d, yyyy') : '—'}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: T.text, background: rowBg }}>
                    {p.description || 'Payment'}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: T.successText, fontWeight: 500, textAlign: 'right', fontVariantNumeric: 'tabular-nums', background: rowBg }}>
                    {fmt.format(p.parsedAmount)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', background: rowBg }}>
                    <MethodBadge method={p.payment_method} />
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: T.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums', background: rowBg }}>
                    {fmt.format(p.runningBalance)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ── Upcoming installments ─────────────────────────── */}
      {!isPaid && unpaidInstallments.length > 0 && (
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: '1rem', marginBottom: '1rem' }}>
          <div style={{ ...fieldLabel, marginBottom: '0.75rem' }}>Upcoming Installments</div>
          {unpaidInstallments.map((inst: any) => {
            const d = inst.due_date ? new Date(inst.due_date + 'T12:00:00') : null;
            return (
              <div key={inst.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: T.textSecondary, opacity: 0.75,
              }}>
                <span>{d ? format(d, 'MMM d, yyyy') : '—'}</span>
                <span style={{ flex: 1, marginLeft: '1rem' }}>{inst.due_description || `Installment ${inst.installment_number}`}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{fmt.format(parseFloat(inst.amount || '0'))}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Summary footer ────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: `1px solid ${T.border}`, paddingTop: '1rem' }}>
        <div style={{
          flex: '1 1 0', minWidth: '130px', padding: '1rem 1.25rem', borderRadius: '10px',
          border: `1px solid ${T.successBorder}`, background: T.successBg,
        }}>
          <div style={{ ...fieldLabel, color: T.successText, marginBottom: '0.375rem' }}>Total Paid</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: T.successText, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {fmt.format(totalPaid)}
          </div>
        </div>
        <div style={{
          flex: '1 1 0', minWidth: '130px', padding: '1rem 1.25rem', borderRadius: '10px',
          border: `1px solid ${isPaid ? T.successBorder : T.warningBorder}`,
          background: isPaid ? T.successBg : T.warningBg,
        }}>
          <div style={{ ...fieldLabel, color: isPaid ? T.successText : T.warningText, marginBottom: '0.375rem' }}>
            {isPaid ? 'Paid in Full' : 'Balance Due'}
          </div>
          <div style={{
            fontSize: '1.25rem', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
            color: isPaid ? T.successText : T.warningText,
          }}>
            {isPaid ? fmt.format(0) : fmt.format(balance)}
          </div>
        </div>
      </div>
    </div>
  );
}
