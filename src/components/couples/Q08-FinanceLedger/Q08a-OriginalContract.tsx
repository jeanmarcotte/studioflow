/**
 * Q08a — Original Contract (C1)
 *
 * @spec docs/QUADRANT-MAP-COUPLES.md
 * @status LOCKED
 * @updated 2026-04-01
 *
 * Data Sources:
 * - contracts table
 * - contract_installments table
 * - payments table
 *
 * Critical Rules:
 * - C1 payment matching STOPS at C2 signing date
 * - Payment matching: date-based (±5 days) first, then sequential
 *
 * Guards:
 * - Null check on due_date for overdue calculation
 */

'use client';

import { T, Installment, Payment, n, fmtDate, fmt, matchPayments, StatusPill, thStyle, tdStyle } from './shared';
import { sectionLabel } from '../designTokens';

export function Q08aOriginalContract({ installments, payments, contractTotal, c2OrderDate }: {
  installments: Installment[]; payments: Payment[]; contractTotal: number; c2OrderDate: string | null;
}) {
  const today = new Date();

  // C1 payments: only those made BEFORE the C2 signing date (LESSON-016)
  const c1Payments = c2OrderDate
    ? payments.filter(p => p.payment_date < c2OrderDate)
    : payments;
  const matched = matchPayments(
    installments.map(inst => ({ due_date: inst.due_date, amount: n(inst.amount) })),
    c1Payments
  );

  const paidTotal = matched.reduce((sum, p) => sum + (p ? n(p.amount) : 0), 0);
  const c1Balance = contractTotal - paidTotal;

  const overdueItems: string[] = [];

  const rows = installments.map((inst, i) => {
    const payment = matched[i];
    const isPaid = !!payment;
    let status: 'paid' | 'overdue' | 'upcoming' | 'pending' = 'pending';

    if (isPaid) {
      status = 'paid';
    } else if (inst.due_date) {
      const due = new Date(inst.due_date + 'T12:00:00');
      if (due <= today) {
        status = 'overdue';
        overdueItems.push(`${inst.due_description} was due ${fmtDate(inst.due_date)}`);
      } else {
        status = 'upcoming';
      }
    }

    return { ...inst, payment, status, isPaid };
  });

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ ...sectionLabel, marginBottom: '0.75rem' }}>Original Contract (C1)</div>

      {overdueItems.length > 0 && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
          padding: '0.75rem 1rem', marginBottom: '0.75rem', fontSize: '0.875rem', color: '#dc2626', fontWeight: 600,
        }}>
          {'\u26A0'} PAYMENT OVERDUE — {overdueItems[0]}. Payment required before next service is delivered.
        </div>
      )}

      <div style={{ borderRadius: '10px', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.tableHeaderBg }}>
              <th style={{ ...thStyle, textAlign: 'center' as const, width: '40px' }}>#</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Due Date</th>
              <th style={{ ...thStyle, textAlign: 'center' as const }}>Status</th>
              <th style={{ ...thStyle, textAlign: 'right' as const }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isOverdue = row.status === 'overdue';
              const rowBg = isOverdue ? '#fef2f2' : undefined;
              const textDecor = row.isPaid ? 'line-through' : undefined;
              const textColor = row.isPaid ? T.textMuted : isOverdue ? '#dc2626' : T.text;

              return (
                <tr key={row.id} style={{ background: rowBg }}>
                  <td style={{ ...tdStyle, textAlign: 'center' as const, color: textColor, textDecoration: textDecor }}>
                    {row.installment_number}
                  </td>
                  <td style={{ ...tdStyle, color: textColor, textDecoration: textDecor }}>
                    {row.due_description}
                  </td>
                  <td style={{ ...tdStyle, color: textColor, textDecoration: textDecor }}>
                    {fmtDate(row.due_date)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' as const }}>
                    <StatusPill status={row.status} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums', color: textColor, textDecoration: textDecor }}>
                    {fmt.format(n(row.amount))}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: T.tableHeaderBg }}>
              <td colSpan={3} style={{ ...tdStyle, fontWeight: 600, borderBottom: 'none' }}>Contract Total</td>
              <td style={{ ...tdStyle, textAlign: 'center' as const, fontWeight: 600, borderBottom: 'none', color: '#3d7344' }}>
                {fmt.format(paidTotal)} paid
              </td>
              <td style={{ ...tdStyle, textAlign: 'right' as const, fontWeight: 700, borderBottom: 'none', fontVariantNumeric: 'tabular-nums' }}>
                {fmt.format(c1Balance)} remaining
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
