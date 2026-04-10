'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { Loader2, DollarSign, CreditCard, Building2, Home, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface Obligation {
  id: string;
  name: string;
  category: string;
  type: string;
  amount: string;
  frequency: string;
  due_day: number | null;
  due_date: string | null;
  payee: string | null;
  account: string | null;
  auto_pay: boolean;
  notes: string | null;
}

interface CategoryGroup {
  category: string;
  items: Obligation[];
  subtotal: number;
}

interface Summary {
  total: number;
  totalCount: number;
  personal: number;
  personalCount: number;
  business: number;
  businessCount: number;
  autoPay: number;
  autoPayCount: number;
  manual: number;
  manualCount: number;
}

interface ObligationsData {
  personal: CategoryGroup[];
  business: CategoryGroup[];
  summary: Summary;
}

const CATEGORY_LABELS: Record<string, string> = {
  housing: 'Housing',
  vehicles: 'Vehicles',
  insurance: 'Insurance',
  kids: 'Kids',
  entertainment: 'Entertainment',
  telecom: 'Telecom',
  utilities: 'Utilities',
  credit: 'Credit Payments',
  rent: 'Rent',
  software: 'Software',
  banking: 'Banking',
  payroll: 'Payroll',
  taxes: 'Taxes',
  workers: 'Workers',
  subscription: 'Software',
  loan: 'Vehicles',
};

const TABS = [
  { label: 'Dashboard', href: '/admin/finance', active: false },
  { label: 'Accounts', href: '/admin/finance/accounts', active: false },
  { label: 'Upcoming', href: '/admin/finance/upcoming', active: false },
  { label: 'Obligations', href: '/admin/finance/obligations', active: true },
];

function formatDueDay(obligation: Obligation): string {
  if (obligation.due_date) {
    const d = new Date(obligation.due_date);
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  }
  if (obligation.due_day) return `${obligation.due_day}${ordinalSuffix(obligation.due_day)}`;
  return 'monthly';
}

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default function ObligationsPage() {
  const [data, setData] = useState<ObligationsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/finance/obligations');
        const json = await res.json();
        if (json.error) {
          console.error('Error fetching obligations:', json.error);
          return;
        }
        setData(json);
      } catch (error) {
        console.error('Error fetching obligations:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <p className="text-muted-foreground">Failed to load obligations.</p>
      </div>
    );
  }

  const { summary } = data;

  const summaryCards = [
    {
      label: 'Total Monthly',
      value: summary.total,
      count: summary.totalCount,
      icon: DollarSign,
      color: 'text-teal-600',
      bg: 'bg-teal-50 border-teal-200',
    },
    {
      label: 'Personal',
      value: summary.personal,
      count: summary.personalCount,
      icon: Home,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200',
    },
    {
      label: 'Business',
      value: summary.business,
      count: summary.businessCount,
      icon: Building2,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200',
    },
  ];

  const paymentCards = [
    {
      label: 'Auto-Pay',
      value: summary.autoPay,
      count: summary.autoPayCount,
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-200',
    },
    {
      label: 'Manual',
      value: summary.manual,
      count: summary.manualCount,
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">💰 Finance — Obligations</h1>
        <p className="text-sm text-muted-foreground mt-1">Master list of recurring financial commitments</p>
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

      {/* Summary Cards Row 1 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {summaryCards.map(card => (
          <div key={card.label} className={`rounded-xl border p-5 shadow-sm ${card.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className={`text-2xl font-bold font-mono ${card.color}`}>
              {formatCurrency(card.value)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{card.count} item{card.count !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {/* Summary Cards Row 2 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {paymentCards.map(card => (
          <div key={card.label} className={`rounded-xl border p-5 shadow-sm ${card.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className={`text-2xl font-bold font-mono ${card.color}`}>
              {formatCurrency(card.value)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{card.count} item{card.count !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {/* Personal Section */}
      <ObligationSection
        title="PERSONAL"
        emoji="🏠"
        groups={data.personal}
        headerBg="bg-blue-50 border-blue-200"
        headerText="text-blue-800"
      />

      {/* Business Section */}
      <ObligationSection
        title="BUSINESS"
        emoji="💼"
        groups={data.business}
        headerBg="bg-purple-50 border-purple-200"
        headerText="text-purple-800"
      />
    </div>
  );
}

function ObligationSection({
  title,
  emoji,
  groups,
  headerBg,
  headerText,
}: {
  title: string;
  emoji: string;
  groups: CategoryGroup[];
  headerBg: string;
  headerText: string;
}) {
  if (groups.length === 0) return null;

  return (
    <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden mb-6">
      {/* Section Header */}
      <div className={`px-5 py-3 border-b ${headerBg}`}>
        <h2 className={`text-lg font-semibold ${headerText}`}>
          {emoji} {title}
        </h2>
      </div>

      <div className="divide-y divide-border">
        {groups.map(group => (
          <div key={group.category}>
            {/* Category Header */}
            <div className="flex items-center justify-between px-5 py-2.5 bg-muted/50">
              <span className="text-sm text-muted-foreground uppercase tracking-wide font-semibold">
                {CATEGORY_LABELS[group.category] || group.category}
              </span>
              <span className="text-sm font-mono font-semibold text-foreground">
                {formatCurrency(group.subtotal)}
              </span>
            </div>

            {/* Items */}
            {group.items.map((item, idx) => {
              const isLast = idx === group.items.length - 1;
              return (
                <div
                  key={item.id}
                  className="flex items-center px-5 py-2.5 hover:bg-muted/30 transition-colors text-sm"
                >
                  {/* Tree connector */}
                  <span className="text-muted-foreground mr-2 w-4 text-center font-mono text-xs">
                    {isLast ? '└' : '├'}
                  </span>

                  {/* Name + due day */}
                  <span className="flex-1 text-foreground">
                    {item.name}
                    <span className="text-muted-foreground ml-1">({formatDueDay(item)})</span>
                  </span>

                  {/* Amount */}
                  <span className="w-28 text-right font-mono font-semibold text-foreground">
                    {formatCurrency(parseFloat(item.amount))}
                  </span>

                  {/* Account */}
                  <span className="w-32 text-right text-muted-foreground text-xs truncate ml-4">
                    {item.account || '—'}
                  </span>

                  {/* Auto-pay indicator */}
                  <span className="w-12 text-right ml-2">
                    {item.auto_pay ? (
                      <span className="text-green-600 font-semibold">✓</span>
                    ) : item.notes?.includes('est') ? (
                      <span className="text-muted-foreground text-xs">~est</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
