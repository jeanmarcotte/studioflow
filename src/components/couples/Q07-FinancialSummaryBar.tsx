/**
 * Q07 — Financial Summary Bar
 *
 * @spec docs/QUADRANT-MAP-COUPLES.md
 * @status LOCKED
 * @updated 2026-04-01
 *
 * Data Sources:
 * - contracts.total (C1)
 * - extras_orders.extras_sale_amount (C2)
 * - SUM(couple_charges.amount) WHERE contract_type='C3' (C3 — ledger is source of truth)
 * - SUM(payments.amount)
 *
 * Critical Rules:
 * - NEVER reads from stored balance columns — always live calculation
 * - Formula: Balance = C1 + C2 + C3 - TotalPaid
 *
 * Guards:
 * - All values default to 0 when missing
 */

'use client';

import { T, colors, fieldLabel, fmt } from './designTokens';

export interface Q07FinancialSummaryBarProps {
  c1: number;
  c2: number;
  c3: number;
  totalPaid: number;
}

export function Q07FinancialSummaryBar({ c1, c2, c3, totalPaid }: Q07FinancialSummaryBarProps) {
  const grand = c1 + c2 + c3;
  const balance = grand - totalPaid;
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
            {cell.value !== 0 ? fmt.format(cell.value) : '\u2014'}
          </div>
        </div>
      ))}
    </div>
  );
}
