import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getPersonalSupabase() {
  return createClient(
    process.env.PERSONAL_SUPABASE_URL!,
    process.env.PERSONAL_SUPABASE_ANON_KEY!
  );
}

function getStudioFlowSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getNextDueDate(obligation: { frequency: string; due_day: number | null; due_date: string | null }): Date {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  if (obligation.frequency === 'monthly' && obligation.due_day) {
    if (obligation.due_day < currentDay) {
      return new Date(currentYear, currentMonth + 1, obligation.due_day);
    } else {
      return new Date(currentYear, currentMonth, obligation.due_day);
    }
  }

  if (obligation.due_date) {
    return new Date(obligation.due_date);
  }

  // No due day or date — push to end
  return new Date(currentYear + 1, 0, 1);
}

function getUrgency(dueDate: Date): { level: string; color: string; label: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { level: 'overdue', color: 'red', label: `${Math.abs(diffDays)}d OVERDUE` };
  if (diffDays === 0) return { level: 'today', color: 'red', label: 'TODAY' };
  if (diffDays === 1) return { level: 'tomorrow', color: 'red', label: 'TOMORROW' };
  if (diffDays <= 7) return { level: 'thisWeek', color: 'yellow', label: `${diffDays}d` };
  if (diffDays <= 14) return { level: 'twoWeeks', color: 'green', label: `${diffDays}d` };
  return { level: 'later', color: 'gray', label: `${diffDays}d` };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    // Fetch obligations (outgoing) from personal Supabase
    const personalDb = getPersonalSupabase();
    const { data: obligations, error: oblError } = await personalDb
      .from('obligations')
      .select('*')
      .eq('is_active', true);

    if (oblError) {
      return NextResponse.json({ error: oblError.message }, { status: 500 });
    }

    // Calculate next due dates and filter to period
    const outgoingItems = (obligations || [])
      .map((o: any) => {
        const nextDue = getNextDueDate(o);
        return {
          id: o.id,
          name: o.name,
          amount: parseFloat(o.amount),
          account: o.account,
          dueDate: nextDue.toISOString().split('T')[0],
          urgency: getUrgency(nextDue),
          type: 'outgoing' as const,
          category: o.category,
          auto_pay: o.auto_pay,
        };
      })
      .filter(item => {
        const due = new Date(item.dueDate);
        due.setHours(0, 0, 0, 0);
        return due >= today && due <= endDate;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Fetch incoming wedding payments from StudioFlow
    const studioDb = getStudioFlowSupabase();
    const endDateStr = endDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const { data: installments, error: instError } = await studioDb
      .from('contract_installments')
      .select(`
        id,
        due_date,
        amount,
        due_description,
        contract:contracts!inner(
          id,
          couple:couples!inner(
            id,
            couple_name,
            balance_owing
          )
        )
      `)
      .gte('due_date', todayStr)
      .lte('due_date', endDateStr)
      .order('due_date', { ascending: true });

    const incomingItems = (installments || [])
      .map((row: any) => {
        const couple = row.contract?.couple;
        if (!couple || parseFloat(couple.balance_owing || 0) <= 0) return null;
        const dueDate = new Date(row.due_date);
        return {
          id: row.id,
          name: `${couple.couple_name} — ${row.due_description}`,
          amount: parseFloat(row.amount),
          account: 'StudioFlow',
          dueDate: row.due_date,
          urgency: getUrgency(dueDate),
          type: 'incoming' as const,
          category: 'wedding',
          auto_pay: false,
        };
      })
      .filter(Boolean);

    const outgoingTotal = outgoingItems.reduce((sum, i) => sum + i.amount, 0);
    const incomingTotal = incomingItems.reduce((sum: number, i: any) => sum + i.amount, 0);

    // Action items: outgoing due in next 7 days
    const sevenDaysOut = new Date(today);
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
    const actionItems = outgoingItems.filter(item => {
      const due = new Date(item.dueDate);
      due.setHours(0, 0, 0, 0);
      return due <= sevenDaysOut;
    });

    // Combine and sort all items
    const allItems = [...outgoingItems, ...incomingItems].sort(
      (a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    return NextResponse.json({
      outgoing: outgoingTotal,
      incoming: incomingTotal,
      netFlow: incomingTotal - outgoingTotal,
      actionItems,
      allItems,
      days,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
