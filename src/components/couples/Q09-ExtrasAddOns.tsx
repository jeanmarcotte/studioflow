/**
 * Q09 — Extras & Add-ons (C3)
 *
 * @spec docs/QUADRANT-MAP-COUPLES.md
 * @status LOCKED
 * @updated 2026-04-01
 *
 * Data Sources:
 * - client_extras table
 *
 * Critical Rules:
 * - SOURCE OF TRUTH: client_extras table — NOT extras_orders
 * - Each row = one extra item sold post-contract (hours, prints, raw video, hi-res files, etc.)
 * - Separate from Q11 Frames & Albums (which uses extras_orders)
 * - Amber note banner when payment_note field contains restructuring instructions
 *
 * Guards:
 * - Hidden if no client_extras records exist
 * - Null check on invoice_date, description, hst
 */

'use client';

import { format, parseISO } from 'date-fns';
import { card, sectionLabel, T, colors, pillBase, badge, fmt } from './designTokens';

const n = (v: string | number | null | undefined): number => parseFloat(String(v || '0')) || 0;

function fmtDate(d: string | null): string {
  if (!d) return '\u2014';
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
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

function StatusPill({ status }: { status: 'paid' | 'pending' }) {
  const map = {
    paid: { ...badge.success, label: 'PAID' },
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

export interface Q09ExtrasAddOnsProps {
  clientExtras: ClientExtra[];
}

export function Q09ExtrasAddOns({ clientExtras }: Q09ExtrasAddOnsProps) {
  if (clientExtras.length === 0) return null;

  const c3Total = clientExtras.reduce((s, e) => s + n(e.total), 0);
  const notes = clientExtras.filter(e => e.payment_note).map(e => e.payment_note!);

  return (
    <div style={card}>
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ ...sectionLabel, marginBottom: '0.75rem' }}>Extras & Add-ons (C3)</div>

        <div style={{ borderRadius: '10px', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg }}>
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
                  <td style={tdStyle}>{ext.description || '\u2014'}</td>
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
              <tr style={{ background: T.tableHeaderBg }}>
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
    </div>
  );
}
