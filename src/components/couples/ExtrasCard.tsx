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

interface ExtrasCardProps {
  extras: ExtraItem[]
}

export function ExtrasCard({ extras }: ExtrasCardProps) {
  if (!extras || extras.length === 0) return null

  const totalAmount = extras.reduce((sum, item) => sum + Number(item.total), 0)

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4 flex justify-between items-center">
        <span className="text-white font-medium">Extras (C3)</span>
        <span className="text-white font-medium text-lg">${totalAmount.toLocaleString()}</span>
      </div>

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
    </div>
  )
}
