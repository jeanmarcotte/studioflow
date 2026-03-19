'use client';

export interface Payment {
  id: string;
  payment_date: string;
  amount: string;
  from_name: string;
  method: string;
}

export interface Installment {
  id: string;
  installment_number: number;
  due_description: string;
  amount: string;
  due_date: string | null;
}

export interface ExtrasOrder {
  id: string;
  order_date: string;
  order_type: string;
  items: Record<string, string>;
  total: string;
  status: string;
  notes: string | null;
}

export interface FinancialLedgerProps {
  contractTotal: number;
  extrasTotal: number;
  totalPaid: number;
  balance: number;
  payments: Payment[];
  installments: Installment[];
  extrasOrders: ExtrasOrder[];
  contractSignedDate: string | null;
}

export function FinancialLedger(props: FinancialLedgerProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 mb-4">
      <p className="text-slate-400 p-5">FinancialLedger placeholder — Balance: ${props.balance}</p>
    </div>
  );
}
