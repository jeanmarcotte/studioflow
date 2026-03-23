'use client';

import { format } from 'date-fns';
import { T, card, sectionLabel, fieldLabel, pillBase, badge, fmt } from './designTokens';

/* ── sub-components ─────────────────────────────────────── */

function StatusPill({ status }: { status: 'paid' | 'overdue' | 'pending' }) {
  const map = { paid: badge.success, overdue: badge.warning, pending: badge.default } as const;
  const c = map[status];
  const label = status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Due';
  return (
    <span style={{ ...pillBase, backgroundColor: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}>
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

export interface InstallmentsTableProps {
  installments: any[];
  totalPaid: number;
}

export function InstallmentsTable({ installments, totalPaid }: InstallmentsTableProps) {
  if (!installments.length) {
    return (
      <div style={card}>
        <div style={{ ...sectionLabel, marginBottom: '1rem' }}>Original Contract Installments</div>
        <div style={{ fontSize: '0.875rem', color: T.textMuted, fontStyle: 'italic' }}>
          No installments recorded
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...card, overflow: 'hidden' }}>
      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={sectionLabel}>Original Contract Installments</div>
        <div style={{ fontSize: '0.75rem', color: T.textSecondary }}>
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

            const cumulative = installments
              .filter((i: any) => i.installment_number <= inst.installment_number)
              .reduce((sum: number, i: any) => sum + parseFloat(i.amount), 0);
            const isPaid = totalPaid >= cumulative - 0.05;

            const status: 'paid' | 'overdue' | 'pending' = isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending';
            const rowBg = idx % 2 === 1 ? T.rowAlt : 'transparent';

            return (
              <tr key={inst.id || idx}>
                <td style={{ padding: '0.75rem', color: T.textSecondary, fontSize: '0.875rem', background: rowBg }}>
                  {inst.installment_number}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: T.text, background: rowBg }}>
                  {inst.due_description}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: T.textSecondary, background: rowBg }}>
                  {dueDate ? format(dueDate, 'MMM d, yyyy') : '—'}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: T.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums', background: rowBg }}>
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
