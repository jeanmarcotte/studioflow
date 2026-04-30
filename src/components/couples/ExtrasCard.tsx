import { formatCurrency } from '@/lib/coupleFormatters'

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
  lineItems?: C3LineItem[]
  catalog?: CatalogItem[]
  headerTotal?: number
}

function buildCatalogMap(catalog: CatalogItem[] | undefined): Map<string, CatalogItem> {
  const map = new Map<string, CatalogItem>()
  for (const c of catalog || []) {
    if (c?.product_code) map.set(c.product_code, c)
  }
  return map
}

export function ExtrasCard({ lineItems, catalog, headerTotal }: ExtrasCardProps) {
  const items = lineItems || []
  const hasItems = items.length > 0

  if (!hasItems) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-teal-600 px-4 md:px-5 py-4 flex justify-between items-center">
          <span className="text-white font-medium">Extras (C3)</span>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500">No extras or add-ons recorded.</p>
        </div>
      </div>
    )
  }

  const localTotal = items.reduce((sum, item) => sum + Number(item.total ?? 0), 0)
  const totalAmount = headerTotal != null ? headerTotal : localTotal

  const byCode = buildCatalogMap(catalog)

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-teal-600 px-5 py-4 flex justify-between items-center">
        <span className="text-white font-medium">Extras (C3)</span>
        <span className="text-white font-medium text-lg">{formatCurrency(totalAmount)}</span>
      </div>

      <div className="p-4">
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
      </div>
    </div>
  )
}
