import { formatCurrency } from '@/lib/coupleFormatters'

interface CatalogItem {
  product_code: string
  item_name: string
  category?: string | null
  retail_price?: number | null
}

interface C2LineItem {
  id: string
  product_code: string | null
  quantity: number | null
  unit_price?: number | null
  notes?: string | null
}

interface FramesAlbumsProps {
  items?: Record<string, string>
  specs?: Record<string, string>
  financials?: {
    retailValue: number
    discount: number
    salePrice: number
  }
  lineItems?: C2LineItem[]
  catalog?: CatalogItem[]
}

function buildCatalogMap(catalog: CatalogItem[] | undefined): Map<string, CatalogItem> {
  const map = new Map<string, CatalogItem>()
  for (const c of catalog || []) {
    if (c?.product_code) map.set(c.product_code, c)
  }
  return map
}

function LineItemsBlock({ lineItems, catalog }: { lineItems?: C2LineItem[]; catalog?: CatalogItem[] }) {
  const byCode = buildCatalogMap(catalog)
  const items = lineItems || []
  return (
    <div className="border-t p-4">
      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Included Items</h4>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No line items recorded.</p>
      ) : (
        <ul className="divide-y">
          {items.map(item => {
            const cat = item.product_code ? byCode.get(item.product_code) : null
            const itemName = cat?.item_name || item.notes || '—'
            return (
              <li key={item.id} className="py-2 grid grid-cols-[140px_1fr_auto] gap-3 items-baseline">
                <span className="font-mono text-xs text-gray-500">{item.product_code || '—'}</span>
                <span className="text-sm font-medium text-gray-900">{itemName}</span>
                <span className="text-sm text-gray-600">× {item.quantity ?? 0}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function FramesAlbumsCard({ items, specs, financials, lineItems, catalog }: FramesAlbumsProps) {
  if (!financials) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-teal-600 px-4 md:px-5 py-4 flex justify-between items-center">
          <span className="text-white font-medium">Frames & Albums (C2)</span>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500">No frames &amp; albums sale recorded.</p>
        </div>
        <LineItemsBlock lineItems={lineItems} catalog={catalog} />
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-teal-600 px-4 md:px-5 py-4 flex justify-between items-center">
        <span className="text-white font-medium">Frames & Albums</span>
        <span className="text-white font-medium text-lg">{formatCurrency(financials.salePrice)}</span>
      </div>

      {/* 3-Column Grid — stacks on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 md:divide-x">
        {/* Items */}
        <div className="p-4 border-b md:border-b-0">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 pb-2 border-b-2 border-amber-500">
            Items
          </h4>
          {items && Object.keys(items as Record<string, string>).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(items).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-gray-900 text-right max-w-[60%]">{String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No items</p>
          )}
        </div>

        {/* Specs */}
        <div className="p-4 border-b md:border-b-0">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 pb-2 border-b-2 border-teal-500">
            Specs
          </h4>
          {specs && Object.keys(specs).length > 0 ? (
            <dl className="space-y-3 text-sm">
              {Object.entries(specs).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <dt className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</dt>
                  <dd className="text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-gray-400">No specs</p>
          )}
        </div>

        {/* Financials */}
        <div className="p-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 pb-2 border-b-2 border-indigo-500">
            Financials
          </h4>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Package Price</p>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(financials.salePrice)}</p>
          </div>
        </div>
      </div>

      <LineItemsBlock lineItems={lineItems} catalog={catalog} />
    </div>
  )
}
