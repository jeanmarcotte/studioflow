'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, DollarSign, TrendingDown, TrendingUp, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface UpcomingItem {
  id: string;
  name: string;
  amount: number;
  account: string;
  dueDate: string;
  urgency: { level: string; color: string; label: string };
  type: 'outgoing' | 'incoming';
  category: string;
  auto_pay: boolean;
}

interface UpcomingData {
  outgoing: number;
  incoming: number;
  netFlow: number;
  actionItems: UpcomingItem[];
  allItems: UpcomingItem[];
  days: number;
}

const TABS = [
  { label: 'Dashboard', href: '/admin/finance', active: false },
  { label: 'Accounts', href: '/admin/finance/accounts', active: false },
  { label: 'Upcoming', href: '/admin/finance/upcoming', active: true },
  { label: 'Obligations', href: '/admin/finance/obligations', active: false },
];

const URGENCY_DOT: Record<string, string> = {
  red: 'bg-red-500',
  yellow: 'bg-amber-400',
  green: 'bg-green-500',
  gray: 'bg-gray-400',
};

const URGENCY_ROW: Record<string, string> = {
  overdue: 'bg-red-50/60',
  today: 'bg-red-50/40',
  tomorrow: 'bg-red-50/30',
  thisWeek: 'bg-amber-50/30',
  twoWeeks: '',
  later: '',
};

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

export default function FinanceUpcomingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const daysParam = parseInt(searchParams.get('days') || '7', 10);
  const [days, setDays] = useState(daysParam);
  const [data, setData] = useState<UpcomingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionOpen, setActionOpen] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/finance/upcoming?days=${days}`);
        const json = await res.json();
        if (json.error) {
          console.error('Error:', json.error);
          return;
        }
        setData(json);
      } catch (error) {
        console.error('Error fetching upcoming:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [days]);

  function switchDays(d: number) {
    setDays(d);
    router.replace(`/admin/finance/upcoming?days=${d}`, { scroll: false });
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <p className="text-muted-foreground">Failed to load upcoming data.</p>
      </div>
    );
  }

  const netPositive = data.netFlow >= 0;

  const summaryCards = [
    {
      label: 'OUTGOING',
      emoji: '💸',
      value: data.outgoing,
      sub: `next ${days} days`,
      icon: TrendingDown,
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-200',
    },
    {
      label: 'INCOMING',
      emoji: '💰',
      value: data.incoming,
      sub: `next ${days} days`,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-200',
    },
    {
      label: 'NET FLOW',
      emoji: '📊',
      value: Math.abs(data.netFlow),
      sub: netPositive ? 'surplus' : 'deficit',
      icon: BarChart3,
      color: netPositive ? 'text-blue-600' : 'text-red-600',
      bg: netPositive ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200',
      prefix: netPositive ? '+' : '-',
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">💰 Finance — Upcoming</h1>
          <p className="text-sm text-muted-foreground mt-1">Financial early warning system</p>
        </div>
        {/* Time filter tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => switchDays(d)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                days === d
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
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
      <div className="grid grid-cols-3 gap-4 mb-6">
        {summaryCards.map(card => (
          <div key={card.label} className={`rounded-xl border p-5 shadow-sm ${card.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {card.emoji} {card.label}
              </span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className={`text-2xl font-bold font-mono ${card.color}`}>
              {card.prefix || ''}{formatCurrency(card.value)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Action Needed Section */}
      {data.actionItems.length > 0 && (
        <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden mb-6">
          <button
            onClick={() => setActionOpen(!actionOpen)}
            className="w-full flex items-center justify-between px-5 py-3 bg-red-50 border-b border-red-200 hover:bg-red-100/50 transition-colors"
          >
            <span className="text-sm font-semibold text-red-800">
              ⚠️ ACTION NEEDED ({data.actionItems.length})
            </span>
            {actionOpen ? (
              <ChevronDown className="w-4 h-4 text-red-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-red-600" />
            )}
          </button>
          {actionOpen && (
            <div className="divide-y divide-border">
              {data.actionItems.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center px-5 py-3 text-sm ${URGENCY_ROW[item.urgency.level] || ''}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0 ${URGENCY_DOT[item.urgency.color]}`} />
                  <span className={`text-xs font-bold uppercase mr-3 w-24 ${
                    item.urgency.color === 'red' ? 'text-red-600' :
                    item.urgency.color === 'yellow' ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {item.urgency.label}
                  </span>
                  <span className="flex-1 text-foreground font-medium">{item.name}</span>
                  <span className="font-mono font-semibold text-foreground mr-4">
                    {formatCurrency(item.amount)}
                  </span>
                  <span className="text-xs text-muted-foreground w-28 text-right">{item.account}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full Breakdown Table */}
      <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/50">
          <h2 className="text-sm font-semibold text-foreground">📋 FULL BREAKDOWN</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-5 text-xs font-semibold text-muted-foreground uppercase">Date</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-muted-foreground uppercase">Description</th>
              <th className="text-right py-3 px-5 text-xs font-semibold text-muted-foreground uppercase">Amount</th>
              <th className="text-right py-3 px-5 text-xs font-semibold text-muted-foreground uppercase">Account</th>
              <th className="text-right py-3 px-5 text-xs font-semibold text-muted-foreground uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.allItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  No items due in the next {days} days
                </td>
              </tr>
            ) : (
              data.allItems.map((item: UpcomingItem) => (
                <tr
                  key={`${item.type}-${item.id}`}
                  className={`border-b border-border hover:bg-muted/20 transition-colors ${URGENCY_ROW[item.urgency.level] || ''}`}
                >
                  <td className="py-3 px-5 font-mono text-muted-foreground">
                    {formatShortDate(item.dueDate)}
                  </td>
                  <td className="py-3 px-5">
                    <span className="text-foreground">{item.name}</span>
                    {item.type === 'incoming' && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
                        INCOMING
                      </span>
                    )}
                  </td>
                  <td className={`py-3 px-5 text-right font-mono font-semibold ${
                    item.type === 'incoming' ? 'text-green-600' : 'text-foreground'
                  }`}>
                    {item.type === 'incoming' ? '+' : ''}{formatCurrency(item.amount)}
                  </td>
                  <td className="py-3 px-5 text-right text-muted-foreground text-xs">
                    {item.account}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${URGENCY_DOT[item.urgency.color]}`} />
                      <span className={`text-xs font-semibold ${
                        item.urgency.color === 'red' ? 'text-red-600' :
                        item.urgency.color === 'yellow' ? 'text-amber-600' :
                        item.urgency.color === 'green' ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        {item.urgency.label}
                      </span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Loading overlay for tab switches */}
      {loading && data && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        </div>
      )}
    </div>
  );
}
