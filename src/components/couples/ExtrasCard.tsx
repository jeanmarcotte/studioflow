import { formatCurrency } from '@/lib/coupleFormatters'

interface ExtraItem {
  id: string
  item_type: string
  description: string
  quantity: number
  unit_price: number
  subtotal: number
  hst: number
  total: number
  invoice_date: string
  status: string
}

interface CatalogItem {
  product_code: string
  item_name: string
  category?: string | null
  retail_price?: number | null
}

interface C3LineItem {
  id: string
  product_code: string | null
  quantity: number | null
  unit_price?: number | null
  total?: number | null
  notes?: string | null
  invoice_date?: string | null
}

interface ExtrasCardProps {
  extras: ExtraItem[]
  lineItems?: C3LineItem[]
  catalog?: CatalogItem[]
  // Pre-computed C3 total from buildInvoiceSummaries — covers both client_extras
  // and c3_line_items so the header is correct even when only line items exist.
  headerTotal?: number
}

function buildCatalogMap(catalog: CatalogItem[] | undefined): Map<string, CatalogItem> {
  const map = new Map<string, CatalogItem>()
  for (const c of catalog || []) {
    if (c?.product_code) map.set(c.product_code, c)
  }
  return map
}

function C3LineItemsBlock({ lineItems, catalog }: { lineItems?: C3LineItem[]; catalog?: CatalogItem[] }) {
  const byCode = buildCatalogMap(catalog)
  const items = lineItems || []
  return (
    <div className="border-t p-4">
      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Line Items</h4>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No line items recorded.</p>
      ) : (
        <ul className="divide-y">
          {items.map(item => {
            const cat = item.product_code ? byCode.get(item.product_code) : null
            const itemName = cat?.item_name || item.notes || '—'
            const total = Number(item.total ?? 0)
            return (
              <li key={item.id} className="py-2 grid grid-cols-[140px_1fr_auto_auto] gap-3 items-baseline">
                <span className="font-mono text-xs text-gray-500">{item.product_code || '—'}</span>
                <span className="text-sm font-medium text-gray-900">{itemName}</span>
                <span className="text-sm text-gray-600">× {item.quantity ?? 0}</span>
                <span className="text-sm font-medium text-gray-900 text-right">
                  ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function ExtrasCard({ extras, lineItems, catalog, headerTotal }: ExtrasCardProps) {
  const hasExtras = !!(extras && extras.length > 0)
  const hasLineItems = !!(lineItems && lineItems.length > 0)

  if (!hasExtras && !hasLineItems) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-teal-600 px-4 md:px-5 py-4 flex justify-between items-center">
          <span className="text-white font-medium">Extras (C3)</span>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500">No extras or add-ons recorded.</p>
        </div>
        <C3LineItemsBlock lineItems={lineItems} catalog={catalog} />
      </div>
    )
  }

  // Prefer the pre-computed total from buildInvoiceSummaries; fall back to
  // summing locally so the card still behaves when used outside the couple page.
  const localTotal =
    (extras || []).reduce((sum, item) => sum + Number(item.total ?? 0), 0) +
    (lineItems || []).reduce((sum, item) => sum + Number(item.total ?? 0), 0)
  const totalAmount = headerTotal != null ? headerTotal : localTotal

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4 flex justify-between items-center">
        <span className="text-white font-medium">Extras (C3)</span>
        <span className="text-white font-medium text-lg">{formatCurrency(totalAmount)}</span>
      </div>

      {hasExtras && (
        <>
          {/* Desktop: Items Table */}
          <div className="hidden md:block p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {extras.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-3 text-gray-900">{item.item_type}</td>
                    <td className="py-3 text-gray-600">{item.description}</td>
                    <td className="py-3 text-right text-gray-900">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-900">${Number(item.unit_price).toLocaleString()}</td>
                    <td className="py-3 text-right text-gray-900 font-medium">${Number(item.total).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Stacked cards */}
          <div className="md:hidden p-4 space-y-3">
            {extras.map((item) => (
              <div key={item.id} className="border-b pb-3 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-gray-900">{item.item_type}</span>
                  <span className="text-sm font-medium text-gray-900">${Number(item.total).toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-600 mb-1">{item.description}</p>
                <p className="text-xs text-gray-500">Qty: {item.quantity} × ${Number(item.unit_price).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <C3LineItemsBlock lineItems={lineItems} catalog={catalog} />
    </div>
  )
}
