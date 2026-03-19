'use client';

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
    <div className="bg-white rounded-xl border border-slate-200 mb-4">
      <p className="text-slate-400 p-5">ExtrasSection placeholder</p>
    </div>
  );
}
