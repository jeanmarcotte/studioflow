'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { format } from 'date-fns';
import { Loader2, ChevronUp, ChevronDown } from 'lucide-react';

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
  const [sortKey, setSortKey] = useState<SortKey>('wedding_date');
  const [sortAsc, setSortAsc] = useState(true);

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

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  // Filter
  const filtered = couples.filter(c => {
    const balance = num(c.balance_owing);
    if (filter === 'owing') return balance > 0;
    if (filter === 'paid') return balance <= 0;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    if (sortKey === 'couple_name') {
      aVal = a.couple_name.toLowerCase();
      bVal = b.couple_name.toLowerCase();
    } else if (sortKey === 'wedding_date') {
      aVal = a.wedding_date || '';
      bVal = b.wedding_date || '';
    } else {
      aVal = num(a[sortKey]);
      bVal = num(b[sortKey]);
    }

    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
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

  function SortHeader({ label, field }: { label: string; field: SortKey }) {
    const isActive = sortKey === field;
    return (
      <th
        className="py-3 px-5 text-xs font-semibold text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none"
        onClick={() => handleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {isActive && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
        </span>
      </th>
    );
  }

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
              ${totalOwing.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
      <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <SortHeader label="Couple" field="couple_name" />
              <SortHeader label="Wedding Date" field="wedding_date" />
              <SortHeader label="Contract + Extras" field="contract_total" />
              <SortHeader label="Paid" field="total_paid" />
              <SortHeader label="Balance" field="balance_owing" />
              <th className="py-3 px-5 text-xs font-semibold text-muted-foreground uppercase w-16">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((couple, idx) => {
              const contractTotal = num(couple.contract_total);
              const extrasTotal = num(couple.extras_total);
              const grandTotal = contractTotal + extrasTotal;
              const totalPaid = num(couple.total_paid);
              const balance = num(couple.balance_owing);
              const isPaid = balance <= 0;

              return (
                <tr
                  key={couple.id}
                  className={`border-b border-border hover:bg-teal-50/30 transition-colors ${
                    isPaid
                      ? idx % 2 === 0 ? 'bg-green-50/30' : 'bg-green-50/20'
                      : idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                  }`}
                >
                  <td className="py-3 px-5">
                    <Link
                      href={`/admin/couples/${couple.id}`}
                      className="text-teal-600 hover:text-teal-700 font-medium hover:underline"
                    >
                      {couple.couple_name}
                    </Link>
                  </td>
                  <td className="py-3 px-5 font-mono text-muted-foreground">
                    {couple.wedding_date ? format(new Date(couple.wedding_date), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="py-3 px-5 text-right font-mono">
                    ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-5 text-right font-mono text-green-600">
                    ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={`py-3 px-5 text-right font-mono font-semibold ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
                    ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-5 text-center">
                    {isPaid ? (
                      <span className="text-green-500 font-semibold">✓</span>
                    ) : (
                      <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No couples found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
