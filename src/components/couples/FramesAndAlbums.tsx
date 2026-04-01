'use client';

export interface FramesAndAlbumsProps {
  extrasOrder: any | null;
}

export function FramesAndAlbums({ extrasOrder }: FramesAndAlbumsProps) {
  if (!extrasOrder) return null;

  const items = extrasOrder.items || {};
  const retailValue = parseFloat(extrasOrder.subtotal || '0') + parseFloat(extrasOrder.tax || '0');
  const discount = parseFloat(extrasOrder.discount || '0');
  const salePrice = parseFloat(extrasOrder.extras_sale_amount || '0');

  const details: { label: string; value: string | null }[] = [
    { label: 'Album', value: extrasOrder.album_qty ? `${extrasOrder.album_qty}× ${extrasOrder.album_cover || 'Album'}` : null },
    { label: 'Collage', value: extrasOrder.collage_size ? `${extrasOrder.collage_size} ${extrasOrder.collage_type?.replace(/_/g, ' ') || ''}`.trim() : null },
    { label: 'Collage Frame', value: extrasOrder.collage_frame_color || null },
    { label: 'Wedding Frame', value: extrasOrder.wedding_frame_size ? `${extrasOrder.wedding_frame_size} ${extrasOrder.wedding_frame_style || ''}`.trim() : null },
    { label: 'Eng. Portrait', value: extrasOrder.eng_portrait_size || null },
    { label: 'Signing Book', value: extrasOrder.signing_book ? 'Yes' : null },
  ].filter(d => d.value);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-5 py-4 flex justify-between items-center">
        <h3 className="font-semibold">🖼️ Frames & Albums</h3>
        <span className="font-mono font-bold text-lg">${salePrice.toLocaleString()}</span>
      </div>

      {/* Content */}
      <div className="grid grid-cols-3 gap-6 p-5">
        {/* Items from JSON */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 pb-2 border-b-2 border-teal-500">
            Items
          </h4>
          <div className="space-y-2 text-sm">
            {Object.entries(items).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="font-medium text-right ml-2">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Specs */}
        {details.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 pb-2 border-b-2 border-teal-500">
              Specs
            </h4>
            <div className="space-y-2 text-sm">
              {details.map(d => (
                <div key={d.label} className="flex justify-between">
                  <span className="text-slate-500">{d.label}</span>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financials */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 pb-2 border-b-2 border-teal-500">
            Financials
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Retail Value</span>
              <span className="font-medium">${retailValue.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Discount</span>
                <span className="font-medium text-orange-600">-${discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="text-slate-500 font-semibold">Sale Price</span>
              <span className="font-bold">${salePrice.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {extrasOrder.notes && (
        <div className="px-5 pb-5 -mt-2">
          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">{extrasOrder.notes}</p>
        </div>
      )}
    </div>
  );
}
