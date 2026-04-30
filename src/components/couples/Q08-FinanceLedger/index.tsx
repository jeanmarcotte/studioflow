/**
 * Q08 — Finance Ledger
 *
 * @spec docs/QUADRANT-MAP-COUPLES.md
 * @status LOCKED
 * @updated 2026-04-01
 *
 * Data Sources:
 * - contracts + extras_orders + c3_line_items + payments + contract_installments
 *
 * Sub-sections:
 * - Q08a: Original Contract (C1) — installment schedule with payment matching
 * - Q08b: Additional Sale (C2) — mini ledger + C2 installments
 * - C3 Extras moved to Q09 as standalone section
 *
 * Critical Rules:
 * - Balance is NEVER stored — always calculated live
 * - C1 payment matching STOPS at C2 signing date
 * - contract_balance_remaining in extras_orders is SOURCE OF TRUTH for C1 balance at C2 signing
 */

'use client';

import { card, sectionLabel } from '../designTokens';
import { Installment, Payment, ExtrasOrder, ClientExtra } from './shared';
import { Q08aOriginalContract } from './Q08a-OriginalContract';
import { Q08bAdditionalSale } from './Q08b-AdditionalSale';

export type { Installment, Payment, ExtrasOrder, ClientExtra };

export interface Q08FinanceLedgerProps {
  contractTotal: number;
  installments: Installment[];
  payments: Payment[];
  extrasOrder: ExtrasOrder | null;
}

export function Q08FinanceLedger({ contractTotal, installments, payments, extrasOrder }: Q08FinanceLedgerProps) {
  return (
    <div style={card}>
      <div style={{ ...sectionLabel, marginBottom: '1.25rem' }}>Finance</div>

      <Q08aOriginalContract
        installments={installments}
        payments={payments}
        contractTotal={contractTotal}
        c2OrderDate={extrasOrder?.order_date || null}
      />

      {extrasOrder && (
        <Q08bAdditionalSale
          extrasOrder={extrasOrder}
          payments={payments}
          c1Total={contractTotal}
        />
      )}
    </div>
  );
}
