interface FramesAlbumsProps {
  items: Record<string, string>
  specs: Record<string, string>
  financials: {
    retailValue: number
    discount: number
    salePrice: number
  }
}

export function FramesAlbumsCard({ items, specs, financials }: FramesAlbumsProps) {
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
          {items && Object.keys(items).length > 0 ? (
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
        <div className="p-4">
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
            <p className="text-2xl font-semibold text-gray-900">${financials.salePrice.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
