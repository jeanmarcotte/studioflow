'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { formatDateCompact, formatCurrency } from '@/lib/formatters';

interface CoupleAccount {
  id: string;
  couple_name: string;
  wedding_date: string | null;
  contract_total: string | null;
  extras_total: string | null;
  total_paid: string | null;
  balance_owing: string | null;
}

type SortKey = 'couple_name' | 'wedding_date' | 'contract_total' | 'total_paid' | 'balance_owing';
type FilterTab = 'all' | 'owing' | 'paid';

const TABS = [
  { label: 'Dashboard', href: '/admin/finance', active: false },
  { label: 'Accounts', href: '/admin/finance/accounts', active: true },
  { label: 'Upcoming', href: '/admin/finance/upcoming', active: false },
];

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'owing', label: 'Balance Owing' },
  { key: 'paid', label: 'Paid in Full' },
];

function num(val: string | null): number {
  return parseFloat(val || '0') || 0;
}

export default function FinanceAccountsPage() {
  const [couples, setCouples] = useState<CoupleAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from('couples')
        .select('id, couple_name, wedding_date, contract_total, extras_total, total_paid, balance_owing')
        .order('wedding_date', { ascending: true });
      setCouples(data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Filter
  const filtered = couples.filter(c => {
    const balance = num(c.balance_owing);
    if (filter === 'owing') return balance > 0;
    if (filter === 'paid') return balance <= 0;
    return true;
  });

  // Summary stats
  const totalOwing = filtered.reduce((sum, c) => {
    const bal = num(c.balance_owing);
    return sum + (bal > 0 ? bal : 0);
  }, 0);
  const owingCount = filtered.filter(c => num(c.balance_owing) > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const accountColumns: ColumnDef<CoupleAccount>[] = useMemo(() => [
    {
      accessorKey: "couple_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => (
        <Link
          href={`/admin/couples/${row.original.id}`}
          className="text-primary hover:text-primary/80 font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.couple_name}
        </Link>
      ),
    },
    {
      accessorKey: "wedding_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.wedding_date ? formatDateCompact(row.original.wedding_date) : '—'}</span>,
    },
    {
      id: "grand_total",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contract + Extras" />,
      accessorFn: (row) => num(row.contract_total) + num(row.extras_total),
      cell: ({ row }) => <span className="font-mono" style={{ textAlign: 'right', display: 'block' }}>{formatCurrency(num(row.original.contract_total) + num(row.original.extras_total))}</span>,
    },
    {
      accessorKey: "total_paid",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Paid" />,
      cell: ({ row }) => <span className="font-mono text-green-600" style={{ textAlign: 'right', display: 'block' }}>{formatCurrency(num(row.original.total_paid))}</span>,
      sortingFn: (a, b) => num(a.original.total_paid) - num(b.original.total_paid),
    },
    {
      accessorKey: "balance_owing",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
      cell: ({ row }) => {
        const balance = num(row.original.balance_owing);
        return <span className={`font-mono font-semibold ${balance <= 0 ? 'text-green-600' : 'text-red-600'}`} style={{ textAlign: 'right', display: 'block' }}>{formatCurrency(balance)}</span>;
      },
      sortingFn: (a, b) => num(a.original.balance_owing) - num(b.original.balance_owing),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const isPaid = num(row.original.balance_owing) <= 0;
        return isPaid
          ? <span className="text-green-500 font-semibold">✓</span>
          : <span className="inline-block w-2 h-2 rounded-full bg-red-400" />;
      },
      enableSorting: false,
    },
  ], []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">💰 Finance — Accounts</h1>
        <p className="text-sm text-muted-foreground mt-1">All couple accounts with financial summary</p>
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

      {/* Summary Card */}
      <div className="bg-background rounded-xl border border-border shadow-sm p-5 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">Couples Shown</div>
            <div className="text-2xl font-bold text-foreground">{filtered.length}</div>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">With Balance</div>
            <div className="text-2xl font-bold text-red-600">{owingCount}</div>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">Total Owing</div>
            <div className="text-2xl font-bold font-mono text-red-600">
              {formatCurrency(totalOwing)}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filter === tab.key
                  ? 'bg-background text-teal-600 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Table */}
      <DataTable
        columns={accountColumns}
        data={filtered}
        emptyMessage="No couples found"
        pageSize={50}
      />
    </div>
  );
}
