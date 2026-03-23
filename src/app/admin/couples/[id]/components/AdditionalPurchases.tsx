'use client';

import { format } from 'date-fns';
import { T, card, sectionLabel, fieldLabel, pillBase, badge, fmt } from './designTokens';

/* ── sub-components ─────────────────────────────────────── */

function TypeBadge({ type }: { type: 'frames' | 'extras' }) {
  const c = type === 'frames' ? badge.accent : badge.default;
  const label = type === 'frames' ? 'Frames' : 'Extras';
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

/* ── types ──────────────────────────────────────────────── */

interface MergedRow {
  id: string;
  date: string | null;
  item: string;
  amount: number;
  type: 'frames' | 'extras';
}

/* ── main component ─────────────────────────────────────── */

export interface AdditionalPurchasesProps {
  extrasOrders: any[];
  clientExtras: any[];
}

export function AdditionalPurchases({ extrasOrders, clientExtras }: AdditionalPurchasesProps) {
  // Merge both sources into a single sorted list
  const rows: MergedRow[] = [
    ...extrasOrders.map((o: any) => ({
      id: o.id,
      date: o.order_date || o.created_at || null,
      item: o.notes?.replace(/^Inclusions:\s*/, '') || 'Frames & Albums Order',
      amount: parseFloat(o.extras_sale_amount || '0'),
      type: 'frames' as const,
    })),
    ...clientExtras.map((e: any) => ({
      id: e.id,
      date: e.invoice_date || e.created_at || null,
      item: e.description || e.item_type || 'Extra Item',
      amount: parseFloat(e.total || '0'),
      type: 'extras' as const,
    })),
  ].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  if (!rows.length) {
    return (
      <div style={{ ...card, marginTop: '0.5rem' }}>
        <div style={{ ...sectionLabel, marginBottom: '1rem' }}>
          Additional Purchases
        </div>
        <div style={{ fontSize: '0.875rem', color: T.textMuted, fontStyle: 'italic' }}>
          No additional purchases
        </div>
      </div>
    );
  }

  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div style={{ ...card, overflow: 'hidden', marginTop: '0.5rem' }}>
      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={sectionLabel}>
          Additional Purchases
        </div>
        <div style={{ fontSize: '0.8125rem', color: T.textSecondary, marginTop: '0.5rem' }}>
          Frames, albums, and extras added after original contract
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left' }}>Date</th>
            <th style={{ ...thStyle, textAlign: 'left' }}>Item</th>
            <th style={{ ...thStyle, width: '7rem', textAlign: 'right' }}>Amount</th>
            <th style={{ ...thStyle, width: '5.5rem', textAlign: 'center' }}>Type</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const rowBg = idx % 2 === 1 ? T.rowAlt : 'transparent';
            const d = row.date ? new Date(row.date.includes('T') ? row.date : row.date + 'T12:00:00') : null;

            return (
              <tr key={row.id}>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: T.textSecondary, background: rowBg }}>
                  {d ? format(d, 'MMM d, yyyy') : '—'}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: T.text, background: rowBg }}>
                  {row.item}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: T.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums', background: rowBg }}>
                  {fmt.format(row.amount)}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center', background: rowBg }}>
                  <TypeBadge type={row.type} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, color: T.text, borderTop: `1px solid ${T.border}` }}>
              Total Additional
            </td>
            <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, color: T.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderTop: `1px solid ${T.border}` }}>
              {fmt.format(total)}
            </td>
            <td style={{ borderTop: `1px solid ${T.border}` }} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
