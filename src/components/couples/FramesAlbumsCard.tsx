interface FramesAlbumsProps {
  items: Record<string, string>
  specs: Record<string, string>
  financials: {
    retailValue: number
    discount: number
    salePrice: number
  }
  coupleName: string
}

export function FramesAlbumsCard({ items, specs, financials, coupleName }: FramesAlbumsProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4 flex justify-between items-center">
        <span className="text-white font-medium">Frames & Albums</span>
        <span className="text-white font-medium text-lg">${financials.salePrice.toLocaleString()}</span>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-3 divide-x">
        {/* Items */}
        <div className="p-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 pb-2 border-b-2 border-amber-500">
            Items
          </h4>
          <dl className="space-y-3 text-sm">
            {Object.entries(items).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2">
                <dt className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</dt>
                <dd className="text-gray-900 text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Specs */}
        <div className="p-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 pb-2 border-b-2 border-teal-500">
            Specs
          </h4>
          <dl className="space-y-3 text-sm">
            {Object.entries(specs).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <dt className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</dt>
                <dd className="text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Financials */}
        <div className="p-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 pb-2 border-b-2 border-indigo-500">
            Financials
          </h4>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Retail Value</dt>
              <dd className="text-gray-900 font-medium">${financials.retailValue.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Discount</dt>
              <dd className="text-red-600 font-medium">-${financials.discount.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between pt-3 border-t mt-3">
              <dt className="text-gray-700 font-medium">Sale Price</dt>
              <dd className="text-gray-900 font-medium">${financials.salePrice.toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t">
        <span className="text-sm text-gray-500">{coupleName}</span>
      </div>
    </div>
  )
}
