'use client';

import { useState, useEffect, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import { Loader2, AlertTriangle, Clock, Calendar, DollarSign } from 'lucide-react';

interface InstallmentRow {
  id: string;
  installment_number: number;
  due_description: string;
  amount: string;
  due_date: string | null;
  couple_id: string;
  couple_name: string;
  wedding_date: string | null;
  balance_owing: number;
}

type TimeGroup = 'overdue' | 'this_week' | 'this_month' | 'coming_up' | 'milestone';

const GROUP_CONFIG: Record<TimeGroup, { label: string; rowBg: string; headerBg: string }> = {
  overdue: { label: '⚠️ Overdue', rowBg: 'bg-red-50', headerBg: 'bg-red-100 text-red-800' },
  this_week: { label: '🔥 Due This Week', rowBg: 'bg-amber-50', headerBg: 'bg-amber-100 text-amber-800' },
  this_month: { label: '📅 Due This Month', rowBg: 'bg-white', headerBg: 'bg-slate-100 text-slate-700' },
  coming_up: { label: '📆 Coming Up (31–90 days)', rowBg: 'bg-white', headerBg: 'bg-slate-50 text-slate-500' },
  milestone: { label: '🎯 Milestone-Based (No Date)', rowBg: 'bg-white', headerBg: 'bg-slate-50 text-slate-500' },
};

const TABS = [
  { label: 'Dashboard', href: '/admin/finance', active: false },
  { label: 'Accounts', href: '/admin/finance/accounts', active: false },
  { label: 'Upcoming', href: '/admin/finance/upcoming', active: true },
];

function classifyInstallment(dueDate: string | null): TimeGroup {
  if (!dueDate) return 'milestone';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  const days = differenceInDays(due, today);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'this_week';
  if (days <= 30) return 'this_month';
  return 'coming_up';
}

function num(val: string | null): number {
  return parseFloat(val || '0') || 0;
}

export default function FinanceUpcomingPage() {
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await supabase
          .from('contract_installments')
          .select(`
            id,
            installment_number,
            due_description,
            amount,
            due_date,
            contract:contracts!inner(
              id,
              couple:couples!inner(
                id,
                couple_name,
                wedding_date,
                balance_owing
              )
            )
          `)
          .order('due_date', { ascending: true, nullsFirst: false });

        // Flatten nested joins and filter to couples with balance owing
        const rows: InstallmentRow[] = (data || [])
          .map((row: any) => {
            const couple = row.contract?.couple;
            if (!couple) return null;
            return {
              id: row.id,
              installment_number: row.installment_number,
              due_description: row.due_description,
              amount: row.amount,
              due_date: row.due_date,
              couple_id: couple.id,
              couple_name: couple.couple_name,
              wedding_date: couple.wedding_date,
              balance_owing: num(couple.balance_owing),
            };
          })
          .filter((r: InstallmentRow | null): r is InstallmentRow => r !== null && r.balance_owing > 0);

        setInstallments(rows);
      } catch (error) {
        console.error('Error fetching installments:', error);
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

  // Group installments
  const groups: Record<TimeGroup, InstallmentRow[]> = {
    overdue: [],
    this_week: [],
    this_month: [],
    coming_up: [],
    milestone: [],
  };
  installments.forEach(inst => {
    groups[classifyInstallment(inst.due_date)].push(inst);
  });

  // Summary stats
  const overdueTotal = groups.overdue.reduce((s, i) => s + num(i.amount), 0);
  const weekTotal = groups.this_week.reduce((s, i) => s + num(i.amount), 0);
  const monthTotal = groups.this_month.reduce((s, i) => s + num(i.amount), 0);
  const allTotal = installments.reduce((s, i) => s + num(i.amount), 0);

  const cards = [
    {
      label: 'Overdue',
      value: overdueTotal,
      count: groups.overdue.length,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-200',
    },
    {
      label: 'Due This Week',
      value: weekTotal,
      count: groups.this_week.length,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
    },
    {
      label: 'Due This Month',
      value: monthTotal,
      count: groups.this_month.length,
      icon: Calendar,
      color: 'text-slate-600',
      bg: 'bg-white border-slate-200',
    },
    {
      label: 'Total Upcoming',
      value: allTotal,
      count: installments.length,
      icon: DollarSign,
      color: 'text-teal-600',
      bg: 'bg-teal-50 border-teal-200',
    },
  ];

  const groupOrder: TimeGroup[] = ['overdue', 'this_week', 'this_month', 'coming_up', 'milestone'];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">💰 Finance — Upcoming</h1>
        <p className="text-sm text-slate-500 mt-1">Installments due for couples with outstanding balances</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map(tab => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab.active
                ? 'bg-white border border-b-white border-slate-200 text-teal-600 -mb-px'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className={`rounded-xl border p-5 shadow-sm ${card.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className={`text-2xl font-bold font-mono ${card.color}`}>
              ${card.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-400 mt-1">{card.count} installment{card.count !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {/* Grouped Installments */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Couple</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Wedding</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Due Date</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Description</th>
              <th className="text-right py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            {groupOrder.map(groupKey => {
              const items = groups[groupKey];
              if (items.length === 0) return null;
              const config = GROUP_CONFIG[groupKey];

              return (
                <Fragment key={groupKey}>
                  {/* Section Header */}
                  <tr>
                    <td colSpan={5} className={`py-2 px-5 text-xs font-bold uppercase tracking-wide ${config.headerBg}`}>
                      {config.label} ({items.length})
                    </td>
                  </tr>
                  {/* Rows */}
                  {items.map(inst => (
                    <tr
                      key={inst.id}
                      className={`border-b border-slate-100 hover:bg-teal-50/30 transition-colors ${config.rowBg}`}
                    >
                      <td className="py-3 px-5">
                        <Link
                          href={`/admin/couples/${inst.couple_id}`}
                          className="text-teal-600 hover:text-teal-700 font-medium hover:underline"
                        >
                          {inst.couple_name}
                        </Link>
                      </td>
                      <td className="py-3 px-5 font-mono text-slate-600">
                        {inst.wedding_date ? format(new Date(inst.wedding_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="py-3 px-5">
                        {inst.due_date ? (
                          <span className="font-mono text-slate-600">{format(new Date(inst.due_date), 'MMM d, yyyy')}</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-slate-600">
                            Milestone
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-slate-600">{inst.due_description}</td>
                      <td className="py-3 px-5 text-right font-mono font-semibold">
                        ${num(inst.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
            {installments.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No upcoming installments
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
