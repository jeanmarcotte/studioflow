import { NextResponse } from 'next/server'
import { opsSupabase } from '@/lib/ops-supabase'

export async function GET() {
  const { data, error } = await opsSupabase
    .from('balance_snapshots')
    .select('account_id, account_name, balance_cad, snapshot_date')
    .in('account_id', ['td-business-2147', 'rbc-visa'])
    .order('snapshot_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Latest snapshot per account
  const tdBusiness = data?.find(s => s.account_id === 'td-business-2147') ?? null
  const rbcVisa = data?.find(s => s.account_id === 'rbc-visa') ?? null

  return NextResponse.json({ tdBusiness, rbcVisa })
}
