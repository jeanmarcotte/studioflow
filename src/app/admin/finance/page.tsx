'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DollarSign, TrendingUp, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { formatDateCompact, formatCurrency } from '@/lib/formatters';

const FY_START = '2025-05-01';
const FY_END = '2026-04-30';
const FY_LABEL = 'FY2025-26';

const TABS = [
  { label: 'Dashboard', href: '/admin/finance', active: true },
  { label: 'Accounts', href: '/admin/finance/accounts', active: false },
  { label: 'Upcoming', href: '/admin/finance/upcoming', active: false },
];

export default function FinanceDashboardPage() {
  const [fyIncome, setFyIncome] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [outstanding, setOutstanding] = useState(0);
  const [upcoming30, setUpcoming30] = useState(0);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // FY income
      const { data: fyData } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', FY_START)
        .lte('payment_date', FY_END);
      setFyIncome(fyData?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0);

      // This month income
      const monthStart = format(new Date(), 'yyyy-MM-01');
      const { data: monthData } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', monthStart);
      setMonthIncome(monthData?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0);

      // Outstanding balances
      const { data: outstandingData } = await supabase
        .from('couples')
        .select('balance_owing')
        .gt('balance_owing', 0);
      setOutstanding(outstandingData?.reduce((sum, c) => sum + parseFloat(c.balance_owing), 0) || 0);

      // Upcoming 30 days installments
      const today = format(new Date(), 'yyyy-MM-dd');
      const thirtyDays = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const { data: upcomingData } = await supabase
        .from('contract_installments')
        .select('amount')
        .gte('due_date', today)
        .lte('due_date', thirtyDays);
      setUpcoming30(upcomingData?.reduce((sum, i) => sum + parseFloat(i.amount), 0) || 0);

      // Recent payments with couple names
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*, couples(id, couple_name)')
        .order('payment_date', { ascending: false })
        .limit(20);
      setRecentPayments(paymentsData || []);
    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const paymentColumns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: "payment_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.payment_date ? formatDateCompact(row.original.payment_date) : '—'}</span>,
    },
    {
      accessorKey: "couple_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      accessorFn: (row) => row.couples?.couple_name || 'Unknown',
      cell: ({ row }) => row.original.couples ? (
        <Link
          href={`/admin/couples/${row.original.couples.id}`}
          className="text-primary hover:text-primary/80 font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.couples.couple_name}
        </Link>
      ) : (
        <span className="text-muted-foreground">Unknown</span>
      ),
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => <span className="font-mono font-semibold text-green-600" style={{ textAlign: 'right', display: 'block' }}>{formatCurrency(row.original.amount)}</span>,
    },
    {
      accessorKey: "method",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Method" />,
      cell: ({ row }) => <span className="text-muted-foreground capitalize">{row.original.method || '—'}</span>,
    },
    {
      accessorKey: "from_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="From" />,
      cell: ({ row }) => row.original.from_name || '—',
    },
  ], []);

  const cards = [
    {
      label: `${FY_LABEL} Income`,
      value: fyIncome,
      icon: DollarSign,
      color: 'text-teal-600',
      bg: 'bg-teal-50 border-teal-200',
    },
    {
      label: 'This Month',
      value: monthIncome,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-200',
    },
    {
      label: 'Outstanding',
      value: outstanding,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-200',
    },
    {
      label: 'Upcoming 30 Days',
      value: upcoming30,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">💰 Finance — Income Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {FY_LABEL} (May 1, 2025 — Apr 30, 2026)
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map(tab => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab.active
                ? 'bg-background border border-b-background border-border text-teal-600 -mb-px'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <div
            key={card.label}
            className={`rounded-xl border p-5 shadow-sm ${card.bg}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className={`text-2xl font-bold font-mono ${card.color}`}>
              {formatCurrency(card.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Payments */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-bold text-foreground">Recent Payments</h2>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors">
            + Record Payment
          </button>
        </div>
        <DataTable
          columns={paymentColumns}
          data={recentPayments}
          emptyMessage="No payments found"
          showPagination={false}
        />
      </div>
    </div>
  );
}
