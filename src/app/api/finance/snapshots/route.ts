import { NextRequest, NextResponse } from 'next/server'
import { opsSupabase } from '@/lib/ops-supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fyStart = searchParams.get('fyStart') || '2025-05-01'
  const fyEnd = searchParams.get('fyEnd') || '2026-04-30'

  const [snapshotsRes, expensesRes] = await Promise.all([
    opsSupabase
      .from('balance_snapshots')
      .select('account_id, account_name, balance_cad, snapshot_date')
      .in('account_id', ['td-business-2147', 'rbc-visa'])
      .order('snapshot_date', { ascending: false }),
    opsSupabase
      .from('transactions')
      .select('amount_cad')
      .in('account_id', ['td-business-2147', 'rbc-visa'])
      .lt('amount_cad', 0)
      .gte('transaction_date', fyStart)
      .lte('transaction_date', fyEnd),
  ])

  if (snapshotsRes.error) {
    return NextResponse.json({ error: snapshotsRes.error.message }, { status: 500 })
  }

  const tdBusiness = snapshotsRes.data?.find(s => s.account_id === 'td-business-2147') ?? null
  const rbcVisa = snapshotsRes.data?.find(s => s.account_id === 'rbc-visa') ?? null

  const ytdExpenses = expensesRes.data?.reduce((sum, t) => sum + Number(t.amount_cad), 0) ?? 0

  return NextResponse.json({ tdBusiness, rbcVisa, ytdExpenses })
}
