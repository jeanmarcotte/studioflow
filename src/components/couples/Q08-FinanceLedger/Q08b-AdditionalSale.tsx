/**
 * Q08b — Additional Sale (C2)
 *
 * @spec docs/QUADRANT-MAP-COUPLES.md
 * @status LOCKED
 * @updated 2026-04-01
 *
 * Data Sources:
 * - extras_orders table
 * - payments table
 *
 * Critical Rules:
 * - contract_balance_remaining is SOURCE OF TRUTH for C1 balance at C2 signing
 * - C2 payments: those made on or after C2 signing date
 * - Last installment shown as 2× when last_installment_amount set
 *
 * Guards:
 * - Null check on order_date for payment filtering
 */

'use client';

import {
  T, colors, ExtrasOrder, Payment, n, fmt,
  C2_DESCRIPTIONS, matchPayments, StatusPill, thStyle, tdStyle,
} from './shared';
import { sectionLabel } from '../designTokens';

export function Q08bAdditionalSale({ extrasOrder, payments, c1Total }: {
  extrasOrder: ExtrasOrder; payments: Payment[]; c1Total: number;
}) {
  const today = new Date();
  const saleAmt = n(extrasOrder.extras_sale_amount);
  const balRemaining = n(extrasOrder.contract_balance_remaining);
  const downpayment = n(extrasOrder.downpayment);
  const newBalance = n(extrasOrder.new_balance);
  const numInst = extrasOrder.num_installments || 0;
  const perInst = n(extrasOrder.payment_per_installment);
  const lastInst = n(extrasOrder.last_installment_amount);

  // C2 payments: those made on or after C2 signing date
  const c2Payments = extrasOrder.order_date
    ? payments.filter(p => p.payment_date >= extrasOrder.order_date!)
    : [];

  // Build C2 installment schedule
  const c2Installments: { num: number; desc: string; amount: number; due_date: string | null }[] = [];
  c2Installments.push({ num: 0, desc: 'Downpayment at signing', amount: downpayment, due_date: extrasOrder.order_date });

  for (let i = 0; i < numInst; i++) {
    const isLast = i === numInst - 1;
    c2Installments.push({
      num: i + 1,
      desc: C2_DESCRIPTIONS[i % C2_DESCRIPTIONS.length],
      amount: isLast ? lastInst : perInst,
      due_date: null,
    });
  }

  const c2Matched = matchPayments(
    c2Installments.map(inst => ({ due_date: inst.due_date, amount: inst.amount })),
    c2Payments
  );

  const c1PaidBeforeC2 = c1Total - balRemaining;

  const itemsDesc = extrasOrder.items
    ? Object.values(extrasOrder.items).join(', ')
    : 'Additional purchase';

  const ledgerRow: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0',
    fontSize: '0.875rem', color: T.text,
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ ...sectionLabel, marginBottom: '0.75rem' }}>Additional Sale (C2)</div>

      {/* Mini ledger */}
      <div style={{
        background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '10px',
        padding: '1rem 1.25rem', marginBottom: '0.75rem',
      }}>
        <div style={ledgerRow}>
          <span>C1 total</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt.format(c1Total)}</span>
        </div>
        <div style={ledgerRow}>
          <span>Payments received before C2 signing</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: colors.success[700] }}>({fmt.format(c1PaidBeforeC2)})</span>
        </div>
        <div style={{ ...ledgerRow, borderTop: `1px solid ${T.borderLight}`, paddingTop: '0.5rem' }}>
          <span>C1 balance remaining at signing</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt.format(balRemaining)}</span>
        </div>
        <div style={ledgerRow}>
          <span>New purchase \u2014 {itemsDesc.length > 60 ? itemsDesc.slice(0, 60) + '...' : itemsDesc}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt.format(saleAmt)}</span>
        </div>
        <div style={ledgerRow}>
          <span>Downpayment at signing</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: colors.success[700] }}>({fmt.format(downpayment)})</span>
        </div>
        <div style={{ ...ledgerRow, borderTop: `1px solid ${T.border}`, paddingTop: '0.5rem', fontWeight: 700 }}>
          <span>New combined balance</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt.format(newBalance)}</span>
        </div>
        <div style={{ ...ledgerRow, fontSize: '0.8125rem', color: T.textSecondary }}>
          <span>{numInst} installments x {fmt.format(perInst)} (last installment: {fmt.format(lastInst)})</span>
        </div>
      </div>

      {/* C2 Installment table */}
      <div style={{ borderRadius: '10px', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.cardBgAlt }}>
              <th style={{ ...thStyle, textAlign: 'center' as const, width: '40px' }}>#</th>
              <th style={thStyle}>Description</th>
              <th style={{ ...thStyle, textAlign: 'center' as const }}>Status</th>
              <th style={{ ...thStyle, textAlign: 'right' as const }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {c2Installments.map((inst, i) => {
              const payment = c2Matched[i];
              const isPaid = !!payment;
              let status: 'paid' | 'overdue' | 'upcoming' | 'pending' = 'pending';
              if (isPaid) {
                status = 'paid';
              } else if (inst.due_date) {
                const due = new Date(inst.due_date + 'T12:00:00');
                status = due <= today ? 'overdue' : 'upcoming';
              }

              const textDecor = isPaid ? 'line-through' : undefined;
              const textColor = isPaid ? T.textMuted : T.text;

              return (
                <tr key={i}>
                  <td style={{ ...tdStyle, textAlign: 'center' as const, color: textColor, textDecoration: textDecor }}>
                    {inst.num === 0 ? '\u2014' : inst.num}
                  </td>
                  <td style={{ ...tdStyle, color: textColor, textDecoration: textDecor }}>{inst.desc}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' as const }}>
                    <StatusPill status={status} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums', color: textColor, textDecoration: textDecor }}>
                    {fmt.format(inst.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
