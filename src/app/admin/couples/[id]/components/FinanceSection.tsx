'use client';

import { useMemo } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { T, colors, card, sectionLabel, fieldLabel, pillBase, badge, fmt } from './designTokens';

// ── Types ────────────────────────────────────────────────────────────────────

interface Installment {
  id: string;
  installment_number: number;
  due_description: string;
  due_date: string | null;
  amount: string | number;
}

interface Payment {
  id: string;
  payment_date: string;
  amount: string | number;
  notes: string | null;
}

interface ExtrasOrder {
  extras_sale_amount: string | number;
  contract_balance_remaining: string | number | null;
  downpayment: string | number | null;
  new_balance: string | number | null;
  num_installments: number | null;
  payment_per_installment: string | number | null;
  last_installment_amount: string | number | null;
  notes: string | null;
  items: Record<string, string> | null;
  order_date: string | null;
}

interface ClientExtra {
  id: string;
  item_type: string;
  description: string | null;
  quantity: number;
  unit_price: string | number;
  hst: string | number | null;
  total: string | number;
  payment_note: string | null;
  status: string | null;
  invoice_date: string | null;
}

export interface FinanceSectionProps {
  contractTotal: number;
  installments: Installment[];
  payments: Payment[];
  extrasOrder: ExtrasOrder | null;
  clientExtras: ClientExtra[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const n = (v: string | number | null | undefined): number => parseFloat(String(v || '0')) || 0;

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
}

const C2_DESCRIPTIONS = [
  'Pick Up Portraits',
  'January 15th 2026',
  '2 Weeks before wedding',
  'Pick up proof disk/Dropbox',
  'Order Photos',
  'Pick up the final wedding album & prints',
];

// Match payments to installments: date-based first (±5 days), then sequential
function matchPayments(installments: { due_date: string | null; amount: number }[], payments: Payment[]): (Payment | null)[] {
  const available = payments.map(p => ({ ...p, used: false }));
  const result: (Payment | null)[] = new Array(installments.length).fill(null);

  // Pass 1: date-based (±5 days)
  for (let i = 0; i < installments.length; i++) {
    const inst = installments[i];
    if (!inst.due_date) continue;
    const instDate = new Date(inst.due_date + 'T12:00:00');
    let best: number | null = null;
    let bestDiff = Infinity;
    for (let j = 0; j < available.length; j++) {
      if (available[j].used) continue;
      const payDate = new Date(available[j].payment_date + 'T12:00:00');
      const diff = Math.abs(differenceInDays(payDate, instDate));
      if (diff <= 5 && diff < bestDiff) {
        bestDiff = diff;
        best = j;
      }
    }
    if (best !== null) {
      result[i] = available[best];
      available[best].used = true;
    }
  }

  // Pass 2: sequential for remaining
  let nextAvail = 0;
  for (let i = 0; i < installments.length; i++) {
    if (result[i]) continue;
    while (nextAvail < available.length && available[nextAvail].used) nextAvail++;
    if (nextAvail < available.length) {
      result[i] = available[nextAvail];
      available[nextAvail].used = true;
      nextAvail++;
    }
  }

  return result;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status }: { status: 'paid' | 'overdue' | 'upcoming' | 'pending' }) {
  const map = {
    paid: { ...badge.success, label: 'PAID' },
    overdue: { bg: '#fef2f2', fg: '#dc2626', bd: '#fecaca', label: 'OVERDUE' },
    upcoming: { ...badge.default, label: 'UPCOMING' },
    pending: { bg: colors.neutral[100], fg: colors.neutral[500], bd: colors.neutral[200], label: 'PENDING' },
  };
  const c = map[status];
  return (
    <span style={{ ...pillBase, backgroundColor: c.bg, color: c.fg, border: `1px solid ${c.bd}`, fontSize: '0.6875rem', fontWeight: 600 }}>
      {c.label}
    </span>
  );
}

const thStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 600,
  letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.primary[700],
  borderBottom: `2px solid ${T.border}`,
};

const tdStyle: React.CSSProperties = {
  padding: '0.625rem 0.75rem', fontSize: '0.875rem', color: T.text,
  borderBottom: `1px solid ${T.borderLight}`,
};

// ── Q7: Summary Bar ──────────────────────────────────────────────────────────

function SummaryBar({ c1, c2, c3, balance }: { c1: number; c2: number; c3: number; balance: number }) {
  const grand = c1 + c2 + c3;
  const balColor = balance <= 0.05 ? colors.success[700] : balance < 0 ? '#2563eb' : '#dc2626';
  const balBg = balance <= 0.05 ? colors.success[50] : balance < 0 ? '#eff6ff' : '#fef2f2';

  const cells: { label: string; value: number; color?: string; bg?: string }[] = [
    { label: 'C1 Contract', value: c1 },
    { label: 'C2 Frames & Albums', value: c2 },
    { label: 'C3 Extras', value: c3 },
    { label: 'Grand Total', value: grand },
    { label: 'Balance Owing', value: balance, color: balColor, bg: balBg },
  ];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', border: `1px solid ${T.border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '1.25rem' }}>
      {cells.map((cell, i) => (
        <div key={cell.label} style={{
          flex: '1 1 0', minWidth: '120px', padding: '0.875rem 1rem',
          borderRight: i < cells.length - 1 ? `1px solid ${T.border}` : 'none',
          background: cell.bg || T.cardBg,
        }}>
          <div style={{ ...fieldLabel, fontSize: '0.6875rem', marginBottom: '0.25rem' }}>{cell.label}</div>
          <div style={{
            fontSize: '1.125rem', fontWeight: 700, color: cell.color || T.text,
            textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums',
          }}>
            {cell.value !== 0 ? fmt.format(cell.value) : '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Q8a: C1 Installments ─────────────────────────────────────────────────────

function C1Section({ installments, payments, contractTotal, c2OrderDate }: {
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
            <tr style={{ background: T.cardBgAlt }}>
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
            <tr style={{ background: T.cardBgAlt }}>
              <td colSpan={3} style={{ ...tdStyle, fontWeight: 600, borderBottom: 'none' }}>Contract Total</td>
              <td style={{ ...tdStyle, textAlign: 'center' as const, fontWeight: 600, borderBottom: 'none', color: colors.success[700] }}>
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

// ── Q8b: C2 Additional Sale ──────────────────────────────────────────────────

function C2Section({ extrasOrder, payments, c1Total }: {
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

  // Build C2 installment schedule: downpayment + standard descriptions cycling
  const c2Installments: { num: number; desc: string; amount: number; due_date: string | null }[] = [];

  // First: downpayment row
  c2Installments.push({ num: 0, desc: 'Downpayment at signing', amount: downpayment, due_date: extrasOrder.order_date });

  // Then: numInst installments using standard descriptions
  for (let i = 0; i < numInst; i++) {
    const isLast = i === numInst - 1;
    c2Installments.push({
      num: i + 1,
      desc: C2_DESCRIPTIONS[i % C2_DESCRIPTIONS.length],
      amount: isLast ? lastInst : perInst,
      due_date: null, // event-based, no fixed date
    });
  }

  const c2Matched = matchPayments(
    c2Installments.map(inst => ({ due_date: inst.due_date, amount: inst.amount })),
    c2Payments
  );

  // C1 paid before C2 — derived from stored contract_balance_remaining (source of truth)
  const c1PaidBeforeC2 = c1Total - balRemaining;

  // Items description
  const itemsDesc = extrasOrder.items
    ? Object.values(extrasOrder.items).join(', ')
    : 'Additional purchase';

  // Ledger styles
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
          <span>New purchase — {itemsDesc.length > 60 ? itemsDesc.slice(0, 60) + '...' : itemsDesc}</span>
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
                    {inst.num === 0 ? '—' : inst.num}
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

// ── Q8c: C3 Extras ───────────────────────────────────────────────────────────

function C3Section({ clientExtras }: { clientExtras: ClientExtra[] }) {
  const c3Total = clientExtras.reduce((s, e) => s + n(e.total), 0);
  const notes = clientExtras.filter(e => e.payment_note).map(e => e.payment_note!);

  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ ...sectionLabel, marginBottom: '0.75rem' }}>Extras & Add-ons (C3)</div>

      <div style={{ borderRadius: '10px', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.cardBgAlt }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Item Type</th>
              <th style={thStyle}>Description</th>
              <th style={{ ...thStyle, textAlign: 'right' as const }}>Qty</th>
              <th style={{ ...thStyle, textAlign: 'right' as const }}>Unit Price</th>
              <th style={{ ...thStyle, textAlign: 'right' as const }}>HST</th>
              <th style={{ ...thStyle, textAlign: 'right' as const }}>Total</th>
              <th style={{ ...thStyle, textAlign: 'center' as const }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {clientExtras.map(ext => (
              <tr key={ext.id}>
                <td style={tdStyle}>{fmtDate(ext.invoice_date)}</td>
                <td style={tdStyle}>{ext.item_type}</td>
                <td style={tdStyle}>{ext.description || '—'}</td>
                <td style={{ ...tdStyle, textAlign: 'right' as const }}>{ext.quantity}</td>
                <td style={{ ...tdStyle, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' }}>{fmt.format(n(ext.unit_price))}</td>
                <td style={{ ...tdStyle, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' }}>{fmt.format(n(ext.hst))}</td>
                <td style={{ ...tdStyle, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt.format(n(ext.total))}</td>
                <td style={{ ...tdStyle, textAlign: 'center' as const }}>
                  <StatusPill status={ext.status === 'paid' ? 'paid' : 'pending'} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: T.cardBgAlt }}>
              <td colSpan={6} style={{ ...tdStyle, fontWeight: 600, borderBottom: 'none' }}>C3 Total</td>
              <td style={{ ...tdStyle, textAlign: 'right' as const, fontWeight: 700, borderBottom: 'none', fontVariantNumeric: 'tabular-nums' }}>
                {fmt.format(c3Total)}
              </td>
              <td style={{ ...tdStyle, borderBottom: 'none' }} />
            </tr>
          </tfoot>
        </table>
      </div>

      {notes.length > 0 && (
        <div style={{
          background: colors.warning[50], border: `1px solid ${colors.warning[100]}`,
          borderRadius: '8px', padding: '0.625rem 1rem', marginTop: '0.5rem',
          fontSize: '0.8125rem', color: colors.warning[700],
        }}>
          Note: {notes.join(' | ')}
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function FinanceSection({ contractTotal, installments, payments, extrasOrder, clientExtras }: FinanceSectionProps) {
  const c2Total = extrasOrder ? n(extrasOrder.extras_sale_amount) : 0;
  const c3Total = clientExtras.reduce((s, e) => s + n(e.total), 0);
  const totalPaid = payments.reduce((s, p) => s + n(p.amount), 0);
  const balance = contractTotal + c2Total + c3Total - totalPaid;

  return (
    <div style={card}>
      <div style={{ ...sectionLabel, marginBottom: '1.25rem' }}>Finance</div>

      <SummaryBar c1={contractTotal} c2={c2Total} c3={c3Total} balance={balance} />

      <C1Section installments={installments} payments={payments} contractTotal={contractTotal} c2OrderDate={extrasOrder?.order_date || null} />

      {extrasOrder && (
        <C2Section
          extrasOrder={extrasOrder}
          payments={payments}
          c1Total={contractTotal}
        />
      )}

      {clientExtras.length > 0 && (
        <C3Section clientExtras={clientExtras} />
      )}
    </div>
  );
}
