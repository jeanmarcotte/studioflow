'use client';

import { format, parseISO } from 'date-fns';

export interface ExtrasOrder {
  id: string;
  order_date: string;
  order_type: string;
  items: Record<string, string>;
  total: string;
  notes: string | null;
}

export interface AddonInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  description: string;
  total: string;
  status: string;
}

export interface ExtrasSectionProps {
  framesAlbums: ExtrasOrder | null;
  postWedding: ExtrasOrder | null;
  invoices: AddonInvoice[];
}

export function ExtrasSection({ framesAlbums, postWedding, invoices }: ExtrasSectionProps) {
  if (!framesAlbums && !postWedding) return null;

  return (
    <div className="space-y-4">
      {/* Frames & Albums */}
      {framesAlbums && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-4 flex justify-between items-center">
            <h3 className="font-semibold">🖼️ Frames & Album Extras</h3>
            <span className="font-mono font-bold text-lg">${parseFloat(framesAlbums.total).toLocaleString()}</span>
          </div>
          <div className="p-5 grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Items Purchased</h4>
              <div className="space-y-2">
                {Object.entries(framesAlbums.items).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-slate-500"> — {value}</span>
                  </div>
                ))}
              </div>
            </div>
            {framesAlbums.notes && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Notes</h4>
                <p className="text-sm text-slate-600">{framesAlbums.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post-Wedding Extras */}
      {postWedding && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-5 py-4 flex justify-between items-center">
            <h3 className="font-semibold">📦 Post-Wedding Extras</h3>
            <span className="font-mono font-bold text-lg">${parseFloat(postWedding.total).toLocaleString()}</span>
          </div>
          <div className="p-5 grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Items Purchased</h4>
              <div className="space-y-2">
                {Object.entries(postWedding.items).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                    <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
            {invoices.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Invoices</h4>
                <div className="space-y-2">
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex justify-between text-sm">
                      <span>{inv.invoice_number}</span>
                      <span className={`font-mono ${inv.status === 'paid' ? 'text-green-600' : 'text-slate-600'}`}>
                        {inv.status === 'paid' ? '✓ Paid' : inv.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
