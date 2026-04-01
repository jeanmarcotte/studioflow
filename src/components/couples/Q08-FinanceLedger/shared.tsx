/**
 * Q08 — Finance Ledger: Shared types, helpers, and styles
 */

import { format, parseISO, differenceInDays } from 'date-fns';
import { T, colors, pillBase, badge, fmt } from '../designTokens';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Installment {
  id: string;
  installment_number: number;
  due_description: string;
  due_date: string | null;
  amount: string | number;
}

export interface Payment {
  id: string;
  payment_date: string;
  amount: string | number;
  notes: string | null;
}

export interface ExtrasOrder {
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

export interface ClientExtra {
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

// ── Helpers ──────────────────────────────────────────────────────────────────

export const n = (v: string | number | null | undefined): number => parseFloat(String(v || '0')) || 0;

export function fmtDate(d: string | null): string {
  if (!d) return '\u2014';
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
}

export { fmt };

export const C2_DESCRIPTIONS = [
  'Pick Up Portraits',
  'January 15th 2026',
  '2 Weeks before wedding',
  'Pick up proof disk/Dropbox',
  'Order Photos',
  'Pick up the final wedding album & prints',
];

// Match payments to installments: date-based first (±5 days), then sequential
export function matchPayments(installments: { due_date: string | null; amount: number }[], payments: Payment[]): (Payment | null)[] {
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

// ── Shared Styles ────────────────────────────────────────────────────────────

export { T, colors, pillBase, badge };

export const thStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 600,
  letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.primary[700],
  borderBottom: `2px solid ${T.border}`,
};

export const tdStyle: React.CSSProperties = {
  padding: '0.625rem 0.75rem', fontSize: '0.875rem', color: T.text,
  borderBottom: `1px solid ${T.borderLight}`,
};

// ── StatusPill ───────────────────────────────────────────────────────────────

export function StatusPill({ status }: { status: 'paid' | 'overdue' | 'upcoming' | 'pending' }) {
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
