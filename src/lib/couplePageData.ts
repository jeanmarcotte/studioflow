// Single source of truth for "does this couple have a C1 / C2 / C3?" and what
// each invoice's headline total is. Every component that needs to know an
// invoice's existence/total reads from `CoupleInvoices` rather than independently
// inspecting raw rows.

export interface InvoiceSummary {
  exists: boolean
  id: string | null
  total: number
  status: string | null
  label: string
  viewUrl: string | null
}

export interface CoupleInvoices {
  c1: InvoiceSummary
  c2: InvoiceSummary
  c3: InvoiceSummary
}

function sumTotals(rows: any[] | null | undefined): number {
  if (!rows) return 0
  return rows.reduce((sum, row) => {
    const v = row?.total
    const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)
}

export function buildInvoiceSummaries(
  contract: any | null,
  extrasOrder: any | null,
  clientExtras: any[] | null,
  coupleId: string,
  c3LineItems?: any[] | null
): CoupleInvoices {
  // C1 — from contracts table
  const c1Exists = !!contract
  const c1: InvoiceSummary = {
    exists: c1Exists,
    id: contract?.id ?? null,
    total: c1Exists ? Number(contract.total ?? 0) : 0,
    status: c1Exists ? 'active' : null,
    label: 'C1 Contract',
    viewUrl: c1Exists ? `/admin/contracts/${contract.id}/view` : null,
  }

  // C2 — from extras_orders table; extras_sale_amount is the source of truth
  const c2Exists = !!extrasOrder
  const c2: InvoiceSummary = {
    exists: c2Exists,
    id: extrasOrder?.id ?? null,
    total: c2Exists ? Number(extrasOrder.extras_sale_amount ?? extrasOrder.total ?? 0) : 0,
    status: extrasOrder?.status ?? null,
    label: 'C2 Frames & Albums',
    viewUrl: c2Exists ? `/admin/albums/${coupleId}/view` : null,
  }

  // C3 — totals come from client_extras AND c3_line_items, whichever has data.
  // Couples with only c3_line_items (no client_extras row) still need a real
  // header total in the C3 card.
  const clientExtrasTotal = sumTotals(clientExtras)
  const lineItemsTotal = sumTotals(c3LineItems)
  const c3Total = clientExtrasTotal + lineItemsTotal
  const c3HasClientExtras = (clientExtras ?? []).length > 0
  const c3HasLineItems = (c3LineItems ?? []).length > 0
  const c3Exists = c3HasClientExtras || c3HasLineItems
  const c3: InvoiceSummary = {
    exists: c3Exists,
    id: null,
    total: c3Total,
    status: c3Exists ? 'active' : null,
    label: 'C3 Extras',
    viewUrl: c3HasClientExtras ? `/admin/extras/${coupleId}/view` : null,
  }

  return { c1, c2, c3 }
}
