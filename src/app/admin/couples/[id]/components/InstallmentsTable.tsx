'use client';

import { format } from 'date-fns';

/* ── design tokens (match ClientCard) ───────────────────── */

const T = {
  text: '#1e293b',
  muted: '#94a3b8',
  border: '#e2e8f0',
} as const;

const fmt = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

/* ── badge styles ───────────────────────────────────────── */

const BADGE = {
  paid:    { bg: '#f0fdf4', fg: '#166534', bd: '#bbf7d0' },
  overdue: { bg: '#fff7ed', fg: '#9a3412', bd: '#fed7aa' },
  pending: { bg: '#f1f5f9', fg: '#475569', bd: '#e2e8f0' },
} as const;

function StatusPill({ status }: { status: 'paid' | 'overdue' | 'pending' }) {
  const c = BADGE[status];
  const label = status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Due';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '0.1875rem 0.625rem',
      borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 500,
      backgroundColor: c.bg, color: c.fg, border: `1px solid ${c.bd}`,
    }}>
      {label}
    </span>
  );
}

/* ── table header cell ──────────────────────────────────── */

const thStyle: React.CSSProperties = {
  fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.03em',
  textTransform: 'uppercase', color: T.muted,
  padding: '0.625rem 0.75rem', borderBottom: `1px solid ${T.border}`,
};

/* ── main component ─────────────────────────────────────── */

export interface InstallmentsTableProps {
  installments: any[];
  totalPaid: number;
}

export function InstallmentsTable({ installments, totalPaid }: InstallmentsTableProps) {
  if (!installments.length) {
    return (
      <div style={{
        background: '#fff', border: `1px solid ${T.border}`, borderRadius: '16px',
        padding: '1.5rem 1.75rem', marginBottom: '1.25rem',
      }}>
        <div style={{
          fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: T.muted, marginBottom: '1rem',
        }}>
          Original Contract Installments
        </div>
        <div style={{ fontSize: '0.8125rem', color: T.muted, fontStyle: 'italic' }}>
          No installments recorded
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff', border: `1px solid ${T.border}`, borderRadius: '16px',
      padding: '1.5rem 1.75rem', marginBottom: '1.25rem', overflow: 'hidden',
    }}>
      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{
          fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: T.muted,
        }}>
          Original Contract Installments
        </div>
        <div style={{ fontSize: '0.75rem', color: T.muted }}>
          {installments.length} installment{installments.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '2.5rem', textAlign: 'left' }}>#</th>
            <th style={{ ...thStyle, textAlign: 'left' }}>Description</th>
            <th style={{ ...thStyle, width: '7rem', textAlign: 'left' }}>Due Date</th>
            <th style={{ ...thStyle, width: '7rem', textAlign: 'right' }}>Amount</th>
            <th style={{ ...thStyle, width: '5.5rem', textAlign: 'center' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {installments.map((inst: any, idx: number) => {
            const amount = parseFloat(inst.amount);
            const dueDate = inst.due_date ? new Date(inst.due_date + 'T12:00:00') : null;
            const today = new Date();
            const isOverdue = dueDate ? dueDate < today : false;

            // Cumulative paid logic (preserved from existing FinancialLedger)
            const cumulative = installments
              .filter((i: any) => i.installment_number <= inst.installment_number)
              .reduce((sum: number, i: any) => sum + parseFloat(i.amount), 0);
            const isPaid = totalPaid >= cumulative - 0.05;

            const status: 'paid' | 'overdue' | 'pending' = isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending';
            const rowBg = idx % 2 === 1 ? '#fafbfc' : 'transparent';

            return (
              <tr key={inst.id || idx}>
                <td style={{ padding: '0.75rem', color: T.muted, fontSize: '0.8125rem', background: rowBg }}>
                  {inst.installment_number}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.8125rem', fontWeight: 500, color: T.text, background: rowBg }}>
                  {inst.due_description}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.8125rem', color: T.muted, background: rowBg }}>
                  {dueDate ? format(dueDate, 'MMM d, yyyy') : '—'}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.8125rem', color: T.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums', background: rowBg }}>
                  {fmt.format(amount)}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center', background: rowBg }}>
                  <StatusPill status={status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
